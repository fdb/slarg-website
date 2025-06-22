const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const peopleDir = path.join(__dirname, '../../people');
const projectsDir = path.join(__dirname, '../../projects');
const activitiesDir = path.join(__dirname, '../../content/activities');
const outputFile = path.join(__dirname, '../../_data/global-tags.json');

function getAllMarkdownFiles(dir) {
	console.log('getting the stuff');
	return fs.readdirSync(dir).filter((file) => file.endsWith('.md'));
}

function collectTagsFromDir(dir) {
	if (!fs.existsSync(dir)) {
		return [];
	}
	const files = getAllMarkdownFiles(dir);
	const tags = new Set();

	files.forEach((file) => {
		const content = fs.readFileSync(path.join(dir, file), 'utf8');
		const parsed = matter(content);

		const interests = parsed.data.research_interests || [];

		if (Array.isArray(interests)) {
			interests.forEach((tag) => {
				if (typeof tag === 'string') {
					tags.add(tag.trim());
				}
			});
		}
	});

	return Array.from(tags);
}

function main() {
	const peopleTags = collectTagsFromDir(peopleDir);
	const projectTags = collectTagsFromDir(projectsDir);
	const activityTags = collectTagsFromDir(activitiesDir);
	const allTags = new Set([...peopleTags, ...projectTags, ...activityTags]);
	const sortedTags = Array.from(allTags).sort();

	fs.writeFileSync(outputFile, JSON.stringify(sortedTags, null, 2));
	console.log(`✅ Successfully wrote ${sortedTags.length} tags to global-tags.json`);
}

main();
