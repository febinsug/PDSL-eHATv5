import React, { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, format, addDays, subWeeks, addWeeks, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Project, Timesheet } from '../types';
import { ChevronLeft, ChevronRight, Loader2, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { SubmissionForm } from '../components/hourSubmission/SubmissionForm';
import { SubmissionHistory } from '../components/hourSubmission/SubmissionHistory';

interface TimesheetWithProject extends Timesheet {
  project: Project;
}

interface ApprovedWeekDialog {
  show: boolean;
  weekNumber: number;
  year: number;
}

const ApprovedWeekWarning: React.FC<{
  show: boolean;
  weekNumber: number;
  year: number;
  onClose: () => void;
}> = ({ show, weekNumber, year, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Week Already Approved</h3>
            <p className="text-gray-600">
              Hours for Week {weekNumber}, {year} have already been submitted and approved. 
              No changes can be made to approved timesheets.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const HourSubmission = () => {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [projects, setProjects] = useState<Project[]>([]);
  const [hours, setHours] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submittedTimesheets, setSubmittedTimesheets] = useState<TimesheetWithProject[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<{ weekNumber: number; year: number; startDate: Date }[]>([]);
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetWithProject | null>(null);
  const [approvedWeekDialog, setApprovedWeekDialog] = useState<ApprovedWeekDialog>({
    show: false,
    weekNumber: 0,
    year: 0
  });
  const [expandedTimesheets, setExpandedTimesheets] = useState<string[]>([]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekNumber = parseInt(format(weekStart, 'w'));
  const year = parseInt(format(weekStart, 'yyyy'));

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const toggleTimesheet = (timesheetId: string) => {
    setExpandedTimesheets(prev => 
      prev.includes(timesheetId)
        ? prev.filter(id => id !== timesheetId)
        : [...prev, timesheetId]
    );
  };

  useEffect(() => {
    const weeks = [];
    const currentDate = new Date();
    const startDate = subWeeks(currentDate, 12);
    
    for (let i = 0; i < 17; i++) {
      const date = addWeeks(startDate, i);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      weeks.push({
        weekNumber: parseInt(format(weekStart, 'w')),
        year: parseInt(format(weekStart, 'yyyy')),
        startDate: weekStart,
      });
    }
    setAvailableWeeks(weeks);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch user's projects
        const { data: projectUsers } = await supabase
          .from('project_users')
          .select('project_id')
          .eq('user_id', user.id);

        if (projectUsers) {
          const projectIds = projectUsers.map(pu => pu.project_id);
          const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .in('id', projectIds)
            .eq('is_active', true);

          setProjects(projects || []);
        }

        // Fetch existing timesheets for the selected week
        const { data: timesheets } = await supabase
          .from('timesheets')
          .select('*')
          .eq('user_id', user.id)
          .eq('week_number', weekNumber)
          .eq('year', year);

        // Map timesheet data to hours state
        const hoursMap: Record<string, Record<string, number>> = {};
        timesheets?.forEach(timesheet => {
          if (timesheet.status !== 'approved') {
            hoursMap[timesheet.project_id] = {
              monday_hours: timesheet.monday_hours,
              tuesday_hours: timesheet.tuesday_hours,
              wednesday_hours: timesheet.wednesday_hours,
              thursday_hours: timesheet.thursday_hours,
              friday_hours: timesheet.friday_hours,
            };
          }
        });
        setHours(hoursMap);

        // Fetch submitted timesheets for the selected month
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);

        const { data: submittedData } = await supabase
          .from('timesheets')
          .select(`
            *,
            project:projects(*)
          `)
          .eq('user_id', user.id)
          .eq('year', format(selectedMonth, 'yyyy'))
          .order('week_number', { ascending: false });

        setSubmittedTimesheets(submittedData as TimesheetWithProject[] || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, weekNumber, year, selectedMonth]);

  const handleHourChange = (projectId: string, day: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 24) return;

    setHours(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [`${day}_hours`]: numValue,
      },
    }));
  };

  const validateHours = () => {
    const hasHours = Object.values(hours).some(projectHours => 
      Object.values(projectHours).some(value => value > 0)
    );

    if (!hasHours) {
      setError('Please enter hours before submitting.');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    setError('');
    if (!validateHours()) return;

    // Check for approved timesheets before showing confirmation
    const checkApprovedTimesheets = async () => {
      try {
        // Get all projects with hours entered
        const projectsWithHours = Object.entries(hours)
          .filter(([_, projectHours]) => Object.values(projectHours).some(value => value > 0))
          .map(([projectId]) => projectId);

        if (projectsWithHours.length === 0) return;

        // Check if any of these projects have approved timesheets for this week
        const { data: approvedTimesheets } = await supabase
          .from('timesheets')
          .select('project_id')
          .eq('user_id', user?.id)
          .eq('week_number', weekNumber)
          .eq('year', year)
          .eq('status', 'approved')
          .in('project_id', projectsWithHours);

        if (approvedTimesheets && approvedTimesheets.length > 0) {
          setApprovedWeekDialog({
            show: true,
            weekNumber,
            year
          });
          return;
        }

        // If no approved timesheets found, show the confirmation dialog
        setShowConfirmation(true);
      } catch (error) {
        console.error('Error checking approved timesheets:', error);
        setError('Failed to check timesheet status');
      }
    };

    checkApprovedTimesheets();
  };

  const confirmSubmit = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      // Prepare timesheet data
      const timesheetData = Object.entries(hours)
        .filter(([_, projectHours]) => Object.values(projectHours).some(value => value > 0))
        .map(([projectId, projectHours]) => ({
          user_id: user.id,
          project_id: projectId,
          week_number: weekNumber,
          year: year,
          ...projectHours,
          status: 'pending',
          submitted_at: new Date().toISOString(),
          rejection_reason: null,
        }));

      if (timesheetData.length === 0) {
        throw new Error('No hours to submit');
      }

      // Delete existing timesheets for this week
      const { error: deleteError } = await supabase
        .from('timesheets')
        .delete()
        .eq('user_id', user.id)
        .eq('week_number', weekNumber)
        .eq('year', year);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error('Failed to update existing timesheets');
      }

      // Insert new timesheets
      const { error: insertError } = await supabase
        .from('timesheets')
        .insert(timesheetData);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to submit timesheets');
      }

      // Refresh submitted timesheets
      const { data: submittedData } = await supabase
        .from('timesheets')
        .select(`
          *,
          project:projects(*)
        `)
        .eq('user_id', user.id)
        .eq('year', format(selectedMonth, 'yyyy'))
        .order('week_number', { ascending: false });

      setSubmittedTimesheets(submittedData as TimesheetWithProject[] || []);
      setSuccess(true);
      setShowConfirmation(false);
      setHours({});
      setEditingTimesheet(null);
    } catch (error) {
      console.error('Error saving timesheets:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit hours');
    } finally {
      setSaving(false);
    }
  };

  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [selectedYear, selectedWeek] = e.target.value.split('-').map(Number);
    const selectedWeekData = availableWeeks.find(
      w => w.year === selectedYear && w.weekNumber === selectedWeek
    );
    if (selectedWeekData) {
      setSelectedDate(selectedWeekData.startDate);
      setApprovedWeekDialog({ show: false, weekNumber: 0, year: 0 });
    }
  };

  const handleEditTimesheet = (timesheet: TimesheetWithProject) => {
    if (timesheet.status === 'approved') {
      setError('Approved timesheets cannot be edited');
      return;
    }

    // Set the week and year to match the timesheet being edited
    const selectedWeekData = availableWeeks.find(
      w => w.weekNumber === timesheet.week_number && w.year === timesheet.year
    );
    if (selectedWeekData) {
      setSelectedDate(selectedWeekData.startDate);
    }

    // Load the timesheet data into the form
    setHours({
      [timesheet.project_id]: {
        monday_hours: timesheet.monday_hours,
        tuesday_hours: timesheet.tuesday_hours,
        wednesday_hours: timesheet.wednesday_hours,
        thursday_hours: timesheet.thursday_hours,
        friday_hours: timesheet.friday_hours,
      },
    });
    setEditingTimesheet(timesheet);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Hour Submission</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedDate(prev => addDays(prev, -7))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative">
            <select
              value={`${year}-${weekNumber}`}
              onChange={handleWeekChange}
              className="appearance-none bg-white pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1732ca] focus:border-[#1732ca] transition-shadow"
            >
              {availableWeeks.map(week => (
                <option 
                  key={`${week.year}-${week.weekNumber}`} 
                  value={`${week.year}-${week.weekNumber}`}
                >
                  Week {week.weekNumber} ({format(week.startDate, 'MMM d')} - {format(addDays(week.startDate, 4), 'MMM d, yyyy')})
                </option>
              ))}
            </select>
            <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={() => setSelectedDate(prev => addDays(prev, 7))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <p>Hours submitted successfully!</p>
        </div>
      )}

      {editingTimesheet && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <p>Editing timesheet for Week {editingTimesheet.week_number}, {editingTimesheet.year}</p>
          </div>
          <button
            onClick={() => {
              setEditingTimesheet(null);
              setHours({});
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            Cancel Edit
          </button>
        </div>
      )}

      <SubmissionForm
        projects={projects}
        hours={hours}
        weekDays={weekDays}
        handleHourChange={handleHourChange}
      />

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90 
            focus:outline-none focus:ring-2 focus:ring-[#1732ca] focus:ring-offset-2 
            disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Submitting...' : editingTimesheet ? 'Update Hours' : 'Submit Hours'}
        </button>
      </div>

      <SubmissionHistory
        timesheets={submittedTimesheets}
        selectedMonth={selectedMonth}
        expandedTimesheets={expandedTimesheets}
        onToggleTimesheet={toggleTimesheet}
        onEditTimesheet={handleEditTimesheet}
        onMonthChange={setSelectedMonth}
      />

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Submit Hours</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit your hours for Week {weekNumber}? This will overwrite any existing submissions for this week.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={saving}
                className="px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ApprovedWeekWarning
        show={approvedWeekDialog.show}
        weekNumber={approvedWeekDialog.weekNumber}
        year={approvedWeekDialog.year}
        onClose={() => {
          setApprovedWeekDialog({ show: false, weekNumber: 0, year: 0 });
          // Clear hours for approved projects
          const updatedHours = { ...hours };
          Object.keys(updatedHours).forEach(projectId => {
            if (submittedTimesheets.some(ts => 
              ts.project_id === projectId && 
              ts.week_number === weekNumber && 
              ts.year === year && 
              ts.status === 'approved'
            )) {
              delete updatedHours[projectId];
            }
          });
          setHours(updatedHours);
        }}
      />
    </div>
  );
};