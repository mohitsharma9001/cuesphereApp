import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { YouTubeStream } from '@/components/live/youtube-stream';
import { Ball, isBallColor } from '@/components/scoring/ball';
import { Avatar, Caption, Card, Headline, LiveDot, LoadState, Row, Screen, SectionTitle, StatusPill } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { liveMatchChannel, useLiveSignal } from '@/lib/live';
import type { StreamSettings } from '@/lib/stream';
import type { Club, FriendlyStats, Match, PlayerProfile, PlayerStatistics } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const isObjectId = (v: string) => /^[0-9a-f]{24}$/i.test(v);

/** Live Match Centre / public friendly page (#15, #20): score, break, frame
 * history, head-to-head and season stats. Updates on every scoring tap. */
export default function MatchScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useApi<Match>(`/matches/${id}`);
  const m = match.data;
  const friendly = m?.kind === 'friendly';
  const ids = m ? [m.player1Id, m.player2Id].filter(isObjectId) : [];

  const people = useApi<PlayerProfile[]>(ids.length ? `/profiles/batch?ids=${ids.join(',')}` : null);
  const h2h = useApi<{ player1Wins: number; player2Wins: number }>(m ? `/matches/${id}/head-to-head` : null);
  const friendlyStats = useApi<{ player1: FriendlyStats; player2: FriendlyStats }>(friendly ? `/matches/${id}/friendly-stats` : null);
  const p1Stats = useApi<PlayerStatistics | null>(m && !friendly && m.clubId && isObjectId(m.player1Id) ? `/stats/players/${m.player1Id}?clubId=${m.clubId}` : null);
  const p2Stats = useApi<PlayerStatistics | null>(m && !friendly && m.clubId && isObjectId(m.player2Id) ? `/stats/players/${m.player2Id}?clubId=${m.clubId}` : null);
  const venue = useApi<Club[]>(m?.venueClubId ? `/clubs?ids=${m.venueClubId}` : null);
  // The club's YouTube link for this table (tournament matches, or a friendly at a club).
  const streamClub = m?.clubId || m?.venueClubId || null;
  const stream = useApi<StreamSettings>(streamClub && m && m.status !== 'completed' ? `/clubs/${streamClub}/stream-settings` : null);
  const youtubeUrl = m && m.tableNumber > 0 ? stream.data?.youtubeUrls?.[String(m.tableNumber)] : undefined;

  // The API pings this room on every scoring action; refetch quietly.
  const live = m?.status === 'live';
  useLiveSignal(live ? liveMatchChannel(id) : null, () => {
    match.reload();
    h2h.reload();
  }, 250);

  const refresh = () => Promise.all([match.refresh(), h2h.reload(), friendlyStats.reload(), p1Stats.reload(), p2Stats.reload()]);

  if (!m) {
    return (
      <Screen>
        <LoadState loading={match.loading} error={match.error} onRetry={match.refresh} />
      </Screen>
    );
  }

  const photo = (pid: string) => people.data?.find((p) => p.id === pid)?.profilePhotoUrl || null;
  const title = friendly ? `Friendly${venue.data?.[0] ? ` · ${venue.data[0].name}` : ''}` : m.round;
  const breakBalls = (m.currentBreakBalls ?? []).filter(isBallColor);
  const frames = m.frameScores ?? [];
  const seasonRows: [string, number | string, number | string][] = friendly
    ? friendlyStats.data
      ? [
          ['Played', friendlyStats.data.player1.matchesPlayed, friendlyStats.data.player2.matchesPlayed],
          ['Won', friendlyStats.data.player1.wins, friendlyStats.data.player2.wins],
          ['Frames', `${friendlyStats.data.player1.framesWon}–${friendlyStats.data.player1.framesLost}`, `${friendlyStats.data.player2.framesWon}–${friendlyStats.data.player2.framesLost}`],
          ['Highest break', friendlyStats.data.player1.highestBreak, friendlyStats.data.player2.highestBreak],
        ]
      : []
    : p1Stats.data || p2Stats.data
      ? [
          ['Played', p1Stats.data?.matchesPlayed ?? 0, p2Stats.data?.matchesPlayed ?? 0],
          ['Won', p1Stats.data?.wins ?? 0, p2Stats.data?.wins ?? 0],
          ['Points', p1Stats.data?.rankingPoints ?? 0, p2Stats.data?.rankingPoints ?? 0],
          ['Highest break', p1Stats.data?.highestBreak ?? 0, p2Stats.data?.highestBreak ?? 0],
        ]
      : [];

  return (
    <Screen refreshing={match.refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: `${m.player1Name.split(' ')[0]} v ${m.player2Name.split(' ')[0]}` }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <StatusPill status={m.status} />
        <Caption numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
          {[title, !friendly || m.tableNumber > 0 ? `Table ${m.tableNumber}` : null].filter(Boolean).join(' · ')}
        </Caption>
      </Row>

      {!!youtubeUrl && <YouTubeStream url={youtubeUrl} />}

      <Card style={{ paddingVertical: 22 }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <PlayerSide name={m.player1Name} photo={photo(m.player1Id)} points={m.currentFrameScorePlayer1} atTable={live && m.currentPlayer === 1} live={live} />
          <View style={{ alignItems: 'center', paddingTop: 8, minWidth: 92 }}>
            <Caption style={{ fontWeight: '800' }}>FRAMES</Caption>
            <Text style={{ color: c.text, fontSize: 40, fontWeight: '900', letterSpacing: -1 }}>
              {m.framesWonPlayer1}
              <Text style={{ color: c.textMuted }}> – </Text>
              {m.framesWonPlayer2}
            </Text>
            <Caption>Best of {m.bestOf ?? '—'}</Caption>
          </View>
          <PlayerSide name={m.player2Name} photo={photo(m.player2Id)} points={m.currentFrameScorePlayer2} atTable={live && m.currentPlayer === 2} live={live} />
        </Row>
      </Card>

      {live && (
        <Card>
          {m.inFrameBreak ? (
            <Caption style={{ textAlign: 'center' }}>Between frames — the next frame starts soon</Caption>
          ) : (
            <>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 6 }}>
                  <LiveDot />
                  <Headline>Break {m.currentBreak}</Headline>
                </Row>
                <Row style={{ gap: 6 }}>
                  <Ball color="red" size={14} />
                  <Caption style={{ fontWeight: '800', color: c.text }}>×{m.redsRemaining} left</Caption>
                </Row>
              </Row>
              {breakBalls.length > 0 && (
                <Row style={{ gap: 4, flexWrap: 'wrap' }}>
                  {breakBalls.map((b, i) => (
                    <Ball key={i} color={b} size={20} />
                  ))}
                </Row>
              )}
            </>
          )}
        </Card>
      )}

      {m.highestBreak > 0 && (
        <Row style={{ gap: 6 }}>
          <Text>🏆</Text>
          <Caption style={{ color: c.text, fontWeight: '700' }}>Highest break {m.highestBreak}</Caption>
        </Row>
      )}

      {frames.length > 0 && (
        <>
          <SectionTitle>Frame history</SectionTitle>
          <Card style={{ gap: 6 }}>
            {frames.map((f) => (
              <Row key={f.frame} style={{ justifyContent: 'space-between' }}>
                <Caption>F{f.frame}</Caption>
                <Text style={{ fontWeight: '800', color: c.text }}>
                  <Text style={{ color: f.player1Score > f.player2Score ? c.primary : c.text }}>{f.player1Score}</Text>
                  {' – '}
                  <Text style={{ color: f.player2Score > f.player1Score ? c.primary : c.text }}>{f.player2Score}</Text>
                </Text>
              </Row>
            ))}
          </Card>
        </>
      )}

      {h2h.data && h2h.data.player1Wins + h2h.data.player2Wins > 0 && (
        <>
          <SectionTitle>Head-to-head{friendly ? ' (friendlies)' : ''}</SectionTitle>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Headline style={{ flex: 1 }} numberOfLines={1}>{m.player1Name}</Headline>
              <Text style={{ color: c.primary, fontSize: 22, fontWeight: '900' }}>
                {h2h.data.player1Wins} – {h2h.data.player2Wins}
              </Text>
              <Headline style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>{m.player2Name}</Headline>
            </Row>
          </Card>
        </>
      )}

      {seasonRows.length > 0 && (
        <>
          <SectionTitle>{friendly ? 'Friendly record' : 'Season at this club'}</SectionTitle>
          <Card style={{ gap: 8 }}>
            {seasonRows.map(([label, a, b]) => (
              <Row key={label}>
                <Text style={{ flex: 1, color: c.text, fontWeight: '800', fontSize: 16 }}>{a}</Text>
                <Caption style={{ flex: 1.4, textAlign: 'center' }}>{label}</Caption>
                <Text style={{ flex: 1, color: c.text, fontWeight: '800', fontSize: 16, textAlign: 'right' }}>{b}</Text>
              </Row>
            ))}
          </Card>
        </>
      )}

      {m.status === 'scheduled' && !!m.matchStartTime && <Caption style={{ textAlign: 'center' }}>Starts {m.matchStartTime}</Caption>}
    </Screen>
  );
}

function PlayerSide({ name, photo, points, atTable, live }: { name: string; photo: string | null; points: number; atTable: boolean; live: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      <View style={atTable ? { padding: 3, borderRadius: radius.pill, borderWidth: 2, borderColor: c.primary } : { padding: 5 }}>
        <Avatar name={name} uri={photo} size={56} />
      </View>
      <Text style={{ color: c.text, fontWeight: '700', fontSize: 15, textAlign: 'center' }} numberOfLines={2}>{name}</Text>
      {live && <Text style={{ color: c.text, fontSize: 26, fontWeight: '800' }}>{points}</Text>}
      {atTable && (
        <Row style={{ gap: 5 }}>
          <LiveDot size={6} />
          <Caption style={{ color: c.primary, fontWeight: '800', fontSize: 11 }}>AT THE TABLE</Caption>
        </Row>
      )}
    </View>
  );
}

