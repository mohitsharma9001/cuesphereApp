import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { LiveMatchCard } from '@/components/home/live-match-card';
import { Icon } from '@/components/icon';
import { Button, Caption, Card, Headline, LiveDot, LoadState, PlayerRow, PressableScale, Row, Screen, SectionTitle, SegmentedControl, Title, useConfirm, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import type { PlayerProfile } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useFriendships } from '@/lib/use-friendships';
import { useWatchedPlayers } from '@/lib/use-watched-players';

/** My Friends (#10): requests, who's playing now and next, and the people you follow / are friends with. */
export default function FriendsScreen() {
  const { c } = useTheme();
  const confirm = useConfirm();
  const toast = useToast();
  const watched = useWatchedPlayers();
  const friendships = useFriendships();
  const [tab, setTab] = useState<'following' | 'friends'>('following');
  const [unfollowing, setUnfollowing] = useState<string | null>(null);

  // People behind the ids: who you follow, and who asked to be your friend.
  const followed = useApi<PlayerProfile[]>(watched.followIds.length ? `/profiles/batch?ids=${watched.followIds.join(',')}` : null);
  const pending = (friendships.list.data ?? []).filter((f) => f.status === 'pending');
  const pendingUserIds = pending.map((f) => (friendships.relationOf(f.requesterId) === 'incoming' ? f.requesterId : f.recipientId));
  const pendingPeople = useApi<PlayerProfile[]>(pendingUserIds.length ? `/profiles/batch?userIds=${pendingUserIds.join(',')}` : null);
  const incoming = (pendingPeople.data ?? []).filter((p) => friendships.relationOf(p.userId) === 'incoming');
  const outgoing = (pendingPeople.data ?? []).filter((p) => friendships.relationOf(p.userId) === 'outgoing');

  useFocusEffect(
    useCallback(() => {
      watched.reloadMatches();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const refresh = () => Promise.all([watched.reload(), friendships.list.reload(), followed.reload(), pendingPeople.reload()]);

  async function unfollow(p: PlayerProfile) {
    setUnfollowing(p.id);
    try {
      await api(`/follows/${p.id}`, { method: 'DELETE' });
      await Promise.all([watched.reload(), followed.reload()]);
      toast(`Unfollowed ${p.fullName}`, 'info');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not unfollow.', 'error');
    } finally {
      setUnfollowing(null);
    }
  }

  async function removeFriend(p: PlayerProfile) {
    if (!(await confirm({ title: `Remove ${p.fullName}?`, message: 'You can add each other again later.', confirmLabel: 'Remove friend', destructive: true }))) return;
    await friendships.act(p.userId);
    await watched.reload();
  }

  async function respond(p: PlayerProfile, accept: boolean) {
    await friendships.act(p.userId, accept ? 'primary' : 'decline');
    await Promise.all([watched.reload(), pendingPeople.reload()]);
    if (accept) toast(`You and ${p.fullName.split(' ')[0]} are now friends`);
  }

  const friends = watched.friendProfiles;
  const following = followed.data ?? [];
  const list = tab === 'following' ? following : friends;

  return (
    <Screen refreshing={false} onRefresh={refresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>My Friends</Title>
        <PressableScale onPress={() => router.push('/players')}>
          <Row style={{ gap: 6, backgroundColor: c.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, height: 34 }}>
            <Icon ios="magnifyingglass" android="person_search" color={c.primary} size={14} />
            <Caption style={{ color: c.primary, fontWeight: '800' }}>Find players</Caption>
          </Row>
        </PressableScale>
      </Row>

      {incoming.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionTitle>Friend requests ({incoming.length})</SectionTitle>
          {incoming.map((p) => (
            <PlayerRow
              key={p.id}
              name={p.fullName}
              photoUrl={p.profilePhotoUrl || null}
              subtitle={p.city || 'Wants to be your friend'}
              linked
              onPress={() => router.push(`/player/${p.id}`)}
              right={
                <Row style={{ gap: 6 }}>
                  <SmallPill label="Decline" onPress={() => respond(p, false)} busy={friendships.busyUserId === p.userId} />
                  <SmallPill label="Accept" primary onPress={() => respond(p, true)} busy={friendships.busyUserId === p.userId} />
                </Row>
              }
            />
          ))}
        </View>
      )}

      <Row style={{ marginTop: 12 }}>
        {watched.live.length > 0 && <LiveDot />}
        <SectionTitle style={{ marginTop: 0 }}>Playing now{watched.live.length ? ` (${watched.live.length})` : ''}</SectionTitle>
      </Row>
      {watched.loading && !watched.live.length ? (
        <LoadState loading />
      ) : watched.live.length === 0 ? (
        <Caption>No one you follow is playing right now. You&apos;ll see their matches here the moment they start.</Caption>
      ) : (
        watched.live.map((m) => (
          <View key={m.id} style={{ alignItems: 'stretch' }}>
            <LiveMatchCardFull match={m} onChanged={watched.reloadMatches} />
          </View>
        ))
      )}

      {watched.upcoming.length > 0 && (
        <>
          <SectionTitle>Up next</SectionTitle>
          {watched.upcoming.map((m) => (
            <Card key={m.id} onPress={() => router.push(`/match/${m.id}`)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Headline style={{ flex: 1 }} numberOfLines={1}>
                  {m.player1Name} v {m.player2Name}
                </Headline>
                <Caption>{m.matchStartTime || (m.kind === 'friendly' ? 'Friendly' : `Table ${m.tableNumber}`)} ›</Caption>
              </Row>
            </Card>
          ))}
        </>
      )}

      <View style={{ marginTop: 16 }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'following', label: `Following (${following.length})` },
            { value: 'friends', label: `Friends (${friends.length})` },
          ]}
        />
      </View>

      {list.length === 0 && !watched.loading && (
        <Card style={{ alignItems: 'center', paddingVertical: 22, gap: 8 }}>
          <Icon ios={tab === 'following' ? 'star' : 'person.2'} android={tab === 'following' ? 'star' : 'group'} color={c.textMuted} size={26} />
          <Caption style={{ textAlign: 'center' }}>
            {tab === 'following' ? 'Follow players to see their live matches here.' : 'Add friends from the player directory.'}
          </Caption>
          <Button title="Find players" variant="secondary" onPress={() => router.push('/players')} />
        </Card>
      )}
      {list.map((p) => (
        <PlayerRow
          key={p.id}
          name={p.fullName}
          photoUrl={p.profilePhotoUrl || null}
          subtitle={p.city || undefined}
          linked
          onPress={() => router.push(`/player/${p.id}`)}
          right={
            tab === 'following' ? (
              <SmallPill label="Unfollow" onPress={() => unfollow(p)} busy={unfollowing === p.id} />
            ) : (
              <SmallPill label="Remove" onPress={() => removeFriend(p)} busy={friendships.busyUserId === p.userId} />
            )
          }
        />
      ))}

      {tab === 'friends' && outgoing.length > 0 && (
        <>
          <SectionTitle>Requests you sent</SectionTitle>
          {outgoing.map((p) => (
            <PlayerRow
              key={p.id}
              name={p.fullName}
              photoUrl={p.profilePhotoUrl || null}
              subtitle="Waiting for them to accept"
              linked
              onPress={() => router.push(`/player/${p.id}`)}
              right={<SmallPill label="Cancel" onPress={() => friendships.act(p.userId)} busy={friendships.busyUserId === p.userId} />}
            />
          ))}
        </>
      )}
    </Screen>
  );
}

/** Full-width version of the Home strip card. */
function LiveMatchCardFull(props: Parameters<typeof LiveMatchCard>[0]) {
  return (
    <View style={{ alignSelf: 'stretch' }}>
      <LiveMatchCard {...props} fullWidth />
    </View>
  );
}

function SmallPill({ label, onPress, primary, busy }: { label: string; onPress: () => void; primary?: boolean; busy?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale accessibilityRole="button" hitSlop={6} disabled={busy} onPress={onPress} style={{ opacity: busy ? 0.5 : 1 }}>
      <Row style={{ backgroundColor: primary ? c.primary : c.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 12, height: 32 }}>
        <Caption style={{ color: primary ? c.onPrimary : c.text, fontWeight: '800' }}>{label}</Caption>
      </Row>
    </PressableScale>
  );
}
