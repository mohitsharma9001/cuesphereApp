import { useState } from 'react';

import { api, ApiError } from './api';
import { useSession } from './session';
import type { Friendship } from './types';
import type { FriendRelation } from './use-player-relationship';
import { useApi } from './use-api';

/** The viewer's friendships, loaded once for a whole list of players, with the
 * same add / accept / cancel / unfriend actions as the player profile. */
export function useFriendships() {
  const { me } = useSession();
  const myUserId = me?.user.id;
  const list = useApi<Friendship[]>(me ? '/friendships' : null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const find = (userId: string) => list.data?.find((f) => f.requesterId === userId || f.recipientId === userId);

  const relationOf = (userId: string): FriendRelation => {
    if (userId === myUserId) return 'self';
    const f = find(userId);
    if (f?.status === 'accepted') return 'friends';
    if (f?.status === 'pending') return f.requesterId === myUserId ? 'outgoing' : 'incoming';
    return 'none';
  };

  /** Add friend / accept / cancel request / unfriend, depending on the relation. */
  async function act(userId: string, how: 'primary' | 'decline' = 'primary') {
    const f = find(userId);
    const relation = relationOf(userId);
    setBusyUserId(userId);
    setError(null);
    try {
      if (how === 'decline' && f) await api(`/friendships/${f.id}/respond`, { method: 'POST', body: { accept: false } });
      else if (relation === 'none') await api('/friendships', { method: 'POST', body: { recipientUserId: userId } });
      else if (relation === 'incoming' && f) await api(`/friendships/${f.id}/respond`, { method: 'POST', body: { accept: true } });
      else if (f) await api(`/friendships/${f.id}`, { method: 'DELETE' });
      await list.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyUserId(null);
    }
  }

  return { list, relationOf, act, busyUserId, error };
}
