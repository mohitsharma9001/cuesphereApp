import { Text, View } from 'react-native';

import { Row } from '@/components/ui';
import { useTheme } from '@/constants/theme';

/** Recent results as little W / L tiles, newest first. */
export function FormChips({ form }: { form: string[] }) {
  const { c } = useTheme();
  return (
    <Row style={{ gap: 5 }}>
      {form.map((f, i) => (
        <View key={i} style={{ width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: f === 'W' ? 'rgba(22,163,74,0.15)' : c.surfaceAlt }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: f === 'W' ? c.success : c.textMuted }}>{f}</Text>
        </View>
      ))}
    </Row>
  );
}
