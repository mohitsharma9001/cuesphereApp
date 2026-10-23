import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useSession } from '@/lib/session';

/** ☰ in the header, with a count of club requests + clubs waiting for review (platform admins).
 * `onDark` is the white version for Home's dark app bar. */
export function MenuButton({ onDark }: { onDark?: boolean }) {
  const { c } = useTheme();
  const { me } = useSession();
  const pending = me?.isPlatformAdmin ? me.pendingClubCount + (me.pendingEnquiryCount ?? 0) : 0;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={pending ? `Menu, ${pending} waiting for review` : 'Menu'}
      hitSlop={10}
      onPress={() => router.push('/menu')}
      style={[styles.button, { backgroundColor: onDark ? 'rgba(255,255,255,0.1)' : c.surfaceAlt }]}>
      <Icon ios="line.3.horizontal" android="menu" color={onDark ? '#FFFFFF' : c.text} size={20} />
      {pending > 0 && (
        <View style={[styles.badge, { backgroundColor: c.accent, borderColor: onDark ? '#0B0E12' : c.bg }]}>
          <Text style={styles.badgeText}>{pending}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { marginHorizontal: 14, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});
