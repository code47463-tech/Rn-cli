'use strict';

const path = require('path');
const fs = require('fs-extra');

/**
 * Folder trees per architecture style. Every generator below writes into
 * these folders, so the tree must exist before any other generator runs.
 */
function foldersFor(architecture) {
  const common = [
    'src/app', // app bootstrap, root component, providers
    'src/config', // env loader, app.config.js consumer
    'src/navigation',
    'src/theme',
    'src/components/ui', // shared dumb components
    'src/hooks',
    'src/assets/images',
    'src/assets/fonts',
    'src/localization',
    'src/store', // redux/zustand root
    'src/services/api',
    'src/services/firebase',
    'src/services/auth',
    'src/services/security',
    'src/services/storage',
    'src/services/notifications',
    'src/services/offline',
    'src/utils',
    'src/types',
    '__tests__',
    'e2e',
    'android_config_notes',
    'ios_config_notes',
    '.github/workflows',
    'fastlane',
  ];

  if (architecture === 'clean-architecture') {
    return [
      ...common,
      'src/domain/entities',
      'src/domain/usecases',
      'src/domain/repositories', // interfaces only
      'src/data/repositories', // implementations
      'src/data/datasources/remote',
      'src/data/datasources/local',
      'src/presentation/screens',
      'src/presentation/viewmodels',
      'src/presentation/components',
    ];
  }

  if (architecture === 'mvvm') {
    return [
      ...common,
      'src/models',
      'src/viewmodels',
      'src/views/screens',
      'src/views/components',
      'src/repositories',
    ];
  }

  // feature-based / modular (default fallback)
  return [
    ...common,
    'src/features/auth/screens',
    'src/features/auth/components',
    'src/features/auth/services',
    'src/features/home/screens',
    'src/features/home/components',
    'src/features/home/services',
    'src/features/profile/screens',
    'src/features/profile/components',
    'src/features/profile/services',
  ];
}

async function run(answers) {
  const { targetDir, architecture } = answers;
  const folders = foldersFor(architecture);
  for (const folder of folders) {
    await fs.ensureDir(path.join(targetDir, folder));
  }
  // Keep otherwise-empty tracked folders in git
  await Promise.all(
    ['e2e', 'src/assets/images', 'src/assets/fonts'].map((f) =>
      fs.writeFile(path.join(targetDir, f, '.gitkeep'), '')
    )
  );
}

module.exports = { run, foldersFor };
