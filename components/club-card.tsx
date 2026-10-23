import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, Caption, Card, Headline, Row } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import type { Club } from '@/lib/types';

export type ClubWithCounts = Club & { memberCount?: number; tournamentCount?: number };

/** A club in a list: logo, name, tagline or place, counts, and a "Member"/role tag. */
export function ClubCard({ club, tag, subtitle, onPress }: { club: ClubWithCounts; tag?: string; subtitle?: string; onPress: () => void }) {
  const { c } = useTheme();
  const counts = [
    club.tournamentCount !== undefined && `${club.tournamentCount} tournament${club.tournamentCount === 1 ? '' : 's'}`,
    club.memberCount !== undefined && `${club.memberCount} member${club.memberCount === 1 ? '' : 's'}`,
  ].filter(Boolean);
  return (
    <Card onPress={onPress}>
      <Row>
        <Avatar name={club.name} uri={club.logoUrl || null} size={50} />
        <View style={{ flex: 1, gap: 2 }}>
          <Headline numberOfLines={1}>{club.name}</Headline>
          {!!(subtitle ?? club.tagline) && <Caption numberOfLines={1}>{subtitle ?? club.tagline}</Caption>}
          {counts.length > 0 && <Caption style={{ color: c.text, fontWeight: '600' }}>{counts.join(' · ')}</Caption>}
        </View>
        {!!tag && (
          <View style={{ backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Caption style={{ color: c.primary, fontWeight: '700' }}>{tag}</Caption>
          </View>
        )}
        <Icon ios="chevron.right" android="chevron_right" color={c.textMuted} size={14} />
      </Row>
    </Card>
  );
}
