import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { ClubList, ClubRow } from '@/components/browse/club-row';
import type { ClubWithCounts } from '@/components/club-card';
import { Caption, Chip, LoadState, Screen, SearchInput } from '@/components/ui';
import { useSession } from '@/lib/session';
import type { City, IndianState } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useOpenClub } from '@/lib/use-open-club';

type Filter = 'all' | 'mine' | `state:${string}`;

/** Clubs tab (#2): every approved club — search, filter by "my clubs" or state. */
export function BrowseClubs() {
  const { me } = useSession();
  const { openClub, joinClub } = useOpenClub();
  const clubs = useApi<ClubWithCounts[]>('/clubs?include=counts');
  const states = useApi<IndianState[]>('/locations/states');
  const cities = useApi<City[]>('/locations/cities');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  /** "Bengaluru, Karnataka" for each club (or just the state, or nothing). */
  const placeOf = useMemo(() => {
    const stateName = new Map(states.data?.map((s) => [s.code, s.name]));
    const cityName = new Map(cities.data?.map((c) => [c.id, c.name]));
    return (club: ClubWithCounts) =>
      [club.cityId ? cityName.get(club.cityId) : undefined, club.stateCode ? stateName.get(club.stateCode) : undefined].filter(Boolean).join(', ');
  }, [states.data, cities.data]);

  const mine = new Set(me?.memberships.map((m) => m.clubId));
  // Only states that actually have clubs get a chip.
  const clubStates = (states.data ?? []).filter((s) => clubs.data?.some((club) => club.stateCode === s.code));

  const q = query.trim().toLowerCase();
  const shown = (clubs.data ?? [])
    .filter((club) => (filter === 'mine' ? mine.has(club.id) : filter.startsWith('state:') ? club.stateCode === filter.slice(6) : true))
    .filter((club) => !q || [club.name, club.tagline, placeOf(club)].some((text) => text?.toLowerCase().includes(q)))
    // Your clubs first; otherwise the API's order (newest first).
    .sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)));

  const refresh = () => Promise.all([clubs.refresh(), states.reload(), cities.reload()]);

  return (
    <Screen refreshing={clubs.refreshing} onRefresh={refresh}>
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search clubs by name or city" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All clubs" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {mine.size > 0 && <Chip label={`My clubs (${mine.size})`} selected={filter === 'mine'} onPress={() => setFilter('mine')} />}
        {clubStates.map((s) => (
          <Chip key={s.code} label={s.name} selected={filter === `state:${s.code}`} onPress={() => setFilter(`state:${s.code}`)} />
        ))}
      </ScrollView>
      {clubs.data && shown.length > 0 && (
        <Caption>
          {shown.length} {shown.length === 1 ? 'club' : 'clubs'}
          {q ? ` matching "${query.trim()}"` : ''}
        </Caption>
      )}
      <LoadState
        loading={clubs.loading}
        error={clubs.error}
        onRetry={clubs.refresh}
        empty={
          clubs.data &&
          shown.length === 0 &&
          (q ? `No clubs match "${query.trim()}". Try a city like Bengaluru.` : filter === 'mine' ? "You haven't joined a club yet." : 'No clubs here yet.')
        }
      />
      {shown.length > 0 && (
        <ClubList>
          {shown.map((club, i) => (
            <ClubRow
              key={club.id}
              club={club}
              place={placeOf(club)}
              member={mine.has(club.id)}
              onPress={() => openClub(club)}
              onJoin={() => joinClub(club)}
              last={i === shown.length - 1}
            />
          ))}
        </ClubList>
      )}
    </Screen>
  );
}
