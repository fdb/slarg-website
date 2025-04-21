const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

exports.handler = async function (event, context) {
	if (event.httpMethod !== 'POST') {
		return {
			statusCode: 405,
			body: 'Method Not Allowed'
		};
	}

	try {
		const { personId, interests } = JSON.parse(event.body);

		if (!interests) {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Interests are required' })
			};
		}

		// If no personId is provided, just return success (for preview mode)
		if (!personId) {
			return {
				statusCode: 200,
				body: JSON.stringify({ success: true, interests })
			};
		}

		// Update global tags file
		const tagsPath = path.join(process.cwd(), 'admin', 'data', 'global-tags.json');
		const tagsData = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));
		const currentTags = new Set(tagsData.research_interests);

		// Add any new tags to the global list
		interests.forEach((tag) => {
			if (tag.trim() !== '' && !currentTags.has(tag)) {
				tagsData.research_interests.push(tag);
			}
		});

		// Write updated global tags
		fs.writeFileSync(tagsPath, JSON.stringify(tagsData, null, 2));

		const dir = path.join(process.cwd(), 'people');
		const files = fs.readdirSync(dir);
		const personFile = files.find((file) => file.endsWith('.md') && file.toLowerCase().includes(personId.toLowerCase()));

		if (!personFile) {
			return {
				statusCode: 404,
				body: JSON.stringify({ error: 'Person not found' })
			};
		}

		const filePath = path.join(dir, personFile);
		const content = fs.readFileSync(filePath, 'utf8');

		// Split the content into frontmatter and body
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Invalid markdown file format' })
			};
		}

		const frontmatter = yaml.load(frontmatterMatch[1]);
		frontmatter.research_interests = interests.filter((tag) => tag.trim() !== '');

		// Reconstruct the file content
		const newFrontmatter = '---\n' + yaml.dump(frontmatter) + '---\n';
		const newContent = content.replace(/^---\n[\s\S]*?\n---/, newFrontmatter);

		// Write the updated content back to the file
		fs.writeFileSync(filePath, newContent);

		return {
			statusCode: 200,
			body: JSON.stringify({ success: true, interests: frontmatter.research_interests })
		};
	} catch (error) {
		console.error('Error in update-person-interests:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: error.message })
		};
	}
};
