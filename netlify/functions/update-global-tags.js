const fs = require('fs');
const path = require('path');

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

		// Read the current tags from the correct path
		const tagsPath = path.join(process.cwd(), 'admin', 'data', 'global-tags.json');
		const currentContent = fs.readFileSync(tagsPath, 'utf8');
		const currentTags = JSON.parse(currentContent);

		// Add new interests to the existing ones, remove duplicates, and sort
		const updatedTags = {
			research_interests: [...new Set([...currentTags.research_interests, ...interests.filter((i) => i.trim())])].sort()
		};

		// Write back to the file
		fs.writeFileSync(tagsPath, JSON.stringify(updatedTags, null, 2));

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache'
			},
			body: JSON.stringify(updatedTags)
		};
	} catch (error) {
		console.error('Error updating global tags:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Failed to update global tags' })
		};
	}
};
