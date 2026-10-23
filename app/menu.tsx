import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Avatar, Body, Button, Caption, Headline, ListGroup, ListItem, Row, Screen, SectionTitle, useConfirm } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useSession } from '@/lib/session';

interface Item {
  label: string;
  href: Href;
  icon: [string, string];
  tint?: string;
  badge?: number;
}

/** The ☰ main menu (#7). Personal links appear only when signed in. */
export default function MenuScreen() {
  const { c } = useTheme();
  const { me, signOut, reload } = useSession();
  const confirm = useConfirm();

  // Keep the pending-approvals count fresh whenever the menu opens.
  useEffect(() => {
    if (me?.isPlatformAdmin) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (href: Href) => {
    router.back();
    router.navigate(href);
  };

  const explore: Item[] = [
    { label: 'Browse Clubs', href: '/clubs', icon: ['building.2.fill', 'store'], tint: c.primary },
    { label: 'Tournaments', href: '/browse/tournaments', icon: ['trophy.fill', 'emoji_events'], tint: c.warning },
    { label: 'Rankings', href: '/rankings', icon: ['chart.bar.fill', 'leaderboard'], tint: c.info },
    { label: 'For Clubs', href: '/for-clubs', icon: ['megaphone.fill', 'campaign'], tint: c.accent },
    { label: 'Create Club', href: '/club-enquiry', icon: ['plus.circle.fill', 'add_circle'], tint: c.primary },
  ];
  const mine: Item[] = [
    { label: 'Friendlies', href: '/play', icon: ['figure.pool.swim', 'sports_esports'], tint: c.accent },
    { label: 'Players', href: '/players', icon: ['magnifyingglass', 'person_search'], tint: c.info },
    { label: 'My Clubs', href: '/my-clubs', icon: ['star.fill', 'star'], tint: c.warning },
    { label: 'My Friends', href: '/friends', icon: ['person.2.fill', 'group'], tint: c.primary },
    { label: 'My Profile', href: '/me', icon: ['person.crop.circle.fill', 'account_circle'], tint: c.info },
  ];

  const group = (items: Item[]) => (
    <ListGroup>
      {items.map((item, i) => (
        <ListItem key={item.label} label={item.label} icon={item.icon} tint={item.tint} badge={item.badge} last={i === items.length - 1} onPress={() => go(item.href)} />
      ))}
    </ListGroup>
  );

  return (
    <Screen>
      {me && (
        <Row style={{ marginBottom: 4 }}>
          <Avatar name={me.profile?.fullName || me.user.email} uri={me.profile?.profilePhotoUrl} size={52} />
          <View style={{ flex: 1 }}>
            <Headline numberOfLines={1}>{me.profile?.fullName || 'Player'}</Headline>
            <Caption numberOfLines={1}>{me.user.email}</Caption>
          </View>
        </Row>
      )}

      {me?.isPlatformAdmin && (
        <>
          <SectionTitle>Platform</SectionTitle>
          {group([{ label: 'Club Approvals', href: '/approvals', icon: ['checkmark.shield.fill', 'verified_user'], tint: c.accent, badge: me.pendingClubCount + (me.pendingEnquiryCount ?? 0) }])}
        </>
      )}

      <SectionTitle>Explore</SectionTitle>
      {group(explore)}

      {me && (
        <>
          <SectionTitle>You</SectionTitle>
          {group(mine)}
        </>
      )}

      <View style={{ gap: 12, marginTop: 12 }}>
        {me ? (
          <Button
            title="Logout"
            variant="danger"
            icon={['rectangle.portrait.and.arrow.right', 'logout']}
            onPress={async () => {
              if (!(await confirm({ title: 'Log out?', message: `You're signed in as ${me.user.email}.`, confirmLabel: 'Log out', destructive: true }))) return;
              await signOut(); // the signed-out guard shows the login screen
            }}
          />
        ) : (
          <>
            <Body muted style={{ textAlign: 'center' }}>Log in to play friendlies, follow players and register for tournaments.</Body>
            <Button title="Log in" onPress={() => go('/sign-in')} />
            <Button title="Create account" variant="secondary" onPress={() => { router.back(); router.push('/register'); }} />
          </>
        )}
      </View>
    </Screen>
  );
}
