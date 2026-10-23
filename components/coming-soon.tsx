import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Body, Button, Caption, Screen, Title } from '@/components/ui';
import { useTheme } from '@/constants/theme';

/** Placeholder for screens still to be built, so every link already works.
 * `task` is the task number in mobile-app-tasks.md that builds this screen. */
export function ComingSoon({
  title,
  task,
  description,
  icon = ['hammer.fill', 'construction'],
}: {
  title: string;
  task: number;
  description?: string;
  icon?: [string, string];
}) {
  const { c } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <View style={{ alignItems: 'center', gap: 14, marginTop: 48, paddingHorizontal: 12 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios={icon[0]} android={icon[1]} color={c.primary} size={36} />
        </View>
        <Title style={{ textAlign: 'center' }}>{title}</Title>
        <Body muted style={{ textAlign: 'center' }}>{description ?? 'This screen is on its way.'}</Body>
        <Caption>Coming in Task {task}</Caption>
        <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
          <Button title="Back to Home" variant="secondary" onPress={() => router.navigate('/')} />
        </View>
      </View>
    </Screen>
  );
}
