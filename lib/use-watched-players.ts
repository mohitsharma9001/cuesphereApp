import { useSession } from './session';
import type { Match, PlayerProfile } from './types';
import { useApi } from './use-api';

/** Profile ids of the players the viewer cares about — themselves, everyone they
 * follow, and their friends — plus those players' live and upcoming matches.
 * Signed out: nothing (every request is skipped). */
export function useWatchedPlayers() {
  const { me } = useSession();
  const follows = useApi<string[]>(me ? '/follows' : null);
  const friendUserIds = useApi<string[]>(me ? '/friendships/friend-ids' : null);
  const friendIds = friendUserIds.data ?? [];
  const friends = useApi<PlayerProfile[]>(friendIds.length ? `/profiles/batch?userIds=${friendIds.join(',')}` : null);

  const ids = [...new Set([me?.profile?.id, ...(follows.data ?? []), ...(friends.data ?? []).map((p) => p.id)].filter((id): id is string => !!id))];
  const matches = useApi<Match[]>(ids.length ? `/matches/open?playerIds=${ids.join(',')}` : null);

  const loading = !!me && (follows.loading || friendUserIds.loading || friends.loading || matches.loading);
  return {
    /** Profile ids the viewer follows. */
    followIds: follows.data ?? [],
    /** The viewer's accepted friends' profiles. */
    friendProfiles: friends.data ?? [],
    playerIds: ids,
    live: (matches.data ?? []).filter((m) => m.status === 'live'),
    upcoming: (matches.data ?? []).filter((m) => m.status === 'scheduled'),
    loading,
    error: follows.error ?? friendUserIds.error ?? friends.error ?? matches.error,
    /** Refetch everything quietly (focus, pull-to-refresh, live signal). */
    reload: () => Promise.all([follows.reload(), friendUserIds.reload(), friends.reload(), matches.reload()]),
    reloadMatches: matches.reload,
  };
}
