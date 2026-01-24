// netlify/functions/r2-upload.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const busboy = require('busboy');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/r2-upload', '');

  try {
    // Upload file
    if (event.httpMethod === 'POST' && path === '/base/') {
      return await handleUpload(event);
    }

    // Get file info (Uploadcare compatibility)
    if (event.httpMethod === 'GET' && path.startsWith('/files/')) {
      const fileId = path.replace('/files/', '').replace('/', '');
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: fileId,
          original_file_url: `${R2_PUBLIC_URL}/${fileId}`
        })
      };
    }

    // Delete file
    if (event.httpMethod === 'DELETE' && path.startsWith('/files/')) {
      const fileId = path.replace('/files/', '').replace('/', '');
      return await handleDelete(fileId);
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
        // Generate UUID for file (like Uploadcare)
        const fileId = uuidv4();
        const ext = filename.split('.').pop();
        const key = `${fileId}.${ext}`;

        // Upload to R2
        const command = new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType
        });

        await s3Client.send(command);

        // Return Uploadcare-compatible response
        resolve({
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: key,
            uuid: fileId,
            original_file_url: `${R2_PUBLIC_URL}/${key}`,
            original_filename: filename,
            size: fileBuffer.length,
            mime_type: mimeType
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

async function handleDelete(fileId) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileId
    });

    await s3Client.send(command);

    return {
      statusCode: 204,
      headers,
      body: ''
    };
  } catch (error) {
    throw error;
  }
}