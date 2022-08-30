module.exports = function (eleventyConfig) {
	eleventyConfig.addPassthroughCopy('static');

	eleventyConfig.addFilter('date', function (date) {
		const d = new Date(date);
		return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		// return .toLocaleDateString();
	});
};
