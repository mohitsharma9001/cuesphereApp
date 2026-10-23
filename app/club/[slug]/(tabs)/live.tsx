import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';

import { Avatar, Caption, Card, LiveDot, LoadState, Row, Screen, SectionTitle } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { liveClubChannel, useLiveSignal } from '@/lib/live';
import { useApi } from '@/lib/use-api';

interface BoardSide {
  name: string;
  photoUrl: string | null;
  score: number;
  frames: number;
}
interface BoardMatch {
  id: string;
  status: string;
  round: string;
  tournamentName: string;
  bestOf: number | null;
  tableNumber: number;
  startTime: string;
  p1: BoardSide;
  p2: BoardSide;
  currentBreak: number;
  onStrike: 1 | 2 | null;
  inFrameBreak: boolean;
}

/** Live (#20 list): every table being played at the club now, then what's next. */
export default function ClubLive() {
  const { c } = useTheme();
  const { slug, club } = useClub();
  const board = useApi<{ live: BoardMatch[]; next: BoardMatch[] }>(`/boards/${slug}`);
  useLiveSignal(club ? liveClubChannel(club.id) : null, board.reload, 600);
  useFocusEffect(
    useCallback(() => {
      board.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug])
  );

  const live = board.data?.live ?? [];
  const next = board.data?.next ?? [];
  return (
    <Screen refreshing={board.refreshing} onRefresh={board.refresh}>
      <Row>
        {live.length > 0 && <LiveDot />}
        <SectionTitle style={{ marginTop: 0 }}>Live now{live.length ? ` (${live.length})` : ''}</SectionTitle>
      </Row>
      <LoadState loading={board.loading} error={board.error} onRetry={board.refresh} empty={board.data && live.length === 0 && 'No matches being played right now.'} />
      {live.map((m) => (
        <Card key={m.id} onPress={() => router.push(`/match/${m.id}`)} style={{ borderWidth: 1, borderColor: c.accentSoft }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Caption style={{ color: c.live, fontWeight: '800' }}>TABLE {m.tableNumber}</Caption>
            <Caption numberOfLines={1}>{[m.tournamentName, m.round].filter(Boolean).join(' · ')}</Caption>
          </Row>
          <SideLine side={m.p1} atTable={m.onStrike === 1} />
          <SideLine side={m.p2} atTable={m.onStrike === 2} />
          <Caption>{m.inFrameBreak ? 'Between frames' : `Break ${m.currentBreak}`}{m.bestOf ? ` · Best of ${m.bestOf}` : ''}</Caption>
        </Card>
      ))}

      {next.length > 0 && (
        <>
          <SectionTitle>Up next</SectionTitle>
          {next.map((m) => (
            <Card key={m.id} onPress={() => router.push(`/match/${m.id}`)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: c.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                  {m.p1.name} v {m.p2.name}
                </Text>
                <Caption>
                  T{m.tableNumber}
                  {m.startTime ? ` · ${m.startTime}` : ''}
                </Caption>
              </Row>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

function SideLine({ side, atTable }: { side: BoardSide; atTable: boolean }) {
  const { c } = useTheme();
  return (
    <Row>
      <View style={atTable ? { padding: 2, borderRadius: 999, borderWidth: 2, borderColor: c.primary } : { padding: 4 }}>
        <Avatar name={side.name} uri={side.photoUrl} size={32} />
      </View>
      <Text style={{ flex: 1, color: c.text, fontWeight: atTable ? '800' : '600', fontSize: 15 }} numberOfLines={1}>{side.name}</Text>
      <Text style={{ color: c.textMuted, fontWeight: '700', minWidth: 30, textAlign: 'right' }}>{side.score}</Text>
      <Text style={{ color: c.primary, fontWeight: '900', fontSize: 20, minWidth: 26, textAlign: 'right' }}>{side.frames}</Text>
      {atTable && <LiveDot size={6} />}
    </Row>
  );
}
