'use strict';

const path = require('path');
const fs = require('fs-extra');

async function run(a) {
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const tsx = a.language === 'typescript' ? 'tsx' : 'js';

  if (a.testing.includes('jest')) {
    await fs.writeJson(
      path.join(a.targetDir, 'jest.config.json'),
      {
        preset: 'react-native',
        setupFilesAfterEach: [],
        transformIgnorePatterns: [
          'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-firebase)/)',
        ],
        collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}', '!src/**/*.d.ts'],
      },
      { spaces: 2 }
    );

    await fs.writeFile(
      path.join(a.targetDir, `__tests__/example.test.${ext}`),
      `describe('sanity', () => {
  it('runs the test suite', () => {
    expect(1 + 1).toBe(2);
  });
});
`
    );
  }

  if (a.testing.includes('rntl')) {
    await fs.writeFile(
      path.join(a.targetDir, `__tests__/Button.test.${tsx}`),
      `import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../src/components/ui/Button';
import { ThemeProvider } from '../src/theme/ThemeProvider';

function renderWithTheme(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Button', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(<Button label="Continue" onPress={onPress} />);
    fireEvent.press(getByText('Continue'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while loading', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(<Button label="Continue" onPress={onPress} loading />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
`
    );
  }

  if (a.testing.includes('detox')) {
    await fs.writeJson(
      path.join(a.targetDir, '.detoxrc.json'),
      {
        testRunner: { args: { config: 'e2e/jest.config.js' }, jest: { setupTimeout: 120000 } },
        apps: {
          'android.debug': {
            type: 'android.apk',
            binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
            build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
          },
          'ios.debug': {
            type: 'ios.app',
            binaryPath: `ios/build/Build/Products/Debug-iphonesimulator/${a.projectName}.app`,
            build: `xcodebuild -workspace ios/${a.projectName}.xcworkspace -scheme ${a.projectName} -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build`,
          },
        },
        devices: {
          simulator: { type: 'ios.simulator', device: { type: 'iPhone 15' } },
          emulator: { type: 'android.emulator', device: { avdName: 'Pixel_6_API_34' } },
        },
        configurations: {
          'ios.sim.debug': { device: 'simulator', app: 'ios.debug' },
          'android.emu.debug': { device: 'emulator', app: 'android.debug' },
        },
      },
      { spaces: 2 }
    );

    await fs.writeFile(
      path.join(a.targetDir, 'e2e/firstTest.e2e.js'),
      `describe('App launch', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('shows the login screen when signed out', async () => {
    await expect(element(by.text('Log in'))).toBeVisible();
  });
});
`
    );
  }
}

module.exports = { run };
