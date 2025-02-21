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

const fetchProjectDetails = async (project: Project) => {
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
        .order('submitted_at', { ascending: false })
        .limit(10)
    ]);

    const users = usersResponse.data?.map(pu => ({
      id: pu.user.id,
      name: pu.user.full_name || pu.user.username,
      hours: 0
    })) || [];

    const timesheets = timesheetsResponse.data || [];

    timesheets.forEach(timesheet => {
      const user = users.find(u => u.id === timesheet.user_id);
      if (user) {
        user.hours += timesheet.total_hours || 0;
      }
    });

    const totalHoursUsed = timesheets.reduce((sum, ts) => 
      sum + (ts.total_hours || 0), 0
    );

    return {
      project: {
        ...project,
        totalHours: totalHoursUsed,
        utilization: (totalHoursUsed / project.allocated_hours) * 100
      },
      users,
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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      setError('');

      try {
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        const year = getYear(selectedMonth);

        // Fetch timesheets with project details
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
              client:clients(name)
            )
          `)
          .eq('year', year)
          .eq(user.role === 'user' ? 'user_id' : 'year', user.role === 'user' ? user.id : year);

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
        monthTimesheets.forEach(timesheet => {
          if (!projectMap.has(timesheet.project.id)) {
            projectMap.set(timesheet.project.id, {
              ...timesheet.project,
              totalHours: 0,
              color: PROJECT_COLORS[projectMap.size % PROJECT_COLORS.length],
            });
          }
          const project = projectMap.get(timesheet.project.id)!;
          project.totalHours += timesheet.total_hours || 0;
        });

        const activeProjects = Array.from(projectMap.values())
          .map(project => ({
            ...project,
            utilization: (project.totalHours / project.allocated_hours) * 100,
          }))
          .filter(p => p.totalHours > 0);

        setProjects(activeProjects);

        // Calculate project hours for charts
        const projectHoursData = activeProjects.map(project => ({
          name: project.name,
          hours: project.totalHours,
          color: project.color,
        }));
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
  }, [user, selectedMonth]);

  const handleProjectClick = async (project: Project) => {
    try {
      const details = await fetchProjectDetails(project);
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
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
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