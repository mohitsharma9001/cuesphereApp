import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClubList, ClubRow } from '@/components/browse/club-row';
import type { ClubWithCounts } from '@/components/club-card';
import { LiveMatchCard } from '@/components/home/live-match-card';
import { OwnClubCard } from '@/components/home/own-club-card';
import { RegisterSheet } from '@/components/tournament/register-sheet';
import { TournamentCard } from '@/components/tournament/tournament-card';
import { Icon } from '@/components/icon';
import { Avatar, Caption, Card, GradientHero, Headline, LiveDot, LoadState, PressableScale, Row, Screen, SectionTitle, Title } from '@/components/ui';
import { balls, radius, useTheme } from '@/constants/theme';
import { useClubEnquiry } from '@/lib/club-enquiry';
import { istMinutesNow } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { City, FriendlyStats, IndianState, Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useWatchedPlayers } from '@/lib/use-watched-players';

/** Home (#1): greeting, your game at a glance, quick actions, who's live, your clubs and
 * open tournaments at clubs you haven't joined. */
export default function HomeScreen() {
  const { me, reload: reloadMe } = useSession();
  const focused = useIsFocused(); // white status bar over the dark app bar while Home shows
  const watched = useWatchedPlayers();
  const profileId = me?.profile?.id;
  const stats = useApi<FriendlyStats>(profileId ? `/friendlies/players/${profileId}/stats` : null);
  const clubIds = me?.memberships.map((m) => m.clubId) ?? [];
  const myClubs = useApi<ClubWithCounts[]>(clubIds.length ? `/clubs?ids=${clubIds.join(',')}&include=counts` : null);
  const ownClub = useClubEnquiry(!!me);
  const states = useApi<IndianState[]>(clubIds.length ? '/locations/states' : null);
  const cities = useApi<City[]>(clubIds.length ? '/locations/cities' : null);
  // Upcoming tournaments everywhere; Home shows the open ones at clubs you're not in.
  const upcoming = useApi<Tournament[]>(me ? '/tournaments?status=upcoming&limit=30' : null);
  const [registering, setRegistering] = useState<Tournament | null>(null);
  const clubWentLive = ownClub.data?.stage === 'club_live' && !me?.ownedClubs.length;
  useEffect(() => {
    if (clubWentLive) reloadMe(); // the session then has ownedClubs → owner mode
  }, [clubWentLive, reloadMe]);

  // Coming back to Home shows fresh scores and stats without a spinner.
  useFocusEffect(
    useCallback(() => {
      if (me) {
        watched.reloadMatches();
        stats.reload();
        upcoming.reload();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [me])
  );

  if (!me) return null; // Home only exists signed in (see app/_layout.tsx)

  const refresh = () => Promise.all([reloadMe(), watched.reload(), myClubs.refresh(), ownClub.reload(), stats.reload(), upcoming.reload()]);
  const firstName = me.profile?.fullName?.split(' ')[0] || 'Player';
  const stage = ownClub.data?.stage;
  const memberOf = new Set(clubIds);
  const toJoin = (upcoming.data ?? []).filter((t) => !memberOf.has(t.clubId) && t.registrationOpen && !t.isRegistered).slice(0, 5);
  const placeOf = (club: ClubWithCounts) =>
    [cities.data?.find((ci) => ci.id === club.cityId)?.name, states.data?.find((st) => st.code === club.stateCode)?.name].filter(Boolean).join(', ');

  return (
    <Screen refreshing={myClubs.refreshing} onRefresh={refresh}>
      {focused && <StatusBar style="light" />}
      <PressableScale onPress={() => router.navigate('/me')} accessibilityRole="button" accessibilityLabel="My profile">
        <Row style={{ gap: 12 }}>
          <Avatar name={me.profile?.fullName || me.user.email} uri={me.profile?.profilePhotoUrl || null} size={48} />
          <View style={{ flex: 1 }}>
            <Caption>{greeting()},</Caption>
            <Title numberOfLines={1}>{firstName}</Title>
          </View>
        </Row>
      </PressableScale>

      <GameCard stats={stats.data} />

      <Row style={{ gap: 10 }}>
        <QuickAction icon={['bolt.fill', 'bolt']} tint="accent" label="Challenge" onPress={() => router.push('/challenge')} />
        <QuickAction icon={['building.2.fill', 'store']} tint="primary" label="Clubs" onPress={() => router.navigate('/clubs')} />
        <QuickAction icon={['chart.bar.fill', 'leaderboard']} tint="info" label="Rankings" onPress={() => router.navigate('/rankings')} />
        <QuickAction icon={['magnifyingglass', 'person_search']} tint="warning" label="Players" onPress={() => router.push('/players')} />
      </Row>

      {/* A club request in progress needs attention, so it sits high up. */}
      {stage && stage !== 'none' && <OwnClubCard status={ownClub.data} />}

      <LiveStrip watched={watched} />

      {clubIds.length > 0 && (
        <View style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <SectionTitle style={{ marginTop: 0 }}>Your clubs</SectionTitle>
            <PressableScale onPress={() => router.navigate('/clubs')}>
              <Caption style={{ fontWeight: '700' }}>All clubs ›</Caption>
            </PressableScale>
          </Row>
          <LoadState loading={myClubs.loading} error={myClubs.error} onRetry={myClubs.refresh} />
          {!!myClubs.data?.length && (
            <ClubList>
              {myClubs.data.map((club, i) => (
                <ClubRow key={club.id} club={club} place={placeOf(club)} member onPress={() => router.push(`/club/${club.slug}`)} last={i === myClubs.data!.length - 1} />
              ))}
            </ClubList>
          )}
        </View>
      )}

      {toJoin.length > 0 && (
        <View style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <SectionTitle style={{ marginTop: 0 }}>Tournaments you can join</SectionTitle>
            <PressableScale onPress={() => router.push('/browse/tournaments')}>
              <Caption style={{ fontWeight: '700' }}>See all ›</Caption>
            </PressableScale>
          </Row>
          <Caption style={{ marginTop: -6 }}>Open for registration at clubs you&apos;re not part of yet.</Caption>
          {toJoin.map((t) => (
            <TournamentCard key={t.id} tournament={t} onRegister={setRegistering} />
          ))}
        </View>
      )}

      {stage === 'none' && <OwnClubPromo />}

      {registering?.club && (
        <RegisterSheet
          tournament={registering}
          clubSlug={registering.club.slug}
          visible
          onClose={() => setRegistering(null)}
          onRegistered={() => upcoming.reload()}
        />
      )}
    </Screen>
  );
}

function greeting() {
  const hour = Math.floor(istMinutesNow() / 60);
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** Your friendlies at a glance; taps through to Play. */
function GameCard({ stats }: { stats: FriendlyStats | undefined }) {
  const played = stats?.matchesPlayed ?? 0;
  const winRate = played ? Math.round(((stats?.wins ?? 0) / played) * 100) : 0;
  const form = stats?.recentForm?.slice(-5) ?? [];
  return (
    <PressableScale onPress={() => router.navigate('/play')} accessibilityRole="button" accessibilityLabel="Your game">
      <GradientHero style={{ paddingVertical: 20, gap: 14 }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -20, top: -20 }}>
          <Ball color={balls.red} size={80} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', right: 52, top: 30 }}>
          <Ball color={balls.yellow} size={24} />
        </View>
        <Text style={styles.overline}>YOUR GAME</Text>
        <Row style={{ gap: 4 }}>
          <Stat value={played} label="Played" />
          <Stat value={stats?.wins ?? 0} label="Won" />
          <Stat value={`${winRate}%`} label="Win rate" />
          <Stat value={stats?.highestBreak ?? 0} label="Best break" />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          {form.length ? (
            <Row style={{ gap: 6 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' }}>Form</Text>
              {form.map((r, i) => (
                <View key={i} style={[styles.form, { backgroundColor: r === 'W' ? '#D4AF37' : 'rgba(255,255,255,0.14)' }]}>
                  <Text style={{ color: r === 'W' ? '#0B0E12' : '#FFFFFF', fontSize: 11, fontWeight: '900' }}>{r}</Text>
                </View>
              ))}
            </Row>
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Play a friendly to start your record</Text>
          )}
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Play ›</Text>
        </Row>
      </GradientHero>
    </PressableScale>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: '#D4AF37', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, tint, label, onPress }: { icon: [string, string]; tint: 'primary' | 'accent' | 'info' | 'warning'; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={[styles.action, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.actionIcon, { backgroundColor: `${c[tint]}1F` }]}>
        <Icon ios={icon[0]} android={icon[1]} size={20} color={c[tint]} />
      </View>
      <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </PressableScale>
  );
}

/** Glossy ball: a coloured circle with a soft highlight. */
function Ball({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.9 }}>
      <View style={{ position: 'absolute', top: size * 0.16, left: size * 0.2, width: size * 0.3, height: size * 0.22, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.45)' }} />
    </View>
  );
}

function LiveStrip({ watched }: { watched: ReturnType<typeof useWatchedPlayers> }) {
  const { c } = useTheme();
  const matches = [...watched.live, ...watched.upcoming];
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ marginTop: 8 }}>
        {watched.live.length > 0 && <LiveDot />}
        <SectionTitle style={{ marginTop: 0 }}>{watched.live.length > 0 ? `Live now (${watched.live.length})` : 'Live now'}</SectionTitle>
      </Row>
      {watched.loading && matches.length === 0 ? (
        <LoadState loading />
      ) : matches.length === 0 ? (
        <Card onPress={() => router.push('/players')}>
          <Row style={{ gap: 12 }}>
            <View style={[styles.actionIcon, { backgroundColor: c.surfaceAlt }]}>
              <Icon ios="dot.radiowaves.left.and.right" android="sensors" size={20} color={c.textMuted} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Headline>Nothing live right now</Headline>
              <Caption>Follow players to see their matches here.</Caption>
            </View>
            <Caption style={{ color: c.primary, fontWeight: '800' }}>Find ›</Caption>
          </Row>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }} style={{ marginHorizontal: -16 }}>
          <View style={{ width: 4 }} />
          {matches.map((m) => (
            <LiveMatchCard key={m.id} match={m} onChanged={watched.reloadMatches} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** A quiet invite for players who might run a club (the full card shows once a request exists). */
function OwnClubPromo() {
  const { c } = useTheme();
  return (
    <PressableScale onPress={() => router.push('/club-enquiry')} accessibilityRole="button" style={[styles.promo, { borderColor: c.border }]}>
      <View style={[styles.actionIcon, { backgroundColor: c.primarySoft }]}>
        <Icon ios="building.2.fill" android="store" size={20} color={c.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Headline>Own a snooker club?</Headline>
        <Caption>Run tables, tournaments and live scoring on CueSphere.</Caption>
      </View>
      <Caption style={{ color: c.primary, fontWeight: '800' }}>Start ›</Caption>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  overline: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  form: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  action: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  actionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', marginTop: 4 },
});
