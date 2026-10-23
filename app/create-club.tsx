import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { OwnClubCard } from '@/components/home/own-club-card';
import { Icon } from '@/components/icon';
import { Body, Button, Caption, Card, Field, GradientHero, Headline, LoadState, Screen, SelectField, tapHaptic } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClubEnquiry, type EnquiryStatus } from '@/lib/club-enquiry';
import { useSession } from '@/lib/session';
import type { City, Club, ClubEnquiry, IndianState } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Create Your Club (#23), step 2: only after CueSphere approved the player's request
 * (prefilled from it). Platform admins can always create a club. */
export default function CreateClub() {
  const { me } = useSession();
  const isAdmin = !!me?.isPlatformAdmin;
  const status = useClubEnquiry(!isAdmin);
  const [created, setCreated] = useState<Club | null>(null);

  if (created) return <Created club={created} />;
  if (isAdmin) return <CreateClubForm enquiry={null} onCreated={setCreated} />;
  if (!status.data) {
    return (
      <Screen>
        <LoadState loading={status.loading} error={status.error} onRetry={status.refresh} />
      </Screen>
    );
  }
  const { stage, enquiry } = status.data;
  if (stage === 'approved' && enquiry) return <CreateClubForm key={enquiry.id} enquiry={enquiry} onCreated={setCreated} />;
  return <NotYet status={status.data} />;
}

/** Why the form isn't available yet, and the way forward. */
function NotYet({ status }: { status: EnquiryStatus }) {
  const { c } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Create Club' }} />
      {status.stage === 'none' ? (
        <>
          <Card style={{ gap: 12 }}>
            <Headline>Two quick steps</Headline>
            {[
              ['1', 'Send a request', 'Tell us about you and your club. The CueSphere team reviews it.'],
              ['2', 'Create your club', 'Once approved, add your club’s details. We check it once more, then it goes live.'],
            ].map(([n, title, text]) => (
              <View key={n} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: c.primary, fontWeight: '800' }}>{n}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Headline>{title}</Headline>
                  <Body muted>{text}</Body>
                </View>
              </View>
            ))}
          </Card>
          <Button title="Send a request" icon={['paperplane.fill', 'send']} onPress={() => router.replace('/club-enquiry')} />
        </>
      ) : (
        <OwnClubCard status={status} />
      )}
    </Screen>
  );
}

function CreateClubForm({ enquiry, onCreated }: { enquiry: ClubEnquiry | null; onCreated: (club: Club) => void }) {
  const { c } = useTheme();
  const { reload } = useSession();
  const states = useApi<IndianState[]>('/locations/states?active=true');
  const [stateCode, setStateCode] = useState<string | null>(enquiry?.stateCode ?? null);
  const cities = useApi<City[]>(stateCode ? `/locations/cities?state=${stateCode}` : null);
  const [cityId, setCityId] = useState<string | null>(enquiry?.cityId ?? null);
  const [name, setName] = useState(enquiry?.clubName ?? '');
  const [tagline, setTagline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return setError('Enter a club name.');
    if (!stateCode) return setError('Choose a state.');
    if (!cityId) return setError('Choose a city.');
    setBusy(true);
    setError(null);
    try {
      const club = await api<Club>('/clubs', { method: 'POST', body: { name: name.trim(), tagline: tagline.trim(), stateCode, cityId } });
      await reload(); // you're now this club's admin
      tapHaptic('success');
      onCreated(club);
    } catch (e) {
      tapHaptic('error');
      setError(e instanceof ApiError ? e.message : 'Could not create the club.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Create Club' }} />
      <GradientHero>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>{enquiry ? 'STEP 2 OF 2 · REQUEST APPROVED' : 'CUESPHERE'}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>Create Your Club</Text>
        <Text style={{ color: 'rgba(255,255,255,0.88)' }}>Check the details below. We review new clubs once more before they go live.</Text>
      </GradientHero>

      <Card style={{ gap: 14 }}>
        <Headline>Club details</Headline>
        <Field label="Club name" icon={['building.2', 'store']} value={name} onChangeText={setName} placeholder="Metro Snooker Club" autoCapitalize="words" />
        <Field label="Tagline (optional)" icon={['text.quote', 'format_quote']} value={tagline} onChangeText={setTagline} placeholder="Where every frame counts" />
      </Card>

      <Card style={{ gap: 14 }}>
        <Headline>Location</Headline>
        <SelectField
          label="State"
          icon={['map', 'map']}
          value={stateCode}
          placeholder="Choose your state"
          loading={states.loading}
          options={(states.data ?? []).map((s) => ({ value: s.code, label: s.name }))}
          onChange={(code) => {
            setStateCode(code);
            setCityId(null);
          }}
        />
        <SelectField
          label="City"
          icon={['mappin.and.ellipse', 'location_on']}
          value={cityId}
          placeholder="Choose your city"
          disabledHint={stateCode ? undefined : 'Choose a state first'}
          loading={cities.loading}
          options={(cities.data ?? []).map((ci) => ({ value: ci.id, label: ci.name }))}
          onChange={setCityId}
        />
        {states.error && <Body style={{ color: c.danger }}>{states.error}</Body>}
      </Card>

      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="Create Club" icon={['trophy.fill', 'emoji_events']} onPress={submit} loading={busy} />
      <Card style={{ backgroundColor: c.surfaceAlt }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Icon ios="checkmark.shield" android="verified_user" color={c.textMuted} size={16} />
          <Caption style={{ flex: 1 }}>New clubs go to the CueSphere team for approval before they appear publicly.</Caption>
        </View>
      </Card>
    </Screen>
  );
}

function Created({ club }: { club: Club }) {
  const { c } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Club created' }} />
      <View style={{ alignItems: 'center', gap: 12, marginTop: 24 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 44 }}>🏆</Text>
        </View>
        <Headline style={{ fontSize: 22, textAlign: 'center' }}>{club.name} is sent for approval</Headline>
        <Body muted style={{ textAlign: 'center' }}>
          The CueSphere team checks new clubs quickly. Once approved, the app opens as your club&apos;s admin — tables, tournaments and live scoring.
        </Body>
      </View>
      <Card style={{ gap: 8 }}>
        <Caption style={{ fontWeight: '800', letterSpacing: 1 }}>WHILE YOU WAIT</Caption>
        {['Count your tables and decide hourly rates', 'Find your logo and a cover photo', 'Plan your first tournament'].map((s) => (
          <Text key={s} style={{ color: c.text }}>
            ✓ {s}
          </Text>
        ))}
      </Card>
      <Button title="Back to Home" onPress={() => router.navigate('/')} />
    </Screen>
  );
}
