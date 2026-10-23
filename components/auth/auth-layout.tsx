import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand';
import { balls, radius, useTheme } from '@/constants/theme';

/** Full-screen sign-in/sign-up layout: felt-green header with the logo, then a
 * white sheet with the form. `footer` sits under the sheet (switch screens link). */
export function AuthLayout({ title, subtitle, footer, children }: PropsWithChildren<{ title: string; subtitle: string; footer: ReactNode }>) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    // automaticallyAdjustKeyboardInsets (iOS) insets only while the keyboard is really up; a
    // KeyboardAvoidingView kept stale padding with the simulator's hardware keyboard.
    // Android resizes the window for the keyboard on its own.
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="never">
      <LinearGradient colors={c.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 36, paddingBottom: 64, paddingHorizontal: 24, gap: 14 }}>
        {/* Faint balls on the cloth, for texture. */}
        <View pointerEvents="none" style={{ position: 'absolute', right: -30, top: insets.top + 10, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 70, bottom: 30, width: 18, height: 18, borderRadius: 9, backgroundColor: balls.red, opacity: 0.9 }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 40, bottom: 52, width: 18, height: 18, borderRadius: 9, backgroundColor: balls.yellow, opacity: 0.9 }} />
        <BrandMark />
        <View style={{ gap: 4 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 }}>CueSphere</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>Snooker & pool — clubs, tournaments and friends.</Text>
        </View>
      </LinearGradient>
      <View style={{ flex: 1, marginTop: -28, backgroundColor: c.surface, borderTopLeftRadius: radius.lg + 8, borderTopRightRadius: radius.lg + 8, paddingHorizontal: 24, paddingTop: 28, paddingBottom: insets.bottom + 24, gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: c.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
          <Text style={{ color: c.textMuted, fontSize: 15 }}>{subtitle}</Text>
        </View>
        {children}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'center', paddingTop: 8 }}>{footer}</View>
      </View>
    </ScrollView>
  );
}
