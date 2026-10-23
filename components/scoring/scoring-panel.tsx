import { useState } from 'react';
import { Text } from 'react-native';

import { FrameScorer } from '@/components/scoring/frame-scorer';
import { LiveScorer } from '@/components/scoring/live-scorer';
import { ResultOnly } from '@/components/scoring/result-only';
import { Caption, Card, Headline, SegmentedControl } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import type { Match } from '@/lib/types';

type Mode = 'live' | 'frames' | 'result';

/** Scoring a match (#34): Live score (every ball) · Frame by frame · Result only. */
export function ScoringPanel({ match, onChanged }: { match: Match; onChanged: () => void }) {
  const { c } = useTheme();
  const [mode, setMode] = useState<Mode>('live');

  if (match.status === 'completed') {
    return (
      <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 22 }}>
        <Text style={{ fontSize: 32 }}>✅</Text>
        <Headline>Match completed</Headline>
        <Caption>
          {match.player1Name} {match.framesWonPlayer1} – {match.framesWonPlayer2} {match.player2Name}
        </Caption>
        {match.highestBreak > 0 && <Caption style={{ color: c.text }}>🏆 Highest break {match.highestBreak}</Caption>}
      </Card>
    );
  }

  return (
    <>
      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={[
          { value: 'live', label: 'Live score' },
          { value: 'frames', label: 'Frame by frame' },
          { value: 'result', label: 'Result only' },
        ]}
      />
      {mode === 'live' && <LiveScorer key={match.id} match={match} onFinished={onChanged} />}
      {mode === 'frames' && <FrameScorer key={match.id} match={match} onChanged={onChanged} />}
      {mode === 'result' && <ResultOnly key={match.id} match={match} onSaved={onChanged} />}
    </>
  );
}
