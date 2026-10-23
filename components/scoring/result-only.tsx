import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Body, Button, Caption, Chip, Row, SectionTitle, tapHaptic, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import type { Match } from '@/lib/types';

/** Result Only mode: the winner and how many frames each won, saved in one go. */
export function ResultOnly({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [winner, setWinner] = useState(match.winnerId ?? match.player1Id);
  const [p1, setP1] = useState(String(match.framesWonPlayer1 || ''));
  const [p2, setP2] = useState(String(match.framesWonPlayer2 || ''));
  const [hb, setHb] = useState(String(match.highestBreak || ''));
  const [hbBy, setHbBy] = useState(match.player1Id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const a = Number(p1);
    const b = Number(p2);
    if (!p1 || !p2 || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return setError('Enter a valid, non-tied final score.');
    if (a > 21 || b > 21) return setError('That looks like a point score, not a frame count. Enter how many FRAMES each player won (e.g. 3–1).');
    setBusy(true);
    setError(null);
    try {
      await api(`/matches/${match.id}/result`, { method: 'POST', body: { winnerId: winner, framesWonPlayer1: a, framesWonPlayer2: b, highestBreak: Number(hb) || 0, highestBreakPlayerId: hbBy } });
      tapHaptic('success');
      toast(match.kind === 'friendly' ? 'Result sent — your opponent confirms it.' : 'Result saved — player stats updated.');
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the result.');
    } finally {
      setBusy(false);
    }
  }

  const num = (value: string, set: (v: string) => void) => (
    <TextInput
      value={value}
      onChangeText={(t) => set(t.replace(/\D/g, '').slice(0, 3))}
      keyboardType="number-pad"
      placeholder="0"
      placeholderTextColor={c.textMuted}
      style={{ height: 54, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, color: c.text, fontSize: 26, fontWeight: '900', textAlign: 'center' }}
    />
  );

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle style={{ marginTop: 0 }}>Winner</SectionTitle>
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        <Chip label={match.player1Name} selected={winner === match.player1Id} onPress={() => setWinner(match.player1Id)} />
        <Chip label={match.player2Name} selected={winner === match.player2Id} onPress={() => setWinner(match.player2Id)} />
      </Row>
      <SectionTitle>Frames won</SectionTitle>
      <Row style={{ gap: 10, alignItems: 'flex-end' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Caption numberOfLines={1}>{match.player1Name}</Caption>
          {num(p1, setP1)}
        </View>
        <Text style={{ color: c.textMuted, fontSize: 22, fontWeight: '800', paddingBottom: 12 }}>–</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Caption numberOfLines={1}>{match.player2Name}</Caption>
          {num(p2, setP2)}
        </View>
      </Row>
      <Caption>How many frames each player won overall (e.g. 3–1) — not the points of a single frame.</Caption>
      <SectionTitle>Highest break (optional)</SectionTitle>
      <Row style={{ gap: 8 }}>
        <View style={{ width: 90 }}>{num(hb, setHb)}</View>
        <Chip label={match.player1Name.split(' ')[0]} selected={hbBy === match.player1Id} onPress={() => setHbBy(match.player1Id)} />
        <Chip label={match.player2Name.split(' ')[0]} selected={hbBy === match.player2Id} onPress={() => setHbBy(match.player2Id)} />
      </Row>
      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="Save result" icon={['checkmark', 'check']} onPress={save} loading={busy} />
      <Caption style={{ textAlign: 'center' }}>Once saved, the match is marked completed.</Caption>
    </View>
  );
}
