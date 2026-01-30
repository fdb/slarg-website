#!/usr/bin/env node

/**
 * Migrate R2 URLs to Cloudflare Images URLs
 *
 * Replaces:
 *   https://pub-482595b1796343bdaa334509f7361457.r2.dev/{filename}
 * With:
 *   https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/slarg/{filename}/public
 */

const fs = require('fs');
const path = require('path');

const R2_BASE = 'https://pub-482595b1796343bdaa334509f7361457.r2.dev/';
const CLOUDFLARE_BASE = 'https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/slarg/';
const CLOUDFLARE_SUFFIX = '/public';

const ROOT_DIR = path.join(__dirname, '..');

function findMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules, .git, _site
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '_site', 'tmp'].includes(entry.name)) {
        continue;
      }
      findMarkdownFiles(fullPath, files);
    } else if (entry.isFile() && /\.(md|json|yaml|yml)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function migrateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (!content.includes(R2_BASE)) {
    return { changed: false };
  }

  // Replace R2 URLs with Cloudflare URLs
  const newContent = content.replace(
    new RegExp(R2_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^\\s"\'\\)]+)', 'g'),
    (match, filename) => {
      return CLOUDFLARE_BASE + filename + CLOUDFLARE_SUFFIX;
    }
  );

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    const count = (content.match(new RegExp(R2_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    return { changed: true, count };
  }

  return { changed: false };
}

function main() {
  console.log('Finding files...');
  const files = findMarkdownFiles(ROOT_DIR);
  console.log(`Found ${files.length} markdown/json/yaml files\n`);

  let totalChanged = 0;
  let totalUrls = 0;

  for (const file of files) {
    const result = migrateFile(file);
    if (result.changed) {
      const relativePath = path.relative(ROOT_DIR, file);
      console.log(`✅ ${relativePath} (${result.count} URLs)`);
      totalChanged++;
      totalUrls += result.count;
    }
  }

  console.log(`\n=== MIGRATION COMPLETE ===`);
  console.log(`Files updated: ${totalChanged}`);
  console.log(`URLs replaced: ${totalUrls}`);
}

main();
