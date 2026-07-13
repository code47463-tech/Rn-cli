'use strict';

const path = require('path');
const fs = require('fs-extra');

async function run(a) {
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const isTs = a.language === 'typescript';
  const dir = path.join(a.targetDir, 'src/services/auth');
  const methods = a.authMethods;

  const providerImports = [];
  const providerMethods = [];

  if (methods.includes('email-password')) {
    providerMethods.push(`  async signInWithEmail(email${isTs ? ': string' : ''}, password${isTs ? ': string' : ''}) {
    ${a.useFirebase && a.firebaseModules.includes('auth') ? "const { firebaseAuth } = await import('../firebase/auth');\n    return firebaseAuth.signInWithEmail(email, password);" : '// Wire this up to your own backend /auth/login endpoint via httpClient.'}
  },`);
  }

  if (methods.includes('otp') || methods.includes('phone')) {
    providerMethods.push(`  async requestOtp(phoneNumber${isTs ? ': string' : ''}) {
    // Call your backend or Firebase phone auth to send an OTP/SMS code.
    // Kept provider-agnostic here so you can swap SMS vendors without touching call sites.
  },
  async verifyOtp(phoneNumber${isTs ? ': string' : ''}, code${isTs ? ': string' : ''}) {
    // Verify the code against your backend / Firebase confirmation result.
  },`);
  }

  if (methods.includes('google')) {
    providerImports.push(`import { GoogleSignin } from '@react-native-google-signin/google-signin';`);
    providerMethods.push(`  async signInWithGoogle() {
    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();
    ${a.useFirebase && a.firebaseModules.includes('auth')
      ? "const auth = (await import('@react-native-firebase/auth')).default;\n    const credential = auth.GoogleAuthProvider.credential(idToken);\n    return auth().signInWithCredential(credential);"
      : '// Exchange idToken with your backend for a session.\n    return { idToken };'}
  },`);
  }

  if (methods.includes('apple')) {
    providerImports.push(`import { appleAuth } from '@invertase/react-native-apple-authentication';`);
    providerMethods.push(`  async signInWithApple() {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
    ${a.useFirebase && a.firebaseModules.includes('auth')
      ? "const auth = (await import('@react-native-firebase/auth')).default;\n    const { identityToken, nonce } = response;\n    const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);\n    return auth().signInWithCredential(appleCredential);"
      : '// Exchange response.identityToken with your backend for a session.\n    return response;'}
  },`);
  }

  if (methods.includes('facebook')) {
    providerMethods.push(`  async signInWithFacebook() {
    // Integrate react-native-fbsdk-next LoginManager here, then exchange the
    // access token with Firebase (auth.FacebookAuthProvider.credential) or your backend.
  },`);
  }

  if (methods.includes('github')) {
    providerMethods.push(`  async signInWithGitHub() {
    // OAuth via an in-app browser (e.g. react-native-app-auth) against GitHub's
    // OAuth endpoint, then exchange the code with your backend.
  },`);
  }

  if (methods.includes('microsoft')) {
    providerMethods.push(`  async signInWithMicrosoft() {
    // OAuth via MSAL or react-native-app-auth against Azure AD / Microsoft identity platform.
  },`);
  }

  if (methods.includes('anonymous')) {
    providerMethods.push(`  async signInAnonymously() {
    ${a.useFirebase && a.firebaseModules.includes('auth')
      ? "const auth = (await import('@react-native-firebase/auth')).default;\n    return auth().signInAnonymously();"
      : '// Create a guest session on your backend.'}
  },`);
  }

  if (methods.includes('biometric')) {
    providerMethods.push(`  async unlockWithBiometrics() {
    const ReactNativeBiometrics = (await import('react-native-biometrics')).default;
    const rnBiometrics = new ReactNativeBiometrics();
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) return { success: false, reason: 'unavailable' };
    const { success } = await rnBiometrics.simplePrompt({ promptMessage: 'Unlock ${a.displayName}' });
    return { success };
  },`);
  }

  if (methods.includes('mfa-ready')) {
    providerMethods.push(`  async verifySecondFactor(code${isTs ? ': string' : ''}) {
    // Scaffolding only: wire this to your MFA provider (TOTP/SMS) once selected.
    // Kept as a distinct step so the sign-in flow can branch to an MFA screen.
  },`);
  }

  providerMethods.push(`  async signOut() {
    ${a.useFirebase && a.firebaseModules.includes('auth')
      ? "const { firebaseAuth } = await import('../firebase/auth');\n    await firebaseAuth.signOut();"
      : '// Clear your backend session / revoke tokens here.'}
    await import('../security/tokenStorage').then((m) => m.clearTokens());
  },`);

  const content = `${providerImports.join('\n')}${providerImports.length ? '\n\n' : ''}/**
 * Single entry point for all authentication methods selected in the wizard:
 * ${methods.join(', ')}.
 * Screens call authService.<method>() and never touch a provider SDK directly,
 * so switching providers later doesn't ripple through the UI layer.
 */
export const authService = {
${providerMethods.join('\n\n')}
};
`;

  await fs.writeFile(path.join(dir, `authService.${ext}`), content);
}

module.exports = { run };
