/**
 * MarketTicker — Bloomberg-style infinite scrolling price strip.
 *
 * Key design decisions that make this work correctly:
 *
 * 1. We render items TWICE in a single Animated.View row:
 *      [copy A] [copy B]
 *    The animation scrolls translateX from 0 → -(widthA).
 *    At that point copy B is in exactly the same visual position copy A started
 *    at, so when we instantly reset to 0 the loop is seamless.
 *
 * 2. We measure copy A's width via its own onLayout wrapper (not the doubled
 *    parent), so the measurement is always exact regardless of overflow clipping.
 *
 * 3. We use a self-restarting Animated.timing (not Animated.loop) so we can:
 *      - Pause from the current position on press-in
 *      - Resume from that same position on press-out
 *    Animated.loop always resets to the start, which would cause a visible jump.
 *
 * 4. Price updates (Redux ticks) cause re-renders but DO NOT restart or reset
 *    the animation — translateX is a stable ref and the animation callback
 *    chain is unaffected by React re-renders.
 *
 * 5. Items are sorted by category: Energy → Metals → Indices → FX → Strategic.
 *    All instruments are shown; no plan filtering on the ticker.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAppSelector } from '../store/hooks';
import { MarketDataLive } from '../store/slices/marketsSlice';
import { pricePrecision } from '../hooks/useMarkets';

// ── Config ────────────────────────────────────────────────────────────────────

const H             = 40;
const PX_PER_MS     = 0.038;   // scroll speed: ~38 px/s  →  ms = width / 0.038
const BG            = '#040d1a';
const BORDER        = 'rgba(14,165,233,0.12)';
const LABEL_BORDER  = 'rgba(14,165,233,0.25)';
const UP            = '#22c55e';
const DOWN          = '#ef4444';
const TEAL          = '#0ea5e9';
const DIM           = '#64748b';
const LIT           = '#cbd5e1';
const MONO          = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// Category sort order
const CAT_ORDER: Record<string, number> = {
  energy: 0, metals: 1, equity: 2, currency: 3, commodity: 4,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(price: number, unit: string): string {
  const prec = pricePrecision(unit);
  if (price >= 1000)
    return price.toLocaleString('en-US', {
      minimumFractionDigits: prec,
      maximumFractionDigits: prec,
    });
  return price.toFixed(Math.max(prec, 2));
}

// ── Single ticker item ────────────────────────────────────────────────────────

const TickerItem = React.memo(function TickerItem({ m }: { m: MarketDataLive }) {
  const up    = m.change_pct >= 0;
  const color = up ? UP : DOWN;
  const arrow = up ? '▲' : '▼';
  const sign  = up ? '+' : '';

  return (
    <View style={ti.wrap}>
      <Text style={ti.sym}>{m.symbol}</Text>
      <Text style={ti.price}>{fmtPrice(m.price, m.unit)}</Text>
      <Text style={[ti.chg, { color }]}>
        {arrow}{sign}{m.change_pct.toFixed(2)}%
      </Text>
      <Text style={ti.dot}> · </Text>
    </View>
  );
});

const ti = StyleSheet.create({
  wrap:  {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: H,
  },
  sym:   {
    fontSize: 11, fontWeight: '800', color: TEAL,
    fontFamily: MONO, marginRight: 7,
    letterSpacing: 0.3,
  },
  price: {
    fontSize: 11, fontWeight: '500', color: LIT,
    fontFamily: MONO, marginRight: 6,
    fontVariant: ['tabular-nums'] as any,
  },
  chg:   {
    fontSize: 11, fontWeight: '700',
    fontFamily: MONO,
  },
  dot:   {
    fontSize: 11, color: DIM,
    fontFamily: MONO, paddingHorizontal: 4,
  },
});

// ── Main component ────────────────────────────────────────────────────────────

export function MarketTicker() {
  const rawItems = useAppSelector(s => s.markets.items);

  // Sort by category order; stable (useMemo) so we don't re-sort on every tick
  const items = useMemo(
    () =>
      [...rawItems].sort((a, b) => {
        const da = CAT_ORDER[a.category] ?? 9;
        const db = CAT_ORDER[b.category] ?? 9;
        return da !== db ? da - db : a.symbol.localeCompare(b.symbol);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawItems.length, rawItems.map(m => m.symbol).join(',')]
    // Only re-sort when the SET of instruments changes, not when prices change.
    // This stops the animation from being affected by 10-second price ticks.
  );

  const translateX   = useRef(new Animated.Value(0)).current;
  const copyAWidth   = useRef(0);           // width of one full set of items
  const animRef      = useRef<Animated.CompositeAnimation | null>(null);
  const pausedAt     = useRef<number>(0);   // translateX value when paused
  const mounted      = useRef(true);

  // ── Animation helpers ────────────────────────────────────────────────────────

  // Scroll from current translateX value to -copyAWidth, then loop.
  const scrollFrom = useCallback((from: number) => {
    if (copyAWidth.current <= 0 || !mounted.current) return;
    const remaining  = Math.abs(-copyAWidth.current - from);
    const duration   = remaining / PX_PER_MS;
    animRef.current  = Animated.timing(translateX, {
      toValue:         -copyAWidth.current,
      duration,
      easing:          Easing.linear,
      useNativeDriver: true,
    });
    animRef.current.start(({ finished }) => {
      if (finished && mounted.current) {
        // Instant invisible reset: copy B is now visually identical to copy A
        translateX.setValue(0);
        scrollFrom(0);
      }
    });
  }, [translateX]);

  // Start fresh from 0 (called once after first measurement)
  const startScroll = useCallback(() => {
    animRef.current?.stop();
    translateX.setValue(0);
    scrollFrom(0);
  }, [translateX, scrollFrom]);

  // ── Measure copy A width once ─────────────────────────────────────────────

  const prevLength = useRef(0);

  const onCopyALayout = useCallback((e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w <= 0) return;

    const lengthChanged = prevLength.current !== items.length;
    if (copyAWidth.current === w && !lengthChanged) return; // nothing to do

    prevLength.current  = items.length;
    copyAWidth.current  = w;
    startScroll();
  }, [items.length, startScroll]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      animRef.current?.stop();
    };
  }, []);

  // ── Press handlers: pause / resume from exact position ───────────────────

  const handlePressIn = useCallback(() => {
    animRef.current?.stop();
    pausedAt.current = (translateX as any)._value ?? 0;
  }, [translateX]);

  const handlePressOut = useCallback(() => {
    if (!mounted.current) return;
    scrollFrom(pausedAt.current);
  }, [scrollFrom]);

  const handlePress = useCallback(() => {
    router.push('/markets');
  }, []);

  if (items.length === 0) return null;

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View style={s.container}>

        {/* ── Fixed "MARKETS" label ─────────────────────────────────────── */}
        <View style={s.label}>
          <Text style={s.labelTxt}>MARKETS</Text>
        </View>

        {/* ── Scrolling area ────────────────────────────────────────────── */}
        <View style={s.clip}>
          <Animated.View
            style={[s.row, { transform: [{ translateX }] }]}
          >
            {/*
              Copy A — we wrap it in a View to get its onLayout width.
              This is the width we animate to (-copyAWidth) for the loop.
            */}
            <View onLayout={onCopyALayout} style={s.copy}>
              {items.map(m => <TickerItem key={m.symbol} m={m} />)}
            </View>

            {/*
              Copy B — visually identical to A.
              When translateX = -copyAWidth, copy B starts exactly where
              copy A started, so the instant reset to 0 is invisible.
            */}
            <View style={s.copy}>
              {items.map(m => <TickerItem key={m.symbol + '_b'} m={m} />)}
            </View>
          </Animated.View>
        </View>

      </View>
    </TouchableWithoutFeedback>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    height:            H,
    backgroundColor:   BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection:     'row',
    alignItems:        'center',
    // No overflow:hidden here — clipping is on s.clip only
  },
  label: {
    paddingHorizontal: 12,
    borderRightWidth:  1,
    borderRightColor:  LABEL_BORDER,
    height:            '100%',
    justifyContent:    'center',
    backgroundColor:   BG,
    // zIndex keeps the label visually above the scrolling row
    zIndex:            1,
  },
  labelTxt: {
    fontSize:    9,
    fontWeight:  '800',
    color:       TEAL,
    letterSpacing: 1.4,
    fontFamily:  MONO,
  },
  clip: {
    flex:     1,
    height:   '100%',
    overflow: 'hidden',    // clip the scrolling content to this box only
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    height:        '100%',
  },
  copy: {
    flexDirection: 'row',
    alignItems:    'center',
    height:        '100%',
  },
});
