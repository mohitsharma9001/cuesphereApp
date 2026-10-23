import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Caption, Card, Headline, ListGroup, ListItem, LoadState, Row, Screen, SectionTitle } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { Match, PlayerProfile, Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface DaySummary {
  collected: number;
  byMethod: { cash: number; upi: number; card: number };
  unpaid: number;
  playing: number;
  free: number;
  bookedToday: number;
}
interface StaffRegistration {
  id: string;
  tournamentId: string;
  playerId: string;
  status: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

const ROLE: Record<string, string> = {
  club_admin: 'Club admin',
  club_staff_receptionist: 'Receptionist',
  club_staff_referee: 'Referee',
  club_staff_scorekeeper: 'Scorekeeper',
};

/** Admin Overview (#24). */
export default function AdminOverview() {
  const { c } = useTheme();
  const { slug, club, role, isScorekeeperOnly, reload } = useClub();
  const summary = useApi<DaySummary>(`/clubs/${slug}/table-summary`);
  const scorable = useApi<Match[]>(`/clubs/${slug}/matches/scorable`);
  const tournaments = useApi<Tournament[]>(`/clubs/${slug}/tournaments`);
  const registrations = useApi<StaffRegistration[]>(`/clubs/${slug}/registrations`);
  const recent = (registrations.data ?? []).slice(0, 6);
  const players = useApi<PlayerProfile[]>(recent.length ? `/profiles/batch?ids=${[...new Set(recent.map((r) => r.playerId))].join(',')}` : null);

  useFocusEffect(
    useCallback(() => {
      summary.reload();
      scorable.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug])
  );

  if (isScorekeeperOnly) return <Redirect href={`/club/${slug}/admin/live`} />;

  const live = (scorable.data ?? []).filter((m) => m.status === 'live').length;
  const tName = new Map(tournaments.data?.map((t) => [t.id, t.name]));
  const pName = new Map(players.data?.map((p) => [p.id, p.fullName]));
  const s = summary.data;
  const refresh = () => Promise.all([reload(), summary.reload(), scorable.reload(), tournaments.refresh(), registrations.reload()]);

  return (
    <Screen refreshing={tournaments.refreshing} onRefresh={refresh}>
      <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>OVERVIEW · {(role && ROLE[role]) || 'Staff'}</Caption>
      {club?.status === 'pending' && (
        <Card style={{ backgroundColor: c.accentSoft }}>
          <Headline style={{ color: c.accent }}>Waiting for approval</Headline>
          <Caption>Your club isn&apos;t public yet. You can set it up now — it goes live once the CueSphere team approves it.</Caption>
        </Card>
      )}

      <View>
        <Row style={{ gap: 10 }}>
          <Tile label="Members" value={club?.memberCount ?? '–'} icon={['person.2.fill', 'group']} tint={c.info} />
          <Tile label="Tournaments" value={club?.tournamentCount ?? '–'} icon={['trophy.fill', 'emoji_events']} tint={c.warning} onPress={() => router.navigate(`/club/${slug}/admin/tournaments`)} />
          <Tile label="Live now" value={live} icon={['dot.radiowaves.left.and.right', 'sensors']} tint={c.live} onPress={() => router.navigate(`/club/${slug}/admin/live`)} />
        </Row>
      </View>

      <View>
        <Card onPress={() => router.navigate(`/club/${slug}/admin/tables`)} style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>TODAY AT THE TABLES</Caption>
            <Caption>Tables ›</Caption>
          </Row>
          {s ? (
            <>
              <Text style={{ color: c.text, fontSize: 28, fontWeight: '900' }}>{formatMoney(s.collected)}</Text>
              <Caption>
                Cash {formatMoney(s.byMethod.cash)} · UPI {formatMoney(s.byMethod.upi)} · Card {formatMoney(s.byMethod.card)}
              </Caption>
              <Row style={{ gap: 16, marginTop: 4 }}>
                <Caption style={{ color: c.text }}>
                  <Text style={{ fontWeight: '800' }}>{s.playing}</Text> playing · <Text style={{ fontWeight: '800' }}>{s.free}</Text> free
                </Caption>
                {s.unpaid > 0 && <Caption style={{ color: c.accent, fontWeight: '800' }}>{formatMoney(s.unpaid)} to collect</Caption>}
              </Row>
            </>
          ) : (
            <LoadState loading={summary.loading} error={summary.error} onRetry={summary.reload} />
          )}
        </Card>
      </View>

      <SectionTitle>Recent registrations</SectionTitle>
      <LoadState loading={registrations.loading} error={registrations.error} onRetry={registrations.reload} empty={registrations.data?.length === 0 && 'No registrations yet.'} />
      {recent.length > 0 && (
        <Card style={{ gap: 10 }}>
          {recent.map((r) => (
            <Row key={r.id} style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '700' }} numberOfLines={1}>{pName.get(r.playerId) ?? 'Player'}</Text>
                <Caption numberOfLines={1}>
                  {tName.get(r.tournamentId) ?? 'Tournament'} · {formatDateTime(r.createdAt)}
                </Caption>
              </View>
              <Text style={{ color: r.paymentStatus === 'paid' ? c.success : c.warning, fontWeight: '800', fontSize: 12 }}>{r.paymentStatus === 'paid' ? 'Paid' : 'Fee due'}</Text>
            </Row>
          ))}
        </Card>
      )}

      <SectionTitle>Quick links</SectionTitle>
      <ListGroup>
        <ListItem label="Tables & billing" icon={['clock.fill', 'timer']} onPress={() => router.navigate(`/club/${slug}/admin/tables`)} />
        <ListItem label="Tournaments" icon={['trophy.fill', 'emoji_events']} tint={c.warning} onPress={() => router.navigate(`/club/${slug}/admin/tournaments`)} />
        <ListItem label="Live scoring" icon={['dot.radiowaves.left.and.right', 'sensors']} tint={c.accent} onPress={() => router.navigate(`/club/${slug}/admin/live`)} />
        <ListItem label="Settings, TV & stream" icon={['gearshape.fill', 'settings']} tint={c.info} onPress={() => router.navigate(`/club/${slug}/admin/settings`)} />
        <ListItem label="View the club page" icon={['eye.fill', 'visibility']} tint={c.textMuted} onPress={() => router.navigate(`/club/${slug}`)} last />
      </ListGroup>
    </Screen>
  );
}

function Tile({ label, value, icon, tint, onPress }: { label: string; value: number | string; icon: [string, string]; tint: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={{ flex: 1, padding: 12, gap: 4 }}>
      <Icon ios={icon[0]} android={icon[1]} color={tint} size={18} />
      <Text style={{ color: c.text, fontSize: 24, fontWeight: '900' }}>{value}</Text>
      <Caption>{label}</Caption>
    </Card>
  );
}
