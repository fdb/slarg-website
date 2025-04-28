const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const peopleDir = path.join(__dirname, "../../people");
const outputFile = path.join(__dirname, "../../_data/global-tags.json");

function getAllMarkdownFiles(dir) {
  return fs.readdirSync(dir).filter(file => file.endsWith(".md"));
}

function collectTags() {
  const files = getAllMarkdownFiles(peopleDir);
  const allTags = new Set();

  files.forEach(file => {
    const content = fs.readFileSync(path.join(peopleDir, file), "utf8");
    const parsed = matter(content); // ✅ parses YAML frontmatter

    const interests = parsed.data.research_interests || [];

    if (Array.isArray(interests)) {
      interests.forEach(tag => {
        if (typeof tag === "string") {
          allTags.add(tag.trim());
        }
      });
    }
  });

  return Array.from(allTags).sort();
}

function writeTags(tags) {
  fs.writeFileSync(outputFile, JSON.stringify(tags, null, 2));
  console.log(`✅ Successfully wrote ${tags.length} tags to global-tags.json`);
}

function main() {
  const tags = collectTags();
  writeTags(tags);
}

main();
