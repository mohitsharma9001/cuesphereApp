import { useSession } from '@/lib/session';

/** Owner mode: the viewer runs at least one approved club, so the app works as that
 * club's admin only (no player tabs). Everyone else gets the player app. */
export function useOwnerMode() {
  const { me } = useSession();
  const clubs = me?.ownedClubs ?? [];
  return { isOwner: clubs.length > 0, clubs };
}
