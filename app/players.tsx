import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { FriendButton } from '@/components/player/friend-button';
import { Body, Button, Caption, LoadState, PlayerRow, Screen, SearchInput, Title, useConfirm } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useRequireAuth } from '@/lib/auth-gate';
import { useSession } from '@/lib/session';
import type { Club, PlayerProfile } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useFriendships } from '@/lib/use-friendships';

const PAGE = 40;

/** Find Players (#11): the player directory, searchable by name or city. */
export default function PlayersScreen() {
  const { c } = useTheme();
  const { me } = useSession();
  const requireAuth = useRequireAuth();
  const confirm = useConfirm();
  const players = useApi<PlayerProfile[]>('/profiles');
  const clubs = useApi<Club[]>('/clubs');
  const friends = useFriendships();
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const clubName = useMemo(() => new Map(clubs.data?.map((cl) => [cl.id, cl.name])), [clubs.data]);
  const q = query.trim().toLowerCase();
  const matches = (players.data ?? []).filter(
    (p) => !!p.fullName && p.userId !== me?.user.id && (!q || p.fullName.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q))
  );

  const onFriend = (p: PlayerProfile) =>
    requireAuth('to add friends', async () => {
      const relation = friends.relationOf(p.userId);
      if (relation === 'friends' && !(await confirm({ title: `Remove ${p.fullName}?`, message: 'You can add each other again later.', confirmLabel: 'Remove friend', destructive: true }))) return;
      friends.act(p.userId);
    });

  return (
    <Screen refreshing={players.refreshing} onRefresh={() => Promise.all([players.refresh(), friends.list.reload()])}>
      <Title>Player Directory</Title>
      <SearchInput
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setShown(PAGE);
        }}
        placeholder="Search by name or city"
      />
      {players.data && <Caption>{q ? `${matches.length} matching "${query.trim()}"` : `${matches.length} players on CueSphere`}</Caption>}
      {!!friends.error && <Body style={{ color: c.danger }}>{friends.error}</Body>}
      <LoadState
        loading={players.loading}
        error={players.error}
        onRetry={players.refresh}
        empty={players.data && matches.length === 0 && (q ? `No players match "${query.trim()}".` : 'No players yet.')}
      />
      {matches.slice(0, shown).map((p) => (
        <PlayerRow
          key={p.id}
          name={p.fullName}
          photoUrl={p.profilePhotoUrl || null}
          subtitle={p.city || undefined}
          club={p.primaryClubId ? clubName.get(p.primaryClubId) : undefined}
          linked
          onPress={() => router.push(`/player/${p.id}`)}
          right={<FriendButton relation={me ? friends.relationOf(p.userId) : 'none'} busy={friends.busyUserId === p.userId} onPress={() => onFriend(p)} />}
        />
      ))}
      {matches.length > shown && <Button title={`Show more (${matches.length - shown} left)`} variant="ghost" onPress={() => setShown((n) => n + PAGE)} />}
    </Screen>
  );
}
