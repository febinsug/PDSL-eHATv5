import React from 'react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { Clock, ChevronUp, ChevronDown, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { TimesheetBreakdown } from '../shared/TimesheetBreakdown';
import { calculateTotalHours, isTimesheetInMonth } from '../../utils/timesheet';
import type { TimesheetWithProject } from '../../types';

interface SubmissionHistoryProps {
  timesheets: TimesheetWithProject[];
  selectedMonth: Date;
  expandedTimesheets: string[];
  onToggleTimesheet: (id: string) => void;
  onEditTimesheet: (timesheet: TimesheetWithProject) => void;
  onMonthChange: (date: Date) => void;
}

export const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({
  timesheets,
  selectedMonth,
  expandedTimesheets,
  onToggleTimesheet,
  onEditTimesheet,
  onMonthChange,
}) => {
  // Filter timesheets to only show those that belong to the selected month
  const filteredTimesheets = timesheets.filter(timesheet => isTimesheetInMonth(timesheet, selectedMonth));

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTimesheets.map(timesheet => (
              <React.Fragment key={timesheet.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Week {timesheet.week_number}, {timesheet.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {timesheet.project.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {calculateTotalHours(timesheet)} hours
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      timesheet.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : timesheet.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {timesheet.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                      {timesheet.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {timesheet.status === 'pending' && <Clock className="w-3 h-3" />}
                      {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {timesheet.rejection_reason && (
                      <div className="text-sm text-red-600">
                        {timesheet.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onToggleTimesheet(timesheet.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedTimesheets.includes(timesheet.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {timesheet.status !== 'approved' && (
                        <button
                          onClick={() => onEditTimesheet(timesheet)}
                          className="text-[#1732ca] hover:text-[#1732ca]/80 text-sm font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-6">
                    <TimesheetBreakdown
                      timesheet={timesheet}
                      expanded={expandedTimesheets.includes(timesheet.id)}
                    />
                  </td>
                </tr>
              </React.Fragment>
            ))}
            {filteredTimesheets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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