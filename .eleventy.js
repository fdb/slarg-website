const RESEARCH_WEEK_DATES = [
	['Monday', 10],
	['Tuesday', 11],
	['Wednesday', 12],
	['Thursday', 13],
	['Friday', 14],
	['Saturday', 15]
];

module.exports = function (eleventyConfig) {
	eleventyConfig.addPassthroughCopy('static');
	eleventyConfig.addPassthroughCopy('admin');
	eleventyConfig.addPassthroughCopy('2021/static');

	eleventyConfig.addFilter('date', function (date) {
		const d = new Date(date);
		return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		// return .toLocaleDateString();
	});

	for (const [day, date] of RESEARCH_WEEK_DATES) {
		eleventyConfig.addCollection(`events${day}`, function (api) {
			return api.getAll().filter((event) => event.data.date?.getDate() === date);
		});
	}
};
