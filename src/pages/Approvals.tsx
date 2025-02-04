import React, { useState, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { 
  CheckCircle, XCircle, AlertTriangle, Loader2, AlertCircle, 
  ChevronLeft, ChevronRight, Download, Filter, SortAsc, SortDesc 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { User, Project, Timesheet } from '../types';

interface TimesheetWithDetails extends Timesheet {
  user: User;
  project: Project;
  approver?: User;
}

interface FilterOptions {
  users: string[];
  projects: string[];
  status: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

interface RejectionDialog {
  show: boolean;
  timesheetId: string;
  reason: string;
}

interface FilterDialogProps {
  show: boolean;
  onClose: () => void;
  filterOptions: FilterOptions;
  setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptions>>;
  users: User[];
  projects: Project[];
}

const FilterDialog: React.FC<FilterDialogProps> = ({
  show,
  onClose,
  filterOptions,
  setFilterOptions,
  users,
  projects,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Filter Timesheets</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Users</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {users.map(user => (
                <label key={user.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterOptions.users.includes(user.id)}
                    onChange={e => {
                      setFilterOptions(prev => ({
                        ...prev,
                        users: e.target.checked
                          ? [...prev.users, user.id]
                          : prev.users.filter(id => id !== user.id)
                      }));
                    }}
                    className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                  />
                  <span>{user.full_name || user.username}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Projects</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {projects.map(project => (
                <label key={project.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterOptions.projects.includes(project.id)}
                    onChange={e => {
                      setFilterOptions(prev => ({
                        ...prev,
                        projects: e.target.checked
                          ? [...prev.projects, project.id]
                          : prev.projects.filter(id => id !== project.id)
                      }));
                    }}
                    className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                  />
                  <span>{project.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setFilterOptions({
                users: [],
                projects: [],
                status: [],
                dateRange: {
                  start: '',
                  end: ''
                }
              });
              onClose();
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export const Approvals = () => {
  const { user } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [managerTimesheets, setManagerTimesheets] = useState<TimesheetWithDetails[]>([]);
  const [approvedTimesheets, setApprovedTimesheets] = useState<TimesheetWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<{ timesheetId: string; message: string; }[]>([]);
  const [rejectionDialog, setRejectionDialog] = useState<RejectionDialog>({
    show: false,
    timesheetId: '',
    reason: ''
  });
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    users: [],
    projects: [],
    status: [],
    dateRange: {
      start: '',
      end: ''
    }
  });
  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'submitted_at',
    direction: 'desc'
  });
  const [selectedTimesheets, setSelectedTimesheets] = useState<string[]>([]);

  const calculateTotalHours = (timesheet: Timesheet) => {
    return (
      timesheet.monday_hours +
      timesheet.tuesday_hours +
      timesheet.wednesday_hours +
      timesheet.thursday_hours +
      timesheet.friday_hours
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);

        // Fetch users and projects for filtering
        const [usersResponse, projectsResponse] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('projects').select('*')
        ]);

        setUsers(usersResponse.data || []);
        setProjects(projectsResponse.data || []);

        let query = supabase
          .from('timesheets')
          .select(`
            *,
            user:users!timesheets_user_id_fkey(id, username, full_name, role),
            project:projects!inner(id, name),
            approver:users!timesheets_approved_by_fkey(id, username, full_name, role)
          `)
          .gte('submitted_at', monthStart.toISOString())
          .lte('submitted_at', monthEnd.toISOString());

        if (user.role === 'manager') {
          const { data: teamMembers } = await supabase
            .from('users')
            .select('id')
            .eq('manager_id', user.id);

          if (teamMembers) {
            query = query.in('user_id', teamMembers.map(member => member.id));
          }
        }

        const { data: timesheets } = await query;

        if (timesheets) {
          const pending = timesheets.filter(t => t.status === 'pending');
          const approved = timesheets.filter(t => t.status === 'approved');
          
          setManagerTimesheets(pending as TimesheetWithDetails[]);
          setApprovedTimesheets(approved as TimesheetWithDetails[]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrors([{ timesheetId: 'fetch', message: 'Failed to load data' }]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedMonth]);

  const handleApproval = async (timesheetId: string, approved: boolean) => {
    if (!user) return;

    if (!approved) {
      setRejectionDialog({
        show: true,
        timesheetId,
        reason: ''
      });
      return;
    }

    setProcessing(prev => ({ ...prev, [timesheetId]: true }));
    setErrors(prev => prev.filter(e => e.timesheetId !== timesheetId));

    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', timesheetId);

      if (error) throw error;

      // Update local state
      const approvedTimesheet = managerTimesheets.find(t => t.id === timesheetId);
      if (approvedTimesheet) {
        setManagerTimesheets(prev => prev.filter(t => t.id !== timesheetId));
        setApprovedTimesheets(prev => [{
          ...approvedTimesheet,
          status: 'approved',
          approver: user,
          approved_at: new Date().toISOString()
        } as TimesheetWithDetails, ...prev]);
      }
    } catch (error) {
      console.error('Error approving timesheet:', error);
      setErrors(prev => [...prev, {
        timesheetId,
        message: 'Failed to approve timesheet'
      }]);
    } finally {
      setProcessing(prev => ({ ...prev, [timesheetId]: false }));
    }
  };

  const handleReject = async () => {
    if (!user || !rejectionDialog.timesheetId) return;

    setProcessing(prev => ({ ...prev, [rejectionDialog.timesheetId]: true }));
    setErrors(prev => prev.filter(e => e.timesheetId !== rejectionDialog.timesheetId));

    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'rejected',
          rejection_reason: rejectionDialog.reason,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', rejectionDialog.timesheetId);

      if (error) throw error;

      setManagerTimesheets(prev => prev.filter(t => t.id !== rejectionDialog.timesheetId));
      setRejectionDialog({ show: false, timesheetId: '', reason: '' });
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      setErrors(prev => [...prev, {
        timesheetId: rejectionDialog.timesheetId,
        message: 'Failed to reject timesheet'
      }]);
    } finally {
      setProcessing(prev => ({ ...prev, [rejectionDialog.timesheetId]: false }));
    }
  };

  const handleSort = (field: string) => {
    setSortOption(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filterTimesheets = (timesheets: TimesheetWithDetails[]) => {
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

  const sortTimesheets = (timesheets: TimesheetWithDetails[]) => {
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
          valueA = a[sortOption.field as keyof TimesheetWithDetails];
          valueB = b[sortOption.field as keyof TimesheetWithDetails];
      }

      if (valueA < valueB) return sortOption.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOption.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const downloadSelectedTimesheets = () => {
    const timesheetsToDownload = approvedTimesheets.filter(t => selectedTimesheets.includes(t.id));
    if (timesheetsToDownload.length === 0) return;

    const csvData = [
      ['Employee', 'Project', 'Week', 'Year', 'Total Hours', 'Status', 'Approved By', 'Approved Date'],
      ...timesheetsToDownload.map(t => [
        t.user.full_name || t.user.username,
        t.project.name,
        t.week_number,
        t.year,
        calculateTotalHours(t),
        t.status,
        t.approver ? (t.approver.full_name || t.approver.username) : '',
        t.approved_at ? format(parseISO(t.approved_at), 'yyyy-MM-dd') : ''
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets-${format(selectedMonth, 'yyyy-MM')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
      </div>
    );
  }

  const filteredApprovedTimesheets = filterTimesheets(approvedTimesheets);
  const sortedApprovedTimesheets = sortTimesheets(filteredApprovedTimesheets);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Timesheet Approvals</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-medium">
            {format(selectedMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={selectedMonth >= new Date()}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {errors.find(e => e.timesheetId === 'fetch') && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{errors.find(e => e.timesheetId === 'fetch')?.message}</p>
        </div>
      )}

      <div className="space-y-6">
        {managerTimesheets.length > 0 && (
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
                {managerTimesheets.map(timesheet => (
                  <tr key={timesheet.id} className="hover:bg-gray-50">
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
                          onClick={() => handleApproval(timesheet.id, true)}
                          disabled={processing[timesheet.id]}
                          className="text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleApproval(timesheet.id, false)}
                          disabled={processing[timesheet.id]}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Approved Timesheets</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilterDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button
                onClick={downloadSelectedTimesheets}
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
                      checked={selectedTimesheets.length === sortedApprovedTimesheets.length}
                      onChange={e => {
                        setSelectedTimesheets(
                          e.target.checked
                            ? sortedApprovedTimesheets.map(t => t.id)
                            : []
                        );
                      }}
                      className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                    />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('user.full_name')}
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
                    onClick={() => handleSort('project.name')}
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
                    onClick={() => handleSort('week_number')}
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
                    onClick={() => handleSort('total_hours')}
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedApprovedTimesheets.map(timesheet => (
                  <tr key={timesheet.id} className="hover:bg-gray-50">
                    <td className="w-8 px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTimesheets.includes(timesheet.id)}
                        onChange={() => {
                          setSelectedTimesheets(prev =>
                            prev.includes(timesheet.id)
                              ? prev.filter(id => id !== timesheet.id)
                              : [...prev, timesheet.id]
                          );
                        }}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FilterDialog
        show={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        filterOptions={filterOptions}
        setFilterOptions={setFilterOptions}
        users={users}
        projects={projects}
      />

      {rejectionDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Reject Timesheet</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for rejection:</p>
            <textarea
              value={rejectionDialog.reason}
              onChange={e => setRejectionDialog(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 mb-4 focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              rows={3}
              required
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectionDialog({ show: false, timesheetId: '', reason: '' })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionDialog.reason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};