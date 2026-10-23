import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { SearchInput } from '@/components/ui/search-input';
import { radius, type, useTheme } from '@/constants/theme';

export interface SelectOption {
  value: string;
  label: string;
}

/** A field that opens a searchable list in a bottom sheet (states, cities…).
 * Looks like Field so forms stay consistent. */
export function SelectField({
  label,
  icon,
  value,
  options,
  onChange,
  placeholder = 'Choose…',
  disabledHint,
  loading,
}: {
  label: string;
  icon?: [string, string];
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** When set the field is disabled and shows this instead (e.g. "Choose a state first"). */
  disabledHint?: string;
  loading?: boolean;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const disabled = !!disabledHint;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.caption, { color: c.text, fontWeight: '700' }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'not chosen'}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.box, { backgroundColor: c.surfaceAlt, opacity: disabled ? 0.55 : pressed ? 0.7 : 1 }]}>
        {icon && <Icon ios={icon[0]} android={icon[1]} size={18} color={c.textMuted} />}
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, color: selected ? c.text : c.textMuted }}>
          {disabled ? disabledHint : (selected?.label ?? placeholder)}
        </Text>
        {loading ? <ActivityIndicator color={c.textMuted} /> : <Icon ios="chevron.down" android="expand_more" size={16} color={c.textMuted} />}
      </Pressable>

      <BottomSheet visible={open} onClose={close} title={label}>
        {options.length > 8 && <SearchInput value={query} onChangeText={setQuery} placeholder={`Search ${label.toLowerCase()}`} autoFocus={false} />}
        {shown.length === 0 && <Text style={[type.body, { color: c.textMuted, textAlign: 'center', paddingVertical: 16 }]}>{loading ? 'Loading…' : 'Nothing matches.'}</Text>}
        <View style={{ borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
          {shown.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(o.value);
                  close();
                }}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  (pressed || isSelected) && { backgroundColor: c.primarySoft },
                ]}>
                <Text style={[type.body, { flex: 1, color: isSelected ? c.primary : c.text, fontWeight: isSelected ? '700' : '400' }]}>{o.label}</Text>
                {isSelected && <Icon ios="checkmark" android="check" size={18} color={c.primary} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 52, borderRadius: radius.md, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
});
