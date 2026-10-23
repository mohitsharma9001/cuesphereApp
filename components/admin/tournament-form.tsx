import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Body, Button, Caption, Chip, DateField, Field, PressableScale, Row, SectionTitle } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import type { Tournament } from '@/lib/types';

export interface TournamentInput {
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD or ''
  endDate: string;
  location: string;
  entryFee: string;
  prizePool: string;
  format: string;
  bestOf: number;
  maxPlayers: number;
  prizeBreakdown: { label: string; amount: string }[];
}

const FORMATS = ['Knockout', 'Round Robin', 'League + Playoffs'];
const BEST_OF = [1, 3, 5, 7, 9, 11];
const ymd = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

/** Create / edit form for a tournament (#31) — the same fields as the website. */
export function TournamentForm({ initial, submitLabel, onSubmit }: { initial?: Tournament; submitLabel: string; onSubmit: (input: TournamentInput) => Promise<void> }) {
  const { c } = useTheme();
  const [f, setF] = useState<TournamentInput>(() => ({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    startDate: ymd(initial?.startDate),
    endDate: ymd(initial?.endDate),
    location: initial?.location ?? '',
    entryFee: initial?.entryFee ?? '',
    prizePool: initial?.prizePool ?? '',
    format: initial?.format || 'Knockout',
    bestOf: initial?.bestOf ?? 7,
    maxPlayers: initial?.maxPlayers ?? 32,
    prizeBreakdown: initial?.prizeBreakdown ?? [],
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);
  const set = <K extends keyof TournamentInput>(k: K) => (v: TournamentInput[K]) => setF((x) => ({ ...x, [k]: v }));

  async function submit() {
    if (!f.name.trim()) return setError('Enter a tournament name.');
    if (f.startDate && f.endDate && f.endDate < f.startDate) return setError('The end date must be on or after the start date.');
    if (!(f.maxPlayers >= 2)) return setError('Max players must be at least 2.');
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await onSubmit({ ...f, name: f.name.trim(), prizeBreakdown: f.prizeBreakdown.filter((p) => p.label.trim() || p.amount.trim()) });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <Field label="Name" value={f.name} onChangeText={set('name')} placeholder="Winter Open 2026" autoCapitalize="words" />
      <Field label="About (optional)" value={f.description} onChangeText={set('description')} placeholder="Rules, timings, anything players should know" multiline style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }} />
      <Row style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <DateField label="Start date" value={f.startDate} onChange={set('startDate')} />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="End date" value={f.endDate} onChange={set('endDate')} minimumDate={f.startDate ? new Date(`${f.startDate}T12:00:00`) : undefined} />
        </View>
      </Row>
      <Field label="Venue (optional)" value={f.location} onChangeText={set('location')} placeholder="Club hall" />
      <Row style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Entry fee" value={f.entryFee} onChangeText={set('entryFee')} placeholder="₹1,000" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Prize pool" value={f.prizePool} onChangeText={set('prizePool')} placeholder="₹50,000" />
        </View>
      </Row>

      <SectionTitle style={{ marginTop: 4 }}>Format</SectionTitle>
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        {FORMATS.map((x) => (
          <Chip key={x} label={x} selected={f.format === x} onPress={() => set('format')(x)} />
        ))}
      </Row>
      <SectionTitle style={{ marginTop: 4 }}>Best of (frames)</SectionTitle>
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        {BEST_OF.map((n) => (
          <Chip key={n} label={`Bo${n}`} selected={f.bestOf === n} onPress={() => set('bestOf')(n)} />
        ))}
      </Row>
      <Field label="Max players" value={String(f.maxPlayers || '')} onChangeText={(t) => set('maxPlayers')(Number(t.replace(/\D/g, '')) || 0)} keyboardType="number-pad" />

      <SectionTitle style={{ marginTop: 4 }}>Prize breakdown</SectionTitle>
      {f.prizeBreakdown.map((p, i) => (
        <Row key={i} style={{ gap: 8 }}>
          <Input value={p.label} onChange={(v) => set('prizeBreakdown')(f.prizeBreakdown.map((x, j) => (j === i ? { ...x, label: v } : x)))} placeholder={['Winner', 'Runner-up', 'Semi-finalists'][i] ?? 'Place'} style={{ flex: 1 }} />
          <Input value={p.amount} onChange={(v) => set('prizeBreakdown')(f.prizeBreakdown.map((x, j) => (j === i ? { ...x, amount: v } : x)))} placeholder="₹25,000" style={{ width: 110 }} />
          <Pressable accessibilityLabel="Remove prize" hitSlop={8} onPress={() => set('prizeBreakdown')(f.prizeBreakdown.filter((_, j) => j !== i))}>
            <Text style={{ color: c.textMuted, fontSize: 18 }}>✕</Text>
          </Pressable>
        </Row>
      ))}
      <PressableScale onPress={() => set('prizeBreakdown')([...f.prizeBreakdown, { label: '', amount: '' }])}>
        <Caption style={{ color: c.primary, fontWeight: '800' }}>+ Add prize</Caption>
      </PressableScale>

      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      {saved && (
        <Row style={{ gap: 6, justifyContent: 'center' }}>
          <Icon ios="checkmark.circle.fill" android="check_circle" size={18} color={c.success} />
          <Body style={{ color: c.success, fontWeight: '700' }}>Saved</Body>
        </Row>
      )}
      <Button title={saved ? 'Saved ✓' : submitLabel} onPress={submit} loading={busy} />
    </View>
  );
}

function Input({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder: string; style?: object }) {
  const { c } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.textMuted}
      style={[{ height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 12, fontSize: 15 }, style]}
    />
  );
}
