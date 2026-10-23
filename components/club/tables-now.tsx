import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Caption, Card, Headline, LiveDot, Row } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { formatMoney, formatTime } from '@/lib/format';

export interface PublicTableStatus {
  tableNumber: number;
  name: string;
  hourlyRate: number;
  state: 'busy' | 'free';
  busySince: string | null;
  reservedAt: string | null;
}

/** "Tables right now": free/playing/booked at a glance, timers ticking. */
export function TablesNow({ slug, tables }: { slug: string; tables: PublicTableStatus[] }) {
  const { c } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (tables.length === 0) return null;

  const free = tables.filter((t) => t.state === 'free').length;
  const minRate = Math.min(...tables.map((t) => t.hourlyRate).filter((r) => r > 0));

  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>TABLES RIGHT NOW</Caption>
          <Headline>
            {free} of {tables.length} free{Number.isFinite(minRate) ? ` · From ${formatMoney(minRate)}/hr` : ''}
          </Headline>
        </View>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {tables.map((t) => {
          const busy = t.state === 'busy';
          const minutes = busy && t.busySince ? Math.max(0, Math.floor((now - Date.parse(t.busySince)) / 60_000)) : 0;
          return (
            <View
              key={t.tableNumber}
              style={{
                width: '31.5%',
                borderRadius: radius.md,
                padding: 10,
                gap: 3,
                backgroundColor: busy ? c.accentSoft : c.primarySoft,
              }}>
              <Text style={{ color: c.text, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
                {t.name || `Table ${t.tableNumber}`}
              </Text>
              <Row style={{ gap: 5 }}>
                {busy && <LiveDot size={6} />}
                <Text style={{ color: busy ? c.live : c.primary, fontWeight: '800', fontSize: 12 }}>{busy ? 'Playing' : 'Free'}</Text>
              </Row>
              <Caption style={{ fontSize: 11 }} numberOfLines={1}>
                {busy ? `${minutes} min` : t.reservedAt ? `Bkd ${formatTime(t.reservedAt)}` : ' '}
              </Caption>
            </View>
          );
        })}
      </View>
      <Button title="📅 Book a table" variant="secondary" onPress={() => router.push(`/club/${slug}/book`)} />
    </Card>
  );
}
