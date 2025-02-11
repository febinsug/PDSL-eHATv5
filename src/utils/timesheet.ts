import { Timesheet } from '../types';

export const calculateTotalHours = (timesheet: Timesheet) => {
  return (
    timesheet.monday_hours +
    timesheet.tuesday_hours +
    timesheet.wednesday_hours +
    timesheet.thursday_hours +
    timesheet.friday_hours
  );
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