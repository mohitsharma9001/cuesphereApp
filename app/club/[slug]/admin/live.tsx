import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';

import { Button, Caption, Card, Headline, LiveDot, LoadState, Row, Screen, SectionTitle, useToast } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import { liveClubChannel, useLiveSignal } from '@/lib/live';
import type { Match } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Live Scoring list (#33): live first, then scheduled. Scorekeepers see only their tournaments. */
export default function AdminLive() {
  const { c } = useTheme();
  const toast = useToast();
  const { slug, club } = useClub();
  const list = useApi<Match[]>(`/clubs/${slug}/matches/scorable`);
  const [starting, setStarting] = useState<string | null>(null);
  useLiveSignal(club ? liveClubChannel(club.id) : null, list.reload, 800);
  useFocusEffect(
    useCallback(() => {
      list.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug])
  );

  const live = (list.data ?? []).filter((m) => m.status === 'live');
  const scheduled = (list.data ?? []).filter((m) => m.status === 'scheduled');
  const open = (m: Match) => router.push(`/club/${slug}/staff/score/${m.id}`);

  async function start(m: Match) {
    setStarting(m.id);
    try {
      await api(`/matches/${m.id}/status`, { method: 'PATCH', body: { status: 'live' } });
      open(m);
      list.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not start the match.', 'error');
    } finally {
      setStarting(null);
    }
  }

  return (
    <Screen refreshing={list.refreshing} onRefresh={list.refresh}>
      <Headline style={{ fontSize: 22 }}>Live Scoring</Headline>
      <LoadState loading={list.loading} error={list.error} onRetry={list.refresh} empty={list.data?.length === 0 && 'Nothing to score — publish a draw in Tournaments first.'} />
      {live.length > 0 && <SectionTitle>Live ({live.length})</SectionTitle>}
      {live.map((m) => (
        <Card key={m.id} onPress={() => open(m)} style={{ borderWidth: 1.5, borderColor: c.live }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ gap: 6 }}>
              <LiveDot />
              <Caption style={{ color: c.live, fontWeight: '800' }}>LIVE · TABLE {m.tableNumber}</Caption>
            </Row>
            <Caption style={{ color: c.primary, fontWeight: '800' }}>Score ▸</Caption>
          </Row>
          <Headline numberOfLines={1}>
            {m.player1Name} v {m.player2Name} · <Text style={{ color: c.primary }}>{m.framesWonPlayer1}–{m.framesWonPlayer2}</Text>
          </Headline>
          <Caption>{m.round}</Caption>
        </Card>
      ))}
      {scheduled.length > 0 && <SectionTitle>Scheduled ({scheduled.length})</SectionTitle>}
      {scheduled.map((m) => (
        <Card key={m.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Caption style={{ fontWeight: '800' }}>TABLE {m.tableNumber} · {m.round}</Caption>
            {!!m.matchStartTime && <Caption>{m.matchStartTime}</Caption>}
          </Row>
          <Headline numberOfLines={1}>
            {m.player1Name} v {m.player2Name}
          </Headline>
          <Button title="Start ▸" variant="secondary" loading={starting === m.id} onPress={() => start(m)} />
        </Card>
      ))}
    </Screen>
  );
}
