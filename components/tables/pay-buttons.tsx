import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { PressableScale, Row } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { METHOD_LABEL, type PaymentMethod } from '@/lib/tables';

/** [Cash] [UPI] [Card] — tap how they paid. */
export function PayButtons({ onPay, disabled }: { onPay: (method: PaymentMethod) => Promise<unknown>; disabled?: boolean }) {
  const { c } = useTheme();
  const [busy, setBusy] = useState<PaymentMethod | null>(null);
  return (
    <Row style={{ gap: 8 }}>
      {(['cash', 'upi', 'card'] as const).map((m) => (
        <PressableScale
          key={m}
          accessibilityRole="button"
          accessibilityLabel={`Paid by ${METHOD_LABEL[m]}`}
          disabled={disabled || !!busy}
          onPress={async () => {
            setBusy(m);
            try {
              await onPay(m);
            } finally {
              setBusy(null);
            }
          }}
          style={{ flex: 1, height: 38, borderRadius: radius.pill, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
          {busy === m ? <ActivityIndicator color={c.primary} size="small" /> : <Text style={{ color: c.primary, fontWeight: '800' }}>{METHOD_LABEL[m]}</Text>}
        </PressableScale>
      ))}
    </Row>
  );
}
