'use strict';

const https = require('https');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const pkg = require('../../package.json');
const logger = require('./logger');

function fetchLatestVersion(packageName) {
  return new Promise((resolve, reject) => {
    https
      .get(`https://registry.npmjs.org/${packageName}/latest`, { timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body).version);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy(new Error('Registry request timed out'));
      });
  });
}

function isNewer(latest, current) {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

/**
 * Self-update strategy:
 * 1. Check npm registry for the latest published version of this package.
 * 2. If newer, run the package manager's global install/update command.
 * This intentionally does NOT auto-update silently — it always reports
 * what it found and only updates after checking.
 */
async function runSelfUpdate() {
  logger.step(`Current version: ${pkg.version}`);
  let latest;
  try {
    latest = await fetchLatestVersion(pkg.name);
  } catch (err) {
    logger.warn(`Could not reach the npm registry (${err.message}). Skipping update check.`);
    return;
  }

  if (!isNewer(latest, pkg.version)) {
    logger.success('You are already on the latest version.');
    return;
  }

  logger.info(`New version available: ${latest}`);
  try {
    await execFileAsync('npm', ['install', '-g', `${pkg.name}@latest`]);
    logger.success(`Updated to ${latest}. Restart your terminal session if the version doesn't refresh.`);
  } catch (err) {
    logger.error(`Automatic update failed: ${err.message}`);
    logger.info(`Run manually: npm install -g ${pkg.name}@latest`);
  }
}

module.exports = { runSelfUpdate, isNewer };
