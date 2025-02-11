import React from 'react';
import { format, parseISO } from 'date-fns';
import { Download, Filter, SortAsc, SortDesc, ChevronUp, ChevronDown } from 'lucide-react';
import { TimesheetBreakdown } from '../shared/TimesheetBreakdown';
import { calculateTotalHours } from '../../utils/timesheet';
import type { TimesheetWithDetails } from '../../types';

interface ApprovedTimesheetsProps {
  timesheets: TimesheetWithDetails[];
  selectedTimesheets: string[];
  expandedTimesheets: string[];
  sortOption: { field: string; direction: 'asc' | 'desc' };
  onToggleTimesheet: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onSort: (field: string) => void;
  onShowFilter: () => void;
  onDownload: () => void;
}

export const ApprovedTimesheets: React.FC<ApprovedTimesheetsProps> = ({
  timesheets,
  selectedTimesheets,
  expandedTimesheets,
  sortOption,
  onToggleTimesheet,
  onToggleSelect,
  onSelectAll,
  onSort,
  onShowFilter,
  onDownload,
}) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Approved Timesheets</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onShowFilter}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button
            onClick={onDownload}
            disabled={selectedTimesheets.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download Selected
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedTimesheets.length === timesheets.length && timesheets.length > 0}
                  onChange={e => onSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('user.full_name')}
              >
                <div className="flex items-center gap-2">
                  Employee
                  {sortOption.field === 'user.full_name' && (
                    sortOption.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('project.name')}
              >
                <div className="flex items-center gap-2">
                  Project
                  {sortOption.field === 'project.name' && (
                    sortOption.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('week_number')}
              >
                <div className="flex items-center gap-2">
                  Week
                  {sortOption.field === 'week_number' && (
                    sortOption.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('total_hours')}
              >
                <div className="flex items-center gap-2">
                  Hours
                  {sortOption.field === 'total_hours' && (
                    sortOption.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Approved By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Approved Date
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
                  <td className="w-8 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTimesheets.includes(timesheet.id)}
                      onChange={() => onToggleSelect(timesheet.id)}
                      className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                    />
                  </td>
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
                    <div className="text-sm text-gray-900">
                      {timesheet.approver ? (timesheet.approver.full_name || timesheet.approver.username) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {timesheet.approved_at ? format(parseISO(timesheet.approved_at), 'MMM d, yyyy') : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
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
                  </td>
                </tr>
                {expandedTimesheets.includes(timesheet.id) && (
                  <tr>
                    <td colSpan={8} className="px-6 py-2 bg-gray-50">
                      <TimesheetBreakdown
                        timesheet={timesheet}
                        expanded={true}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {timesheets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No approved timesheets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};