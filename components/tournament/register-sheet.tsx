import { useState } from 'react';

import { BottomSheet, Body, Button, Caption, Card, Headline, Row, tapHaptic } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { formatDateRange } from '@/lib/format';
import type { Tournament } from '@/lib/types';

/** "Register for this tournament?" — summary, then one-tap entry.
 * Shows the API's reason when it can't (profile incomplete, full, closed…). */
export function RegisterSheet({
  tournament: t,
  clubSlug,
  visible,
  onClose,
  onRegistered,
}: {
  tournament: Tournament;
  clubSlug: string;
  visible: boolean;
  onClose: () => void;
  onRegistered: () => void;
}) {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register() {
    setBusy(true);
    setError(null);
    try {
      await api(`/clubs/${clubSlug}/tournaments/${t.slug}/register`, { method: 'POST' });
      tapHaptic('success');
      onRegistered();
      onClose();
    } catch (e) {
      tapHaptic('error');
      setError(e instanceof ApiError ? e.message : 'Could not register.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title="Register for this tournament?">
      <Headline>{t.name}</Headline>
      <Card style={{ backgroundColor: c.surfaceAlt }}>
        <SheetLine label="Dates" value={formatDateRange(t.startDate, t.endDate) || 'To be announced'} />
        <SheetLine label="Entry fee" value={t.entryFee || 'Free'} />
        <SheetLine label="Format" value={`${t.format} · best of ${t.bestOf}`} />
        <SheetLine label="Players" value={`${t.registeredCount ?? 0} of ${t.maxPlayers} registered`} />
      </Card>
      <Caption>Entry fees are paid at the club.</Caption>
      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="Confirm registration" icon={['checkmark.circle.fill', 'check_circle']} onPress={register} loading={busy} />
      <Button title="Not now" variant="ghost" onPress={onClose} />
    </BottomSheet>
  );
}

function SheetLine({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', gap: 12 }}>
      <Caption>{label}</Caption>
      <Body style={{ flexShrink: 1, textAlign: 'right' }}>{value}</Body>
    </Row>
  );
}
