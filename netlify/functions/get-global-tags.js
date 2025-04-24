const fs = require('fs');
const path = require('path');

exports.handler = async function (event, context) {
	try {
		// Read the global-tags.json file from the correct path
		const tagsPath = path.join(process.cwd(), '_data', 'global-tags.json');
		const tagsContent = fs.readFileSync(tagsPath, 'utf8');
		const tags = JSON.parse(tagsContent);

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache'
			},
			body: JSON.stringify(tags)
		};
	} catch (error) {
		console.error('Error reading global tags:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Failed to read global tags' })
		};
	}
};
