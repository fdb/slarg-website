const { DateTime } = require('luxon');
const markdownIt = require('markdown-it');
const md = new markdownIt();

function groupEventsByWeekday(allEvents) {
	let groupedByWeekday = {};

	allEvents.forEach((item) => {
		let date = item.data.startDate ? new Date(item.data.startDate) : new Date(item.data.date);
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

function groupEventsByDayAndHour(allEvents) {
	let groupedByDayAndHour = {};

	allEvents.forEach((item) => {
		let date = item.data.startDate ? new Date(item.data.startDate) : new Date(item.data.date);
		let weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
		let d = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
		let hour = date.getHours();
		let formattedDate = d;
		let hourKey = `${formattedDate} - ${hour}:00`;

		if (!groupedByDayAndHour[hourKey]) {
			groupedByDayAndHour[hourKey] = [];
		}

		groupedByDayAndHour[hourKey].push(item);
	});

	return groupedByDayAndHour;
}

module.exports = function (eleventyConfig, collections) {
	eleventyConfig.addPassthroughCopy('static');
	eleventyConfig.addPassthroughCopy('admin');
	eleventyConfig.addPassthroughCopy('2021/static');
	eleventyConfig.addPassthroughCopy({ '_data/global-tags.json': 'global-tags.json' });

	// Cloudflare Images variant filter
	// Usage: {{ main_image | cfImage: 'thumb' }}
	eleventyConfig.addFilter('cfImage', function(url, variant = 'public') {
		if (url && url.includes('imagedelivery.net')) {
			// Replace the variant at the end of the URL
			return url.replace(/\/[^\/]+$/, '/' + variant);
		}
		// R2 and other URLs pass through unchanged
		return url;
	});

	eleventyConfig.addFilter('formatRoles', function (roles) {
		if (!Array.isArray(roles)) return '';
		return roles.join(', ');
	});

	eleventyConfig.addFilter('date', function (date) {
		const d = new Date(date);
		return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
	});

	eleventyConfig.addCollection('projects', function (collectionApi) {
		return collectionApi.getFilteredByGlob('projects/*.md');
	});



	eleventyConfig.addCollection('research_week_2025', function (collection) {
		const researchWeekActivities = collection.getFilteredByGlob('research-week/2025/*.md')
		  .filter(event => {
			const date = new Date(event.data.startDate);
			return !isNaN(date) && date.getFullYear() === 2025 && event.data.type !== 'overview-research-week';
		  });
		
		const allEvents = researchWeekActivities;
	  
		const grouped = groupEventsByWeekday(allEvents);
		
		// Sort events within each day by hour
		Object.keys(grouped).forEach(day => {
			grouped[day].sort((a, b) => {
				const dateA = new Date(a.data.startDate);
				const dateB = new Date(b.data.startDate);
				return dateA.getHours() - dateB.getHours();
			});
		});
	  
		// Convert object to array.. not sure why but it works
		return Object.entries(grouped).sort(([dateStrA], [dateStrB]) => {
		  return new Date(dateStrA) - new Date(dateStrB);
		});
	  });
	  

	eleventyConfig.addCollection('events_2024', function (collection) {
		return collection.getAll().filter((item) => {
			return item.data.section_website_2024 === 'event' && item.data.year === 2024;
		});
	});

	eleventyConfig.addCollection('exhibition_2024', function (collection) {
		return collection.getAll().filter((item) => {
			return item.data.section_website_2024 === 'exhibition' && item.data.year === 2024;
		});
	});

	eleventyConfig.addCollection('pre_events_2023', function (collection) {
		const allEvents = collection.getFilteredByTag('event').filter((event) => {
			const date = new Date(event.data.date);
			return date.getFullYear() === 2023 && date.getDate() < 16;
		});
		return allEvents;
	});

	eleventyConfig.addCollection('events_2023', function (collection) {
		const allEvents = collection.getFilteredByTag('event').filter((event) => {
			const date = event.data.date;
			return date instanceof Date && date.getFullYear() === 2023 && date.getDate() >= 16;
		});
		return groupEventsByWeekday(allEvents);
	});

	eleventyConfig.addCollection('events_2022', function (collection) {
		const allEvents = collection.getFilteredByTag('event').filter((event) => {
			const date = event.data.date;
			return date instanceof Date && date.getFullYear() === 2022;
		});
		return groupEventsByWeekday(allEvents);
	});

	eleventyConfig.addCollection('researchers', function (collection) {
		return collection.getFilteredByGlob('researchers/*.md');
	});

	eleventyConfig.addCollection('people', function (collection) {
		return collection
			.getFilteredByGlob('people/*.md')
			.filter((item) => item.data.layout === 'people.liquid' && !item.fileSlug.includes('index'));
	});

	eleventyConfig.addFilter('formatDate', (dateStr) => {
		const date = new Date(dateStr);
		return date.toDateString();
	});

	eleventyConfig.addFilter('monthYear', (value) => {
		if (!value) return '';

		if (value instanceof Date) {
			return DateTime.fromJSDate(value).toFormat('MMMM yyyy');
		}
		return DateTime.fromISO(value).toFormat('MMMM yyyy');
	});

	eleventyConfig.addCollection('calendar_events', function (collectionApi) {
		const allActivities = collectionApi.getFilteredByGlob('./content/activities/*.md');
		const allEvents = [];

		allActivities.forEach((activity) => {
			const type = activity.data.type || 'activity';
			if (type === 'activity') {
				allEvents.push(activity);
			  } else if (type === 'overview-research-week') {
				
				allEvents.push({
				  data: {
					title: activity.data.title,
					startDate: activity.data.startDate, 
					link: activity.data.link,
					type: 'overview-research-week',
					description: activity.data.description
				  }
				});
			  }
		});

		const byMonth = {};
		allEvents.forEach((event) => {
		  const date = new Date(event.data.startDate);
		  if (isNaN(date)) return;
		  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		  if (!byMonth[key]) byMonth[key] = [];
		  byMonth[key].push(event);
		});
	  
		return Object.entries(byMonth)
		  .map(([month, events]) => ({ month, events }))
		  .sort((a, b) => a.month.localeCompare(b.month));
	});

	eleventyConfig.addFilter('formatDateTime', (value) => {
		if (!value) return '';

		let dt;
		if (value instanceof Date) {
			dt = DateTime.fromJSDate(value);
		} else {
			dt = DateTime.fromISO(value);
			if (!dt.isValid) {
				dt = DateTime.fromJSDate(new Date(value));
			}
		}

		if (!dt.isValid) return value;

		return dt.toFormat('dd LLLL yyyy, HH:mm');
	});

	eleventyConfig.addFilter('prettyActivityDate', function (dateStr) {
		if (!dateStr) return '';
		const dt = DateTime.fromISO(dateStr);
		if (!dt.isValid) return dateStr;
		return dt.toFormat("cccc d 'of' LLLL yyyy");
	});

	eleventyConfig.addFilter('markdownify', (value) => {
		if (!value) return '';
		return md.render(value);
	});

	eleventyConfig.addCollection("publications", function (collectionApi) {
  		return collectionApi.getFilteredByGlob("./publications/*.md");
	});

};
