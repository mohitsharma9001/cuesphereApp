import { Redirect } from 'expo-router';

/** The Friends tab jumps to the app-wide Friends screen (see the tabPress listener). */
export default function ClubFriendsTab() {
  return <Redirect href="/friends" />;
}
