#!/usr/bin/env node
/**
 * update-module-titles.js - Update module titles from JTBD TSV mapping
 *
 * Usage:
 *   node build/scripts/update-module-titles.js --dry-run
 *   node build/scripts/update-module-titles.js
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../..');

// Target categories (chapters 1-8)
const TARGET_CATEGORIES = [
  'Discover',
  'Get Started',
  'Plan',
  'Install',
  'Upgrade',
  'Migrate',
  'Administer',
  'Develop'
];

/**
 * Parse TSV file and extract title mappings
 * @param {string} tsvPath - Path to TSV file
 * @returns {Array<{category: string, title: string, level: string, rowNum: number}>}
 */
function parseTSV(tsvPath) {
  const content = readFileSync(tsvPath, 'utf-8');
  const lines = content.split('\n');
  const titleEntries = [];

  let currentCategory = null;

  for (let i = 1; i < lines.length; i++) { // Skip header row
    const line = lines[i];
    if (!line.trim()) continue;

    const columns = line.split('\t');

    // Column indices (0-based):
    // 0: Category (L1)
    // 1: Level 2 (Jobs)
    // 2: Level 3 (Jobs or Topics)
    // 3: Level 4 (Jobs or Topics)
    // 4: Topic (H2)
    // 5: H3
    // 7: Is a job?

    const category = columns[0]?.trim();
    const h2 = columns[4]?.trim();
    const h3 = columns[5]?.trim();

    // Track current category
    if (category && TARGET_CATEGORIES.includes(category)) {
      currentCategory = category;
    }

    // Extract titles from H2 or H3 columns
    if (currentCategory && (h2 || h3)) {
      const title = h2 || h3;
      const level = h2 ? 'H2' : 'H3';

      titleEntries.push({
        category: currentCategory,
        title,
        level,
        rowNum: i + 1
      });
    }
  }

  return titleEntries;
}

/**
 * Discover all .adoc module files in a category directory
 * @param {string} categoryPath - Path to category-maps subdirectory
 * @param {string} categoryName - Category name (e.g., "Discover")
 * @returns {Array<{path: string, filename: string, category: string}>}
 */
function discoverModules(categoryPath, categoryName) {
  const modules = [];

  function scanDirectory(dirPath) {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.endsWith('.adoc') && isModuleFile(entry)) {
        modules.push({
          path: fullPath,
          filename: entry,
          category: categoryName
        });
      }
    }
  }

  scanDirectory(categoryPath);
  return modules;
}

/**
 * Check if filename is a module (con-, proc-, ref-)
 * @param {string} filename
 * @returns {boolean}
 */
function isModuleFile(filename) {
  return /^(con|proc|ref)-/.test(filename);
}

/**
 * Discover all modules in target categories
 * @returns {Array<{path: string, filename: string, category: string}>}
 */
function discoverAllModules() {
  const categoryMapsPath = resolve(REPO_ROOT, 'titles/product_product/category-maps');
  const allModules = [];

  // Map category names to directory names
  const categoryDirs = {
    'Discover': 'discover',
    'Get Started': 'get-started',
    'Plan': 'plan',
    'Install': 'install',
    'Upgrade': 'upgrade',
    'Migrate': 'migrate',
    'Administer': 'administer',
    'Develop': 'develop'
  };

  for (const [categoryName, dirName] of Object.entries(categoryDirs)) {
    const categoryPath = join(categoryMapsPath, dirName);
    const modules = discoverModules(categoryPath, categoryName);
    allModules.push(...modules);
  }

  return allModules;
}

console.log('=== Discovering modules ===');
const modules = discoverAllModules();
console.log(`Found ${modules.length} module files`);

const modulesByCategory = modules.reduce((acc, mod) => {
  acc[mod.category] = (acc[mod.category] || 0) + 1;
  return acc;
}, {});

console.log('\nModules by category:');
Object.entries(modulesByCategory).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});

console.log('\nSample modules:');
modules.slice(0, 5).forEach(mod => {
  console.log(`  [${mod.category}] ${mod.filename}`);
});
