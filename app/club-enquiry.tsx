import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { OwnClubCard } from '@/components/home/own-club-card';
import { Icon } from '@/components/icon';
import { Body, Button, Caption, Card, Field, GradientHero, Headline, LoadState, Screen, SelectField, tapHaptic } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClubEnquiry } from '@/lib/club-enquiry';
import { useSession } from '@/lib/session';
import type { City, ClubEnquiry, IndianState } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** "Create your club", step 1: ask CueSphere to open a club. Shows the form when there's
 * nothing open (or after a rejection), otherwise where the request stands. */
export default function ClubEnquiryScreen() {
  const status = useClubEnquiry();
  const params = useLocalSearchParams<{ resend?: string }>();
  const [sent, setSent] = useState<ClubEnquiry | null>(null);
  // "Send a new request" on Home's rejected card opens the form straight away.
  const [resend, setResend] = useState(params.resend === '1');

  if (sent) return <Sent enquiry={sent} />;
  if (!status.data) {
    return (
      <Screen>
        <LoadState loading={status.loading} error={status.error} onRetry={status.refresh} />
      </Screen>
    );
  }
  const { stage, enquiry } = status.data;
  const showForm = stage === 'none' || (stage === 'rejected' && resend);
  if (!showForm) {
    return (
      <Screen refreshing={status.refreshing} onRefresh={status.refresh}>
        <Stack.Screen options={{ title: 'Your club request' }} />
        <OwnClubCard status={status.data} />
        {stage === 'rejected' && <Button title="Send a new request" onPress={() => setResend(true)} />}
        {stage === 'pending' && <Caption style={{ textAlign: 'center' }}>Pull down to check for an update.</Caption>}
      </Screen>
    );
  }
  return <EnquiryForm previous={stage === 'rejected' ? enquiry : null} onSent={setSent} />;
}

function EnquiryForm({ previous, onSent }: { previous: ClubEnquiry | null; onSent: (e: ClubEnquiry) => void }) {
  const { c } = useTheme();
  const { me } = useSession();
  const states = useApi<IndianState[]>('/locations/states?active=true');
  const [f, setF] = useState(() => ({
    ownerName: previous?.ownerName ?? me?.profile?.fullName ?? '',
    mobile: previous?.mobile ?? me?.profile?.mobile ?? '',
    clubName: previous?.clubName ?? '',
    stateCode: previous?.stateCode ?? '',
    cityId: previous?.cityId ?? '',
    tables: previous ? String(previous.tables) : '',
    message: '',
  }));
  const cities = useApi<City[]>(f.stateCode ? `/locations/cities?state=${f.stateCode}` : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function submit() {
    // Same rules as the API, so most mistakes show without a round trip.
    if (f.ownerName.trim().length < 2) return setError('Enter your name.');
    if (!/^[6-9]\d{9}$/.test(f.mobile.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))) return setError('Enter a valid 10-digit mobile number.');
    if (f.clubName.trim().length < 2) return setError("Enter the club's name.");
    if (!f.stateCode) return setError('Choose a state.');
    if (!f.cityId) return setError('Choose a city.');
    const tables = Number(f.tables);
    if (!Number.isInteger(tables) || tables < 1 || tables > 100) return setError('Enter the number of tables (1–100).');
    setBusy(true);
    setError(null);
    try {
      const enquiry = await api<ClubEnquiry>('/club-enquiries', { method: 'POST', body: { ...f, tables } });
      tapHaptic('success');
      onSent(enquiry);
    } catch (e) {
      tapHaptic('error');
      setError(e instanceof ApiError ? e.message : 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Create your club' }} />
      <GradientHero>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>STEP 1 OF 2</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800' }}>Tell us about your club</Text>
        <Text style={{ color: 'rgba(255,255,255,0.88)' }}>The CueSphere team reviews every request. Once approved, you add your club&apos;s details.</Text>
      </GradientHero>

      <Card style={{ gap: 14 }}>
        <Headline>About you</Headline>
        <Field label="Your name" icon={['person', 'person']} value={f.ownerName} onChangeText={set('ownerName')} placeholder="Ravi Kumar" autoCapitalize="words" />
        <Field label="Mobile number" icon={['phone', 'call']} value={f.mobile} onChangeText={set('mobile')} placeholder="98765 43210" keyboardType="phone-pad" textContentType="telephoneNumber" />
      </Card>

      <Card style={{ gap: 14 }}>
        <Headline>Your club</Headline>
        <Field label="Club name" icon={['building.2', 'store']} value={f.clubName} onChangeText={set('clubName')} placeholder="Metro Snooker Club" autoCapitalize="words" />
        <SelectField
          label="State"
          icon={['map', 'map']}
          value={f.stateCode || null}
          placeholder="Choose the state"
          loading={states.loading}
          options={(states.data ?? []).map((s) => ({ value: s.code, label: s.name }))}
          onChange={(code) => setF((x) => ({ ...x, stateCode: code, cityId: '' }))}
        />
        <SelectField
          label="City"
          icon={['mappin.and.ellipse', 'location_on']}
          value={f.cityId || null}
          placeholder="Choose the city"
          disabledHint={f.stateCode ? undefined : 'Choose a state first'}
          loading={cities.loading}
          options={(cities.data ?? []).map((ci) => ({ value: ci.id, label: ci.name }))}
          onChange={set('cityId')}
        />
        <Field label="Number of tables" icon={['square.grid.2x2', 'grid_view']} value={f.tables} onChangeText={(t) => set('tables')(t.replace(/\D/g, '').slice(0, 3))} placeholder="6" keyboardType="number-pad" />
        <Field
          label="Anything else? (optional)"
          value={f.message}
          onChangeText={set('message')}
          placeholder="Opening date, snooker or pool, anything we should know"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }}
        />
      </Card>

      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="Send request" icon={['paperplane.fill', 'send']} onPress={submit} loading={busy} />
      <Caption style={{ textAlign: 'center' }}>We usually reply within a day. You&apos;ll see the answer here and on Home.</Caption>
    </Screen>
  );
}

function Sent({ enquiry }: { enquiry: ClubEnquiry }) {
  const { c } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Request sent' }} />
      <View style={{ alignItems: 'center', gap: 12, marginTop: 32 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios="paperplane.fill" android="send" size={40} color={c.primary} />
        </View>
        <Headline style={{ fontSize: 22, textAlign: 'center' }}>Request sent!</Headline>
        <Body muted style={{ textAlign: 'center' }}>
          The CueSphere team will review {enquiry.clubName}. When it&apos;s approved, you&apos;ll be able to create your club from Home.
        </Body>
      </View>
      <Button title="Back to Home" onPress={() => router.navigate('/')} />
    </Screen>
  );
}
