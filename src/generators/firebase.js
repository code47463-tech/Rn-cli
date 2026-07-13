'use strict';

const path = require('path');
const fs = require('fs-extra');

const WRAPPERS = {
  auth: (isTs) => `import auth from '@react-native-firebase/auth';

/** Thin wrapper so the rest of the app depends on this, not the SDK directly. */
export const firebaseAuth = {
  signInWithEmail: (email${isTs ? ': string' : ''}, password${isTs ? ': string' : ''}) => auth().signInWithEmailAndPassword(email, password),
  createUserWithEmail: (email${isTs ? ': string' : ''}, password${isTs ? ': string' : ''}) => auth().createUserWithEmailAndPassword(email, password),
  signOut: () => auth().signOut(),
  currentUser: () => auth().currentUser,
  onAuthStateChanged: (cb${isTs ? ': (user: ReturnType<typeof auth>["currentUser"]) => void' : ''}) => auth().onAuthStateChanged(cb),
};
`,
  firestore: (isTs) => `import firestore from '@react-native-firebase/firestore';

export const db = firestore();

export function docRef(collection${isTs ? ': string' : ''}, id${isTs ? ': string' : ''}) {
  return db.collection(collection).doc(id);
}

export async function getDoc${isTs ? '<T = FirebaseFirestoreTypes.DocumentData>' : ''}(collection${isTs ? ': string' : ''}, id${isTs ? ': string' : ''}) {
  const snap = await docRef(collection, id).get();
  return snap.exists ? (snap.data()${isTs ? ' as T' : ''}) : null;
}
`,
  'realtime-database': () => `import database from '@react-native-firebase/database';

export const rtdb = database();

export function refAt(path) {
  return rtdb.ref(path);
}
`,
  storage: () => `import storage from '@react-native-firebase/storage';

export const firebaseStorage = storage();

export async function uploadFile(localUri, remotePath) {
  const reference = firebaseStorage.ref(remotePath);
  await reference.putFile(localUri);
  return reference.getDownloadURL();
}
`,
  messaging: () => `import messaging from '@react-native-firebase/messaging';

/**
 * FCM setup. Handles foreground, background, and killed-state messages,
 * plus notification-tap navigation. Call registerFcmHandlers() once at
 * app bootstrap (see src/app).
 */
export async function requestFcmPermission() {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export function registerFcmHandlers(onNavigateFromNotification) {
  // Foreground messages
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    // Show a local notification here via notifee (see src/services/notifications).
    console.log('[FCM] Foreground message:', remoteMessage);
  });

  // Background / killed-state tap handling
  messaging().onNotificationOpenedApp((remoteMessage) => {
    onNavigateFromNotification?.(remoteMessage?.data);
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) onNavigateFromNotification?.(remoteMessage.data);
    });

  return unsubscribeForeground;
}

// Must be registered outside the component tree (e.g. in index.js) for killed-state handling:
// messaging().setBackgroundMessageHandler(async (remoteMessage) => { ... });
`,
  analytics: () => `import analytics from '@react-native-firebase/analytics';

export const firebaseAnalytics = {
  logEvent: (name, params) => analytics().logEvent(name, params),
  setUserId: (id) => analytics().setUserId(id),
  logScreenView: (screenName) => analytics().logScreenView({ screen_name: screenName, screen_class: screenName }),
};
`,
  crashlytics: () => `import crashlytics from '@react-native-firebase/crashlytics';

export const firebaseCrashlytics = {
  recordError: (error) => crashlytics().recordError(error),
  log: (message) => crashlytics().log(message),
  setUserId: (id) => crashlytics().setUserId(id),
  crash: () => crashlytics().crash(), // for testing only — never call in production code paths
};
`,
  functions: () => `import functions from '@react-native-firebase/functions';

export function callFunction(name, payload) {
  return functions().httpsCallable(name)(payload);
}
`,
  performance: () => `import perf from '@react-native-firebase/perf';

export async function traceAsync(name, fn) {
  const trace = await perf().startTrace(name);
  try {
    return await fn();
  } finally {
    await trace.stop();
  }
}
`,
  'remote-config': () => `import remoteConfig from '@react-native-firebase/remote-config';

export async function initRemoteConfig(defaults) {
  await remoteConfig().setDefaults(defaults);
  await remoteConfig().fetchAndActivate();
}

export function getFlag(key) {
  return remoteConfig().getValue(key).asBoolean();
}
`,
  'dynamic-links': () => `import dynamicLinks from '@react-native-firebase/dynamic-links';

export function onDynamicLink(handler) {
  return dynamicLinks().onLink(handler);
}

export async function getInitialDynamicLink() {
  return dynamicLinks().getInitialLink();
}
`,
  'app-check': () => `import appCheck from '@react-native-firebase/app-check';

/** Attests the app is genuine before hitting sensitive backend/Firebase resources. */
export async function initAppCheck() {
  const rnfbProvider = appCheck().newReactNativeFirebaseAppCheckProvider();
  rnfbProvider.configure({
    android: { provider: 'playIntegrity' },
    apple: { provider: 'deviceCheck' },
  });
  await appCheck().initializeAppCheck({ provider: rnfbProvider, isTokenAutoRefreshEnabled: true });
}
`,
  installations: () => `import installations from '@react-native-firebase/installations';

export function getInstallationId() {
  return installations().getId();
}
`,
  'in-app-messaging': () => `import inAppMessaging from '@react-native-firebase/in-app-messaging';

export async function setInAppMessagingEnabled(enabled) {
  await inAppMessaging().setMessagesDisplaySuppressed(!enabled);
}
`,
};

async function run(a) {
  if (!a.useFirebase || a.firebaseModules.length === 0) return;

  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const isTs = a.language === 'typescript';
  const dir = path.join(a.targetDir, 'src/services/firebase');

  for (const mod of a.firebaseModules) {
    const factory = WRAPPERS[mod];
    if (!factory) continue;
    const fileName = mod.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    await fs.writeFile(path.join(dir, `${fileName}.${ext}`), factory(isTs));
  }

  await fs.writeFile(
    path.join(dir, `index.${ext}`),
    a.firebaseModules
      .map((mod) => `export * from './${mod.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}';`)
      .join('\n') + '\n'
  );
}

module.exports = { run, WRAPPERS };
