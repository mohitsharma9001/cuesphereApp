import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Caption, LiveDot, PressableScale, Row } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { liveMatchChannel, useLiveSignal } from '@/lib/live';
import type { Match } from '@/lib/types';

/** Compact match card for horizontal strips. Live ones update themselves. */
export function LiveMatchCard({ match: m, onChanged, fullWidth }: { match: Match; onChanged: () => void; fullWidth?: boolean }) {
  const { c, scheme } = useTheme();
  const live = m.status === 'live';
  useLiveSignal(live ? liveMatchChannel(m.id) : null, onChanged);

  const where = m.kind === 'friendly' ? 'Friendly' : `Table ${m.tableNumber}`;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${m.player1Name} versus ${m.player2Name}, ${m.framesWonPlayer1} to ${m.framesWonPlayer2}`}
      onPress={() => router.push(`/match/${m.id}`)}
      style={{
        width: fullWidth ? '100%' : 240,
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: live ? c.accentSoft : c.border,
        ...(scheme === 'light' ? { shadowColor: '#0C2A20', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 } : {}),
      }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 6 }}>
          {live && <LiveDot size={7} />}
          <Caption style={{ color: live ? c.live : c.info, fontWeight: '800' }}>{live ? 'LIVE' : `UP NEXT${m.matchStartTime ? ` · ${m.matchStartTime}` : ''}`}</Caption>
        </Row>
        <Caption numberOfLines={1}>{where}</Caption>
      </Row>
      <PlayerLine name={m.player1Name} frames={m.framesWonPlayer1} points={live ? m.currentFrameScorePlayer1 : undefined} atTable={live && m.currentPlayer === 1} />
      <PlayerLine name={m.player2Name} frames={m.framesWonPlayer2} points={live ? m.currentFrameScorePlayer2 : undefined} atTable={live && m.currentPlayer === 2} />
    </PressableScale>
  );
}

function PlayerLine({ name, frames, points, atTable }: { name: string; frames: number; points?: number; atTable: boolean }) {
  const { c } = useTheme();
  return (
    <Row style={{ gap: 8 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: atTable ? c.primary : 'transparent' }} />
      <Text numberOfLines={1} style={{ flex: 1, color: c.text, fontSize: 15, fontWeight: atTable ? '800' : '600' }}>{name}</Text>
      {points !== undefined && <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: '600' }}>{points}</Text>}
      <Text style={{ color: c.primary, fontSize: 18, fontWeight: '900', minWidth: 18, textAlign: 'right' }}>{frames}</Text>
    </Row>
  );
}
