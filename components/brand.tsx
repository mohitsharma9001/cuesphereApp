import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

const LOGO = require('@/assets/images/cuesphere-logo.png');

/** The CueSphere logo (same artwork as the website): gold "C" around an 8-ball, in a circle. */
export function BrandMark({ size = 64 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: '#000000',
        borderWidth: Math.max(1, size / 32),
        borderColor: 'rgba(212,175,55,0.55)',
      }}>
      <Image source={LOGO} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="CueSphere logo" />
    </View>
  );
}

/** The website's brand colours (cuesphere/src/app/globals.css): near-black and gold. */
export const BRAND = { dark: '#0B0E12', darkEdge: '#171A21', gold: '#D4AF37' };

/** Home's app bar, like the website header: the page's near-black with a hairline gold edge. */
export function BrandHeaderBackground() {
  return <View style={{ flex: 1, backgroundColor: BRAND.dark, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(212,175,55,0.35)' }} />;
}

/** Logo + "Cue" in gold and "Sphere" in white, as on the website. */
export function BrandHeaderTitle() {
  return (
    <View accessibilityRole="header" accessibilityLabel="CueSphere" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <BrandMark size={34} />
      <Text style={{ fontSize: 22, fontWeight: '900', letterSpacing: -0.4, color: BRAND.gold }}>
        Cue<Text style={{ color: '#FFFFFF' }}>Sphere</Text>
      </Text>
    </View>
  );
}
