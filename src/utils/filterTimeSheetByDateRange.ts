import {
  startOfWeek,
  addDays,
  parseISO,
  isWithinInterval,
  setWeek,
  setWeekYear
} from "date-fns";

interface MonthHours {
  [month: string]: {
    status: string | null;
    approved_at: string | null;
    approved_by: string | null;
    rejection_reason: string | null;
    submitted_at: string | null;
    monday_hours: number;
    tuesday_hours: number;
    wednesday_hours: number;
    thursday_hours: number;
    friday_hours: number;
  };
}

interface Timesheet {
  id: string;
  user_id: string;
  project_id: string;
  week_number: number;
  year: number;
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  status: string;
  submitted_at: string | null;
  total_hours: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  month_hours: MonthHours;
  is_split_week: boolean;
}

const weekdayKeys = [
  "monday_hours",
  "tuesday_hours",
  "wednesday_hours",
  "thursday_hours",
  "friday_hours"
] as const;

const weekdayIndex = {
  monday_hours: 0,
  tuesday_hours: 1,
  wednesday_hours: 2,
  thursday_hours: 3,
  friday_hours: 4
} as const;

function getMondayDate(year: number, weekNumber: number) {
  return startOfWeek(
    setWeek(setWeekYear(new Date(), year), weekNumber, { weekStartsOn: 1 }),
    { weekStartsOn: 1 }
  );
}

export const filterTimesheetsByDateRange = async (
  timesheets: Timesheet[],
  startDateStr: string,
  endDateStr: string
): Promise<Timesheet[]> => {
  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);
  console.log(timesheets, startDate, endDate, 'startDate, endDate')
  return timesheets
    .map((week) => {
      const mondayDate = getMondayDate(week.year, week.week_number);

      let anyHours = false;

      // Initialize new week object immutably
      const newWeek: Timesheet = {
        ...week,
        monday_hours: 0,
        tuesday_hours: 0,
        wednesday_hours: 0,
        thursday_hours: 0,
        friday_hours: 0,
        total_hours: 0,
        month_hours: {} // new object to avoid mutations
      };

      // Process each month
      Object.entries(week.month_hours).forEach(([monthKey, monthData]) => {
        let hasHoursInMonth = false;

        // Build a new month object immutably
        const newMonthData = weekdayKeys.reduce((acc, dayKey) => {
          const dayOffset = weekdayIndex[dayKey];
          const actualDate = addDays(mondayDate, dayOffset);

          if (
            actualDate.toISOString().slice(0, 7) === monthKey &&
            isWithinInterval(actualDate, { start: startDate, end: endDate })
          ) {
            const hours = monthData[dayKey] || 0;
            acc[dayKey] = hours;
            newWeek[dayKey] += hours;
            if (hours >= 0) {
              hasHoursInMonth = true;
              anyHours = true;
            }
          } else {
            acc[dayKey] = 0;
          }

          // Keep other month metadata intact
          acc.status = monthData.status;
          acc.approved_at = monthData.approved_at;
          acc.approved_by = monthData.approved_by;
          acc.rejection_reason = monthData.rejection_reason;
          acc.submitted_at = monthData.submitted_at;

          return acc;
        }, {} as typeof monthData);

        if (hasHoursInMonth) {
          newWeek.month_hours[monthKey] = newMonthData;
        }
      });

      // Recalculate total_hours
      newWeek.total_hours = weekdayKeys.reduce(
        (sum, key) => sum + (newWeek[key] || 0),
        0
      );

      return anyHours ? newWeek : null;
    })
    .filter((week): week is Timesheet => week !== null);
};
