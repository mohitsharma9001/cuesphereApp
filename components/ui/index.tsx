import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Icon } from '@/components/icon';
import { RemoteImage } from '@/components/ui/remote-image';
import { radius, space, type, useTheme, type Colors } from '@/constants/theme';

/** Light tap feedback; no-op where haptics aren't available. */
export function tapHaptic(kind: 'light' | 'select' | 'success' | 'error' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'select') Haptics.selectionAsync();
  else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Pressable with a haptic tap; dims while pressed (no animation). */
export function PressableScale({
  children,
  style,
  haptic = true,
  onPress,
  ...props
}: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean; children: ReactNode }) {
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        if (haptic) tapHaptic();
        onPress?.(e);
      }}
      style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

/** Scrollable page with pull-to-refresh. */
export function Screen({ children, refreshing, onRefresh, padded = true }: PropsWithChildren<{ refreshing?: boolean; onRefresh?: () => void; padded?: boolean }>) {
  const { c } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[padded && { padding: space.lg }, { gap: space.md, paddingBottom: 48 }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}>
      {children}
    </ScrollView>
  );
}

function cardStyle(c: Colors, scheme: 'light' | 'dark'): ViewStyle {
  return {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    ...(scheme === 'light'
      ? { shadowColor: '#0C2A20', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }
      : { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }),
  };
}

export function Card({ children, style, onPress }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) {
  const { c, scheme } = useTheme();
  if (!onPress) return <View style={[cardStyle(c, scheme), style]}>{children}</View>;
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={[cardStyle(c, scheme), style]}>
      {children}
    </PressableScale>
  );
}

type TextProps = PropsWithChildren<{ style?: StyleProp<TextStyle>; numberOfLines?: number }>;

export function Display({ children, style }: TextProps) {
  const { c } = useTheme();
  return <Text style={[type.display, { color: c.text }, style]}>{children}</Text>;
}
export function Title({ children, style, numberOfLines }: TextProps) {
  const { c } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[type.title, { color: c.text }, style]}>{children}</Text>;
}
export function Headline({ children, style, numberOfLines }: TextProps) {
  const { c } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[type.headline, { color: c.text }, style]}>{children}</Text>;
}
/** Small uppercase section label. */
export function SectionTitle({ children, style }: TextProps) {
  const { c } = useTheme();
  return <Text style={[type.overline, { color: c.textMuted, marginTop: space.md }, style]}>{children}</Text>;
}
export function Body({ children, muted, style, numberOfLines }: TextProps & { muted?: boolean }) {
  const { c } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[type.body, { color: muted ? c.textMuted : c.text }, style]}>{children}</Text>;
}
export function Caption({ children, style, numberOfLines }: TextProps) {
  const { c } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[type.caption, { color: c.textMuted }, style]}>{children}</Text>;
}

/** `light` is for buttons on the green hero banners (white with dark-green text). */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  /** [iosSymbol, androidSymbol] */
  icon?: [string, string];
}) {
  const { c } = useTheme();
  const look: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: c.onPrimary },
    secondary: { bg: c.primarySoft, fg: c.primary },
    ghost: { bg: 'transparent', fg: c.text, border: c.border },
    danger: { bg: c.accentSoft, fg: c.danger },
    light: { bg: '#D4AF37', fg: '#0B0E12' },
  };
  const { bg, fg, border } = look[variant];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: bg }, border && { borderWidth: 1, borderColor: border }, (disabled || loading) && { opacity: 0.5 }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon ios={icon[0]} android={icon[1]} color={fg} size={20} />}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </PressableScale>
  );
}

/** Labelled text input. `icon` adds a leading symbol; password fields
 * (secureTextEntry) get a show/hide eye. */
export function Field({ label, icon, secureTextEntry, style, ...props }: TextInputProps & { label: string; icon?: [string, string] }) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.caption, { color: c.text, fontWeight: '700' }]}>{label}</Text>
      <View style={[styles.inputBox, { backgroundColor: focused ? c.surface : c.surfaceAlt, borderColor: focused ? c.primary : 'transparent' }, props.multiline && { height: undefined, alignItems: 'flex-start' }]}>
        {icon && <Icon ios={icon[0]} android={icon[1]} size={18} color={focused ? c.primary : c.textMuted} />}
        <TextInput
          placeholderTextColor={c.textMuted}
          selectionColor={c.primary}
          {...props}
          secureTextEntry={!!secureTextEntry && !revealed}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, { color: c.text }, props.multiline && { height: undefined }, style]}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={12}
            onPress={() => setRevealed((r) => !r)}>
            <Icon ios={revealed ? 'eye.slash' : 'eye'} android={revealed ? 'visibility_off' : 'visibility'} size={20} color={c.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Selectable filter chip. */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale
      haptic={false}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        tapHaptic('select');
        onPress();
      }}
      style={[styles.chip, { backgroundColor: selected ? c.primary : c.surface, borderColor: selected ? c.primary : c.border }]}>
      <Text style={[type.caption, { fontWeight: '700', color: selected ? c.onPrimary : c.text }]}>{label}</Text>
    </PressableScale>
  );
}

/** Dot for anything live. */
export function LiveDot({ size = 8 }: { size?: number }) {
  const { c } = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.live }} />;
}

export function StatusPill({ status }: { status: string }) {
  const { c } = useTheme();
  const tone: Record<string, [string, string]> = {
    live: [c.live, c.accentSoft],
    upcoming: [c.info, 'rgba(59,130,246,0.12)'],
    scheduled: [c.info, 'rgba(59,130,246,0.12)'],
    completed: [c.textMuted, c.surfaceAlt],
    awaiting_draw: [c.textMuted, c.surfaceAlt],
  };
  const [fg, bg] = tone[status] ?? [c.textMuted, c.surfaceAlt];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {status === 'live' && <LiveDot size={6} />}
      <Text style={[styles.pillText, { color: fg }]}>{status.replace('_', ' ').toUpperCase()}</Text>
    </View>
  );
}

const AVATAR_TINTS = ['#0B7A57', '#2F6FEB', '#E5484D', '#D98A0B', '#7C5CE0', '#0E8FB8', '#D1457F'];

/** Photo, or initials on a colour picked from the name. */
export function Avatar({ name, uri, size = 44 }: { name: string; uri?: string | null; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const tint = AVATAR_TINTS[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_TINTS.length];
  const initialsView = (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
  if (!uri) return initialsView;
  return <RemoteImage uri={uri} style={{ width: size, height: size, borderRadius: size / 2 }} fallback={initialsView} />;
}

/** Brand gradient banner for page tops. */
export function GradientHero({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { c } = useTheme();
  return (
    <LinearGradient colors={c.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, style]}>
      {children}
    </LinearGradient>
  );
}

/** Tappable row with an icon tile, label, optional badge and chevron (menus, settings). */
export function ListItem({
  label,
  icon,
  tint,
  badge,
  onPress,
  last,
}: {
  label: string;
  icon: [string, string];
  tint?: string;
  badge?: number;
  onPress: () => void;
  last?: boolean;
}) {
  const { c } = useTheme();
  const color = tint ?? c.primary;
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.listItem, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      <View style={[styles.iconTile, { backgroundColor: `${color}1F` }]}>
        <Icon ios={icon[0]} android={icon[1]} color={color} size={18} />
      </View>
      <Text style={[type.headline, { color: c.text, flex: 1 }]}>{label}</Text>
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: c.accent }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Icon ios="chevron.right" android="chevron_right" color={c.textMuted} size={14} />
    </PressableScale>
  );
}

/** Groups ListItems in one rounded card. */
export function ListGroup({ children }: PropsWithChildren) {
  const { c, scheme } = useTheme();
  return <View style={[cardStyle(c, scheme), { padding: 0, gap: 0, overflow: 'hidden' }]}>{children}</View>;
}

/** Loading spinner, error with retry, or empty message — whichever applies. */
export function LoadState({ loading, error, empty, onRetry }: { loading?: boolean; error?: string | null; empty?: ReactNode; onRetry?: () => void }) {
  const { c } = useTheme();
  if (loading) return <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />;
  if (error)
    return (
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <Icon ios="wifi.exclamationmark" android="wifi_off" color={c.textMuted} size={28} />
        <Body muted style={{ textAlign: 'center' }}>{error}</Body>
        {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} />}
      </Card>
    );
  if (empty)
    return (
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <Icon ios="tray" android="inbox" color={c.textMuted} size={28} />
        <Body muted style={{ textAlign: 'center' }}>{empty}</Body>
      </Card>
    );
  return null;
}

export function Row({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  input: { flex: 1, height: 52, fontSize: 16 },
  inputBox: { height: 52, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  hero: { borderRadius: radius.lg, padding: space.xl, gap: space.sm, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  iconTile: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});

// Building blocks that live in their own files.
export { BottomSheet } from '@/components/ui/bottom-sheet';
export { ConfirmProvider, useConfirm, type ConfirmOptions } from '@/components/ui/confirm';
export { DateField } from '@/components/ui/date-field';
export { PlayerRow } from '@/components/ui/player-row';
export { RemoteImage } from '@/components/ui/remote-image';
export { SearchInput, useDebouncedValue } from '@/components/ui/search-input';
export { SelectField, type SelectOption } from '@/components/ui/select-field';
export { SettingGroup, SettingRow } from '@/components/ui/setting-row';
export { SegmentedControl } from '@/components/ui/segmented-control';
export { ToastProvider, useToast } from '@/components/ui/toast';
