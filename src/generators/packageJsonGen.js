'use strict';

const path = require('path');
const fs = require('fs-extra');

const RN_CORE = {
  react: '18.2.0',
  'react-native': '0.74.0',
};

const BASE_DEPS = {
  'react-native-config': '^1.5.1',
  'react-native-mmkv': '^2.12.2',
};

function depsFor(a) {
  const deps = { ...RN_CORE, ...BASE_DEPS };

  // Navigation
  Object.assign(deps, {
    '@react-navigation/native': '^6.1.17',
    '@react-navigation/native-stack': '^6.9.26',
    'react-native-screens': '^3.31.1',
    'react-native-safe-area-context': '^4.10.1',
  });

  // State management
  if (a.stateManagement.includes('redux-toolkit')) {
    deps['@reduxjs/toolkit'] = '^2.2.5';
    deps['react-redux'] = '^9.1.2';
  }
  if (a.stateManagement.includes('redux-persist')) deps['redux-persist'] = '^6.0.0';
  if (a.stateManagement.includes('zustand')) deps.zustand = '^4.5.2';
  if (a.stateManagement.includes('react-query')) deps['@tanstack/react-query'] = '^5.40.0';

  // Networking
  deps.axios = '^1.7.2';

  // Firebase
  if (a.useFirebase) {
    deps['@react-native-firebase/app'] = '^20.0.0';
    const map = {
      auth: '@react-native-firebase/auth',
      firestore: '@react-native-firebase/firestore',
      'realtime-database': '@react-native-firebase/database',
      storage: '@react-native-firebase/storage',
      messaging: '@react-native-firebase/messaging',
      analytics: '@react-native-firebase/analytics',
      crashlytics: '@react-native-firebase/crashlytics',
      functions: '@react-native-firebase/functions',
      performance: '@react-native-firebase/perf',
      'remote-config': '@react-native-firebase/remote-config',
      'dynamic-links': '@react-native-firebase/dynamic-links',
      'app-check': '@react-native-firebase/app-check',
      installations: '@react-native-firebase/installations',
      'in-app-messaging': '@react-native-firebase/in-app-messaging',
    };
    for (const mod of a.firebaseModules) {
      if (map[mod]) deps[map[mod]] = '^20.0.0';
    }
  }

  // Auth (social/oauth SDKs)
  if (a.authMethods.includes('google')) deps['@react-native-google-signin/google-signin'] = '^11.0.1';
  if (a.authMethods.includes('apple')) deps['@invertase/react-native-apple-authentication'] = '^2.4.0';
  if (a.authMethods.includes('facebook')) deps['react-native-fbsdk-next'] = '^13.1.1';
  if (a.authMethods.includes('biometric')) deps['react-native-biometrics'] = '^3.0.1';

  // Storage / security
  deps['react-native-keychain'] = '^8.2.0';
  if (a.security.includes('aes-encryption')) deps['react-native-aes-crypto'] = '^3.2.1';
  if (a.security.includes('request-signing')) deps['crypto-js'] = '^4.2.0';
  if (a.security.includes('ssl-pinning') || a.security.includes('certificate-pinning')) {
    deps['react-native-ssl-pinning'] = '^1.5.6';
  }
  if (a.security.includes('root-detection') || a.security.includes('jailbreak-detection') || a.security.includes('emulator-detection')) {
    deps['jail-monkey'] = '^2.8.0';
  }
  if (a.security.includes('screenshot-blocking') || a.security.includes('screen-recording-detection')) {
    deps['react-native-screenshot-prevent'] = '^1.1.1';
  }

  // Notifications
  if (a.notifications) {
    deps['@notifee/react-native'] = '^7.8.2';
  }

  // Offline
  if (a.offlineFirst) {
    deps['@react-native-community/netinfo'] = '^11.3.1';
  }

  // Localization
  deps.i18next = '^23.11.5';
  deps['react-i18next'] = '^14.1.2';
  if (a.rtl) deps['react-native-restart'] = '^0.0.27';

  return deps;
}

function devDepsFor(a) {
  const dd = {
    '@babel/core': '^7.24.0',
    '@babel/preset-env': '^7.24.0',
    'metro-react-native-babel-preset': '0.77.0',
  };
  if (a.language === 'typescript') {
    Object.assign(dd, {
      typescript: '^5.4.5',
      '@types/react': '^18.2.79',
      '@types/jest': '^29.5.12',
    });
  }
  if (a.testing.includes('jest')) dd.jest = '^29.7.0';
  if (a.testing.includes('rntl')) {
    dd['@testing-library/react-native'] = '^12.5.1';
    // react-test-renderer is an unpinned transitive peer of @testing-library/react-native.
    // Without pinning it explicitly, npm can resolve the latest major (currently 19.x),
    // which requires React 19 and conflicts with this project's React 18 dependency.
    dd['react-test-renderer'] = RN_CORE.react;
  }
  if (a.testing.includes('detox')) dd.detox = '^20.24.0';
  if (a.codeQuality.includes('eslint')) {
    dd.eslint = '^8.57.0';
    dd['eslint-config-airbnb-typescript'] = '^18.0.0';
  }
  if (a.codeQuality.includes('prettier')) dd.prettier = '^3.3.0';
  if (a.codeQuality.includes('husky')) dd.husky = '^9.0.11';
  if (a.codeQuality.includes('lint-staged')) dd['lint-staged'] = '^15.2.5';
  if (a.codeQuality.includes('commitlint')) {
    dd['@commitlint/cli'] = '^19.3.0';
    dd['@commitlint/config-conventional'] = '^19.2.2';
  }
  return dd;
}

function scriptsFor(a) {
  const s = {
    start: 'react-native start',
    android: 'react-native run-android',
    ios: 'react-native run-ios',
    'build:android:qa': 'ENVFILE=.env.qa react-native run-android --variant=qaRelease',
    'build:android:production': 'ENVFILE=.env.production cd android && ./gradlew assembleRelease',
    'build:ios:production': 'ENVFILE=.env.production react-native run-ios --configuration Release',
  };
  if (a.testing.includes('jest')) s.test = 'jest';
  if (a.testing.includes('detox')) s['test:e2e'] = 'detox test';
  if (a.codeQuality.includes('eslint')) s.lint = 'eslint . --ext .js,.jsx,.ts,.tsx';
  if (a.codeQuality.includes('prettier')) s.format = 'prettier --write .';
  if (a.codeQuality.includes('husky')) s.prepare = 'husky install';
  return s;
}

async function run(answers) {
  const pkgPath = path.join(answers.targetDir, 'package.json');
  let existingPkg = {};
  if (await fs.pathExists(pkgPath)) {
    existingPkg = await fs.readJson(pkgPath);
  }

  const targetDeps = depsFor(answers);
  const targetDevDeps = devDepsFor(answers);
  const targetScripts = scriptsFor(answers);

  // Merge dependencies, keeping the template's versions for overlapping packages (like react, react-native, safe-area-context)
  const mergedDeps = {
    ...targetDeps,
    ...(existingPkg.dependencies || {}),
  };

  const mergedDevDeps = {
    ...targetDevDeps,
    ...(existingPkg.devDependencies || {}),
  };

  const mergedScripts = {
    ...(existingPkg.scripts || {}),
    ...targetScripts,
  };

  const pkg = {
    ...existingPkg,
    name: answers.projectName,
    version: answers.version,
    private: true,
    scripts: sortKeys(mergedScripts),
    dependencies: sortKeys(mergedDeps),
    devDependencies: sortKeys(mergedDevDeps),
  };

  await fs.writeJson(pkgPath, pkg, { spaces: 2 });

  if (answers.language === 'typescript') {
    const tsconfigPath = path.join(answers.targetDir, 'tsconfig.json');
    let existingTsconfig = {};
    if (await fs.pathExists(tsconfigPath)) {
      existingTsconfig = await fs.readJson(tsconfigPath);
    }
    const compilerOptions = {
      ...(existingTsconfig.compilerOptions || {}),
      baseUrl: '.',
      paths: {
        ...(existingTsconfig.compilerOptions?.paths || {}),
        '@/*': ['src/*'],
      },
    };
    const tsconfig = {
      ...existingTsconfig,
      extends: existingTsconfig.extends || '@react-native/typescript-config/tsconfig.json',
      compilerOptions,
    };
    await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
  }
}

function sortKeys(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((acc, k) => ((acc[k] = obj[k]), acc), {});
}

module.exports = { run, depsFor, devDepsFor };
