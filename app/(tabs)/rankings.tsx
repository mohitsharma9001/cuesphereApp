import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Caption, Chip, Headline, LoadState, PlayerRow, Screen, SearchInput, SelectField, Title } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useSession } from '@/lib/session';
import type { City, IndianState, RankingEntry } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface Rankings {
  state: string;
  city: string | null;
  /** Cities in this state that have ranked players — the only city chips worth showing. */
  rankedCityIds: string[];
  entries: RankingEntry[];
}

/** Rankings (#4): best players by state, or by city within it. Players count
 * in the state/city of the club where they played. */
export default function RankingsScreen() {
  const { c } = useTheme();
  const { me } = useSession();
  const states = useApi<IndianState[]>('/locations/states?active=true');
  const [pickedState, setPickedState] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Karnataka first (where CueSphere's clubs started) until the player picks another state.
  const state = pickedState ?? (states.data?.find((s) => s.code === 'KA') ?? states.data?.[0])?.code ?? null;
  const stateName = states.data?.find((s) => s.code === state)?.name ?? '';
  const cities = useApi<City[]>(state ? `/locations/cities?state=${state}` : null);
  const rankings = useApi<Rankings>(state ? `/stats/rankings?state=${state}${cityId ? `&city=${cityId}` : ''}` : null);

  // City chips: only cities with ranked players (from the state-wide response).
  const stateWide = useApi<Rankings>(state && cityId ? `/stats/rankings?state=${state}` : null);
  const rankedIds = new Set((cityId ? stateWide.data : rankings.data)?.rankedCityIds ?? []);
  const cityChips = (cities.data ?? []).filter((city) => rankedIds.has(city.id));
  const cityName = cities.data?.find((city) => city.id === cityId)?.name;

  const q = query.trim().toLowerCase();
  const entries = (rankings.data?.entries ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));

  const pickState = (code: string) => {
    setPickedState(code);
    setCityId(null); // a city belongs to one state
  };

  return (
    <Screen refreshing={rankings.refreshing} onRefresh={() => Promise.all([rankings.refresh(), cities.reload()])}>
      <View style={{ gap: 4 }}>
        <Caption style={{ fontWeight: '800', letterSpacing: 1.2 }}>RANKINGS</Caption>
        <Title>Best players in {cityName ?? (stateName || '…')}</Title>
        <Caption>50 pts a win, 10 a loss. Friendlies don&apos;t count.</Caption>
      </View>

      <SelectField
        label="State"
        icon={['map', 'map']}
        value={state}
        loading={states.loading}
        options={(states.data ?? []).map((s) => ({ value: s.code, label: s.name }))}
        onChange={pickState}
      />
      {cityChips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={`All ${stateName}`} selected={!cityId} onPress={() => setCityId(null)} />
          {cityChips.map((city) => (
            <Chip key={city.id} label={city.name} selected={city.id === cityId} onPress={() => setCityId(city.id)} />
          ))}
        </ScrollView>
      )}

      <SearchInput value={query} onChangeText={setQuery} placeholder="Find a player" />
      <LoadState
        loading={states.loading || rankings.loading}
        error={states.error ?? rankings.error}
        onRetry={rankings.refresh}
        empty={rankings.data && entries.length === 0 && (q ? `No player matching "${query.trim()}".` : `No ranked players in ${cityName ?? stateName} yet.`)}
      />
      {entries.map((e, i) => (
        <View key={e.playerId}>
          <PlayerRow
            rank={e.rank}
            name={e.name}
            photoUrl={e.photoUrl || null}
            subtitle={`${e.wins}W · ${Math.max(0, e.matchesPlayed - e.wins)}L · HB ${e.highestBreak}`}
            highlight={e.playerId === me?.profile?.id}
            onPress={() => router.push(`/player/${e.playerId}`)}
            right={
              <View style={{ alignItems: 'flex-end' }}>
                <Headline style={{ color: c.primary }}>{e.points}</Headline>
                <Caption>pts</Caption>
              </View>
            }
          />
        </View>
      ))}
      {!!rankings.data?.entries.length && <Caption style={{ textAlign: 'center', marginTop: 4 }}>Players are ranked in the state/city of the club where they played.</Caption>}
    </Screen>
  );
}
