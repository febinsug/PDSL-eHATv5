import React, { useState, useEffect } from 'react';
import { X, } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Project, User as UserType } from '../../types';
import { format, subMonths, addMonths, startOfWeek, addDays } from 'date-fns';
import { ProjectDistribution } from '../overview/ProjectDistribution';
import { PROJECT_COLORS } from '../../utils/constants';
import DateRangeSelector from '../shared/DateRangeSelector';
import { getWeekNumber, getWeekNumberRangeBetweenTwoDates, isDateInSelectedMonth } from '../../utils/common';
import { filterTimesheetsByDateRange } from '../../utils/filterTimeSheetByDateRange';
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
  const [fetchDataType, setFetchDataType] = useState('all'); // 'all' / 'monthly' / 'custom'
  const [pieChartData, setPieChartData] = useState([])
  const [customDate, setCustomDate] = useState({ start: new Date(), end: new Date() });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refresh, setRefresh] = useState(0);
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

    // console.log(project, "project")
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


      // If date range week filter is provided
      if (filter.dateRangeWeek?.length) {
        // Create more precise or conditions
        const orConditions = filter.dateRangeWeek.map((r: any) =>
          `and(year.eq.${r.year},week_number.gte.${r.startWeek},week_number.lte.${r.endWeek})`
        ).join(',');

        query = query.or(orConditions);
      }


      // const { data: timesheetDataFromDB } = await query;
      query.then(async ({ data: timesheetDataFromDB }) => {
        // use timesheetDataFromDB here

        // Calculate total hours per user
        let timesheetData = timesheetDataFromDB


        // console.log(timesheetData, 'timesheetData', fetchDataType)
        if (fetchDataType === 'monthly' && filter.year && filter.yearMonth) {
          const newTimeSheet: any = []
          timesheetDataFromDB?.map((tim: any) => {
            const timData = { ...tim }
            // console.log(tim.month_hours, filter.yearMonth, tim.month_hours[filter.yearMonth], 'tim====')
            if (tim.month_hours && tim.month_hours[filter.yearMonth]) {
              timData.total_hours = tim.month_hours[filter.yearMonth].monday_hours + tim.month_hours[filter.yearMonth].tuesday_hours + tim.month_hours[filter.yearMonth].wednesday_hours + tim.month_hours[filter.yearMonth].thursday_hours + tim.month_hours[filter.yearMonth].friday_hours
              timData.monday_hours = tim.month_hours[filter.yearMonth].monday_hours
              timData.tuesday_hours = tim.month_hours[filter.yearMonth].tuesday_hours
              timData.wednesday_hours = tim.month_hours[filter.yearMonth].wednesday_hours
              timData.thursday_hours = tim.month_hours[filter.yearMonth].thursday_hours
              timData.friday_hours = tim.month_hours[filter.yearMonth].friday_hours
              timData.month_hours = { [filter.yearMonth]: tim.month_hours[filter.yearMonth] }
              newTimeSheet.push(timData)
            }
            // console.log(timData, 'timData')
          })
          // console.log(newTimeSheet, 'newTimeSheet')
          timesheetData = newTimeSheet
        }
        if (fetchDataType === 'custom') {
          // console.log(filter)
          timesheetData = await filterTimesheetsByDateRange(timesheetDataFromDB || [], format(new Date(filter.startDate), 'yyyy-MM-dd'), format(new Date(filter.endDate), 'yyyy-MM-dd'))
          // console.log(JSON.stringify(timesheetData))
          // console.log(timesheetData, 'timesheetData after filter')
        }







        let monthly_hour_used = timesheetData?.reduce((sum, timesheet) => sum + (timesheet.total_hours || 0), 0) || 0;
        setMonthlyHourUsed(monthly_hour_used)
        // console.log(monthlyHourUsed, 'monthlyHourUsed')
        const userHoursMap: Record<string, number> = {};
        timesheetData?.forEach(timesheet => {
          const userId = timesheet.user_id;
          userHoursMap[userId] = (userHoursMap[userId] || 0) + (timesheet.total_hours || 0);
        });



        const enhancedUsers = project?.users?.map(user => {
          const userTimesheets = (timesheetData?.filter((u) => u.user_id === user.id) || [])
            .sort((a, b) => b.week_number - a.week_number);

          return {
            ...user,
            hoursUsed: userHoursMap[user.id] || 0,
            timeSheetData: userTimesheets
          };
        });
        // console.log(enhancedUsers, 'enhancedUsers')
        // Sort users by hours used (descending)
        enhancedUsers?.sort((a, b) => b.hoursUsed - a.hoursUsed);
        let pieData: any = []
        enhancedUsers?.map((l, ind) => {
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
        setUsersWithHours(enhancedUsers ? enhancedUsers : []);

      });
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
    // console.log(date, getStartAndEndWeekNumbers(date))
  }

  const getStartAndEndWeekNumbers = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0); // last date of the month
    return {
      startWeek: getWeekNumber(firstDayOfMonth),
      endWeek: getWeekNumber(lastDayOfMonth),
      year: date.getFullYear(),
      yearMonth: year + "-" + format(date, "MM")
    };
  }
  const showAllClick = (val: string) => {
    setFetchDataType(val)
    if (val !== 'custom') {
      setCustomDate({ start: new Date(), end: new Date() });
    }
    setRefresh((r) => r + 1);  // increment to trigger effect
  }
  useEffect(() => {
    if (fetchDataType === 'all') {
      fetchUserHours({});
    } else if (fetchDataType === 'monthly') {
      onMonthChange(new Date())
    } else if (fetchDataType === 'custom') {
      // const { startWeek, endWeek, year } = getStartAndEndWeekNumbers(selectedMonth);
      // fetchUserHours({ startWeek, endWeek, year });
      setShowDatePicker(true)
    }
  }, [fetchDataType, refresh]);
  const handleDateRange = (start: any, end: any) => {
    setShowDatePicker(false)
    setCustomDate({ start: start, end: end })
    // console.log("Selected Start Date:", start);
    // console.log("Selected End Date:", end);
    // console.log("getWeekDateRangeBetweenTwoDates", JSON.stringify(getWeekNumberRangeBetweenTwoDates(new Date(start), new Date(end))));
    fetchUserHours(getWeekNumberRangeBetweenTwoDates(new Date(start), new Date(end)));


    // Your filter logic here
  };


  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-normal justify-center p-4">
      <div className="bg-white rounded-xl w-full shadow-xl flex flex-col">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900">{project && project.users && project.users.length && project.users.length == 1 ? (project.users[0].full_name + " - ") : ""}{project.name}</h2>
          <div className="flex items-center gap-2 min-w-[220px] justify-end">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => showAllClick('all')}
                className={`flex items-center justify-center gap-2 px-4 py-2 ${fetchDataType == 'all' ? 'bg-[#1732ca]' : 'bg-white'} ${fetchDataType == 'all' ? 'border rounded-lg text-white hover:bg-[#1732ca]/90' : 'border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'}`}

              >
                {'Show All Data'}
              </button>
              <button
                onClick={() => showAllClick('monthly')}
                className={`flex items-center justify-center gap-2 px-4 py-2 ${fetchDataType == 'monthly' ? 'bg-[#1732ca]' : 'bg-white'} ${fetchDataType == 'monthly' ? 'border rounded-lg text-white hover:bg-[#1732ca]/90' : 'border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'}`}
              >
                {'Monthly Data'}
              </button>
              <button
                onClick={() => showAllClick('custom')}
                className={`flex items-center justify-center gap-2 px-4 py-2 ${fetchDataType == 'custom' ? 'bg-[#1732ca]' : 'bg-white'} ${fetchDataType == 'custom' ? 'border rounded-lg text-white hover:bg-[#1732ca]/90' : 'border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'}`}
              >
                {'Custom Dates'}
              </button>
            </div>
            {fetchDataType == 'monthly' &&
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
            {fetchDataType == 'custom' && customDate.start && customDate.end &&
              <span onClick={() => showAllClick('custom')} className="text-m font-medium text-gray-900 w-[230px] text-center block cursor-pointer">
                {format(new Date(customDate.start), 'dd MMM yyyy')} - {format(new Date(customDate.end), 'dd MMM yyyy')}
              </span>
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
          <div className={`grid ${fetchDataType == 'all' ? 'grid-cols-3' : 'grid-cols-4'} gap-4 mb-8`}>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Used Total</p>
              <p className="text-2xl font-semibold">{project.totalHoursUsed || 0}h</p>
            </div>
            {fetchDataType != 'all' &&
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Used{fetchDataType == 'custom' ? (" between " + format(new Date(customDate.start), 'dd MMM yy') + " - " + format(new Date(customDate.end), 'dd MMM yy')) : (" in " + format(selectedMonth, 'MMMM'))}</p>
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
                                        if (fetchDataType === 'monthly' && isDateInSelectedMonth(date, selectedMonth.getMonth() + 1, selectedMonth.getFullYear()) === false) {
                                          return (
                                            <div key={k.day} className="bounded p-2 flex flex-col items-center">
                                            </div>
                                          )
                                          // return blank view if date is not in selected month
                                        }
                                        const d = new Date(date).setHours(0, 0, 0, 0);
                                        const start = new Date(customDate.start).setHours(0, 0, 0, 0);
                                        const end = new Date(customDate.end).setHours(0, 0, 0, 0);

                                        if (fetchDataType === 'custom' && (d < start || d > end)) {
                                          return (
                                            <div key={k.day} className="bounded p-2 flex flex-col items-center">
                                            </div>
                                          )
                                          // return blank view if date is not in custom date range
                                        }
                                        return (
                                          <div key={k.day} className="bg-white rounded p-2 flex flex-col items-center">
                                            <span className="text-xs text-gray-500">{k.day}</span>
                                            <span className="font-medium text-gray-900">{week[k.key]}h</span>
                                            <span className="text-[10px] text-gray-400 mt-0.5">{ordinal(date.getDate())} {format(date, 'MMM yyyy')}</span>
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
      {showDatePicker && (
        <DateRangeSelector
          onDateChange={handleDateRange}
          onClose={() => setShowDatePicker(false)}
          defaultStart={customDate.start}
          defaultEnd={customDate.end}
        />
      )}
    </div>
  );
}; 