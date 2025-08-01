import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, getYear } from 'date-fns';
import { Clock, Briefcase, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { StatsCard } from '../components/overview/StatsCard';
import { WeeklyChart } from '../components/overview/WeeklyChart';
import { ProjectUtilization } from '../components/overview/ProjectUtilization';
import { UserHoursList } from '../components/overview/UserHoursList';
import { ProjectDistribution } from '../components/overview/ProjectDistribution';
import { ProjectUtilizationDetails } from '../components/overview/ProjectUtilizationModal';
import { UserHoursModal } from '../components/overview/UserHoursModal';
import type { Project, User, UserHours, ProjectUtilizationDetails as ProjectUtilizationDetailsType, ProjectWithUtilization, TimesheetWithDetails } from '../types';
import { isTimesheetInMonth, getHoursForMonth } from '../utils/timesheet';

const COLORS = {
  blue1: '#1732ca',  // Brand blue (unchanged)
  blue2: '#3a5be0',  // Slightly lighter royal blue
  blue3: '#7ab5ff',  // Sky blue (more distinct from blue2)

  // Teals and greens (adjusted for better distinction)
  teal1: '#00aece',  // Deeper cerulean 
  teal2: '#25d8b8',  // Brighter teal green
  teal3: '#59e6a3',  // Lighter mint

  // Warm colors (more distinction between terra1/terra3)
  terra1: '#ff5252',  // Brighter coral red
  terra2: '#ff9500',  // More saturated amber
  terra3: '#b92d2d',  // Deeper dark red

  // Cool colors (increased distinction)
  purple1: '#6200ea',  // More saturated royal purple
  purple2: '#d81b9c',  // Brighter magenta
  purple3: '#4a0696',  // Deeper violet

  // Neutral accents (slightly adjusted for better contrast)
  slate1: '#252838',  // Darker slate
  slate2: '#5d6b8a',  // Slightly bluer medium slate
  slate3: '#95a5c2'   // Slightly bluer light slate
};

const PROJECT_COLORS = [
  COLORS.blue1,     // Brand blue
  COLORS.teal1,     // Deep teal
  COLORS.terra1,    // Terracotta
  COLORS.purple1,   // Rich purple
  COLORS.blue2,     // Medium blue
  COLORS.teal2,     // Medium teal
  COLORS.terra2,    // Peach
  COLORS.purple2,   // Lavender
  COLORS.blue3,     // Light blue
  COLORS.teal3,     // Slate blue
  COLORS.terra3,    // Sand
  COLORS.purple3,   // Light purple
  COLORS.slate1,    // Dark slate
  COLORS.slate2,    // Medium slate
  COLORS.slate3     // Light slate
];

const fetchProjectDetails = async (project: Project, currentSelectedMonth: Date): Promise<ProjectUtilizationDetailsType | null> => {
  try {
    const [usersResponse, timesheetsResponse] = await Promise.all([
      supabase
        .from('project_users')
        .select(`
          user:users(
            id,
            username,
            full_name,
            designation
          )
        `)
        .eq('project_id', project.id),
      supabase
        .from('timesheets')
        .select('*')
        .eq('project_id', project.id)
        .lte('year', getYear(currentSelectedMonth))
        .in('status', ['pending', 'submitted', 'approved'])
    ]);

    if (usersResponse.error || timesheetsResponse.error) {
      console.error('Error fetching users or timesheets:', usersResponse.error || timesheetsResponse.error);
      return null;
    }

    const users = usersResponse.data?.map((pu: any) => ({
      id: pu.user.id,
      name: pu.user.full_name || pu.user.username,
      designation: pu.user.designation,
      hours: 0,
      monthlyHours: 0
    })) || [];

    const timesheets = timesheetsResponse.data || [];

    // Calculate both cumulative and monthly hours for each user
    timesheets.forEach(timesheet => {
      const user = users.find(u => u.id === timesheet.user_id);
      if (!user) return;

      if (timesheet.status !== 'rejected') {
        const selectedYear = getYear(currentSelectedMonth);
        const selectedMonth = currentSelectedMonth.getMonth();
        // Cumulative hours: sum all month_hours up to and including the selected month
        if (timesheet.month_hours) {
          Object.entries(timesheet.month_hours).forEach(([key, monthEntry]) => {
            const entry = monthEntry as any; // or as MonthEntry if imported
            // key is 'YYYY-MM'
            const [yearStr, monthStr] = key.split('-');
            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10) - 1; // JS months are 0-based
            if (
              year < selectedYear ||
              (year === selectedYear && month <= selectedMonth)
            ) {
              user.hours +=
                (entry.monday_hours || 0) +
                (entry.tuesday_hours || 0) +
                (entry.wednesday_hours || 0) +
                (entry.thursday_hours || 0) +
                (entry.friday_hours || 0);
            }
          });
        }
        // Calculate current month hours using month_hours
        const monthKey = format(currentSelectedMonth, 'yyyy-MM');
        const monthHours = timesheet.month_hours?.[monthKey];
        if (monthHours) {
          user.monthlyHours += (
            monthHours.monday_hours +
            monthHours.tuesday_hours +
            monthHours.wednesday_hours +
            monthHours.thursday_hours +
            monthHours.friday_hours
          );
        }
      }
    });

    // Calculate total hours used cumulatively (up to and including the selected month)
    let totalHoursUsed = 0;
    timesheets.forEach(timesheet => {
      if (timesheet.status !== 'rejected' && timesheet.month_hours) {
        const selectedYear = getYear(currentSelectedMonth);
        const selectedMonth = currentSelectedMonth.getMonth();
        Object.entries(timesheet.month_hours).forEach(([key, monthEntry]) => {
          const entry = monthEntry as any; // or as MonthEntry if imported
          const [yearStr, monthStr] = key.split('-');
          const year = parseInt(yearStr, 10);
          const month = parseInt(monthStr, 10) - 1;
          if (
            year < selectedYear ||
            (year === selectedYear && month <= selectedMonth)
          ) {
            totalHoursUsed +=
              (entry.monday_hours || 0) +
              (entry.tuesday_hours || 0) +
              (entry.wednesday_hours || 0) +
              (entry.thursday_hours || 0) +
              (entry.friday_hours || 0);
          }
        });
      }
    });

    return {
      project: {
        ...project,
        totalHours: totalHoursUsed,
        utilization: project.allocated_hours ? (totalHoursUsed / project.allocated_hours) * 100 : 0
      },
      users: users,
      timesheets: timesheets,
      totalHoursUsed,
      hoursRemaining: project.allocated_hours ? project.allocated_hours - totalHoursUsed : 0
    };
  } catch (error) {
    console.error('Error fetching project details:', error);
    return null;
  }
};

const fetchUserDetailedHours = async (userId: string, targetMonth: Date): Promise<UserHours | null> => {
  try {
    const year = getYear(targetMonth);

    const { data: timesheetsData, error: timesheetsError } = await supabase
      .from('timesheets')
      .select(`
        *,
        user:users!timesheets_user_id_fkey(
          id,
          username,
          full_name,
          role,
          designation
        ),
        project:projects!inner(
          id,
          name,
          allocated_hours,
          client:clients(name),
          status,
          completed_at
        )
      `)
      .eq('user_id', userId)
      .eq('year', year);

    if (timesheetsError) {
      console.error('Error fetching user timesheets:', timesheetsError);
      return null;
    }

    const userMonthTimesheets = (timesheetsData || []).filter(timesheet => {
      if (timesheet.status === 'rejected') return false;
      return isTimesheetInMonth(timesheet, targetMonth);
    }) as TimesheetWithDetails[];

    if (userMonthTimesheets.length === 0) {
      // Return an empty UserHours object if no data for the month
      const { data: userData, error: userError } = await supabase.from('users').select('id, username, full_name, designation').eq('id', userId).single();
      if (userError) {
        console.error('Error fetching user data for empty timesheets:', userError);
        return null;
      }
      const emptyUserHours: UserHours = {
        user: userData as User,
        totalHours: 0,
        projectHours: [],
        weeklyHours: [],
        timesheets: [],
      };
      return emptyUserHours;
    }

    const user = userMonthTimesheets[0].user; // Assuming all timesheets belong to the same user
    let totalHours = 0;
    const projectHoursMap = new Map<string, { project: Project; hours: number }>();
    const weeklyHoursMap = new Map<number, { weekNumber: number; hours: number }>();

    userMonthTimesheets.forEach(timesheet => {
      const hoursThisMonth = getHoursForMonth(timesheet, targetMonth);
      totalHours += hoursThisMonth;

      // Project breakdown
      if (!projectHoursMap.has(timesheet.project.id)) {
        projectHoursMap.set(timesheet.project.id, { project: timesheet.project, hours: 0 });
      }
      projectHoursMap.get(timesheet.project.id)!.hours += hoursThisMonth;

      // Weekly breakdown
      if (!weeklyHoursMap.has(timesheet.week_number)) {
        weeklyHoursMap.set(timesheet.week_number, { weekNumber: timesheet.week_number, hours: 0 });
      }
      weeklyHoursMap.get(timesheet.week_number)!.hours += hoursThisMonth;
    });

    return {
      user: user,
      totalHours: totalHours,
      projectHours: Array.from(projectHoursMap.values()),
      weeklyHours: Array.from(weeklyHoursMap.values()).sort((a, b) => a.weekNumber - b.weekNumber),
      timesheets: userMonthTimesheets // Pass raw timesheets for detailed breakdown
    };

  } catch (error) {
    console.error('Error fetching detailed user hours:', error);
    return null;
  }
};

export const Overview = () => {
  const { user } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalHours: 0,
    activeProjects: 0,
    pendingSubmissions: 0,
    approvedSubmissions: 0,
  });
  const [projects, setProjects] = useState<ProjectWithUtilization[]>([]);
  const [projectHours, setProjectHours] = useState<{ name: string; hours: number; color: string; }[]>([]);
  const [userHours, setUserHours] = useState<UserHours[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectUtilizationDetailsType | null>(null);
  const [selectedUserHours, setSelectedUserHours] = useState<UserHours | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'team' | 'organization'>('team');
  const [modalMonth, setModalMonth] = useState<Date | null>(null);
  const [modalProject, setModalProject] = useState<Project | null>(null);
  const [userModalMonth, setUserModalMonth] = useState<Date | null>(null);
  const [userModalUserId, setUserModalUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      setError('');

      try {
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        const year = getYear(selectedMonth);

        // First get team members if viewing team data
        let teamMemberIds: string[] = [];
        if (user.role === 'manager' && viewType === 'team') {
          const { data: teamMembers } = await supabase
            .from('users')
            .select('id')
            .eq('manager_id', user.id);
          
          teamMemberIds = [...(teamMembers?.map(member => member.id) || []), user.id];
        }

        let query = supabase
          .from('timesheets')
          .select(`
            *,
            user:users!timesheets_user_id_fkey(
              id, 
              username, 
              full_name, 
              role,
              designation
            ),
            project:projects!inner(
              id, 
              name, 
              allocated_hours, 
              client:clients(name),
              status,
              completed_at
            )
          `)
          .eq('year', year);

        if (user.role === 'user') {
          query = query.eq('user_id', user.id);
        } else if (user.role === 'manager' && viewType === 'team') {
          query = query.in('user_id', teamMemberIds);
        }

        const { data: timesheetsData, error: timesheetsError } = await query;

        if (timesheetsError) throw timesheetsError;

        // Filter timesheets for the selected month (needed for stats, weekly, user hours)
        const monthTimesheets = (timesheetsData || []).filter(timesheet => {
          if (timesheet.status === 'rejected') return false;
          return isTimesheetInMonth(timesheet, selectedMonth);
        }) as TimesheetWithDetails[];

        // Filter timesheets for cumulative project utilization (up to end of selected month)
        const cumulativeTimesheets = (timesheetsData || []).filter(timesheet => {
          if (timesheet.status === 'rejected') return false;
          // The original code had a bug here, it was using startOfWeek(new Date(timesheet.year, 0, 1 + (timesheet.week_number - 1) * 7), { weekStartsOn: 1 })
          // This was incorrect as it was trying to calculate week start from a year and week number, not a date.
          // It should be based on the selected month's start date.
          const weekStartForCheck = startOfMonth(selectedMonth); // This line was corrected
          // Ensure the week starts on or before the end of the selected month
          return weekStartForCheck <= monthEnd; 
        }) as TimesheetWithDetails[];

        // --- MONTHLY CALCULATIONS ---
        // Calculate stats based on the selected month's hours
        const totalHoursForMonth = monthTimesheets.reduce((sum, ts) => sum + getHoursForMonth(ts, selectedMonth), 0);
        const monthlyActiveProjectsSet = new Set<string>();
        monthTimesheets.forEach(ts => monthlyActiveProjectsSet.add(ts.project_id));
        const pendingTimesheets = monthTimesheets.filter(ts => {
            const monthStatus = ts.month_hours?.[format(selectedMonth, 'yyyy-MM')]?.status;
           // console.log(`Timesheet ${ts.id}: main_status=${ts.status}, month_hours=${JSON.stringify(ts.month_hours)}, monthStatus_for_selected_month=${monthStatus}`);
            return monthStatus === 'pending' || monthStatus === 'submitted';
        });
        const approvedTimesheets = monthTimesheets.filter(ts => {
            const monthStatus = ts.month_hours?.[format(selectedMonth, 'yyyy-MM')]?.status;
            return monthStatus === 'approved';
        });
        setStats({
          totalHours: totalHoursForMonth,
          activeProjects: monthlyActiveProjectsSet.size, // Show projects active *this month*
          pendingSubmissions: pendingTimesheets.length,
          approvedSubmissions: approvedTimesheets.length
        });

        // Calculate MONTHLY weekly data 
        const weeklyChartData = user.role === 'user'
          ? monthTimesheets
              .reduce((acc: any[], timesheet) => {
                const hoursThisMonth = getHoursForMonth(timesheet, selectedMonth);
                if (hoursThisMonth <= 0) return acc;
                
                const weekKey = `Week ${timesheet.week_number}`;
                const weekIndex = acc.findIndex(w => w.week === weekKey);

                if (weekIndex === -1) {
                  acc.push({
                    week: weekKey,
                    weekNum: timesheet.week_number,
                    hours: hoursThisMonth
                  });
                } else {
                  acc[weekIndex].hours += hoursThisMonth;
                }
                return acc;
              }, [])
              .sort((a, b) => a.weekNum - b.weekNum)
              .map(({ week, hours }) => ({ week, hours }))
          : monthTimesheets
              .reduce((acc: any[], timesheet) => {
                // ts is TimesheetWithDetails, ts.project exists
                const hoursThisMonth = getHoursForMonth(timesheet, selectedMonth);
                if (hoursThisMonth <= 0 || !timesheet.project) return acc;
                
                const weekKey = `Week ${timesheet.week_number}`;
                const weekIndex = acc.findIndex(w => w.week === weekKey);

                if (weekIndex === -1) {
                  const weekData: any = {
                    week: weekKey,
                    weekNum: timesheet.week_number,
                  };
                  monthlyActiveProjectsSet.forEach(p => {
                    // Use project name as key
                    if (timesheet.project.id === p) {
                      weekData[timesheet.project.name] = hoursThisMonth;
                    } else {
                      weekData[timesheet.project.name] = 0;
                    }
                  });
                  acc.push(weekData);
                } else {
                  acc[weekIndex][timesheet.project.name] = (acc[weekIndex][timesheet.project.name] || 0) + hoursThisMonth;
                }
                return acc;
              }, [])
              .sort((a, b) => a.weekNum - b.weekNum)
              .map(({ week, weekNum, ...rest }) => ({ week, ...rest }));

        

        setWeeklyData(weeklyChartData);

        // Calculate MONTHLY user hours 
        if (user.role !== 'user') {
          const userHoursMap = new Map<string, UserHours>();
          monthTimesheets.forEach(timesheet => {
            // ts is TimesheetWithDetails, ts.user and ts.project exist
            if (!timesheet.user || !timesheet.project) return;
            
            const hoursThisMonth = getHoursForMonth(timesheet, selectedMonth);
            if (hoursThisMonth <= 0) return;

            const userId = timesheet.user.id;
            if (!userHoursMap.has(userId)) {
              userHoursMap.set(userId, {
                user: timesheet.user, // Use the user object from TimesheetWithDetails
                totalHours: 0,
                projectHours: [],
                weeklyHours: [],
                timesheets: [], // Initialize timesheets for UserHours
              });
            }
            const userData = userHoursMap.get(userId)!;
            userData.totalHours += hoursThisMonth;

            // Project breakdown
            const projectIndex = userData.projectHours.findIndex(ph => ph.project.id === timesheet.project_id);
            if (projectIndex === -1) {
              userData.projectHours.push({ project: timesheet.project, hours: hoursThisMonth });
            } else {
              userData.projectHours[projectIndex].hours += hoursThisMonth;
            }
            
            // Weekly breakdown
            const weekIndex = userData.weeklyHours.findIndex(wh => wh.weekNumber === timesheet.week_number);
            if (weekIndex === -1) {
              userData.weeklyHours.push({ weekNumber: timesheet.week_number, hours: hoursThisMonth });
            } else {
              userData.weeklyHours[weekIndex].hours += hoursThisMonth;
            }
            userData.timesheets.push(timesheet); // Add timesheet to user's timesheets
          });
          
          const sortedUserHours = Array.from(userHoursMap.values()).sort((a, b) => b.totalHours - a.totalHours);
          setUserHours(sortedUserHours);
        } else {
          setUserHours([]);
        }
        // --- END MONTHLY CALCULATIONS ---

        // --- CUMULATIVE PROJECT CALCULATIONS (For Utilization List & Pie Chart) ---
        const cumulativeProjectMap = new Map<string, ProjectWithUtilization>();
        cumulativeTimesheets.forEach(ts => {
          const project = ts.project;
          if (!project) return;
          // Ensure status and completed_at are present
          const status = project.status || ts.project.status;
          const completed_at = project.completed_at || ts.project.completed_at;
          // Use cumulative total_hours here
          const hoursToAdd = ts.total_hours || 0; 
          if (hoursToAdd <= 0) return; 

          if (!cumulativeProjectMap.has(project.id)) {
            cumulativeProjectMap.set(project.id, {
              ...project,
              status,
              completed_at,
              totalHours: 0, // Initialize cumulative total hours
              utilization: 0,
              color: COLORS.blue1 
            });
          }
          const projData = cumulativeProjectMap.get(project.id)!;
          projData.totalHours += hoursToAdd; // Sum cumulative hours
        });

        const cumulativeActiveProjects: ProjectWithUtilization[] = Array.from(cumulativeProjectMap.values())
          .map((project, index) => ({
            ...project,
            // Calculate utilization based on cumulative totalHours
            utilization: project.allocated_hours ? (project.totalHours / project.allocated_hours) * 100 : 0, 
            color: PROJECT_COLORS[index % PROJECT_COLORS.length]
          }))
          .filter(p => p.totalHours > 0);

        // Filter out completed projects for Project Utilization
        const filteredProjects = cumulativeActiveProjects.filter(project => {
          if (project.status !== 'completed') return true;
          if (!project.completed_at) return true;
          // Only show if completed_at is in or after the selected month
          const completedDate = new Date(project.completed_at);
          const monthStart = startOfMonth(selectedMonth);
          return completedDate >= monthStart;
        });
        setProjects(filteredProjects); // State for utilization list

        // Calculate project hours for PIE CHART based on selected month (not cumulative)
        const monthlyProjectMap = new Map<string, { name: string; hours: number; color: string }>();
        monthTimesheets.forEach(ts => {
          if (!ts.project) return;
          // Filter out completed projects for the pie chart
          const status = ts.project && 'status' in ts.project ? ts.project.status : undefined;
          const completed_at = ts.project && 'completed_at' in ts.project ? ts.project.completed_at : undefined;
          if (status === 'completed' && completed_at) {
            const completedDate = new Date(completed_at);
            const monthStart = startOfMonth(selectedMonth);
            if (completedDate < monthStart) return;
          }
          const hours = getHoursForMonth(ts, selectedMonth);
          if (hours <= 0) return;
          if (!monthlyProjectMap.has(ts.project.id)) {
            monthlyProjectMap.set(ts.project.id, {
              name: ts.project.name,
              hours: 0,
              color: PROJECT_COLORS[monthlyProjectMap.size % PROJECT_COLORS.length]
            });
          }
          monthlyProjectMap.get(ts.project.id)!.hours += hours;
        });
        const monthlyProjectHoursChartData = Array.from(monthlyProjectMap.values());
        setProjectHours(monthlyProjectHoursChartData);
        // --- END CUMULATIVE PROJECT CALCULATIONS ---

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedMonth, viewType]);

  const handleProjectClick = async (project: Project) => {
    try {
      setModalProject(project);
      setModalMonth(selectedMonth); // initialize modal month to current overview month
      const details = await fetchProjectDetails(project, selectedMonth);
      setSelectedProject(details);
    } catch (error) {
      setError('Failed to load project details');
    }
  };

  // When modalMonth or modalProject changes, refetch project details
  useEffect(() => {
    const fetchDetails = async () => {
      if (modalProject && modalMonth) {
        const details = await fetchProjectDetails(modalProject, modalMonth);
        setSelectedProject(details);
      }
    };
    fetchDetails();
  }, [modalMonth, modalProject]);

  const handleUserClick = async (uh: UserHours) => {
    setUserModalUserId(uh.user.id);
    setUserModalMonth(selectedMonth);
    const detailedUserHours = await fetchUserDetailedHours(uh.user.id, selectedMonth);
    setSelectedUserHours(detailedUserHours);
  };

  // When userModalMonth or userModalUserId changes, update selectedUserHours
  useEffect(() => {
    const fetchDetailedUserHours = async () => {
      if (userModalUserId && userModalMonth) {
        const detailedUserHours = await fetchUserDetailedHours(userModalUserId, userModalMonth);
        setSelectedUserHours(detailedUserHours);
      }
    };
    fetchDetailedUserHours();
  }, [userModalMonth, userModalUserId]); // userHours is no longer a dependency here

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
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
          {user?.role === 'manager' && (
            <div className="flex items-center">
              <span className="text-gray-500 mr-2 text-base">for</span>
              <div className="relative inline-block">
                <select
                  value={viewType}
                  onChange={(e) => setViewType(e.target.value as 'team' | 'organization')}
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-1.5 text-base text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:bg-gray-50"
                >
                  <option value="team">My Team</option>
                  <option value="organization">PDSL</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-900">
            {format(selectedMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Clock}
          iconColor="text-[#1732ca]"
          iconBgColor="bg-blue-100"
          label="Total Hours"
          value={stats.totalHours}
        />
        <StatsCard
          icon={Briefcase}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          label="Active Projects"
          value={stats.activeProjects}
        />
        <StatsCard
          icon={AlertCircle}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100"
          label="Pending Submissions"
          value={stats.pendingSubmissions}
        />
        <StatsCard
          icon={CheckCircle}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          label="Approved Submissions"
          value={stats.approvedSubmissions}
        />
      </div>

      {weeklyData.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">No timesheet data found for {format(selectedMonth, 'MMMM yyyy')}</p>
        </div>
      ) : user?.role === 'user' ? (
        <div className="space-y-6">
          <WeeklyChart
            data={weeklyData}
            isUserView={true}
            colors={[COLORS.blue1]}
            selectedMonth={selectedMonth}
          />
          <ProjectDistribution data={projectHours} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <WeeklyChart
              data={weeklyData}
              projects={projects}
              colors={PROJECT_COLORS}
              selectedMonth={selectedMonth}
            />
            <ProjectDistribution data={projectHours} />
          </div>
          <div className="space-y-6">
            <ProjectUtilization
              projects={projects}
              onProjectClick={handleProjectClick}
            />
            <UserHoursList
              userHours={userHours}
              onUserClick={handleUserClick}
            />
          </div>
        </div>
      )}

      {selectedProject && modalMonth && (
        <ProjectUtilizationDetails
          details={selectedProject}
          selectedMonth={modalMonth}
          onMonthChange={setModalMonth}
          onClose={() => {
            setSelectedProject(null);
            setModalProject(null);
            setModalMonth(null);
          }}
        />
      )}

      {selectedUserHours && userModalMonth && (
        <UserHoursModal
          userHours={selectedUserHours}
          selectedMonth={userModalMonth}
          onMonthChange={setUserModalMonth}
          onClose={() => {
            setSelectedUserHours(null);
            setUserModalUserId(null);
            setUserModalMonth(null);
          }}
        />
      )}
    </div>
  );
};