import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Body, Button, Caption, Card, Chip, DateField, Headline, LoadState, Row, Screen, SectionTitle } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { formatDateTime, formatDuration, formatMoney, istTodayYmd } from '@/lib/format';
import { rangeBounds, RANGES, type RangeKey } from '@/lib/income';
import { METHOD_LABEL, type OutstandingCharge, type PaymentMethod } from '@/lib/tables';
import { useApi } from '@/lib/use-api';

interface IncomeReport {
  collected: number;
  byMethod: Record<PaymentMethod, number>;
  days: { date: string; amount: number }[];
  payments: (OutstandingCharge & { paidAt: string; paymentMethod: PaymentMethod })[];
  sessions: number;
  minutes: number;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SPLIT: Record<string, string> = { loser: 'lost', split: 'split', custom: 'custom' };

/** Income Report (#29). */
export default function IncomeReportScreen() {
  const { c } = useTheme();
  const { slug } = useClub();
  const [now] = useState(() => Date.now());
  const [range, setRange] = useState<RangeKey>('week');
  const [from, setFrom] = useState(istTodayYmd(now - 6 * 86_400_000));
  const [to, setTo] = useState(istTodayYmd(now));
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);

  const bounds = rangeBounds(range, now, custom?.from, custom?.to);
  const ok = 'from' in bounds;
  const report = useApi<IncomeReport>(ok ? `/clubs/${slug}/reports/income?from=${bounds.from.toISOString()}&to=${bounds.to.toISOString()}` : null);
  const r = report.data;
  const maxDay = Math.max(1, ...(r?.days.map((d) => d.amount) ?? [1]));

  return (
    <Screen refreshing={report.refreshing} onRefresh={report.refresh}>
      <Stack.Screen options={{ title: 'Income' }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {RANGES.map(([key, label]) => (
          <Chip key={key} label={label} selected={range === key} onPress={() => setRange(key)} />
        ))}
        <Chip label="Custom" selected={range === 'custom'} onPress={() => setRange('custom')} />
      </ScrollView>
      {range === 'custom' && (
        <Card style={{ gap: 10 }}>
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1 }}>
              <DateField label="From" value={from} onChange={setFrom} maximumDate={new Date(now)} />
            </View>
            <View style={{ flex: 1 }}>
              <DateField label="To" value={to} onChange={setTo} maximumDate={new Date(now)} />
            </View>
          </Row>
          <Button title="Show" variant="secondary" onPress={() => setCustom({ from, to })} />
          {!ok && custom && <Body style={{ color: c.danger }}>{bounds.error}</Body>}
        </Card>
      )}

      <LoadState loading={report.loading} error={report.error} onRetry={report.refresh} />
      {ok && r && (
        <>
          <Card style={{ gap: 4 }}>
            <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>{bounds.label.toUpperCase()}</Caption>
            <Text style={{ color: c.text, fontSize: 32, fontWeight: '900' }}>{formatMoney(r.collected)}</Text>
            <Caption>
              Cash {formatMoney(r.byMethod.cash)} · UPI {formatMoney(r.byMethod.upi)} · Card {formatMoney(r.byMethod.card)}
            </Caption>
            <Caption>
              {r.sessions} session{r.sessions === 1 ? '' : 's'} · {formatDuration(r.minutes) || '0 min'}
            </Caption>
          </Card>

          {r.days.length > 1 && (
            <>
              <SectionTitle>By day</SectionTitle>
              <Card style={{ gap: 8 }}>
                {r.days.map((d) => {
                  const date = new Date(`${d.date}T12:00:00Z`);
                  return (
                    <Row key={d.date} style={{ gap: 10 }}>
                      <Caption style={{ width: 54 }}>
                        {WEEKDAY[date.getUTCDay()]} {date.getUTCDate()}
                      </Caption>
                      <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
                        <View style={{ width: `${(d.amount / maxDay) * 100}%`, height: '100%', borderRadius: 7, backgroundColor: c.primary }} />
                      </View>
                      <Text style={{ color: c.text, fontWeight: '700', width: 76, textAlign: 'right' }}>{formatMoney(d.amount)}</Text>
                    </Row>
                  );
                })}
              </Card>
            </>
          )}

          <SectionTitle>Payments ({r.payments.length})</SectionTitle>
          {r.payments.length === 0 && <Caption>No payments in this range.</Caption>}
          {r.payments.slice(0, 100).map((p) => (
            <Card key={p.id} style={{ gap: 2 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Headline style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>
                  {[p.payerName, p.tableNumber ? `T${p.tableNumber}` : null, p.opponents.length ? `vs ${p.opponents.join(', ')}` : null, p.splitMode ? SPLIT[p.splitMode] : null].filter(Boolean).join(' · ')}
                </Headline>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Caption>Paid {formatDateTime(p.paidAt)}</Caption>
                <Text style={{ color: c.text, fontWeight: '800' }}>
                  {formatMoney(p.amount)} <Text style={{ color: c.textMuted, fontWeight: '600' }}>{METHOD_LABEL[p.paymentMethod]}</Text>
                </Text>
              </Row>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
