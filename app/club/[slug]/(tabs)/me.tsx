import { Redirect } from 'expo-router';

import { useSession } from '@/lib/session';

/** The Me tab opens your public profile (see the tabPress listener). */
export default function ClubMeTab() {
  const { me } = useSession();
  return <Redirect href={me?.profile ? `/player/${me.profile.id}` : '/profile-edit'} />;
}
