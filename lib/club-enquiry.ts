import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import type { ClubEnquiry, EnquiryStage } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export interface EnquiryStatus {
  stage: EnquiryStage;
  enquiry: ClubEnquiry | null;
}

/** The viewer's "open a club" status. Refetched quietly each time the screen comes
 * back into view (so an approval shows up after returning to Home). */
export function useClubEnquiry(enabled = true) {
  const status = useApi<EnquiryStatus>(enabled ? '/club-enquiries/me' : null);
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // The first focus is the initial load, which useApi already does.
      if (focusedBefore.current && enabled) status.reload();
      focusedBefore.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled])
  );
  return status;
}
