// This tab route is hidden from the tab bar (tabBarItemStyle: display:none in _layout.tsx).
// Navigating to /(tabs)/markets redirects to the full-screen /markets route.
import { Redirect } from 'expo-router';
export default function MarketsTabRedirect() {
  return <Redirect href="/markets" />;
}
