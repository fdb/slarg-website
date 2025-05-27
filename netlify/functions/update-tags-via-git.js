const fetch = require('node-fetch'); // make sure fetch is imported if needed

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { interests } = JSON.parse(event.body);
    if (!Array.isArray(interests)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Interests must be an array' }),
      };
    }

    const token = event.headers.authorization?.split(' ')[1];
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - No token provided' }),
      };
    }

    const client = context.clientContext?.client;
    const user = context.clientContext?.user;
    const { git } = context.clientContext;

    if (!client || !user || !git) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - Invalid Git Gateway context' }),
      };
    }

    // Read current tags from Git
    const tagsContent = await git.readFile('_data/global-tags.json');
    const currentTags = JSON.parse(tagsContent);

    // Merge and sort tags
    const updatedTags = {
      research_interests: [
        ...new Set([
          ...currentTags.research_interests,
          ...interests.filter((i) => i.trim()),
        ]),
      ].sort(),
    };

    // Write updated tags to Git
    await git.writeFile({
      path: '_data/global-tags.json',
      content: JSON.stringify(updatedTags, null, 2),
      message: 'Manual update of research interests via POST',
    });

    // Trigger Netlify build hook after write is complete
    try {
      await fetch('https://api.netlify.com/build_hooks/6811df0bf50db11f21b2cabd', {
        method: 'POST',
      });
      console.log('✅ Netlify build hook triggered');
    } catch (err) {
      console.error('❌ Failed to trigger Netlify build hook', err);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedTags),
    };
  } catch (error) {
    console.error('Error updating global tags via Git:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Update failed' }),
    };
  }
};
