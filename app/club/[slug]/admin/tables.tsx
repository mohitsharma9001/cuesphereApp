import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { CloseBillSheet } from '@/components/tables/close-bill-sheet';
import { PayButtons } from '@/components/tables/pay-buttons';
import { StartTableSheet } from '@/components/tables/start-table-sheet';
import { Button, Caption, Card, Chip, Headline, LiveDot, LoadState, PressableScale, Row, Screen, SectionTitle, useConfirm, useToast } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import { formatDateTime, formatDuration, formatElapsed, formatMoney } from '@/lib/format';
import { billFor, type ClubTable, type TableSession, type TablesOverview } from '@/lib/tables';
import { useApi } from '@/lib/use-api';

/** Tables — the front desk (#25): today's money, the tables with live timers,
 * booking requests and everything still to collect. One API call loads it all. */
export default function AdminTables() {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const { slug } = useClub();
  const data = useApi<TablesOverview>(`/clubs/${slug}/table-overview`);
  const [now, setNow] = useState(() => Date.now());
  const [starting, setStarting] = useState<ClubTable | null>(null);
  const [billing, setBilling] = useState<TableSession | null>(null);
  const [pickTable, setPickTable] = useState<Record<string, string | null>>({});
  const [closing, setClosing] = useState<string | null>(null);

  // Timers tick every second; the board refreshes every 20 s (other phones at the desk).
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(data.reload, 20_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [data.reload]);
  useFocusEffect(
    useCallback(() => {
      data.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug])
  );

  const d = data.data;
  if (!d) return <Screen><LoadState loading={data.loading} error={data.error} onRetry={data.refresh} /></Screen>;

  const tables = d.tables.filter((t) => t.active).sort((a, b) => a.tableNumber - b.tableNumber);
  const openByTable = new Map(d.open.map((s) => [s.tableId, s]));
  const requests = d.bookings.filter((b) => b.status === 'requested');
  const later = d.bookings.filter((b) => b.status === 'confirmed');
  const toCollect = d.outstanding.charges.reduce((t, ch) => t + ch.amount, 0) + d.outstanding.unsplit.reduce((t, s) => t + (s.amount ?? 0), 0);
  const tableLabel = (id: string | null) => {
    const t = d.tables.find((x) => x.id === id);
    return t ? t.name || `Table ${t.tableNumber}` : 'Any free table';
  };

  async function closeTable(session: TableSession, table: ClubTable) {
    const running = billFor(session.startedAt, now, session.hourlyRate);
    if (!(await confirm({ title: `Close ${table.name || `Table ${table.tableNumber}`}?`, message: `${formatDuration(running.minutes)} · about ${formatMoney(running.amount)}`, confirmLabel: 'Close & bill' }))) return;
    setClosing(session.id);
    try {
      const stopped = await api<TableSession>(`/clubs/${slug}/table-sessions/${session.id}/stop`, { method: 'POST' });
      await data.reload();
      setBilling(stopped);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not close the table.', 'error');
    } finally {
      setClosing(null);
    }
  }

  async function respond(bookingId: string, accept: boolean, tableId: string | null) {
    try {
      await api(`/clubs/${slug}/bookings/${bookingId}/respond`, { method: 'POST', body: { accept, tableId } });
      toast(accept ? 'Booking confirmed' : 'Booking declined', accept ? 'success' : 'info');
      await data.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update the booking.', 'error');
    }
  }

  async function pay(chargeId: string, method: 'cash' | 'upi' | 'card', who: string, amount: number) {
    try {
      await api(`/clubs/${slug}/table-charges/${chargeId}/pay`, { method: 'POST', body: { method } });
      toast(`${who} paid ${formatMoney(amount)}`);
      await data.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not mark paid.', 'error');
    }
  }

  return (
    <Screen refreshing={data.refreshing} onRefresh={data.refresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Headline style={{ fontSize: 22 }}>Tables</Headline>
        <PressableScale onPress={() => router.push(`/club/${slug}/staff/rates`)}>
          <Caption style={{ color: c.primary, fontWeight: '800' }}>⚙ Tables & rates</Caption>
        </PressableScale>
      </Row>

      <Card onPress={() => router.push(`/club/${slug}/staff/income`)} style={{ gap: 4 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>TODAY&apos;S INCOME</Caption>
          <Caption>Week, month ›</Caption>
        </Row>
        <Text style={{ color: c.text, fontSize: 30, fontWeight: '900' }}>{formatMoney(d.summary.collected)}</Text>
        <Caption>
          Cash {formatMoney(d.summary.byMethod.cash)} · UPI {formatMoney(d.summary.byMethod.upi)} · Card {formatMoney(d.summary.byMethod.card)}
        </Caption>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Tile label="Playing now" value={String(d.open.length)} tint={c.live} />
        <Tile label="Free" value={String(Math.max(0, tables.length - d.open.length))} tint={c.primary} />
        <Tile label="Booked later" value={String(later.length)} tint={c.info} />
        <Tile label="To collect" value={formatMoney(toCollect)} tint={c.accent} onPress={() => router.push(`/club/${slug}/staff/dues`)} />
      </View>

      {requests.length > 0 && (
        <>
          <SectionTitle>Booking requests ({requests.length})</SectionTitle>
          {requests.map((b) => {
            const chosen = pickTable[b.id] !== undefined ? pickTable[b.id] : b.tableId;
            return (
              <Card key={b.id} style={{ borderWidth: 1, borderColor: c.primary }}>
                <Headline>
                  {b.playerName} · {formatDateTime(b.startAt)}
                </Headline>
                <Caption>
                  {formatDuration(b.durationMinutes)} · {tableLabel(b.tableId)}
                  {b.note ? ` · “${b.note}”` : ''}
                </Caption>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {tables.map((t) => (
                    <Chip key={t.id} label={t.name || `T${t.tableNumber}`} selected={chosen === t.id} onPress={() => setPickTable((m) => ({ ...m, [b.id]: t.id }))} />
                  ))}
                </ScrollView>
                <Row style={{ gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button title="Decline" variant="ghost" onPress={() => respond(b.id, false, null)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Confirm" disabled={!chosen} onPress={() => respond(b.id, true, chosen ?? null)} />
                  </View>
                </Row>
              </Card>
            );
          })}
        </>
      )}

      <SectionTitle>Tables</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tables.map((t) => {
          const s = openByTable.get(t.id);
          const running = s ? billFor(s.startedAt, now, s.hourlyRate) : null;
          return (
            <Card key={t.id} style={{ width: '48.4%', padding: 12, gap: 6, borderWidth: s ? 1.5 : 0, borderColor: s ? c.live : 'transparent' }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: c.text, fontWeight: '800' }} numberOfLines={1}>{t.name || `Table ${t.tableNumber}`}</Text>
                {s ? <LiveDot /> : <Caption style={{ color: c.primary, fontWeight: '800', fontSize: 11 }}>FREE</Caption>}
              </Row>
              {s && running ? (
                <>
                  <Caption numberOfLines={1}>{s.playerName || s.players.join(' v ') || 'Walk-in'}</Caption>
                  <Text style={{ color: c.text, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{formatElapsed(s.startedAt, now)}</Text>
                  <Caption>{formatMoney(running.amount)} so far</Caption>
                  <Button title="■ Close & bill" variant="danger" loading={closing === s.id} onPress={() => closeTable(s, t)} />
                </>
              ) : (
                <>
                  <Caption>{formatMoney(t.hourlyRate)}/hr</Caption>
                  <Button title="▶ Start" variant="secondary" onPress={() => setStarting(t)} />
                </>
              )}
            </Card>
          );
        })}
      </View>
      {tables.length === 0 && (
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <Caption>No tables yet. Add your tables and hourly rates to start timing games.</Caption>
          <Button title="Add tables" variant="secondary" onPress={() => router.push(`/club/${slug}/staff/rates`)} />
        </Card>
      )}

      {(d.outstanding.unsplit.length > 0 || d.outstanding.charges.length > 0) && (
        <>
          <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <SectionTitle style={{ marginTop: 0 }}>To collect</SectionTitle>
            <PressableScale onPress={() => router.push(`/club/${slug}/staff/dues`)}>
              <Caption style={{ color: c.primary, fontWeight: '800' }}>Dues by player ›</Caption>
            </PressableScale>
          </Row>
          {d.outstanding.unsplit.map((s) => (
            <Card key={s.id} onPress={() => setBilling(s)} style={{ borderWidth: 1, borderColor: c.warning }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Headline style={{ flex: 1 }} numberOfLines={1}>{s.playerName || s.players.join(' v ') || 'Game'}</Headline>
                <Headline>{formatMoney(s.amount ?? 0)}</Headline>
              </Row>
              <Caption>{tableLabel(s.tableId)} · {formatDuration(s.minutes ?? 0)} · tap to choose who pays</Caption>
            </Card>
          ))}
          {d.outstanding.charges.slice(0, 30).map((ch) => (
            <Card key={ch.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Headline style={{ flex: 1 }} numberOfLines={1}>
                  {ch.payerName}
                  {ch.payerPlayerId ? ' ✓' : ''}
                </Headline>
                <Headline>{formatMoney(ch.amount)}</Headline>
              </Row>
              <Caption>
                {[ch.tableNumber ? `T${ch.tableNumber}` : null, ch.opponents.length ? `vs ${ch.opponents.join(', ')}` : null, formatDateTime(ch.startedAt)].filter(Boolean).join(' · ')}
              </Caption>
              <PayButtons onPay={(m) => pay(ch.id, m, ch.payerName, ch.amount)} />
            </Card>
          ))}
          {d.outstanding.charges.length > 30 && (
            <Button title={`See all ${d.outstanding.charges.length} in Dues by player`} variant="ghost" onPress={() => router.push(`/club/${slug}/staff/dues`)} />
          )}
        </>
      )}

      <StartTableSheet slug={slug} table={starting} onClose={() => setStarting(null)} onStarted={data.reload} />
      <CloseBillSheet slug={slug} session={billing} onClose={() => setBilling(null)} onChanged={data.reload} />
    </Screen>
  );
}

function Tile({ label, value, tint, onPress }: { label: string; value: string; tint: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={{ width: '48.4%', padding: 12, gap: 2 }}>
      <Caption style={{ fontWeight: '800', color: tint, letterSpacing: 0.6 }}>{label.toUpperCase()} {onPress ? '›' : ''}</Caption>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: '900' }}>{value}</Text>
    </Card>
  );
}

