import React, { useState } from 'react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { Clock, ChevronUp, ChevronDown, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { TimesheetBreakdown } from '../shared/TimesheetBreakdown';
import { calculateTotalHours, isTimesheetInMonth, getHoursForMonth } from '../../utils/timesheet';
import type { TimesheetWithProject } from '../../types';

interface SubmissionHistoryProps {
  timesheets: TimesheetWithProject[];
  expandedTimesheets: string[];
  toggleTimesheet: (id: string) => void;
  onEdit: (timesheet: TimesheetWithProject) => void;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  showHeader?: boolean;
}

export const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({
  timesheets,
  expandedTimesheets,
  toggleTimesheet,
  onEdit,
  selectedMonth,
  onMonthChange,
  showHeader = true
}) => {
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, string[]>>({}); // weekKey -> [timesheetId]
  const filteredTimesheets = timesheets.filter(timesheet => 
    selectedMonth ? isTimesheetInMonth(timesheet, selectedMonth) : false
  );

  // Group timesheets by week_number + year
  const weekGroups = filteredTimesheets.reduce((acc, ts) => {
    const key = `${ts.week_number}-${ts.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ts);
    return acc;
  }, {} as Record<string, TimesheetWithProject[]>);

  const weekKeys = Object.keys(weekGroups).sort((a, b) => {
    // Sort by year then week_number descending
    const [aWeek, aYear] = a.split('-').map(Number);
    const [bWeek, bYear] = b.split('-').map(Number);
    if (aYear !== bYear) return bYear - aYear;
    return bWeek - aWeek;
  });

  const handleProjectToggle = (weekKey: string, timesheetId: string) => {
    setExpandedProjects(prev => {
      const expanded = prev[weekKey] || [];
      if (expanded.includes(timesheetId)) {
        return { ...prev, [weekKey]: expanded.filter(id => id !== timesheetId) };
      } else {
        return { ...prev, [weekKey]: [...expanded, timesheetId] };
      }
    });
  };

  const handleWeekExpand = (weekKey: string, weekTimesheets: TimesheetWithProject[]) => {
    setExpandedWeeks(expandedWeeks.includes(weekKey) ? expandedWeeks.filter(k => k !== weekKey) : [...expandedWeeks, weekKey]);
    // On expand, collapse all project entries by default
    setExpandedProjects(prev => ({ ...prev, [weekKey]: [] }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      {showHeader && (
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your Submissions</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onMonthChange(subMonths(selectedMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={selectedMonth >= new Date()}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {weekKeys.map(weekKey => {
              const weekTimesheets = weekGroups[weekKey];
              const { week_number, year } = weekTimesheets[0];
              const totalHours = weekTimesheets.reduce((sum, ts) => sum + getHoursForMonth(ts, selectedMonth), 0);
              // If any timesheet is pending/submitted, show that status, else if any rejected, show rejected, else approved
              let status = 'approved';
              if (weekTimesheets.some(ts => ts.status === 'pending' || ts.status === 'submitted')) status = 'pending';
              else if (weekTimesheets.some(ts => ts.status === 'rejected')) status = 'rejected';
              // Use the first timesheet for edit (all are same week)
              const canEdit = weekTimesheets.some(ts => ts.status !== 'approved');
              const expanded = expandedWeeks.includes(weekKey);
              return (
                <React.Fragment key={weekKey}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      Week {week_number}, {year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      {totalHours} hours
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {status === 'pending' && <Clock className="w-3 h-3" />}
                        {status === 'pending' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleWeekExpand(weekKey, weekTimesheets)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => onEdit(weekTimesheets[0])}
                            className="text-[#1732ca] hover:text-[#1732ca]/80 text-sm font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={4} className="px-6 pb-6">
                        <div className="border rounded-lg divide-y bg-gray-50">
                          {weekTimesheets.map((ts, idx) => {
                            const projectExpanded = (expandedProjects[weekKey] || []).includes(ts.id);
                            return (
                              <div key={ts.id} className={`py-4 px-4${idx === 0 ? ' mt-4' : ''}`}>
                                <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                                  <div className="font-medium text-gray-900 flex-1">{ts.project.name}</div>
                                  <div className="font-bold text-gray-700 flex-shrink-0">{getHoursForMonth(ts, selectedMonth)} hours</div>
                                  <div className="text-xs text-gray-500 flex-shrink-0 flex items-center gap-1">
                                    {ts.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                                    {ts.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                    {(ts.status === 'pending' || ts.status === 'submitted') && <Clock className="w-3 h-3" />}
                                    {ts.status === 'submitted' ? 'Pending' : ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                                  </div>
                                  <button
                                    onClick={() => handleProjectToggle(weekKey, ts.id)}
                                    className="ml-4 text-gray-500 hover:text-gray-700"
                                  >
                                    {projectExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>
                                {projectExpanded && (
                                  <div className="mt-2">
                                    <TimesheetBreakdown
                                      timesheet={ts}
                                      expanded={true}
                                      selectedMonth={selectedMonth}
                                    />
                                    {ts.rejection_reason && (
                                      <div className="text-xs text-red-600 mt-1">{ts.rejection_reason}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {weekKeys.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No submissions found for {format(selectedMonth, 'MMMM yyyy')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};