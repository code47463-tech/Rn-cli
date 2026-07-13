'use strict';

/**
 * Presets pre-fill large chunks of the wizard so users can accept smart
 * defaults instead of answering all ~60 questions individually.
 * Any preset answer can still be overridden interactively unless --yes is passed.
 */
const presets = {
  minimal: {
    language: 'typescript',
    packageManager: 'npm',
    architecture: 'feature-based',
    stateManagement: ['context'],
    firebaseModules: [],
    authMethods: ['email-password'],
    security: ['secure-storage'],
    navigation: ['root', 'auth', 'main'],
    testing: ['jest'],
    codeQuality: ['eslint', 'prettier'],
    offlineFirst: false,
    notifications: false,
  },
  standard: {
    language: 'typescript',
    packageManager: 'yarn',
    architecture: 'clean-architecture',
    stateManagement: ['redux-toolkit', 'redux-persist', 'react-query'],
    firebaseModules: ['auth', 'firestore', 'messaging', 'analytics', 'crashlytics'],
    authMethods: ['email-password', 'google', 'apple', 'biometric'],
    security: ['secure-storage', 'jwt-refresh', 'ssl-pinning'],
    navigation: ['root', 'auth', 'main', 'deep-linking', 'guards'],
    testing: ['jest', 'rntl'],
    codeQuality: ['eslint', 'prettier', 'husky', 'lint-staged', 'commitlint'],
    offlineFirst: true,
    notifications: true,
  },
  enterprise: {
    language: 'typescript',
    packageManager: 'pnpm',
    architecture: 'clean-architecture',
    stateManagement: ['redux-toolkit', 'redux-persist', 'react-query'],
    firebaseModules: [
      'auth', 'firestore', 'realtime-database', 'storage', 'messaging',
      'analytics', 'crashlytics', 'functions', 'performance', 'remote-config',
      'dynamic-links', 'app-check', 'installations', 'in-app-messaging',
    ],
    authMethods: [
      'email-password', 'otp', 'phone', 'google', 'apple', 'facebook',
      'github', 'microsoft', 'anonymous', 'biometric', 'mfa-ready',
    ],
    security: [
      'ssl-pinning', 'certificate-pinning', 'aes-encryption', 'secure-storage',
      'request-signing', 'jwt-refresh', 'token-rotation', 'root-detection',
      'jailbreak-detection', 'emulator-detection', 'screenshot-blocking',
      'screen-recording-detection', 'app-check', 'play-integrity', 'device-check',
    ],
    navigation: ['root', 'auth', 'main', 'deep-linking', 'guards'],
    testing: ['jest', 'detox', 'rntl'],
    codeQuality: ['eslint', 'prettier', 'husky', 'lint-staged', 'commitlint'],
    offlineFirst: true,
    notifications: true,
  },
};

module.exports = { presets };
