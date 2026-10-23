import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, Caption, Headline, LiveDot, PressableScale, RemoteImage, Row } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { formatDateRange } from '@/lib/format';
import type { Tournament } from '@/lib/types';

/** Tournament in the all-clubs list: cover, name, club, dates, fee/prize,
 * how full it is, and a Register / Registered / Full / Closed action. */
export function TournamentCard({ tournament: t, onRegister, clubSlug: slugOverride }: { tournament: Tournament; onRegister: (t: Tournament) => void; clubSlug?: string }) {
  const { c, scheme } = useTheme();
  const clubSlug = slugOverride ?? t.club?.slug;
  const registered = t.registeredCount ?? 0;
  const full = registered >= t.maxPlayers;
  const canRegister = t.status === 'upcoming' && t.registrationOpen && !full && !t.isRegistered;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t.name}${t.club ? ` at ${t.club.name}` : ''}`}
      onPress={() => clubSlug && router.push(`/tournament/${clubSlug}/${t.slug}`)}
      style={{
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...(scheme === 'light'
          ? { shadowColor: '#0C2A20', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 }
          : { borderWidth: 1, borderColor: c.border }),
      }}>
      <View>
        <RemoteImage
          uri={t.imageUrl || null}
          style={{ width: '100%', height: 130 }}
          fallback={
            <LinearGradient colors={c.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Icon ios="trophy.fill" android="emoji_events" color="rgba(255,255,255,0.85)" size={40} />
            </LinearGradient>
          }
        />
        {t.status === 'live' && (
          <Row style={{ position: 'absolute', top: 10, left: 10, gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <LiveDot size={7} />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
              LIVE{t.liveMatchCount ? ` · ${t.liveMatchCount} match${t.liveMatchCount === 1 ? '' : 'es'}` : ''}
            </Text>
          </Row>
        )}
      </View>

      <View style={{ padding: 14, gap: 8 }}>
        <Headline numberOfLines={2}>{t.name}</Headline>
        {t.club && (
          <Row style={{ gap: 6 }}>
            <Avatar name={t.club.name} uri={t.club.logoUrl || null} size={20} />
            <Caption numberOfLines={1} style={{ flex: 1 }}>
              {[t.club.name, formatDateRange(t.startDate, t.endDate)].filter(Boolean).join(' · ')}
            </Caption>
          </Row>
        )}
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          <Tag icon={['indianrupeesign.circle', 'payments']} text={`Entry ${t.entryFee || 'Free'}`} />
          {!!t.prizePool && <Tag icon={['trophy', 'emoji_events']} text={`Prize ${t.prizePool}`} />}
          <Tag icon={['circle.grid.2x1', 'sports']} text={`Bo${t.bestOf}`} />
        </Row>

        <Row style={{ gap: 12, marginTop: 2 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (registered / Math.max(1, t.maxPlayers)) * 100)}%`, height: '100%', backgroundColor: full ? c.warning : c.primary }} />
            </View>
            <Caption>
              {registered}/{t.maxPlayers} registered
            </Caption>
          </View>
          <Action
            label={t.isRegistered ? '✓ Registered' : canRegister ? 'Register' : t.status !== 'upcoming' ? '' : full ? 'Full' : 'Closed'}
            primary={canRegister}
            done={!!t.isRegistered}
            onPress={canRegister ? () => onRegister(t) : undefined}
          />
        </Row>
      </View>
    </PressableScale>
  );
}

function Tag({ icon, text }: { icon: [string, string]; text: string }) {
  const { c } = useTheme();
  return (
    <Row style={{ gap: 4, backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
      <Icon ios={icon[0]} android={icon[1]} color={c.textMuted} size={12} />
      <Caption style={{ color: c.text, fontWeight: '600', fontSize: 12 }}>{text}</Caption>
    </Row>
  );
}

function Action({ label, primary, done, onPress }: { label: string; primary: boolean; done: boolean; onPress?: () => void }) {
  const { c } = useTheme();
  if (!label) return null;
  const bg = primary ? c.primary : done ? c.primarySoft : c.surfaceAlt;
  const fg = primary ? c.onPrimary : done ? c.primary : c.textMuted;
  const pill = (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 16, height: 36, justifyContent: 'center' }}>
      <Text style={{ color: fg, fontWeight: '800', fontSize: 14 }}>{label}</Text>
    </View>
  );
  if (!onPress) return pill;
  return (
    <PressableScale accessibilityRole="button" hitSlop={8} onPress={onPress}>
      {pill}
    </PressableScale>
  );
}
