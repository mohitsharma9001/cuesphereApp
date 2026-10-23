import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';

import { TablesNow, type PublicTableStatus } from '@/components/club/tables-now';
import { Icon } from '@/components/icon';
import { Avatar, Button, Caption, Card, GradientHero, Headline, LiveDot, LoadState, PressableScale, RemoteImage, Row, Screen, SectionTitle, StatusPill, tapHaptic, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth-gate';
import { useClub } from '@/lib/club-context';
import { formatDateRange, formatMoney } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Match, Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Club Home (#16). */
export default function ClubHome() {
  const { c } = useTheme();
  const { me, reload: reloadMe } = useSession();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const { slug, club, loading, error, isMember, reload } = useClub();
  const tables = useApi<PublicTableStatus[]>(`/clubs/${slug}/table-status`);
  const due = useApi<{ total: number }>(me ? `/clubs/${slug}/my/dues/total` : null);
  const tournaments = useApi<Tournament[]>(`/clubs/${slug}/tournaments`);
  const live = useApi<Match | null>(`/clubs/${slug}/matches/live`);

  useFocusEffect(
    useCallback(() => {
      tables.reload();
      live.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug])
  );

  const join = () =>
    requireAuth('to join this club', async () => {
      try {
        await api(`/clubs/${slug}/join`, { method: 'POST' });
        tapHaptic('success');
        toast(`Welcome to ${club?.name ?? 'the club'}!`);
        await Promise.all([reloadMe(), reload()]);
      } catch (e) {
        toast(e instanceof ApiError ? e.message : 'Could not join the club.', 'error');
      }
    });

  const refresh = () => Promise.all([reload(), tables.reload(), due.reload(), tournaments.refresh(), live.reload()]);
  const upcoming = (tournaments.data ?? []).filter((t) => t.status === 'upcoming').slice(0, 3);

  if (!club) return <Screen><LoadState loading={loading} error={error} onRetry={reload} empty={!loading && 'Club not found.'} /></Screen>;

  return (
    <Screen refreshing={tournaments.refreshing} onRefresh={refresh}>
      {!!due.data?.total && (
        <View>
          <Card onPress={() => router.push(`/club/${slug}/dues`)} style={{ backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accent }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Caption style={{ color: c.accent, fontWeight: '800', letterSpacing: 1 }}>₹ YOU OWE HERE</Caption>
                <Text style={{ color: c.text, fontSize: 24, fontWeight: '900' }}>{formatMoney(due.data.total)}</Text>
              </View>
              <Caption style={{ color: c.accent, fontWeight: '800' }}>Details ›</Caption>
            </Row>
          </Card>
        </View>
      )}

      <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
        {club.heroBannerUrl ? <RemoteImage uri={club.heroBannerUrl} style={{ width: '100%', height: 150 }} /> : null}
        <GradientHero style={{ borderRadius: club.heroBannerUrl ? 0 : radius.lg }}>
          <Row>
            <Avatar name={club.name} uri={club.logoUrl || null} size={54} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>WELCOME TO</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }} numberOfLines={2}>{club.name}</Text>
              {!!club.tagline && <Text style={{ color: 'rgba(255,255,255,0.85)' }} numberOfLines={1}>{club.tagline}</Text>}
            </View>
          </Row>
          <Row style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <PressableScale onPress={() => router.navigate(`/club/${slug}/tournaments`)} style={{ backgroundColor: '#D4AF37', borderRadius: radius.pill, paddingHorizontal: 16, height: 40, justifyContent: 'center' }}>
              <Text style={{ color: '#0B0E12', fontWeight: '800' }}>Browse Tournaments</Text>
            </PressableScale>
            {isMember ? (
              <Row style={{ gap: 4, borderRadius: radius.pill, paddingHorizontal: 12, height: 40, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>✓ Member</Text>
              </Row>
            ) : (
              <PressableScale onPress={join} style={{ borderRadius: radius.pill, paddingHorizontal: 16, height: 40, justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Join this club</Text>
              </PressableScale>
            )}
          </Row>
        </GradientHero>
      </View>

      {tables.data && <TablesNow slug={slug} tables={tables.data} />}

      <Row style={{ gap: 10 }}>
        <Card onPress={() => router.navigate(`/club/${slug}/tournaments`)} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 20 }}>🏆</Text>
          <Headline>{club.tournamentCount ?? '–'}</Headline>
          <Caption>Tournaments</Caption>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 20 }}>👥</Text>
          <Headline>{club.memberCount ?? '–'}</Headline>
          <Caption>Members</Caption>
        </Card>
      </Row>

      {live.data && (
        <Card onPress={() => router.push(`/match/${live.data!.id}`)} style={{ borderWidth: 1, borderColor: c.accentSoft }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <LiveDot />
              <Caption style={{ color: c.live, fontWeight: '800' }}>LIVE · TABLE {live.data.tableNumber}</Caption>
            </Row>
            <Caption>Watch ›</Caption>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Headline style={{ flex: 1 }} numberOfLines={1}>{live.data.player1Name}</Headline>
            <Headline style={{ color: c.primary }}>
              {live.data.framesWonPlayer1} – {live.data.framesWonPlayer2}
            </Headline>
            <Headline style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>{live.data.player2Name}</Headline>
          </Row>
        </Card>
      )}

      <SectionTitle>Upcoming tournaments</SectionTitle>
      {upcoming.length === 0 ? (
        <Caption>No upcoming tournaments right now.</Caption>
      ) : (
        upcoming.map((t) => (
          <Card key={t.id} onPress={() => router.push(`/tournament/${slug}/${t.slug}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Headline style={{ flex: 1 }} numberOfLines={1}>{t.name}</Headline>
              <StatusPill status={t.status} />
            </Row>
            <Caption>{[formatDateRange(t.startDate, t.endDate), `Bo${t.bestOf}`, t.entryFee && `Entry ${t.entryFee}`].filter(Boolean).join(' · ')}</Caption>
            <Caption>
              {t.registeredCount ?? 0}/{t.maxPlayers} registered
            </Caption>
          </Card>
        ))
      )}
      {!!club.address && (
        <Row style={{ gap: 6, marginTop: 6 }}>
          <Icon ios="mappin.and.ellipse" android="place" color={c.textMuted} size={14} />
          <Caption style={{ flex: 1 }}>{club.address}</Caption>
        </Row>
      )}
      {!me && <Button title="Log in to book tables and enter tournaments" variant="ghost" onPress={() => router.push('/sign-in')} />}
    </Screen>
  );
}
