#!/usr/bin/env node
/**
 * update-module-titles.js - Update module titles from JTBD TSV mapping
 *
 * Usage:
 *   node build/scripts/update-module-titles.js --dry-run
 *   node build/scripts/update-module-titles.js
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
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

// For now, just test parsing
const tsvPath = resolve(REPO_ROOT, '.claude/skills/jtbd-map/jtbd-toc-mapping.tsv');
const titles = parseTSV(tsvPath);
console.log(`Parsed ${titles.length} title entries from TSV`);
console.log('Sample entries:');
titles.slice(0, 5).forEach(entry => {
  console.log(`  [${entry.category}] ${entry.title} (${entry.level}, row ${entry.rowNum})`);
});

// Category breakdown
const byCategory = titles.reduce((acc, entry) => {
  acc[entry.category] = (acc[entry.category] || 0) + 1;
  return acc;
}, {});

console.log('\nTitles by category:');
TARGET_CATEGORIES.forEach(cat => {
  console.log(`  ${cat}: ${byCategory[cat] || 0}`);
});
