import { createContext, use, useCallback, useRef, useState, type PropsWithChildren } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Body, Button, Title } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for deleting / logging out / rejecting. */
  destructive?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<Confirm | null>(null);

/** `const confirm = useConfirm(); if (await confirm({ title: 'Log out?' })) …` */
export function useConfirm(): Confirm {
  const confirm = use(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return confirm;
}

/** Renders one in-app confirm dialog (styled like the app, and it works on web,
 * where React Native's Alert does nothing). */
export function ConfirmProvider({ children }: PropsWithChildren) {
  const { c } = useTheme();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>(
    (next) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false); // a newer dialog replaces an open one
        resolver.current = resolve;
        setOptions(next);
      }),
    []
  );

  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext value={confirm}>
      {children}
      <Modal visible={!!options} transparent animationType="none" onRequestClose={() => finish(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: space.xl }}>
          <Pressable accessibilityLabel="Cancel" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={() => finish(false)} />
          {options && (
            <View
             
              accessibilityRole="alert"
              style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.md }}>
              <Title>{options.title}</Title>
              {!!options.message && <Body muted>{options.message}</Body>}
              <View style={{ gap: 10, marginTop: space.sm }}>
                <Button title={options.confirmLabel ?? 'Confirm'} variant={options.destructive ? 'danger' : 'primary'} onPress={() => finish(true)} />
                <Button title={options.cancelLabel ?? 'Cancel'} variant="ghost" onPress={() => finish(false)} />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </ConfirmContext>
  );
}
