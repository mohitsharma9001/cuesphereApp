import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Body, Button, Caption, Card, Chip, Field, Headline, LiveDot, LoadState, PressableScale, RemoteImage, Row, Screen, SectionTitle, tapHaptic, useConfirm, useToast } from '@/components/ui';
import { radius, type as typo, useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import { WEBSITE_URL } from '@/lib/config';
import { formatElapsed } from '@/lib/format';
import { pickImageForm } from '@/lib/pick-image';
import type { ClubTable } from '@/lib/tables';
import { useApi } from '@/lib/use-api';

interface TvScreen {
  id: string;
  tableNumber: number | null;
  lastSeenAt: string | null;
  pairedAt: string | null;
}

type ShowKey = 'photos' | 'breakBalls' | 'intro' | 'bigBreakAlert' | 'frameBanner' | 'reds';

interface StreamSettings {
  youtubeUrls: Record<string, string>;
  sponsorLogos: string[];
  accent: string;
  show: Record<ShowKey, boolean>;
  ads: { enabled: boolean; images: string[]; secondsPerImage: number; onTv: boolean; onOverlay: boolean; afterMatch: boolean };
}

const ACCENTS = ['#d4af37', '#3fae7c', '#9b5cf6', '#e53935', '#f4f5f7'];
const SHOW_LABELS: [ShowKey, string][] = [
  ['photos', 'Player photos'],
  ['breakBalls', 'Balls in the current break'],
  ['intro', 'Intro card before the match'],
  ['bigBreakAlert', 'Big-break alert'],
  ['frameBanner', 'Frame-won banner'],
  ['reds', 'Reds left on the table'],
];
const AD_SECONDS = [5, 8, 10, 15, 20, 30];
/** A TV that checked in within this long counts as online. */
const ONLINE_MS = 2 * 60_000;

const tableLabel = (n: number | null) => (n === 0 ? 'All tables (rotate)' : n ? `Table ${n}` : 'Not set');

/** TV & Stream (#35): pair TVs, YouTube links, overlay, sponsor logos and ads. */
export default function TvStream() {
  const { slug } = useClub();
  const screens = useApi<TvScreen[]>(`/clubs/${slug}/tv-screens`);
  const tables = useApi<ClubTable[]>(`/clubs/${slug}/tables`);
  const settings = useApi<StreamSettings>(`/clubs/${slug}/stream-settings`);
  const tableNumbers = (tables.data ?? []).map((t) => t.tableNumber).sort((a, b) => a - b);

  return (
    <Screen
      refreshing={screens.refreshing || settings.refreshing}
      onRefresh={() => {
        screens.refresh();
        tables.refresh();
        settings.refresh();
      }}>
      <Stack.Screen options={{ title: 'TV & Stream' }} />
      <PairTv slug={slug} tableNumbers={tableNumbers} onPaired={screens.reload} />
      <SectionTitle>Paired TVs</SectionTitle>
      <LoadState loading={screens.loading} error={screens.error} onRetry={screens.refresh} empty={screens.data?.length === 0 && 'No TVs yet — pair one above.'} />
      {screens.data?.map((s) => <ScreenRow key={`${s.id}-${s.tableNumber}`} slug={slug} screen={s} tableNumbers={tableNumbers} onChanged={screens.reload} />)}

      {!settings.data ? (
        <LoadState loading={settings.loading} error={settings.error} onRetry={settings.refresh} />
      ) : (
        <>
          <SectionTitle>Live stream</SectionTitle>
          <Caption>Paste the YouTube live link for each table. Viewers watch it on the match page.</Caption>
          {tableNumbers.length === 0 && <Caption>Add tables in Tables & rates first.</Caption>}
          {tableNumbers.map((n) => (
            <StreamRow key={`${n}-${settings.data!.youtubeUrls[String(n)] ?? ''}`} slug={slug} table={n} url={settings.data!.youtubeUrls[String(n)] ?? ''} onSaved={settings.reload} />
          ))}
          <OverlayOptions key={`${settings.data.accent}-${JSON.stringify(settings.data.show)}`} slug={slug} settings={settings.data} onSaved={settings.reload} />
          <ImageList
            title="Sponsor logos"
            hint="Up to 3, shown on the stream overlay. PNG with a clear background looks best."
            images={settings.data.sponsorLogos}
            max={3}
            path={`/clubs/${slug}/stream-settings/sponsor-logos`}
            onChanged={settings.reload}
          />
          <AdOptions key={JSON.stringify({ ...settings.data.ads, images: undefined })} slug={slug} ads={settings.data.ads} onSaved={settings.reload} />
          <ImageList
            title="Ad images"
            hint="Up to 10. They rotate on TVs and the stream when ads are on."
            images={settings.data.ads.images}
            max={10}
            aspect={[16, 9]}
            path={`/clubs/${slug}/stream-settings/ads/images`}
            onChanged={settings.reload}
          />
        </>
      )}
    </Screen>
  );
}

function TableChips({ tableNumbers, value, onChange }: { tableNumbers: number[]; value: number | null; onChange: (n: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      <Chip label="All tables (rotate)" selected={value === 0} onPress={() => onChange(0)} />
      {tableNumbers.map((n) => (
        <Chip key={n} label={`Table ${n}`} selected={value === n} onPress={() => onChange(n)} />
      ))}
    </ScrollView>
  );
}

function PairTv({ slug, tableNumbers, onPaired }: { slug: string; tableNumbers: number[]; onPaired: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [table, setTable] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pair() {
    if (!code.trim()) return setError('Enter the code shown on the TV.');
    if (table === null) return setError('Choose which table this TV shows.');
    setBusy(true);
    setError(null);
    try {
      await api(`/clubs/${slug}/tv-screens/pair`, { method: 'POST', body: { code: code.trim(), table } });
      tapHaptic('success');
      toast('TV paired');
      setCode('');
      setTable(null);
      onPaired();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not pair the TV.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 12 }}>
      <Row>
        <Icon ios="tv.fill" android="tv" size={22} color={c.accent} />
        <Headline>Pair a TV</Headline>
      </Row>
      <Caption>Open {WEBSITE_URL.replace(/^https?:\/\//, '')}/tv on the TV and type the code it shows.</Caption>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        placeholder="CODE"
        placeholderTextColor={c.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        style={[typo.title, { textAlign: 'center', letterSpacing: 8, color: c.text, backgroundColor: c.surfaceAlt, borderRadius: radius.md, paddingVertical: 14, borderWidth: 1, borderColor: c.border }]}
      />
      <TableChips tableNumbers={tableNumbers} value={table} onChange={setTable} />
      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="Pair TV" onPress={pair} loading={busy} icon={['link', 'link']} />
    </Card>
  );
}

function ScreenRow({ slug, screen, tableNumbers, onChanged }: { slug: string; screen: TvScreen; tableNumbers: number[]; onChanged: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [moving, setMoving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const seen = screen.lastSeenAt ? new Date(screen.lastSeenAt).getTime() : 0;
  const online = seen > 0 && now - seen < ONLINE_MS;

  async function move(table: number) {
    try {
      await api(`/clubs/${slug}/tv-screens/${screen.id}`, { method: 'PATCH', body: { table } });
      toast(`TV now shows ${tableLabel(table).toLowerCase()}`);
      setMoving(false);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not move the TV.', 'error');
    }
  }

  async function unpair() {
    if (!(await confirm({ title: 'Unpair this TV?', message: 'It goes back to showing a pairing code.', confirmLabel: 'Unpair', destructive: true }))) return;
    try {
      await api(`/clubs/${slug}/tv-screens/${screen.id}`, { method: 'DELETE' });
      toast('TV unpaired');
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not unpair.', 'error');
    }
  }

  return (
    <Card style={{ gap: 10 }}>
      <Row>
        {online ? <LiveDot /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.textMuted }} />}
        <View style={{ flex: 1 }}>
          <Headline>{tableLabel(screen.tableNumber)}</Headline>
          <Caption>{online ? 'Online now' : seen ? `Last seen ${formatElapsed(now - seen)} ago` : 'Not seen yet'}</Caption>
        </View>
      </Row>
      {moving && <TableChips tableNumbers={tableNumbers} value={screen.tableNumber} onChange={move} />}
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title={moving ? 'Cancel' : 'Move'} variant="secondary" onPress={() => setMoving((m) => !m)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Unpair" variant="danger" onPress={unpair} />
        </View>
      </Row>
    </Card>
  );
}

function StreamRow({ slug, table, url: saved, onSaved }: { slug: string; table: number; url: string; onSaved: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [url, setUrl] = useState(saved);
  const [busy, setBusy] = useState(false);
  const overlay = `${WEBSITE_URL}/c/${slug}/overlay/${table}`;

  async function save() {
    setBusy(true);
    try {
      await api(`/clubs/${slug}/stream-settings/youtube/${table}`, { method: 'PUT', body: { url: url.trim() } });
      toast(url.trim() ? `Table ${table} stream saved` : `Table ${table} stream removed`);
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await Clipboard.setStringAsync(overlay);
    tapHaptic('success');
    toast('Overlay link copied — paste it into OBS as a browser source');
  }

  return (
    <Card style={{ gap: 10 }}>
      <Row>
        <Headline style={{ flex: 1 }}>Table {table}</Headline>
        {saved ? <Caption style={{ color: c.success, fontWeight: '800' }}>Link set</Caption> : null}
      </Row>
      <Field label="YouTube live link" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://youtube.com/live/…" />
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="Save" onPress={save} loading={busy} disabled={url.trim() === saved} />
        </View>
        <PressableScale onPress={() => WebBrowser.openBrowserAsync(overlay)} style={{ padding: 10 }} accessibilityLabel="Open overlay">
          <Icon ios="eye" android="visibility" size={22} color={c.primary} />
        </PressableScale>
        <PressableScale onPress={copy} style={{ padding: 10 }} accessibilityLabel="Copy overlay link">
          <Icon ios="doc.on.doc" android="content_copy" size={22} color={c.primary} />
        </PressableScale>
      </Row>
    </Card>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <Row>
      <Body style={{ flex: 1 }}>{label}</Body>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.primary, false: c.border }} thumbColor="#FFFFFF" />
    </Row>
  );
}

function OverlayOptions({ slug, settings, onSaved }: { slug: string; settings: StreamSettings; onSaved: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [accent, setAccent] = useState(settings.accent);
  const [show, setShow] = useState(settings.show);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api(`/clubs/${slug}/stream-settings/overlay`, { method: 'PUT', body: { accent, show } });
      toast('Overlay saved');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionTitle>Stream overlay</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Caption>Accent colour</Caption>
        <Row style={{ gap: 12 }}>
          {ACCENTS.map((a) => (
            <PressableScale key={a} onPress={() => setAccent(a)} accessibilityLabel={`Accent ${a}`}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a, borderWidth: 3, borderColor: accent === a ? c.primary : c.border, alignItems: 'center', justifyContent: 'center' }}>
                {accent === a && <Icon ios="checkmark" android="check" size={18} color={a === '#f4f5f7' ? '#111' : '#FFF'} />}
              </View>
            </PressableScale>
          ))}
        </Row>
        {SHOW_LABELS.map(([k, label]) => (
          <ToggleRow key={k} label={label} value={show[k]} onChange={(v) => setShow((s) => ({ ...s, [k]: v }))} />
        ))}
        <Button title="Save overlay" onPress={save} loading={busy} />
      </Card>
    </>
  );
}

function AdOptions({ slug, ads, onSaved }: { slug: string; ads: StreamSettings['ads']; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({ enabled: ads.enabled, secondsPerImage: ads.secondsPerImage, onTv: ads.onTv, onOverlay: ads.onOverlay, afterMatch: ads.afterMatch }));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api(`/clubs/${slug}/stream-settings/ads`, { method: 'PUT', body: f });
      toast('Ad settings saved');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionTitle>Ads</SectionTitle>
      <Card style={{ gap: 12 }}>
        <ToggleRow label="Show ads" value={f.enabled} onChange={(v) => setF((x) => ({ ...x, enabled: v }))} />
        {f.enabled && (
          <>
            <ToggleRow label="On TVs" value={f.onTv} onChange={(v) => setF((x) => ({ ...x, onTv: v }))} />
            <ToggleRow label="On the stream overlay" value={f.onOverlay} onChange={(v) => setF((x) => ({ ...x, onOverlay: v }))} />
            <ToggleRow label="After each match" value={f.afterMatch} onChange={(v) => setF((x) => ({ ...x, afterMatch: v }))} />
            <Caption>Seconds per image</Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {AD_SECONDS.map((s) => (
                <Chip key={s} label={`${s}s`} selected={f.secondsPerImage === s} onPress={() => setF((x) => ({ ...x, secondsPerImage: s }))} />
              ))}
            </View>
          </>
        )}
        <Button title="Save ads" onPress={save} loading={busy} />
      </Card>
    </>
  );
}

/** Upload / remove grid for sponsor logos and ad images. */
function ImageList({ title, hint, images, max, aspect, path, onChanged }: { title: string; hint: string; images: string[]; max: number; aspect?: [number, number]; path: string; onChanged: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function add() {
    try {
      const form = await pickImageForm({ aspect });
      if (!form) return;
      setBusy(true);
      await api(path, { method: 'POST', body: form });
      toast('Image added');
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not upload.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(url: string) {
    if (!(await confirm({ title: 'Remove this image?', confirmLabel: 'Remove', destructive: true }))) return;
    try {
      await api(path, { method: 'DELETE', body: { url } });
      toast('Image removed');
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not remove.', 'error');
    }
  }

  return (
    <>
      <SectionTitle>{`${title} (${images.length}/${max})`}</SectionTitle>
      <Caption>{hint}</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {images.map((url) => (
          <View key={url} style={{ width: '31%' }}>
            <RemoteImage uri={url} contentFit="contain" style={{ width: '100%', aspectRatio: aspect ? aspect[0] / aspect[1] : 1, borderRadius: radius.md, backgroundColor: c.surfaceAlt }} />
            <PressableScale onPress={() => remove(url)} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: c.danger, borderRadius: 12, padding: 4 }} accessibilityLabel="Remove image">
              <Icon ios="xmark" android="close" size={14} color="#FFF" />
            </PressableScale>
          </View>
        ))}
      </View>
      {images.length < max && <Button title={`Add ${title.toLowerCase().replace(/s$/, '')}`} variant="secondary" onPress={add} loading={busy} icon={['plus', 'add']} />}
    </>
  );
}
