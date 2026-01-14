#!/usr/bin/env node
/**
 * Download Uploadcare Images
 * Reads the inventory and downloads all images
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// Read the inventory file
const inventory = JSON.parse(fs.readFileSync('uploadcare-inventory.json', 'utf-8'));

// Create download directory
const DOWNLOAD_DIR = 'downloaded-images';
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

let downloadCount = 0;
let errorCount = 0;

/**
 * Download a single image
 */
function downloadImage(url, fileId) {
  return new Promise((resolve, reject) => {
    const filename = path.join(DOWNLOAD_DIR, `${fileId}.jpg`);
    
    // Skip if already downloaded
    if (fs.existsSync(filename)) {
      console.log(`⊘ Already exists: ${fileId}`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(filename);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        downloadCount++;
        console.log(`✓ Downloaded: ${fileId}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {}); // Delete partial file
      errorCount++;
      console.error(`✗ Failed: ${fileId} - ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Download all images with rate limiting
 */
async function downloadAll() {
  console.log(`Starting download of ${inventory.urls.length} images...\n`);
  
  for (const item of inventory.urls) {
    try {
      await downloadImage(item.fullUrl, item.fileId);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Continue with next image even if one fails
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('DOWNLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`Successfully downloaded: ${downloadCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Images saved to: ${DOWNLOAD_DIR}/`);
  console.log('='.repeat(60));
}

downloadAll();