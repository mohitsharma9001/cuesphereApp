import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthLayout } from '@/components/auth/auth-layout';
import { Icon } from '@/components/icon';
import { Body, Button, Field, useToast } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

function Rule({ ok, label }: { ok: boolean; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon ios={ok ? 'checkmark.circle.fill' : 'circle'} android={ok ? 'check_circle' : 'radio_button_unchecked'} size={16} color={ok ? c.success : c.textMuted} />
      <Text style={{ color: ok ? c.text : c.textMuted, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const { c } = useTheme();
  const { signUp } = useSession();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    // Same rules as the website's register form.
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await signUp(email.trim(), password);
      toast('Account created!');
      // The signed-out guard in app/_layout.tsx swaps this screen for Home now.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join clubs, enter tournaments and challenge friends."
      footer={
        <Link href="/sign-in" replace>
          <Text style={{ color: c.textMuted, fontSize: 15 }}>
            Already have an account? <Text style={{ color: c.primary, fontWeight: '800' }}>Log in</Text>
          </Text>
        </Link>
      }>
      <Field label="Email" icon={['envelope', 'mail']} value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <Field label="Password" icon={['lock', 'lock']} value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Field label="Confirm password" icon={['lock.rotation', 'lock_reset']} value={confirm} onChangeText={setConfirm} placeholder="Type it again" secureTextEntry autoComplete="new-password" onSubmitEditing={submit} />
      {!!password && (
        <View style={{ gap: 4 }}>
          <Rule ok={password.length >= 8} label="At least 8 characters" />
          <Rule ok={!!confirm && password === confirm} label="Passwords match" />
        </View>
      )}
      {error && <Body style={{ color: c.danger }}>{error}</Body>}
      <Button title="Create account" onPress={submit} loading={busy} disabled={!email || !password || !confirm} />
    </AuthLayout>
  );
}
