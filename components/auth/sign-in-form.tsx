import { useState } from 'react';

import { Body, Button, Field, useToast } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

/** Email + password log-in (the app's first screen). */
export function SignInForm({ onSignedIn }: { onSignedIn?: () => void }) {
  const { c } = useTheme();
  const { signIn } = useSession();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      toast('Welcome back!');
      onSignedIn?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not log in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Field label="Email" icon={['envelope', 'mail']} value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" />
      <Field label="Password" icon={['lock', 'lock']} value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry autoComplete="password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="Log in" onPress={submit} loading={busy} disabled={!email || !password} />
    </>
  );
}
