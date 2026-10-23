import { router, Stack } from 'expo-router';

import { TournamentForm } from '@/components/admin/tournament-form';
import { Screen, useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import type { Tournament } from '@/lib/types';

/** New tournament (#31). Everyone on CueSphere gets a "new tournament" push. */
export default function NewTournament() {
  const { slug, reload } = useClub();
  const toast = useToast();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'New tournament' }} />
      <TournamentForm
        submitLabel="Create tournament"
        onSubmit={async (input) => {
          try {
            const t = await api<Tournament>(`/clubs/${slug}/tournaments`, { method: 'POST', body: { ...input, startDate: input.startDate || undefined, endDate: input.endDate || undefined } });
            toast('Tournament created');
            reload();
            router.replace(`/club/${slug}/staff/tournament/${t.slug}`);
          } catch (e) {
            throw new Error(e instanceof ApiError ? e.message : 'Could not create the tournament.');
          }
        }}
      />
    </Screen>
  );
}
