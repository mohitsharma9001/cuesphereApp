import { createContext, use, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { tapHaptic } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';

type Kind = 'success' | 'error' | 'info';
interface ToastState {
  id: number;
  message: string;
  kind: Kind;
}
type Show = (message: string, kind?: Kind) => void;

const ToastContext = createContext<Show | null>(null);

/** `const toast = useToast(); toast('Saved')` — a short banner at the top. */
export function useToast(): Show {
  const show = use(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback<Show>((message, kind = 'success') => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, kind });
    tapHaptic(kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'light');
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const tint = toast?.kind === 'error' ? c.danger : toast?.kind === 'info' ? c.info : c.primary;
  const icon: [string, string] = toast?.kind === 'error' ? ['exclamationmark.circle.fill', 'error'] : toast?.kind === 'info' ? ['info.circle.fill', 'info'] : ['checkmark.circle.fill', 'check_circle'];

  return (
    <ToastContext value={show}>
      {children}
      {toast && (
        <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, alignItems: 'center' }}>
          <View
            key={toast.id}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: c.surface,
              borderRadius: radius.pill,
              paddingHorizontal: 16,
              paddingVertical: 11,
              borderWidth: 1,
              borderColor: c.border,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}>
            <Icon ios={icon[0]} android={icon[1]} color={tint} size={18} />
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{toast.message}</Text>
          </View>
        </View>
      )}
    </ToastContext>
  );
}
