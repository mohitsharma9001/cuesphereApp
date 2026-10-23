import { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Title } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';

/** Sheet at the bottom of the screen (no animation). Close it by tapping outside
 * or with the Android back button. */
export function BottomSheet({ visible, onClose, title, children }: PropsWithChildren<{ visible: boolean; onClose: () => void; title?: string }>) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const close = onClose;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={close} />
        </View>
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.lg + 6, borderTopRightRadius: radius.lg + 6, maxHeight: '85%', paddingBottom: Math.max(insets.bottom, 16) }}>
          <View style={{ paddingTop: 10, paddingBottom: 6, paddingHorizontal: 20, gap: 10 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border }} />
            {!!title && <Title>{title}</Title>}
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, gap: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
