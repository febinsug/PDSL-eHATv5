import React from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, CheckCircle, XCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { TimesheetBreakdown } from '../shared/TimesheetBreakdown';
import { calculateTotalHours } from '../../utils/timesheet';
import type { TimesheetWithDetails } from '../../types';

interface PendingApprovalsProps {
  timesheets: TimesheetWithDetails[];
  processing: Record<string, boolean>;
  expandedTimesheets: string[];
  onToggleTimesheet: (id: string) => void;
  onApprove: (id: string, approved: boolean) => void;
}

export const PendingApprovals: React.FC<PendingApprovalsProps> = ({
  timesheets,
  processing,
  expandedTimesheets,
  onToggleTimesheet,
  onApprove,
}) => {
  if (timesheets.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Employee
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Week
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hours
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {timesheets.map(timesheet => (
            <React.Fragment key={timesheet.id}>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {timesheet.user.full_name || timesheet.user.username}
                  </div>
                  <div className="text-sm text-gray-500">{timesheet.user.role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{timesheet.project.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    Week {timesheet.week_number}, {timesheet.year}
                  </div>
                  <div className="text-xs text-gray-500">
                    Submitted {format(parseISO(timesheet.submitted_at), 'MMM d, yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {calculateTotalHours(timesheet)} hours
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="w-3 h-3" />
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                    <button
                      onClick={() => onApprove(timesheet.id, true)}
                      disabled={processing[timesheet.id]}
                      className="text-green-600 hover:text-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onApprove(timesheet.id, false)}
                      disabled={processing[timesheet.id]}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
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
        </tbody>
      </table>
    </div>
  );
};