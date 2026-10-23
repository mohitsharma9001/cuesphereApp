import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, Body, BottomSheet, Button, Caption, Card, Chip, Field, Headline, LoadState, PressableScale, Row, SectionTitle, tapHaptic, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { ClubEnquiry } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** An enquiry as the admin list returns it (with the player's email and place names). */
export type AdminEnquiry = ClubEnquiry & { email: string | null; stateName: string; cityName: string };

const QUICK_REASONS = ["We couldn't reach you on that number.", 'Please send more details about the club.', 'This doesn’t look like a snooker or pool club.'];

/** Pending club enquiries (oldest first) with Approve / Reject, then recently reviewed ones. */
export function EnquiryReview({ pending, onChanged }: { pending: ReturnType<typeof useApi<AdminEnquiry[]>>; onChanged: () => void }) {
  const approved = useApi<AdminEnquiry[]>('/platform/club-enquiries?status=approved');
  const rejected = useApi<AdminEnquiry[]>('/platform/club-enquiries?status=rejected');
  const reviewed = [...(approved.data ?? []), ...(rejected.data ?? [])]
    .sort((a, b) => String(b.reviewedAt ?? '').localeCompare(String(a.reviewedAt ?? '')))
    .slice(0, 15);

  const changed = () => {
    onChanged();
    approved.reload();
    rejected.reload();
  };

  return (
    <>
      <SectionTitle>{`Waiting for review (${pending.data?.length ?? 0})`}</SectionTitle>
      <LoadState loading={pending.loading} error={pending.error} onRetry={pending.refresh} empty={pending.data?.length === 0 && 'All caught up — no club requests waiting.'} />
      {pending.data?.map((e) => <EnquiryCard key={e.id} enquiry={e} onDone={changed} />)}

      {reviewed.length > 0 && <SectionTitle>Recently reviewed</SectionTitle>}
      {reviewed.map((e) => (
        <ReviewedRow key={e.id} enquiry={e} />
      ))}
    </>
  );
}

function EnquiryCard({ enquiry: e, onDone }: { enquiry: AdminEnquiry; onDone: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pickReason = (r: string) => {
    setReason(r);
    setError(null);
  };

  async function approve() {
    setBusy('approve');
    try {
      await api(`/platform/club-enquiries/${e.id}/approve`, { method: 'POST' });
      tapHaptic('success');
      toast(`${e.ownerName} can now create ${e.clubName}`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not approve.', 'error');
      setBusy(null);
    }
  }

  async function reject() {
    if (reason.trim().length < 3) return setError('Tell the player why (a few words).');
    setBusy('reject');
    setError(null);
    try {
      await api(`/platform/club-enquiries/${e.id}/reject`, { method: 'POST', body: { reason: reason.trim() } });
      setRejecting(false);
      toast('Request rejected — the player sees your reason', 'info');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject.');
      setBusy(null);
    }
  }

  const call = () => Linking.openURL(`tel:+91${e.mobile}`);
  const whatsapp = () => Linking.openURL(`https://wa.me/91${e.mobile}?text=${encodeURIComponent(`Hi ${e.ownerName}, this is CueSphere about your request for ${e.clubName}.`)}`);

  return (
    <Card style={{ gap: 12, borderLeftWidth: 4, borderLeftColor: c.warning }}>
      <Row style={{ gap: 12 }}>
        <Avatar name={e.ownerName} size={46} />
        <View style={{ flex: 1, gap: 2 }}>
          <Headline numberOfLines={1}>{e.clubName}</Headline>
          <Caption numberOfLines={1}>
            {e.ownerName}
            {e.email ? ` · ${e.email}` : ''}
          </Caption>
        </View>
      </Row>

      <View style={{ gap: 6 }}>
        <Detail icon={['mappin.and.ellipse', 'location_on']} text={[e.cityName, e.stateName].filter(Boolean).join(', ') || '—'} />
        <Detail icon={['square.grid.2x2', 'grid_view']} text={`${e.tables} ${e.tables === 1 ? 'table' : 'tables'}`} />
        <Detail icon={['clock', 'schedule']} text={`Sent ${formatDateTime(e.createdAt)}`} />
      </View>
      {!!e.message && (
        <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 12 }}>
          <Body>“{e.message}”</Body>
        </View>
      )}

      <Row style={{ gap: 8 }}>
        <ContactButton label={`+91 ${e.mobile.slice(0, 5)} ${e.mobile.slice(5)}`} icon={['phone.fill', 'call']} onPress={call} />
        <ContactButton label="WhatsApp" icon={['message.fill', 'chat']} onPress={whatsapp} />
      </Row>

      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="Reject" variant="danger" icon={['xmark', 'close']} onPress={() => setRejecting(true)} disabled={busy !== null} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Approve" icon={['checkmark', 'check']} onPress={approve} loading={busy === 'approve'} disabled={busy !== null} />
        </View>
      </Row>

      <BottomSheet visible={rejecting} onClose={() => setRejecting(false)} title={`Reject ${e.clubName}?`}>
        <Body muted>The player sees this reason on their Home screen and can send a new request.</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_REASONS.map((r) => (
            <Chip key={r} label={r} selected={reason === r} onPress={() => pickReason(r)} />
          ))}
        </View>
        <Field label="Reason" value={reason} onChangeText={pickReason} placeholder="Why can't we approve this yet?" multiline style={{ minHeight: 70, textAlignVertical: 'top', paddingTop: 12 }} />
        {error && <Body style={{ color: c.danger }}>{error}</Body>}
        <Button title="Reject request" variant="danger" onPress={reject} loading={busy === 'reject'} />
      </BottomSheet>
    </Card>
  );
}

function Detail({ icon, text }: { icon: [string, string]; text: string }) {
  const { c } = useTheme();
  return (
    <Row style={{ gap: 8 }}>
      <Icon ios={icon[0]} android={icon[1]} size={16} color={c.textMuted} />
      <Caption style={{ flex: 1 }}>{text}</Caption>
    </Row>
  );
}

function ContactButton({ label, icon, onPress }: { label: string; icon: [string, string]; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: c.border }}>
      <Icon ios={icon[0]} android={icon[1]} size={16} color={c.primary} />
      <Caption style={{ color: c.primary, fontWeight: '800' }}>{label}</Caption>
    </PressableScale>
  );
}

function ReviewedRow({ enquiry: e }: { enquiry: AdminEnquiry }) {
  const { c } = useTheme();
  const ok = e.status === 'approved';
  const outcome = ok ? (e.clubId ? 'Approved · club created' : 'Approved · club not created yet') : `Rejected · ${e.rejectReason}`;
  return (
    <Card style={{ gap: 4, paddingVertical: 12 }}>
      <Row style={{ gap: 8 }}>
        <Icon ios={ok ? 'checkmark.circle.fill' : 'xmark.circle.fill'} android={ok ? 'check_circle' : 'cancel'} size={18} color={ok ? c.success : c.danger} />
        <Headline style={{ flex: 1 }} numberOfLines={1}>
          {e.clubName}
        </Headline>
        <Caption>{e.reviewedAt ? formatDateTime(e.reviewedAt) : ''}</Caption>
      </Row>
      <Caption numberOfLines={2}>
        {e.ownerName} · {[e.cityName, e.stateName].filter(Boolean).join(', ')} — {outcome}
      </Caption>
    </Card>
  );
}
