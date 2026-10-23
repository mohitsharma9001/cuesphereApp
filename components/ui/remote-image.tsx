import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { useTheme } from '@/constants/theme';

/** Remote picture (logo, cover, photo) with disk+memory caching and a fade-in.
 * Missing or broken images show `fallback`, or a soft tile with a photo icon. */
export function RemoteImage({
  uri,
  style,
  fallback,
  contentFit = 'cover',
}: {
  uri?: string | null;
  style: StyleProp<ViewStyle>;
  fallback?: ReactNode;
  contentFit?: 'cover' | 'contain';
}) {
  const { c } = useTheme();
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[{ backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>
        {fallback ?? <Icon ios="photo" android="image" color={c.textMuted} size={22} />}
      </View>
    );
  }
  return (
    <Image
      source={uri}
      recyclingKey={uri}
      contentFit={contentFit}
      transition={200}
      cachePolicy="memory-disk"
      onError={() => setFailed(true)}
      style={[{ backgroundColor: c.surfaceAlt }, style] as never}
    />
  );
}
