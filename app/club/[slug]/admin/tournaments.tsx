import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text } from 'react-native';

import { Button, Caption, Card, Headline, LoadState, Row, Screen, StatusPill } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { formatDateRange, formatMoney, parseRupees } from '@/lib/format';
import type { Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface StaffRegistration {
  tournamentId: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: string;
}

/** Tournaments (admin) list (#31). */
export default function AdminTournaments() {
  const { c } = useTheme();
  const { slug } = useClub();
  const list = useApi<Tournament[]>(`/clubs/${slug}/tournaments`);
  const regs = useApi<StaffRegistration[]>(`/clubs/${slug}/registrations`);
  useFocusEffect(
    useCallback(() => {
      list.reload();
      regs.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug])
  );

  const paid = (id: string) => (regs.data ?? []).filter((r) => r.tournamentId === id && r.paymentStatus === 'paid' && r.status !== 'cancelled').length;

  return (
    <Screen refreshing={list.refreshing} onRefresh={() => Promise.all([list.refresh(), regs.reload()])}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Headline style={{ fontSize: 22 }}>Tournaments</Headline>
        <Button title="+ New" onPress={() => router.push(`/club/${slug}/staff/tournament-new`)} />
      </Row>
      <LoadState loading={list.loading} error={list.error} onRetry={list.refresh} empty={list.data?.length === 0 && 'No tournaments yet — create your first one.'} />
      {list.data?.map((t) => (
        <Card key={t.id} onPress={() => router.push(`/club/${slug}/staff/tournament/${t.slug}`)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Headline style={{ flex: 1 }} numberOfLines={1}>{t.name}</Headline>
            <StatusPill status={t.status} />
          </Row>
          <Caption>{[formatDateRange(t.startDate, t.endDate), `Bo${t.bestOf}`, t.format].filter(Boolean).join(' · ')}</Caption>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: c.text, fontWeight: '700' }}>
              {t.registeredCount ?? 0}/{t.maxPlayers}
              <Text style={{ color: c.textMuted, fontWeight: '500' }}> · {formatMoney(paid(t.id) * parseRupees(t.entryFee))} collected</Text>
            </Text>
            {t.status === 'upcoming' && <Caption style={{ color: t.registrationOpen ? c.success : c.textMuted, fontWeight: '800' }}>{t.registrationOpen ? 'OPEN' : 'CLOSED'}</Caption>}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
