import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, ChevronUp, ChevronDown, CheckCircle, XCircle, Check, X, ChevronRight } from 'lucide-react';
import { TimesheetBreakdown } from '../shared/TimesheetBreakdown';
import { calculateTotalHours, getHoursForMonth } from '../../utils/timesheet';
import type { TimesheetWithDetails } from '../../types';

interface GroupedTimesheet {
  userId: string;
  userName: string;
  designation: string;
  weekNumber: number;
  year: number;
  timesheets: TimesheetWithDetails[];
  totalHours: number;
  managerName: string;
}

interface PendingApprovalsProps {
  timesheets: TimesheetWithDetails[];
  processing: Record<string, boolean>;
  expandedGroups: string[];
  expandedTimesheets: string[];
  onToggleGroup: (groupId: string) => void;
  onToggleTimesheet: (id: string) => void;
  onApprove: (id: string, approved: boolean) => void;
  selectedMonth: Date;
}

export const PendingApprovals: React.FC<PendingApprovalsProps> = ({
  timesheets,
  processing,
  expandedGroups,
  expandedTimesheets,
  onToggleGroup,
  onToggleTimesheet,
  onApprove,
  selectedMonth,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const groupedTimesheets = useMemo(() => {
    const groups = new Map<string, GroupedTimesheet>();
    
    timesheets.forEach(timesheet => {
      const groupKey = `${timesheet.user_id}-${timesheet.week_number}-${timesheet.year}`;
      
      if (!groups.has(groupKey)) {
        const managerName = timesheet.user.role === 'manager' 
          ? 'Admin'
          : timesheet.user.manager?.full_name || timesheet.user.manager?.username || '-';

        groups.set(groupKey, {
          userId: timesheet.user_id,
          userName: timesheet.user.full_name || timesheet.user.username,
          designation: timesheet.user.designation || '-',
          weekNumber: timesheet.week_number,
          year: timesheet.year,
          timesheets: [],
          totalHours: 0,
          managerName
        });
      }
      
      const group = groups.get(groupKey)!;
      group.timesheets.push(timesheet);
      group.totalHours += getHoursForMonth(timesheet, selectedMonth);
    });
    
    return Array.from(groups.values());
  }, [timesheets, selectedMonth]);

  const handleApproveAll = () => {
    setShowConfirmDialog(true);
  };

  const confirmApproveAll = () => {
    timesheets.forEach(timesheet => {
      onApprove(timesheet.id, true);
    });
    setShowConfirmDialog(false);
  };

  if (timesheets.length === 0) return null;

  const handleGroupApproval = (group: GroupedTimesheet, approved: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    group.timesheets.forEach(timesheet => {
      onApprove(timesheet.id, approved);
    });
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
        {/* <button
          onClick={handleApproveAll}
          className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
        >
          <Check className="w-4 h-4" />
          Approve All
        </button> */}
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Approval</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve all {timesheets.length} pending timesheets?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproveAll}
                className="px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
              >
                Approve All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projects</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {groupedTimesheets.map(group => {
              const groupKey = `${group.userId}-${group.weekNumber}-${group.year}`;
              const isExpanded = expandedGroups.includes(groupKey);
              const isOvertime = group.totalHours > 40;

              return (
                <React.Fragment key={groupKey}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{group.userName}</div>
                      <div className="text-sm text-gray-500">{group.designation}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{group.managerName}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">Week {group.weekNumber}, {group.year}</div>
                      <div className="text-xs text-gray-500">
                        Submitted {group.timesheets[0]?.submitted_at ? format(parseISO(group.timesheets[0].submitted_at), 'MMM d, yyyy') : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${isOvertime ? 'text-red-600' : 'text-gray-900'}`}>
                        {group.totalHours} hours
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{group.timesheets.length} projects</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* {!processing[group.userId] && (
                          <>
                            <button
                              onClick={(e) => handleGroupApproval(group, true, e)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => handleGroupApproval(group, false, e)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        )} */}
                        <button
                          onClick={() => onToggleGroup(groupKey)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && group.timesheets.map(timesheet => (
                    <tr key={timesheet.id} className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="ml-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-900">
                              {timesheet.project.name}
                              <span className="ml-2 text-gray-500">{getHoursForMonth(timesheet, selectedMonth)} hours</span>
                            </div>
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
                          </div>
                          {expandedTimesheets.includes(timesheet.id) && (
                            <TimesheetBreakdown
                              timesheet={timesheet}
                              expanded={true}
                              selectedMonth={selectedMonth}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};