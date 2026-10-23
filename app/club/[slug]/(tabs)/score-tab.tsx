import { Redirect } from 'expo-router';

import { useClub } from '@/lib/club-context';

/** Scorekeepers' Score tab opens Live Scoring in the admin area. */
export default function ClubScoreTab() {
  const { slug } = useClub();
  return <Redirect href={`/club/${slug}/admin/live`} />;
}
