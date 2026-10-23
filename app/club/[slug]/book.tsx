import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Body, Button, Caption, Card, Chip, DateField, Field, Headline, LoadState, Row, Screen, SectionTitle, useConfirm, useToast } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import { formatDateTime, formatDuration, formatMoney, istMinutesNow, istTodayYmd } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useApi } from '@/lib/use-api';

interface ClubTable {
  id: string;
  tableNumber: number;
  name: string;
  hourlyRate: number;
}
interface Booking {
  id: string;
  tableId: string | null;
  startAt: string;
  durationMinutes: number;
  status: 'requested' | 'confirmed' | 'rejected' | 'cancelled' | 'started' | 'no_show';
  note: string;
}

const DURATIONS: [number, string][] = [
  [30, '30m'],
  [60, '1 hr'],
  [90, '1.5 h'],
  [120, '2 hr'],
  [180, '3 hr'],
];
const OPEN_FROM = 9 * 60; // 9:00
const OPEN_UNTIL = 23 * 60 + 30; // last start 23:30
const STATUS: Record<Booking['status'], { label: string; tone: 'info' | 'success' | 'muted' | 'danger' }> = {
  requested: { label: 'Waiting…', tone: 'info' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  started: { label: 'Playing', tone: 'success' },
  rejected: { label: 'Not available', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  no_show: { label: 'No-show', tone: 'muted' },
};

const hhmm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const label12 = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
};

/** Book a Table (#21). Times are India time, like the club's own clock. */
export default function BookTable() {
  const { c } = useTheme();
  const { me } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const { slug, club } = useClub();
  const tables = useApi<ClubTable[]>(`/clubs/${slug}/tables`);
  const mine = useApi<Booking[]>(me ? `/clubs/${slug}/my/bookings` : null);

  // "Now" is state, refreshed every minute, so the slot list stays current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const today = istTodayYmd(now);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(60);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Book a table' }} />
        <LoadState empty={`Log in to book a table at ${club?.name ?? 'this club'}.`} />
        <Button title="Log in" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  // Half-hour slots; today only the ones still ahead (with 15 minutes to get there).
  const earliest = date === today ? Math.ceil((istMinutesNow(now) + 15) / 30) * 30 : OPEN_FROM;
  const slots: number[] = [];
  for (let m = Math.max(OPEN_FROM, earliest); m <= OPEN_UNTIL; m += 30) slots.push(m);
  const pickedTime = time !== null && slots.includes(time) ? time : null;

  const list = tables.data ?? [];
  const rate = tableNumber ? list.find((t) => t.tableNumber === tableNumber)?.hourlyRate : Math.min(...list.map((t) => t.hourlyRate).filter((r) => r > 0));
  const estimate = rate && Number.isFinite(rate) ? Math.round((rate * duration) / 60) : null;
  const tableName = (id: string | null) => {
    const t = list.find((x) => x.id === id);
    return t ? t.name || `Table ${t.tableNumber}` : 'Any free table';
  };

  const maxDate = new Date(now + 29 * 86_400_000);

  async function request() {
    if (pickedTime === null) return setError('Choose a time.');
    setBusy(true);
    setError(null);
    try {
      await api(`/clubs/${slug}/bookings`, { method: 'POST', body: { date, time: hhmm(pickedTime), durationMinutes: duration, tableNumber, note: note.trim() } });
      toast('Booking requested — the club will confirm');
      setTime(null);
      setNote('');
      await mine.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not request the booking.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(b: Booking) {
    if (!(await confirm({ title: 'Cancel this booking?', message: formatDateTime(b.startAt), confirmLabel: 'Cancel booking', destructive: true }))) return;
    try {
      await api(`/clubs/${slug}/bookings/${b.id}/cancel`, { method: 'POST' });
      toast('Booking cancelled', 'info');
      await mine.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not cancel.', 'error');
    }
  }

  const upcoming = (mine.data ?? []).filter((b) => Date.parse(b.startAt) + b.durationMinutes * 60_000 > now || b.status === 'requested');

  return (
    <Screen refreshing={mine.refreshing} onRefresh={() => Promise.all([mine.refresh(), tables.reload()])}>
      <Stack.Screen options={{ title: 'Book a table' }} />
      <Caption style={{ fontWeight: '800', letterSpacing: 1.2 }}>{club?.name.toUpperCase()}</Caption>

      <DateField label="Date" value={date} onChange={(d) => { setDate(d); setTime(null); }} minimumDate={new Date(now)} maximumDate={maxDate} />

      <SectionTitle style={{ marginTop: 4 }}>Time (India)</SectionTitle>
      {slots.length === 0 ? (
        <Caption>No more slots today — pick another date.</Caption>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {slots.map((m) => (
            <Chip key={m} label={label12(m)} selected={pickedTime === m} onPress={() => setTime(m)} />
          ))}
        </ScrollView>
      )}

      <SectionTitle style={{ marginTop: 4 }}>How long</SectionTitle>
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        {DURATIONS.map(([mins, text]) => (
          <Chip key={mins} label={text} selected={duration === mins} onPress={() => setDuration(mins)} />
        ))}
      </Row>

      <SectionTitle style={{ marginTop: 4 }}>Table</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="Any free table" selected={tableNumber === null} onPress={() => setTableNumber(null)} />
        {list.map((t) => (
          <Chip key={t.id} label={`${t.name || `Table ${t.tableNumber}`} · ${formatMoney(t.hourlyRate)}/hr`} selected={tableNumber === t.tableNumber} onPress={() => setTableNumber(t.tableNumber)} />
        ))}
      </ScrollView>

      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. 4 of us, doubles" maxLength={200} />

      {estimate !== null && (
        <Card style={{ backgroundColor: c.primarySoft }}>
          <Headline style={{ color: c.primary }}>
            About {formatMoney(estimate)} <Text style={{ fontWeight: '500', fontSize: 14 }}>at {formatMoney(rate!)}/hr for {formatDuration(duration)}</Text>
          </Headline>
          <Caption>Billed by the minute at the club.</Caption>
        </Card>
      )}

      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="📅 Request booking" onPress={request} loading={busy} disabled={pickedTime === null} />

      <SectionTitle>Your bookings</SectionTitle>
      <LoadState loading={mine.loading} error={mine.error} onRetry={mine.refresh} empty={mine.data && upcoming.length === 0 && 'No upcoming bookings.'} />
      {upcoming.map((b) => {
        const s = STATUS[b.status];
        const tone = { info: c.info, success: c.success, muted: c.textMuted, danger: c.danger }[s.tone];
        const cancellable = b.status === 'requested' || b.status === 'confirmed';
        return (
          <Card key={b.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Headline style={{ flex: 1 }}>{formatDateTime(b.startAt)}</Headline>
              <View style={{ backgroundColor: `${tone}22`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: tone, fontWeight: '800', fontSize: 12 }}>{s.label}</Text>
              </View>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Caption>
                {formatDuration(b.durationMinutes)} · {tableName(b.tableId)}
                {b.note ? ` · ${b.note}` : ''}
              </Caption>
              {cancellable && (
                <Text onPress={() => cancel(b)} style={{ color: c.danger, fontWeight: '800' }}>
                  Cancel
                </Text>
              )}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
