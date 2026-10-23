import { router } from 'expo-router';
import { createContext, use, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { BottomSheet, Body, Button } from '@/components/ui';
import { useSession } from '@/lib/session';

type RequireAuth = (reason: string, action: () => void) => void;
const AuthGateContext = createContext<RequireAuth | null>(null);

/** Gate a members-only action: `requireAuth('to register for this tournament', () => openSheet())`.
 * Signed in → runs now. Signed out → explains why and offers Log in / Create account;
 * after a successful log-in the user is back on the same screen and the action runs. */
export function useRequireAuth(): RequireAuth {
  const gate = use(AuthGateContext);
  if (!gate) throw new Error('useRequireAuth must be used inside <AuthGateProvider>');
  return gate;
}

/** A pending action this old is dropped rather than run as a surprise later. */
const PENDING_TTL_MS = 5 * 60 * 1000;

export function AuthGateProvider({ children }: PropsWithChildren) {
  const { me } = useSession();
  const [reason, setReason] = useState<string | null>(null);
  const pending = useRef<{ action: () => void; at: number } | null>(null);

  const requireAuth = useCallback<RequireAuth>(
    (why, action) => {
      if (me) return action();
      pending.current = { action, at: Date.now() };
      setReason(why);
    },
    [me]
  );

  // Just signed in with something waiting: run it once the log-in screen has closed.
  useEffect(() => {
    if (!me || !pending.current) return;
    const { action, at } = pending.current;
    pending.current = null;
    if (Date.now() - at > PENDING_TTL_MS) return;
    const t = setTimeout(action, 450);
    return () => clearTimeout(t);
  }, [me]);

  const go = (path: '/sign-in' | '/register') => {
    setReason(null);
    setTimeout(() => router.push(path), 250); // let the sheet slide away first
  };

  return (
    <AuthGateContext value={requireAuth}>
      {children}
      <BottomSheet
        visible={!!reason}
        onClose={() => {
          setReason(null);
        }}
        title="Log in to continue">
        <Body muted>Please log in or create an account {reason}.</Body>
        <Button title="Log in" icon={['person.crop.circle', 'login']} onPress={() => go('/sign-in')} />
        <Button title="Create account" variant="secondary" icon={['person.crop.circle.badge.plus', 'person_add']} onPress={() => go('/register')} />
        <Button
          title="Not now"
          variant="ghost"
          onPress={() => {
            pending.current = null;
            setReason(null);
          }}
        />
      </BottomSheet>
    </AuthGateContext>
  );
}
