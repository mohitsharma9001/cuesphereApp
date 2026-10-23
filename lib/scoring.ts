/** Live snooker scoring rules — a faithful port of the website's referee panel
 * (features/club-admin/components/scoring/live-scoring-panel.tsx). Pure functions:
 * every action takes the previous state and returns the next one. */

export type BallColor = 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black';
export const BALL_VALUES: Record<BallColor, number> = { red: 1, yellow: 2, green: 3, brown: 4, blue: 5, pink: 6, black: 7 };
export const COLORS: Exclude<BallColor, 'red'>[] = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
export const FOUL_VALUES = [4, 5, 6, 7];
const TOTAL_REDS = 15;

export interface FrameEntry {
  frame: number;
  player1Score: number;
  player2Score: number;
}

export interface LiveState {
  currentPlayer: 1 | 2;
  currentBreak: number;
  breakBalls: BallColor[];
  redsRemaining: number;
  /** Colours potted for good — only once all reds are gone. */
  coloredPotted: BallColor[];
  frameScoreP1: number;
  frameScoreP2: number;
  frameHistory: FrameEntry[];
  matchHighestBreak: number;
  matchHighestBreakPlayer: 1 | 2 | null;
  /** Between End Frame and the next frame — table screens play ads. */
  frameBreak: boolean;
}

export interface SavedMatch {
  player1Id: string;
  player2Id: string;
  currentPlayer?: 1 | 2 | null;
  inFrameBreak?: boolean;
  currentBreak?: number;
  currentBreakBalls?: string[];
  redsRemaining?: number;
  currentFrameScorePlayer1?: number;
  currentFrameScorePlayer2?: number;
  frameScores?: FrameEntry[];
  highestBreak?: number;
  highestBreakPlayerId?: string | null;
}

export function initialState(): LiveState {
  return {
    currentPlayer: 1,
    currentBreak: 0,
    breakBalls: [],
    redsRemaining: TOTAL_REDS,
    coloredPotted: [],
    frameScoreP1: 0,
    frameScoreP2: 0,
    frameHistory: [],
    matchHighestBreak: 0,
    matchHighestBreakPlayer: null,
    frameBreak: false,
  };
}

/** Picks up from what was last saved, so a reload or locked phone doesn't wipe the frame. */
export function stateFromMatch(m: SavedMatch): LiveState {
  return {
    ...initialState(),
    currentPlayer: m.currentPlayer ?? 1,
    frameBreak: m.inFrameBreak ?? false,
    currentBreak: m.currentBreak ?? 0,
    breakBalls: (m.currentBreakBalls ?? []).filter((b): b is BallColor => b in BALL_VALUES),
    redsRemaining: m.redsRemaining ?? TOTAL_REDS,
    frameScoreP1: m.currentFrameScorePlayer1 ?? 0,
    frameScoreP2: m.currentFrameScorePlayer2 ?? 0,
    frameHistory: (m.frameScores ?? []).map((f, i) => ({ frame: f.frame ?? i + 1, player1Score: f.player1Score, player2Score: f.player2Score })),
    matchHighestBreak: m.highestBreak ?? 0,
    matchHighestBreakPlayer: m.highestBreakPlayerId === m.player1Id ? 1 : m.highestBreakPlayerId === m.player2Id ? 2 : null,
  };
}

export function hasProgress(s: LiveState) {
  return s.frameScoreP1 > 0 || s.frameScoreP2 > 0 || s.frameHistory.length > 0;
}

/** Which balls are "on": red then colour while reds remain, any colour after the last red, then colours in order. */
export function tableRules(s: LiveState) {
  const onColour = s.breakBalls[s.breakBalls.length - 1] === 'red';
  const colorsLeft = COLORS.filter((c) => !s.coloredPotted.includes(c));
  if (s.redsRemaining > 0) {
    return { canPotRed: !onColour, colors: onColour ? COLORS : [], colorsOnTable: COLORS, pointsRemaining: s.redsRemaining * 8 + 27 + (onColour ? 7 : 0), hint: onColour ? 'Next: any colour' : 'Next: a red' };
  }
  if (onColour) {
    return { canPotRed: false, colors: COLORS, colorsOnTable: COLORS, pointsRemaining: 27 + 7, hint: 'Next: any colour' };
  }
  return {
    canPotRed: false,
    colors: colorsLeft.slice(0, 1),
    colorsOnTable: colorsLeft,
    pointsRemaining: colorsLeft.reduce((sum, c) => sum + BALL_VALUES[c], 0),
    hint: colorsLeft.length ? `Next: ${colorsLeft[0]}` : 'All balls potted',
  };
}

/** Credits the break that's ending if it's now the biggest of the match. */
export function carryHighestBreak(prev: LiveState): Pick<LiveState, 'matchHighestBreak' | 'matchHighestBreakPlayer'> {
  return prev.currentBreak > prev.matchHighestBreak
    ? { matchHighestBreak: prev.currentBreak, matchHighestBreakPlayer: prev.currentPlayer }
    : { matchHighestBreak: prev.matchHighestBreak, matchHighestBreakPlayer: prev.matchHighestBreakPlayer };
}

export function framesWon(frames: FrameEntry[]) {
  return { p1: frames.filter((f) => f.player1Score > f.player2Score).length, p2: frames.filter((f) => f.player2Score > f.player1Score).length };
}

const scoreKey = (p: 1 | 2): 'frameScoreP1' | 'frameScoreP2' => (p === 1 ? 'frameScoreP1' : 'frameScoreP2');

export function potBall(prev: LiveState, color: BallColor): LiveState {
  const r = tableRules(prev);
  const isRed = color === 'red';
  if (isRed ? !r.canPotRed : !r.colors.includes(color as Exclude<BallColor, 'red'>)) return prev;
  const points = BALL_VALUES[color];
  const key = scoreKey(prev.currentPlayer);
  // With no reds left a colour is gone for good — except the one taken straight after the last red (re-spotted).
  const onColour = prev.breakBalls[prev.breakBalls.length - 1] === 'red';
  const colourIsFinal = !isRed && prev.redsRemaining === 0 && !onColour;
  return {
    ...prev,
    redsRemaining: isRed ? prev.redsRemaining - 1 : prev.redsRemaining,
    coloredPotted: colourIsFinal ? [...prev.coloredPotted, color] : prev.coloredPotted,
    currentBreak: prev.currentBreak + points,
    breakBalls: [...prev.breakBalls, color],
    [key]: prev[key] + points,
  };
}

export function switchTurn(prev: LiveState): LiveState {
  return { ...prev, ...carryHighestBreak(prev), currentBreak: 0, breakBalls: [], currentPlayer: prev.currentPlayer === 1 ? 2 : 1 };
}

export const miss = switchTurn;

/** Foul: points to the opponent and their turn. */
export function foul(prev: LiveState, points: number): LiveState {
  const opp = scoreKey(prev.currentPlayer === 1 ? 2 : 1);
  return { ...switchTurn(prev), [opp]: prev[opp] + points };
}

/** Reds potted on a foul don't score but stay off the table. */
export function setRedsAfterFoul(prev: LiveState, redsBefore: number, potted: number): LiveState {
  return { ...prev, redsRemaining: Math.max(0, redsBefore - potted) };
}

/** A nominated free ball scores as the ball on: 1 while reds remain (then a colour is on), else the lowest colour left. */
export function freeBall(prev: LiveState): LiveState {
  if (prev.breakBalls.length > 0) return prev;
  const key = scoreKey(prev.currentPlayer);
  if (prev.redsRemaining > 0) return { ...prev, currentBreak: prev.currentBreak + 1, breakBalls: [...prev.breakBalls, 'red'], [key]: prev[key] + 1 };
  const lowest = COLORS.find((c) => !prev.coloredPotted.includes(c));
  if (!lowest) return prev;
  const value = BALL_VALUES[lowest];
  return { ...prev, currentBreak: prev.currentBreak + value, breakBalls: [...prev.breakBalls, lowest], [key]: prev[key] + value };
}

/** Who's at the table — only between visits (no break running). */
export function setStriker(prev: LiveState, player: 1 | 2): LiveState {
  return prev.currentBreak > 0 || prev.currentPlayer === player ? prev : { ...prev, currentPlayer: player };
}

/** Ends the frame: error text, or the next state (frame break, players alternate breaking off). */
export function endFrame(prev: LiveState): { error: string } | { next: LiveState; frames: FrameEntry[] } {
  if (prev.frameScoreP1 === 0 && prev.frameScoreP2 === 0) return { error: 'No points scored in this frame yet.' };
  if (prev.frameScoreP1 === prev.frameScoreP2) return { error: 'Scores are level — re-spot the black and play on.' };
  const frames = [...prev.frameHistory, { frame: prev.frameHistory.length + 1, player1Score: prev.frameScoreP1, player2Score: prev.frameScoreP2 }];
  return {
    frames,
    next: { ...initialState(), frameHistory: frames, ...carryHighestBreak(prev), currentPlayer: frames.length % 2 === 0 ? 1 : 2, frameBreak: true },
  };
}

/** What Finish sends: frames incl. any frame in progress, totals, the match highest break. */
export function finishPayload(s: LiveState, player1Id: string, player2Id: string): { error: string } | { body: { framesWonPlayer1: number; framesWonPlayer2: number; highestBreak: number; highestBreakPlayerId?: string; frameScores: FrameEntry[] } } {
  let frames = s.frameHistory;
  const hb = carryHighestBreak(s);
  if (s.frameScoreP1 !== 0 || s.frameScoreP2 !== 0) frames = [...frames, { frame: frames.length + 1, player1Score: s.frameScoreP1, player2Score: s.frameScoreP2 }];
  const t = framesWon(frames);
  if (t.p1 === t.p2) return { error: 'Frames are tied — play or end at least one more frame first.' };
  return {
    body: {
      framesWonPlayer1: t.p1,
      framesWonPlayer2: t.p2,
      highestBreak: hb.matchHighestBreak,
      ...(hb.matchHighestBreakPlayer ? { highestBreakPlayerId: hb.matchHighestBreakPlayer === 1 ? player1Id : player2Id } : {}),
      frameScores: frames,
    },
  };
}

/** The live update the API takes after every change (PATCH /matches/:id/live). */
export function livePayload(s: LiveState, player1Id: string, player2Id: string) {
  const hb = carryHighestBreak(s);
  return {
    currentFrameScorePlayer1: s.frameScoreP1,
    currentFrameScorePlayer2: s.frameScoreP2,
    currentBreak: s.currentBreak,
    currentBreakBalls: s.breakBalls,
    redsRemaining: s.redsRemaining,
    highestBreakSoFar: hb.matchHighestBreak,
    highestBreakSoFarPlayerId: hb.matchHighestBreakPlayer === 1 ? player1Id : hb.matchHighestBreakPlayer === 2 ? player2Id : null,
    currentPlayer: s.currentPlayer,
    inFrameBreak: s.frameBreak,
  };
}
