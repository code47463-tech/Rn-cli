'use strict';

/**
 * Single source of truth for "where do screens/components/services live"
 * per architecture style. Previously this logic was duplicated inline in
 * navigation.js with a two-way ternary that only handled feature-based vs.
 * "everything else", which pointed MVVM projects at a non-existent
 * `presentation/screens` folder (MVVM actually scaffolds `views/screens`).
 * Any generator that needs to import/write a screen must go through here.
 */
function screenDir(architecture, feature) {
  if (architecture === 'feature-based') return `features/${feature}/screens`;
  if (architecture === 'mvvm') return 'views/screens';
  return 'presentation/screens'; // clean-architecture (default)
}

function componentDir(architecture, feature) {
  if (architecture === 'feature-based') return `features/${feature}/components`;
  if (architecture === 'mvvm') return 'views/components';
  return 'presentation/components';
}

function serviceDir(architecture, feature) {
  if (architecture === 'feature-based') return `features/${feature}/services`;
  if (architecture === 'mvvm') return 'repositories';
  return 'data/repositories';
}

module.exports = { screenDir, componentDir, serviceDir };
