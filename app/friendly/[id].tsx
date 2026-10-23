import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';

import { ScoringPanel } from '@/components/scoring/scoring-panel';
import { Avatar, Body, Button, Caption, Card, Headline, LiveDot, LoadState, PressableScale, Row, Screen, tapHaptic, useConfirm, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { WEBSITE_URL } from '@/lib/config';
import { liveMatchChannel, useLiveSignal } from '@/lib/live';
import { useSession } from '@/lib/session';
import type { Club, Match, PlayerProfile } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Friendly Match for its two players (#14): every step from challenge to confirmed result. */
export default function FriendlyMatchScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const match = useApi<Match>(`/matches/${id}`);
  const m = match.data;
  const people = useApi<PlayerProfile[]>(m ? `/profiles/batch?ids=${m.player1Id},${m.player2Id}` : null);
  const venue = useApi<Club[]>(m?.venueClubId ? `/clubs?ids=${m.venueClubId}` : null);
  const [busy, setBusy] = useState<string | null>(null);

  const myId = me?.profile?.id;
  const side = m && myId ? (m.player1Id === myId ? 1 : m.player2Id === myId ? 2 : 0) : null;
  const state = m?.friendlyState;
  const waiting = !!m && state !== 'confirmed' && state !== 'declined' && state !== 'cancelled';

  // Everyone else watches the public live page.
  useEffect(() => {
    if (m && side === 0) router.replace(`/match/${m.id}`);
  }, [m, side]);

  // Pick up the opponent's accept / start / confirm without a manual refresh.
  useLiveSignal(waiting ? liveMatchChannel(id) : null, match.reload);
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(match.reload, 8000);
    return () => clearInterval(t);
  }, [waiting, match.reload]);
  useFocusEffect(
    useCallback(() => {
      match.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  async function act(key: string, path: string, done: string, body?: unknown) {
    setBusy(key);
    try {
      await api(`/friendlies/${id}/${path}`, { method: 'POST', body });
      toast(done);
      await match.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Something went wrong.', 'error');
    } finally {
      setBusy(null);
    }
  }

  if (!m || side === null) {
    return (
      <Screen>
        <LoadState loading={match.loading} error={match.error} onRetry={match.refresh} empty={!match.loading && !m && 'Match not found.'} />
      </Screen>
    );
  }

  const photo = (pid: string) => people.data?.find((p) => p.id === pid)?.profilePhotoUrl || null;
  const opponentName = side === 1 ? m.player2Name : m.player1Name;
  const showFrames = state === 'pending_confirmation' || state === 'confirmed' || m.status === 'live';
  const iSubmitted = m.resultSubmittedBy === myId;
  const winnerIsP1 = m.winnerId === m.player1Id;
  const header = ['Friendly', `Best of ${m.bestOf ?? 3}`, venue.data?.[0]?.name, m.tableNumber > 0 ? `Table ${m.tableNumber}` : null].filter(Boolean).join(' · ');

  const cancelMatch = async () => {
    if (await confirm({ title: 'Call off this match?', confirmLabel: 'Call it off', destructive: true })) act('cancel', 'cancel', 'Match cancelled');
  };

  return (
    <Screen refreshing={match.refreshing} onRefresh={match.refresh}>
      <Stack.Screen options={{ title: 'Friendly' }} />
      <Caption style={{ textAlign: 'center', fontWeight: '800', letterSpacing: 1 }}>{header.toUpperCase()}</Caption>

      <Card style={{ paddingVertical: 22 }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Side name={m.player1Name} photo={photo(m.player1Id)} frames={showFrames ? m.framesWonPlayer1 : null} highlight={state === 'confirmed' && winnerIsP1} />
          <Text style={{ color: c.textMuted, fontSize: 18, fontWeight: '800', marginTop: 26 }}>v</Text>
          <Side name={m.player2Name} photo={photo(m.player2Id)} frames={showFrames ? m.framesWonPlayer2 : null} highlight={state === 'confirmed' && !winnerIsP1} />
        </Row>
        {(state === 'pending_confirmation' || state === 'confirmed') && m.highestBreak > 0 && <Caption style={{ textAlign: 'center' }}>🏆 Highest break {m.highestBreak}</Caption>}
      </Card>

      <View key={`${state}-${m.status}`} style={{ gap: 12 }}>
        {state === 'invited' && side === 2 && (
          <>
            <Body style={{ textAlign: 'center' }}>
              <Text style={{ fontWeight: '800' }}>{m.player1Name}</Text> challenged you.
            </Body>
            <Row style={{ gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="Decline" variant="ghost" loading={busy === 'no'} onPress={() => act('no', 'respond', 'Challenge declined', { accept: false })} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Accept" icon={['checkmark', 'check']} loading={busy === 'yes'} onPress={() => act('yes', 'respond', 'Challenge accepted', { accept: true })} />
              </View>
            </Row>
          </>
        )}

        {state === 'invited' && side === 1 && (
          <>
            <Body muted style={{ textAlign: 'center' }}>Waiting for {opponentName} to accept.</Body>
            <Button title="Call it off" variant="ghost" loading={busy === 'cancel'} onPress={cancelMatch} />
          </>
        )}

        {state === 'accepted' && m.status !== 'live' && (
          <>
            <Button title="▶ Start match" loading={busy === 'start'} onPress={() => act('start', 'start', "You're live")} />
            <Caption style={{ textAlign: 'center' }}>Use one phone to score. Your friends and followers get a “watch live” alert.</Caption>
            <Button title="Call it off" variant="ghost" loading={busy === 'cancel'} onPress={cancelMatch} />
          </>
        )}

        {state === 'accepted' && m.status === 'live' && (
          <>
            <PressableScale onPress={() => router.push(`/match/${m.id}`)}>
              <Row style={{ justifyContent: 'center', gap: 6, backgroundColor: c.accentSoft, borderRadius: radius.pill, paddingVertical: 10 }}>
                <LiveDot />
                <Caption style={{ color: c.live, fontWeight: '800' }}>LIVE · Open the public page</Caption>
              </Row>
            </PressableScale>
            <ScoringPanel match={m} onChanged={match.reload} />
          </>
        )}

        {state === 'pending_confirmation' && !iSubmitted && (
          <>
            <Body style={{ textAlign: 'center' }}>{opponentName} entered this score. Is it right?</Body>
            <Row style={{ gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Score is wrong"
                  variant="danger"
                  loading={busy === 'no'}
                  onPress={async () => {
                    if (await confirm({ title: 'Reopen the match so the score can be corrected?', confirmLabel: 'Reopen', destructive: true })) act('no', 'dispute', 'Match reopened for correction');
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Confirm"
                  icon={['checkmark', 'check']}
                  loading={busy === 'yes'}
                  onPress={async () => {
                    await act('yes', 'confirm', 'Result confirmed');
                    tapHaptic('success');
                  }}
                />
              </View>
            </Row>
          </>
        )}

        {state === 'pending_confirmation' && iSubmitted && <Body muted style={{ textAlign: 'center' }}>Result sent. It counts once {opponentName} confirms it.</Body>}

        {state === 'confirmed' && (
          <>
            <Button
              title="Share result"
              icon={['square.and.arrow.up', 'share']}
              onPress={() => {
                const [w, l] = winnerIsP1 ? [m.player1Name, m.player2Name] : [m.player2Name, m.player1Name];
                const text = `${w} beat ${l} ${Math.max(m.framesWonPlayer1, m.framesWonPlayer2)}–${Math.min(m.framesWonPlayer1, m.framesWonPlayer2)} in a friendly on CueSphere${m.highestBreak > 0 ? ` (highest break ${m.highestBreak})` : ''}.`;
                Share.share({ message: `${text} ${WEBSITE_URL}/matches/${m.id}` });
              }}
            />
            <Caption style={{ textAlign: 'center' }}>Added to both players&apos; friendly records.</Caption>
          </>
        )}

        {(state === 'declined' || state === 'cancelled') && <Body muted style={{ textAlign: 'center' }}>{state === 'declined' ? 'This challenge was declined.' : 'This match was called off.'}</Body>}
        {(state === 'declined' || state === 'cancelled' || state === 'confirmed') && (
          <Button title="New challenge" variant="secondary" onPress={() => router.replace(`/challenge?opponent=${side === 1 ? m.player2Id : m.player1Id}`)} />
        )}
      </View>
    </Screen>
  );
}

function Side({ name, photo, frames, highlight }: { name: string; photo: string | null; frames: number | null; highlight: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      <View style={highlight ? { padding: 3, borderRadius: 999, borderWidth: 2, borderColor: c.primary } : { padding: 5 }}>
        <Avatar name={name} uri={photo} size={64} />
      </View>
      <Headline style={{ textAlign: 'center' }} numberOfLines={2}>{name}</Headline>
      {frames !== null && <Text style={{ fontSize: 40, fontWeight: '900', color: highlight ? c.primary : c.text }}>{frames}</Text>}
    </View>
  );
}
