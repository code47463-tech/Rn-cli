'use strict';

const path = require('path');
const fs = require('fs-extra');

async function run(a) {
  const cq = a.codeQuality;

  if (cq.includes('eslint')) {
    await fs.writeJson(
      path.join(a.targetDir, '.eslintrc.json'),
      {
        root: true,
        extends: ['@react-native', ...(a.language === 'typescript' ? ['plugin:@typescript-eslint/recommended'] : [])],
        rules: {
          'no-unused-vars': 'warn',
          'react-hooks/exhaustive-deps': 'warn',
        },
      },
      { spaces: 2 }
    );
  }

  if (cq.includes('prettier')) {
    await fs.writeJson(
      path.join(a.targetDir, '.prettierrc.json'),
      { singleQuote: true, trailingComma: 'es5', printWidth: 100, semi: true },
      { spaces: 2 }
    );
  }

  if (cq.includes('lint-staged')) {
    await fs.writeJson(
      path.join(a.targetDir, '.lintstagedrc.json'),
      {
        '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
        '*.{json,md}': ['prettier --write'],
      },
      { spaces: 2 }
    );
  }

  if (cq.includes('husky')) {
    await fs.ensureDir(path.join(a.targetDir, '.husky'));
    await fs.writeFile(
      path.join(a.targetDir, '.husky/pre-commit'),
      `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\nnpx lint-staged\n`
    );
    await fs.writeFile(
      path.join(a.targetDir, '.husky/commit-msg'),
      `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\nnpx --no -- commitlint --edit "$1"\n`
    );
    await fs.chmod(path.join(a.targetDir, '.husky/pre-commit'), 0o755).catch(() => {});
    await fs.chmod(path.join(a.targetDir, '.husky/commit-msg'), 0o755).catch(() => {});
  }

  if (cq.includes('commitlint')) {
    await fs.writeFile(
      path.join(a.targetDir, 'commitlint.config.js'),
      `module.exports = { extends: ['@commitlint/config-conventional'] };\n`
    );
  }
}

module.exports = { run };
