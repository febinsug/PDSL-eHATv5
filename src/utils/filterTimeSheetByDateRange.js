import { startOfWeek, addDays, parseISO, isWithinInterval } from 'date-fns';

const weekdayKeys = ['monday_hours', 'tuesday_hours', 'wednesday_hours', 'thursday_hours', 'friday_hours'];
const weekdayIndex = {
  monday_hours: 0,
  tuesday_hours: 1,
  wednesday_hours: 2,
  thursday_hours: 3,
  friday_hours: 4,
};

function getMondayDate(year, weekNumber) {
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  return startOfWeek(simple, { weekStartsOn: 1 }); // Monday start
}

function filterTimesheetsByDateRange(timesheets, startDateStr, endDateStr) {
  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);

  return timesheets
    .map((week) => {
      const mondayDate = getMondayDate(week.year, week.week_number);

      // Filter daily hours fields (monday_hours, tuesday_hours, etc)
      const filteredDailyHours = {};
      let anyHours = false;

      for (const dayKey of weekdayKeys) {
        const dayOffset = weekdayIndex[dayKey];
        const dayDate = addDays(mondayDate, dayOffset);

        if (isWithinInterval(dayDate, { start: startDate, end: endDate })) {
          filteredDailyHours[dayKey] = week[dayKey];
          if (week[dayKey] > 0) anyHours = true;
        } else {
          filteredDailyHours[dayKey] = 0;
        }
      }

      // Filter month_hours object
      const filteredMonthHours = {};
      for (const [monthKey, monthData] of Object.entries(week.month_hours || {})) {
        const filteredMonthData = { ...monthData };
        let hasHoursInMonth = false;

        for (const dayKey of weekdayKeys) {
          if (dayKey in monthData) {
            const dayOffset = weekdayIndex[dayKey];
            const dayDate = addDays(mondayDate, dayOffset);
            const dayMonth = dayDate.toISOString().slice(0, 7);

            if (dayMonth === monthKey && isWithinInterval(dayDate, { start: startDate, end: endDate })) {
              // Keep original hours
              if (monthData[dayKey] > 0) hasHoursInMonth = true;
              filteredMonthData[dayKey] = monthData[dayKey];
            } else {
              filteredMonthData[dayKey] = 0;
            }
          }
        }

        if (hasHoursInMonth) {
          filteredMonthHours[monthKey] = filteredMonthData;
          anyHours = true;
        }
      }

      // If no hours in week, optionally skip the whole week (return null)
      if (!anyHours) return null;

      // Build filtered object keeping all other fields intact
      return {
        ...week,
        ...filteredDailyHours,
        month_hours: filteredMonthHours,
        // Recalculate total_hours if you want:
        total_hours: Object.values(filteredDailyHours).reduce((sum, h) => sum + h, 0),
      };
    })
    .filter(Boolean); // remove null entries (weeks without hours)
}
export default filterTimesheetsByDateRange;