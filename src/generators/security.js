'use strict';

const path = require('path');
const fs = require('fs-extra');

async function run(a) {
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const isTs = a.language === 'typescript';
  const dir = path.join(a.targetDir, 'src/services/security');
  const s = a.security;

  // Token storage always generated — networking.js's httpClient imports it.
  await fs.writeFile(
    path.join(dir, `tokenStorage.${ext}`),
    `import * as Keychain from 'react-native-keychain';

/**
 * Access/refresh tokens live in the OS Keychain/Keystore (not MMKV/AsyncStorage)
 * because they're sensitive: Keychain is encrypted at rest and scoped per-app.
 */
const SERVICE = '${a.projectName}.auth';

export async function setTokens(accessToken${isTs ? ': string' : ''}, refreshToken${isTs ? ': string' : ''}) {
  await Keychain.setGenericPassword('tokens', JSON.stringify({ accessToken, refreshToken }), { service: SERVICE });
}

export async function getAccessToken() {
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  if (!creds) return null;
  return JSON.parse(creds.password).accessToken ?? null;
}

export async function getRefreshToken() {
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  if (!creds) return null;
  return JSON.parse(creds.password).refreshToken ?? null;
}

export async function clearTokens() {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
`
  );

  if (s.includes('aes-encryption')) {
    await fs.writeFile(
      path.join(dir, `encryption.${ext}`),
      `import Aes from 'react-native-aes-crypto';

/**
 * AES-256 helpers for encrypting sensitive local data before writing it to
 * disk (e.g. cached PII). Never use this as a substitute for HTTPS/TLS in transit.
 */
const KEY_SIZE = 256;

export async function generateKey(password${isTs ? ': string' : ''}, salt${isTs ? ': string' : ''}) {
  return Aes.pbkdf2(password, salt, 5000, KEY_SIZE);
}

export async function encrypt(text${isTs ? ': string' : ''}, key${isTs ? ': string' : ''}) {
  const iv = await Aes.randomKey(16);
  const cipher = await Aes.encrypt(text, key, iv, 'aes-256-cbc');
  return { cipher, iv };
}

export async function decrypt(cipher${isTs ? ': string' : ''}, key${isTs ? ': string' : ''}, iv${isTs ? ': string' : ''}) {
  return Aes.decrypt(cipher, key, iv, 'aes-256-cbc');
}
`
    );
  }

  if (s.includes('ssl-pinning') || s.includes('certificate-pinning')) {
    await fs.writeFile(
      path.join(dir, `sslPinning.${ext}`),
      `import { fetch as pinnedFetch } from 'react-native-ssl-pinning';
import env from '../../config/env';

/**
 * SSL/Certificate pinning: rejects TLS connections whose certificate/public-key
 * hash doesn't match SSL_PIN_SHA256 (set per-environment). Protects against
 * MITM attacks even if a device trusts a rogue CA (e.g. corporate proxy, malware).
 * Use pinnedRequest() for auth/payment endpoints at minimum; the general
 * httpClient (axios) can be layered on top for non-critical calls.
 */
export async function pinnedRequest(path${isTs ? ': string' : ''}, options${isTs ? ': Record<string, unknown> = {}' : ' = {}'}) {
  return pinnedFetch(\`\${env.API_BASE_URL}\${path}\`, {
    method: 'GET',
    sslPinning: { certs: ['cert1'] }, // add your .cer files under android/app/src/main/assets & ios bundle
    ...options,
  });
}
`
    );
  }

  if (s.includes('request-signing')) {
    await fs.writeFile(
      path.join(dir, `requestSigning.${ext}`),
      `import CryptoJS from 'crypto-js';

/**
 * HMAC request signing: signs (method + path + timestamp + body) with a
 * per-device or per-session secret so the backend can reject tampered or
 * replayed requests. Pair with a short timestamp validity window server-side.
 */
export function signRequest(method${isTs ? ': string' : ''}, path${isTs ? ': string' : ''}, body${isTs ? ': string' : ''}, secret${isTs ? ': string' : ''}) {
  const timestamp = Date.now().toString();
  const payload = \`\${method.toUpperCase()}:\${path}:\${timestamp}:\${body}\`;
  const signature = CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex);
  return { 'X-Timestamp': timestamp, 'X-Signature': signature };
}
`
    );
  }

  if (s.includes('root-detection') || s.includes('jailbreak-detection') || s.includes('emulator-detection')) {
    await fs.writeFile(
      path.join(dir, `deviceIntegrity.${ext}`),
      `import JailMonkey from 'jail-monkey';

/**
 * Device integrity checks. These are a deterrent, not a guarantee — determined
 * attackers can bypass client-side checks. Combine with server-side signals
 * (Play Integrity / DeviceCheck / App Check) for anything security-critical.
 */
export function getDeviceIntegrityReport() {
  return {
    isJailBrokenOrRooted: JailMonkey.isJailBroken(),
    isOnExternalStorage: JailMonkey.isOnExternalStorage(),
    isDebuggedMode: JailMonkey.isDebuggedMode(),
    hookDetected: JailMonkey.hookDetected(),
    trustFall: JailMonkey.trustFall(), // combined heuristic score
  };
}
`
    );
  }

  if (s.includes('screenshot-blocking') || s.includes('screen-recording-detection')) {
    await fs.writeFile(
      path.join(dir, `screenPrivacy.${ext}`),
      `import ScreenshotPrevent from 'react-native-screenshot-prevent';

/**
 * Blocks screenshots/recording on sensitive screens (e.g. payment, KYC docs).
 * Call enableScreenPrivacy() on screen focus and disableScreenPrivacy() on blur
 * (see React Navigation's useFocusEffect) rather than globally, to avoid
 * breaking legitimate screenshot use elsewhere in the app.
 */
export function enableScreenPrivacy() {
  ScreenshotPrevent.enabled(true);
}

export function disableScreenPrivacy() {
  ScreenshotPrevent.enabled(false);
}

export function onScreenRecordingDetected(callback${isTs ? ': () => void' : ''}) {
  return ScreenshotPrevent.addListener?.('screenRecorded', callback);
}
`
    );
  }

  if (s.includes('play-integrity')) {
    await fs.writeFile(
      path.join(dir, `playIntegrity.${ext}`),
      `/**
 * Google Play Integrity API: request a token here and verify it server-side
 * against Google's Play Integrity servers before trusting a sensitive action
 * (e.g. redeeming a promo code, submitting a payment).
 * Requires native setup — see android_config_notes/PLAY_INTEGRITY.md.
 */
export async function requestPlayIntegrityToken(nonce${isTs ? ': string' : ''}) {
  // Wire up @react-native-firebase/app-check (playIntegrity provider, already
  // generated if selected) or a dedicated Play Integrity SDK bridge here.
  throw new Error('requestPlayIntegrityToken: connect to your native Play Integrity bridge.');
}
`
    );
  }

  if (s.includes('device-check')) {
    await fs.writeFile(
      path.join(dir, `deviceCheck.${ext}`),
      `/**
 * Apple DeviceCheck: generates a per-device token your backend verifies with
 * Apple to confirm requests originate from a genuine, non-jailbroken device.
 * Requires native setup — see ios_config_notes/DEVICE_CHECK.md.
 */
export async function requestDeviceCheckToken() {
  // Wire up @react-native-firebase/app-check (deviceCheck provider, already
  // generated if selected) or a native DeviceCheck bridge here.
  throw new Error('requestDeviceCheckToken: connect to your native DeviceCheck bridge.');
}
`
    );
  }

  // SECURITY.md explaining the "why" behind each chosen feature
  const explanations = {
    'ssl-pinning': 'Prevents MITM attacks by rejecting TLS certs that don\u2019t match a pinned hash, even if a rogue CA is trusted on-device.',
    'certificate-pinning': 'Same goal as SSL pinning; pins the full certificate rather than just the public key, trading flexibility for a tighter guarantee.',
    'aes-encryption': 'Protects sensitive data at rest on the device (cached PII, drafts) in case of local storage compromise.',
    'secure-storage': 'Stores small sensitive values (tokens, keys) in OS-encrypted storage instead of plain AsyncStorage/MMKV.',
    'request-signing': 'Lets the backend detect tampered or replayed requests by verifying an HMAC signature over the request.',
    'jwt-refresh': 'Keeps sessions alive without forcing re-login, while limiting the blast radius of a leaked short-lived access token.',
    'token-rotation': 'Rotating refresh tokens on each use limits how long a stolen refresh token remains useful.',
    'root-detection': 'Flags rooted Android devices, which have a larger attack surface for credential/memory extraction.',
    'jailbreak-detection': 'Flags jailbroken iOS devices for the same reason as root detection on Android.',
    'emulator-detection': 'Helps distinguish real users from bots/emulated fraud farms for sensitive flows.',
    'screenshot-blocking': 'Prevents casual capture of sensitive on-screen data (documents, card numbers).',
    'screen-recording-detection': 'Detects active screen recording so the app can blur/hide sensitive content in real time.',
    'app-check': 'Confirms requests to Firebase/your backend come from your genuine, untampered app build.',
    'play-integrity': 'Google\u2019s server-verifiable signal that the Android app/device/account are genuine.',
    'device-check': 'Apple\u2019s server-verifiable signal that the iOS app/device are genuine, without collecting device identifiers.',
  };
  const md = `# Security Features\n\nThis project enables the following security features. Each exists to close a specific threat model gap — none of them replace basic hygiene like HTTPS everywhere, server-side authorization checks, and not logging secrets.\n\n${s
    .map((key) => `## ${key}\n${explanations[key] || 'See implementation comments in src/services/security.'}\n`)
    .join('\n')}\n> Reminder: client-side checks (root/jailbreak/emulator detection, screenshot blocking) are deterrents, not guarantees. Treat them as one signal among several, verified server-side wherever the stakes are high.\n`;

  await fs.writeFile(path.join(a.targetDir, 'SECURITY.md'), md);
}

module.exports = { run };
