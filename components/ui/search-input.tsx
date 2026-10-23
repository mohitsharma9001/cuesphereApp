import { useEffect, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/icon';
import { radius, useTheme } from '@/constants/theme';

/** Rounded search box with a clear (✕) button. */
export function SearchInput({ value, onChangeText, placeholder = 'Search', ...props }: Omit<TextInputProps, 'style'> & { value: string; onChangeText: (text: string) => void }) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 46,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: c.surface,
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? c.primary : c.border,
      }}>
      <Icon ios="magnifyingglass" android="search" color={focused ? c.primary : c.textMuted} size={18} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        selectionColor={c.primary}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={{ flex: 1, color: c.text, fontSize: 16, height: '100%' }}
      />
      {value.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => onChangeText('')}>
          <Icon ios="xmark.circle.fill" android="cancel" color={c.textMuted} size={18} />
        </Pressable>
      )}
    </View>
  );
}

/** `value`, but only after it has stopped changing for `delayMs` — for search-as-you-type. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
