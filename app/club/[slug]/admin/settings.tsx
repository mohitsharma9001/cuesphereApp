import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, Caption, Card, Headline, PressableScale, RemoteImage, Row, Screen, SectionTitle, SettingGroup, SettingRow } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { useClub } from '@/lib/club-context';

/** Settings hub (#35, #36): a card for the club, then everything that can be set up. */
export default function AdminSettings() {
  const { c } = useTheme();
  const { slug, club } = useClub();
  const base = `/club/${slug}`;
  const go = (path: string) => router.push(`${base}${path}` as Href);

  const counts = [
    club?.memberCount !== undefined && `${club.memberCount} member${club.memberCount === 1 ? '' : 's'}`,
    club?.tournamentCount !== undefined && `${club.tournamentCount} tournament${club.tournamentCount === 1 ? '' : 's'}`,
  ].filter(Boolean);

  return (
    <Screen>
      {club && (
        <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
          {club.heroBannerUrl ? (
            <RemoteImage uri={club.heroBannerUrl} style={{ width: '100%', height: 96 }} />
          ) : (
            <LinearGradient colors={c.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 96 }} />
          )}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={{ marginTop: -32, alignSelf: 'flex-start', borderRadius: 40, borderWidth: 3, borderColor: c.surface }}>
              <Avatar name={club.name} uri={club.logoUrl || null} size={64} />
            </View>
            <Row style={{ marginTop: 8, gap: 8 }}>
              <Headline style={{ flex: 1, fontSize: 18 }} numberOfLines={1}>
                {club.name}
              </Headline>
              <View style={[styles.pill, { backgroundColor: club.status === 'approved' ? c.primarySoft : c.surfaceAlt }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: club.status === 'approved' ? c.success : c.warning }} />
                <Text style={{ color: club.status === 'approved' ? c.primary : c.textMuted, fontWeight: '800', fontSize: 11 }}>{club.status === 'approved' ? 'LIVE' : 'PENDING'}</Text>
              </View>
            </Row>
            <Caption numberOfLines={1}>{club.tagline || 'Add a tagline in Club details'}</Caption>
            {counts.length > 0 && <Caption style={{ marginTop: 2 }}>{counts.join(' · ')}</Caption>}
            <Row style={{ gap: 8, marginTop: 12 }}>
              <SmallButton icon={['pencil', 'edit']} label="Edit details" primary onPress={() => go('/staff/club-settings')} />
              <SmallButton icon={['eye', 'visibility']} label="View club page" onPress={() => router.push(base as Href)} />
            </Row>
          </View>
        </Card>
      )}

      <SectionTitle>Your club</SectionTitle>
      <SettingGroup>
        <SettingRow icon={['building.2.fill', 'store']} tint={c.primary} title="Club details" text="Name, logo, cover, contact and club pages" onPress={() => go('/staff/club-settings')} />
        <SettingRow icon={['photo.on.rectangle', 'photo_library']} tint={c.info} title="Photo gallery" text="Show off your tables, trophies and big nights" onPress={() => go('/staff/gallery')} last />
      </SettingGroup>

      <SectionTitle>Tables & screens</SectionTitle>
      <SettingGroup>
        <SettingRow icon={['tablecells', 'table_rows']} tint={c.warning} title="Tables & rates" text="Add tables and set hourly prices" onPress={() => go('/staff/rates')} />
        <SettingRow icon={['tv.fill', 'tv']} tint={c.accent} title="TV & Stream" text="Pair TVs, YouTube links, overlay, sponsors and ads" onPress={() => go('/staff/tv-stream')} last />
      </SettingGroup>

      <Row style={{ gap: 8, justifyContent: 'center', marginTop: 8 }}>
        <Icon ios="bolt.fill" android="bolt" size={14} color={c.textMuted} />
        <Caption>Changes show on your club page, TVs and stream straight away.</Caption>
      </Row>
    </Screen>
  );
}

function SmallButton({ icon, label, onPress, primary }: { icon: [string, string]; label: string; onPress: () => void; primary?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.small, primary ? { backgroundColor: c.primary } : { borderWidth: 1, borderColor: c.border }]}>
      <Icon ios={icon[0]} android={icon[1]} size={15} color={primary ? c.onPrimary : c.text} />
      <Text style={{ color: primary ? c.onPrimary : c.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  small: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: radius.md },
});
