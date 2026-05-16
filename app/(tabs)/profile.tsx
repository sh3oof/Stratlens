import React, { useEffect, useState } from 'react';
import {
  Alert,
  I18nManager,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MarketTicker } from '../../src/components/MarketTicker';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { signOut } from '../../src/store/slices/authSlice';
import {
  changeLanguage,
  LANGUAGE_META,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '../../src/i18n';
import { BG, CARD, TEAL, TEXT, DIM, BORDER } from '../../src/constants/theme';
import { usePlan } from '../../src/hooks/usePlan';

const NOTIF_KEY  = '@stratlens_notif_prefs';
const APP_VERSION = '1.0.0';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotifPrefs {
  push:          boolean;
  highPriority:  boolean;
  dailyBriefing: boolean;
  emailDigest:   boolean;
}

const DEFAULT_NOTIF: NotifPrefs = {
  push:          false,
  highPriority:  true,
  dailyBriefing: false,
  emailDigest:   false,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={h.label}>{label}</Text>;
}
const h = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '700', color: DIM, letterSpacing: 1.2, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8, textTransform: 'uppercase' },
});

interface RowProps {
  icon:     React.ComponentProps<typeof Ionicons>['name'];
  label:    string;
  value?:   string;
  onPress?: () => void;
  right?:   React.ReactNode;
  danger?:  boolean;
  last?:    boolean;
}

function SettingRow({ icon, label, value, onPress, right, danger, last }: RowProps) {
  const isRTL  = I18nManager.isRTL;
  const color  = danger ? '#ef4444' : TEXT;
  const Inner  = (
    <View style={[r.row, isRTL && r.rowRTL, last && r.rowLast]}>
      <View style={[r.iconWrap, danger && { backgroundColor: '#ef444420' }]}>
        <Ionicons name={icon} size={17} color={danger ? '#ef4444' : TEAL} />
      </View>
      <Text style={[r.label, { color }, isRTL && r.textRTL]} numberOfLines={1}>{label}</Text>
      {right ? (
        right
      ) : (
        <View style={[r.valueRow, isRTL && r.valueRowRTL]}>
          {value ? <Text style={[r.value, isRTL && r.textRTL]}>{value}</Text> : null}
          {onPress ? <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={15} color={DIM} /> : null}
        </View>
      )}
    </View>
  );
  if (!onPress) return Inner;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {Inner}
    </TouchableOpacity>
  );
}

const r = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowRTL:      { flexDirection: 'row-reverse' },
  rowLast:     { borderBottomWidth: 0 },
  iconWrap:    { width: 32, height: 32, borderRadius: 8, backgroundColor: TEAL + '18', alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  label:       { flex: 1, fontSize: 14, color: TEXT, fontWeight: '500' },
  textRTL:     { textAlign: 'right', writingDirection: 'rtl' },
  valueRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueRowRTL: { flexDirection: 'row-reverse' },
  value:       { fontSize: 13, color: DIM },
});

function Card({ children }: { children: React.ReactNode }) {
  return <View style={cd.wrap}>{children}</View>;
}
const cd = StyleSheet.create({
  wrap: { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name?: string, email?: string): string {
  if (name?.trim()) {
    return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
  return (email?.[0] ?? '?').toUpperCase();
}

function formatMemberSince(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function alertSensitivityLabel(enabled: boolean): string {
  return enabled ? 'All Important' : 'High Only';
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const dispatch   = useAppDispatch();
  const { i18n }  = useTranslation();
  const isRTL      = I18nManager.isRTL;
  const user       = useAppSelector(s => s.auth.user);

  const [notif,        setNotif]        = useState<NotifPrefs>(DEFAULT_NOTIF);
  const [changingLang, setChangingLang] = useState(false);
  const [signingOut,   setSigningOut]   = useState(false);

  // ── Load notification preferences from storage ───────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then(raw => {
      if (raw) {
        try { setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(raw) }); } catch {}
      }
    });
  }, []);

  async function saveNotifPref(key: keyof NotifPrefs, value: boolean) {
    const next = { ...notif, [key]: value };
    setNotif(next);
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  }

  // ── Language switching ───────────────────────────────────────────────────
  async function handleLanguageChange(lang: SupportedLanguage) {
    if (lang === i18n.language || changingLang) return;
    setChangingLang(true);
    try {
      const needsReload = await changeLanguage(lang);
      if (needsReload) {
        Alert.alert(
          lang === 'ar' ? 'إعادة تشغيل مطلوبة' : 'Restart Required',
          lang === 'ar'
            ? 'أغلق التطبيق وأعِد فتحه لتفعيل تخطيط اللغة العربية.'
            : 'Close and reopen the app to apply the Arabic RTL layout.',
          [{ text: lang === 'ar' ? 'حسناً' : 'OK' }]
        );
      }
    } finally {
      setChangingLang(false);
    }
  }

  // ── Sign out ─────────────────────────────────────────────────────────────
  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of StratLens?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await dispatch(signOut());
            setSigningOut(false);
          },
        },
      ]
    );
  }

  // ── External links ────────────────────────────────────────────────────────
  function openURL(url: string) {
    Linking.openURL(url).catch(() =>
      Alert.alert('Unable to open link', url)
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName  = user?.displayName ?? user?.email?.split('@')[0] ?? 'User';
  const avatarText   = initials(user?.displayName, user?.email);
  const memberSince  = formatMemberSince(user?.createdAt);
  const watchCount   = user?.watchedRegions?.length ?? 0;
  const topicTags    = user?.watchedCategories?.slice(0, 3).join(', ') ?? '—';
  const sensitivity  = alertSensitivityLabel(user?.alertsEnabled ?? false);
  const currentLang  = (i18n.language as SupportedLanguage) ?? 'en';
  const { plan, allowedCodes, totalCountries } = usePlan();

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── A. User Header ─────────────────────────────────────────────── */}
      <View style={[s.headerCard, isRTL && s.headerCardRTL]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{avatarText}</Text>
        </View>
        <View style={[s.headerInfo, isRTL && s.headerInfoRTL]}>
          <View style={[s.nameRow, isRTL && s.nameRowRTL]}>
            <Text style={[s.displayName, isRTL && r.textRTL]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={[s.planBadge, { backgroundColor: plan.color + '20', borderColor: plan.color + '60' }]}>
              <Text style={[s.planText, { color: plan.color }]}>{plan.name.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[s.email, isRTL && r.textRTL]} numberOfLines={1}>{user?.email ?? ''}</Text>
          {memberSince ? (
            <Text style={[s.memberSince, isRTL && r.textRTL]}>Member since {memberSince}</Text>
          ) : null}
        </View>
      </View>

      <MarketTicker />

      {/* ── B. Subscription ────────────────────────────────────────────── */}
      <SectionHeader label="Subscription" />
      <Card>
        <SettingRow
          icon="diamond-outline"
          label="Current Plan"
          value={plan.name}
          onPress={() => router.push('/paywall')}
        />
        <SettingRow
          icon="globe-outline"
          label="Countries"
          value={
            totalCountries > 0
              ? `${Math.min(allowedCodes.size, totalCountries)} / ${plan.countries_limit >= 999 ? '∞' : plan.countries_limit}`
              : plan.countries_limit >= 999 ? 'Unlimited' : String(plan.countries_limit)
          }
          onPress={() => router.push('/paywall')}
        />
        <SettingRow
          icon="arrow-up-circle-outline"
          label="Manage Plan"
          last
          onPress={() => router.push('/paywall')}
        />
      </Card>
      {plan.id === 'free' && (
        <TouchableOpacity style={s.upgradePrompt} onPress={() => router.push('/paywall')} activeOpacity={0.8}>
          <Text style={s.upgradePromptText}>
            Upgrade to Professional for AI summaries, alerts, and 25 countries
          </Text>
          <Text style={s.upgradePromptCta}>See Plans →</Text>
        </TouchableOpacity>
      )}

      {/* ── C. Watchlist ───────────────────────────────────────────────── */}
      <SectionHeader label="Watchlist & Preferences" />
      <Card>
        <SettingRow
          icon="globe-outline"
          label="Countries"
          value={watchCount > 0 ? `${watchCount} watching` : 'None selected'}
          onPress={() => Alert.alert('Coming Soon', 'Country watchlist editor coming in a future update.')}
        />
        <SettingRow
          icon="bookmark-outline"
          label="Topic Interests"
          value={topicTags || 'None selected'}
          onPress={() => Alert.alert('Coming Soon', 'Topic preferences editor coming in a future update.')}
        />
        <SettingRow
          icon="options-outline"
          label="Alert Sensitivity"
          value={sensitivity}
          last
          onPress={() => Alert.alert('Coming Soon', 'Alert sensitivity settings coming in a future update.')}
        />
      </Card>

      {/* ── C. Language ────────────────────────────────────────────────── */}
      <SectionHeader label="Language" />
      <Card>
        <View style={[s.langRow, isRTL && s.langRowRTL]}>
          {(SUPPORTED_LANGUAGES as readonly SupportedLanguage[]).map((code, idx) => {
            const meta   = LANGUAGE_META[code];
            const active = currentLang === code;
            const last   = idx === SUPPORTED_LANGUAGES.length - 1;
            return (
              <TouchableOpacity
                key={code}
                style={[s.langBtn, active && s.langBtnActive, last && { marginRight: 0 }]}
                onPress={() => handleLanguageChange(code)}
                disabled={changingLang}
                activeOpacity={0.75}
              >
                <Text style={s.langFlag}>{meta.flag}</Text>
                <Text style={[s.langLabel, active && s.langLabelActive]}>
                  {meta.nativeLabel}
                </Text>
                {active && <View style={s.langActiveDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[s.langNote, isRTL && r.textRTL]}>
          Arabic requires an app restart to apply RTL layout.
        </Text>
      </Card>

      {/* ── D. Notifications ───────────────────────────────────────────── */}
      <SectionHeader label="Notifications" />
      <Card>
        {(
          [
            { key: 'push',          icon: 'notifications-outline' as const, label: 'Push Notifications'   },
            { key: 'highPriority',  icon: 'alert-circle-outline'  as const, label: 'High Priority Alerts' },
            { key: 'dailyBriefing', icon: 'calendar-outline'      as const, label: 'Daily Briefing'       },
            { key: 'emailDigest',   icon: 'mail-outline'          as const, label: 'Email Digest'         },
          ] as Array<{ key: keyof NotifPrefs; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }>
        ).map(({ key, icon, label }, idx, arr) => (
          <SettingRow
            key={key}
            icon={icon}
            label={label}
            last={idx === arr.length - 1}
            right={
              <Switch
                value={notif[key]}
                onValueChange={v => saveNotifPref(key, v)}
                trackColor={{ false: '#1a2d45', true: TEAL + '80' }}
                thumbColor={notif[key] ? TEAL : '#334155'}
                ios_backgroundColor="#1a2d45"
              />
            }
          />
        ))}
      </Card>

      {/* ── E. Account Settings ────────────────────────────────────────── */}
      <SectionHeader label="Account" />
      <Card>
        <SettingRow
          icon="trending-up-outline"
          label="Markets"
          value="Live prices"
          onPress={() => router.push('/markets')}
        />
        <SettingRow
          icon="person-outline"
          label="Edit Profile"
          onPress={() => Alert.alert('Coming Soon', 'Profile editing coming in a future update.')}
        />
        <SettingRow
          icon="lock-closed-outline"
          label="Change Password"
          onPress={() => Alert.alert('Coming Soon', 'Password change coming in a future update.')}
        />
        <SettingRow
          icon="shield-outline"
          label="Privacy Policy"
          onPress={() => openURL('https://stratlens.site/privacy')}
        />
        <SettingRow
          icon="document-text-outline"
          label="Terms of Use"
          onPress={() => openURL('https://stratlens.site/terms')}
        />
        <SettingRow
          icon="server-outline"
          label="Data Sources"
          last
          onPress={() => openURL('https://stratlens.site/sources')}
        />
      </Card>

      {/* ── F. Danger Zone ─────────────────────────────────────────────── */}
      <SectionHeader label="Danger Zone" />
      <Card>
        <SettingRow
          icon="log-out-outline"
          label={signingOut ? 'Signing out…' : 'Sign Out'}
          danger
          last
          onPress={signingOut ? undefined : handleSignOut}
        />
      </Card>

      {/* ── G. App Info ────────────────────────────────────────────────── */}
      <View style={s.appInfo}>
        <Text style={s.appVersion}>StratLens v{APP_VERSION}</Text>
        <Text style={s.appTagline}>Intelligence. Perspective. Advantage.</Text>
        <TouchableOpacity onPress={() => openURL('https://stratlens.site')}>
          <Text style={s.appLink}>stratlens.site</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: BG },
  content:        { paddingTop: 60 },

  // User header card
  headerCard:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 4, backgroundColor: CARD, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  headerCardRTL:  { flexDirection: 'row-reverse' },
  avatar:         { width: 64, height: 64, borderRadius: 32, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, flexShrink: 0 },
  avatarText:     { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerInfo:     { flex: 1, minWidth: 0 },
  headerInfoRTL:  { alignItems: 'flex-end' },
  nameRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  nameRowRTL:     { flexDirection: 'row-reverse' },
  displayName:    { fontSize: 17, fontWeight: '700', color: TEXT, flexShrink: 1 },
  planBadge:      { backgroundColor: TEAL + '20', borderRadius: 4, borderWidth: 1, borderColor: TEAL + '50', paddingHorizontal: 7, paddingVertical: 2 },
  planText:       { fontSize: 9, fontWeight: '800', color: TEAL, letterSpacing: 0.8 },
  email:          { fontSize: 12, color: DIM, marginBottom: 3 },
  memberSince:    { fontSize: 11, color: DIM, fontStyle: 'italic' },

  // Language section
  langRow:        { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 10 },
  langRowRTL:     { flexDirection: 'row-reverse' },
  langBtn:        { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, gap: 4, position: 'relative' },
  langBtnActive:  { borderColor: TEAL, backgroundColor: TEAL + '15' },
  langFlag:       { fontSize: 22 },
  langLabel:      { fontSize: 11, fontWeight: '600', color: DIM },
  langLabelActive:{ color: TEAL },
  langActiveDot:  { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: TEAL },
  langNote:       { fontSize: 11, color: DIM, textAlign: 'center', paddingHorizontal: 16, paddingBottom: 14, fontStyle: 'italic' },

  // Upgrade prompt
  upgradePrompt:     { marginHorizontal: 16, marginTop: 8, backgroundColor: TEAL + '12', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: TEAL + '35', flexDirection: 'row', alignItems: 'center', gap: 10 },
  upgradePromptText: { flex: 1, fontSize: 12, color: TEXT, lineHeight: 17 },
  upgradePromptCta:  { fontSize: 12, fontWeight: '700', color: TEAL },

  // App info
  appInfo:        { alignItems: 'center', paddingTop: 32, paddingBottom: 8 },
  appVersion:     { fontSize: 13, fontWeight: '700', color: DIM, marginBottom: 4 },
  appTagline:     { fontSize: 11, color: DIM + 'aa', fontStyle: 'italic', marginBottom: 8 },
  appLink:        { fontSize: 12, color: TEAL },
});
