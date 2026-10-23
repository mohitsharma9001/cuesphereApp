import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Caption, Headline, PressableScale } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';

/** A rounded group of SettingRows. */
export function SettingGroup({ children }: PropsWithChildren) {
  const { c } = useTheme();
  return <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>;
}

/** Settings/menu row: tinted icon tile, title, a line saying what's inside, chevron.
 * `danger` makes it a red action row (no chevron), e.g. Log out. */
export function SettingRow({
  icon,
  tint,
  title,
  text,
  onPress,
  last,
  badge,
  danger,
}: {
  icon: [string, string];
  tint?: string;
  title: string;
  text?: string;
  onPress: () => void;
  last?: boolean;
  badge?: number;
  danger?: boolean;
}) {
  const { c } = useTheme();
  const color = danger ? c.danger : (tint ?? c.primary);
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      <View style={[styles.tile, { backgroundColor: `${color}1F` }]}>
        <Icon ios={icon[0]} android={icon[1]} size={20} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Headline style={danger ? { color: c.danger } : undefined}>{title}</Headline>
        {!!text && <Caption numberOfLines={2}>{text}</Caption>}
      </View>
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: c.accent }]}>
          <Caption style={{ color: '#FFFFFF', fontWeight: '800' }}>{badge}</Caption>
        </View>
      )}
      {!danger && <Icon ios="chevron.right" android="chevron_right" size={16} color={c.textMuted} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 14 },
  tile: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
});
