import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Body, Button, Caption, Card, Headline, Row } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import type { EnquiryStatus } from '@/lib/club-enquiry';

/** Home card for the "open a club" journey: invite → pending → approved/rejected → club pending. */
export function OwnClubCard({ status }: { status: EnquiryStatus | undefined }) {
  const { c } = useTheme();
  if (!status || status.stage === 'club_live') return null;
  const { stage, enquiry } = status;

  const look = {
    none: { tint: c.primary, icon: ['building.2.fill', 'store'], title: 'Own a snooker club?', text: 'Run tables, tournaments and live scoring on CueSphere. Send us a request to get started.' },
    pending: { tint: c.warning, icon: ['hourglass', 'hourglass_top'], title: 'Request sent', text: `We're reviewing your request for ${enquiry?.clubName ?? 'your club'}. We'll let you know soon.` },
    rejected: { tint: c.danger, icon: ['exclamationmark.circle.fill', 'error'], title: 'Request not approved', text: enquiry?.rejectReason || 'Your request was not approved.' },
    approved: { tint: c.success, icon: ['checkmark.seal.fill', 'verified'], title: 'Approved! Create your club', text: `Your request for ${enquiry?.clubName ?? 'your club'} is approved. Add your club's details to go live.` },
    club_pending: { tint: c.info, icon: ['clock.badge.checkmark', 'pending_actions'], title: 'Your club is waiting for approval', text: 'The CueSphere team is checking your club. Once approved, the app opens as your club admin.' },
  }[stage] as { tint: string; icon: [string, string]; title: string; text: string };

  const action =
    stage === 'none'
      ? { title: 'Create your club', onPress: () => router.push('/club-enquiry') }
      : stage === 'rejected'
        ? { title: 'Send a new request', onPress: () => router.push('/club-enquiry?resend=1') }
        : stage === 'approved'
          ? { title: 'Create your club →', onPress: () => router.push('/create-club') }
          : null;

  return (
    <Card style={{ gap: 12, borderLeftWidth: 4, borderLeftColor: look.tint }}>
      <Row style={{ gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: `${look.tint}1F`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios={look.icon[0]} android={look.icon[1]} size={22} color={look.tint} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Headline>{look.title}</Headline>
          {stage === 'rejected' ? (
            <>
              <Caption>Reason from CueSphere:</Caption>
              <Body>{look.text}</Body>
            </>
          ) : (
            <Body muted>{look.text}</Body>
          )}
        </View>
      </Row>
      {action && <Button title={action.title} variant={stage === 'approved' ? 'primary' : 'secondary'} onPress={action.onPress} />}
    </Card>
  );
}
