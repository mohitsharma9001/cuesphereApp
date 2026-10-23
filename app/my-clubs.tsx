import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, Button, Caption, Card, Headline, LoadState, Row, Screen } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useSession } from '@/lib/session';
import type { Club } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const ROLE_LABEL: Record<string, string> = {
  club_admin: 'Admin',
  club_staff_receptionist: 'Receptionist',
  club_staff_referee: 'Referee',
  club_staff_scorekeeper: 'Scorekeeper',
  player: 'Player',
};

/** Clubs the signed-in player belongs to, with their role in each. */
export default function MyClubsScreen() {
  const { c } = useTheme();
  const { me, reload } = useSession();
  const ids = me?.memberships.map((m) => m.clubId) ?? [];
  const clubs = useApi<Club[]>(ids.length ? `/clubs?ids=${ids.join(',')}` : null);

  if (!me) {
    return (
      <Screen>
        <LoadState empty="Log in to see your clubs." />
        <Button title="Log in" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={clubs.refreshing} onRefresh={() => Promise.all([reload(), clubs.refresh()])}>
      {ids.length === 0 ? (
        <>
          <LoadState empty="You haven't joined a club yet." />
          <Button title="Browse Clubs" onPress={() => router.navigate('/clubs')} />
        </>
      ) : (
        <LoadState loading={clubs.loading} error={clubs.error} onRetry={clubs.refresh} />
      )}
      {me.memberships.map((m) => {
        const club = clubs.data?.find((cl) => cl.id === m.clubId);
        if (!club) return null;
        return (
          <Card key={m.id} onPress={() => router.push(`/club/${club.slug}`)}>
            <Row>
              <Avatar name={club.name} uri={club.logoUrl || null} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Headline numberOfLines={1}>{club.name}</Headline>
                <Caption>{ROLE_LABEL[m.role] ?? m.role}</Caption>
              </View>
              {me.profile?.primaryClubId === club.id && <Icon ios="star.fill" android="star" color={c.warning} size={16} />}
              <Icon ios="chevron.right" android="chevron_right" color={c.textMuted} size={14} />
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
