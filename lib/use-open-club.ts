import { router } from 'expo-router';

import { tapHaptic, useConfirm, useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

type ClubRef = { id: string; slug: string; name: string };

/** Joining and opening clubs from lists (Clubs tab, Home). */
export function useOpenClub() {
  const { me, reload } = useSession();
  const confirm = useConfirm();
  const toast = useToast();
  const isMember = (club: ClubRef) => !!me?.memberships.some((m) => m.clubId === club.id);

  /** Joins straight away (the Join button). Returns true when it worked. */
  async function joinClub(club: ClubRef) {
    try {
      await api(`/clubs/${club.slug}/join`, { method: 'POST' });
      tapHaptic('success');
      toast(`Welcome to ${club.name}!`);
      await reload(); // memberships → Member badges, Home's "Your clubs"
      return true;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not join the club.', 'error');
      return false;
    }
  }

  /** Opens a club page. For a club the player hasn't joined, first asks whether they'd like
   * to join (so its tournaments and events reach them); either way the club opens. */
  async function openClub(club: ClubRef) {
    if (!isMember(club)) {
      const join = await confirm({
        title: `Join ${club.name}?`,
        message: 'Become a member so you never miss its tournaments and events.',
        confirmLabel: 'Join club',
        cancelLabel: 'Just have a look',
      });
      if (join) await joinClub(club);
    }
    router.push(`/club/${club.slug}`);
  }

  return { openClub, joinClub, isMember };
}
