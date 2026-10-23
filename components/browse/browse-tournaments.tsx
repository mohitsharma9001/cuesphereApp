import { useState } from 'react';
import { View } from 'react-native';

import { RegisterSheet } from '@/components/tournament/register-sheet';
import { TournamentCard } from '@/components/tournament/tournament-card';
import { Caption, LoadState, Screen, SegmentedControl, Title } from '@/components/ui';
import { useRequireAuth } from '@/lib/auth-gate';
import type { Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Status = 'upcoming' | 'live' | 'completed';

const EMPTY: Record<Status, string> = {
  upcoming: 'No upcoming tournaments right now. Check back soon.',
  live: 'Nothing is being played right now.',
  completed: 'No finished tournaments yet.',
};

/** Tournaments (#3): every approved club's tournaments, by status. */
export function BrowseTournaments() {
  const requireAuth = useRequireAuth();
  const [status, setStatus] = useState<Status>('upcoming');
  const [registering, setRegistering] = useState<Tournament | null>(null);

  // All three load together, so switching is instant and the labels can show counts.
  const lists: Record<Status, ReturnType<typeof useApi<Tournament[]>>> = {
    upcoming: useApi<Tournament[]>('/tournaments?status=upcoming'),
    live: useApi<Tournament[]>('/tournaments?status=live'),
    completed: useApi<Tournament[]>('/tournaments?status=completed'),
  };
  const active = lists[status];
  const label = (s: Status, name: string) => (lists[s].data ? `${name} (${lists[s].data!.length})` : name);

  return (
    <Screen refreshing={active.refreshing} onRefresh={active.refresh}>
      <Title>Tournaments</Title>
      <Caption style={{ marginTop: -6 }}>From every club on CueSphere</Caption>
      <SegmentedControl
        value={status}
        onChange={setStatus}
        options={[
          { value: 'upcoming', label: label('upcoming', 'Upcoming') },
          { value: 'live', label: label('live', 'Live') },
          { value: 'completed', label: label('completed', 'Completed') },
        ]}
      />
      <LoadState loading={active.loading} error={active.error} onRetry={active.refresh} empty={active.data?.length === 0 && EMPTY[status]} />
      {active.data?.map((t, i) => (
        <View key={t.id}>
          <TournamentCard tournament={t} onRegister={(picked) => requireAuth('to register for this tournament', () => setRegistering(picked))} />
        </View>
      ))}

      {registering?.club && (
        <RegisterSheet
          tournament={registering}
          clubSlug={registering.club.slug}
          visible
          onClose={() => setRegistering(null)}
          onRegistered={() => lists.upcoming.reload()}
        />
      )}
    </Screen>
  );
}
