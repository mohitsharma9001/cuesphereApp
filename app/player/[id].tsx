import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { FormChips } from '@/components/player/form-chips';
import { Avatar, Body, Caption, Card, Headline, LiveDot, LoadState, PressableScale, Row, Screen, SectionTitle, Title } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { useRequireAuth } from '@/lib/auth-gate';
import { useOwnerMode } from '@/lib/owner-mode';
import { liveMatchChannel, useLiveSignal } from '@/lib/live';
import { useSession } from '@/lib/session';
import type { Club, ClubMembership, FriendlyStats, Match, PlayerProfile, PlayerRank, PlayerStatistics } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { usePlayerRelationship } from '@/lib/use-player-relationship';

/** Player Profile (#9). */
export default function PlayerProfileScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useSession();
  const requireAuth = useRequireAuth();
  const { isOwner } = useOwnerMode(); // club owners use the app as admins only

  // Everything keyed by the player id loads together with the profile.
  const profile = useApi<PlayerProfile>(`/profiles/${id}`);
  const stats = useApi<PlayerStatistics[]>(`/stats/players/${id}`);
  const ranks = useApi<PlayerRank[]>(`/stats/players/${id}/ranks`);
  const friendly = useApi<FriendlyStats>(`/friendlies/players/${id}/stats`);
  const open = useApi<Match[]>(`/matches/open?playerIds=${id}`);
  const p = profile.data;
  const memberships = useApi<ClubMembership[]>(p ? `/clubs/memberships/by-user/${p.userId}` : null);
  const clubIds = memberships.data?.map((m) => m.clubId) ?? [];
  const clubs = useApi<Club[]>(clubIds.length ? `/clubs?ids=${clubIds.join(',')}` : null);
  const rel = usePlayerRelationship(p ? { id: p.id, userId: p.userId } : undefined);

  const live = open.data?.find((m) => m.status === 'live');
  useLiveSignal(live ? liveMatchChannel(live.id) : null, open.reload);

  const approvedClubs = (clubs.data ?? []).filter((cl) => cl.status === 'approved');
  const primary = approvedClubs.find((cl) => cl.id === p?.primaryClubId);
  const totals = (stats.data ?? []).reduce(
    (a, s) => ({
      tournaments: a.tournaments + s.tournamentsPlayed,
      matches: a.matches + s.matchesPlayed,
      wins: a.wins + s.wins,
      highestBreak: Math.max(a.highestBreak, s.highestBreak),
    }),
    { tournaments: 0, matches: 0, wins: 0, highestBreak: 0 }
  );
  const winRate = totals.matches ? Math.round((totals.wins / totals.matches) * 100) : 0;

  const refresh = () => Promise.all([profile.refresh(), stats.reload(), ranks.reload(), friendly.reload(), open.reload(), memberships.reload(), clubs.reload()]);

  if (profile.loading || profile.error || !p) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Player' }} />
        <LoadState loading={profile.loading} error={profile.error} onRetry={profile.refresh} empty={!profile.loading && !p && 'Player not found.'} />
      </Screen>
    );
  }

  const isLiveP1 = live?.player1Id === p.id;
  return (
    <Screen refreshing={profile.refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: p.fullName || 'Player' }} />

      <View>
        <Card style={{ alignItems: 'center', paddingVertical: 22, gap: 8 }}>
          <Avatar name={p.fullName || 'Player'} uri={p.profilePhotoUrl || null} size={92} />
          <Title style={{ textAlign: 'center' }}>{p.fullName || 'Player'}</Title>
          <Row style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {primary && (
              <View style={{ backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Caption style={{ color: c.primary, fontWeight: '700' }}>{primary.name}</Caption>
              </View>
            )}
            {!!p.city && <Caption>📍 {p.city}</Caption>}
          </Row>

          {isOwner ? null : rel.isSelf ? (
            <ActionPill label="Edit profile" icon={['pencil', 'edit']} onPress={() => router.push('/profile-edit')} />
          ) : (
            <Row style={{ gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              <ActionPill
                label={rel.following ? 'Following' : 'Follow'}
                icon={rel.following ? ['checkmark', 'check'] : ['plus', 'add']}
                active={rel.following}
                busy={rel.busy === 'follow'}
                onPress={() => requireAuth('to follow players', () => rel.toggleFollow())}
              />
              <ActionPill
                label={{ none: 'Add Friend', outgoing: 'Requested', incoming: 'Accept', friends: 'Friends', self: '' }[rel.relation]}
                icon={rel.relation === 'friends' ? ['person.2.fill', 'group'] : rel.relation === 'incoming' ? ['checkmark', 'check'] : ['person.badge.plus', 'person_add']}
                active={rel.relation === 'friends' || rel.relation === 'outgoing'}
                busy={rel.busy === 'friend'}
                onPress={() => requireAuth('to add friends', () => rel.friendAction())}
              />
              <ActionPill label="Challenge" icon={['bolt.fill', 'bolt']} primary onPress={() => requireAuth('to challenge players', () => router.push(`/challenge?opponent=${p.id}`))} />
            </Row>
          )}
          {rel.relation === 'incoming' && (
            <PressableScale onPress={() => rel.declineRequest()}>
              <Caption>Wants to be your friend · Decline</Caption>
            </PressableScale>
          )}
          {!!rel.error && <Caption style={{ color: c.danger }}>{rel.error}</Caption>}
          {me && !rel.isSelf && rel.relation === 'outgoing' && <Caption>Tap Requested to cancel the request.</Caption>}
        </Card>
      </View>

      {live && (
        <Card onPress={() => router.push(`/match/${live.id}`)} style={{ borderWidth: 1, borderColor: c.accentSoft }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <LiveDot />
              <Caption style={{ color: c.live, fontWeight: '800' }}>PLAYING NOW</Caption>
            </Row>
            <Caption>{live.kind === 'friendly' ? 'Friendly' : `Table ${live.tableNumber}`} · Watch ›</Caption>
          </Row>
          <Headline>
            vs {isLiveP1 ? live.player2Name : live.player1Name} · {isLiveP1 ? live.framesWonPlayer1 : live.framesWonPlayer2}–{isLiveP1 ? live.framesWonPlayer2 : live.framesWonPlayer1}
          </Headline>
        </Card>
      )}

      {!!ranks.data?.length && (
        <Row style={{ gap: 8, flexWrap: 'wrap' }}>
          {ranks.data.map((r) => (
            <PressableScale key={`${r.scope}-${r.code}`} disabled={isOwner} onPress={() => router.navigate('/rankings')}>
              <Row style={{ gap: 6, backgroundColor: c.surface, borderRadius: 999, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 7 }}>
                <Text>🏅</Text>
                <Caption style={{ color: c.text, fontWeight: '800' }}>
                  #{r.rank} in {r.name}
                </Caption>
                <Caption>of {r.total}</Caption>
              </Row>
            </PressableScale>
          ))}
        </Row>
      )}

      <Row style={{ gap: 8 }}>
        <Stat label="Tourn." value={totals.tournaments} icon={['trophy.fill', 'emoji_events']} />
        <Stat label="Matches" value={totals.matches} icon={['scope', 'adjust']} />
        <Stat label="Win %" value={`${winRate}%`} icon={['chart.line.uptrend.xyaxis', 'trending_up']} />
        <Stat label="HB" value={totals.highestBreak} icon={['flame.fill', 'local_fire_department']} />
      </Row>

      {!!friendly.data?.matchesPlayed && (
        <>
          <SectionTitle>Friendlies</SectionTitle>
          <Card>
            <Body>
              {friendly.data.wins}W · {friendly.data.losses}L · Frames {friendly.data.framesWon}–{friendly.data.framesLost}
              {friendly.data.highestBreak > 0 ? ` · HB ${friendly.data.highestBreak}` : ''}
            </Body>
            {friendly.data.recentForm.length > 0 && <FormChips form={friendly.data.recentForm} />}
          </Card>
        </>
      )}

      <SectionTitle>Clubs</SectionTitle>
      {approvedClubs.length === 0 ? (
        <Caption>{memberships.loading || clubs.loading ? 'Loading…' : 'Not a member of any club yet.'}</Caption>
      ) : (
        <Row style={{ gap: 8, flexWrap: 'wrap' }}>
          {approvedClubs.map((cl) => (
            <PressableScale key={cl.id} onPress={() => router.push(`/club/${cl.slug}`)}>
              <Row style={{ gap: 6, backgroundColor: c.surface, borderRadius: 999, borderWidth: 1, borderColor: cl.id === p.primaryClubId ? c.warning : c.border, paddingHorizontal: 12, paddingVertical: 7 }}>
                {cl.id === p.primaryClubId && <Icon ios="star.fill" android="star" color={c.warning} size={13} />}
                <Caption style={{ color: c.text, fontWeight: '700' }}>{cl.name}</Caption>
              </Row>
            </PressableScale>
          ))}
        </Row>
      )}
    </Screen>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: [string, string] }) {
  const { c } = useTheme();
  return (
    <Card style={{ flex: 1, padding: 12, gap: 4, alignItems: 'center' }}>
      <Icon ios={icon[0]} android={icon[1]} color={c.primary} size={16} />
      <Text style={{ color: c.text, fontSize: 20, fontWeight: '900' }}>{value}</Text>
      <Caption>{label}</Caption>
    </Card>
  );
}

function ActionPill({
  label,
  icon,
  onPress,
  active,
  primary,
  busy,
}: {
  label: string;
  icon: [string, string];
  onPress: () => void;
  active?: boolean;
  primary?: boolean;
  busy?: boolean;
}) {
  const { c } = useTheme();
  const bg = primary ? c.primary : active ? c.primarySoft : c.surfaceAlt;
  const fg = primary ? c.onPrimary : active ? c.primary : c.text;
  return (
    <PressableScale accessibilityRole="button" disabled={busy} onPress={onPress} style={{ opacity: busy ? 0.6 : 1 }}>
      <Row style={{ gap: 6, backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 14, height: 38 }}>
        <Icon ios={icon[0]} android={icon[1]} color={fg} size={15} />
        <Text style={{ color: fg, fontWeight: '800', fontSize: 14 }}>{label}</Text>
      </Row>
    </PressableScale>
  );
}
