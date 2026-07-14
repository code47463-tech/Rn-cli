'use strict';

const path = require('path');
const fs = require('fs-extra');
const { screenDir } = require('../utils/paths');

/**
 * navigation.js imports Splash/Login/Register/Home/Profile screens by path.
 * Without this generator those imports point at files that don't exist and
 * Metro fails to resolve them the moment the app boots. These are real,
 * functional screens (wired to authService/UI kit/theme) — not empty stubs —
 * so a freshly generated project runs immediately, and teams have a working
 * example to model their own screens on.
 */
async function run(a) {
  const tsx = a.language === 'typescript' ? 'tsx' : 'js';
  const isTs = a.language === 'typescript';
  const hasRedux = a.stateManagement.includes('redux-toolkit');
  // feature-based screens live 2 levels under src (src/features/x/screens), so they need
  // one extra "../" to reach src/components, src/theme, src/services, src/store.
  const up = a.architecture === 'feature-based' ? '../' : '';

  const authDir = path.join(a.targetDir, 'src', screenDir(a.architecture, 'auth'));
  const homeDir = path.join(a.targetDir, 'src', screenDir(a.architecture, 'home'));
  const profileDir = path.join(a.targetDir, 'src', screenDir(a.architecture, 'profile'));

  await fs.writeFile(
    path.join(homeDir, `SplashScreen.${tsx}`),
    `import React from 'react';
import { Loader } from '../../${up}components/ui/Loader';

export default function SplashScreen() {
  return <Loader label="Loading..." />;
}
`
  );

  await fs.writeFile(
    path.join(authDir, `LoginScreen.${tsx}`),
    `import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
${hasRedux ? `import { useDispatch } from 'react-redux';
import { signInStart, signInSuccess, authError } from '../../${up}store/authSlice';
` : ''}import { Button } from '../../${up}components/ui/Button';
import { Input } from '../../${up}components/ui/Input';
import { authService } from '../../${up}services/auth/authService';

export default function LoginScreen({ navigation }${isTs ? ': any' : ''}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState${isTs ? '<string | null>' : ''}(null);
  ${hasRedux ? 'const dispatch = useDispatch();' : ''}

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      ${hasRedux ? 'dispatch(signInStart());' : ''}
      const result${isTs ? ': any' : ''} = await authService.signInWithEmail(email, password);
      ${hasRedux
        ? `dispatch(
        signInSuccess({
          user: { id: result?.user?.uid ?? 'unknown', email },
          accessToken: result?.user?.accessToken ?? '',
          refreshToken: result?.user?.refreshToken ?? '',
        })
      );`
        : '// Store the returned session/tokens in your chosen state manager.'}
    } catch (err${isTs ? ': any' : ''}) {
      ${hasRedux ? 'dispatch(authError());' : ''}
      setError(err?.message ?? 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
      <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} error={error ?? undefined} />
      <Button label="Log in" onPress={handleLogin} loading={loading} />
      <View style={{ height: 12 }} />
      <Button label="Create an account" variant="secondary" onPress={() => navigation.navigate('Register')} />
    </ScrollView>
  );
}
`
  );

  await fs.writeFile(
    path.join(authDir, `RegisterScreen.${tsx}`),
    `import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button } from '../../${up}components/ui/Button';
import { Input } from '../../${up}components/ui/Input';

export default function RegisterScreen({ navigation }${isTs ? ': any' : ''}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState${isTs ? '<string | null>' : ''}(null);

  async function handleRegister() {
    setError(null);
    setLoading(true);
    try {
      // Wire this up to your registration endpoint / Firebase createUserWithEmail.
      navigation.navigate('Login');
    } catch (err${isTs ? ': any' : ''}) {
      setError(err?.message ?? 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
      <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} error={error ?? undefined} />
      <Button label="Create account" onPress={handleRegister} loading={loading} />
    </ScrollView>
  );
}
`
  );

  await fs.writeFile(
    path.join(homeDir, `HomeScreen.${tsx}`),
    `import React from 'react';
import { View, Text } from 'react-native';
import { Header } from '../../${up}components/ui/Header';
import { Card } from '../../${up}components/ui/Card';
import { Button } from '../../${up}components/ui/Button';
import { useTheme } from '../../${up}theme/ThemeProvider';

export default function HomeScreen({ navigation }${isTs ? ': any' : ''}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="${a.displayName}" />
      <View style={{ padding: spacing.md }}>
        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Welcome</Text>
          <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>
            This is a generated starting screen. Replace it with your app's real home content, or run:
          </Text>
          <Text style={{ color: colors.primary, marginTop: spacing.xs }}>
            lakshit-rn-cli generate screen YourScreen --feature home
          </Text>
        </Card>
        <View style={{ height: spacing.md }} />
        <Button label="Go to Profile" variant="secondary" onPress={() => navigation.navigate('Profile')} />
      </View>
    </View>
  );
}
`
  );

  await fs.writeFile(
    path.join(profileDir, `ProfileScreen.${tsx}`),
    `import React from 'react';
import { View, Text } from 'react-native';
${hasRedux ? `import { useDispatch, useSelector } from 'react-redux';
import { signOut } from '../../${up}store/authSlice';
` : ''}import { Header } from '../../${up}components/ui/Header';
import { Button } from '../../${up}components/ui/Button';
import { authService } from '../../${up}services/auth/authService';
import { useTheme } from '../../${up}theme/ThemeProvider';

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  ${hasRedux ? `const dispatch = useDispatch();
  const user = useSelector((state${isTs ? ': any' : ''}) => state.auth?.user);` : ''}

  async function handleSignOut() {
    await authService.signOut();
    ${hasRedux ? 'dispatch(signOut());' : '// Clear your session state here.'}
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Profile" />
      <View style={{ padding: spacing.md }}>
        ${hasRedux
          ? `<Text style={{ color: colors.text, marginBottom: spacing.md }}>{user?.email ?? 'Signed in'}</Text>`
          : `<Text style={{ color: colors.text, marginBottom: spacing.md }}>Profile details go here.</Text>`}
        <Button label="Log out" variant="danger" onPress={handleSignOut} />
      </View>
    </View>
  );
}
`
  );
}

module.exports = { run };
