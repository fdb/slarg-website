// netlify/functions/cloudflare-images-upload.js
const busboy = require('busboy');
const { v4: uuidv4 } = require('uuid');

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/cloudflare-images-upload', '');

  try {
    // Upload file
    if (event.httpMethod === 'POST' && (path === '/upload' || path === '/upload/')) {
      return await handleUpload(event);
    }

    // Delete file
    if (event.httpMethod === 'DELETE' && path.startsWith('/delete/')) {
      const imageId = path.replace('/delete/', '').replace('/', '');
      return await handleDelete(imageId);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function handleUpload(event) {
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

    bb.on('finish', async () => {
      try {
        // Generate custom ID with slarg/ prefix
        const customId = `slarg-${uuidv4()}`;

        // Create FormData for Cloudflare Images API
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', fileBuffer, {
          filename: filename,
          contentType: mimeType
        });
        formData.append('id', customId);

        // Upload to Cloudflare Images
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CF_API_TOKEN}`,
              ...formData.getHeaders()
            },
            body: formData
          }
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.errors?.[0]?.message || 'Upload failed');
        }

        // Construct delivery URL with public variant
        const deliveryUrl = `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${customId}/public`;

        resolve({
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            id: customId,
            url: deliveryUrl,
            original_filename: filename,
            variants: {
              public: `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${customId}/public`,
              thumb: `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${customId}/thumb`,
              medium: `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${customId}/medium`,
              large: `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${customId}/large`,
              xl: `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${customId}/xl`
            }
          })
        });

      } catch (error) {
        reject(error);
      }
    });

    bb.on('error', reject);

    // Parse the multipart form data
    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    bb.write(body);
    bb.end();
  });
}

async function handleDelete(imageId) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${imageId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`
        }
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.errors?.[0]?.message || 'Delete failed');
    }

    return {
      statusCode: 204,
      headers,
      body: ''
    };
  } catch (error) {
    throw error;
  }
}
