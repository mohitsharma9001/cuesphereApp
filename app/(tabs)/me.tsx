import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, Caption, Card, Headline, ListGroup, ListItem, Row, Screen, SectionTitle, Title, useConfirm } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { PROFILE_FIELD_LABELS, viewerProfileCompletion } from '@/lib/profile';
import { useSession } from '@/lib/session';

/** Me tab (signed in only): your profile summary. Editing is in profile-edit. */
export default function MeScreen() {
  const { c } = useTheme();
  const { me, reload, signOut } = useSession();
  const confirm = useConfirm();
  if (!me) return null; // the tab only exists while signed in

  const { profile, user, memberships } = me;
  const completion = viewerProfileCompletion(profile, user.email);
  return (
    <Screen onRefresh={reload}>
      <Card style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
        <Avatar name={profile?.fullName || user.email} uri={profile?.profilePhotoUrl || null} size={84} />
        <Title>{profile?.fullName || 'Player'}</Title>
        <Caption>{user.email}</Caption>
        {profile && (
          <Row style={{ marginTop: 6 }}>
            <View style={{ backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Caption style={{ color: c.primary, fontWeight: '700' }}>{profile.memberId}</Caption>
            </View>
            {!!profile.city && <Caption>📍 {profile.city}</Caption>}
          </Row>
        )}
      </Card>

      <SectionTitle>Account</SectionTitle>
      <ListGroup>
        {profile && <ListItem label="View my public profile" icon={['person.crop.circle', 'account_circle']} tint={c.info} onPress={() => router.push(`/player/${profile.id}`)} />}
        <ListItem label="Edit profile" icon={['pencil', 'edit']} onPress={() => router.push('/profile-edit')} />
        <ListItem label={`My clubs (${memberships.length})`} icon={['star.fill', 'star']} tint={c.warning} onPress={() => router.push('/my-clubs')} last />
      </ListGroup>
      {!completion.isComplete && (
        <Card onPress={() => router.push('/profile-edit')} style={{ backgroundColor: c.accentSoft }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Headline style={{ color: c.accent }}>Finish your profile</Headline>
            <Headline style={{ color: c.accent }}>{completion.percent}%</Headline>
          </Row>
          <Caption>Needed to register for tournaments: {completion.missing.map((f) => PROFILE_FIELD_LABELS[f]).join(', ')}.</Caption>
        </Card>
      )}
      <Button
        title="Log out"
        variant="danger"
        icon={['rectangle.portrait.and.arrow.right', 'logout']}
        onPress={async () => {
          if (!(await confirm({ title: 'Log out?', message: `You're signed in as ${user.email}.`, confirmLabel: 'Log out', destructive: true }))) return;
          await signOut(); // the Me tab disappears and the app returns to Home
        }}
      />
    </Screen>
  );
}
