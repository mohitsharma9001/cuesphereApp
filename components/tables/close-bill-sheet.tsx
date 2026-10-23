import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { PayButtons } from '@/components/tables/pay-buttons';
import { BottomSheet, Body, Button, Caption, Chip, Headline, PressableScale, Row, tapHaptic, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { formatDuration, formatMoney } from '@/lib/format';
import { splitEqually, type LineupEntry, type OutstandingCharge, type Share, type SplitMode, type TableSession } from '@/lib/tables';

/** Close Table — Who Pays? (#27): the bill for a stopped session, shared out as
 * loser pays / split equally / custom (must add up), then each share collected. */
export function CloseBillSheet({
  slug,
  session,
  onClose,
  onChanged,
}: {
  slug: string;
  /** A stopped session (endedAt + amount set). */
  session: TableSession | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <BottomSheet visible={!!session} onClose={onClose} title="Who pays?">
      {session && <BillForm key={session.id} slug={slug} session={session} onClose={onClose} onChanged={onChanged} />}
    </BottomSheet>
  );
}

function BillForm({ slug, session, onClose, onChanged }: { slug: string; session: TableSession; onClose: () => void; onChanged: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const amount = session.amount ?? 0;
  const [people, setPeople] = useState<LineupEntry[]>(() => (session.lineup.length ? session.lineup : [{ name: 'Player', playerId: null }]));
  const [mode, setMode] = useState<SplitMode>('loser');
  const [loser, setLoser] = useState(0);
  const [custom, setCustom] = useState<string[]>(() => splitEqually(amount, Math.max(1, session.lineup.length)).map(String));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charges, setCharges] = useState<OutstandingCharge[] | null>(null);

  const shares: Share[] =
    mode === 'loser'
      ? [{ payerName: people[loser]?.name ?? 'Player', payerPlayerId: people[loser]?.playerId ?? null, amount }]
      : mode === 'split'
        ? splitEqually(amount, people.length).map((a, i) => ({ payerName: people[i].name, payerPlayerId: people[i].playerId, amount: a }))
        : people.map((p, i) => ({ payerName: p.name, payerPlayerId: p.playerId, amount: Number(custom[i] || 0) }));
  const total = shares.reduce((t, s) => t + s.amount, 0);

  async function confirm() {
    if (mode === 'custom' && total !== amount) return setError(`Shares add up to ${formatMoney(total)}; the bill is ${formatMoney(amount)}.`);
    setBusy(true);
    setError(null);
    try {
      await api(`/clubs/${slug}/table-sessions/${session.id}/settle`, { method: 'POST', body: { mode, shares } });
      tapHaptic('success');
      onChanged();
      // Now collect each share (or leave it in "To collect").
      const outstanding = await api<{ charges: OutstandingCharge[] }>(`/clubs/${slug}/table-sessions/outstanding`);
      setCharges(outstanding.charges.filter((ch) => ch.sessionId === session.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not split the bill.');
    } finally {
      setBusy(false);
    }
  }

  if (charges) {
    return (
      <>
        <Caption>Collect each share now, or leave it in &quot;To collect&quot;.</Caption>
        {charges.length === 0 && <Body muted>All paid.</Body>}
        {charges.map((ch) => (
          <View key={ch.id} style={{ gap: 8, paddingVertical: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Headline>
                {ch.payerName}
                {ch.payerPlayerId ? ' ✓' : ''}
              </Headline>
              <Headline>{formatMoney(ch.amount)}</Headline>
            </Row>
            <PayButtons
              onPay={async (method) => {
                try {
                  await api(`/clubs/${slug}/table-charges/${ch.id}/pay`, { method: 'POST', body: { method } });
                  toast(`${ch.payerName} paid ${formatMoney(ch.amount)}`);
                  setCharges((list) => (list ?? []).filter((x) => x.id !== ch.id));
                  onChanged();
                } catch (e) {
                  toast(e instanceof ApiError ? e.message : 'Could not mark paid.', 'error');
                }
              }}
            />
          </View>
        ))}
        <Button title={charges.length ? 'Leave the rest to collect' : 'Done'} variant={charges.length ? 'ghost' : 'primary'} onPress={onClose} />
      </>
    );
  }

  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Caption>
          {session.playerName || people.map((p) => p.name).join(' v ')} · {formatDuration(session.minutes ?? 0)}
        </Caption>
      </Row>
      <Text style={{ color: c.text, fontSize: 34, fontWeight: '900' }}>{formatMoney(amount)}</Text>
      <Row style={{ gap: 8 }}>
        <Chip label="Loser pays" selected={mode === 'loser'} onPress={() => setMode('loser')} />
        <Chip label="Split" selected={mode === 'split'} onPress={() => setMode('split')} />
        <Chip label="Custom" selected={mode === 'custom'} onPress={() => setMode('custom')} />
      </Row>

      {people.map((p, i) => (
        <Row key={i} style={{ gap: 10, paddingVertical: 4 }}>
          {mode === 'loser' ? (
            <PressableScale accessibilityRole="radio" accessibilityState={{ selected: loser === i }} onPress={() => setLoser(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: loser === i ? c.primary : c.border, backgroundColor: loser === i ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {loser === i && <Text style={{ color: c.onPrimary, fontSize: 12, fontWeight: '900' }}>✓</Text>}
              </View>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                {p.name}
                {p.playerId ? ' ✓' : ''}
              </Text>
            </PressableScale>
          ) : (
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
              {p.name}
              {p.playerId ? ' ✓' : ''}
            </Text>
          )}
          {mode === 'custom' ? (
            <TextInput
              value={custom[i] ?? ''}
              onChangeText={(t) => setCustom(people.map((_, j) => (j === i ? t.replace(/\D/g, '') : custom[j] ?? '0')))}
              keyboardType="number-pad"
              style={{ width: 90, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, color: c.text, textAlign: 'right', paddingHorizontal: 10, fontWeight: '800', fontSize: 16 }}
            />
          ) : (
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>{formatMoney(mode === 'loser' ? (loser === i ? amount : 0) : shares[i]?.amount ?? 0)}</Text>
          )}
        </Row>
      ))}
      {people.length < 8 && (
        <AddPayer
          onAdd={(name) => {
            setPeople((list) => [...list, { name, playerId: null }]);
            setCustom((list) => [...list, '0']);
          }}
        />
      )}
      {mode === 'custom' && total !== amount && (
        <Caption style={{ color: c.danger }}>
          Shares add up to {formatMoney(total)}; the bill is {formatMoney(amount)}.
        </Caption>
      )}
      {mode === 'split' && <Caption>Split equally: {splitEqually(amount, people.length).map(formatMoney).join(' + ')}</Caption>}
      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Row style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Decide later" variant="ghost" onPress={onClose} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="✓ Confirm" onPress={confirm} loading={busy} disabled={mode === 'custom' && total !== amount} />
        </View>
      </Row>
    </>
  );
}

function AddPayer({ onAdd }: { onAdd: (name: string) => void }) {
  const { c } = useTheme();
  const [name, setName] = useState('');
  return (
    <Row style={{ gap: 8 }}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="+ Add player"
        placeholderTextColor={c.textMuted}
        style={{ flex: 1, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, color: c.text, paddingHorizontal: 12 }}
      />
      {!!name.trim() && (
        <PressableScale
          onPress={() => {
            onAdd(name.trim());
            setName('');
          }}>
          <Caption style={{ color: c.primary, fontWeight: '800' }}>Add</Caption>
        </PressableScale>
      )}
    </Row>
  );
}
