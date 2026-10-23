import { router, Tabs } from 'expo-router';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { useSession } from '@/lib/session';

/** Club tabs (like the website): Home · Tournaments · Live, then Admin (staff) /
 * Score (scorekeepers) / Friends (players), then Me. */
export default function ClubTabsLayout() {
  const { c } = useTheme();
  const { me } = useSession();
  const { slug, club, isStaff, isScorekeeperOnly } = useClub();

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
        headerTitleStyle: { color: c.text, fontWeight: '700' },
        headerTitle: club?.name ?? '',
        headerLeft: () => (
          <PressableScale accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} style={{ marginHorizontal: 14 }}>
            <Icon ios="chevron.left" android="arrow_back" color={c.primary} size={20} />
          </PressableScale>
        ),
        headerRight: () => (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Club menu"
            hitSlop={10}
            onPress={() => router.push(`/club/${slug}/menu`)}
            style={{ marginHorizontal: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon ios="line.3.horizontal" android="menu" color={c.text} size={20} />
          </PressableScale>
        ),
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Icon ios="house.fill" android="home" color={color} /> }} />
      <Tabs.Screen name="tournaments" options={{ title: 'Tournaments', tabBarIcon: ({ color }) => <Icon ios="trophy.fill" android="emoji_events" color={color} /> }} />
      <Tabs.Screen name="live" options={{ title: 'Live', tabBarIcon: ({ color }) => <Icon ios="dot.radiowaves.left.and.right" android="sensors" color={color} /> }} />
      <Tabs.Screen
        name="admin-tab"
        options={{ title: 'Admin', href: show(isStaff && !isScorekeeperOnly), tabBarIcon: ({ color }) => <Icon ios="checkmark.shield.fill" android="admin_panel_settings" color={color} /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push(`/club/${slug}/admin`);
          },
        }}
      />
      <Tabs.Screen
        name="score-tab"
        options={{ title: 'Score', href: show(isScorekeeperOnly), tabBarIcon: ({ color }) => <Icon ios="square.grid.3x3.fill" android="scoreboard" color={color} /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push(`/club/${slug}/admin/live`);
          },
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{ title: 'Friends', href: show(!isStaff), tabBarIcon: ({ color }) => <Icon ios="person.2.fill" android="group" color={color} /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.navigate('/friends');
          },
        }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'Me', tabBarIcon: ({ color }) => <Icon ios="person.crop.circle.fill" android="account_circle" color={color} /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push(me?.profile ? `/player/${me.profile.id}` : '/profile-edit');
          },
        }}
      />
    </Tabs>
  );
}
