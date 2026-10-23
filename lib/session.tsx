import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { api, loadTokens, saveTokens, setSessionExpiredHandler, type Tokens } from './api';
import type { ClubMembership, OwnedClub, PlayerProfile, User } from './types';

/** The signed-in viewer, from GET /viewer. */
interface Me {
  user: User;
  profile: PlayerProfile | null;
  memberships: ClubMembership[];
  isPlatformAdmin: boolean;
  /** Clubs waiting for approval — only counted for platform admins. */
  pendingClubCount: number;
  /** Club enquiries waiting for review — only counted for platform admins. */
  pendingEnquiryCount: number;
  /** Approved clubs the viewer runs; any → the app works in owner mode. */
  ownedClubs: OwnedClub[];
}

interface SessionValue {
  isLoading: boolean;
  me: Me | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Re-reads the viewer (after editing the profile, joining a club, approving clubs…). */
  reload(): Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  const reload = useCallback(async () => {
    try {
      setMe(await api<Me>('/viewer'));
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setMe(null));
    (async () => {
      if (await loadTokens()) await reload();
      setLoading(false);
    })();
    return () => setSessionExpiredHandler(null);
  }, [reload]);

  // Coming back to the app re-reads the viewer, so e.g. an approved club switches the app
  // to owner mode. A failed request keeps the current session (no sign-out on a network blip).
  useEffect(() => {
    let last = Date.now();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - last < 30_000) return;
      last = Date.now();
      api<Me>('/viewer')
        .then((viewer) => setMe((current) => (current ? viewer : current)))
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const authenticate = useCallback(
    async (path: '/auth/signin' | '/auth/signup', email: string, password: string) => {
      const data = await api<Tokens>(path, { method: 'POST', body: { email: email.trim(), password } });
      await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      await reload(); // memberships and admin flags come from /viewer, not from sign-in
    },
    [reload]
  );

  const value = useMemo<SessionValue>(
    () => ({
      isLoading,
      me,
      signIn: (email, password) => authenticate('/auth/signin', email, password),
      signUp: (email, password) => authenticate('/auth/signup', email, password),
      signOut: async () => {
        await api('/auth/signout', { method: 'POST' }).catch(() => {});
        await saveTokens(null);
        setMe(null);
      },
      reload,
    }),
    [isLoading, me, authenticate, reload]
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
