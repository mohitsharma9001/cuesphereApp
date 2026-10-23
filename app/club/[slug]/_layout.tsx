import { Stack, useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/constants/theme';
import { ClubProvider } from '@/lib/club-context';

/** Everything inside one club: its tabs plus club screens (gallery, hall of fame, …). */
export default function ClubLayout() {
  const { c } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <ClubProvider slug={slug}>
      <Stack screenOptions={{ headerTintColor: c.primary, headerTitleStyle: { color: c.text }, headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="menu" options={{ title: 'Club menu' }} />
        <Stack.Screen name="gallery" options={{ title: 'Gallery' }} />
        <Stack.Screen name="hall-of-fame" options={{ title: 'Hall of Fame' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="dues" options={{ title: 'My dues' }} />
        <Stack.Screen name="book" options={{ title: 'Book a table' }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="staff/dues" options={{ title: 'Dues' }} />
        <Stack.Screen name="staff/income" options={{ title: 'Income' }} />
        <Stack.Screen name="staff/rates" options={{ title: 'Tables & rates' }} />
        <Stack.Screen name="staff/tournament-new" options={{ title: 'New tournament' }} />
        <Stack.Screen name="staff/tournament/[t]" options={{ title: 'Tournament' }} />
        <Stack.Screen name="staff/score/[matchId]" options={{ title: 'Scoring' }} />
        <Stack.Screen name="staff/club-settings" options={{ title: 'Club details' }} />
        <Stack.Screen name="staff/tv-stream" options={{ title: 'TV & Stream' }} />
        <Stack.Screen name="staff/gallery" options={{ title: 'Photo gallery' }} />
      </Stack>
    </ClubProvider>
  );
}
