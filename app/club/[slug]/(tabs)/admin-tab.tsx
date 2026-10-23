import { Redirect } from 'expo-router';

import { useClub } from '@/lib/club-context';

/** The Admin tab opens the admin area (see the tabPress listener). */
export default function ClubAdminTab() {
  const { slug } = useClub();
  return <Redirect href={`/club/${slug}/admin`} />;
}
