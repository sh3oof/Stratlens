import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAppDispatch } from '../../src/store/hooks';
import { useRegions } from '../../src/hooks/useRegions';
import { usePlan } from '../../src/hooks/usePlan';
import { addToWatchlist, removeFromWatchlist } from '../../src/store/slices/watchlistSlice';
import { MarketTicker } from '../../src/components/MarketTicker';
import { RegionCard, CardStatus } from '../../src/components/RegionCard';
import { Region } from '../../src/types';
import { BG, CARD, TEAL, TEXT, DIM, BORDER } from '../../src/constants/theme';

type SortMode = 'risk' | 'name' | 'code';

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: 'By Risk',   value: 'risk'  },
  { label: 'By Name',   value: 'name'  },
  { label: 'By Region', value: 'code'  },
];

function SkeletonCard() {
  return (
    <View style={sk.card}>
      <View style={sk.row}>
        <View style={[sk.block, { width: 40, height: 40, borderRadius: 8, marginRight: 12 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[sk.block, { width: '60%', height: 14 }]} />
          <View style={[sk.block, { width: '30%', height: 10 }]} />
        </View>
        <View style={[sk.block, { width: 40, height: 36, borderRadius: 4 }]} />
      </View>
      <View style={[sk.block, { height: 1, marginVertical: 12 }]} />
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={[sk.row, { marginBottom: 6, alignItems: 'center' }]}>
          <View style={[sk.block, { width: 24, height: 8 }]} />
          <View style={[sk.block, { flex: 1, height: 5, marginHorizontal: 6, borderRadius: 3 }]} />
          <View style={[sk.block, { width: 18, height: 8 }]} />
        </View>
      ))}
    </View>
  );
}
const sk = StyleSheet.create({
  card:  { backgroundColor: CARD, borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  row:   { flexDirection: 'row' },
  block: { backgroundColor: '#1a2d45', borderRadius: 4 },
});

export default function ExploreScreen() {
  const dispatch = useAppDispatch();
  const { regions, loading, error, refetch } = useRegions();
  const {
    plan,
    watchlistCodes,
    isFull,
    canAddMore,
    isWatched,
    isLocked,
  } = usePlan();

  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState<SortMode>('risk');

  const filtered = useMemo<Region[]>(() => {
    let list = regions.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        r => r.country_name.toLowerCase().includes(q) ||
             r.country_code.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'risk': list.sort((a, b) => b.aggregate - a.aggregate); break;
      case 'name': list.sort((a, b) => a.country_name.localeCompare(b.country_name)); break;
      case 'code': list.sort((a, b) => a.country_code.localeCompare(b.country_code)); break;
    }
    return list;
  }, [regions, search, sort]);

  const watchedCount = watchlistCodes.size;
  const planLimit    = plan.countries_limit >= 999 ? 'Unlimited' : String(plan.countries_limit);
  const showBanner   = regions.length > 0;

  function getStatus(code: string): CardStatus {
    if (isWatched(code))  return 'watched';
    if (isLocked(code))   return 'locked';
    return 'available';
  }

  function handleAdd(region: Region) {
    if (!canAddMore) {
      router.push('/paywall');
      return;
    }
    Alert.alert(
      `Add ${region.country_name}?`,
      `Add ${region.country_name} to your watchlist. You will see its intelligence in your feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Watchlist',
          onPress: () => dispatch(addToWatchlist(region.country_code)),
        },
      ]
    );
  }

  function handleRemove(region: Region) {
    Alert.alert(
      `Remove ${region.country_name}?`,
      `Remove ${region.country_name} from your watchlist. Its events will no longer appear in your feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => dispatch(removeFromWatchlist(region.country_code)),
        },
      ]
    );
  }

  function handlePress(region: Region) {
    const status = getStatus(region.country_code);
    if (status === 'locked')  { router.push('/paywall'); return; }
    if (status === 'watched') { router.push(`/country/${region.country_code}`); return; }
    handleAdd(region);
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Explore</Text>
        <Text style={s.subtitle}>Country Risk Intelligence</Text>
      </View>

      <MarketTicker />

      {/* Watchlist usage banner */}
      {showBanner && (
        <TouchableOpacity
          style={[s.planBanner, isFull && s.planBannerFull]}
          onPress={() => isFull && router.push('/paywall')}
          activeOpacity={isFull ? 0.8 : 1}
        >
          <Text style={s.planBannerText}>
            <Text style={s.planBannerCount}>{watchedCount}</Text>
            {' of '}
            <Text style={s.planBannerCount}>{planLimit}</Text>
            {' countries in watchlist · '}
            <Text style={s.planBannerPlan}>{plan.name}</Text>
          </Text>
          {isFull && (
            <Text style={s.planBannerCta}>Upgrade →</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search countries…"
          placeholderTextColor={DIM}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Sort pills */}
      <View style={s.sortRow}>
        {SORT_OPTIONS.map(opt => {
          const active = sort === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[s.pill, active && s.pillActive]}
              onPress={() => setSort(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[s.pillText, active && s.pillTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!!error && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {loading && regions.length === 0 ? (
        <View style={{ paddingTop: 4 }}>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.country_code}
          renderItem={({ item }) => {
            const status = getStatus(item.country_code);
            return (
              <RegionCard
                region={item}
                status={status}
                onAdd={() => handleAdd(item)}
                onUpgrade={() => router.push('/paywall')}
              />
            );
          }}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={loading && regions.length > 0}
              onRefresh={refetch}
              tintColor={TEAL}
              colors={[TEAL]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🌐</Text>
                <Text style={s.emptyTitle}>
                  {search.trim() ? 'No countries match your search' : 'No regions loaded'}
                </Text>
                {search.trim() ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Text style={s.clearSearch}>Clear search</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: BG },
  header:            { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 4 },
  title:             { fontSize: 26, fontWeight: '800', color: TEXT },
  subtitle:          { fontSize: 12, color: DIM, marginTop: 3, letterSpacing: 0.3 },
  planBanner:        {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: TEAL + '12', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: TEAL + '30',
  },
  planBannerFull:    { backgroundColor: '#ef444410', borderColor: '#ef444440' },
  planBannerText:    { fontSize: 12, color: TEXT, flex: 1 },
  planBannerCount:   { fontWeight: '800', color: TEAL },
  planBannerPlan:    { fontWeight: '700', color: TEAL },
  planBannerCta:     { fontSize: 12, fontWeight: '700', color: '#ef4444', marginLeft: 8 },
  searchWrap:        {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, height: 42,
  },
  searchIcon:        { fontSize: 14, marginRight: 8 },
  searchInput:       { flex: 1, color: TEXT, fontSize: 14 },
  sortRow:           { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill:              { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  pillActive:        { backgroundColor: TEAL, borderColor: TEAL },
  pillText:          { fontSize: 12, fontWeight: '600', color: DIM },
  pillTextActive:    { color: '#fff' },
  errorBanner:       { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#ef444422', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ef4444' },
  errorText:         { color: '#ef4444', fontSize: 13 },
  list:              { paddingTop: 4, paddingBottom: 40 },
  empty:             { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon:         { fontSize: 36, marginBottom: 12 },
  emptyTitle:        { fontSize: 15, color: DIM, textAlign: 'center', marginBottom: 12 },
  clearSearch:       { color: TEAL, fontSize: 14, fontWeight: '600' },
});
