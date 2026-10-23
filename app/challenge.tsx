import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import {
  Avatar,
  BottomSheet,
  Body,
  Button,
  Caption,
  Card,
  Field,
  Headline,
  ListGroup,
  ListItem,
  PlayerRow,
  PressableScale,
  Row,
  Screen,
  SearchInput,
  SectionTitle,
  SegmentedControl,
  Title,
  useDebouncedValue,
  useToast,
} from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { WEBSITE_URL } from '@/lib/config';
import { useSession } from '@/lib/session';
import type { City, Club, IndianState, PlayerProfile } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface Opponent {
  id: string;
  name: string;
  memberId?: string;
  city?: string;
  photoUrl?: string | null;
}

const BEST_OF = ['1', '3', '5', '7'] as const;
const INVITE_TEXT = `Join me on CueSphere so we can record our snooker matches: ${WEBSITE_URL}/register`;

/** Challenge a Player (#13). Opened from Play, or from a profile with ?opponent=<profileId>. */
export default function ChallengeScreen() {
  const { c } = useTheme();
  const { me } = useSession();
  const toast = useToast();
  const { opponent: preset } = useLocalSearchParams<{ opponent?: string }>();
  const presetProfile = useApi<PlayerProfile>(preset ? `/profiles/${preset}` : null);

  const [picked, setPicked] = useState<Opponent | null>(null);
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim(), 300);
  const results = useApi<Opponent[]>(me && !picked && q.length >= 2 ? `/friendlies/players/search?q=${encodeURIComponent(q)}` : null);
  const searching = query.trim().length >= 2 && (q !== query.trim() || results.loading);

  const [bestOf, setBestOf] = useState<(typeof BEST_OF)[number]>('3');
  const [venueId, setVenueId] = useState<string | null>(null);
  const [venueSheet, setVenueSheet] = useState(false);
  const [table, setTable] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clubs = useApi<Club[]>('/clubs');
  const states = useApi<IndianState[]>('/locations/states');
  const cities = useApi<City[]>('/locations/cities');
  const venues = useMemo(() => {
    const stateName = new Map(states.data?.map((s) => [s.code, s.name]));
    const cityName = new Map(cities.data?.map((ci) => [ci.id, ci.name]));
    return (clubs.data ?? [])
      .map((cl) => {
        const place = [cl.cityId ? cityName.get(cl.cityId) : undefined, cl.stateCode ? stateName.get(cl.stateCode) : undefined].filter(Boolean).join(', ');
        return { id: cl.id, name: cl.name, place };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clubs.data, states.data, cities.data]);

  // The opponent from ?opponent= counts as picked until the user changes it.
  const presetOpponent: Opponent | null =
    presetProfile.data?.fullName && presetProfile.data.id !== me?.profile?.id
      ? { id: presetProfile.data.id, name: presetProfile.data.fullName, memberId: presetProfile.data.memberId, city: presetProfile.data.city, photoUrl: presetProfile.data.profilePhotoUrl }
      : null;
  const [presetDismissed, setPresetDismissed] = useState(false);
  const opponent = picked ?? (presetDismissed ? null : presetOpponent);

  if (!me) {
    return (
      <Screen>
        <Title>Challenge a player</Title>
        <Body muted>Log in to challenge other players.</Body>
        <Button title="Log in" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  async function send() {
    if (!opponent) return;
    const tableNumber = table.trim() ? Number(table) : 0;
    if (table.trim() && (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 99)) {
      setError('Table must be a number from 1 to 99.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const match = await api<{ id: string }>('/friendlies', { method: 'POST', body: { opponentId: opponent.id, bestOf: Number(bestOf), venueClubId: venueId, tableNumber } });
      toast(`Challenge sent to ${opponent.name}`);
      router.replace(`/friendly/${match.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the challenge.');
    } finally {
      setSending(false);
    }
  }

  const venue = venues.find((v) => v.id === venueId);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Challenge' }} />
      <Title>Challenge a player</Title>

      <SectionTitle>Opponent</SectionTitle>
      {opponent ? (
        <Card style={{ borderWidth: 1.5, borderColor: c.primary }}>
          <Row>
            <Avatar name={opponent.name} uri={opponent.photoUrl} size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <Headline numberOfLines={1}>{opponent.name}</Headline>
              <Caption>{[opponent.memberId, opponent.city].filter(Boolean).join(' · ')}</Caption>
            </View>
            <PressableScale
              onPress={() => {
                setPicked(null);
                setPresetDismissed(true);
              }}>
              <Caption style={{ color: c.primary, fontWeight: '800' }}>Change</Caption>
            </PressableScale>
          </Row>
        </Card>
      ) : (
        <>
          <SearchInput value={query} onChangeText={setQuery} placeholder="Name, member ID or mobile number" autoFocus={!preset} />
          {searching && <ActivityIndicator color={c.primary} />}
          {!searching &&
            results.data?.map((r) => (
              <PlayerRow key={r.id} name={r.name} photoUrl={r.photoUrl} subtitle={[r.memberId, r.city].filter(Boolean).join(' · ')} linked onPress={() => setPicked(r)} />
            ))}
          {!searching && q.length >= 2 && results.data?.length === 0 && (
            <Card style={{ gap: 8 }}>
              <Headline>No player found</Headline>
              <Caption>Not on CueSphere yet? Send them an invite.</Caption>
              <PressableScale
                accessibilityRole="link"
                onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(INVITE_TEXT)}`)}
                style={{ backgroundColor: '#25D366', borderRadius: radius.pill, height: 44, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Icon ios="message.fill" android="chat" color="#FFFFFF" size={16} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Invite on WhatsApp</Text>
              </PressableScale>
            </Card>
          )}
          {query.trim().length < 2 && <Caption>Type at least 2 letters. A 10-digit mobile number finds an exact match.</Caption>}
        </>
      )}

      <SectionTitle>Format</SectionTitle>
      <SegmentedControl value={bestOf} onChange={setBestOf} options={BEST_OF.map((n) => ({ value: n, label: `Bo${n}` }))} />

      <SectionTitle>Where (optional)</SectionTitle>
      <PressableScale accessibilityRole="button" onPress={() => setVenueSheet(true)}>
        <Row style={{ height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 16, justifyContent: 'space-between' }}>
          <Text style={{ color: venue ? c.text : c.textMuted, fontSize: 16, flex: 1 }} numberOfLines={1}>
            {venue ? `${venue.name}${venue.place ? ` · ${venue.place}` : ''}` : 'Anywhere'}
          </Text>
          <Icon ios="chevron.down" android="expand_more" color={c.textMuted} size={14} />
        </Row>
      </PressableScale>
      <Field label="Table (optional)" value={table} onChangeText={setTable} keyboardType="number-pad" placeholder="e.g. 3" maxLength={2} />

      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button
        title={opponent ? `➤ Challenge ${opponent.name.split(' ')[0]}` : 'Pick an opponent'}
        onPress={send}
        loading={sending}
        disabled={!opponent}
      />

      <BottomSheet visible={venueSheet} onClose={() => setVenueSheet(false)} title="Where are you playing?">
        <ListGroup>
          <ListItem label="Anywhere" icon={['globe', 'public']} onPress={() => { setVenueId(null); setVenueSheet(false); }} last={venues.length === 0} />
          {venues.map((v, i) => (
            <ListItem
              key={v.id}
              label={`${v.id === venueId ? '✓ ' : ''}${v.name}${v.place ? ` · ${v.place}` : ''}`}
              icon={['building.2.fill', 'store']}
              onPress={() => {
                setVenueId(v.id);
                setVenueSheet(false);
              }}
              last={i === venues.length - 1}
            />
          ))}
        </ListGroup>
      </BottomSheet>
    </Screen>
  );
}
