import React, { useState, useEffect } from 'react';
import { X, User, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Project, User as UserType } from '../../types';
import { format, subMonths, addMonths, startOfWeek, addDays, endOfWeek } from 'date-fns';
import { WeeklyChart } from '../overview/WeeklyChart';
import { ProjectDistribution } from '../overview/ProjectDistribution';
import { PROJECT_COLORS } from '../../utils/constants';

interface ProjectDetailsModalProps {
  project: Project & {
    users?: UserType[],
    totalHoursUsed?: number
  };
  onClose: () => void;
}

interface UserWithHours extends UserType {
  hoursUsed: number;
  timeSheetData: any;
}



export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({ project, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [usersWithHours, setUsersWithHours] = useState<UserWithHours[]>([]);

  // State for expanded users and expanded weeks By Sachin
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<{ [userId: string]: number[] }>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyHourUsed, setMonthlyHourUsed] = useState(0);
  const [fetchAllData, setFetchAllData] = useState(true)
  const [pieChartData, setPieChartData] = useState([])
  const weekArr = [
    {
      id: 0,
      day: "Monday",
      key: "monday_hours"
    },
    {
      id: 1,
      day: "Tuesday",
      key: "tuesday_hours"
    },
    {
      id: 2,
      day: "Wednesday",
      key: "wednesday_hours"
    },
    {
      id: 3,
      day: "Thursday",
      key: "thursday_hours"
    },
    {
      id: 4,
      day: "Friday",
      key: "friday_hours"
    }
  ]
  const utilization = project.totalHoursUsed
    ? (project.totalHoursUsed / project.allocated_hours) * 100
    : 0;

  useEffect(() => {

    console.log(project, "project")
    fetchUserHours({});
  }, [project.id, project.users]);

  const fetchUserHours = async (filter: any) => {
    try {
      if (!project.users || project.users.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = project.users.map(user => user.id);

      // Fetch hours for each user in this project
      let query = supabase
        .from('timesheets')
        .select('*')
        .eq('project_id', project.id)
        .in('user_id', userIds)
        .neq('status', 'rejected');

      if (filter.startWeek !== undefined) {
        query = query.gte('week_number', filter.startWeek);
      }

      if (filter.endWeek !== undefined) {
        query = query.lte('week_number', filter.endWeek);
      }

      if (filter.year !== undefined) {
        query = query.eq('year', filter.year);
      }

      const { data: timesheetData } = await query;
      // Calculate total hours per user


      let monthly_hour_used = timesheetData?.reduce((sum, timesheet) => sum + (timesheet.total_hours || 0), 0) || 0;
      setMonthlyHourUsed(monthly_hour_used)
      console.log(monthlyHourUsed, 'monthlyHourUsed')
      const userHoursMap: Record<string, number> = {};
      timesheetData?.forEach(timesheet => {
        const userId = timesheet.user_id;
        userHoursMap[userId] = (userHoursMap[userId] || 0) + (timesheet.total_hours || 0);
      });



      const enhancedUsers = project.users.map(user => {
        const userTimesheets = (timesheetData?.filter((u) => u.user_id === user.id) || [])
          .sort((a, b) => b.week_number - a.week_number);

        return {
          ...user,
          hoursUsed: userHoursMap[user.id] || 0,
          timeSheetData: userTimesheets
        };
      });
      console.log(enhancedUsers, 'enhancedUsers')
      // Sort users by hours used (descending)
      enhancedUsers.sort((a, b) => b.hoursUsed - a.hoursUsed);
      let pieData: any = []
      enhancedUsers.map((l, ind) => {
        pieData.push(
          {
            name: l.full_name,
            hours: l.hoursUsed,
            color: PROJECT_COLORS[ind]
          }
        )
      })
      if (project.users && project.users.length && project.users.length == 1) {
        // pie data when popup open for only one user, as project detail for a user
        pieData.push(
          {
            name: "",
            hours: project.allocated_hours - (project?.totalHoursUsed || 0),
            color: PROJECT_COLORS[pieData.length]
          }
        )
      } else {
        pieData.push(
          {
            name: "Pending",
            hours: project.allocated_hours - (project?.totalHoursUsed || 0),
            color: PROJECT_COLORS[pieData.length]
          }
        )
      }

      setPieChartData(pieData)
      setUsersWithHours(enhancedUsers);
    } catch (error) {
      console.error('Error fetching user hours:', error);
    } finally {
      setLoading(false);
    }
  };
  // Toggle helpers
  const toggleUser = (userId: string) => {
    setExpandedUsers(expanded =>
      expanded.includes(userId) ? expanded.filter(id => id !== userId) : [...expanded, userId]
    );
  };

  const toggleWeek = (userId: string, weekNum: number) => {
    setExpandedWeeks(prev => {
      const userWeeks = prev[userId] || [];
      return {
        ...prev,
        [userId]: userWeeks.includes(weekNum)
          ? userWeeks.filter(w => w !== weekNum)
          : [...userWeeks, weekNum],
      };
    });
  };
  // Helper: get the start and end date for a week number
  const getWeekDateRange = (weekNum: number, year: number) => {
    // ISO week: week 1 starts with the first Monday of the year
    const weekStart = startOfWeek(new Date(year, 0, 1 + (weekNum - 1) * 7), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 4); // Friday
    return { weekStart, weekEnd };
  };
  const ordinal = (n: number) => {
    if (n > 3 && n < 21) return n + 'th';
    switch (n % 10) {
      case 1: return n + 'st';
      case 2: return n + 'nd';
      case 3: return n + 'rd';
      default: return n + 'th';
    }
  };
  const onMonthChange = (date: any) => {
    setSelectedMonth(date)
    fetchUserHours(getStartAndEndWeekNumbers(date));
    console.log(date, getStartAndEndWeekNumbers(date))
  }

  const getStartAndEndWeekNumbers = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0); // last date of the month

    const getWeekNumber = (d: Date) => {
      const firstJan = new Date(d.getFullYear(), 0, 1);
      const days = Math.floor((d.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
      return Math.ceil((days + firstJan.getDay() + 1) / 7);
    };

    return {
      startWeek: getWeekNumber(firstDayOfMonth),
      endWeek: getWeekNumber(lastDayOfMonth),
      year: date.getFullYear()
    };
  }
  const showAllClick = (val: boolean) => {
    setFetchAllData(val)
    if (val) {
      fetchUserHours({});
    } else {
      onMonthChange(new Date())
    }
  }
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-normal justify-center p-4">
      <div className="bg-white rounded-xl w-full shadow-xl flex flex-col">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900">{project && project.users && project.users.length && project.users.length == 1 ? (project.users[0].full_name + " - ") : ""}{project.name}</h2>
          <div className="flex items-center gap-2 min-w-[220px] justify-end">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => showAllClick(true)}
                className={`flex items-center justify-center gap-2 px-4 py-2 ${fetchAllData ? 'bg-[#1732ca]' : 'bg-white'} ${fetchAllData ? 'border rounded-lg text-white hover:bg-[#1732ca]/90' : 'border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'}`}

              >
                {'Show All Data'}
              </button>
              <button
                onClick={() => showAllClick(false)}
                className={`flex items-center justify-center gap-2 px-4 py-2 ${!fetchAllData ? 'bg-[#1732ca]' : 'bg-white'} ${!fetchAllData ? 'border rounded-lg text-white hover:bg-[#1732ca]/90' : 'border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'}`}
              >
                {'Monthly Data'}
              </button>
            </div>
            {!fetchAllData &&
              <>
                <button
                  onClick={() => onMonthChange(subMonths(selectedMonth, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm font-medium text-gray-900 w-[120px] text-center block">
                  {format(selectedMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </>
            }
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 flex-1">
          {/* Project Details */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Description</p>
            <p className="text-gray-900">{project.description || 'No description provided'}</p>
          </div>

          {/* Stats Cards */}
          <div className={`grid ${fetchAllData ? 'grid-cols-3' : 'grid-cols-4'} gap-4 mb-8`}>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Used Total</p>
              <p className="text-2xl font-semibold">{project.totalHoursUsed || 0}h</p>
            </div>
            {!fetchAllData &&
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Used in {format(selectedMonth, 'MMMM')}</p>
                <p className="text-2xl font-semibold">{monthlyHourUsed || 0}h</p>
              </div>
            }
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Allocated</p>
              <p className="text-2xl font-semibold">{project.allocated_hours}h</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Utilization</p>
              <p
                className={`text-2xl font-semibold ${utilization > 100 ? 'text-red-500' : 'text-emerald-500'
                  }`}
              >
                {utilization.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className='grid grid-cols-2'>
            {/* Client Info */}
            <div>
              {project.client && (
                <div className=" mb-6">
                  <p className="text-sm text-gray-500 mb-2">Client</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{project.client.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{project.client.description || 'No description'}</p>
                  </div>
                </div>
              )}


              {/* Team Members By Sachin*/}
              <h3 className="text-sm font-medium text-gray-500 mb-4">TEAM MEMBERS</h3>
              <div className="space-y-3">
                {usersWithHours.map(user => {
                  const isUserExpanded = expandedUsers.includes(user.id);
                  return (
                    <div key={user.id} className="bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl">
                      <div
                        className="flex items-center justify-between p-4 hover:shadow-sm transition-all duration-200 cursor-pointer"
                        onClick={() => toggleUser(user.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-blue-700 font-medium">
                              {(user.full_name || user.username).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{(user.full_name || user.username)}</p>
                            {user.designation && (
                              <p className="text-xs text-gray-500">{user.designation}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm">
                              {/* <span className="font-medium text-gray-900">{user.monthlyHours}h</span> */}
                              {/* <span className="text-gray-500 ml-1">{monthLabel}</span> */}
                            </div>
                            <div className="mt-0.5">
                              <p className="font-medium text-gray-900">{user.hoursUsed}h</p>
                              <p className="text-xs text-gray-500">
                                {((user.hoursUsed / project.allocated_hours) * 100).toFixed(1)}% of total
                              </p>
                            </div>
                          </div>
                          <button
                            className="ml-2 p-1 rounded hover:bg-gray-100"
                            onClick={e => { e.stopPropagation(); toggleUser(user.id); }}
                            aria-label={isUserExpanded ? 'Collapse' : 'Expand'}
                          >
                            <svg className={`w-5 h-5 transition-transform ${isUserExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>

                        </div>
                      </div>

                      {isUserExpanded && (
                        <div className="pl-8 pr-2 pb-4 pt-2 space-y-2">
                          {user?.timeSheetData?.length === 0 ? (
                            <div className="text-gray-400 text-sm italic">No data for this month</div>
                          ) : user?.timeSheetData.map((week: any) => {
                            const isWeekExpanded = (expandedWeeks[user.id] || []).includes(week.week_number);
                            const { weekStart, weekEnd } = getWeekDateRange(week.week_number, week.year);
                            return (
                              <div key={week.week_number} className="bg-gray-50 rounded-lg">
                                <div
                                  className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100 rounded-lg"
                                  onClick={() => toggleWeek(user.id, week.week_number)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">Week {week.week_number}</span>
                                    <span className="font-medium text-gray-500">{week.year}</span>
                                    <span className="text-xs text-gray-500">(
                                      {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                                      )</span>
                                    <span className="text-xs text-gray-500">{week.total_hours}h</span>
                                  </div>
                                  <svg className={`w-4 h-4 transition-transform ${isWeekExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                                {isWeekExpanded && (
                                  <div className="px-6 pb-3 pt-1">
                                    <div className="grid grid-cols-5 gap-2">
                                      {weekArr.map((k) => {
                                        const date = addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), k.id);
                                        return (
                                          <div key={k.day} className="bg-white rounded p-2 flex flex-col items-center">
                                            <span className="text-xs text-gray-500">{k.day}</span>
                                            <span className="font-medium text-gray-900">{week[k.key]}h</span>
                                            <span className="text-[10px] text-gray-400 mt-0.5">{ordinal(date.getDate())} {format(date.getDate(), 'MMM')} {week.year}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );

                          })}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-6 p-[25px]">
              <ProjectDistribution data={pieChartData} title={"Hours By Users"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 