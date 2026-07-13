#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');
const { runCreate } = require('../src/index');
const { runGenerate } = require('../src/generators/customGenerator');
const { runSelfUpdate } = require('../src/utils/selfUpdate');

const program = new Command();

program
  .name('rn-enterprise')
  .description('Production-grade React Native Enterprise CLI')
  .version(pkg.version);

program
  .command('create [projectDir]')
  .description('Run the full interactive wizard to scaffold a new enterprise React Native project')
  .option('-y, --yes', 'Accept all smart defaults, skip optional questions')
  .option('-p, --preset <name>', 'Start from a named preset (minimal|standard|enterprise)')
  .action(async (projectDir, options) => {
    try {
      await runCreate({ projectDir, ...options });
    } catch (err) {
      console.error(chalk.red('\n✖ Failed to create project:'), err.message);
      process.exitCode = 1;
    }
  });

program
  .command('generate <type> <name>')
  .alias('g')
  .description('Generate a new screen, module, service, or component into an existing project (type: screen|module|service|component)')
  .option('--feature <feature>', 'Feature folder to generate into (feature-based architecture)')
  .action(async (type, name, options) => {
    try {
      await runGenerate(type, name, options);
    } catch (err) {
      console.error(chalk.red('\n✖ Generation failed:'), err.message);
      process.exitCode = 1;
    }
  });

program
  .command('update')
  .description('Check for and apply CLI self-updates')
  .action(async () => {
    try {
      await runSelfUpdate();
    } catch (err) {
      console.error(chalk.red('\n✖ Update failed:'), err.message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
