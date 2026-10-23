import type { Match } from './types';

export type FriendlyTone = 'action' | 'live' | 'muted' | 'done';

/** What a friendly means for me right now (same rules as the website's Play page). */
export function friendlyStatus(m: Match, myProfileId: string): { label: string; tone: FriendlyTone } {
  const mine = m.player1Id === myProfileId; // player 1 is the challenger
  switch (m.friendlyState) {
    case 'invited':
      return mine ? { label: 'Waiting for reply', tone: 'muted' } : { label: 'Challenge · respond', tone: 'action' };
    case 'accepted':
      return m.status === 'live' ? { label: 'Live', tone: 'live' } : { label: 'Ready to start', tone: 'action' };
    case 'pending_confirmation':
      return m.resultSubmittedBy === myProfileId ? { label: 'Awaiting confirmation', tone: 'muted' } : { label: 'Confirm result', tone: 'action' };
    case 'confirmed':
      return { label: m.winnerId === myProfileId ? 'Won' : 'Lost', tone: 'done' };
    case 'declined':
      return { label: 'Declined', tone: 'muted' };
    default:
      return { label: 'Cancelled', tone: 'muted' };
  }
}

/** Something I have to do: answer a challenge, or confirm a score the other player entered. */
export function friendlyNeedsMe(m: Match, myProfileId: string) {
  return (m.friendlyState === 'invited' && m.player2Id === myProfileId) || (m.friendlyState === 'pending_confirmation' && m.resultSubmittedBy !== myProfileId);
}

/** Split into the Play hub's three sections. */
export function groupFriendlies(matches: Match[], myProfileId: string) {
  const needsYou = matches.filter((m) => friendlyNeedsMe(m, myProfileId));
  const rest = matches.filter((m) => !friendlyNeedsMe(m, myProfileId));
  return {
    needsYou,
    active: rest.filter((m) => m.friendlyState === 'accepted' || m.friendlyState === 'invited'),
    results: rest.filter((m) => m.friendlyState === 'confirmed' || m.friendlyState === 'pending_confirmation'),
  };
}

/** Me first: "vs Rohan", my frames, their frames. */
export function fromMySide(m: Match, myProfileId: string) {
  const p1 = m.player1Id === myProfileId;
  return {
    opponent: p1 ? m.player2Name : m.player1Name,
    opponentId: p1 ? m.player2Id : m.player1Id,
    myFrames: p1 ? m.framesWonPlayer1 : m.framesWonPlayer2,
    theirFrames: p1 ? m.framesWonPlayer2 : m.framesWonPlayer1,
  };
}
