import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { PhotoPicker } from '@/components/player/photo-picker';
import { Body, Button, Caption, Card, Chip, DateField, Field, Headline, LoadState, Row, Screen, SectionTitle, useToast } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { PROFILE_FIELD_LABELS, profileCompletion, type EditableProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import type { Club, PlayerProfile } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Same checks and messages as the API (controllers/profile.controller.ts). */
function validate(f: EditableProfile): string | null {
  if (f.fullName.trim().length < 2) return 'Enter your full name.';
  if (f.mobile.trim().length < 8) return 'Enter a valid mobile number.';
  if (!f.dob) return 'Date of birth is required.';
  if (!f.city.trim()) return 'City is required.';
  if (f.emergencyContact.trim().length < 8) return 'Enter a valid emergency contact number.';
  return null;
}

type MyProfile = PlayerProfile & { dob: string; emergencyContact: string };

/** My Profile (#8): photo, details and primary club. */
export default function ProfileEditScreen() {
  const { me } = useSession();
  const profile = useApi<MyProfile>(me ? '/profiles/me' : null);

  if (!me) {
    return (
      <Screen>
        <LoadState empty="Log in to edit your profile." />
        <Button title="Log in" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }
  if (!profile.data) {
    return (
      <Screen>
        <LoadState loading={profile.loading} error={profile.error} onRetry={profile.refresh} />
      </Screen>
    );
  }
  // Keyed by profile id so the form starts fresh for whoever is signed in.
  return <ProfileForm key={profile.data.id} initial={profile.data} />;
}

function ProfileForm({ initial }: { initial: MyProfile }) {
  const { c } = useTheme();
  const { me, reload } = useSession();
  const toast = useToast();
  const clubIds = me?.memberships.map((m) => m.clubId) ?? [];
  const clubs = useApi<Club[]>(clubIds.length ? `/clubs?ids=${clubIds.join(',')}` : null);

  const [form, setForm] = useState<EditableProfile>(() => ({
    fullName: initial.fullName ?? '',
    mobile: initial.mobile ?? '',
    dob: initial.dob ?? '',
    city: initial.city ?? '',
    emergencyContact: initial.emergencyContact ?? '',
    preferredCue: initial.preferredCue ?? '',
    profilePhotoUrl: initial.profilePhotoUrl ?? '',
    email: initial.email ?? me?.user.email ?? '',
  }));
  const [primaryClubId, setPrimaryClubId] = useState<string | null>(initial.primaryClubId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof EditableProfile>(key: K) => (value: EditableProfile[K]) => setForm((f) => ({ ...f, [key]: value }));
  const completion = profileCompletion(form);
  const today = new Date(); // no birthdays in the future

  async function save() {
    const problem = validate(form);
    if (problem) return setError(problem);
    setSaving(true);
    setError(null);
    try {
      await api('/profiles/me', {
        method: 'PUT',
        body: {
          fullName: form.fullName.trim(),
          mobile: form.mobile.trim(),
          dob: form.dob,
          city: form.city.trim(),
          emergencyContact: form.emergencyContact.trim(),
          preferredCue: form.preferredCue.trim(),
          profilePhotoUrl: form.profilePhotoUrl,
        },
      });
      if (primaryClubId !== (initial.primaryClubId ?? null)) {
        await api('/profiles/me/primary-club', { method: 'PUT', body: { clubId: primaryClubId } });
      }
      await reload();
      toast('Profile saved');
      if (router.canGoBack()) router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'My Profile' }} />

      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Headline>{completion.isComplete ? 'Profile complete' : 'Complete your profile'}</Headline>
          <Headline style={{ color: completion.isComplete ? c.success : c.primary }}>{completion.percent}%</Headline>
        </Row>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
          <View style={{ width: `${completion.percent}%`, height: '100%', borderRadius: 4, backgroundColor: completion.isComplete ? c.success : c.primary }} />
        </View>
        {completion.isComplete ? (
          <Caption>✓ You&apos;re all set to register for tournaments.</Caption>
        ) : (
          <Caption>Missing: {completion.missing.map((f) => PROFILE_FIELD_LABELS[f]).join(' · ')}</Caption>
        )}
      </Card>

      <PhotoPicker
        name={form.fullName}
        uri={form.profilePhotoUrl}
        onUploaded={(p) => {
          set('profilePhotoUrl')(p.profilePhotoUrl);
          reload();
          toast('Photo updated');
        }}
      />

      <Field label="Full name" value={form.fullName} onChangeText={set('fullName')} autoCapitalize="words" textContentType="name" autoComplete="name" />
      <Field label="Mobile" value={form.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="98xxxxxxxx" />
      <DateField label="Date of birth" value={form.dob} onChange={set('dob')} maximumDate={today} defaultDate={new Date(2000, 0, 1, 12)} />
      <Field label="City" value={form.city} onChangeText={set('city')} autoCapitalize="words" placeholder="Bengaluru" />
      <Field label="Emergency contact" value={form.emergencyContact} onChangeText={set('emergencyContact')} keyboardType="phone-pad" placeholder="Someone we can call" />
      <Field label="Preferred cue (optional)" value={form.preferredCue} onChangeText={set('preferredCue')} placeholder="e.g. Riley, Peradon" />
      <Body muted style={{ marginTop: -4 }}>Email: {form.email}</Body>

      <SectionTitle>Primary club</SectionTitle>
      {clubIds.length === 0 ? (
        <Caption>Join a club to choose the one you represent.</Caption>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="None" selected={!primaryClubId} onPress={() => setPrimaryClubId(null)} />
          {clubs.data?.map((club) => (
            <Chip key={club.id} label={club.name} selected={club.id === primaryClubId} onPress={() => setPrimaryClubId(club.id)} />
          ))}
        </ScrollView>
      )}
      <Caption>Shown next to your name across CueSphere.</Caption>

      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="Save" icon={['checkmark', 'check']} onPress={save} loading={saving} />
    </Screen>
  );
}
