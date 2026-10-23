import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EnquiryReview, type AdminEnquiry } from '@/components/admin/enquiry-review';
import { ClubCard } from '@/components/club-card';
import { Icon } from '@/components/icon';
import { Avatar, Body, Button, Caption, Card, Headline, LoadState, Row, Screen, SectionTitle, SegmentedControl, tapHaptic, useConfirm, useToast } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api } from '@/lib/api';
import { WEBSITE_URL } from '@/lib/config';
import { useSession } from '@/lib/session';
import type { City, Club, IndianState } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Club Approvals (#37) — platform admins review club requests (enquiries) and new clubs. */
export default function ClubApprovalsScreen() {
  const { me, reload: reloadSession } = useSession();
  const admin = !!me?.isPlatformAdmin;
  const enquiries = useApi<AdminEnquiry[]>(admin ? '/platform/club-enquiries?status=pending' : null);
  const pending = useApi<Club[]>(admin ? '/clubs?status=pending' : null);
  const [tab, setTab] = useState<'enquiries' | 'clubs'>('enquiries');
  const live = useApi<Club[]>(admin ? '/clubs?status=approved&include=counts' : null);
  const states = useApi<IndianState[]>(admin ? '/locations/states' : null);
  const cities = useApi<City[]>(admin ? '/locations/cities' : null);

  if (!admin) {
    return (
      <Screen>
        <LoadState error="Only CueSphere admins can approve clubs." />
      </Screen>
    );
  }

  const place = (club: Club) =>
    [cities.data?.find((ci) => ci.id === club.cityId)?.name, states.data?.find((s) => s.code === club.stateCode)?.name].filter(Boolean).join(', ');

  const changed = () => {
    enquiries.reload();
    pending.reload();
    live.reload();
    reloadSession(); // refreshes the ☰ badge count
  };

  return (
    <Screen
      refreshing={enquiries.refreshing || pending.refreshing || live.refreshing}
      onRefresh={() => {
        enquiries.refresh();
        pending.refresh();
        live.refresh();
      }}>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'enquiries', label: `Requests (${enquiries.data?.length ?? 0})` },
          { value: 'clubs', label: `Clubs (${pending.data?.length ?? 0})` },
        ]}
      />
      {tab === 'enquiries' ? <EnquiryReview pending={enquiries} onChanged={changed} /> : <ClubsTab pending={pending} live={live} place={place} onChanged={changed} />}
    </Screen>
  );
}

function ClubsTab({
  pending,
  live,
  place,
  onChanged: changed,
}: {
  pending: ReturnType<typeof useApi<Club[]>>;
  live: ReturnType<typeof useApi<Club[]>>;
  place: (club: Club) => string;
  onChanged: () => void;
}) {
  return (
    <>
      <SectionTitle>{`Pending approval (${pending.data?.length ?? 0})`}</SectionTitle>
      <LoadState loading={pending.loading} error={pending.error} onRetry={pending.refresh} empty={pending.data?.length === 0 && 'All caught up — no clubs waiting.'} />
      {pending.data?.map((club) => <PendingClubCard key={club.id} club={club} place={place(club)} onDone={changed} />)}

      <SectionTitle>{`Live clubs (${live.data?.length ?? 0})`}</SectionTitle>
      <LoadState loading={live.loading} error={live.error} onRetry={live.refresh} empty={live.data?.length === 0 && 'No live clubs yet.'} />
      {live.data?.map((club) => <ClubCard key={club.id} club={club} onPress={() => router.push(`/club/${club.slug}`)} />)}
    </>
  );
}

function PendingClubCard({ club, place, onDone }: { club: Club; place: string; onDone: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const owner = useApi<{ email: string | null }>(`/platform/clubs/${club.id}/owner`);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  async function approve() {
    setBusy('approve');
    try {
      await api(`/platform/clubs/${club.id}/approve`, { method: 'POST' });
      tapHaptic('success');
      toast(`${club.name} is live`);
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not approve.', 'error');
      setBusy(null);
    }
  }

  async function reject() {
    const ok = await confirm({
      title: `Reject ${club.name}?`,
      message: 'The club is deleted. The owner’s request stays approved, so they can fix the details and create it again.',
      confirmLabel: 'Reject',
      destructive: true,
    });
    if (!ok) return;
    setBusy('reject');
    try {
      await api(`/platform/clubs/${club.id}/reject`, { method: 'POST' });
      toast(`${club.name} rejected`);
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not reject.', 'error');
      setBusy(null);
    }
  }

  return (
    <Card style={{ gap: 12, borderWidth: 1, borderColor: c.warning }}>
      <Row style={{ gap: 12 }}>
        <Avatar name={club.name} uri={club.logoUrl || null} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Headline numberOfLines={1}>{club.name}</Headline>
          <Caption numberOfLines={1}>{`${WEBSITE_URL.replace(/^https?:\/\//, '')}/c/${club.slug}`}</Caption>
        </View>
      </Row>
      {!!club.tagline && <Body>{club.tagline}</Body>}
      <View style={{ gap: 6 }}>
        <Row style={{ gap: 6 }}>
          <Icon ios="mappin.and.ellipse" android="location_on" size={16} color={c.textMuted} />
          <Caption>{place || 'No city set'}</Caption>
        </Row>
        <Row style={{ gap: 6 }}>
          <Icon ios="envelope" android="mail" size={16} color={c.textMuted} />
          <Caption>{owner.data?.email ?? (owner.loading ? 'Loading owner…' : 'No owner found')}</Caption>
        </Row>
      </View>
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="Reject" variant="danger" icon={['xmark', 'close']} onPress={reject} loading={busy === 'reject'} disabled={busy !== null} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Approve" icon={['checkmark', 'check']} onPress={approve} loading={busy === 'approve'} disabled={busy !== null} />
        </View>
      </Row>
    </Card>
  );
}
