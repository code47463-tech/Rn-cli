'use strict';

const path = require('path');
const fs = require('fs-extra');

async function run(a) {
  if (!a.notifications) return;
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const isTs = a.language === 'typescript';
  const dir = path.join(a.targetDir, 'src/services/notifications');

  await fs.writeFile(
    path.join(dir, `localNotifications.${ext}`),
    `import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

/**
 * Local (device-triggered) notifications via Notifee. FCM remote pushes are
 * handled separately in src/services/firebase/messaging.${ext} — the two are
 * often combined: a remote push arrives, then a local notification is
 * displayed with full control over styling in the foreground.
 */
export async function createDefaultChannel() {
  await notifee.createChannel({
    id: 'default',
    name: 'General',
    importance: AndroidImportance.HIGH,
  });
}

export async function displayLocalNotification(title${isTs ? ': string' : ''}, body${isTs ? ': string' : ''}, data${isTs ? '?: Record<string, string>' : ''}) {
  await notifee.displayNotification({
    title,
    body,
    data,
    android: { channelId: 'default', pressAction: { id: 'default' } },
    ios: { sound: 'default' },
  });
}

/**
 * Handles taps on notifications while the app is foreground/background,
 * and taps that launch the app from a killed state (via getInitialNotification).
 */
export function registerNotificationTapHandlers(onNavigate${isTs ? ': (data?: Record<string, string>) => void' : ''}) {
  const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) onNavigate(detail.notification?.data${isTs ? ' as Record<string, string> | undefined' : ''});
  });

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) onNavigate(detail.notification?.data${isTs ? ' as Record<string, string> | undefined' : ''});
  });

  notifee.getInitialNotification().then((initial) => {
    if (initial) onNavigate(initial.notification?.data${isTs ? ' as Record<string, string> | undefined' : ''});
  });

  return unsubscribe;
}
`
  );

  await fs.writeFile(
    path.join(dir, `index.${ext}`),
    `export * from './localNotifications';
${a.useFirebase && a.firebaseModules.includes('messaging') ? "export * from '../firebase/messaging';\n" : ''}`
  );
}

module.exports = { run };
