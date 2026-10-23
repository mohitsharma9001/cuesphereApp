import { Stack } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { CloseBillSheet } from '@/components/tables/close-bill-sheet';
import { PayButtons } from '@/components/tables/pay-buttons';
import { Button, Caption, Card, Headline, LoadState, PressableScale, Row, Screen, useToast } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import { formatDateTime, formatDuration, formatMoney } from '@/lib/format';
import type { ClubTable, OutstandingCharge, PaymentMethod, TableSession } from '@/lib/tables';
import { useApi } from '@/lib/use-api';

interface PayerDues {
  key: string;
  name: string;
  playerId: string | null;
  mobile: string | null;
  total: number;
  charges: OutstandingCharge[];
  lastRemindedAt: string | null;
}

const SPLIT: Record<string, string> = { loser: 'lost', split: 'split', custom: 'custom' };

/** Dues by Player (#28): who owes the club, game by game — collect, remind, WhatsApp.
 * Bills still waiting for "who pays?" (closed with "Decide later") are listed first. */
export default function DuesByPlayer() {
  const { c } = useTheme();
  const { slug, club } = useClub();
  const dues = useApi<PayerDues[]>(`/clubs/${slug}/dues`);
  const outstanding = useApi<{ unsplit: TableSession[] }>(`/clubs/${slug}/table-sessions/outstanding`);
  const tables = useApi<ClubTable[]>(`/clubs/${slug}/tables?includeInactive=true`);
  const [open, setOpen] = useState<string | null>(null);
  const [billing, setBilling] = useState<TableSession | null>(null);
  const unsplit = outstanding.data?.unsplit ?? [];
  const unsplitTotal = unsplit.reduce((t, s) => t + (s.amount ?? 0), 0);
  const total = (dues.data ?? []).reduce((t, d) => t + d.total, 0) + unsplitTotal;
  const tableName = (id: string) => {
    const t = tables.data?.find((x) => x.id === id);
    return t ? t.name || `Table ${t.tableNumber}` : 'Table';
  };
  const reload = () => Promise.all([dues.reload(), outstanding.reload()]);
  const nothingOwed = dues.data?.length === 0 && outstanding.data && unsplit.length === 0;

  return (
    <Screen refreshing={dues.refreshing} onRefresh={() => Promise.all([dues.refresh(), outstanding.reload(), tables.reload()])}>
      <Stack.Screen options={{ title: 'Dues' }} />
      <Card style={{ backgroundColor: total ? c.accentSoft : c.primarySoft }}>
        <Caption style={{ fontWeight: '800', letterSpacing: 1, color: total ? c.accent : c.primary }}>OWED TO {club?.name.toUpperCase()}</Caption>
        <Text style={{ color: c.text, fontSize: 30, fontWeight: '900' }}>{formatMoney(total)}</Text>
        <Caption>
          {[
            (dues.data?.length || !unsplit.length) && `${dues.data?.length ?? 0} player${dues.data?.length === 1 ? '' : 's'}`,
            unsplit.length > 0 && `${unsplit.length} bill${unsplit.length === 1 ? '' : 's'} not split yet`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Caption>
      </Card>

      {unsplit.length > 0 && (
        <View style={{ gap: 10 }}>
          <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>NOT SPLIT YET</Caption>
          {unsplit.map((s) => (
            <Card key={s.id} style={{ borderWidth: 1, borderColor: c.warning, gap: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Headline numberOfLines={1}>{s.lineup?.map((p) => p.name).join(' v ') || s.playerName || s.players.join(' v ') || 'Game'}</Headline>
                  <Caption>
                    {tableName(s.tableId)} · {formatDuration(s.minutes ?? 0)}
                    {s.endedAt ? ` · ${formatDateTime(s.endedAt)}` : ''}
                  </Caption>
                </View>
                <Headline>{formatMoney(s.amount ?? 0)}</Headline>
              </Row>
              <Caption>Choose who pays to add it to their dues.</Caption>
              <Button title="Split bill" variant="secondary" icon={['person.2.fill', 'group']} onPress={() => setBilling(s)} />
            </Card>
          ))}
        </View>
      )}

      <LoadState loading={dues.loading} error={dues.error} onRetry={dues.refresh} empty={nothingOwed && 'Nobody owes the club anything. 🎉'} />
      <View style={{ gap: 10 }}>
        {dues.data?.map((d) => <PayerCard key={d.key} slug={slug} clubName={club?.name ?? 'the club'} dues={d} open={open === d.key} onToggle={() => setOpen((k) => (k === d.key ? null : d.key))} onChanged={dues.reload} />)}
      </View>
      <CloseBillSheet slug={slug} session={billing} onClose={() => setBilling(null)} onChanged={reload} />
    </Screen>
  );
}

function PayerCard({ slug, clubName, dues: d, open, onToggle, onChanged }: { slug: string; clubName: string; dues: PayerDues; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [reminding, setReminding] = useState(false);
  const selected = d.charges.filter((ch) => !unticked.has(ch.id));
  const amount = selected.reduce((t, ch) => t + ch.amount, 0);

  async function collect(method: PaymentMethod) {
    try {
      await api(`/clubs/${slug}/dues/collect`, { method: 'POST', body: { chargeIds: selected.map((ch) => ch.id), method } });
      toast(`Collected ${formatMoney(amount)} from ${d.name}`);
      onChanged();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not collect.', 'error');
    }
  }

  async function remind() {
    setReminding(true);
    try {
      await api(`/clubs/${slug}/dues/remind`, { method: 'POST', body: { payerKey: d.key } });
      toast(`Reminder sent to ${d.name}`);
      onChanged();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not send the reminder.', 'error');
    } finally {
      setReminding(false);
    }
  }

  const whatsapp = () => {
    const digits = (d.mobile ?? '').replace(/\D/g, '');
    const to = digits.length === 10 ? `91${digits}` : digits;
    const text = `Hi ${d.name.split(' ')[0]}, you have ${formatMoney(d.total)} due at ${clubName} for ${d.charges.length} game${d.charges.length === 1 ? '' : 's'}. Please clear it at the counter. Thanks!`;
    Linking.openURL(`https://wa.me/${to}?text=${encodeURIComponent(text)}`);
  };

  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Headline numberOfLines={1}>
              {d.name}
              {d.playerId ? ' ✓' : ''}
            </Headline>
            <Caption>
              {d.charges.length} game{d.charges.length === 1 ? '' : 's'}
              {d.lastRemindedAt ? ` · reminded ${formatDateTime(d.lastRemindedAt)}` : ''}
            </Caption>
          </View>
          <Headline style={{ color: c.accent }}>{formatMoney(d.total)}</Headline>
          <Icon ios={open ? 'chevron.up' : 'chevron.down'} android={open ? 'expand_less' : 'expand_more'} color={c.textMuted} size={14} />
        </Row>
      </Pressable>
      {open && (
        <View style={{ gap: 10, marginTop: 6 }}>
          {d.charges.map((ch) => {
            const on = !unticked.has(ch.id);
            return (
              <PressableScale
                key={ch.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => setUnticked((s) => {
                  const next = new Set(s);
                  if (next.has(ch.id)) next.delete(ch.id);
                  else next.add(ch.id);
                  return next;
                })}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    {on && <Text style={{ color: c.onPrimary, fontSize: 12, fontWeight: '900' }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={{ color: c.text, fontWeight: '700' }}>{formatDateTime(ch.startedAt)}</Text>
                      <Text style={{ color: c.text, fontWeight: '800' }}>{formatMoney(ch.amount)}</Text>
                    </Row>
                    <Caption>
                      {[ch.tableNumber ? `T${ch.tableNumber}` : null, ch.opponents.length ? `vs ${ch.opponents.join(', ')}` : null, ch.minutes ? formatDuration(ch.minutes) : null, ch.splitMode ? SPLIT[ch.splitMode] : null].filter(Boolean).join(' · ')}
                    </Caption>
                  </View>
                </Row>
              </PressableScale>
            );
          })}
          <Caption style={{ fontWeight: '800', letterSpacing: 1, color: c.text }}>COLLECT {formatMoney(amount)}</Caption>
          <PayButtons onPay={collect} disabled={selected.length === 0} />
          <Row style={{ gap: 8 }}>
            {d.playerId && (
              <View style={{ flex: 1 }}>
                <Button title="🔔 Send reminder" variant="secondary" loading={reminding} onPress={remind} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button title="WhatsApp" variant="ghost" onPress={whatsapp} />
            </View>
          </Row>
        </View>
      )}
    </Card>
  );
}
