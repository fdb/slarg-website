const fs = require('fs');
const path = require('path');

exports.handler = async function (event, context) {
	if (event.httpMethod !== 'POST') {
		return {
			statusCode: 405,
			body: 'Method Not Allowed'
		};
	}

	try {
		const { tag } = JSON.parse(event.body);

		if (!tag) {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Tag is required' })
			};
		}

		const tagsPath = path.join(process.cwd(), 'data', 'global-tags.json');
		const tagsData = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));


		if (!tagsData.research_interests.includes(tag)) {
			tagsData.research_interests.push(tag);
			fs.writeFileSync(tagsPath, JSON.stringify(tagsData, null, 2));
		}

		return {
			statusCode: 200,
			body: JSON.stringify({ success: true, tags: tagsData.research_interests })
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: error.message })
		};
	}
};
