import { View } from 'react-native';

import { balls } from '@/constants/theme';

export type BallColor = keyof typeof balls;
export const BALL_VALUES: Record<BallColor, number> = { red: 1, yellow: 2, green: 3, brown: 4, blue: 5, pink: 6, black: 7 };

export function isBallColor(value: string): value is BallColor {
  return value in BALL_VALUES;
}

/** A glossy snooker ball. */
export function Ball({ color, size = 18 }: { color: BallColor; size?: number }) {
  return (
    <View
      accessibilityLabel={`${color} ball`}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: balls[color], borderWidth: color === 'black' ? 1 : 0, borderColor: 'rgba(255,255,255,0.25)' }}>
      <View style={{ position: 'absolute', top: size * 0.14, left: size * 0.2, width: size * 0.32, height: size * 0.24, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.5)' }} />
    </View>
  );
}
