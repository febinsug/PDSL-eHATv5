import { startOfWeek, addDays, isSameMonth, format } from 'date-fns';
import type { Timesheet, MonthEntry } from '../types';

export const calculateTotalHours = (timesheet: Timesheet) => {
  const total = (
    (timesheet.monday_hours || 0) +
    (timesheet.tuesday_hours || 0) +
    (timesheet.wednesday_hours || 0) +
    (timesheet.thursday_hours || 0) +
    (timesheet.friday_hours || 0)
  );
  
  // Return with 2 decimal places
  return Number(total.toFixed(2));
};

export const sortTimesheets = (timesheets: any[], sortOption: { field: string; direction: 'asc' | 'desc' }) => {
  return [...timesheets].sort((a, b) => {
    let valueA, valueB;

    switch (sortOption.field) {
      case 'user.full_name':
        valueA = a.user.full_name || a.user.username;
        valueB = b.user.full_name || b.user.username;
        break;
      case 'project.name':
        valueA = a.project.name;
        valueB = b.project.name;
        break;
      case 'week_number':
        valueA = `${a.year}-${a.week_number}`;
        valueB = `${b.year}-${b.week_number}`;
        break;
      case 'total_hours':
        valueA = calculateTotalHours(a);
        valueB = calculateTotalHours(b);
        break;
      default:
        valueA = a[sortOption.field as keyof Timesheet];
        valueB = b[sortOption.field as keyof Timesheet];
    }

    if (valueA < valueB) return sortOption.direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortOption.direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const filterTimesheets = (timesheets: any[], filterOptions: any) => {
  return timesheets.filter(timesheet => {
    if (filterOptions.users.length > 0 && !filterOptions.users.includes(timesheet.user_id)) {
      return false;
    }
    if (filterOptions.projects.length > 0 && !filterOptions.projects.includes(timesheet.project_id)) {
      return false;
    }
    return true;
  });
};

/**
 * Calculates the structure for the month_hours field based on a timesheet's daily hours.
 * Initializes status to 'draft'.
 */
export const splitTimesheetByMonth = (timesheet: Omit<Timesheet, 'id' | 'status' | 'submitted_at' | 'month_hours' | 'is_split_week' | 'total_hours'>): Record<string, MonthEntry> => {
  const weekStart = startOfWeek(
    new Date(timesheet.year, 0, 1 + (timesheet.week_number - 1) * 7),
    { weekStartsOn: 1 }
  );

  const monthEntries: Record<string, MonthEntry> = {};
  
  const days = [
    { day: 0, hours: timesheet.monday_hours || 0 },
    { day: 1, hours: timesheet.tuesday_hours || 0 },
    { day: 2, hours: timesheet.wednesday_hours || 0 },
    { day: 3, hours: timesheet.thursday_hours || 0 },
    { day: 4, hours: timesheet.friday_hours || 0 }
  ];

  days.forEach(({ day, hours }) => {
    if (hours <= 0) return; // Only process days with hours

    const currentDay = addDays(weekStart, day);
    const monthKey = format(currentDay, 'yyyy-MM');
    
    if (!monthEntries[monthKey]) {
      monthEntries[monthKey] = {
        monday_hours: 0,
        tuesday_hours: 0,
        wednesday_hours: 0,
        thursday_hours: 0,
        friday_hours: 0,
        status: 'draft', // Default status
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        submitted_at: null
      };
    }

    const dayName = ['monday_hours', 'tuesday_hours', 'wednesday_hours', 'thursday_hours', 'friday_hours'][day] as keyof Pick<MonthEntry, 'monday_hours' | 'tuesday_hours' | 'wednesday_hours' | 'thursday_hours' | 'friday_hours'>;
    monthEntries[monthKey][dayName] = hours;
  });

  return monthEntries;
};

/**
 * Sums the hours for a specific month from the timesheet's month_hours field.
 */
export const getHoursForMonth = (timesheet: Timesheet, selectedMonth: Date): number => {
  const monthKey = format(selectedMonth, 'yyyy-MM');
  const monthEntry = timesheet.month_hours?.[monthKey];
  
  if (!monthEntry) {
    // Fallback for older data or non-split weeks missing the new structure?
    // If the week itself is *within* the selected month, maybe return total_hours?
    // For now, strictly return 0 if the month entry doesn't exist.
    return 0;
  }

  const total = (
    (monthEntry.monday_hours || 0) +
    (monthEntry.tuesday_hours || 0) +
    (monthEntry.wednesday_hours || 0) +
    (monthEntry.thursday_hours || 0) +
    (monthEntry.friday_hours || 0)
  );
  return Number(total.toFixed(2));
};

/**
 * Checks if a timesheet has *any* hours recorded for the selected month within its month_hours field.
 * Does NOT check the status for that month.
 */
export const isTimesheetInMonth = (timesheet: Timesheet, selectedMonth: Date): boolean => {
  const monthKey = format(selectedMonth, 'yyyy-MM');
  const monthEntry = timesheet.month_hours?.[monthKey];
  
  if (!monthEntry) {
    return false;
  }

  // Check if any hours exist for this month in the entry
  return (
    (monthEntry.monday_hours || 0) > 0 ||
    (monthEntry.tuesday_hours || 0) > 0 ||
    (monthEntry.wednesday_hours || 0) > 0 ||
    (monthEntry.thursday_hours || 0) > 0 ||
    (monthEntry.friday_hours || 0) > 0
  );
};

/**
 * Gets the status for a specific month from the timesheet's month_hours field.
 * Returns null if the month entry doesn't exist.
 */
export const getStatusForMonth = (timesheet: Timesheet, selectedMonth: Date): MonthEntry['status'] | null => {
  const monthKey = format(selectedMonth, 'yyyy-MM');
  return timesheet.month_hours?.[monthKey]?.status ?? null;
};