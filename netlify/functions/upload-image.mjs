// netlify/functions/upload-image.mjs
import busboy from 'busboy';
import { createHash } from 'node:crypto';

// Allowed file types for Cloudflare Images
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'gif', 'webp', 'svg'];

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { fileBuffer, filename, mimeType } = await parseMultipartForm(event);

    // Validate file type
    const ext = filename.split('.').pop().toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeType) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalid file type. Allowed types: jpeg, png, heic, gif, webp, svg'
        })
      };
    }

    // Generate ID from content hash (SHA1) for deduplication
    const hash = createHash('sha1').update(fileBuffer).digest('hex');
    const imageId = `slarg/${hash}.${ext}`;

    // Upload to Cloudflare Images
    const result = await uploadToCloudflareImages(fileBuffer, filename, imageId);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: result.url,
        id: result.id,
        filename: filename
      })
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

function parseMultipartForm(event) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: event.headers });
    let fileBuffer = Buffer.from([]);
    let filename = '';
    let mimeType = '';

    bb.on('file', (fieldname, file, info) => {
      filename = info.filename;
      mimeType = info.mimeType;

      file.on('data', (data) => {
        fileBuffer = Buffer.concat([fileBuffer, data]);
      });
    });

    bb.on('finish', () => {
      if (!filename) {
        reject(new Error('No file provided'));
        return;
      }
      resolve({ fileBuffer, filename, mimeType });
    });

    bb.on('error', reject);

    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    bb.write(body);
    bb.end();
  });
}

async function uploadToCloudflareImages(fileBuffer, filename, imageId) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare credentials not configured');
  }

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), filename);
  formData.append('id', imageId);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      body: formData
    }
  );

  const data = await response.json();

  if (!data.success) {
    // If image already exists (duplicate), return the existing URL
    const error = data.errors?.[0];
    if (error?.code === 5409) {
      // Image with this ID already exists - construct the URL
      const baseUrl = `https://imagedelivery.net/${accountId}`;
      return {
        url: `${baseUrl}/${imageId}/public`,
        id: imageId
      };
    }
    throw new Error(error?.message || 'Upload to Cloudflare Images failed');
  }

  // Return the public variant URL
  const variants = data.result.variants || [];
  const publicUrl = variants.find(v => v.includes('/public')) || variants[0];

  return {
    url: publicUrl,
    id: data.result.id
  };
}
