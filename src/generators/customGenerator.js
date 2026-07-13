'use strict';

const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');

function detectLanguage(cwd) {
  return fs.existsSync(path.join(cwd, 'tsconfig.json')) ? 'typescript' : 'javascript';
}

function pascalCase(name) {
  return name
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

async function loadPlugins(cwd) {
  const configPath = path.join(cwd, '.rn-enterprise', 'plugins.json');
  if (!(await fs.pathExists(configPath))) return [];
  const config = await fs.readJson(configPath);
  return (config.plugins || []).map((p) => require(path.resolve(cwd, p)));
}

async function runGenerate(type, name, options) {
  const cwd = process.cwd();
  const isTs = detectLanguage(cwd) === 'typescript';
  const ext = isTs ? 'ts' : 'js';
  const tsx = isTs ? 'tsx' : 'js';
  const Name = pascalCase(name);

  // 1. Check for a registered plugin generator matching this type first.
  const plugins = await loadPlugins(cwd);
  const plugin = plugins.find((p) => p.type === type);
  if (plugin) {
    await plugin.generate({ name: Name, targetDir: cwd, options });
    logger.success(`Generated ${type} "${Name}" via plugin.`);
    return;
  }

  // 2. Fall back to built-in templates.
  const feature = options.feature;

  if (type === 'screen') {
    const dir = feature
      ? path.join(cwd, 'src/features', feature, 'screens')
      : path.join(cwd, 'src/presentation/screens');
    await fs.ensureDir(dir);
    await fs.writeFile(
      path.join(dir, `${Name}Screen.${tsx}`),
      `import React from 'react';
import { View, Text } from 'react-native';
import { Header } from '../../../components/ui/Header';

export default function ${Name}Screen() {
  return (
    <View style={{ flex: 1 }}>
      <Header title="${Name}" />
      <Text>${Name} screen — replace with real content.</Text>
    </View>
  );
}
`
    );
    logger.success(`Created screen at ${path.relative(cwd, dir)}/${Name}Screen.${tsx}`);
    return;
  }

  if (type === 'component') {
    const dir = feature ? path.join(cwd, 'src/features', feature, 'components') : path.join(cwd, 'src/components/ui');
    await fs.ensureDir(dir);
    await fs.writeFile(
      path.join(dir, `${Name}.${tsx}`),
      `import React from 'react';
import { View, Text } from 'react-native';

${isTs ? `interface ${Name}Props {\n  label?: string;\n}\n\n` : ''}export function ${Name}({ label }${isTs ? `: ${Name}Props` : ''}) {
  return (
    <View>
      <Text>{label ?? '${Name}'}</Text>
    </View>
  );
}
`
    );
    logger.success(`Created component at ${path.relative(cwd, dir)}/${Name}.${tsx}`);
    return;
  }

  if (type === 'service') {
    const dir = feature ? path.join(cwd, 'src/features', feature, 'services') : path.join(cwd, 'src/services/api');
    await fs.ensureDir(dir);
    await fs.writeFile(
      path.join(dir, `${Name}.${ext}`),
      `import httpClient from '../../services/api/httpClient';

/** Repository-pattern service — screens/viewmodels should depend on this, not httpClient directly. */
export const ${Name.charAt(0).toLowerCase()}${Name.slice(1)} = {
  async list() {
    const { data } = await httpClient.get('/${name.toLowerCase()}');
    return data;
  },
  async getById(id${isTs ? ': string' : ''}) {
    const { data } = await httpClient.get(\`/${name.toLowerCase()}/\${id}\`);
    return data;
  },
};
`
    );
    logger.success(`Created service at ${path.relative(cwd, dir)}/${Name}.${ext}`);
    return;
  }

  if (type === 'module') {
    const base = path.join(cwd, 'src/features', name.toLowerCase());
    for (const sub of ['screens', 'components', 'services']) {
      await fs.ensureDir(path.join(base, sub));
    }
    await fs.writeFile(path.join(base, 'screens', `${Name}Screen.${tsx}`), `import React from 'react';\nimport { View, Text } from 'react-native';\n\nexport default function ${Name}Screen() {\n  return (\n    <View>\n      <Text>${Name} module</Text>\n    </View>\n  );\n}\n`);
    logger.success(`Created feature module at src/features/${name.toLowerCase()}`);
    return;
  }

  throw new Error(`Unknown generate type "${type}". Expected screen|module|service|component, or a plugin-registered type.`);
}

module.exports = { runGenerate };
