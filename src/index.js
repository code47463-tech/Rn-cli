'use strict';

const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');
const chalk = require('chalk');
const { spawn } = require('child_process');
const logger = require('./utils/logger');
const { runWizard } = require('./prompts');
const { presets } = require('./data/presets');

const scaffold = require('./generators/scaffold');
const configFiles = require('./generators/configFiles');
const packageJsonGen = require('./generators/packageJsonGen');
const firebaseGen = require('./generators/firebase');
const authGen = require('./generators/auth');
const securityGen = require('./generators/security');
const networkingGen = require('./generators/networking');
const stateGen = require('./generators/state');
const navigationGen = require('./generators/navigation');
const uiGen = require('./generators/ui');
const notificationsGen = require('./generators/notifications');
const offlineGen = require('./generators/offline');
const localizationGen = require('./generators/localization');
const nativeGen = require('./generators/native');
const devopsGen = require('./generators/devops');
const testingGen = require('./generators/testing');
const codeQualityGen = require('./generators/codeQuality');
const docsGen = require('./generators/docs');
const appEntry = require('./generators/appEntry');
const screensGen = require('./generators/screens');

async function runCreate({ projectDir, yes, preset }) {
  logger.title('React Native Enterprise CLI');
  logger.info('This wizard scaffolds a production-grade React Native project.\n');

  const chosenPreset = preset && presets[preset] ? presets[preset] : {};
  if (preset && !presets[preset]) {
    logger.warn(`Unknown preset "${preset}", falling back to blank defaults. Valid presets: ${Object.keys(presets).join(', ')}`);
  }

  const answers = await runWizard(chosenPreset, !!yes);

  if (!answers.confirmed) {
    logger.warn('Aborted — nothing was generated.');
    return;
  }

  const targetDir = path.resolve(process.cwd(), projectDir || answers.projectName);
  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      throw new Error(`Target directory "${targetDir}" already exists and is not empty.`);
    }
  }
  // IMPORTANT: do NOT fs.ensureDir(targetDir) here. `react-native init --directory`
  // refuses to write into a directory that already exists (even empty) in several
  // CLI versions, and in others it silently nests output one level deeper instead.
  // Only ensure the *parent* exists; let the native init command create targetDir itself.
  await fs.ensureDir(path.dirname(targetDir));
  answers.targetDir = targetDir;

  const steps = [
    ['Initializing React Native project (npx @react-native-community/cli init)', () => initReactNativeProject(answers)],
    ['Verifying native android/ios folders were created', () => verifyNativeProject(answers)],
    ['Scaffolding folder structure', () => scaffold.run(answers)],
    ['Writing package.json & dependencies', () => packageJsonGen.run(answers)],
    ['Writing app.config.js and environment files', () => configFiles.run(answers)],
    ['Generating state management setup', () => stateGen.run(answers)],
    ['Generating networking layer (Axios, interceptors, token refresh)', () => networkingGen.run(answers)],
    ['Generating starter screens (Splash, Login, Register, Home, Profile)', () => screensGen.run(answers)],
    ['Generating navigation (root/auth/main, deep linking, guards)', () => navigationGen.run(answers)],
    ['Generating UI kit (Button, Input, Card, Theme, ...)', () => uiGen.run(answers)],
    ['Generating Firebase wrapper services', () => firebaseGen.run(answers)],
    ['Generating authentication services', () => authGen.run(answers)],
    ['Generating security utilities', () => securityGen.run(answers)],
    ['Generating notifications', () => notificationsGen.run(answers)],
    ['Generating offline-first support', () => offlineGen.run(answers)],
    ['Generating localization & accessibility', () => localizationGen.run(answers)],
    ['Rewriting App.tsx/App.js root entry', () => appEntry.run(answers)],
    ['Configuring Android & iOS native placeholders', () => nativeGen.run(answers)],
    ['Setting up testing tools', () => testingGen.run(answers)],
    ['Setting up code quality tooling', () => codeQualityGen.run(answers)],
    ['Setting up DevOps (git, CI, Fastlane)', () => devopsGen.run(answers)],
    ['Writing documentation', () => docsGen.run(answers)],
    ['Installing packages', () => installPackages(answers)],
  ];

  for (const [label, fn] of steps) {
    const spinner = ora(label).start();
    try {
      await fn();
      spinner.succeed(label);
    } catch (err) {
      spinner.fail(`${label} — ${err.message}`);
      throw err;
    }
  }

  logger.success(`\nProject "${answers.projectName}" generated at ${targetDir}`);
  logger.title('Next steps:');
  console.log(chalk.cyan(`  cd ${path.relative(process.cwd(), targetDir) || '.'}`));
  console.log(chalk.cyan(`  ${answers.packageManager === 'npm' ? 'npm run' : answers.packageManager} android   # or ios`));
  console.log(chalk.gray('\nRead GETTING_STARTED.md and SECURITY.md in the generated project for full details.\n'));
}

/**
 * `npx @react-native-community/cli init` sometimes nests its output one level
 * deeper (targetDir/<projectName>/android instead of targetDir/android)
 * depending on CLI version/platform. This checks the expected location first,
 * auto-recovers by flattening the nested folder if that's what happened, and
 * only throws if android/ios genuinely never got created (e.g. npx/network
 * failure that still somehow exited 0, or an unsupported RN CLI version).
 */
async function verifyNativeProject(answers) {
  const { targetDir, projectName } = answers;
  const hasAndroid = await fs.pathExists(path.join(targetDir, 'android'));
  const hasIos = await fs.pathExists(path.join(targetDir, 'ios'));
  if (hasAndroid && hasIos) return;

  const nestedDir = path.join(targetDir, projectName);
  const nestedHasAndroid = await fs.pathExists(path.join(nestedDir, 'android'));
  const nestedHasIos = await fs.pathExists(path.join(nestedDir, 'ios'));

  if (nestedHasAndroid && nestedHasIos) {
    // Flatten: move everything up one level, then remove the now-empty nested folder.
    const entries = await fs.readdir(nestedDir);
    for (const entry of entries) {
      await fs.move(path.join(nestedDir, entry), path.join(targetDir, entry), { overwrite: true });
    }
    await fs.remove(nestedDir);
    return;
  }

  throw new Error(
    `android/ and ios/ folders were not created. This usually means "npx @react-native-community/cli init" ` +
      `failed or exited early — check your internet connection and that Node.js >= 18 and npx are on your PATH, ` +
      `then re-run. (Checked: ${targetDir} and ${nestedDir})`
  );
}

function initReactNativeProject(answers) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'npx.cmd' : 'npx';
    const args = [
      '@react-native-community/cli',
      'init',
      answers.projectName,
      '--directory',
      answers.targetDir,
      '--skip-install',
      '--skip-git-init',
      '--package-name',
      answers.androidPackage,
    ];

    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      shell: isWindows,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npx @react-native-community/cli init failed with code ${code}.\nError: ${stderr || stdout}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

function installPackages(answers) {
  return new Promise((resolve, reject) => {
    const pm = answers.packageManager || 'npm';
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? `${pm}.cmd` : pm;
    const args = pm === 'yarn' ? [] : ['install'];

    const child = spawn(cmd, args, {
      cwd: answers.targetDir,
      shell: isWindows,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${pm} install failed with code ${code}.\nError: ${stderr || stdout}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { runCreate };
