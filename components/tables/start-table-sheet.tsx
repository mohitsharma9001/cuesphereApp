import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { BottomSheet, Body, Button, Caption, PressableScale, Row, tapHaptic, useDebouncedValue } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import type { ClubTable, LineupEntry } from '@/lib/tables';
import { useApi } from '@/lib/use-api';

interface Suggestion {
  id: string;
  name: string;
  memberId: string;
}

/** Start a table (#26): who's playing, linked to their CueSphere accounts when known
 * (✓ = linked, so their dues show in their app). */
export function StartTableSheet({ slug, table, onClose, onStarted }: { slug: string; table: ClubTable | null; onClose: () => void; onStarted: () => void }) {
  const { c } = useTheme();
  const [people, setPeople] = useState<LineupEntry[]>([{ name: '', playerId: null }, { name: '', playerId: null }]);
  const [focus, setFocus] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typing = focus !== null ? people[focus]?.name.trim() ?? '' : '';
  const q = useDebouncedValue(typing, 250);
  const suggestions = useApi<Suggestion[]>(focus !== null && !people[focus]?.playerId && q.length >= 2 ? `/clubs/${slug}/table-players/search?q=${encodeURIComponent(q)}` : null);

  const setPerson = (i: number, next: LineupEntry) => setPeople((list) => list.map((p, j) => (j === i ? next : p)));

  async function start() {
    if (!table) return;
    const lineup = people.filter((p) => p.name.trim());
    setBusy(true);
    setError(null);
    try {
      await api(`/clubs/${slug}/tables/${table.id}/start`, { method: 'POST', body: { lineup } });
      tapHaptic('success');
      setPeople([{ name: '', playerId: null }, { name: '', playerId: null }]);
      onStarted();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the table.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={!!table} onClose={onClose} title={table ? `${table.name || `Table ${table.tableNumber}`} · Free` : ''}>
      <Caption>Who&apos;s playing? Pick registered players so the game shows in their app.</Caption>
      {people.map((p, i) => (
        <View key={i} style={{ gap: 6 }}>
          <Row style={{ gap: 8 }}>
            <TextInput
              value={p.name}
              onFocus={() => setFocus(i)}
              onChangeText={(name) => setPerson(i, { name, playerId: null })}
              placeholder={`Player ${i + 1}`}
              placeholderTextColor={c.textMuted}
              autoCapitalize="words"
              style={{ flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: focus === i ? c.primary : c.border, backgroundColor: c.surfaceAlt, color: c.text, paddingHorizontal: 14, fontSize: 16 }}
            />
            {p.playerId ? (
              <View style={{ backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Caption style={{ color: c.primary, fontWeight: '800' }}>✓</Caption>
              </View>
            ) : null}
            {people.length > 1 && (
              <Pressable accessibilityLabel={`Remove player ${i + 1}`} hitSlop={8} onPress={() => setPeople((list) => list.filter((_, j) => j !== i))}>
                <Text style={{ color: c.textMuted, fontSize: 18 }}>✕</Text>
              </Pressable>
            )}
          </Row>
          {focus === i && !p.playerId && (suggestions.data?.length ?? 0) > 0 && (
            <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
              {suggestions.data!.slice(0, 5).map((s) => (
                <PressableScale
                  key={s.id}
                  onPress={() => {
                    setPerson(i, { name: s.name, playerId: s.id });
                    setFocus(i + 1 < people.length ? i + 1 : null);
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: c.text, fontWeight: '700' }}>{s.name}</Text>
                    <Caption>{s.memberId}</Caption>
                  </Row>
                </PressableScale>
              ))}
            </View>
          )}
        </View>
      ))}
      {people.length < 8 && (
        <PressableScale
          onPress={() => {
            setPeople((list) => [...list, { name: '', playerId: null }]);
            setFocus(people.length);
          }}>
          <Caption style={{ color: c.primary, fontWeight: '800' }}>+ Add player</Caption>
        </PressableScale>
      )}
      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Row style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Cancel" variant="ghost" onPress={onClose} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="▶ Start" onPress={start} loading={busy} />
        </View>
      </Row>
    </BottomSheet>
  );
}
