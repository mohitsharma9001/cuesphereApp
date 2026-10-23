import { router } from 'expo-router';
import { Text } from 'react-native';

import { Caption, Card, Headline, LoadState, Row, Screen, SectionTitle } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { formatDateRange } from '@/lib/format';
import type { Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface MyRegistration {
  id: string;
  tournamentId: string;
  registrationNumber: string;
  status: 'pending_approval' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
}

/** Your activity at this club: tournament entries and their status. */
export default function ClubDashboard() {
  const { c } = useTheme();
  const { slug, club, standing } = useClub();
  const regs = useApi<MyRegistration[]>(`/clubs/${slug}/registrations/mine`);
  const ids = regs.data?.map((r) => r.tournamentId).filter((id) => /^[0-9a-f]{24}$/i.test(id)) ?? [];
  const tournaments = useApi<Tournament[]>(ids.length ? `/tournaments?ids=${ids.join(',')}` : null);
  const byId = new Map(tournaments.data?.map((t) => [t.id, t]));

  return (
    <Screen refreshing={regs.refreshing} onRefresh={() => Promise.all([regs.refresh(), tournaments.reload()])}>
      <Headline>{club?.name}</Headline>
      {standing?.membership && <Caption>Member ID {standing.membership.memberId || '—'}</Caption>}
      {standing?.currentMatchId && (
        <Card onPress={() => router.push(`/match/${standing.currentMatchId}`)} style={{ borderWidth: 1, borderColor: c.accentSoft }}>
          <Headline style={{ color: c.live }}>● Your match is on — open it</Headline>
        </Card>
      )}
      <SectionTitle>My tournaments</SectionTitle>
      <LoadState loading={regs.loading} error={regs.error} onRetry={regs.refresh} empty={regs.data?.length === 0 && 'You haven’t entered a tournament here yet.'} />
      {regs.data?.map((r) => {
        const t = byId.get(r.tournamentId);
        return (
          <Card key={r.id} onPress={() => t && router.push(`/tournament/${slug}/${t.slug}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Headline style={{ flex: 1 }} numberOfLines={1}>{t?.name ?? 'Tournament'}</Headline>
              <Text style={{ color: r.status === 'confirmed' ? c.success : c.warning, fontWeight: '800', fontSize: 12 }}>
                {r.status === 'confirmed' ? 'Confirmed' : r.status === 'pending_approval' ? 'Pending approval' : 'Cancelled'}
              </Text>
            </Row>
            <Caption>
              {[r.registrationNumber, t && formatDateRange(t.startDate, t.endDate), r.paymentStatus === 'paid' ? 'Fee paid' : 'Fee due at the club'].filter(Boolean).join(' · ')}
            </Caption>
          </Card>
        );
      })}
    </Screen>
  );
}
