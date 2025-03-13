import React, { useState, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths, startOfWeek, endOfWeek, addDays, getWeek, getYear, isSameMonth, isWithinInterval } from 'date-fns';
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
import type { Project, UserHours, ProjectUtilizationDetails as ProjectUtilizationDetailsType } from '../types';

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

const fetchProjectDetails = async (project: Project, currentSelectedMonth: Date) => {
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
    ]);

    const users = usersResponse.data?.map(pu => ({
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

      const weekStart = startOfWeek(new Date(timesheet.year, 0, 1 + (timesheet.week_number - 1) * 7), { weekStartsOn: 1 });
      
      // Calculate cumulative hours
      if (timesheet.year < getYear(currentSelectedMonth) || 
          (timesheet.year === getYear(currentSelectedMonth) && weekStart <= endOfMonth(currentSelectedMonth))) {
        user.hours += timesheet.total_hours || 0;
      }

      // Calculate current month hours
      if (timesheet.year === getYear(currentSelectedMonth) && 
          isSameMonth(weekStart, currentSelectedMonth)) {
        user.monthlyHours += timesheet.total_hours || 0;
      }
    });

    // Calculate total hours used cumulatively
    const totalHoursUsed = timesheets
      .filter(timesheet => {
        const weekStart = startOfWeek(new Date(timesheet.year, 0, 1 + (timesheet.week_number - 1) * 7), { weekStartsOn: 1 });
        return weekStart <= endOfMonth(currentSelectedMonth);
      })
      .reduce((sum, ts) => sum + (ts.total_hours || 0), 0);

    return {
      project: {
        ...project,
        totalHours: totalHoursUsed,
        utilization: (totalHoursUsed / project.allocated_hours) * 100
      },
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        hours: user.hours,
        monthlyHours: user.monthlyHours,
        designation: user.designation
      })),
      timesheets,
      totalHoursUsed,
      hoursRemaining: project.allocated_hours - totalHoursUsed
    };
  } catch (error) {
    console.error('Error fetching project details:', error);
    throw new Error('Failed to load project details');
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectHours, setProjectHours] = useState<{ name: string; hours: number; color: string; }[]>([]);
  const [userHours, setUserHours] = useState<UserHours[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectUtilizationDetailsType | null>(null);
  const [selectedUserHours, setSelectedUserHours] = useState<UserHours | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'team' | 'organization'>('team');

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
          
          teamMemberIds = teamMembers?.map(member => member.id) || [];
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
              client:clients(name)
            )
          `)
          .eq('year', year);

        // Apply filters based on role and view type
        if (user.role === 'user') {
          query = query.eq('user_id', user.id);
        } else if (user.role === 'manager' && viewType === 'team') {
          query = query.in('user_id', teamMemberIds);
        }

        const { data: timesheetsData, error: timesheetsError } = await query;

        if (timesheetsError) throw timesheetsError;

        // Filter timesheets for the selected month
        const monthTimesheets = (timesheetsData || []).filter(timesheet => {
          const weekStart = startOfWeek(new Date(timesheet.year, 0, 1 + (timesheet.week_number - 1) * 7), { weekStartsOn: 1 });
          let daysInSelectedMonth = 0;
          for (let i = 0; i < 7; i++) {
            const currentDay = addDays(weekStart, i);
            if (isSameMonth(currentDay, selectedMonth)) {
              daysInSelectedMonth++;
            }
          }
          return daysInSelectedMonth >= 4;
        });

        if (monthTimesheets.length === 0) {
          setStats({
            totalHours: 0,
            activeProjects: 0,
            pendingSubmissions: 0,
            approvedSubmissions: 0,
          });
          setProjects([]);
          setProjectHours([]);
          setWeeklyData([]);
          setLoading(false);
          return;
        }

        // Calculate project statistics
        const projectMap = new Map<string, Project & { totalHours: number; color: string }>();

        // First get all timesheets for active projects (not filtered by month)
        const { data: allTimesheets } = await supabase
          .from('timesheets')
          .select(`
            *,
            project:projects!inner(
              id, 
              name, 
              allocated_hours, 
              client:clients(name)
            )
          `)
          .lte('year', getYear(selectedMonth));

        // Initialize projects with zero hours
        monthTimesheets.forEach(timesheet => {
          if (!projectMap.has(timesheet.project.id)) {
            projectMap.set(timesheet.project.id, {
              ...timesheet.project,
              totalHours: 0,
              color: PROJECT_COLORS[projectMap.size % PROJECT_COLORS.length],
            });
          }
        });

        // Calculate cumulative hours for each project
        allTimesheets?.forEach(timesheet => {
          if (projectMap.has(timesheet.project.id)) {
            const weekStart = startOfWeek(new Date(timesheet.year, 0, 1 + (timesheet.week_number - 1) * 7), { weekStartsOn: 1 });
            if (weekStart <= endOfMonth(selectedMonth)) {
              const project = projectMap.get(timesheet.project.id)!;
              project.totalHours += timesheet.total_hours || 0;
            }
          }
        });

        const activeProjects = Array.from(projectMap.values())
          .map(project => ({
            ...project,
            utilization: (project.totalHours / project.allocated_hours) * 100,
          }))
          .filter(p => p.totalHours > 0);

        setProjects(activeProjects);

        // Calculate project hours for charts
        const projectHoursData = activeProjects.map(project => {
          // For regular users, only calculate their own hours
          const monthlyHours = monthTimesheets
            .filter(t => {
              const weekStart = startOfWeek(new Date(t.year, 0, 1 + (t.week_number - 1) * 7), { weekStartsOn: 1 });
              return isSameMonth(weekStart, selectedMonth);
            })
            .filter(t => user.role === 'user' ? t.user_id === user.id : true)
            .filter(t => t.project.id === project.id)
            .reduce((sum, t) => sum + (t.total_hours || 0), 0);

          return {
            name: project.name,
            hours: monthlyHours,
            color: project.color,
          };
        }).filter(p => p.hours > 0); // Only include projects with hours > 0

        setProjectHours(projectHoursData);

        // Calculate statistics
        const totalHours = monthTimesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0);
        const pendingCount = monthTimesheets.filter(t => t.status === 'pending').length;
        const approvedCount = monthTimesheets.filter(t => t.status === 'approved').length;

        setStats({
          totalHours,
          activeProjects: activeProjects.length,
          pendingSubmissions: pendingCount,
          approvedSubmissions: approvedCount,
        });

        // Calculate weekly data
        const weeklyChartData = user.role === 'user'
          ? monthTimesheets
              .reduce((acc: any[], timesheet) => {
                const weekIndex = acc.findIndex(w => w.week === `Week ${timesheet.week_number}`);
                if (weekIndex === -1) {
                  acc.push({
                    week: `Week ${timesheet.week_number}`,
                    weekNum: timesheet.week_number,
                    hours: timesheet.total_hours || 0,
                  });
                } else {
                  acc[weekIndex].hours += timesheet.total_hours || 0;
                }
                return acc;
              }, [])
              .sort((a, b) => a.weekNum - b.weekNum)
              .map(({ week, hours }) => ({ week, hours }))
          : monthTimesheets
              .reduce((acc: any[], timesheet) => {
                const weekIndex = acc.findIndex(w => w.week === `Week ${timesheet.week_number}`);
                if (weekIndex === -1) {
                  const weekData: any = {
                    week: `Week ${timesheet.week_number}`,
                    weekNum: timesheet.week_number,
                  };
                  activeProjects.forEach(p => {
                    weekData[p.name] = timesheet.project.id === p.id ? (timesheet.total_hours || 0) : 0;
                  });
                  acc.push(weekData);
                } else {
                  acc[weekIndex][timesheet.project.name] = (acc[weekIndex][timesheet.project.name] || 0) + (timesheet.total_hours || 0);
                }
                return acc;
              }, [])
              .sort((a, b) => a.weekNum - b.weekNum)
              .map(({ week, weekNum, ...rest }) => ({ week, ...rest }));

        setWeeklyData(weeklyChartData);

        // Calculate user hours (only for managers/admins)
        if (user.role !== 'user') {
          const userHoursMap = new Map<string, UserHours>();
          monthTimesheets.forEach(timesheet => {
            const userId = timesheet.user.id;
            if (!userHoursMap.has(userId)) {
              userHoursMap.set(userId, {
                user: timesheet.user,
                totalHours: 0,
                projectHours: [],
                weeklyHours: []
              });
            }

            const userHourData = userHoursMap.get(userId)!;
            const hours = timesheet.total_hours || 0;

            userHourData.totalHours += hours;

            const projectIndex = userHourData.projectHours.findIndex(ph => ph.project.id === timesheet.project.id);
            if (projectIndex === -1) {
              userHourData.projectHours.push({
                project: timesheet.project,
                hours
              });
            } else {
              userHourData.projectHours[projectIndex].hours += hours;
            }

            const weekIndex = userHourData.weeklyHours.findIndex(wh => wh.weekNumber === timesheet.week_number);
            if (weekIndex === -1) {
              userHourData.weeklyHours.push({
                weekNumber: timesheet.week_number,
                hours
              });
            } else {
              userHourData.weeklyHours[weekIndex].hours += hours;
            }
          });

          userHoursMap.forEach(userData => {
            userData.projectHours.sort((a, b) => b.hours - a.hours);
            userData.weeklyHours.sort((a, b) => a.weekNumber - b.weekNumber);
          });

          setUserHours(Array.from(userHoursMap.values()));
        } else {
          setUserHours([]);
        }

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
      const details = await fetchProjectDetails(project, selectedMonth);
      setSelectedProject(details);
    } catch (error) {
      setError('Failed to load project details');
    }
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
              onUserClick={setSelectedUserHours}
            />
          </div>
        </div>
      )}

      {selectedProject && (
        <ProjectUtilizationDetails
          details={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {selectedUserHours && (
        <UserHoursModal
          userHours={selectedUserHours}
          onClose={() => setSelectedUserHours(null)}
        />
      )}
    </div>
  );
};