import { createContext, use, useEffect, type PropsWithChildren } from 'react';

import { useSession } from './session';
import type { Club, ClubMembership, ClubRole } from './types';
import { useApi } from './use-api';

export interface ClubStanding {
  membership: ClubMembership | null;
  unreadNotifications: number;
  activeRegistrationId: string | null;
  currentMatchId: string | null;
}

export type ClubWithCounts = Club & { memberCount?: number; tournamentCount?: number };

interface ClubContextValue {
  slug: string;
  club: ClubWithCounts | undefined;
  loading: boolean;
  error: string | null;
  standing: ClubStanding | undefined;
  role: ClubRole | null;
  isMember: boolean;
  /** Any club staff role, including scorekeepers. */
  isStaff: boolean;
  /** Scorekeeper accounts only score live matches. */
  isScorekeeperOnly: boolean;
  reload: () => Promise<unknown>;
}

const ClubContext = createContext<ClubContextValue | null>(null);

export function useClub(): ClubContextValue {
  const value = use(ClubContext);
  if (!value) throw new Error('useClub must be used inside a club screen');
  return value;
}

/** Loads the club (with counts) and the viewer's standing in it once for every club screen. */
export function ClubProvider({ slug, children }: PropsWithChildren<{ slug: string }>) {
  const { me } = useSession();
  const club = useApi<ClubWithCounts>(`/clubs/${slug}`);
  const counts = useApi<ClubWithCounts[]>(club.data ? `/clubs?ids=${club.data.id}&include=counts` : null);
  const standing = useApi<ClubStanding>(`/viewer/clubs/${slug}`);

  // Signing in / out (or joining) changes the standing.
  const userId = me?.user.id;
  const memberships = me?.memberships.length;
  useEffect(() => {
    standing.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, memberships]);

  const role = standing.data?.membership?.role ?? null;
  const merged = club.data ? { ...club.data, ...(counts.data?.[0] ?? {}) } : undefined;
  const value: ClubContextValue = {
    slug,
    club: merged,
    loading: club.loading,
    error: club.error,
    standing: standing.data,
    role,
    isMember: !!role,
    isStaff: !!role && role !== 'player',
    isScorekeeperOnly: role === 'club_staff_scorekeeper',
    reload: () => Promise.all([club.reload(), counts.reload(), standing.reload()]),
  };
  return <ClubContext value={value}>{children}</ClubContext>;
}
