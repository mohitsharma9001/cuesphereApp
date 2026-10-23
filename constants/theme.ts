/** CueSphere app design — premium dark + gold, matching the logo and the website:
 * near-black backgrounds, layered charcoal cards, gold as the main colour, white text.
 * The app always uses this look (it doesn't follow the phone's light/dark setting). */
const premium = {
  bg: '#0B0E12',
  surface: '#151922',
  surfaceAlt: '#1E232E',
  border: '#272D3A',
  text: '#F5F6F8',
  textMuted: '#9AA3B2',
  primary: '#D4AF37',
  primarySoft: 'rgba(212,175,55,0.14)',
  onPrimary: '#0B0E12',
  accent: '#FF5A5F',
  accentSoft: 'rgba(255,90,95,0.14)',
  info: '#5B9DFF',
  warning: '#F2B33D',
  success: '#3DD68C',
  danger: '#FF5C6C',
  live: '#FF4D5E',
  tabBar: '#0E1117',
  heroGradient: ['#2A2414', '#191C24', '#0F1218'] as const,
};

type Palette = { [K in keyof typeof premium]: (typeof premium)[K] extends readonly string[] ? readonly [string, string, ...string[]] : string };

const light: Palette = premium;
const dark: Palette = premium;

export const palettes: { light: Palette; dark: Palette } = { light, dark };
export type Colors = Palette;

/** Snooker ball colours — the same in both modes. */
export const balls = {
  red: '#D7263D',
  yellow: '#F6C915',
  green: '#1E8F4E',
  brown: '#7A4A24',
  blue: '#1F6FEB',
  pink: '#F48FB1',
  black: '#111111',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const type = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.8 },
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  headline: { fontSize: 16, fontWeight: '700' as const, letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 13, lineHeight: 18 },
  overline: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};

/** Current colours for the phone's light/dark setting. */
export function useTheme(): { c: Colors; scheme: 'light' | 'dark' } {
  return { c: palettes.dark, scheme: 'dark' };
}
