import { Stack, router } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Caption, Card, Headline, LoadState, Row, Screen, SectionTitle } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { formatDateTime, formatDuration, formatMoney } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useApi } from '@/lib/use-api';

interface Charge {
  id: string;
  amount: number;
  splitMode: 'loser' | 'split' | 'custom' | null;
  paymentMethod: 'cash' | 'upi' | 'card' | null;
  paidAt: string | null;
  tableNumber: number | null;
  opponents: string[];
  minutes: number;
  startedAt: string;
}

const SPLIT: Record<string, string> = { loser: 'lost', split: 'split', custom: 'your share' };
const METHOD: Record<string, string> = { cash: 'Cash', upi: 'UPI', card: 'Card' };

/** My Dues (#22): what you owe at this club, game by game, and the last 90 days paid. Only your own. */
export default function MyDues() {
  const { c } = useTheme();
  const { me } = useSession();
  const { slug, club } = useClub();
  const dues = useApi<{ due: Charge[]; paid: Charge[] }>(me ? `/clubs/${slug}/my/dues` : null);

  if (!me) {
    return (
      <Screen>
        <LoadState empty="Log in to see your dues." />
        <Button title="Log in" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  const due = dues.data?.due ?? [];
  const paid = dues.data?.paid ?? [];
  const total = due.reduce((sum, d) => sum + d.amount, 0);
  const game = (d: Charge) =>
    [d.tableNumber ? `Table ${d.tableNumber}` : null, d.opponents.length ? `vs ${d.opponents.join(', ')}` : null, d.minutes ? formatDuration(d.minutes) : null, d.splitMode ? SPLIT[d.splitMode] : null]
      .filter(Boolean)
      .join(' · ');

  return (
    <Screen refreshing={dues.refreshing} onRefresh={dues.refresh}>
      <Stack.Screen options={{ title: 'My dues' }} />
      <Caption style={{ fontWeight: '800', letterSpacing: 1.2 }}>{club?.name.toUpperCase()}</Caption>
      <LoadState loading={dues.loading} error={dues.error} onRetry={dues.refresh} />

      {dues.data && (
        <View>
          <Card style={total ? { backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accent } : { backgroundColor: c.primarySoft }}>
            <Caption style={{ color: total ? c.accent : c.primary, fontWeight: '800', letterSpacing: 1 }}>{total ? 'YOU OWE' : 'ALL PAID UP'}</Caption>
            <Text style={{ color: c.text, fontSize: 32, fontWeight: '900' }}>{formatMoney(total)}</Text>
            <Caption>{total ? `For ${due.length} game${due.length === 1 ? '' : 's'}. Pay at the counter.` : 'Nothing to pay here. Enjoy your next game!'}</Caption>
          </Card>
        </View>
      )}

      {due.length > 0 && (
        <>
          <SectionTitle>Due</SectionTitle>
          {due.map((d) => (
            <Card key={d.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Headline style={{ flex: 1 }}>{formatDateTime(d.startedAt)}</Headline>
                <Headline style={{ color: c.accent }}>{formatMoney(d.amount)}</Headline>
              </Row>
              <Caption>{game(d)}</Caption>
            </Card>
          ))}
        </>
      )}

      {paid.length > 0 && (
        <>
          <SectionTitle>Paid (last 90 days)</SectionTitle>
          {paid.map((d) => (
            <Card key={d.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ flex: 1, gap: 6 }}>
                  <Icon ios="checkmark.circle.fill" android="check_circle" color={c.success} size={16} />
                  <Text style={{ color: c.text, fontWeight: '700' }}>{formatDateTime(d.paidAt ?? d.startedAt)}</Text>
                </Row>
                <Text style={{ color: c.text, fontWeight: '800' }}>
                  {formatMoney(d.amount)}
                  {d.paymentMethod ? <Text style={{ color: c.textMuted, fontWeight: '600' }}> · {METHOD[d.paymentMethod]}</Text> : null}
                </Text>
              </Row>
              <Caption>{game(d)}</Caption>
            </Card>
          ))}
        </>
      )}
      {dues.data && due.length === 0 && paid.length === 0 && <Caption style={{ textAlign: 'center' }}>No games billed to you here yet.</Caption>}
      <View style={{ height: 4 }} />
      <Caption style={{ textAlign: 'center' }}>Only you can see your dues.</Caption>
    </Screen>
  );
}
