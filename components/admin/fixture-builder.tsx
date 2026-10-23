import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Avatar, BottomSheet, Body, Button, Caption, Card, Chip, Headline, ListGroup, ListItem, PressableScale, Row, tapHaptic, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import type { Match } from '@/lib/types';

export interface DrawPlayer {
  id: string;
  name: string;
  photoUrl?: string | null;
}
interface Slot {
  tableNumber: number;
  player1Id: string | null;
  player2Id: string | null;
}

const ROUND_SUGGESTIONS = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Quarter Finals', 'Semi Finals', 'Finals'];

function slotsFor(round: string, matches: Match[]): Slot[] {
  return matches
    .filter((m) => m.round === round)
    .map((m) => ({ tableNumber: m.tableNumber, player1Id: m.player1Id, player2Id: m.player2Id }))
    .sort((a, b) => a.tableNumber - b.tableNumber);
}

function winnersOf(round: string, matches: Match[], photo: Map<string, string | null | undefined>): DrawPlayer[] {
  return matches
    .filter((m) => m.round === round && m.status === 'completed' && m.winnerId)
    .map((m) => ({ id: m.winnerId as string, name: m.winnerId === m.player1Id ? m.player1Name : m.player2Name, photoUrl: photo.get(m.winnerId as string) }));
}

/** Fixtures / Draw (#32), mobile-style: tap a slot, pick a player. First round's pool is
 * every registered player; later rounds only the previous round's winners. Saves one round. */
export function FixtureBuilder({ slug, tournamentId, players, matches, onSaved }: { slug: string; tournamentId: string; players: DrawPlayer[]; matches: Match[]; onSaved: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const existing = useMemo(() => [...new Set(matches.map((m) => m.round))], [matches]);
  const [extraRounds, setExtraRounds] = useState<string[]>([]);
  const rounds = [...existing, ...extraRounds.filter((r) => !existing.includes(r))];
  const [round, setRound] = useState(rounds[rounds.length - 1] ?? 'Round 1');
  const [newRound, setNewRound] = useState('');
  const photo = useMemo(() => new Map(players.map((p) => [p.id, p.photoUrl])), [players]);

  const pool = useMemo(() => {
    const idx = existing.indexOf(round);
    const prior = idx > 0 ? existing[idx - 1] : idx === -1 ? existing[existing.length - 1] : undefined;
    return prior ? winnersOf(prior, matches, photo) : players;
  }, [round, existing, matches, players, photo]);

  const fresh = (r: string, p: DrawPlayer[]) => {
    const saved = slotsFor(r, matches);
    return saved.length ? saved : Array.from({ length: Math.max(1, Math.ceil(p.length / 2)) }, (_, i) => ({ tableNumber: i + 1, player1Id: null, player2Id: null }));
  };
  const [slots, setSlots] = useState<Slot[]>(() => fresh(round, pool));
  const [picking, setPicking] = useState<{ slot: number; side: 1 | 2 } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = new Map([...players, ...pool].map((p) => [p.id, p]));
  const used = new Set(slots.flatMap((s) => [s.player1Id, s.player2Id]).filter(Boolean) as string[]);
  const unassigned = pool.filter((p) => !used.has(p.id));
  const roundHasResults = matches.some((m) => m.round === round && m.status === 'completed');

  const switchRound = (r: string) => {
    setRound(r);
    const idx = existing.indexOf(r);
    const prior = idx > 0 ? existing[idx - 1] : idx === -1 ? existing[existing.length - 1] : undefined;
    setSlots(fresh(r, prior ? winnersOf(prior, matches, photo) : players));
    setError(null);
  };

  const assign = (playerId: string | null) => {
    if (!picking) return;
    setSlots((list) => list.map((s, i) => (i === picking.slot ? { ...s, [picking.side === 1 ? 'player1Id' : 'player2Id']: playerId } : s)));
    setPicking(null);
    tapHaptic('select');
  };

  const shuffle = () => {
    const left = [...unassigned].sort(() => Math.random() - 0.5);
    setSlots((list) =>
      list.map((s) => ({
        ...s,
        player1Id: s.player1Id ?? left.shift()?.id ?? null,
        player2Id: s.player2Id ?? left.shift()?.id ?? null,
      }))
    );
    tapHaptic('success');
  };

  async function publish() {
    const pairs = slots.filter((s) => s.player1Id && s.player2Id).map((s) => ({ tableNumber: s.tableNumber, player1Id: s.player1Id!, player2Id: s.player2Id! }));
    if (!pairs.length) return setError('Fill at least one table with two players.');
    if (new Set(pairs.map((p) => p.tableNumber)).size !== pairs.length) return setError('Two matches can’t share a table in the same round.');
    setSaving(true);
    setError(null);
    try {
      await api(`/clubs/${slug}/matches/tournaments/${tournamentId}/fixtures`, { method: 'PUT', body: { round, pairs } });
      toast(`${round} draw published (${pairs.length} match${pairs.length === 1 ? '' : 'es'})`);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the draw.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {rounds.map((r) => (
          <Chip key={r} label={r} selected={r === round} onPress={() => switchRound(r)} />
        ))}
      </ScrollView>
      <Row style={{ gap: 8 }}>
        <TextInput
          value={newRound}
          onChangeText={setNewRound}
          placeholder="New round, e.g. Semi Finals"
          placeholderTextColor={c.textMuted}
          style={{ flex: 1, height: 42, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 12 }}
        />
        <Button
          title="Add"
          variant="secondary"
          disabled={!newRound.trim()}
          onPress={() => {
            const r = newRound.trim();
            setExtraRounds((x) => [...x, r]);
            setNewRound('');
            switchRound(r);
          }}
        />
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {ROUND_SUGGESTIONS.filter((s) => !rounds.includes(s)).map((s) => (
          <Pressable key={s} onPress={() => setNewRound(s)}>
            <Caption style={{ color: c.primary, fontWeight: '700' }}>{s}</Caption>
          </Pressable>
        ))}
      </ScrollView>

      <Card style={{ backgroundColor: c.surfaceAlt, gap: 4 }}>
        <Headline>Build the draw · {round}</Headline>
        <Caption>
          {existing.indexOf(round) > 0 || (existing.length > 0 && !existing.includes(round)) ? 'Pool: winners of the previous round.' : 'Pool: every registered player.'} {unassigned.length} not placed yet.
        </Caption>
        {roundHasResults && <Caption style={{ color: c.danger }}>This round already has results and can&apos;t be redrawn.</Caption>}
      </Card>
      {pool.length === 0 && <Body muted>No players have qualified for this round yet — finish the previous round first.</Body>}

      {slots.map((s, i) => (
        <Card key={i} style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>TABLE {s.tableNumber}</Caption>
            {slots.length > 1 && (
              <Pressable hitSlop={8} onPress={() => setSlots((list) => list.filter((_, j) => j !== i))}>
                <Caption style={{ color: c.textMuted }}>Remove</Caption>
              </Pressable>
            )}
          </Row>
          <SlotButton player={s.player1Id ? byId.get(s.player1Id) : undefined} onPress={() => setPicking({ slot: i, side: 1 })} onClear={() => setSlots((list) => list.map((x, j) => (j === i ? { ...x, player1Id: null } : x)))} />
          <Caption style={{ textAlign: 'center' }}>v</Caption>
          <SlotButton player={s.player2Id ? byId.get(s.player2Id) : undefined} onPress={() => setPicking({ slot: i, side: 2 })} onClear={() => setSlots((list) => list.map((x, j) => (j === i ? { ...x, player2Id: null } : x)))} />
        </Card>
      ))}
      <PressableScale onPress={() => setSlots((list) => [...list, { tableNumber: Math.min(99, (list.reduce((n, x) => Math.max(n, x.tableNumber), 0) || 0) + 1), player1Id: null, player2Id: null }])}>
        <Caption style={{ color: c.primary, fontWeight: '800' }}>+ Add table</Caption>
      </PressableScale>

      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Row style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Shuffle" variant="secondary" icon={['shuffle', 'shuffle']} disabled={!unassigned.length} onPress={shuffle} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Publish draw" onPress={publish} loading={saving} disabled={roundHasResults} />
        </View>
      </Row>

      <BottomSheet visible={!!picking} onClose={() => setPicking(null)} title="Pick a player">
        {unassigned.length === 0 ? (
          <Caption>Everyone in the pool is placed.</Caption>
        ) : (
          <ListGroup>
            {unassigned.map((p, i) => (
              <ListItem key={p.id} label={p.name} icon={['person.fill', 'person']} onPress={() => assign(p.id)} last={i === unassigned.length - 1} />
            ))}
          </ListGroup>
        )}
        <Button title="Leave empty" variant="ghost" onPress={() => assign(null)} />
      </BottomSheet>
    </View>
  );
}

function SlotButton({ player, onPress, onClear }: { player?: DrawPlayer; onPress: () => void; onClear: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress}>
      <Row style={{ height: 46, borderRadius: radius.md, borderWidth: player ? 1 : 1.5, borderStyle: player ? 'solid' : 'dashed', borderColor: player ? c.border : c.primary, paddingHorizontal: 10, backgroundColor: player ? c.surface : c.primarySoft }}>
        {player ? (
          <>
            <Avatar name={player.name} uri={player.photoUrl} size={28} />
            <Text style={{ flex: 1, color: c.text, fontWeight: '700' }} numberOfLines={1}>{player.name}</Text>
            <Pressable accessibilityLabel="Clear" hitSlop={8} onPress={onClear}>
              <Text style={{ color: c.textMuted, fontSize: 16 }}>✕</Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: c.primary, fontWeight: '700' }}>Tap to pick a player</Text>
        )}
      </Row>
    </PressableScale>
  );
}
