import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ConfirmProvider, ToastProvider } from '@/components/ui';
import { AuthGateProvider } from '@/lib/auth-gate';
import { useTheme } from '@/constants/theme';
import { useOwnerMode } from '@/lib/owner-mode';
import { SessionProvider, useSession } from '@/lib/session';

export { ErrorBoundary } from 'expo-router';

// Keep the splash up until the saved session has been checked.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthGateProvider>
            <ThemedNavigator />
          </AuthGateProvider>
        </ConfirmProvider>
      </ToastProvider>
    </SessionProvider>
  );
}

function ThemedNavigator() {
  const { c, scheme } = useTheme();
  const { isLoading, me } = useSession();
  const { isOwner } = useOwnerMode();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, primary: c.primary, background: c.bg, card: c.surface, text: c.text, border: c.border } };

  if (isLoading) return null;
  SplashScreen.hide();

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerTintColor: c.primary, headerTitleStyle: { color: c.text }, headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerBackButtonDisplayMode: 'minimal' }}>
        {/* Log in / sign up first: until there's an account only these two screens exist. */}
        <Stack.Protected guard={!me}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Club owners (club admin of an approved club): the app is their club's admin only. */}
        <Stack.Protected guard={!!me && isOwner}>
          <Stack.Screen name="owner" options={{ title: '' }} />
          <Stack.Screen name="owner-menu" options={{ title: 'Account' }} />
        </Stack.Protected>
        {/* Players: the full player app. */}
        <Stack.Protected guard={!!me && !isOwner}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="menu" options={{ title: 'Menu' }} />
          <Stack.Screen name="challenge" options={{ title: 'Challenge' }} />
          <Stack.Screen name="friendly/[id]" options={{ title: 'Friendly' }} />
          <Stack.Screen name="for-clubs" options={{ title: 'For Clubs' }} />
          <Stack.Screen name="club-enquiry" options={{ title: 'Create your club' }} />
          <Stack.Screen name="create-club" options={{ title: 'Create Club' }} />
          <Stack.Screen name="players" options={{ title: 'Players' }} />
          <Stack.Screen name="friends" options={{ title: 'Friends' }} />
          <Stack.Screen name="browse/tournaments" options={{ title: '' }} />
          <Stack.Screen name="my-clubs" options={{ title: 'My Clubs' }} />
        </Stack.Protected>
        {/* Both: the club area (owners use its admin section), match/player/tournament pages. */}
        <Stack.Protected guard={!!me}>
          <Stack.Screen name="club/[slug]" options={{ headerShown: false }} />
          <Stack.Screen name="tournament/[clubSlug]/[slug]" options={{ title: '' }} />
          <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
          <Stack.Screen name="player/[id]" options={{ title: 'Player' }} />
          <Stack.Screen name="approvals" options={{ title: 'Club Approvals' }} />
          <Stack.Screen name="profile-edit" options={{ title: 'My Profile' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
