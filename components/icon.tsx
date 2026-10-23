import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/** SF Symbol on iOS, Material Symbol name on Android and web. */
export function Icon({ ios, android, color, size = 24 }: { ios: string; android: string; color: ColorValue; size?: number }) {
  return <SymbolView name={{ ios, android, web: android } as SymbolViewProps['name']} tintColor={color} size={size} />;
}
