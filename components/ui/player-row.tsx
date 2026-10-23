import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Avatar, Caption, Card, Headline, Row } from '@/components/ui';
import { useTheme } from '@/constants/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

/** One player in a list: rank, photo (✓ when linked to a CueSphere account),
 * name, club badge and a subtitle, with an optional right-hand slot
 * (points, a button, an amount). Used by rankings, friends, search and dues. */
export function PlayerRow({
  name,
  photoUrl,
  subtitle,
  club,
  linked,
  rank,
  right,
  onPress,
  highlight,
}: {
  name: string;
  photoUrl?: string | null;
  subtitle?: string;
  club?: string | null;
  linked?: boolean;
  rank?: number;
  right?: ReactNode;
  onPress?: () => void;
  /** Tint the card (e.g. top 3, or "you"). */
  highlight?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={highlight ? { borderWidth: 1, borderColor: c.primary } : undefined}>
      <Row>
        {rank !== undefined && (
          <View style={{ width: 30, alignItems: 'center' }}>
            {rank <= 3 ? <Text style={{ fontSize: 22 }}>{MEDALS[rank - 1]}</Text> : <Headline style={{ color: c.textMuted }}>{rank}</Headline>}
          </View>
        )}
        <View>
          <Avatar name={name} uri={photoUrl} size={44} />
          {linked && (
            <View
              accessibilityLabel="Linked CueSphere account"
              style={{ position: 'absolute', right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, borderWidth: 2, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: c.onPrimary, fontSize: 9, fontWeight: '900' }}>✓</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Headline numberOfLines={1}>{name}</Headline>
          {(!!club || !!subtitle) && (
            <Row style={{ gap: 6 }}>
              {!!club && (
                <View style={{ backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, maxWidth: '60%' }}>
                  <Caption numberOfLines={1} style={{ color: c.primary, fontWeight: '700', fontSize: 11 }}>{club}</Caption>
                </View>
              )}
              {!!subtitle && <Caption numberOfLines={1} style={{ flexShrink: 1 }}>{subtitle}</Caption>}
            </Row>
          )}
        </View>
        {right}
      </Row>
    </Card>
  );
}
