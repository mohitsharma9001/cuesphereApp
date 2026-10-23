import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { FormChips } from '@/components/player/form-chips';
import { Avatar, Button, Caption, Card, GradientHero, Headline, LiveDot, LoadState, Row, Screen, SectionTitle } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { friendlyStatus, fromMySide, groupFriendlies, type FriendlyTone } from '@/lib/friendly';
import { useSession } from '@/lib/session';
import type { FriendlyStats, Match } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Play — the Friendlies hub (#12). */
export default function PlayScreen() {
  const { c } = useTheme();
  const { me } = useSession();
  const myId = me?.profile?.id ?? '';
  const matches = useApi<Match[]>(myId ? '/friendlies/mine' : null);
  const stats = useApi<FriendlyStats>(myId ? `/friendlies/players/${myId}/stats` : null);

  useFocusEffect(
    useCallback(() => {
      matches.reload();
      stats.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myId])
  );

  const { needsYou, active, results } = groupFriendlies(matches.data ?? [], myId);
  const s = stats.data;

  return (
    <Screen refreshing={matches.refreshing} onRefresh={() => Promise.all([matches.refresh(), stats.reload()])}>
      <View>
        <GradientHero>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>FRIENDLIES</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800' }}>Play a friend</Text>
          <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 15, lineHeight: 21 }}>
            Challenge any player, score it on your phone, and it goes on both profiles.
          </Text>
          <View style={{ marginTop: 8 }}>
            <Button title="Challenge a player" variant="light" icon={['bolt.fill', 'bolt']} onPress={() => router.push('/challenge')} />
          </View>
        </GradientHero>
      </View>

      <Row style={{ gap: 8 }}>
        {[
          ['Played', s?.matchesPlayed ?? 0],
          ['Won', s?.wins ?? 0],
          ['Lost', s?.losses ?? 0],
          ['Best break', s?.highestBreak ?? 0],
        ].map(([label, value]) => (
          <Card key={label} style={{ flex: 1, padding: 12, alignItems: 'center', gap: 2 }}>
            <Text style={{ color: label === 'Won' ? c.success : c.text, fontSize: 22, fontWeight: '900' }}>{value}</Text>
            <Caption style={{ fontSize: 12 }}>{label}</Caption>
          </Card>
        ))}
      </Row>
      {!!s?.recentForm.length && (
        <Row style={{ gap: 8 }}>
          <Caption>Form</Caption>
          <FormChips form={s.recentForm} />
        </Row>
      )}

      <LoadState loading={matches.loading} error={matches.error} onRetry={matches.refresh} />
      {matches.data?.length === 0 && (
        <Card style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
          <Icon ios="figure.pool.swim" android="sports_esports" color={c.textMuted} size={30} />
          <Headline>No friendlies yet</Headline>
          <Caption style={{ textAlign: 'center' }}>Challenge someone you play with. They get a notification and accept from their phone.</Caption>
          <Button title="Challenge a player" onPress={() => router.push('/challenge')} />
        </Card>
      )}

      <Section title={`Needs you${needsYou.length ? ` (${needsYou.length})` : ''}`} matches={needsYou} myId={myId} />
      <Section title="Live & upcoming" matches={active} myId={myId} />
      <Section title="Results" matches={results} myId={myId} />
    </Screen>
  );
}

function Section({ title, matches, myId }: { title: string; matches: Match[]; myId: string }) {
  if (matches.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <SectionTitle>{title}</SectionTitle>
      {matches.map((m, i) => (
        <View key={m.id}>
          <FriendlyRow match={m} myId={myId} />
        </View>
      ))}
    </View>
  );
}

function FriendlyRow({ match: m, myId }: { match: Match; myId: string }) {
  const { c } = useTheme();
  const status = friendlyStatus(m, myId);
  const side = fromMySide(m, myId);
  const showScore = m.friendlyState === 'pending_confirmation' || m.friendlyState === 'confirmed' || m.status === 'live';
  const pill: Record<FriendlyTone, { bg: string; fg: string }> = {
    action: { bg: c.primary, fg: c.onPrimary },
    live: { bg: c.accentSoft, fg: c.live },
    muted: { bg: c.surfaceAlt, fg: c.textMuted },
    done: status.label === 'Won' ? { bg: 'rgba(22,163,74,0.15)', fg: c.success } : { bg: c.surfaceAlt, fg: c.textMuted },
  };
  const { bg, fg } = pill[status.tone];
  return (
    <Card
      onPress={() => router.push(`/friendly/${m.id}`)}
      style={status.tone === 'action' ? { borderWidth: 1.5, borderColor: c.primary } : status.tone === 'live' ? { borderWidth: 1.5, borderColor: c.accentSoft } : undefined}>
      <Row>
        <Avatar name={side.opponent} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Headline numberOfLines={1}>vs {side.opponent}</Headline>
          <Caption>Best of {m.bestOf ?? 3}</Caption>
        </View>
        {showScore && (
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '900' }}>
            {side.myFrames}–{side.theirFrames}
          </Text>
        )}
        <Row style={{ gap: 5, backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          {status.tone === 'live' && <LiveDot size={6} />}
          <Text style={{ color: fg, fontSize: 11, fontWeight: '800' }}>{status.label}</Text>
        </Row>
      </Row>
    </Card>
  );
}
