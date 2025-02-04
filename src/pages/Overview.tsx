import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfWeek, endOfWeek, addDays, getWeek, getYear, isSameMonth, isWithinInterval } from 'date-fns';
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
  primary: '#1732ca',
  lighter: '#4a5fdb',
  light: '#7d8ce8',
  lightest: '#b0b9f5',
  dark: '#1229a1',
  darker: '#0d1f78',
  darkest: '#091550',
  pale: '#e6e9fc',
  accent: '#3d4ecc',
  muted: '#6575d4'
};

const PROJECT_COLORS = [
  COLORS.primary,
  COLORS.lighter,
  COLORS.light,
  COLORS.dark,
  COLORS.darker,
  COLORS.accent,
  COLORS.muted,
  COLORS.lightest,
  COLORS.darkest,
  COLORS.pale
];

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

  const calculateWeeklyData = (timesheets: any[], activeProjects: Project[], selectedMonth: Date) => {
    const weeklyData: any[] = [];
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    let currentWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    
    while (currentWeekStart <= monthEnd) {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 });
      const weekYear = getYear(currentWeekStart);
      const weekLabel = `Week ${weekNumber}`;

      // Calculate how many days of this week fall into the selected month
      let daysInSelectedMonth = 0;
      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(currentWeekStart, i);
        if (isSameMonth(currentDay, selectedMonth)) {
          daysInSelectedMonth++;
        }
      }

      // Only include the week if the majority of its days (>= 4) fall within the selected month
      if (daysInSelectedMonth >= 4) {
        const weekTimesheets = timesheets.filter(timesheet => {
          const timesheetWeekStart = startOfWeek(new Date(timesheet.year, 0, 1 + (timesheet.week_number - 1) * 7), { weekStartsOn: 1 });
          return (
            timesheet.week_number === weekNumber &&
            timesheet.year === weekYear
          );
        });

        if (user?.role === 'user') {
          const totalHours = weekTimesheets.reduce((sum, timesheet) => 
            sum + (timesheet.total_hours || 0), 0);

          weeklyData.push({
            week: weekLabel,
            hours: totalHours
          });
        } else {
          const weekData: any = {
            week: weekLabel
          };

          activeProjects.forEach(project => {
            weekData[project.name] = 0;
          });

          weekTimesheets.forEach(timesheet => {
            const project = activeProjects.find(p => p.id === timesheet.project_id);
            if (project) {
              weekData[project.name] = (weekData[project.name] || 0) + (timesheet.total_hours || 0);
            }
          });

          weeklyData.push(weekData);
        }
      }

      currentWeekStart = addDays(currentWeekStart, 7);
    }

    return weeklyData;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      setError('');

      try {
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        const year = getYear(selectedMonth);

        // Fetch projects and timesheets
        const [projectsResponse, timesheetsResponse] = await Promise.all([
          supabase
            .from('projects')
            .select(`
              *,
              client:clients(*)
            `)
            .eq('is_active', true),
          supabase
            .from('timesheets')
            .select(`
              *,
              user:users!timesheets_user_id_fkey(id, username, full_name, role),
              project:projects!inner(id, name, allocated_hours, client:clients(name))
            `)
            .eq('year', year)
        ]);

        if (projectsResponse.error) throw projectsResponse.error;
        if (timesheetsResponse.error) throw timesheetsResponse.error;

        const projectsData = projectsResponse.data || [];
        const timesheetsData = timesheetsResponse.data || [];

        // Filter timesheets for the selected month using the same week-month logic
        const monthTimesheets = timesheetsData.filter(timesheet => {
          const weekStart = startOfWeek(new Date(timesheet.year, 0, 1 + (timesheet.week_number - 1) * 7), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          
          // Count days in selected month
          let daysInSelectedMonth = 0;
          for (let i = 0; i < 7; i++) {
            const currentDay = addDays(weekStart, i);
            if (isSameMonth(currentDay, selectedMonth)) {
              daysInSelectedMonth++;
            }
          }
          
          // Include timesheet if majority of week falls in selected month
          return daysInSelectedMonth >= 4;
        });

        // Calculate project statistics using filtered timesheets
        const projectStats = projectsData.map((project, index) => {
          const projectTimesheets = monthTimesheets.filter(t => t.project_id === project.id);
          const totalHours = projectTimesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0);
          const utilization = project.allocated_hours > 0 ? (totalHours / project.allocated_hours) * 100 : 0;

          return {
            ...project,
            totalHours,
            utilization,
            color: PROJECT_COLORS[index % PROJECT_COLORS.length]
          };
        });

        const activeProjects = projectStats.filter(p => p.totalHours > 0);
        setProjects(activeProjects);

        // Set project hours for pie chart
        const projectHoursData = activeProjects
          .map(project => ({
            name: project.name,
            hours: project.totalHours,
            color: project.color
          }))
          .filter(project => project.hours > 0);
        setProjectHours(projectHoursData);

        // Calculate overall statistics
        const totalHours = projectStats.reduce((sum, p) => sum + p.totalHours, 0);
        const activeProjectsCount = projectStats.filter(p => p.is_active && !p.completed_at).length;
        const pendingCount = monthTimesheets.filter(t => t.status === 'pending').length;
        const approvedCount = monthTimesheets.filter(t => t.status === 'approved').length;

        setStats({
          totalHours,
          activeProjects: activeProjectsCount,
          pendingSubmissions: pendingCount,
          approvedSubmissions: approvedCount,
        });

        // Calculate user hours
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

          // Update project hours
          const projectIndex = userHourData.projectHours.findIndex(ph => ph.project.id === timesheet.project.id);
          if (projectIndex === -1) {
            userHourData.projectHours.push({
              project: timesheet.project,
              hours
            });
          } else {
            userHourData.projectHours[projectIndex].hours += hours;
          }

          // Update weekly hours
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

        // Calculate weekly data using the same logic
        const weeklyChartData = calculateWeeklyData(monthTimesheets, activeProjects, selectedMonth);
        setWeeklyData(weeklyChartData);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedMonth]);

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

      {(user?.role === 'admin' || user?.role === 'manager') ? (
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
              onProjectClick={setSelectedProject}
            />
            <UserHoursList
              userHours={userHours}
              onUserClick={setSelectedUserHours}
            />
          </div>
        </div>
      ) : (
        <WeeklyChart
          data={weeklyData}
          isUserView
          colors={[COLORS.primary]}
        />
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