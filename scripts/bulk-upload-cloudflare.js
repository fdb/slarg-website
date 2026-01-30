#!/usr/bin/env node

/**
 * Bulk upload images to Cloudflare Images
 *
 * Usage:
 *   node scripts/bulk-upload-cloudflare.js --dry-run  # List files without uploading
 *   node scripts/bulk-upload-cloudflare.js            # Actually upload files
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env
require('dotenv').config();

const UPLOADS_DIR = path.join(__dirname, '..', 'tmp', 'uploads');
const CONCURRENCY_LIMIT = 5;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
  };
}

function getImageFiles() {
  const files = fs.readdirSync(UPLOADS_DIR);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExtensions.includes(ext);
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadImage(filename, retryCount = 0) {
  const filePath = path.join(UPLOADS_DIR, filename);
  const cloudflareId = `slarg/${filename}`;

  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);

  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('id', cloudflareId);

  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      // Check if image already exists (code 5409)
      if (data.errors?.some(e => e.code === 5409)) {
        return {
          filename,
          success: true,
          skipped: true,
          url: `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${cloudflareId}/public`,
          message: 'Already exists',
        };
      }

      throw new Error(data.errors?.map(e => e.message).join(', ') || 'Upload failed');
    }

    return {
      filename,
      success: true,
      skipped: false,
      url: `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${cloudflareId}/public`,
      cloudflareId: data.result?.id,
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`  Retry ${retryCount + 1}/${MAX_RETRIES} for ${filename}: ${error.message}`);
      await sleep(RETRY_DELAY_MS * (retryCount + 1));
      return uploadImage(filename, retryCount + 1);
    }

    return {
      filename,
      success: false,
      error: error.message,
    };
  }
}

async function processWithConcurrency(items, processor, limit) {
  const results = [];
  const executing = new Set();

  for (const item of items) {
    const promise = processor(item).then(result => {
      executing.delete(promise);
      return result;
    });

    executing.add(promise);
    results.push(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

async function main() {
  const { dryRun } = parseArgs();

  // Validate environment
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('Error: Missing required environment variables');
    console.error('Make sure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are set in .env');
    process.exit(1);
  }

  // Get image files
  const files = getImageFiles();
  console.log(`Found ${files.length} images in ${UPLOADS_DIR}\n`);

  if (files.length === 0) {
    console.log('No images to upload.');
    return;
  }

  if (dryRun) {
    console.log('=== DRY RUN MODE ===\n');
    console.log('Files that would be uploaded:\n');

    files.forEach((file, index) => {
      const cloudflareId = `slarg/${file}`;
      console.log(`${index + 1}. ${file}`);
      console.log(`   -> ID: ${cloudflareId}`);
      console.log(`   -> URL: https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${cloudflareId}/public`);
    });

    console.log(`\nTotal: ${files.length} files would be uploaded`);
    console.log('\nRun without --dry-run to actually upload.');
    return;
  }

  // Actual upload
  console.log('Starting upload...\n');

  let completed = 0;
  const startTime = Date.now();

  const results = await processWithConcurrency(
    files,
    async (file) => {
      const result = await uploadImage(file);
      completed++;

      if (result.success) {
        if (result.skipped) {
          console.log(`[${completed}/${files.length}] ⏭️  ${file} (already exists)`);
        } else {
          console.log(`[${completed}/${files.length}] ✅ ${file}`);
        }
      } else {
        console.log(`[${completed}/${files.length}] ❌ ${file}: ${result.error}`);
      }

      return result;
    },
    CONCURRENCY_LIMIT
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  const successful = results.filter(r => r.success && !r.skipped);
  const skipped = results.filter(r => r.success && r.skipped);
  const failed = results.filter(r => !r.success);

  console.log('\n=== UPLOAD COMPLETE ===\n');
  console.log(`Time: ${elapsed}s`);
  console.log(`Uploaded: ${successful.length}`);
  console.log(`Skipped (already existed): ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed files:');
    failed.forEach(f => console.log(`  - ${f.filename}: ${f.error}`));
  }

  // Output JSON mapping
  const mapping = {};
  results.filter(r => r.success).forEach(r => {
    mapping[r.filename] = r.url;
  });

  const mappingFile = path.join(__dirname, '..', 'tmp', 'upload-mapping.json');
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
  console.log(`\nURL mapping saved to: ${mappingFile}`);

  // Exit with error code if any uploads failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
