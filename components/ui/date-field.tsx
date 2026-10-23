import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { BottomSheet, Button, Field } from '@/components/ui';
import { radius, type as typo, useTheme } from '@/constants/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1995-05-12" ⇄ a local Date at noon (noon avoids any time-zone day shift). */
function toDate(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null;
}
function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function pretty(ymd: string): string {
  const d = toDate(ymd);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '';
}

/** Date input: Android's native dialog, an iOS spinner in a sheet, or typed YYYY-MM-DD on web. */
export function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
  defaultDate,
  placeholder = 'Choose a date',
}: {
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  /** Where the picker opens while the field is empty (default: today). */
  defaultDate?: Date;
  placeholder?: string;
}) {
  const { c, scheme } = useTheme();
  const [sheet, setSheet] = useState(false);
  const startAt = () => toDate(value) ?? defaultDate ?? new Date();
  const [draft, setDraft] = useState<Date>(startAt);

  if (Platform.OS === 'web') {
    return <Field label={`${label} (YYYY-MM-DD)`} value={value} onChangeText={onChange} placeholder="1995-05-12" autoCapitalize="none" />;
  }

  const open = () => {
    const current = startAt();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toYmd(date));
        },
      });
    } else {
      setDraft(current);
      setSheet(true);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={[typo.caption, { color: c.textMuted, fontWeight: '600' }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? pretty(value) : 'not set'}`}
        onPress={open}
        style={{ height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 16, color: value ? c.text : c.textMuted }}>{value ? pretty(value) : placeholder}</Text>
        <Icon ios="calendar" android="calendar_month" color={c.textMuted} size={18} />
      </Pressable>
      {Platform.OS === 'ios' && (
        <BottomSheet visible={sheet} onClose={() => setSheet(false)} title={label}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            themeVariant={scheme}
            onChange={(_e, d) => d && setDraft(d)}
            style={{ alignSelf: 'stretch' }}
          />
          <Button
            title="Done"
            onPress={() => {
              onChange(toYmd(draft));
              setSheet(false);
            }}
          />
        </BottomSheet>
      )}
    </View>
  );
}
