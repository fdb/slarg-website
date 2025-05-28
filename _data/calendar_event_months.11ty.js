module.exports = function (collections) {
	const calendarEvents = collections.calendar_events;
	if (!calendarEvents || !calendarEvents.months) return [];

	const result = [];

	for (const [month, events] of Object.entries(calendarEvents.months)) {
		result.push({ month, events });
	}


	return result.sort((a, b) => a.month.localeCompare(b.month));
};
