import { Link } from 'expo-router';
import { Text } from 'react-native';

import { AuthLayout } from '@/components/auth/auth-layout';
import { SignInForm } from '@/components/auth/sign-in-form';
import { useTheme } from '@/constants/theme';

/** First screen of the app while signed out. No navigation on success: the screen
 * sits behind a signed-out guard in app/_layout.tsx, so signing in opens Home. */
export default function SignInScreen() {
  const { c } = useTheme();
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue"
      footer={
        <Link href="/register" replace>
          <Text style={{ color: c.textMuted, fontSize: 15 }}>
            New to CueSphere? <Text style={{ color: c.primary, fontWeight: '800' }}>Create an account</Text>
          </Text>
        </Link>
      }>
      <SignInForm />
    </AuthLayout>
  );
}
