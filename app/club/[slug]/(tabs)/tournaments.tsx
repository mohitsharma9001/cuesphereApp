import { useState } from 'react';
import { View } from 'react-native';

import { RegisterSheet } from '@/components/tournament/register-sheet';
import { TournamentCard } from '@/components/tournament/tournament-card';
import { LoadState, Screen, SegmentedControl } from '@/components/ui';
import { useRequireAuth } from '@/lib/auth-gate';
import { useClub } from '@/lib/club-context';
import type { Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Filter = 'upcoming' | 'live' | 'completed';

/** The club's tournaments (#18 list; the details page is upgraded in Task 18). */
export default function ClubTournaments() {
  const { slug } = useClub();
  const requireAuth = useRequireAuth();
  const list = useApi<Tournament[]>(`/clubs/${slug}/tournaments`);
  const registered = useApi<{ tournamentId: string }[]>(`/clubs/${slug}/registrations/mine`);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [registering, setRegistering] = useState<Tournament | null>(null);

  const mine = new Set(registered.data?.map((r) => r.tournamentId));
  const all = (list.data ?? []).map((t) => ({ ...t, isRegistered: mine.has(t.id) }));
  const shown = all.filter((t) => t.status === filter);
  const count = (f: Filter) => all.filter((t) => t.status === f).length;

  return (
    <Screen refreshing={list.refreshing} onRefresh={() => Promise.all([list.refresh(), registered.reload()])}>
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'upcoming', label: `Upcoming (${count('upcoming')})` },
          { value: 'live', label: `Live (${count('live')})` },
          { value: 'completed', label: `Done (${count('completed')})` },
        ]}
      />
      <LoadState loading={list.loading} error={list.error} onRetry={list.refresh} empty={list.data && shown.length === 0 && `No ${filter === 'completed' ? 'finished' : filter} tournaments.`} />
      {shown.map((t, i) => (
        <View key={t.id}>
          <TournamentCard tournament={t} clubSlug={slug} onRegister={(picked) => requireAuth('to register for this tournament', () => setRegistering(picked))} />
        </View>
      ))}
      {registering && (
        <RegisterSheet
          tournament={registering}
          clubSlug={slug}
          visible
          onClose={() => setRegistering(null)}
          onRegistered={() => {
            list.reload();
            registered.reload();
          }}
        />
      )}
    </Screen>
  );
}
