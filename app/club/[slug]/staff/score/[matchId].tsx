import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ScoringPanel } from '@/components/scoring/scoring-panel';
import { Button, Caption, Card, Headline, LiveDot, LoadState, Row, Screen, useToast } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import type { Match, Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Referee Scoring (#34). */
export default function ScoreMatch() {
  const { c } = useTheme();
  const toast = useToast();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const match = useApi<Match>(`/matches/${matchId}`);
  const m = match.data;
  const tournament = useApi<Tournament[]>(m?.tournamentId ? `/tournaments?ids=${m.tournamentId}` : null);
  const [starting, setStarting] = useState(false);

  if (!m) return <Screen><LoadState loading={match.loading} error={match.error} onRetry={match.refresh} /></Screen>;
  const t = tournament.data?.[0];

  async function start() {
    setStarting(true);
    try {
      await api(`/matches/${matchId}/status`, { method: 'PATCH', body: { status: 'live' } });
      toast('Match is live — friends and followers get a “watch live” alert');
      await match.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not start the match.', 'error');
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `${m.player1Name.split(' ')[0]} v ${m.player2Name.split(' ')[0]}` }} />
      <Card style={{ gap: 4 }}>
        <Headline>
          {m.player1Name} vs {m.player2Name}
        </Headline>
        <Caption>{[t?.name, m.round, `Table ${m.tableNumber}`, `Best of ${t?.bestOf ?? m.bestOf ?? '—'}`].filter(Boolean).join(' · ')}</Caption>
        {m.status === 'live' && (
          <Row style={{ gap: 6 }}>
            <LiveDot />
            <Caption style={{ color: c.live, fontWeight: '800' }}>Live · TV and stream connected</Caption>
          </Row>
        )}
      </Card>
      {m.status === 'scheduled' ? (
        <>
          <Caption>Start the match to score it. The club&apos;s live page, table TV and stream follow every shot.</Caption>
          <Button title="▶ Start match" onPress={start} loading={starting} />
        </>
      ) : (
        <ScoringPanel match={m} onChanged={match.reload} />
      )}
    </Screen>
  );
}
