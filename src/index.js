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
  await fs.ensureDir(targetDir);
  answers.targetDir = targetDir;

  const steps = [
    ['Initializing React Native project', () => initReactNativeProject(answers)],
    ['Scaffolding folder structure', () => scaffold.run(answers)],
    ['Writing package.json & dependencies', () => packageJsonGen.run(answers)],
    ['Writing app.config.js and environment files', () => configFiles.run(answers)],
    ['Generating state management setup', () => stateGen.run(answers)],
    ['Generating networking layer (Axios, interceptors, token refresh)', () => networkingGen.run(answers)],
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
