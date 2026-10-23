import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Body, Button, Caption, Card, Chip, Headline, PressableScale, Row, SectionTitle, tapHaptic, useConfirm } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import type { Match } from '@/lib/types';

type FrameScore = { frame: number; player1Score: number; player2Score: number };

/** Frame-by-frame scoring: enter each frame's points; the frame tally is saved
 * after every frame, and Finish sends the result. Used for friendlies (the
 * opponent then confirms); ball-by-ball scoring comes with Task 27. */
export function FrameScorer({ match, onChanged }: { match: Match; onChanged: () => void }) {
  const { c } = useTheme();
  const confirm = useConfirm();
  const [frames, setFrames] = useState<FrameScore[]>(match.frameScores ?? []);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [hb, setHb] = useState(match.highestBreak ? String(match.highestBreak) : '');
  const [hbBy, setHbBy] = useState<1 | 2 | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const won1 = frames.filter((f) => f.player1Score > f.player2Score).length;
  const won2 = frames.filter((f) => f.player2Score > f.player1Score).length;
  const target = Math.ceil((match.bestOf ?? 3) / 2);
  const decided = won1 >= target || won2 >= target;

  async function save(next: FrameScore[]) {
    const w1 = next.filter((f) => f.player1Score > f.player2Score).length;
    const w2 = next.filter((f) => f.player2Score > f.player1Score).length;
    await api(`/matches/${match.id}/progress`, { method: 'PATCH', body: { framesWonPlayer1: w1, framesWonPlayer2: w2, frameScores: next } });
  }

  async function addFrame() {
    const a = Number(p1);
    const b = Number(p2);
    if (!p1.trim() || !p2.trim() || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return setError('Enter both players’ points for the frame.');
    if (a === b) return setError('A frame can’t be tied — someone must win it.');
    if (decided) return setError('The match is already decided. Finish it below.');
    const next = [...frames, { frame: frames.length + 1, player1Score: a, player2Score: b }];
    setBusy(true);
    setError(null);
    try {
      await save(next);
      setFrames(next);
      setP1('');
      setP2('');
      tapHaptic('success');
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the frame.');
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!frames.length) return;
    const next = frames.slice(0, -1);
    setBusy(true);
    try {
      await save(next);
      setFrames(next);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not undo.');
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (won1 === won2) return setError('Frames can’t be tied — someone must have more frames won.');
    const highestBreak = hb.trim() ? Number(hb) : 0;
    if (!Number.isInteger(highestBreak) || highestBreak < 0 || highestBreak > 147) return setError('Highest break must be 0–147.');
    if (highestBreak > 0 && !hbBy) return setError('Who made the highest break?');
    const winner = won1 > won2 ? match.player1Name : match.player2Name;
    if (!(await confirm({ title: `Finish: ${winner} wins ${Math.max(won1, won2)}–${Math.min(won1, won2)}?`, message: 'Your opponent will be asked to confirm the score.', confirmLabel: 'Send result' }))) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/matches/${match.id}/finish`, {
        method: 'POST',
        body: {
          framesWonPlayer1: won1,
          framesWonPlayer2: won2,
          highestBreak,
          ...(highestBreak > 0 && hbBy ? { highestBreakPlayerId: hbBy === 1 ? match.player1Id : match.player2Id } : {}),
          frameScores: frames,
        },
      });
      tapHaptic('success');
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not finish the match.');
    } finally {
      setBusy(false);
    }
  }

  const first = (name: string) => name.split(' ')[0];
  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Headline>Scoring</Headline>
        <Caption>
          First to {target} · {won1}–{won2}
        </Caption>
      </Row>

      {frames.length > 0 && (
        <View style={{ gap: 4 }}>
          {frames.map((f) => (
            <Row key={f.frame} style={{ justifyContent: 'space-between' }}>
              <Caption>Frame {f.frame}</Caption>
              <Text style={{ color: c.text, fontWeight: '700' }}>
                <Text style={{ color: f.player1Score > f.player2Score ? c.primary : c.text }}>{f.player1Score}</Text> – <Text style={{ color: f.player2Score > f.player1Score ? c.primary : c.text }}>{f.player2Score}</Text>
              </Text>
            </Row>
          ))}
        </View>
      )}

      {!decided && (
        <>
          <SectionTitle style={{ marginTop: 0 }}>Frame {frames.length + 1}</SectionTitle>
          <Row style={{ gap: 10 }}>
            <PointsInput label={first(match.player1Name)} value={p1} onChange={setP1} />
            <PointsInput label={first(match.player2Name)} value={p2} onChange={setP2} />
          </Row>
          <Button title="Add frame" icon={['plus.circle.fill', 'add_circle']} onPress={addFrame} loading={busy} />
        </>
      )}
      {frames.length > 0 && (
        <PressableScale onPress={undo} disabled={busy}>
          <Caption style={{ color: c.primary, fontWeight: '800', textAlign: 'center' }}>↶ Undo last frame</Caption>
        </PressableScale>
      )}

      <SectionTitle style={{ marginTop: 4 }}>Highest break (optional)</SectionTitle>
      <Row style={{ gap: 8 }}>
        <View style={{ width: 90 }}>
          <PointsInput label="" value={hb} onChange={setHb} placeholder="0" />
        </View>
        <Chip label={first(match.player1Name)} selected={hbBy === 1} onPress={() => setHbBy(1)} />
        <Chip label={first(match.player2Name)} selected={hbBy === 2} onPress={() => setHbBy(2)} />
      </Row>

      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title={decided ? 'Finish match' : 'Finish early'} variant={decided ? 'primary' : 'secondary'} icon={['flag.checkered', 'sports_score']} onPress={finish} loading={busy} disabled={!frames.length} />
    </Card>
  );
}

function PointsInput({ label, value, onChange, placeholder = 'Points' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      {!!label && <Caption style={{ fontWeight: '700' }}>{label}</Caption>}
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 3))}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        selectionColor={c.primary}
        style={{ height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, color: c.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}
      />
    </View>
  );
}
