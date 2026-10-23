import { useState } from 'react';

import { api, ApiError } from './api';
import { useSession } from './session';
import type { Friendship } from './types';
import { useApi } from './use-api';

export type FriendRelation = 'self' | 'none' | 'friends' | 'outgoing' | 'incoming';

/** Follow + friendship state between the viewer and one player, with actions.
 * Updates show instantly (optimistic) and roll back if the API refuses. */
export function usePlayerRelationship(player: { id: string; userId: string } | undefined) {
  const { me } = useSession();
  const myUserId = me?.user.id;
  const isSelf = !!player && player.userId === myUserId;
  const enabled = !!me && !!player && !isSelf;

  const followState = useApi<{ following: boolean }>(enabled ? `/follows/${player!.id}` : null);
  const friendships = useApi<Friendship[]>(enabled ? '/friendships' : null);
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<'follow' | 'friend' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const friendship = friendships.data?.find((f) => f.requesterId === player?.userId || f.recipientId === player?.userId);
  let relation: FriendRelation = isSelf ? 'self' : 'none';
  if (friendship?.status === 'accepted') relation = 'friends';
  else if (friendship?.status === 'pending') relation = friendship.requesterId === myUserId ? 'outgoing' : 'incoming';

  const following = followOverride ?? followState.data?.following ?? false;

  async function run(kind: 'follow' | 'friend', fn: () => Promise<unknown>, rollback?: () => void) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e) {
      rollback?.();
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return {
    ready: !enabled || (!followState.loading && !friendships.loading),
    isSelf,
    following,
    relation,
    busy,
    error,
    toggleFollow: () => {
      if (!player) return;
      const next = !following;
      setFollowOverride(next);
      return run('follow', () => api(`/follows/${player.id}`, { method: next ? 'POST' : 'DELETE' }), () => setFollowOverride(!next));
    },
    /** Add friend / accept / cancel request / unfriend, depending on the current relation. */
    friendAction: () => {
      if (!player) return;
      return run('friend', async () => {
        if (relation === 'none') await api('/friendships', { method: 'POST', body: { recipientUserId: player.userId } });
        else if (relation === 'incoming' && friendship) await api(`/friendships/${friendship.id}/respond`, { method: 'POST', body: { accept: true } });
        else if (friendship) await api(`/friendships/${friendship.id}`, { method: 'DELETE' });
        await friendships.reload();
      });
    },
    declineRequest: () =>
      friendship && run('friend', async () => {
        await api(`/friendships/${friendship.id}/respond`, { method: 'POST', body: { accept: false } });
        await friendships.reload();
      }),
  };
}
