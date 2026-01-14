#!/usr/bin/env node

/**
 * Uploadcare Image Inventory Script
 * 
 * This script scans your repository for all Uploadcare image URLs
 * and creates a list that you can use for migration.
 */

const fs = require('fs');
const path = require('path');

// Directories to scan
const DIRECTORIES_TO_SCAN = [
  'content',
  'people',
  'projects',
  'events',
  'publications',
  'research-week',
  '_includes',
  '_data'
];

// Regex to match Uploadcare URLs
const UPLOADCARE_REGEX = /https?:\/\/ucarecdn\.com\/([a-f0-9-]+)/gi;

let allUrls = new Set();
let fileCount = 0;
let urlCount = 0;

/**
 * Recursively scan a directory for files
 */
function scanDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath);
      } else if (entry.isFile()) {
        // Only scan text files
        const ext = path.extname(entry.name).toLowerCase();
        if (['.md', '.html', '.yml', '.yaml', '.json', '.njk', '.liquid'].includes(ext)) {
          scanFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
}

/**
 * Scan a single file for Uploadcare URLs
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.matchAll(UPLOADCARE_REGEX);
    
    let foundInFile = 0;
    for (const match of matches) {
      const url = match[0];
      const fileId = match[1];
      
      if (!allUrls.has(fileId)) {
        allUrls.add(fileId);
        urlCount++;
      }
      foundInFile++;
    }
    
    if (foundInFile > 0) {
      fileCount++;
      console.log(`✓ Found ${foundInFile} URL(s) in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }
}

/**
 * Save results to a JSON file
 */
function saveResults() {
  const results = {
    timestamp: new Date().toISOString(),
    totalFiles: fileCount,
    totalUniqueUrls: urlCount,
    urls: Array.from(allUrls).map(fileId => ({
      fileId,
      fullUrl: `https://ucarecdn.com/${fileId}/`
    }))
  };
  
  const outputPath = 'uploadcare-inventory.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('INVENTORY COMPLETE');
  console.log('='.repeat(60));
  console.log(`Files scanned: ${fileCount}`);
  console.log(`Unique Uploadcare URLs found: ${urlCount}`);
  console.log(`Results saved to: ${outputPath}`);
  console.log('='.repeat(60));
  
  // Also create a simple text list
  const listPath = 'uploadcare-urls.txt';
  const urlList = results.urls.map(u => u.fullUrl).join('\n');
  fs.writeFileSync(listPath, urlList);
  console.log(`Simple URL list saved to: ${listPath}`);
}

/**
 * Main execution
 */
console.log('Starting Uploadcare inventory scan...\n');

// Scan each directory
for (const dir of DIRECTORIES_TO_SCAN) {
  if (fs.existsSync(dir)) {
    console.log(`\nScanning directory: ${dir}/`);
    scanDirectory(dir);
  } else {
    console.log(`⚠ Directory not found: ${dir}/`);
  }
}

// Save results
saveResults();

// Print sample of URLs found
if (allUrls.size > 0) {
  console.log('\nSample URLs found:');
  const samples = Array.from(allUrls).slice(0, 5);
  samples.forEach(fileId => {
    console.log(`  https://ucarecdn.com/${fileId}/`);
  });
  if (allUrls.size > 5) {
    console.log(`  ... and ${allUrls.size - 5} more`);
  }
}

console.log('\n✅ Inventory complete! Check the JSON file for details.\n');
