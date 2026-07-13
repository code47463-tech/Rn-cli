'use strict';

const validatePackageName = require('validate-npm-package-name');

/** Project name: npm-safe, used for folder + package.json name */
function projectName(input) {
  if (!input || !input.trim()) return 'Project name is required.';
  const result = validatePackageName(input.trim());
  if (!result.validForNewPackages) {
    return `Invalid project name: ${[...(result.errors || []), ...(result.warnings || [])].join(', ')}`;
  }
  return true;
}

/** Display name: any human readable string */
function displayName(input) {
  if (!input || !input.trim()) return 'Display name is required.';
  if (input.trim().length > 50) return 'Display name should be 50 characters or fewer.';
  return true;
}

/** Android package name: reverse-DNS, e.g. com.company.app */
function androidPackage(input) {
  const re = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
  if (!re.test(input || '')) {
    return 'Must be reverse-DNS style, lowercase, e.g. com.yourcompany.appname';
  }
  const reserved = ['int', 'package', 'class', 'new', 'import', 'switch'];
  if (input.split('.').some((seg) => reserved.includes(seg))) {
    return 'Package segments cannot be Java reserved keywords.';
  }
  return true;
}

/** iOS bundle identifier: reverse-DNS, allows dashes */
function iosBundleId(input) {
  const re = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
  if (!re.test(input || '')) {
    return 'Must be reverse-DNS style, e.g. com.yourcompany.appname';
  }
  return true;
}

/** Semantic version, e.g. 1.0.0 */
function semver(input) {
  const re = /^\d+\.\d+\.\d+$/;
  if (!re.test(input || '')) return 'Must be a semantic version, e.g. 1.0.0';
  return true;
}

/** Build number: positive integer */
function buildNumber(input) {
  if (!/^\d+$/.test(String(input))) return 'Build number must be a positive integer.';
  return true;
}

function email(input) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input || !re.test(input)) return 'Enter a valid email address.';
  return true;
}

function url(input) {
  if (!input) return true; // optional fields
  try {
    // eslint-disable-next-line no-new
    new URL(input);
    return true;
  } catch (e) {
    return 'Enter a valid URL, e.g. https://example.com';
  }
}

function required(label) {
  return (input) => (input && String(input).trim() ? true : `${label} is required.`);
}

function nonEmptyArray(label) {
  return (input) => (Array.isArray(input) && input.length > 0 ? true : `Select at least one ${label}.`);
}

module.exports = {
  projectName,
  displayName,
  androidPackage,
  iosBundleId,
  semver,
  buildNumber,
  email,
  url,
  required,
  nonEmptyArray,
};
