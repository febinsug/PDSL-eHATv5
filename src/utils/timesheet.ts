import { startOfWeek, addDays } from 'date-fns';
import type { Timesheet } from '../types';

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

export const isTimesheetInMonth = (timesheet: Timesheet, selectedMonth: Date) => {
  // Get the first day of the week for this timesheet
  const weekStart = startOfWeek(
    new Date(timesheet.year, 0, 1 + (timesheet.week_number - 1) * 7),
    { weekStartsOn: 1 }
  );

  // Check if any day of the week falls in the selected month and year
  let daysInSelectedMonth = 0;
  for (let i = 0; i < 7; i++) {
    const currentDay = addDays(weekStart, i);
    if (
      currentDay.getMonth() === selectedMonth.getMonth() &&
      currentDay.getFullYear() === selectedMonth.getFullYear()
    ) {
      daysInSelectedMonth++;
    }
  }

  // Return true if at least 3 days of the week fall in the selected month
  return daysInSelectedMonth >= 3;
};