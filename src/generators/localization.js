'use strict';

const path = require('path');
const fs = require('fs-extra');

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

async function run(a) {
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const dir = path.join(a.targetDir, 'src/localization');
  await fs.ensureDir(path.join(dir, 'locales'));

  for (const locale of a.locales) {
    await fs.writeJson(
      path.join(dir, 'locales', `${locale}.json`),
      {
        common: {
          ok: locale === 'en' ? 'OK' : locale,
          cancel: locale === 'en' ? 'Cancel' : locale,
          retry: locale === 'en' ? 'Retry' : locale,
        },
        auth: {
          login: locale === 'en' ? 'Log in' : locale,
          logout: locale === 'en' ? 'Log out' : locale,
        },
      },
      { spaces: 2 }
    );
  }

  await fs.writeFile(
    path.join(dir, `i18n.${ext}`),
    `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
${a.locales.map((l) => `import ${l} from './locales/${l}.json';`).join('\n')}

i18n.use(initReactI18next).init({
  resources: {
${a.locales.map((l) => `    ${l}: { translation: ${l} },`).join('\n')}
  },
  lng: '${a.locales[0] || 'en'}',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
`
  );

  if (a.rtl) {
    await fs.writeFile(
      path.join(dir, `rtl.${ext}`),
      `import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';

/** RTL locales that flip layout direction when active. */
export const RTL_LOCALES = ${JSON.stringify([...RTL_LOCALES])};

/**
 * Changing RTL direction requires a full JS restart in React Native — there's
 * no way to flip layoutDirection live. Call this on language switch, then
 * confirm with the user before restarting (in-flight state will be lost).
 */
export function applyLocaleDirection(locale${a.language === 'typescript' ? ': string' : ''}) {
  const shouldBeRTL = RTL_LOCALES.includes(locale);
  if (shouldBeRTL !== I18nManager.isRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    RNRestart.restart();
  }
}
`
    );
  }

  if (a.accessibility) {
    await fs.writeFile(
      path.join(dir, `a11y.${ext}`),
      `/**
 * Small accessibility helpers used across the UI kit (see src/components/ui).
 * Prefer these over ad-hoc accessibilityLabel strings so labels stay
 * consistent and translatable.
 */
export function a11yButton(label${a.language === 'typescript' ? ': string' : ''}, hint${a.language === 'typescript' ? '?: string' : ''}) {
  return { accessibilityRole: 'button', accessibilityLabel: label, accessibilityHint: hint };
}

export function a11yHeader(label${a.language === 'typescript' ? ': string' : ''}) {
  return { accessibilityRole: 'header', accessibilityLabel: label };
}

export function a11yImage(description${a.language === 'typescript' ? ': string' : ''}) {
  return { accessible: true, accessibilityRole: 'image', accessibilityLabel: description };
}
`
    );
  }
}

module.exports = { run };
