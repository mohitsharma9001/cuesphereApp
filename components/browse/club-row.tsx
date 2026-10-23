import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { ClubWithCounts } from '@/components/club-card';
import { Icon } from '@/components/icon';
import { Avatar, Caption, Headline, PressableScale, Row } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';

/** A rounded list that holds ClubRows. */
export function ClubList({ children }: { children: React.ReactNode }) {
  const { c, scheme } = useTheme();
  return (
    <View
      style={[
        styles.list,
        { backgroundColor: c.surface, borderColor: c.border },
        scheme === 'light' && { shadowColor: '#0C2A20', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
      ]}>
      {children}
    </View>
  );
}

/** One club: logo, name, place, counts, and Join (or a Member badge). */
export function ClubRow({
  club,
  place,
  member,
  onPress,
  onJoin,
  last,
}: {
  club: ClubWithCounts;
  place: string;
  member: boolean;
  onPress: () => void;
  onJoin?: () => Promise<unknown>;
  last?: boolean;
}) {
  const { c } = useTheme();
  const [joining, setJoining] = useState(false);
  const tournaments = club.tournamentCount ?? 0;
  const members = club.memberCount ?? 0;

  async function join() {
    if (!onJoin) return;
    setJoining(true);
    await onJoin();
    setJoining(false);
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${club.name}${place ? `, ${place}` : ''}`}
      onPress={onPress}
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      <Avatar name={club.name} uri={club.logoUrl || null} size={52} />
      <View style={{ flex: 1, gap: 3 }}>
        <Headline numberOfLines={1}>{club.name}</Headline>
        {!!place && (
          <Row style={{ gap: 4 }}>
            <Icon ios="mappin.and.ellipse" android="location_on" size={12} color={c.textMuted} />
            <Caption numberOfLines={1} style={{ flex: 1 }}>
              {place}
            </Caption>
          </Row>
        )}
        <Row style={{ gap: 10 }}>
          <Row style={{ gap: 4 }}>
            <Icon ios="trophy.fill" android="emoji_events" size={12} color={c.warning} />
            <Caption>
              {tournaments} {tournaments === 1 ? 'tournament' : 'tournaments'}
            </Caption>
          </Row>
          <Row style={{ gap: 4 }}>
            <Icon ios="person.2.fill" android="group" size={12} color={c.info} />
            <Caption>{members}</Caption>
          </Row>
        </Row>
      </View>
      {member ? (
        <View style={[styles.pill, { backgroundColor: c.primarySoft }]}>
          <Icon ios="checkmark" android="check" size={12} color={c.primary} />
          <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>Member</Text>
        </View>
      ) : onJoin ? (
        <PressableScale accessibilityRole="button" accessibilityLabel={`Join ${club.name}`} onPress={join} disabled={joining} style={[styles.join, { backgroundColor: c.primary }]}>
          {joining ? <ActivityIndicator size="small" color={c.onPrimary} /> : <Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 13 }}>Join</Text>}
        </PressableScale>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  join: { minWidth: 64, height: 34, borderRadius: radius.pill, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});
