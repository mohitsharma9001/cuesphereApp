import { router, Tabs } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, Body, Button, PressableScale, Screen, Title } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { useOwnerMode } from '@/lib/owner-mode';

/** Club admin (#24–#36): Overview · Tables · Tournaments · Live · Settings for staff;
 * scorekeeper-only accounts see just Live. */
export default function AdminLayout() {
  const { c } = useTheme();
  const { slug, club, isStaff, isScorekeeperOnly, standing } = useClub();
  const { clubs: owned } = useOwnerMode();
  const ownerHere = owned.some((o) => o.slug === slug || o.id === club?.id);

  if (standing && !isStaff) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: 12, marginTop: 60 }}>
          <Icon ios="lock.fill" android="lock" color={c.textMuted} size={36} />
          <Title>Staff only</Title>
          <Body muted style={{ textAlign: 'center' }}>Club admin tools are for {club?.name ?? 'the club'}&apos;s staff.</Body>
          <Button title="Back to the club" variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  // Wait for the viewer's role: building the tabs first would hide Overview (manager
  // unknown yet), and the router jumps away from hidden tabs (to Live).
  if (!standing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const manager = isStaff && !isScorekeeperOnly;
  const show = (visible: boolean) => (visible ? undefined : null);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.border },
        tabBarLabelStyle: { fontWeight: '600' },
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 17 }} numberOfLines={1}>
              {club?.name ?? ''}
            </Text>
            <View style={{ backgroundColor: c.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 10, letterSpacing: 0.8 }}>{isScorekeeperOnly ? 'SCORER' : 'ADMIN'}</Text>
            </View>
          </View>
        ),
        headerLeft: () =>
          ownerHere ? (
            // Owners: the club badge opens their Account page (profile, settings, log out).
            <PressableScale accessibilityRole="button" accessibilityLabel="Account" hitSlop={10} onPress={() => router.push(`/owner-menu?slug=${slug}`)} style={{ marginHorizontal: 14 }}>
              <Avatar name={club?.name ?? ''} uri={club?.logoUrl || null} size={34} />
            </PressableScale>
          ) : (
            <PressableScale accessibilityRole="button" accessibilityLabel="Back to the club" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.navigate(`/club/${slug}`))} style={{ marginHorizontal: 14 }}>
              <Icon ios="chevron.left" android="arrow_back" color={c.primary} size={20} />
            </PressableScale>
          ),
      }}>
      <Tabs.Screen name="index" options={{ title: 'Overview', href: show(manager), tabBarIcon: ({ color }) => <Icon ios="square.grid.2x2.fill" android="dashboard" color={color} /> }} />
      <Tabs.Screen name="tables" options={{ title: 'Tables', href: show(manager), tabBarIcon: ({ color }) => <Icon ios="clock.fill" android="timer" color={color} /> }} />
      <Tabs.Screen name="tournaments" options={{ title: 'Tournaments', href: show(manager), tabBarIcon: ({ color }) => <Icon ios="trophy.fill" android="emoji_events" color={color} /> }} />
      <Tabs.Screen name="live" options={{ title: 'Live', tabBarIcon: ({ color }) => <Icon ios="dot.radiowaves.left.and.right" android="sensors" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', href: show(manager), tabBarIcon: ({ color }) => <Icon ios="gearshape.fill" android="settings" color={color} /> }} />
    </Tabs>
  );
}
