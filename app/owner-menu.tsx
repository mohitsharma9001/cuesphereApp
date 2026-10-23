import Constants from 'expo-constants';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { Avatar, Caption, Card, Headline, Row, Screen, SectionTitle, SettingGroup, SettingRow, useConfirm } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { useOwnerMode } from '@/lib/owner-mode';
import { useSession } from '@/lib/session';

/** Owner mode's account page (☰ in the club admin header). Owners have no player app,
 * so their profile, club switching and log out live here. */
export default function OwnerMenu() {
  const { c } = useTheme();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const { me, signOut } = useSession();
  const { clubs } = useOwnerMode();
  const confirm = useConfirm();
  const club = clubs.find((x) => x.slug === slug) ?? clubs[0];
  const pending = me?.isPlatformAdmin ? me.pendingClubCount + (me.pendingEnquiryCount ?? 0) : 0;
  const name = me?.profile?.fullName || 'Club owner';

  async function logOut() {
    if (!(await confirm({ title: 'Log out?', message: `You're signed in as ${me?.user.email}.`, confirmLabel: 'Log out', destructive: true }))) return;
    await signOut(); // the signed-out guard in app/_layout.tsx shows the login screen
  }

  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
        <Avatar name={name === 'Club owner' ? (me?.user.email ?? '?') : name} uri={me?.profile?.profilePhotoUrl || null} size={76} />
        <Headline style={{ fontSize: 19, marginTop: 4 }}>{name}</Headline>
        <Caption>{me?.user.email}</Caption>
        {club && (
          <Row style={{ gap: 6, marginTop: 6, backgroundColor: c.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Avatar name={club.name} uri={club.logoUrl || null} size={18} />
            <Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>Owner · {club.name}</Text>
          </Row>
        )}
      </Card>

      {club && (
        <>
          <SectionTitle>Your club</SectionTitle>
          <SettingGroup>
            <SettingRow icon={['eye', 'visibility']} tint={c.info} title="View public club page" text="See your club the way players do" onPress={() => router.push(`/club/${club.slug}` as Href)} />
            <SettingRow
              icon={['gearshape.fill', 'settings']}
              title="Club settings"
              text="Details, gallery, tables, TV & stream"
              onPress={() => router.push(`/club/${club.slug}/admin/settings` as Href)}
              last={clubs.length < 2}
            />
            {clubs.length > 1 && (
              <SettingRow icon={['arrow.left.arrow.right', 'swap_horiz']} tint={c.warning} title="Switch club" text={`You run ${clubs.length} clubs`} onPress={() => router.push('/owner')} last />
            )}
          </SettingGroup>
        </>
      )}

      <SectionTitle>Account</SectionTitle>
      <SettingGroup>
        <SettingRow icon={['person.crop.circle.fill', 'account_circle']} tint={c.info} title="My profile" text="Name, photo and contact details" onPress={() => router.push('/profile-edit')} last={!me?.isPlatformAdmin} />
        {me?.isPlatformAdmin && (
          <SettingRow icon={['checkmark.shield.fill', 'verified_user']} tint={c.accent} title="Club Approvals" text="Club requests and new clubs" badge={pending || undefined} onPress={() => router.push('/approvals')} last />
        )}
      </SettingGroup>

      <View style={{ marginTop: 8 }}>
        <SettingGroup>
          <SettingRow icon={['rectangle.portrait.and.arrow.right', 'logout']} title="Log out" danger onPress={logOut} last />
        </SettingGroup>
      </View>

      <Caption style={{ textAlign: 'center', marginTop: 8 }}>CueSphere {Constants.expoConfig?.version ? `v${Constants.expoConfig.version}` : ''}</Caption>
    </Screen>
  );
}
