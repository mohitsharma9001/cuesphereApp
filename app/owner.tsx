import { Redirect, router, Stack } from 'expo-router';

import { Icon } from '@/components/icon';
import { Avatar, Body, Card, Headline, Row, Screen, Title } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useOwnerMode } from '@/lib/owner-mode';

/** Owner mode's start screen: straight into the club's admin area, or a club picker
 * for owners of several clubs. */
export default function OwnerStart() {
  const { c } = useTheme();
  const { clubs } = useOwnerMode();
  if (clubs.length === 1) return <Redirect href={`/club/${clubs[0].slug}/admin`} />;

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Title>Choose your club</Title>
      <Body muted>You run {clubs.length} clubs on CueSphere.</Body>
      {clubs.map((club) => (
        <Card key={club.id} onPress={() => router.push(`/club/${club.slug}/admin`)}>
          <Row style={{ gap: 12 }}>
            <Avatar name={club.name} uri={club.logoUrl || null} size={48} />
            <Headline style={{ flex: 1 }} numberOfLines={1}>
              {club.name}
            </Headline>
            <Icon ios="chevron.right" android="chevron_right" size={18} color={c.textMuted} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
