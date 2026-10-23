import { ActivityIndicator, Text } from 'react-native';

import { PressableScale, Row } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import type { FriendRelation } from '@/lib/use-player-relationship';

const LABEL: Record<Exclude<FriendRelation, 'self'>, string> = {
  none: 'Add Friend',
  outgoing: 'Requested',
  incoming: 'Accept',
  friends: '✓ Friends',
};

/** Compact friend action for list rows. */
export function FriendButton({ relation, busy, onPress }: { relation: FriendRelation; busy?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  if (relation === 'self') return null;
  const primary = relation === 'none' || relation === 'incoming';
  const bg = primary ? c.primary : relation === 'friends' ? c.primarySoft : c.surfaceAlt;
  const fg = primary ? c.onPrimary : relation === 'friends' ? c.primary : c.textMuted;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={LABEL[relation]} hitSlop={8} disabled={busy} onPress={onPress}>
      <Row style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 12, height: 34, minWidth: 92, justifyContent: 'center' }}>
        {busy ? <ActivityIndicator size="small" color={fg} /> : <Text style={{ color: fg, fontWeight: '800', fontSize: 13 }}>{LABEL[relation]}</Text>}
      </Row>
    </PressableScale>
  );
}
