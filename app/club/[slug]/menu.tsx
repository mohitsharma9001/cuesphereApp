import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Body, Button, Caption, Headline, ListGroup, ListItem, Row, Screen, SectionTitle, useConfirm } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { useOwnerMode } from '@/lib/owner-mode';
import { useSession } from '@/lib/session';

/** Club menu (#17). */
export default function ClubMenu() {
  const { c } = useTheme();
  const { me, signOut } = useSession();
  const confirm = useConfirm();
  const { slug, club, isStaff, isScorekeeperOnly, standing } = useClub();
  const { isOwner } = useOwnerMode();

  const go = (href: Href) => {
    router.back();
    router.navigate(href);
  };
  const base = `/club/${slug}`;

  return (
    <Screen>
      {club && (
        <Row style={{ marginBottom: 4 }}>
          <Avatar name={club.name} uri={club.logoUrl || null} size={48} />
          <View style={{ flex: 1 }}>
            <Headline numberOfLines={1}>{club.name}</Headline>
            {!!club.tagline && <Caption numberOfLines={1}>{club.tagline}</Caption>}
          </View>
        </Row>
      )}

      <SectionTitle>This club</SectionTitle>
      <ListGroup>
        <ListItem label="Home" icon={['house.fill', 'home']} onPress={() => go(base as Href)} />
        <ListItem label="Tournaments" icon={['trophy.fill', 'emoji_events']} tint={c.warning} onPress={() => go(`${base}/tournaments` as Href)} />
        <ListItem label="Live" icon={['dot.radiowaves.left.and.right', 'sensors']} tint={c.accent} onPress={() => go(`${base}/live` as Href)} />
        <ListItem label="Gallery" icon={['photo.on.rectangle', 'photo_library']} tint={c.info} onPress={() => go(`${base}/gallery` as Href)} />
        <ListItem label="Hall of Fame" icon={['medal.fill', 'military_tech']} tint={c.warning} onPress={() => go(`${base}/hall-of-fame` as Href)} last />
      </ListGroup>

      {me && (
        <>
          <SectionTitle>You</SectionTitle>
          <ListGroup>
            {!isOwner && <ListItem label="Dashboard" icon={['square.grid.2x2.fill', 'dashboard']} badge={standing?.unreadNotifications || undefined} onPress={() => go(`${base}/dashboard` as Href)} />}
            <ListItem label="My Profile" icon={['person.crop.circle.fill', 'account_circle']} tint={c.info} onPress={() => go(me.profile ? (`/player/${me.profile.id}` as Href) : '/profile-edit')} />
            {isStaff && (
              <ListItem
                label={isScorekeeperOnly ? 'Live Scoring' : 'Club Admin'}
                icon={['checkmark.shield.fill', 'admin_panel_settings']}
                tint={c.accent}
                onPress={() => go(`${base}/admin${isScorekeeperOnly ? '/live' : ''}` as Href)}
              />
            )}
            {!isOwner && <ListItem label="My dues" icon={['indianrupeesign.circle.fill', 'currency_rupee']} tint={c.accent} onPress={() => go(`${base}/dues` as Href)} last />}
          </ListGroup>
        </>
      )}

      {!isOwner && (
        <>
          <SectionTitle>CueSphere</SectionTitle>
          <ListGroup>
            <ListItem label="Browse Clubs" icon={['building.2.fill', 'store']} onPress={() => go('/clubs')} />
            <ListItem label="All Tournaments" icon={['trophy', 'emoji_events']} tint={c.warning} onPress={() => go('/browse/tournaments')} />
            <ListItem label="CueSphere for Clubs" icon={['megaphone.fill', 'campaign']} tint={c.accent} onPress={() => go('/for-clubs')} last />
          </ListGroup>
        </>
      )}

      <View style={{ gap: 10, marginTop: 12 }}>
        {me ? (
          <>
            <Body muted style={{ textAlign: 'center' }}>{me.user.email}</Body>
            <Button
              title="Logout"
              variant="danger"
              icon={['rectangle.portrait.and.arrow.right', 'logout']}
              onPress={async () => {
                if (!(await confirm({ title: 'Log out?', confirmLabel: 'Log out', destructive: true }))) return;
                await signOut(); // the signed-out guard shows the login screen
              }}
            />
          </>
        ) : (
          <Button title="Log in" onPress={() => go('/sign-in')} />
        )}
      </View>
    </Screen>
  );
}
