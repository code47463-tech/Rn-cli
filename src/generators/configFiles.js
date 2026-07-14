'use strict';

const path = require('path');
const fs = require('fs-extra');

function appConfigTemplate(a) {
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  return `/**
 * Centralized application configuration.
 * Do NOT hardcode secrets here — use environment files (.env.*) instead.
 * This file only exposes non-secret, build-time identity/branding data.
 */
${ext === 'ts' ? 'export interface AppConfig {\n  projectName: string;\n  displayName: string;\n  androidPackage: string;\n  iosBundleId: string;\n  version: string;\n  buildNumber: number;\n  company: string;\n  website: string;\n  supportEmail: string;\n  copyright: string;\n  privacyUrl: string;\n  termsUrl: string;\n}\n\n' : ''}const appConfig${ext === 'ts' ? ': AppConfig' : ''} = {
  projectName: '${a.projectName}',
  displayName: '${a.displayName}',
  androidPackage: '${a.androidPackage}',
  iosBundleId: '${a.iosBundleId}',
  version: '${a.version}',
  buildNumber: ${a.buildNumber},
  company: '${a.company}',
  website: '${a.website || ''}',
  supportEmail: '${a.email || ''}',
  copyright: '${(a.copyright || '').replace(/'/g, "\\'")}',
  privacyUrl: '${a.privacyUrl || ''}',
  termsUrl: '${a.termsUrl || ''}',
};

export default appConfig;
`;
}

function envFileTemplate(envName, a) {
  return `# ${envName.toUpperCase()} environment
# Copy real values from your secrets manager / CI variables — never commit real secrets.
APP_ENV=${envName}
API_BASE_URL=https://api.${envName}.${(a.projectName || 'app').toLowerCase()}.example.com
API_TIMEOUT_MS=15000

# Firebase (values injected per-environment at build time)
FIREBASE_PROJECT_ID=${a.projectName}-${envName}
FIREBASE_API_KEY=
FIREBASE_APP_ID=
FIREBASE_MESSAGING_SENDER_ID=

# Feature flags
ENABLE_CRASHLYTICS=${envName === 'production' ? 'true' : 'false'}
ENABLE_ANALYTICS=${envName === 'production' || envName === 'staging' ? 'true' : 'false'}
ENABLE_FLIPPER=${envName === 'development' ? 'true' : 'false'}

# Security
SSL_PIN_SHA256=
`;
}

function envLoaderTemplate(a) {
  const isTs = a.language === 'typescript';
  return `/**
 * Environment loader.
 * Reads APP_ENV (set via .env.<environment>, loaded by react-native-config
 * or react-native-dotenv depending on your bundler setup) and exposes a
 * single typed accessor so the rest of the app never reads process.env directly.
 */
import Config from 'react-native-config';

${isTs ? 'export type AppEnv = \'development\' | \'qa\' | \'staging\' | \'production\';\n\n' : ''}const env = {
  APP_ENV: (Config.APP_ENV${isTs ? ' as AppEnv' : ''}) || 'development',
  API_BASE_URL: Config.API_BASE_URL || '',
  API_TIMEOUT_MS: Number(Config.API_TIMEOUT_MS || 15000),
  FIREBASE_PROJECT_ID: Config.FIREBASE_PROJECT_ID || '',
  ENABLE_CRASHLYTICS: Config.ENABLE_CRASHLYTICS === 'true',
  ENABLE_ANALYTICS: Config.ENABLE_ANALYTICS === 'true',
  ENABLE_FLIPPER: Config.ENABLE_FLIPPER === 'true',
  SSL_PIN_SHA256: Config.SSL_PIN_SHA256 || '',
};

export function isProd()${isTs ? ': boolean' : ''} {
  return env.APP_ENV === 'production';
}

export default env;
`;
}

async function run(answers) {
  const { targetDir } = answers;
  const ext = answers.language === 'typescript' ? 'ts' : 'js';

  await fs.writeFile(path.join(targetDir, `app.config.${ext}`), appConfigTemplate(answers));

  for (const envName of answers.environments) {
    await fs.writeFile(path.join(targetDir, `.env.${envName}`), envFileTemplate(envName, answers));
  }
  await fs.writeFile(path.join(targetDir, '.env.example'), envFileTemplate('development', answers));

  await fs.writeFile(path.join(targetDir, `src/config/env.${ext}`), envLoaderTemplate(answers));

  // .gitignore should never track real env files, only .example
  const gitignoreAdd = `\n# Environments (never commit real secrets)\n.env.development\n.env.qa\n.env.staging\n.env.production\n`;
  await fs.appendFile(path.join(targetDir, '.gitignore'), gitignoreAdd);

  // react-native init writes app.json with name === displayName === projectName.
  // Update displayName to what the user actually entered in the wizard.
  const appJsonPath = path.join(targetDir, 'app.json');
  if (await fs.pathExists(appJsonPath)) {
    const appJson = await fs.readJson(appJsonPath);
    appJson.displayName = answers.displayName;
    await fs.writeJson(appJsonPath, appJson, { spaces: 2 });
  }
}

module.exports = { run };
