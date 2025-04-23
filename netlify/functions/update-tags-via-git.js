const yaml = require('js-yaml');

exports.handler = async function (event, context) {
	if (event.httpMethod !== 'POST') {
		return {
			statusCode: 405,
			body: JSON.stringify({ error: 'Method not allowed' })
		};
	}

	try {
		const { interests } = JSON.parse(event.body);
		if (!Array.isArray(interests)) {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Interests must be an array' })
			};
		}

		// Get token and verify context
		const token = event.headers.authorization?.split(' ')[1];
		if (!token) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: 'Unauthorized - No token provided' })
			};
		}

		const client = context.clientContext?.client;
		const user = context.clientContext?.user;
		const { git } = context.clientContext;

		if (!client || !user || !git) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: 'Unauthorized - Invalid Git Gateway context' })
			};
		}

		// Read current tags from Git
		const tagsContent = await git.readFile('admin/data/global-tags.json');
		const currentTags = JSON.parse(tagsContent);

		// Merge and sort tags
		const updatedTags = {
			research_interests: [
				...new Set([
					...currentTags.research_interests,
					...interests.filter((i) => i.trim())
				])
			].sort()
		};

		// Write updated tags to Git
		await git.writeFile({
			path: 'admin/data/global-tags.json',
			content: JSON.stringify(updatedTags, null, 2),
			message: 'Manual update of research interests via POST'
		});

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(updatedTags)
		};
	} catch (error) {
		console.error('Error updating global tags via Git:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: error.message || 'Update failed' })
		};
	}
};
