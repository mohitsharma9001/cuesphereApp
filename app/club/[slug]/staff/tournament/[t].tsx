import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { FixtureBuilder } from '@/components/admin/fixture-builder';
import { TournamentForm } from '@/components/admin/tournament-form';
import { Body, Button, Caption, Card, Chip, Field, Headline, ListGroup, ListItem, LoadState, PlayerRow, PressableScale, RemoteImage, Row, Screen, SectionTitle, StatusPill, useConfirm, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import { formatDateRange, formatMoney, parseRupees } from '@/lib/format';
import { pickImageForm } from '@/lib/pick-image';
import type { Match, Registration, Tournament } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Section = 'details' | 'registrations' | 'fixtures' | 'scorekeepers' | 'status';
type StaffRegistration = Registration & { paymentStatus: 'pending' | 'paid' | 'failed'; registrationNumber: string };
interface Scorekeeper {
  id: string;
  email: string;
  fullName: string;
}

/** Inside a tournament (#31): Details · Registrations · Fixtures · Scorekeepers · Status. */
export default function ManageTournament() {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const { slug, reload: reloadClub } = useClub();
  const { t: key } = useLocalSearchParams<{ t: string }>();
  const base = `/clubs/${slug}/tournaments/${key}`;
  const tournament = useApi<Tournament>(base);
  const t = tournament.data;
  const regs = useApi<StaffRegistration[]>(t ? `${base}/registrations` : null);
  const draw = useApi<{ matches: Match[] }>(t ? `/matches/tournaments/${t.id}` : null);
  const keepers = useApi<Scorekeeper[]>(t ? `${base}/scorekeepers` : null);
  const [section, setSection] = useState<Section>('details');

  if (!t) return <Screen><LoadState loading={tournament.loading} error={tournament.error} onRetry={tournament.refresh} /></Screen>;

  const entries = (regs.data ?? []).filter((r) => r.status !== 'cancelled');
  const paidCount = entries.filter((r) => r.paymentStatus === 'paid').length;
  const players = entries.map((r) => ({ id: r.playerId, name: r.player?.fullName || 'Player', photoUrl: r.player?.profilePhotoUrl ?? null }));

  async function patch(body: Record<string, unknown>, done: string) {
    try {
      await api(base, { method: 'PATCH', body });
      toast(done);
      await tournament.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save.', 'error');
    }
  }

  async function uploadCover() {
    try {
      const form = await pickImageForm({ aspect: [16, 9] });
      if (!form) return;
      await api(`${base}/thumbnail`, { method: 'POST', body: form });
      toast('Cover updated');
      await tournament.reload();
    } catch (e) {
      toast(e instanceof ApiError || e instanceof Error ? e.message : 'Could not upload.', 'error');
    }
  }

  return (
    <Screen refreshing={tournament.refreshing} onRefresh={() => Promise.all([tournament.refresh(), regs.reload(), draw.reload(), keepers.reload()])}>
      <Stack.Screen options={{ title: t.name }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <StatusPill status={t.status} />
        <Caption>
          {t.registeredCount ?? 0}/{t.maxPlayers} · {formatMoney(paidCount * parseRupees(t.entryFee))} collected
        </Caption>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(
          [
            ['details', 'Details'],
            ['registrations', `Registrations (${entries.length})`],
            ['fixtures', 'Fixtures'],
            ['scorekeepers', 'Scorekeepers'],
            ['status', 'Status'],
          ] as [Section, string][]
        ).map(([k, label]) => (
          <Chip key={k} label={label} selected={section === k} onPress={() => setSection(k)} />
        ))}
      </ScrollView>

      {section === 'details' && (
        <>
          <PressableScale onPress={uploadCover}>
            <RemoteImage uri={t.imageUrl || null} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg }} />
            <Caption style={{ color: c.primary, fontWeight: '800', textAlign: 'center', marginTop: 6 }}>{t.imageUrl ? 'Change cover photo' : 'Add a cover photo'}</Caption>
          </PressableScale>
          <TournamentForm
            key={t.id} // keep the form (and its "Saved" message) across the reload after saving
            initial={t}
            submitLabel="Save details"
            onSubmit={async (input) => {
              try {
                await api(base, { method: 'PATCH', body: { ...input, startDate: input.startDate || undefined, endDate: input.endDate || undefined } });
                toast('Details saved');
                await tournament.reload();
              } catch (e) {
                throw new Error(e instanceof ApiError ? e.message : 'Could not save.');
              }
            }}
          />
        </>
      )}

      {section === 'registrations' && (
        <>
          <Caption>
            {entries.length} registered · {paidCount} paid · fee {t.entryFee || 'free'}
          </Caption>
          <LoadState loading={regs.loading} error={regs.error} onRetry={regs.reload} empty={entries.length === 0 && 'No registrations yet.'} />
          {entries.map((r) => (
            <PlayerRow
              key={r.id}
              name={r.player?.fullName || 'Player'}
              photoUrl={r.player?.profilePhotoUrl ?? null}
              subtitle={r.registrationNumber}
              linked
              right={
                <PressableScale
                  onPress={async () => {
                    const next = r.paymentStatus === 'paid' ? 'pending' : 'paid';
                    try {
                      await api(`/clubs/${slug}/registrations/${r.id}/payment-status`, { method: 'PATCH', body: { paymentStatus: next } });
                      await regs.reload();
                    } catch (e) {
                      toast(e instanceof ApiError ? e.message : 'Could not update.', 'error');
                    }
                  }}>
                  <View style={{ backgroundColor: r.paymentStatus === 'paid' ? 'rgba(22,163,74,0.15)' : c.accentSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: r.paymentStatus === 'paid' ? c.success : c.accent, fontWeight: '800', fontSize: 12 }}>{r.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}</Text>
                  </View>
                </PressableScale>
              }
            />
          ))}
          {entries.length > 0 && <Caption style={{ textAlign: 'center' }}>Tap a payment tag to switch Paid / Pending.</Caption>}
        </>
      )}

      {section === 'fixtures' &&
        (draw.data ? (
          players.length < 2 ? (
            <Body muted>At least two registered players are needed to build a draw.</Body>
          ) : (
            <FixtureBuilder key={draw.data.matches.length} slug={slug} tournamentId={t.id} players={players} matches={draw.data.matches} onSaved={draw.reload} />
          )
        ) : (
          <LoadState loading={draw.loading} error={draw.error} onRetry={draw.reload} />
        ))}

      {section === 'scorekeepers' && <Scorekeepers base={base} list={keepers.data ?? []} onChanged={keepers.reload} />}

      {section === 'status' && (
        <>
          <SectionTitle>Status</SectionTitle>
          <Row style={{ gap: 8 }}>
            {(['upcoming', 'live', 'completed'] as const).map((s) => (
              <Chip key={s} label={s[0].toUpperCase() + s.slice(1)} selected={t.status === s} onPress={() => patch({ status: s }, `Tournament is ${s}`)} />
            ))}
          </Row>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Headline>Registrations open</Headline>
                <Caption>{t.registrationOpen ? 'Players can register.' : 'Registration is closed.'}</Caption>
              </View>
              <Switch value={t.registrationOpen} onValueChange={(v) => patch({ registrationOpen: v }, v ? 'Registrations opened' : 'Registrations closed')} trackColor={{ true: c.primary, false: c.border }} thumbColor="#FFFFFF" />
            </Row>
          </Card>
          <SectionTitle>Champion &amp; runner-up</SectionTitle>
          <WinnerPicker label="🏆 Champion" players={players} value={t.championId ?? null} onPick={(id) => patch({ championId: id }, 'Champion saved')} />
          <WinnerPicker label="🥈 Runner-up" players={players} value={t.runnerUpId ?? null} onPick={(id) => patch({ runnerUpId: id }, 'Runner-up saved')} />
          <Caption>{formatDateRange(t.startDate, t.endDate)}</Caption>
          <View style={{ height: 12 }} />
          <Button
            title="Delete tournament"
            variant="danger"
            onPress={async () => {
              if (!(await confirm({ title: `Delete ${t.name}?`, message: 'Its registrations, fixtures and scorekeepers are deleted too. This can’t be undone.', confirmLabel: 'Delete', destructive: true }))) return;
              try {
                await api(base, { method: 'DELETE' });
                toast('Tournament deleted', 'info');
                reloadClub();
                router.back();
              } catch (e) {
                toast(e instanceof ApiError ? e.message : 'Could not delete.', 'error');
              }
            }}
          />
        </>
      )}
    </Screen>
  );
}

function WinnerPicker({ label, players, value, onPick }: { label: string; players: { id: string; name: string }[]; value: string | null; onPick: (id: string | null) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Caption style={{ fontWeight: '800' }}>{label}</Caption>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="Not set" selected={!value} onPress={() => onPick(null)} />
        {players.map((p) => (
          <Chip key={p.id} label={p.name} selected={value === p.id} onPress={() => onPick(p.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Scorekeepers({ base, list, onChanged }: { base: string; list: Scorekeeper[]; onChanged: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await api(`${base}/scorekeepers`, { method: 'POST', body: { fullName: name.trim(), email: email.trim(), password } });
      toast(`${name.trim()} can now score this tournament`);
      setName('');
      setEmail('');
      setPassword('');
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add the scorekeeper.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Caption>Scorekeepers get a login that can only score this tournament&apos;s matches. Access ends when the tournament is completed.</Caption>
      {list.length > 0 && (
        <ListGroup>
          {list.map((k, i) => (
            <ListItem
              key={k.id}
              label={`${k.fullName || k.email} · ${k.email}`}
              icon={['person.badge.key.fill', 'badge']}
              tint={c.info}
              onPress={async () => {
                if (!(await confirm({ title: `Remove ${k.fullName || k.email}?`, message: 'They can no longer score this tournament.', confirmLabel: 'Remove', destructive: true }))) return;
                try {
                  await api(`${base}/scorekeepers/${k.id}`, { method: 'DELETE' });
                  toast('Scorekeeper removed', 'info');
                  onChanged();
                } catch (e) {
                  toast(e instanceof ApiError ? e.message : 'Could not remove.', 'error');
                }
              }}
              last={i === list.length - 1}
            />
          ))}
        </ListGroup>
      )}
      <SectionTitle>Add a scorekeeper</SectionTitle>
      <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Field label="Email (their login)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />
      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="Create scorekeeper login" onPress={add} loading={busy} disabled={!name.trim() || !email.trim() || password.length < 8} />
    </>
  );
}
