'use strict';

const chalk = require('chalk');

const logger = {
  title(msg) {
    console.log('\n' + chalk.bold.cyan(msg));
  },
  step(msg) {
    console.log(chalk.blue('→ ') + msg);
  },
  success(msg) {
    console.log(chalk.green('✔ ') + msg);
  },
  warn(msg) {
    console.log(chalk.yellow('⚠ ') + msg);
  },
  error(msg) {
    console.log(chalk.red('✖ ') + msg);
  },
  info(msg) {
    console.log(chalk.gray(msg));
  },
  section(msg) {
    console.log('\n' + chalk.bold.magenta('▌ ' + msg));
    console.log(chalk.magenta('─'.repeat(Math.min(60, msg.length + 2))));
  },
};

module.exports = logger;
