import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { RegisterSheet } from '@/components/tournament/register-sheet';
import { Avatar, Body, Button, Caption, Card, GradientHero, Headline, LoadState, PlayerRow, PressableScale, RemoteImage, Row, Screen, SectionTitle, SegmentedControl, StatusPill } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { useRequireAuth } from '@/lib/auth-gate';
import { useOwnerMode } from '@/lib/owner-mode';
import { formatDateRange } from '@/lib/format';
import { liveMatchChannel, useLiveSignal } from '@/lib/live';
import { viewerProfileCompletion } from '@/lib/profile';
import { useSession } from '@/lib/session';
import type { Match, Registration, Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface ResultPlayer {
  id: string;
  name: string;
}
interface Draw {
  drawReleased: boolean;
  matches: Match[];
  results: { champion: ResultPlayer | null; runnerUp: ResultPlayer | null; semifinalists: ResultPlayer[] };
}

/** Why you can't register, in words (the API sends codes). */
const NOT_ELIGIBLE: Record<string, string> = {
  incomplete_profile: 'Complete your profile (name, mobile, photo…) to register.',
  closed: 'Registrations are closed for this tournament.',
  already_registered: 'You’re already registered.',
  full: 'This tournament is full.',
};
const PLACES = ['🥇', '🥈', '🥉'];

/** Tournament Details & Register (#19). */
export default function TournamentScreen() {
  const { c } = useTheme();
  const { clubSlug, slug } = useLocalSearchParams<{ clubSlug: string; slug: string }>();
  const { me } = useSession();
  const requireAuth = useRequireAuth();
  const { isOwner, clubs: owned } = useOwnerMode();
  const base = `/clubs/${clubSlug}/tournaments/${slug}`;
  const tournament = useApi<Tournament>(base);
  const id = tournament.data?.id;
  const entries = useApi<Registration[]>(id ? `${base}/registrations` : null);
  const draw = useApi<Draw>(id ? `/matches/tournaments/${id}` : null);
  const eligibility = useApi<{ ok: boolean; reason?: string }>(me && id ? `${base}/eligibility` : null);
  const friends = useApi<{ count: number }>(me && id ? `${base}/friends-registered` : null);
  const [justRegistered, setJustRegistered] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tab, setTab] = useState<'draw' | 'results' | 'players'>('draw');

  // Refresh scores when the live match in this tournament changes.
  const liveMatch = draw.data?.matches.find((m) => m.status === 'live');
  useLiveSignal(liveMatch ? liveMatchChannel(liveMatch.id) : null, draw.reload);

  const t = tournament.data;
  const registered = !!me?.profile && !!entries.data?.some((r) => r.playerId === me.profile?.id);
  const rounds = groupByRound(draw.data?.matches ?? []);
  const results = draw.data?.results;
  const hasResults = !!results?.champion || !!results?.runnerUp || !!results?.semifinalists.length;
  // Like the website, the profile check is ours: the API's eligibility doesn't cover it
  // (registering itself does, and would refuse with "Complete your profile…").
  const profileDone = !me || viewerProfileCompletion(me.profile, me.user.email).isComplete;
  const notEligible = !profileDone ? 'incomplete_profile' : eligibility.data?.ok === false ? eligibility.data.reason : undefined;
  const players = entries.data ?? [];

  const refresh = () => Promise.all([tournament.refresh(), entries.reload(), draw.reload(), eligibility.reload(), friends.reload()]);

  return (
    <Screen refreshing={tournament.refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: t?.name ?? '' }} />
      <LoadState loading={tournament.loading} error={tournament.error} onRetry={tournament.refresh} />
      {t && (
        <>
          {!!t.imageUrl && <RemoteImage uri={t.imageUrl} style={{ width: '100%', height: 180, borderRadius: radius.lg }} />}
          <GradientHero style={t.imageUrl ? { marginTop: -56, marginHorizontal: 12 } : undefined}>
            <StatusPill status={t.status} />
            <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.4 }}>{t.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.88)' }}>
              {['📅 ' + (formatDateRange(t.startDate, t.endDate) || 'Dates to be announced'), t.location && `📍 ${t.location}`].filter(Boolean).join('   ')}
            </Text>
          </GradientHero>

          <Row style={{ gap: 10 }}>
            <InfoTile label="Entry" value={t.entryFee || 'Free'} />
            <InfoTile label="Prize" value={t.prizePool || '—'} />
            <InfoTile label="Format" value={`Bo${t.bestOf}`} />
          </Row>

          {!!t.prizeBreakdown?.length && (
            <Card style={{ gap: 6 }}>
              <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>PRIZE BREAKDOWN</Caption>
              {t.prizeBreakdown.map((p, i) => (
                <Row key={`${p.label}-${i}`} style={{ justifyContent: 'space-between' }}>
                  <Body>
                    {PLACES[i] ? `${PLACES[i]} ` : ''}
                    {p.label}
                  </Body>
                  <Headline>{p.amount}</Headline>
                </Row>
              ))}
            </Card>
          )}

          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Caption style={{ fontWeight: '700' }}>{t.format}</Caption>
              <Caption>
                Registered ({t.registeredCount ?? 0}/{t.maxPlayers})
              </Caption>
            </Row>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, ((t.registeredCount ?? 0) / Math.max(1, t.maxPlayers)) * 100)}%`, height: '100%', backgroundColor: c.primary }} />
            </View>
            {players.length > 0 && (
              <PressableScale onPress={() => setTab('players')}>
                <Row style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {players.slice(0, 8).map((r, i) => (
                      <View key={r.id} style={{ marginLeft: i ? -10 : 0, borderRadius: 999, borderWidth: 2, borderColor: c.surface }}>
                        <Avatar name={r.player?.fullName || 'Player'} uri={r.player?.profilePhotoUrl || null} size={30} />
                      </View>
                    ))}
                  </View>
                  {players.length > 8 && <Caption>+{players.length - 8}</Caption>}
                  {!!friends.data?.count && (
                    <Caption style={{ color: c.primary, fontWeight: '800' }}>
                      · {friends.data.count} friend{friends.data.count === 1 ? '' : 's'} registered
                    </Caption>
                  )}
                </Row>
              </PressableScale>
            )}
          </Card>
          {!!t.description && <Body>{t.description}</Body>}

          {isOwner ? (
            owned.some((o) => o.slug === clubSlug) && (
              <Button title="Manage in Club Admin" variant="secondary" icon={['checkmark.shield.fill', 'admin_panel_settings']} onPress={() => router.push(`/club/${clubSlug}/staff/tournament/${t.id}`)} />
            )
          ) : registered ? (
            <Card style={{ backgroundColor: c.primarySoft }}>
              <Headline style={{ color: c.primary }}>✓ You&apos;re registered</Headline>
              {justRegistered && <Caption>You&apos;re in. Good luck!</Caption>}
            </Card>
          ) : t.status === 'upcoming' && t.registrationOpen ? (
            me ? (
              <>
                <Button title="Register now" icon={['checkmark.circle.fill', 'check_circle']} onPress={() => setConfirming(true)} disabled={!!notEligible} />
                {notEligible && (
                  <Card style={{ backgroundColor: c.accentSoft, gap: 8 }}>
                    <Body>{NOT_ELIGIBLE[notEligible] ?? 'You can’t register for this tournament.'}</Body>
                    {notEligible === 'incomplete_profile' && <Button title="Complete your profile" variant="secondary" onPress={() => router.push('/profile-edit')} />}
                  </Card>
                )}
              </>
            ) : (
              <Button title="Register now" icon={['checkmark.circle.fill', 'check_circle']} onPress={() => requireAuth('to register for this tournament', () => setConfirming(true))} />
            )
          ) : t.status === 'upcoming' ? (
            <Caption style={{ textAlign: 'center' }}>Registrations are closed.</Caption>
          ) : null}
        </>
      )}

      {t && (
        <View style={{ marginTop: 8 }}>
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'draw', label: 'Draw' },
              { value: 'results', label: 'Results' },
              { value: 'players', label: `Players (${players.length})` },
            ]}
          />
        </View>
      )}

      {tab === 'draw' && t && rounds.length === 0 && <Caption style={{ textAlign: 'center' }}>The draw hasn&apos;t been published yet.</Caption>}
      {tab === 'draw' &&
        rounds.map(([round, matches]) => (
          <View key={round} style={{ gap: 8 }}>
            <SectionTitle style={{ marginTop: 4 }}>{round}</SectionTitle>
            {matches.map((m) => (
              <Card key={m.id} onPress={() => router.push(`/match/${m.id}`)}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Caption>Table {m.tableNumber}{m.matchStartTime ? ` · ${m.matchStartTime}` : ''}</Caption>
                  <StatusPill status={m.status} />
                </Row>
                <MatchLine name={m.player1Name} frames={m.framesWonPlayer1} won={!!m.winnerId && m.winnerId === m.player1Id} />
                <MatchLine name={m.player2Name} frames={m.framesWonPlayer2} won={!!m.winnerId && m.winnerId === m.player2Id} />
              </Card>
            ))}
          </View>
        ))}

      {tab === 'results' && !hasResults && t && <Caption style={{ textAlign: 'center' }}>{t.status === 'completed' ? 'No results recorded.' : 'Results appear as the knockout rounds finish.'}</Caption>}
      {tab === 'results' && hasResults && results && (
        <Card style={{ gap: 12 }}>
          {results.champion && <ResultLine emoji="🏆" label="Champion" player={results.champion} big />}
          {results.runnerUp && <ResultLine emoji="🥈" label="Runner-up" player={results.runnerUp} />}
          {results.semifinalists.map((p) => (
            <ResultLine key={p.id} emoji="🥉" label="Semi-finalist" player={p} />
          ))}
        </Card>
      )}

      {tab === 'players' && players.length === 0 && <Caption style={{ textAlign: 'center' }}>No one has registered yet.</Caption>}
      {tab === 'players' &&
        players.map((r) => (
          <PlayerRow
            key={r.id}
            name={r.player?.fullName || 'Player'}
            photoUrl={r.player?.profilePhotoUrl || null}
            linked
            highlight={r.playerId === me?.profile?.id}
            onPress={() => router.push(`/player/${r.playerId}`)}
          />
        ))}

      {t && (
        <RegisterSheet
          tournament={t}
          clubSlug={clubSlug}
          visible={confirming}
          onClose={() => setConfirming(false)}
          onRegistered={() => {
            setJustRegistered(true);
            refresh();
          }}
        />
      )}
    </Screen>
  );
}

function ResultLine({ emoji, label, player, big }: { emoji: string; label: string; player: ResultPlayer; big?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={() => /^[0-9a-f]{24}$/i.test(player.id) && router.push(`/player/${player.id}`)}>
      <Row>
        <Text style={{ fontSize: big ? 28 : 20 }}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Caption style={{ fontWeight: '800', color: big ? c.warning : c.textMuted }}>{label.toUpperCase()}</Caption>
          {big ? <Headline style={{ fontSize: 20 }}>{player.name}</Headline> : <Body>{player.name}</Body>}
        </View>
      </Row>
    </PressableScale>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: 12, gap: 2 }}>
      <Caption>{label}</Caption>
      <Headline numberOfLines={1}>{value}</Headline>
    </Card>
  );
}

function MatchLine({ name, frames, won }: { name: string; frames: number; won: boolean }) {
  const { c } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Body style={{ fontWeight: won ? '800' : '400', color: won ? c.primary : c.text, flex: 1 }} numberOfLines={1}>
        {name}
      </Body>
      <Headline style={{ color: won ? c.primary : c.text }}>{frames}</Headline>
    </Row>
  );
}

function groupByRound(matches: Match[]): [string, Match[]][] {
  const map = new Map<string, Match[]>();
  for (const m of matches) map.set(m.round, [...(map.get(m.round) ?? []), m]);
  return [...map];
}
