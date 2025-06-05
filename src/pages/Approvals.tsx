import React, { useState, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { FilterDialog } from '../components/approvals/FilterDialog';
import { PendingApprovals } from '../components/approvals/PendingApprovals';
import { ApprovedTimesheets } from '../components/approvals/ApprovedTimesheets';
import { filterTimesheets, sortTimesheets, isTimesheetInMonth } from '../utils/timesheet';
import type { User, Project, TimesheetWithDetails } from '../types';

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

interface ConfirmationDialog {
  show: boolean;
  title: string;
  message: string;
  action: () => Promise<void>;
}

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
  const [confirmation, setConfirmation] = useState<ConfirmationDialog>({
    show: false,
    title: '',
    message: '',
    action: async () => {},
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
    field: 'week_number',
    direction: 'desc'
  });
  const [selectedTimesheets, setSelectedTimesheets] = useState<string[]>([]);
  const [expandedTimesheets, setExpandedTimesheets] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [user, selectedMonth]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch users and projects for filtering
      const [usersResponse, projectsResponse] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('projects').select('*')
      ]);

      setUsers(usersResponse.data || []);
      setProjects(projectsResponse.data || []);

      // Store all users in a map for quick lookup
      const usersMap = new Map(usersResponse.data?.map(u => [u.id, u]) || []);

      let query = supabase
        .from('timesheets')
        .select(`
          *,
          user:users!timesheets_user_id_fkey(
            id, 
            username, 
            full_name, 
            role,
            designation,
            manager_id
          ),
          project:projects!inner(id, name),
          approver:users!timesheets_approved_by_fkey(
            id, 
            username, 
            full_name, 
            role,
            designation
          )
        `);

      if (user.role === 'manager') {
        const { data: teamMembers } = await supabase
          .from('users')
          .select('id')
          .eq('manager_id', user.id);

        if (teamMembers) {
          query = query.in('user_id', teamMembers.map(member => member.id));
        }
      }

      const { data: timesheets, error } = await query;

      if (error) throw error;

      if (timesheets) {
        // Attach manager details to each timesheet
        const enrichedTimesheets = timesheets.map(timesheet => ({
          ...timesheet,
          user: {
            ...timesheet.user,
            manager: usersMap.get(timesheet.user.manager_id)
          }
        }));

        // Filter timesheets based on the week they belong to
        const monthTimesheets = enrichedTimesheets.filter(timesheet => 
          isTimesheetInMonth(timesheet, selectedMonth)
        );

        const pending = monthTimesheets.filter(t => t.status === 'pending');
        const approved = monthTimesheets.filter(t => t.status === 'approved');
        
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

      const approvedTimesheet = managerTimesheets.find(t => t.id === timesheetId);
      if (approvedTimesheet && isTimesheetInMonth(approvedTimesheet, selectedMonth)) {
        setManagerTimesheets(prev => prev.filter(t => t.id !== timesheetId));
        setApprovedTimesheets(prev => [{
          ...approvedTimesheet,
          status: 'approved',
          approver: user,
          approved_at: new Date().toISOString()
        } as TimesheetWithDetails, ...prev]);
      } else {
        // If the timesheet doesn't belong in the current month view,
        // just remove it from pending
        setManagerTimesheets(prev => prev.filter(t => t.id !== timesheetId));
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

  const handleRevertStatus = (timesheet: TimesheetWithDetails) => {
    setConfirmation({
      show: true,
      title: 'Revert Timesheet Status',
      message: `Are you sure you want to change the status of this timesheet back to pending? This will remove the approval and require the timesheet to be approved again.`,
      action: async () => {
        try {
          const { error } = await supabase
            .from('timesheets')
            .update({
              status: 'pending',
              approved_by: null,
              approved_at: null,
              rejection_reason: null
            })
            .eq('id', timesheet.id);

          if (error) throw error;

          if (isTimesheetInMonth(timesheet, selectedMonth)) {
            setApprovedTimesheets(prev => prev.filter(t => t.id !== timesheet.id));
            setManagerTimesheets(prev => [...prev, {
              ...timesheet,
              status: 'pending',
              approver: null,
              approved_at: null,
              rejection_reason: null
            }]);
          } else {
            // If the timesheet doesn't belong in the current month view,
            // just remove it from approved
            setApprovedTimesheets(prev => prev.filter(t => t.id !== timesheet.id));
          }
        } catch (error) {
          console.error('Error reverting timesheet status:', error);
          setErrors(prev => [...prev, {
            timesheetId: timesheet.id,
            message: 'Failed to revert timesheet status'
          }]);
        }
      },
    });
  };

  const handleSort = (field: string) => {
    setSortOption(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
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
        t.total_hours,
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

  const toggleTimesheet = (timesheetId: string) => {
    setExpandedTimesheets(prev => 
      prev.includes(timesheetId)
        ? prev.filter(id => id !== timesheetId)
        : [...prev, timesheetId]
    );
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
      </div>
    );
  }

  const filteredApprovedTimesheets = filterTimesheets(approvedTimesheets, filterOptions);
  const sortedApprovedTimesheets = sortTimesheets(filteredApprovedTimesheets, sortOption);

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
        <PendingApprovals
          timesheets={managerTimesheets}
          processing={processing}
          expandedGroups={expandedGroups}
          expandedTimesheets={expandedTimesheets}
          onToggleGroup={toggleGroup}
          onToggleTimesheet={toggleTimesheet}
          onApprove={handleApproval}
          selectedMonth={selectedMonth}
        />

        <ApprovedTimesheets
          timesheets={sortedApprovedTimesheets}
          selectedTimesheets={selectedTimesheets}
          expandedTimesheets={expandedTimesheets}
          sortOption={sortOption}
          onToggleTimesheet={toggleTimesheet}
          onToggleSelect={(id) => {
            setSelectedTimesheets(prev =>
              prev.includes(id)
                ? prev.filter(tid => tid !== id)
                : [...prev, id]
            );
          }}
          onSelectAll={(selected) => {
            setSelectedTimesheets(
              selected
                ? sortedApprovedTimesheets.map(t => t.id)
                : []
            );
          }}
          onSort={handleSort}
          onShowFilter={() => setShowFilterDialog(true)}
          onDownload={downloadSelectedTimesheets}
          onRevertStatus={handleRevertStatus}
        />
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

      {confirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">{confirmation.title}</h3>
            <p className="text-gray-600 mb-6">{confirmation.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmation(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await confirmation.action();
                  setConfirmation(prev => ({ ...prev, show: false }));
                }}
                className="px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};