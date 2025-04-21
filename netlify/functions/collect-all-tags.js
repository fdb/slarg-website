const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

exports.handler = async function (event, context) {
	if (event.httpMethod !== 'POST') {
		return {
			statusCode: 405,
			body: JSON.stringify({ error: 'Method not allowed' })
		};
	}

	try {
		// Get all files in the people directory
		const peopleDir = path.join(process.cwd(), 'people');
		const files = fs.readdirSync(peopleDir);

		// Collect all unique interests
		const allInterests = new Set();

		// Read each person's file
		files.forEach((file) => {
			if (file.endsWith('.md')) {
				const filePath = path.join(peopleDir, file);
				const content = fs.readFileSync(filePath, 'utf8');

				// Extract frontmatter
				const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
				if (frontmatterMatch) {
					const frontmatter = yaml.load(frontmatterMatch[1]);

					// Add their research interests to the set
					if (Array.isArray(frontmatter.research_interests)) {
						frontmatter.research_interests.forEach((interest) => {
							if (interest && interest.trim()) {
								allInterests.add(interest.trim());
							}
						});
					}
				}
			}
		});

		// Read the current global-tags.json
		const tagsPath = path.join(process.cwd(), 'admin', 'data', 'global-tags.json');
		const currentContent = fs.readFileSync(tagsPath, 'utf8');
		const currentTags = JSON.parse(currentContent);

		// Combine existing tags with collected ones and sort
		const updatedTags = {
			research_interests: [...new Set([...currentTags.research_interests, ...Array.from(allInterests)])].sort()
		};

		// Write back to global-tags.json
		fs.writeFileSync(tagsPath, JSON.stringify(updatedTags, null, 2));

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				success: true,
				message: 'Global tags updated successfully',
				tags: updatedTags.research_interests
			})
		};
	} catch (error) {
		console.error('Error collecting tags:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: error.message })
		};
	}
};
