const yaml = require('js-yaml');

exports.handler = async function (event, context) {
	if (event.httpMethod !== 'POST') {
		console.log('Post failed');
		return {
			statusCode: 405,
			body: JSON.stringify({ error: 'Method not allowed' })
		};
	}

	try {
		// Get the client token from the request headers
		const token = event.headers.authorization?.split(' ')[1];
		if (!token) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: 'Unauthorized - No token provided' })
			};
		}

		// Initialize the Netlify client
		const client = context.clientContext?.client;
		const user = context.clientContext?.user;

		if (!client || !user) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: 'Unauthorized - Invalid client context' })
			};
		}

		// Get the Git instance from Netlify
		const { git } = context.clientContext;
		if (!git) {
			return {
				statusCode: 500,
				body: JSON.stringify({ error: 'Git Gateway not configured' })
			};
		}

		// Collect all unique interests from markdown files
		const allInterests = new Set();

		// Get all files in the people directory
		const peopleFiles = await git.listFiles({ path: 'people' });

		// Process each markdown file
		for (const file of peopleFiles) {
			if (file.path.endsWith('.md')) {
				const content = await git.readFile(file.path);
				const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

				if (frontmatterMatch) {
					const frontmatter = yaml.load(frontmatterMatch[1]);
					if (Array.isArray(frontmatter.research_interests)) {
						frontmatter.research_interests.forEach((interest) => {
							if (interest && interest.trim()) {
								allInterests.add(interest.trim());
							}
						});
					}
				}
			}
		}

		// Read the current global-tags.json
		const tagsContent = await git.readFile('_data/global-tags.json');
		const currentTags = JSON.parse(tagsContent);

		// Combine existing tags with collected ones and sort
		const updatedTags = {
			research_interests: [...new Set([...currentTags.research_interests, ...Array.from(allInterests)])].sort()
		};

		// Write back to global-tags.json
		await git.writeFile({
			path: '_data/global-tags.json',
			content: JSON.stringify(updatedTags, null, 2),
			message: 'Update research interests from all profiles'
		});

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
