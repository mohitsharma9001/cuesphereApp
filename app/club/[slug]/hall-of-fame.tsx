import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Caption, Card, Headline, LoadState, PressableScale, Row, Screen } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { formatDateRange } from '@/lib/format';
import type { Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface Results {
  champion: { id: string; name: string } | null;
  runnerUp: { id: string; name: string } | null;
}

/** Hall of Fame: champions and runners-up of the club's finished tournaments. */
export default function HallOfFame() {
  const { c } = useTheme();
  const { slug } = useClub();
  const list = useApi<Tournament[]>(`/clubs/${slug}/tournaments`);
  const done = (list.data ?? []).filter((t) => t.status === 'completed');
  const results = useApi<Record<string, Results>>(done.length ? `/matches/tournaments/results?ids=${done.map((t) => t.id).join(',')}` : null);
  const winners = done.filter((t) => results.data?.[t.id]?.champion);

  return (
    <Screen refreshing={list.refreshing} onRefresh={() => Promise.all([list.refresh(), results.reload()])}>
      <LoadState
        loading={list.loading || results.loading}
        error={list.error ?? results.error}
        onRetry={list.refresh}
        empty={list.data && !results.loading && winners.length === 0 && 'No champions yet — the first finished tournament will appear here.'}
      />
      {winners.map((t) => {
        const r = results.data![t.id];
        return (
          <Card key={t.id} onPress={() => router.push(`/tournament/${slug}/${t.slug}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Headline style={{ flex: 1 }} numberOfLines={1}>{t.name}</Headline>
              <Caption>{formatDateRange(t.startDate, t.endDate)}</Caption>
            </Row>
            <PressableScale onPress={() => r.champion && router.push(`/player/${r.champion.id}`)}>
              <Row>
                <Text style={{ fontSize: 22 }}>🏆</Text>
                <View style={{ flex: 1 }}>
                  <Caption style={{ fontWeight: '800', color: c.warning }}>CHAMPION</Caption>
                  <Headline>{r.champion!.name}</Headline>
                </View>
              </Row>
            </PressableScale>
            {r.runnerUp && (
              <PressableScale onPress={() => router.push(`/player/${r.runnerUp!.id}`)}>
                <Row>
                  <Text style={{ fontSize: 18 }}>🥈</Text>
                  <Caption style={{ color: c.text }}>Runner-up · {r.runnerUp.name}</Caption>
                </Row>
              </PressableScale>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
