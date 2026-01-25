const crypto = require("crypto");

exports.handler = async () => {
  try {
    const timestamp = Math.round(Date.now() / 1000);

    // IMPORTANT: if you upload into a folder, include it in the signature params
    const folder = "eleventy/uploads";

    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
      .digest("hex");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signature,
        timestamp,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        folder,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};
