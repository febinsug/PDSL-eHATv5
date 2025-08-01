import React, { useState } from 'react';
import { X } from 'lucide-react';
import { format, subMonths, addMonths, startOfWeek, addDays } from 'date-fns';
import type { UserHours, TimesheetWithDetails } from '../../types';

interface UserHoursModalProps {
  userHours: UserHours;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  onClose: () => void;
}

export const UserHoursModal: React.FC<UserHoursModalProps> = ({ userHours, selectedMonth, onMonthChange, onClose }) => {
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([]);
  // Helper: get ordinal suffix for a date
  const ordinal = (n: number) => {
    if (n > 3 && n < 21) return n + 'th';
    switch (n % 10) {
      case 1: return n + 'st';
      case 2: return n + 'nd';
      case 3: return n + 'rd';
      default: return n + 'th';
    }
  };
  // Helper: get the start and end date for a week number
  const getWeekDateRange = (weekNum: number) => {
    const year = selectedMonth.getFullYear();
    const weekStart = startOfWeek(new Date(year, 0, 1 + (weekNum - 1) * 7), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 4);
    return { weekStart, weekEnd };
  };

  // Helper: get daily hours for a specific project within a week
  const getDailyHoursForProjectInWeek = (timesheet: TimesheetWithDetails, weekNum: number) => {
    const monthKey = format(selectedMonth, 'yyyy-MM');
    const monthEntry = timesheet.month_hours?.[monthKey];
    if (!monthEntry) return [];

    const days = [
      { name: 'Monday', hours: monthEntry.monday_hours ?? 0, date: addDays(getWeekDateRange(weekNum).weekStart, 0) },
      { name: 'Tuesday', hours: monthEntry.tuesday_hours ?? 0, date: addDays(getWeekDateRange(weekNum).weekStart, 1) },
      { name: 'Wednesday', hours: monthEntry.wednesday_hours ?? 0, date: addDays(getWeekDateRange(weekNum).weekStart, 2) },
      { name: 'Thursday', hours: monthEntry.thursday_hours ?? 0, date: addDays(getWeekDateRange(weekNum).weekStart, 3) },
      { name: 'Friday', hours: monthEntry.friday_hours ?? 0, date: addDays(getWeekDateRange(weekNum).weekStart, 4) },
    ];

    return days.map(d => ({ ...d, dayShort: format(d.date, 'EEE'), dateOrdinal: ordinal(d.date.getDate()) }));
  };

  const [expandedProjectsInWeek, setExpandedProjectsInWeek] = useState<{ [weekNum: number]: string[] }>({});

  const toggleProjectInWeek = (weekNum: number, projectId: string) => {
    setExpandedProjectsInWeek(prev => {
      const projects = prev[weekNum] || [];
      return {
        ...prev,
        [weekNum]: projects.includes(projectId)
          ? projects.filter(id => id !== projectId)
          : [...projects, projectId],
      };
    });
  };

  // Calculate total hours for this month
  const totalMonthHours = userHours.weeklyHours.reduce((sum, w) => sum + w.hours, 0);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{userHours.user.full_name || userHours.user.username}</h3>
            <p className="text-sm text-gray-500">Total hours this month: {totalMonthHours}</p>
          </div>
          <div className="flex items-center gap-2 min-w-[220px] justify-end">
            <button
              onClick={() => onMonthChange(subMonths(selectedMonth, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-medium text-gray-900 w-[100px] text-center block">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Project Breakdown</h4>
            <div className="space-y-2">
              {userHours.projectHours.map(({ project, hours }) => (
                <div key={project.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-gray-500">{project.client?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{hours} hours</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Breakdown</h4>
            <div className="space-y-2">
              {userHours.weeklyHours.map(({ weekNumber, hours }) => {
                const isWeekExpanded = expandedWeeks.includes(weekNumber);
                const { weekStart, weekEnd } = getWeekDateRange(weekNumber);
                const timesheetsForWeek = userHours.timesheets.filter(ts =>
                  ts.week_number === weekNumber &&
                  format(selectedMonth, 'yyyy-MM') in (ts.month_hours || {})
                );

                return (
                  <div key={weekNumber} className="bg-gray-50 rounded-lg">
                    <div
                      className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100 rounded-lg"
                      onClick={() => setExpandedWeeks(exp => exp.includes(weekNumber) ? exp.filter(w => w !== weekNumber) : [...exp, weekNumber])}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">Week {weekNumber}</span>
                        <span className="text-xs text-gray-500">(
                          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                        )</span>
                        <span className="text-xs text-gray-500">{hours}h</span>
                      </div>
                      <svg className={`w-4 h-4 transition-transform ${isWeekExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                    {isWeekExpanded && (
                      <div className="px-6 pb-3 pt-1">
                        <div className="space-y-2">
                          {timesheetsForWeek.length === 0 ? (
                            <div className="text-gray-400 text-sm italic">No project data for this week</div>
                          ) : timesheetsForWeek.map(timesheet => {
                            const isProjectExpandedInWeek = (expandedProjectsInWeek[weekNumber] || []).includes(timesheet.project.id);
                            const monthEntry = timesheet.month_hours?.[format(selectedMonth, 'yyyy-MM')];
                            const projectHoursForWeek = (
                              (monthEntry?.monday_hours || 0) +
                              (monthEntry?.tuesday_hours || 0) +
                              (monthEntry?.wednesday_hours || 0) +
                              (monthEntry?.thursday_hours || 0) +
                              (monthEntry?.friday_hours || 0)
                            );

                            const dailyBreakdown = getDailyHoursForProjectInWeek(timesheet, weekNumber);

                            return (
                              <div key={timesheet.project.id} className="bg-white rounded p-2">
                                <div
                                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded p-2"
                                  onClick={() => toggleProjectInWeek(weekNumber, timesheet.project.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{timesheet.project.name}</span>
                                    <span className="text-xs text-gray-500">{projectHoursForWeek}h</span>
                                  </div>
                                  <svg className={`w-4 h-4 transition-transform ${isProjectExpandedInWeek ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                                {isProjectExpandedInWeek && (
                                  <div className="grid grid-cols-5 gap-2 mt-2 px-2">
                                    {dailyBreakdown.map(day => (
                                      <div key={day.dayShort} className="bg-gray-50 rounded p-2 flex flex-col items-center">
                                        <span className="text-xs text-gray-500">{day.dayShort}</span>
                                        <span className="font-medium text-gray-900">{day.hours}h</span>
                                        <span className="text-[10px] text-gray-400 mt-0.5">{day.dateOrdinal}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};