function groupEventsByWeekday(allEvents) {
	let groupedByWeekday = {};

	allEvents.forEach((item) => {
		let date = new Date(item.data.date);
		let weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
		let d = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
		let formattedDate = d; // `${weekday}, ${d}`;

		if (!groupedByWeekday[formattedDate]) {
			groupedByWeekday[formattedDate] = [];
		}

		groupedByWeekday[formattedDate].push(item);
	});

	return groupedByWeekday;
}

module.exports = function (eleventyConfig) {
	eleventyConfig.addPassthroughCopy('static');
	eleventyConfig.addPassthroughCopy('admin');
	eleventyConfig.addPassthroughCopy('2021/static');

	eleventyConfig.addFilter('date', function (date) {
		const d = new Date(date);
		return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
	});

	// eleventyConfig.addCollection('pre_events_2023', function (collection) {
	// 	const allEvents = collection
	// 		.getFilteredByTag('event')
	// 		.filter((event) => {
	// 			console.log(event.data.date); // Check the format of the date here
	// 			const date = new Date(event.data.date);
	// 			return date.getFullYear() === 2023 && date.getDate() < 16;
	// 		});
	// 	return allEvents;
	// });

	eleventyConfig.addCollection('events_2024', function (collection) {
		return collection.getAll().filter((item) => {
			return item.data.event_type === 'event' && item.data.date === 2024;
		});
	});
	
	eleventyConfig.addCollection('exhibition_2024', function (collection) {
		return collection.getAll().filter((item) => {
			return item.data.event_type === 'exhibition' && item.data.year === 2024;
		});
	});




	// eleventyConfig.addCollection('events_2023', function (collection) {
	// 	const allEvents = collection
	// 		.getFilteredByTag('event')
	// 		.filter((event) => event.data.date?.getFullYear() === 2023 && event.data.date?.getDate() >= 16);
	// 	return groupEventsByWeekday(allEvents);
	// });
	// eleventyConfig.addCollection('events_2022', function (collection) {
	// 	const allEvents = collection.getFilteredByTag('event').filter((event) => event.data.date?.getFullYear() === 2022);
	// 	return groupEventsByWeekday(allEvents);
	// });

	eleventyConfig.addCollection('researchers', function (collection) {
		return collection.getFilteredByGlob('researchers/*.md');
	});
};