import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import type { ProjectUtilizationDetails as ProjectDetails } from '../../types';
import { format, subMonths, addMonths, startOfWeek, addDays, endOfWeek } from 'date-fns';

interface ProjectUtilizationModalProps {
  details: ProjectDetails;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  onClose: () => void;
}

export const ProjectUtilizationDetails: React.FC<ProjectUtilizationModalProps> = ({ details, selectedMonth, onMonthChange, onClose }) => {
  // Sort users by monthly hours in descending order
  const sortedUsers = [...details.users].sort((a, b) => b.monthlyHours - a.monthlyHours);
  const usedThisMonth = details.users.reduce((sum, u) => sum + (u.monthlyHours || 0), 0);
  const monthLabel = format(selectedMonth, 'MMMM');
  const yearLabel = format(selectedMonth, 'yyyy');

  // Helper: get the start and end date for a week number
  const getWeekDateRange = (weekNum: number) => {
    const year = selectedMonth.getFullYear();
    // ISO week: week 1 starts with the first Monday of the year
    const weekStart = startOfWeek(new Date(year, 0, 1 + (weekNum - 1) * 7), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 4); // Friday
    return { weekStart, weekEnd };
  };
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

  // State for expanded users and expanded weeks
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<{ [userId: string]: number[] }>({});

  // Helper: get timesheets for a user for the selected month
  const getUserMonthTimesheets = (userId: string) => {
    return details.timesheets.filter(ts =>
      ts.user_id === userId &&
      ts.month_hours &&
      ts.month_hours[format(selectedMonth, 'yyyy-MM')]
    );
  };

  // Helper: get weekly breakdown for a user
  const getWeeklyBreakdown = (userId: string) => {
    const timesheets = getUserMonthTimesheets(userId);
    // Group by week_number
    const weekMap: { [week: number]: typeof timesheets } = {};
    timesheets.forEach(ts => {
      if (!weekMap[ts.week_number]) weekMap[ts.week_number] = [];
      weekMap[ts.week_number].push(ts);
    });
    // For each week, sum hours
    return Object.entries(weekMap).map(([week, weekTs]) => {
      const weekNum = Number(week);
      // Sum daily hours for the week
      let total = 0;
      let days = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
      weekTs.forEach(ts => {
        const monthEntry = ts.month_hours ? ts.month_hours[format(selectedMonth, 'yyyy-MM')] : undefined;
        if (monthEntry) {
          days.Monday += monthEntry.monday_hours || 0;
          days.Tuesday += monthEntry.tuesday_hours || 0;
          days.Wednesday += monthEntry.wednesday_hours || 0;
          days.Thursday += monthEntry.thursday_hours || 0;
          days.Friday += monthEntry.friday_hours || 0;
        }
      });
      total = Object.values(days).reduce((a, b) => a + b, 0);
      return { weekNum, total, days };
    }).sort((a, b) => a.weekNum - b.weekNum);
  };

  // Toggle helpers
  const toggleUser = (userId: string) => {
    setExpandedUsers(expanded =>
      expanded.includes(userId) ? expanded.filter(id => id !== userId) : [...expanded, userId]
    );
  };
  const toggleWeek = (userId: string, weekNum: number) => {
    setExpandedWeeks(prev => {
      const userWeeks = prev[userId] || [];
      return {
        ...prev,
        [userId]: userWeeks.includes(weekNum)
          ? userWeeks.filter(w => w !== weekNum)
          : [...userWeeks, weekNum],
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">{details.project.name}</h2>
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
            <button 
              onClick={onClose} 
              className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
              <XIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Used Total</p>
                <p className="text-2xl font-semibold">{details.totalHoursUsed}h</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Used in {monthLabel}</p>
                <p className="text-2xl font-semibold">{usedThisMonth}h</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Allocated</p>
                <p className="text-2xl font-semibold">{details.project.allocated_hours}h</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Utilization</p>
                <p 
                  className={`text-2xl font-semibold ${
                    details.project.utilization > 100 ? 'text-red-500' : 'text-emerald-500'
                  }`}
                >
                  {details.project.utilization.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Team Members */}
            <h3 className="text-sm font-medium text-gray-500 mb-4">TEAM MEMBERS</h3>
            <div className="space-y-3">
              {sortedUsers.map(user => {
                const isUserExpanded = expandedUsers.includes(user.id);
                const weekly = getWeeklyBreakdown(user.id);
                return (
                  <div key={user.id} className="bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl">
                    <div
                      className="flex items-center justify-between p-4 hover:shadow-sm transition-all duration-200 cursor-pointer"
                      onClick={() => toggleUser(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-blue-700 font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          {user.designation && (
                            <p className="text-xs text-gray-500">{user.designation}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">{user.monthlyHours}h</span>
                            <span className="text-gray-500 ml-1">{monthLabel}</span>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 mt-0.5">
                            {user.hours}h total
                          </div>
                        </div>
                        <button
                          className="ml-2 p-1 rounded hover:bg-gray-100"
                          onClick={e => { e.stopPropagation(); toggleUser(user.id); }}
                          aria-label={isUserExpanded ? 'Collapse' : 'Expand'}
                        >
                          <svg className={`w-5 h-5 transition-transform ${isUserExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    </div>
                    {isUserExpanded && (
                      <div className="pl-8 pr-2 pb-4 pt-2 space-y-2">
                        {weekly.length === 0 ? (
                          <div className="text-gray-400 text-sm italic">No data for this month</div>
                        ) : weekly.map(week => {
                          const isWeekExpanded = (expandedWeeks[user.id] || []).includes(week.weekNum);
                          const { weekStart, weekEnd } = getWeekDateRange(week.weekNum);
                          return (
                            <div key={week.weekNum} className="bg-gray-50 rounded-lg">
                              <div
                                className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100 rounded-lg"
                                onClick={() => toggleWeek(user.id, week.weekNum)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">Week {week.weekNum}</span>
                                  <span className="text-xs text-gray-500">(
                                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                                  )</span>
                                  <span className="text-xs text-gray-500">{week.total}h</span>
                                </div>
                                <svg className={`w-4 h-4 transition-transform ${isWeekExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </div>
                              {isWeekExpanded && (
                                <div className="px-6 pb-3 pt-1">
                                  <div className="grid grid-cols-5 gap-2">
                                    {Object.entries(week.days).map(([day, hours], idx) => {
                                      const date = addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), idx);
                                      return (
                                        <div key={day} className="bg-white rounded p-2 flex flex-col items-center">
                                          <span className="text-xs text-gray-500">{day}</span>
                                          <span className="font-medium text-gray-900">{hours}h</span>
                                          <span className="text-[10px] text-gray-400 mt-0.5">{ordinal(date.getDate())}</span>
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