import React, { useState, useEffect, useMemo } from 'react';
import { startOfWeek, endOfWeek, format, addDays, subWeeks, addWeeks, parseISO, startOfMonth, endOfMonth, subMonths, addMonths, isSameWeek, isSameMonth, isWithinInterval, startOfDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Project, Timesheet } from '../types';
import { ChevronLeft, ChevronRight, Loader2, Calendar, Clock, AlertCircle, CheckCircle, X, ChevronUp, ChevronDown } from 'lucide-react';
import { SubmissionForm } from '../components/hourSubmission/SubmissionForm';
import { SubmissionHistory } from '../components/hourSubmission/SubmissionHistory';
import toast from 'react-hot-toast';
import { TimesheetBreakdown } from "../components/shared/TimesheetBreakdown";
import { calculateTotalHours } from "../utils/timesheet";
import type { TimesheetWithDetails } from '../../types';

interface TimesheetWithProject extends Timesheet {
  project: Project;
}

interface ApprovedWeekDialog {
  show: boolean;
  weekNumber: number;
  year: number;
}

interface GroupedTimesheet {
  userId: string;
  userName: string;
  designation: string;
  weekNumber: number;
  year: number;
  timesheets: TimesheetWithDetails[];
  totalHours: number;
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

const generateCalendarDays = (date: Date) => {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days = [];
  let currentDay = start;

  while (currentDay <= end) {
    days.push(currentDay);
    currentDay = addDays(currentDay, 1);
  }

  return days;
};

export const HourSubmission = () => {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 });
  });
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
  const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timesheetStatus, setTimesheetStatus] = useState<'draft' | 'submitted' | 'approved' | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  useEffect(() => {
    const currentDate = new Date();
    const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    
    // Get weeks for 6 months back and 6 months ahead
    const startDate = subMonths(currentWeekStart, 6);
    const endDate = addMonths(currentWeekStart, 6);
    
    const weeks = [];
    let currentWeek = startDate;
    
    while (currentWeek <= endDate) {
      weeks.push({
        weekNumber: parseInt(format(currentWeek, 'w')),
        year: parseInt(format(currentWeek, 'yyyy')),
        startDate: currentWeek,
      });
      currentWeek = addWeeks(currentWeek, 1);
    }
    
    setAvailableWeeks(weeks);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
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
            .eq('status', 'active');

          setProjects(projects || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchTimesheetData = async () => {
      if (!user) return;

      try {
        // Fetch existing timesheets for the selected week
        const { data: timesheets } = await supabase
          .from('timesheets')
          .select('*')
          .eq('user_id', user.id)
          .eq('week_number', weekNumber)
          .eq('year', year);

        if (timesheets && timesheets.length > 0) {
          const hoursData: Record<string, Record<string, number>> = {};
          timesheets.forEach(timesheet => {
            hoursData[timesheet.project_id] = {
              monday_hours: timesheet.monday_hours || 0,
              tuesday_hours: timesheet.tuesday_hours || 0,
              wednesday_hours: timesheet.wednesday_hours || 0,
              thursday_hours: timesheet.thursday_hours || 0,
              friday_hours: timesheet.friday_hours || 0,
            };
          });
          setHours(hoursData);
          setTimesheetStatus(timesheets[0].status);
        } else {
          setHours({});
          setTimesheetStatus(null);
        }

        // Fetch submitted timesheets for the month view
        const { data: submittedData } = await supabase
          .from('timesheets')
          .select('*, project:projects(*)')
          .eq('user_id', user.id)
          .eq('year', format(selectedMonth, 'yyyy'))
          .order('week_number', { ascending: false });

        setSubmittedTimesheets(submittedData as TimesheetWithProject[] || []);
      } catch (error) {
        console.error('Error fetching timesheet:', error);
        setError('Failed to load timesheet data');
      }
    };

    fetchTimesheetData();
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

  const handleSubmit = async () => {
    if (!user) return;
    
    setError('');
    setSuccess(false);
    
    try {
      if (!validateHours()) return;

      // Show confirmation dialog first
      setShowConfirmation(true);

    } catch (error) {
      console.error('Error:', error);
      setError('Failed to submit timesheet');
    }
  };

  const confirmSubmit = async () => {
    try {
      // Get all projects with hours entered
      const projectsWithHours = Object.entries(hours)
        .filter(([_, projectHours]) => Object.values(projectHours).some(value => value > 0))
        .map(([projectId]) => projectId);

      // Submit timesheets
      for (const [projectId, projectHours] of Object.entries(hours)) {
        if (Object.values(projectHours).some(value => value > 0)) {
          await supabase.from('timesheets').upsert({
            user_id: user.id,
            project_id: projectId,
            week_number: weekNumber,
            year: year,
            ...projectHours,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          });
        }
      }

      setShowConfirmation(false);
      toast.success('Hours submitted successfully!');
      setHours({});
      setEditingTimesheet(null);

    } catch (error) {
      console.error('Error submitting timesheet:', error);
      setError('Failed to submit timesheet');
    }
  };

  const getWeekDays = (startDate: Date) => {
    const days = [];
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Start from Monday
    
    for (let i = 0; i < 5; i++) { // Only get Monday to Friday
      days.push(addDays(weekStart, i));
    }
    
    return days;
  };

  const handleWeekSelect = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekNumber = parseInt(format(weekStart, 'w'));
    const year = parseInt(format(weekStart, 'yyyy'));
    
    setSelectedDate(weekStart);
    setIsWeekPickerOpen(false);
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
        monday_hours: timesheet.monday_hours || 0,
        tuesday_hours: timesheet.tuesday_hours || 0,
        wednesday_hours: timesheet.wednesday_hours || 0,
        thursday_hours: timesheet.thursday_hours || 0,
        friday_hours: timesheet.friday_hours || 0,
      },
    });
    setEditingTimesheet(timesheet);
    toast.success('Now editing timesheet');
  };

  const processTimesheets = (timesheets: any[]) => {
    const groups = new Map();
    
    timesheets.forEach(timesheet => {
      // Add null checks to prevent undefined errors
      if (!timesheet?.user) return;
      
      const key = `${timesheet.user.id}-${timesheet.week_number}-${timesheet.year}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          userId: timesheet.user.id,
          userName: timesheet.user.full_name || timesheet.user.username || 'Unknown User',
          designation: timesheet.user.designation || '-',
          weekNumber: timesheet.week_number,
          year: timesheet.year,
          totalHours: 0,
          timesheets: []
        });
      }
      
      const group = groups.get(key);
      group.totalHours += calculateTotalHours(timesheet);
      group.timesheets.push(timesheet);
    });
    
    return Array.from(groups.values());
  };

  const groupedTimesheets = useMemo(() => {
    return processTimesheets(submittedTimesheets);
  }, [submittedTimesheets]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Submit Hours</h1>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newDate = subWeeks(selectedDate, 1);
                handleWeekSelect(newDate);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={() => setIsWeekPickerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">
                Week {weekNumber}, {year}
                <span className="text-gray-500 ml-2">
                  ({format(selectedDate, 'MMM d')} - {format(addDays(selectedDate, 4), 'MMM d')})
                </span>
              </span>
            </button>
            
            <button
              onClick={() => {
                const newDate = addWeeks(selectedDate, 1);
                handleWeekSelect(newDate);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {timesheetStatus === 'approved' && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600">
              This timesheet has been approved. You cannot make changes to approved timesheets.
            </p>
          </div>
        )}

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

        <SubmissionForm
          projects={projects}
          hours={hours}
          weekDays={weekDays}
          handleHourChange={handleHourChange}
          isReadOnly={timesheetStatus === 'approved'}
        />

        {editingTimesheet && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
            <p className="text-blue-600">
              Editing timesheet for Week {editingTimesheet.week_number}, {editingTimesheet.year}
            </p>
            <button
              onClick={() => setEditingTimesheet(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSubmit}
            disabled={timesheetStatus === 'approved'}
            className="px-6 py-2.5 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90 disabled:opacity-50 font-medium"
          >
            Submit Hours
          </button>
        </div>

        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Your Submissions</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium">
                    {format(selectedMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              <SubmissionHistory
                timesheets={submittedTimesheets}
                expandedTimesheets={expandedTimesheets}
                toggleTimesheet={toggleTimesheet}
                onEdit={handleEditTimesheet}
                selectedMonth={selectedMonth}
                showHeader={false}
              />
            </div>
          </div>
        </div>
      </div>

      {isWeekPickerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Week</h3>
              <button
                onClick={() => setIsWeekPickerOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <span className="text-lg font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
              
              {generateCalendarDays(currentMonth).map(day => {
                const isSelected = isSameWeek(selectedDate, day, { weekStartsOn: 1 });
                const isCurrentMonth = isSameMonth(currentMonth, day);
                
                return (
                  <button
                    key={day.toString()}
                    onClick={() => handleWeekSelect(day)}
                    className={`
                      py-2 rounded-lg text-sm
                      ${isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}
                      ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
