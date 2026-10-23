import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tapHaptic } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';

/** Two to five equal segments with the selected one highlighted. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width ? (width - 8) / options.length : 0;

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.pill, padding: 4 }}>
      {segment > 0 && (
        <View
          style={[
            { position: 'absolute', top: 4, bottom: 4, left: 4, width: segment, borderRadius: radius.pill, backgroundColor: c.surface },
            { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
            { transform: [{ translateX: index * segment }] },
          ]}
        />
      )}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              tapHaptic('select');
              onChange(o.value);
            }}
            style={{ flex: 1, paddingVertical: 9, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: selected ? '800' : '600', color: selected ? c.text : c.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
