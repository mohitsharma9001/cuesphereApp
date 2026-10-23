import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Ball } from '@/components/scoring/ball';
import { Button, Caption, Card, Headline, PressableScale, Row, tapHaptic, useConfirm, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import * as S from '@/lib/scoring';
import type { Match } from '@/lib/types';

interface Board {
  current: S.LiveState;
  history: S.LiveState[];
}

/** Live Score mode (#34): every ball, with snooker's "ball on" rules. Each change is
 * saved straight away so the live page, TV and stream follow along. */
export function LiveScorer({ match, onFinished }: { match: Match; onFinished: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [board, setBoard] = useState<Board>(() => ({ current: S.stateFromMatch(match), history: [] }));
  const [resumed] = useState(() => S.hasProgress(S.stateFromMatch(match)));
  const [foulReds, setFoulReds] = useState<{ before: number; chosen: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const s = board.current;
  const rules = S.tableRules(s);
  const won = S.framesWon(s.frameHistory);

  /** Next state from the freshest previous one — fast repeated taps never lose an update. */
  function commit(update: (prev: S.LiveState) => S.LiveState, keepFrameBreak = false) {
    setFoulReds(null);
    setBoard((b) => {
      const next = update(b.current);
      if (next === b.current) return b;
      // Recording any shot means the next frame has started, so the break (and its ads) ends.
      const current = keepFrameBreak || !next.frameBreak ? next : { ...next, frameBreak: false };
      return { current, history: [...b.history, b.current] };
    });
  }

  // Coalesced saves: while one is in flight only the newest state waits to go next.
  const sender = useRef<{ inFlight: boolean; pending: ReturnType<typeof S.livePayload> | null; first: boolean }>({ inFlight: false, pending: null, first: true });
  useEffect(() => {
    if (sender.current.first) {
      sender.current.first = false; // what's on screen first is what's already saved
      return;
    }
    const payload = S.livePayload(s, match.player1Id, match.player2Id);
    const st = sender.current;
    if (st.inFlight) {
      st.pending = payload;
      return;
    }
    st.inFlight = true;
    const run = (p: typeof payload) => {
      api(`/matches/${match.id}/live`, { method: 'PATCH', body: p })
        .catch(() => {})
        .finally(() => {
          const next = st.pending;
          st.pending = null;
          if (next) run(next);
          else st.inFlight = false;
        });
    };
    run(payload);
  }, [s, match.id, match.player1Id, match.player2Id]);

  function foul(points: number) {
    const redsBefore = s.redsRemaining;
    tapHaptic('error');
    commit((prev) => S.foul(prev, points));
    if (redsBefore > 0) setFoulReds({ before: redsBefore, chosen: 0 });
  }

  function endFrame() {
    const result = S.endFrame(s);
    if ('error' in result) return toast(result.error, 'error');
    const t = S.framesWon(result.frames);
    api(`/matches/${match.id}/progress`, { method: 'PATCH', body: { framesWonPlayer1: t.p1, framesWonPlayer2: t.p2, frameScores: result.frames } }).catch(() => {});
    tapHaptic('success');
    commit(() => result.next, true);
  }

  async function finish() {
    const result = S.finishPayload(s, match.player1Id, match.player2Id);
    if ('error' in result) return toast(result.error, 'error');
    const { framesWonPlayer1: a, framesWonPlayer2: b } = result.body;
    if (!(await confirm({ title: `Finish the match ${a}–${b}?`, message: match.kind === 'friendly' ? 'Your opponent confirms the result.' : "This saves the result and updates both players' stats.", confirmLabel: 'Finish match' }))) return;
    setFinishing(true);
    try {
      await api(`/matches/${match.id}/finish`, { method: 'POST', body: result.body });
      tapHaptic('success');
      toast(match.kind === 'friendly' ? 'Result sent — your opponent confirms it.' : 'Match finished — player stats updated.');
      onFinished();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not finish the match.', 'error');
    } finally {
      setFinishing(false);
    }
  }

  const name = (p: 1 | 2) => (p === 1 ? match.player1Name : match.player2Name);
  const canSwitch = s.currentBreak === 0;

  return (
    <View style={{ gap: 12 }}>
      {resumed && board.history.length === 0 && (
        <Card style={{ backgroundColor: 'rgba(59,130,246,0.12)' }}>
          <Caption style={{ color: c.info }}>Picked up where scoring left off.{match.currentPlayer ? '' : ' If the wrong player is on strike, tap the player at the table.'}</Caption>
        </Card>
      )}

      {s.frameBreak && (
        <View>
          <Card style={{ backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primary, gap: 8 }}>
            <Headline>Frame {s.frameHistory.length} done · frame break</Headline>
            <Caption>The table TV and stream show the club&apos;s ads until you start the next frame. Tap the player breaking off if it isn&apos;t {name(s.currentPlayer)}.</Caption>
            <Button title={`▶ Start Frame ${s.frameHistory.length + 1}`} onPress={() => commit((prev) => (prev.frameBreak ? { ...prev, frameBreak: false } : prev))} />
          </Card>
        </View>
      )}

      <Row style={{ gap: 8, alignItems: 'stretch' }}>
        <PlayerPanel name={match.player1Name} score={s.frameScoreP1} frames={won.p1} onStrike={s.currentPlayer === 1} canSwitch={canSwitch} tint={c.primary} onSelect={() => commit((prev) => S.setStriker(prev, 1), true)} />
        <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 64 }}>
          <Caption style={{ fontWeight: '800', fontSize: 10, letterSpacing: 1 }}>BREAK</Caption>
          <Text style={{ color: c.text, fontSize: 30, fontWeight: '900' }}>{s.currentBreak}</Text>
          <Caption style={{ fontSize: 11 }}>Frame {s.frameHistory.length + 1}</Caption>
        </View>
        <PlayerPanel name={match.player2Name} score={s.frameScoreP2} frames={won.p2} onStrike={s.currentPlayer === 2} canSwitch={canSwitch} tint={c.info} align="right" onSelect={() => commit((prev) => S.setStriker(prev, 2), true)} />
      </Row>

      <Row style={{ gap: 4, flexWrap: 'wrap', minHeight: 22 }}>
        <Caption style={{ marginRight: 4 }}>{name(s.currentPlayer).split(' ')[0]}&apos;s break</Caption>
        {s.breakBalls.map((b, i) => (
          <Ball key={i} color={b} size={18} />
        ))}
      </Row>

      <Card style={{ padding: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 6 }}>
            <Ball color="red" size={16} />
            <Text style={{ color: c.text, fontWeight: '800' }}>×{s.redsRemaining}</Text>
            {rules.colorsOnTable.map((col) => (
              <Ball key={col} color={col} size={14} />
            ))}
          </Row>
          <Caption>{rules.pointsRemaining} left</Caption>
        </Row>
      </Card>

      <Row style={{ justifyContent: 'space-between' }}>
        <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>POT BALL</Caption>
        <Caption style={{ color: c.primary, fontWeight: '700' }}>{rules.hint}</Caption>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <BallButton color="red" label={`Red (${s.redsRemaining})`} enabled={rules.canPotRed} onPress={() => commit((prev) => S.potBall(prev, 'red'))} />
        {S.COLORS.map((col) => (
          <BallButton key={col} color={col} label={col[0].toUpperCase() + col.slice(1)} enabled={(rules.colors as string[]).includes(col)} onPress={() => commit((prev) => S.potBall(prev, col))} />
        ))}
        <PressableScale accessibilityRole="button" onPress={() => commit(S.miss)} style={{ width: '23.4%', height: 72, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
          <Text style={{ color: c.text, fontWeight: '800' }}>Miss</Text>
        </PressableScale>
      </View>

      <Caption style={{ fontWeight: '800', letterSpacing: 1, color: c.danger }}>FOUL · POINTS TO OPPONENT</Caption>
      <Row style={{ gap: 8 }}>
        {S.FOUL_VALUES.map((p) => (
          <PressableScale key={p} accessibilityRole="button" accessibilityLabel={`Foul, ${p} points to opponent`} haptic={false} onPress={() => foul(p)} style={{ flex: 1, height: 48, borderRadius: radius.md, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.danger, fontWeight: '900', fontSize: 16 }}>+{p}</Text>
          </PressableScale>
        ))}
        <PressableScale
          accessibilityRole="button"
          disabled={!(s.breakBalls.length === 0 && rules.pointsRemaining > 0)}
          onPress={() => commit(S.freeBall)}
          style={{ flex: 1.3, height: 48, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center', opacity: s.breakBalls.length === 0 ? 1 : 0.35 }}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 12 }}>Free ball</Text>
        </PressableScale>
      </Row>

      {foulReds && (
        <View>
          <Card style={{ backgroundColor: c.accentSoft, gap: 8 }}>
            <Headline style={{ fontSize: 15 }}>Any reds potted on that foul?</Headline>
            <Caption>They don&apos;t score, but they stay off the table.</Caption>
            <Row style={{ gap: 8 }}>
              {[0, 1, 2, 3].map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: foulReds.chosen === n }}
                  disabled={n > foulReds.before}
                  onPress={() => {
                    setBoard((b) => ({ ...b, current: S.setRedsAfterFoul(b.current, foulReds.before, n) }));
                    setFoulReds({ ...foulReds, chosen: n });
                  }}
                  style={{ flex: 1, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: foulReds.chosen === n ? c.text : c.surface, opacity: n > foulReds.before ? 0.3 : 1 }}>
                  <Text style={{ color: foulReds.chosen === n ? c.bg : c.text, fontWeight: '900', fontSize: 16 }}>{n}</Text>
                </Pressable>
              ))}
            </Row>
          </Card>
        </View>
      )}

      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            title="↶ Undo"
            variant="ghost"
            disabled={board.history.length === 0}
            onPress={() => {
              setFoulReds(null);
              setBoard((b) => (b.history.length ? { current: b.history[b.history.length - 1], history: b.history.slice(0, -1) } : b));
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="End Frame" variant="secondary" disabled={s.frameScoreP1 === 0 && s.frameScoreP2 === 0} onPress={endFrame} />
        </View>
      </Row>
      <Button title="Finish Match" icon={['flag.checkered', 'sports_score']} onPress={finish} loading={finishing} />
      <Caption style={{ textAlign: 'center' }}>Every shot is saved and shown on the club&apos;s live page.</Caption>

      {s.frameHistory.length > 0 && (
        <Card style={{ gap: 4 }}>
          <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>FRAMES</Caption>
          {s.frameHistory.map((f) => (
            <Row key={f.frame} style={{ justifyContent: 'space-between' }}>
              <Caption>Frame {f.frame}</Caption>
              <Text style={{ color: c.text, fontWeight: '700' }}>
                <Text style={{ color: f.player1Score > f.player2Score ? c.primary : c.text }}>{f.player1Score}</Text> – <Text style={{ color: f.player2Score > f.player1Score ? c.primary : c.text }}>{f.player2Score}</Text>
              </Text>
            </Row>
          ))}
        </Card>
      )}
    </View>
  );
}

function PlayerPanel({ name, score, frames, onStrike, canSwitch, tint, align, onSelect }: { name: string; score: number; frames: number; onStrike: boolean; canSwitch: boolean; tint: string; align?: 'right'; onSelect: () => void }) {
  const { c } = useTheme();
  const right = align === 'right';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${score} points${onStrike ? ', on strike' : ''}`}
      disabled={onStrike || !canSwitch}
      onPress={onSelect}
      style={{ flex: 1, borderRadius: radius.lg, borderWidth: 2, borderColor: onStrike ? tint : c.border, backgroundColor: c.surface, padding: 12, gap: 4, alignItems: right ? 'flex-end' : 'flex-start' }}>
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
        {right ? `${frames} · ` : ''}
        {name}
        {right ? '' : ` · ${frames}`}
      </Text>
      <Text style={{ color: tint, fontSize: 38, fontWeight: '900' }}>{score}</Text>
      <Text style={{ color: onStrike ? tint : c.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{onStrike ? 'ON STRIKE' : canSwitch ? 'TAP IF AT TABLE' : 'WAITING'}</Text>
    </PressableScale>
  );
}

function BallButton({ color, label, enabled, onPress }: { color: S.BallColor; label: string; enabled: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Pot ${color}, ${S.BALL_VALUES[color]} point${S.BALL_VALUES[color] === 1 ? '' : 's'}`}
      disabled={!enabled}
      onPress={onPress}
      style={{ width: '23.4%', height: 72, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: enabled ? 1 : 0.3 }}>
      <Ball color={color} size={30} />
      <Text style={{ color: c.text, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </PressableScale>
  );
}
