import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeaderBackground, BrandHeaderTitle } from '@/components/brand';
import { Icon } from '@/components/icon';
import { MenuButton } from '@/components/menu-button';
import { useTheme } from '@/constants/theme';

/** Player tabs: Home · Play · Rankings · Me · Clubs. Friends opens from the ☰ menu;
 * all tournaments open as /browse/tournaments. */
export default function TabLayout() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: c.text, fontWeight: '800' },
        headerRight: () => <MenuButton />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          // Website-style dark app bar with the logo and name (Home only).
          headerTitle: () => <BrandHeaderTitle />,
          headerTitleAlign: 'left',
          headerBackground: () => <BrandHeaderBackground />,
          // Tuck the logo row up into the bottom of the status-bar area (still clear of the
          // notch / Dynamic Island) so there's no tall empty band above it.
          headerStatusBarHeight: Math.max(insets.top - 10, 20),
          headerRight: () => <MenuButton onDark />,
          tabBarIcon: ({ color }) => <Icon ios="house.fill" android="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{ title: 'Play', tabBarIcon: ({ color }) => <Icon ios="figure.pool.swim" android="sports_esports" color={color} /> }}
      />
      <Tabs.Screen
        name="rankings"
        options={{ title: 'Rankings', tabBarIcon: ({ color }) => <Icon ios="chart.bar.fill" android="leaderboard" color={color} /> }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'Me', tabBarIcon: ({ color }) => <Icon ios="person.crop.circle.fill" android="account_circle" color={color} /> }}
      />
      <Tabs.Screen
        name="clubs"
        options={{ title: 'Clubs', tabBarIcon: ({ color }) => <Icon ios="building.2.fill" android="store" color={color} /> }}
      />
    </Tabs>
  );
}
