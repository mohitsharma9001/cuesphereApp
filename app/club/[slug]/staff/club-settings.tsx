import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Avatar, Body, Button, Caption, Card, Field, Headline, LoadState, PressableScale, RemoteImage, Row, Screen, SelectField, tapHaptic, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import { pickImageForm } from '@/lib/pick-image';
import type { City, Club, IndianState } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type FullClub = Club & {
  googleMapsUrl?: string;
  socialLinks?: Record<string, string>;
  aboutText?: string;
  rulesText?: string;
  membershipText?: string;
  privacyPolicyText?: string;
};

/** Settings (#36): logo, cover, details, contact, social and info pages. */
export default function ClubSettings() {
  const { slug } = useClub();
  const club = useApi<FullClub>(`/clubs/${slug}`);
  if (!club.data) return <Screen><LoadState loading={club.loading} error={club.error} onRetry={club.refresh} /></Screen>;
  return <SettingsForm key={club.data.id} club={club.data} onSaved={club.reload} />;
}

function SettingsForm({ club, onSaved }: { club: FullClub; onSaved: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { slug, reload: reloadClub } = useClub();
  const states = useApi<IndianState[]>('/locations/states?active=true');
  const [saved, setSaved] = useState(() => formFrom(club));
  const [f, setF] = useState(saved);
  const cities = useApi<City[]>(f.stateCode ? `/locations/cities?state=${f.stateCode}` : null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof ClubForm) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  async function upload(kind: 'logo' | 'cover') {
    try {
      const form = await pickImageForm({ aspect: kind === 'logo' ? [1, 1] : [16, 9] });
      if (!form) return;
      setUploading(kind);
      await api(`/clubs/${slug}/${kind}`, { method: 'POST', body: form });
      tapHaptic('success');
      toast(kind === 'logo' ? 'Logo updated' : 'Cover updated');
      onSaved();
      reloadClub();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not upload.', 'error');
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (!f.name.trim()) return setError('Enter a club name.');
    if (!f.stateCode || !f.cityId) return setError('Choose the club’s state and city.');
    setSaving(true);
    setError(null);
    try {
      const { facebook, twitter, instagram, youtube, ...rest } = f;
      await api(`/clubs/${slug}`, { method: 'PATCH', body: { ...rest, name: f.name.trim(), socialLinks: { facebook, twitter, instagram, youtube } } });
      tapHaptic('success');
      setSaved(f);
      setJustSaved(true);
      toast('Club details saved');
      reloadClub();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const multiline = { multiline: true, style: { minHeight: 96, textAlignVertical: 'top' as const, paddingTop: 14, paddingBottom: 14 } };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: 'Club details' }} />
      <Screen>
        {/* Cover with the logo on top, like the club's public page. */}
        <View style={{ marginBottom: 50 }}>
          <PressableScale onPress={() => upload('cover')} accessibilityRole="button" accessibilityLabel={club.heroBannerUrl ? 'Change cover photo' : 'Add a cover photo'}>
            {club.heroBannerUrl ? (
              <RemoteImage uri={club.heroBannerUrl} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg }} />
            ) : (
              <LinearGradient colors={c.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon ios="photo.on.rectangle" android="add_photo_alternate" size={30} color="rgba(255,255,255,0.9)" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Add a cover photo</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Wide, up to 5 MB</Text>
              </LinearGradient>
            )}
            <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
              {uploading === 'cover' ? <ActivityIndicator color="#FFF" size="small" /> : <Icon ios="camera.fill" android="photo_camera" size={14} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>{club.heroBannerUrl ? 'Change cover' : 'Add cover'}</Text>
            </View>
          </PressableScale>

          <PressableScale
            onPress={() => upload('logo')}
            accessibilityRole="button"
            accessibilityLabel={club.logoUrl ? 'Change logo' : 'Add a logo'}
            style={{ position: 'absolute', left: 16, bottom: -40 }}>
            <View style={{ borderRadius: 48, borderWidth: 4, borderColor: c.bg }}>
              <Avatar name={club.name} uri={club.logoUrl || null} size={84} />
            </View>
            <View style={{ position: 'absolute', right: 2, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, borderWidth: 2, borderColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
              {uploading === 'logo' ? <ActivityIndicator color={c.onPrimary} size="small" /> : <Icon ios="camera.fill" android="photo_camera" size={13} color={c.onPrimary} />}
            </View>
          </PressableScale>
          <View style={{ position: 'absolute', left: 112, right: 0, bottom: -46 }}>
            <Headline numberOfLines={1}>{f.name || club.name}</Headline>
            <Caption numberOfLines={1}>Tap the photos to change them</Caption>
          </View>
        </View>

        <Section icon={['building.2.fill', 'store']} title="Basics">
          <Field label="Club name" icon={['building.2', 'store']} value={f.name} onChangeText={set('name')} placeholder="Metro Snooker Club" autoCapitalize="words" />
          <Field label="Tagline" icon={['text.quote', 'format_quote']} value={f.tagline} onChangeText={set('tagline')} placeholder="Where every frame counts" />
          <Field label="About" value={f.description} onChangeText={set('description')} placeholder="Tables, timings, coaching — what makes your club special?" {...multiline} />
        </Section>

        <Section icon={['mappin.and.ellipse', 'location_on']} title="Location & contact" hint="Players use this to find and call you.">
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
          <Field label="Address" icon={['house', 'home']} value={f.address} onChangeText={set('address')} placeholder="Shop 12, MG Road" />
          <Field label="Phone" icon={['phone', 'call']} value={f.phone} onChangeText={set('phone')} placeholder="98765 43210" keyboardType="phone-pad" />
          <Field label="Email" icon={['envelope', 'mail']} value={f.email} onChangeText={set('email')} placeholder="club@example.com" autoCapitalize="none" keyboardType="email-address" />
          <Field label="Google Maps link" icon={['map', 'map']} value={f.googleMapsUrl} onChangeText={set('googleMapsUrl')} placeholder="https://maps.app.goo.gl/…" autoCapitalize="none" keyboardType="url" />
        </Section>

        <Section icon={['link', 'link']} title="Social links" hint="Shown on your club page. Leave empty to hide.">
          {SOCIAL.map(([k, label, placeholder]) => (
            <Field key={k} label={label} icon={['link', 'link']} value={f[k]} onChangeText={set(k)} placeholder={placeholder} autoCapitalize="none" keyboardType="url" />
          ))}
        </Section>

        <Section icon={['doc.text.fill', 'description']} title="Club pages" hint="Each one becomes a page on your club's website.">
          {PAGES.map(([k, label, placeholder]) => (
            <Field key={k} label={label} value={f[k]} onChangeText={set(k)} placeholder={placeholder} {...multiline} />
          ))}
        </Section>

        {error && <Body style={{ color: c.danger }}>{error}</Body>}
        <View style={{ height: 72 }} />
      </Screen>

      {/* Save bar stays in reach while scrolling the long form. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border }}>
        <Button
          title={justSaved ? 'Saved ✓' : dirty ? 'Save changes' : 'No changes'}
          icon={dirty && !justSaved ? ['checkmark', 'check'] : undefined}
          onPress={save}
          loading={saving}
          disabled={!dirty && !justSaved}
        />
      </View>
    </View>
  );
}

type ClubForm = ReturnType<typeof formFrom>;

function formFrom(club: FullClub) {
  return {
    name: club.name,
    tagline: club.tagline ?? '',
    description: club.description ?? '',
    stateCode: club.stateCode ?? '',
    cityId: club.cityId ?? '',
    address: club.address ?? '',
    phone: club.phone ?? '',
    email: club.email ?? '',
    googleMapsUrl: club.googleMapsUrl ?? '',
    facebook: club.socialLinks?.facebook ?? '',
    twitter: club.socialLinks?.twitter ?? '',
    instagram: club.socialLinks?.instagram ?? '',
    youtube: club.socialLinks?.youtube ?? '',
    aboutText: club.aboutText ?? '',
    rulesText: club.rulesText ?? '',
    membershipText: club.membershipText ?? '',
    privacyPolicyText: club.privacyPolicyText ?? '',
  };
}

const SOCIAL = [
  ['instagram', 'Instagram', 'https://instagram.com/yourclub'],
  ['facebook', 'Facebook', 'https://facebook.com/yourclub'],
  ['youtube', 'YouTube', 'https://youtube.com/@yourclub'],
  ['twitter', 'X (Twitter)', 'https://x.com/yourclub'],
] as const;

const PAGES = [
  ['aboutText', 'About the club', 'Your story — when you opened, what you offer…'],
  ['rulesText', 'House rules', 'Dress code, booking rules, conduct at the table…'],
  ['membershipText', 'Membership', 'Plans, prices and what members get…'],
  ['privacyPolicyText', 'Privacy policy', 'How you use players’ details…'],
] as const;

/** A titled card that groups related fields. */
function Section({ icon, title, hint, children }: PropsWithChildren<{ icon: [string, string]; title: string; hint?: string }>) {
  const { c } = useTheme();
  return (
    <Card style={{ gap: 14 }}>
      <Row style={{ gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios={icon[0]} android={icon[1]} size={16} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Headline>{title}</Headline>
          {!!hint && <Caption>{hint}</Caption>}
        </View>
      </Row>
      {children}
    </Card>
  );
}
