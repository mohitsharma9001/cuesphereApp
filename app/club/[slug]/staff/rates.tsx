import { Stack } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';

import { Body, Button, Caption, Card, LoadState, Row, Screen, SectionTitle, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import type { ClubTable } from '@/lib/tables';
import { useApi } from '@/lib/use-api';

/** Tables & Rates (#30): each table's name, ₹/hour and whether it's in use. */
export default function TablesAndRates() {
  const { slug } = useClub();
  const tables = useApi<ClubTable[]>(`/clubs/${slug}/tables?includeInactive=true`);
  const list = [...(tables.data ?? [])].sort((a, b) => a.tableNumber - b.tableNumber);
  const nextNumber = list.reduce((n, t) => Math.max(n, t.tableNumber), 0) + 1;

  return (
    <Screen refreshing={tables.refreshing} onRefresh={tables.refresh}>
      <Stack.Screen options={{ title: 'Tables & rates' }} />
      <Caption>Rates are per hour; games are billed by the minute. A new rate applies to tables started after you save.</Caption>
      <LoadState loading={tables.loading} error={tables.error} onRetry={tables.refresh} empty={tables.data?.length === 0 && 'No tables yet — add your first below.'} />
      {list.map((t) => (
        <TableRow key={`${t.id}-${t.name}-${t.hourlyRate}-${t.active}`} slug={slug} table={t} onSaved={tables.reload} />
      ))}
      <SectionTitle>Add a table</SectionTitle>
      <AddTable key={nextNumber} slug={slug} suggested={Math.min(99, nextNumber)} defaultRate={list[list.length - 1]?.hourlyRate ?? 300} onAdded={tables.reload} />
    </Screen>
  );
}

function TableRow({ slug, table, onSaved }: { slug: string; table: ClubTable; onSaved: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [name, setName] = useState(table.name);
  const [rate, setRate] = useState(String(table.hourlyRate));
  const [active, setActive] = useState(table.active);
  const [busy, setBusy] = useState(false);
  const dirty = name !== table.name || rate !== String(table.hourlyRate) || active !== table.active;

  async function save() {
    setBusy(true);
    try {
      await api(`/clubs/${slug}/tables/${table.id}`, { method: 'PUT', body: { tableNumber: table.tableNumber, name: name.trim(), hourlyRate: Number(rate), active } });
      toast(`Table ${table.tableNumber} saved`);
      onSaved();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 10, opacity: active ? 1 : 0.7 }}>
      <Row style={{ gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.primary, fontWeight: '900', fontSize: 16 }}>{table.tableNumber}</Text>
        </View>
        <Input value={name} onChangeText={setName} placeholder="Name (optional)" style={{ flex: 1 }} />
        <Row style={{ gap: 4 }}>
          <Text style={{ color: c.textMuted }}>₹</Text>
          <Input value={rate} onChangeText={(t) => setRate(t.replace(/\D/g, ''))} keyboardType="number-pad" style={{ width: 70, textAlign: 'right' }} />
          <Caption>/hr</Caption>
        </Row>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 8 }}>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: c.primary, false: c.border }} thumbColor="#FFFFFF" />
          <Caption style={{ color: active ? c.primary : c.textMuted, fontWeight: '700' }}>{active ? '● In use' : 'Not in use'}</Caption>
        </Row>
        <View style={{ width: 110 }}>
          <Button title="Save" variant={dirty ? 'primary' : 'ghost'} disabled={!dirty} loading={busy} onPress={save} />
        </View>
      </Row>
    </Card>
  );
}

function AddTable({ slug, suggested, defaultRate, onAdded }: { slug: string; suggested: number; defaultRate: number; onAdded: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [num, setNum] = useState(String(suggested));
  const [name, setName] = useState('');
  const [rate, setRate] = useState(String(defaultRate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await api(`/clubs/${slug}/tables`, { method: 'POST', body: { tableNumber: Number(num), name: name.trim(), hourlyRate: Number(rate), active: true } });
      toast(`Table ${num} added`);
      onAdded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add the table.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ gap: 10 }}>
        <View style={{ gap: 4 }}>
          <Caption>No.</Caption>
          <Input value={num} onChangeText={(t) => setNum(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" style={{ width: 56, textAlign: 'center' }} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Caption>Name</Caption>
          <Input value={name} onChangeText={setName} placeholder="e.g. Championship" />
        </View>
        <View style={{ gap: 4 }}>
          <Caption>₹/hr</Caption>
          <Input value={rate} onChangeText={(t) => setRate(t.replace(/\D/g, ''))} keyboardType="number-pad" style={{ width: 76, textAlign: 'right' }} />
        </View>
      </Row>
      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="+ Add table" onPress={add} loading={busy} disabled={!num} />
    </Card>
  );
}

function Input({ style, ...props }: React.ComponentProps<typeof TextInput>) {
  const { c } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.textMuted}
      selectionColor={c.primary}
      {...props}
      style={[{ height: 42, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, color: c.text, paddingHorizontal: 10, fontSize: 16, fontWeight: '600' }, style]}
    />
  );
}
