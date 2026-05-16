import React from 'react';
import { I18nManager, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../src/store/hooks';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index:   '📡',
    explore: '🌍',
    alerts:  '🔔',
    profile: '👤',
  };
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[name]}</Text>;
}

export default function TabLayout() {
  const { t } = useTranslation();
  const unreadCount = useAppSelector(s => s.alerts.unreadCount);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle:           { backgroundColor: '#07101f', borderTopColor: '#1a2d45' },
        tabBarActiveTintColor:   '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        headerStyle:             { backgroundColor: '#07101f' },
        headerTintColor:         '#f1f5f9',
        headerTitleStyle:        { fontWeight: '700' },
        tabBarPosition: I18nManager.isRTL ? 'bottom' : 'bottom',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:       t('nav.feed'),
          headerTitle: 'StratLens',
          tabBarIcon:  ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title:      t('nav.explore'),
          tabBarIcon: ({ focused }) => <TabIcon name="explore" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title:       t('nav.alerts'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon:  ({ focused }) => <TabIcon name="alerts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title:      t('nav.profile'),
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
      {/* markets.tsx still exists as a file (Expo Router requires it);
          hide it from the tab bar — it redirects to /markets instead. */}
      <Tabs.Screen
        name="markets"
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}
