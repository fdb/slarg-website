const fetch = require('node-fetch');
const yaml = require('js-yaml');

exports.handler = async function (event, context) {
	if (event.httpMethod !== 'POST') {
		return {
			statusCode: 405,
			body: JSON.stringify({ error: 'Method Not Allowed' })
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

		// Get the client token from the request context
		const token = context.clientContext?.identity?.token;

		if (!token) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: 'Unauthorized - No token provided' })
			};
		}

		// First, get the current content of global-tags.json
		const tagsResponse = await fetch(
			`https://api.github.com/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/contents/admin/data/global-tags.json`,
			{
				headers: {
					Authorization: `token ${token}`,
					Accept: 'application/vnd.github.v3+json'
				}
			}
		);

		if (!tagsResponse.ok) {
			throw new Error('Failed to fetch global tags');
		}

		const tagsData = await tagsResponse.json();
		const currentTags = JSON.parse(Buffer.from(tagsData.content, 'base64').toString());
		const currentTagsSet = new Set(currentTags.research_interests);

		// Add new interests to global tags
		interests.forEach((tag) => {
			if (tag.trim() !== '' && !currentTagsSet.has(tag)) {
				currentTags.research_interests.push(tag);
			}
		});

		// Update global-tags.json
		await fetch(`https://api.github.com/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/contents/admin/data/global-tags.json`, {
			method: 'PUT',
			headers: {
				Authorization: `token ${token}`,
				Accept: 'application/vnd.github.v3+json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				message: 'Update research interests tags',
				content: Buffer.from(JSON.stringify(currentTags, null, 2)).toString('base64'),
				sha: tagsData.sha
			})
		});

		// Now update the person's file
		const personResponse = await fetch(
			`https://api.github.com/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/contents/people/${personId}.md`,
			{
				headers: {
					Authorization: `token ${token}`,
					Accept: 'application/vnd.github.v3+json'
				}
			}
		);

		if (!personResponse.ok) {
			throw new Error('Failed to fetch person file');
		}

		const personData = await personResponse.json();
		const content = Buffer.from(personData.content, 'base64').toString();
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

		// Update the person's file
		await fetch(`https://api.github.com/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/contents/people/${personId}.md`, {
			method: 'PUT',
			headers: {
				Authorization: `token ${token}`,
				Accept: 'application/vnd.github.v3+json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				message: `Update research interests for ${personId}`,
				content: Buffer.from(newContent).toString('base64'),
				sha: personData.sha
			})
		});

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
