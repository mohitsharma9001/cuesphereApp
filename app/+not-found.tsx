import { Link, Stack } from 'expo-router';

import { Body, Screen, Title } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Title>This screen doesn&apos;t exist.</Title>
      <Link href="/">
        <Body muted>Go to the home screen</Body>
      </Link>
    </Screen>
  );
}
