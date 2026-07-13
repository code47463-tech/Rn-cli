'use strict';

const path = require('path');
const fs = require('fs-extra');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

async function run(a) {
  await fs.writeFile(
    path.join(a.targetDir, '.npmrc'),
    `# React Native's ecosystem frequently ships packages whose peerDependencies
# lag behind or race ahead of the current React/RN version. legacy-peer-deps
# avoids npm hard-failing installs over peer mismatches that are safe in practice.
legacy-peer-deps=true
`
  );

  await fs.writeFile(
    path.join(a.targetDir, '.gitignore'),
    `node_modules/\n.expo/\n*.log\nios/build/\nios/Pods/\nandroid/.gradle/\nandroid/app/build/\nandroid/build/\n*.keystore\n.DS_Store\ncoverage/\n`
  );

  if (a.githubActions) {
    await fs.writeFile(
      path.join(a.targetDir, '.github/workflows/ci.yml'),
      `name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: '${a.packageManager}'
      - name: Install dependencies
        run: ${a.packageManager === 'npm' ? 'npm ci' : `${a.packageManager} install --frozen-lockfile`}
${a.codeQuality.includes('eslint') ? `      - name: Lint\n        run: ${a.packageManager} run lint\n` : ''}${a.testing.includes('jest') ? `      - name: Unit tests\n        run: ${a.packageManager} run test -- --ci --coverage\n` : ''}
`
    );
  }

  if (a.fastlane) {
    await fs.writeFile(
      path.join(a.targetDir, 'fastlane/Fastfile'),
      `default_platform(:android)

platform :android do
  desc "Run unit tests and assemble a QA build"
  lane :qa do
    gradle(task: "assembleQaRelease", project_dir: "android/")
  end

  desc "Assemble and upload a production build"
  lane :production do
    gradle(task: "bundleRelease", project_dir: "android/")
    # upload_to_play_store(track: 'internal') # enable once service account JSON is configured
  end
end

platform :ios do
  desc "Build and upload a QA build via TestFlight"
  lane :qa do
    build_app(scheme: "${a.projectName}", export_method: "ad-hoc")
    # upload_to_testflight
  end

  desc "Build and upload a production build to the App Store"
  lane :production do
    build_app(scheme: "${a.projectName}", export_method: "app-store")
    # upload_to_app_store
  end
end
`
    );
    await fs.writeFile(
      path.join(a.targetDir, 'fastlane/Appfile'),
      `app_identifier("${a.iosBundleId}") # iOS
package_name("${a.androidPackage}") # Android

# For App Store Connect / Play Console automation, set these via environment
# variables in CI rather than committing them here:
#   FASTLANE_APPLE_ID, FASTLANE_TEAM_ID, SUPPLY_JSON_KEY
`
    );
  }

  if (a.gitInit) {
    try {
      await execFileAsync('git', ['init'], { cwd: a.targetDir });
      await execFileAsync('git', ['add', '-A'], { cwd: a.targetDir });
    } catch (e) {
      // Non-fatal: git may not be installed / available. Project is still fully generated.
    }
  }
}

module.exports = { run };
