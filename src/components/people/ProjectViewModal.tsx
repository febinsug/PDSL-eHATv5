import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { User, Project } from '../../types';
import { supabase } from '../../lib/supabase';
import { ProjectDetailsModal } from '../projects/ProjectDetailsModal';
import { addMonths, format, subMonths } from 'date-fns';
import { getMonthStartEnd, getStartAndEndWeekNumbers, getWeekNumberRangeBetweenTwoDates } from '../../utils/common';
import DateRangeSelector from '../shared/DateRangeSelector';
import { filterTimesheetsByDateRange } from '../../utils/filterTimeSheetByDateRange';
import { ProjectDistribution } from '../overview/ProjectDistribution';
import { PROJECT_COLORS } from '../../utils/constants';
import { exportUserTimesheetByProjectsToExcel } from '../../utils/exportUserTimesheetByProject';
interface ProjectViewModalProps {
  user: User & { projects?: Project[] };
  onClose: () => void;
}

type ProjectData = {
  id: string
  name: string
  description: string
  total_hours: number
  allocated_hours: number
  client_id: string
  completed_at: string
  status: string
  timeSheetForProject: any[]
  assigned_at?: string
}

export const ProjectViewModal: React.FC<ProjectViewModalProps> = ({ user, onClose }) => {
  useEffect(() => {
    fetchUserDetailedHours(user, {})
  }, [user]);

  const [projectArr, setProjectArr] = useState<ProjectData[]>([])
  const [selectedProject, setSelectedProject] = useState<(Project & { users?: User[], totalHoursUsed?: number }) | null>(null);

  // State for expanded users and expanded weeks By Sachin
  const [fetchDataType, setFetchDataType] = useState('all'); // 'all' / 'monthly' / 'custom'
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [customDate, setCustomDate] = useState({ start: new Date(), end: new Date() });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [pieChartData, setPieChartData] = useState([])


  const fetchUserDetailedHours = async (userData: any, filter: any) => {
    try {


      const { data: projectList, error: projectListError } = await supabase
        .from('project_users')
        .select(`
          assigned_at,
          project_id, 
          projects (
            name,
            description,
            allocated_hours,
            client_id,
            status,
            completed_at
          )`
        )
        .eq('user_id', userData.id)

      if (projectListError) {
        console.error('Error fetching data:', projectListError)
        return
      }

      let query = supabase
        .from('timesheets')
        .select(`
          *,
          projects (
            name,
            description,
            allocated_hours,
            client_id,
            status,
            completed_at
          )
        `)
        .eq('user_id', userData.id)
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
      const { data, error } = await query;
      let timesheetData = data || [];
      if (error) {
        console.error('Error fetching data:', error)
        return
      }


      // console.log(timesheetData, 'timesheetData', fetchDataType)
      if (fetchDataType === 'monthly' && filter.year && filter.yearMonth) {
        const newTimeSheet: any = []
        data?.map((tim: any) => {
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
        timesheetData = await filterTimesheetsByDateRange(data || [], format(new Date(filter.startDate), 'yyyy-MM-dd'), format(new Date(filter.endDate), 'yyyy-MM-dd'))
        // console.log(JSON.stringify(timesheetData))
        // console.log(timesheetData, 'timesheetData after filter')
      }

      const groupedArray = Object.values(
        timesheetData.reduce((acc: any, row: any) => {
          const key = row.project_id
          if (!acc[key]) {
            acc[key] = {
              id: row.project_id,
              name: row.projects.name,
              description: row.projects.description,
              allocated_hours: row.projects.allocated_hours,
              client_id: row.projects.client_id,
              total_hours: 0,
              status: row.projects.status,
              completed_at: row.projects.completed_at,
              timeSheetForProject: timesheetData.filter(item => item.project_id === row.project_id)
            }
          }
          acc[key].total_hours += row.total_hours
          return acc
        }, {} as Record<string, ProjectData>)
      ) as ProjectData[]

      // console.log(groupedArray, 'timesheetsData', timesheetData)
      projectList.map((k: any) => {
        if (k.project_id && !groupedArray.find((p: any) => p.id === k.project_id)) {
          groupedArray.push({
            id: k.project_id,
            name: k.projects?.name || 'Unknown Project',
            description: k.projects?.description || 'No description',
            allocated_hours: k.projects?.allocated_hours || 0,
            client_id: k.projects?.client_id || '',
            total_hours: 0,
            status: k.projects?.status || 'Not started',
            completed_at: k.projects?.completed_at || '',
            timeSheetForProject: [],
            assigned_at: k.assigned_at || ''
          })
        } else {
          const existingProject = groupedArray.find((p: any) => p.id === k.project_id);
          if (existingProject && k.assigned_at) {
            existingProject.assigned_at = k.assigned_at;
          }
        }
      })
      console.log(JSON.stringify(groupedArray), 'groupedArray')
      if (groupedArray && groupedArray.length) {
        setProjectArr(groupedArray)
        let pieData: any = []
        groupedArray?.map((l, ind) => {
          pieData.push(
            {
              name: l.name,
              hours: l.total_hours,
              color: PROJECT_COLORS[ind]
            }
          )
        })


        setPieChartData(pieData)
      }

      // return Object.values(grouped)
      //.eq('year', year);


      if (error) {
        console.error('Error fetching user timesheets:', error);
        return null;
      }



    } catch (error) {
      console.error('Error fetching detailed user hours:', error);
      return null;
    }
  };
  const onSelectProject = async (project: any) => {
    // console.log(project, user)

    const { data, error } = await supabase
      .from('clients')
      .select("*")
      .eq('id', project.client_id)
      .single();

    if (error) {
      console.error('Error fetching project & client:', error);
      return;
    }

    // Fetch total hours used for this project
    const { data: timesheets } = await supabase
      .from('timesheets')
      .select('total_hours')
      .eq('project_id', project.id)
      .neq('status', 'rejected');

    const totalHoursUsed = timesheets?.reduce((sum, timesheet) => sum + (timesheet.total_hours || 0), 0) || 0;

    let obj = {
      allocated_hours: project.allocated_hours,
      client_id: project.client_id,
      completed_at: project.completed_at,
      created_at: "",
      created_by: "",
      description: project.description,
      id: project.id,
      name: project.name,
      status: project.status,
      totalHoursUsed: totalHoursUsed,
      users: [user],
      client: data
    }


    setSelectedProject(obj)


    console.log(obj, 'obj')
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
      fetchUserDetailedHours(user, {})
    } else if (fetchDataType === 'monthly') {
      onMonthChange(new Date())
    } else if (fetchDataType === 'custom') {
      setShowDatePicker(true)
    }
  }, [fetchDataType, refresh]);
  const handleDateRange = (start: any, end: any) => {
    setShowDatePicker(false)
    setCustomDate({ start: start, end: end })

    fetchUserDetailedHours(user, getWeekNumberRangeBetweenTwoDates(new Date(start), new Date(end)));


  };

  const onMonthChange = (date: any) => {
    setSelectedMonth(date)
    // fetchUserHours(getStartAndEndWeekNumbers(date));
    fetchUserDetailedHours(user, getStartAndEndWeekNumbers(date))
  }
  const exportExcel = () => {
    let dateRange = {
      start: "All",
      end: "Data"
    };
    if (fetchDataType === 'monthly') {
      dateRange.start = format(getMonthStartEnd(selectedMonth).start, 'yyyy-MM-dd');
      dateRange.end = format(getMonthStartEnd(selectedMonth).end, 'yyyy-MM-dd');
    } else if (fetchDataType === 'custom') {
      dateRange.start = format(customDate.start, 'yyyy-MM-dd');
      dateRange.end = format(customDate.end, 'yyyy-MM-dd');
    }
    exportUserTimesheetByProjectsToExcel(projectArr, user, dateRange)
  }
  return (


    <div>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 bg-opacity-50 flex justify-center p-8">
        <div className="bg-white rounded-xl p-6 w-full mx-4 flex flex-col h-full">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between mb-4 sticky top-30">
            <div>
              <h3 className="text-xl font-semibold">{user.full_name || user.username}</h3>

            </div>
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
          {/* Header - Fixed */}
          <div className="mb-4 sticky w-full flex items-center justify-between ">
            <div className='flex items-center justify-between w-1/2'>
              <h4 className="text-m font-medium text-gray-700 mb-3">Total Projects Assigned : {projectArr && projectArr.length || 0}</h4>

              {projectArr && projectArr.length &&
                <h4 className="text-m font-medium text-gray-700 mb-3">Total hours: {projectArr.reduce(
                  (sum, item) => sum + item.total_hours,
                  0
                )} hr</h4>
              }
            </div>
            {projectArr.reduce(
              (sum, item) => sum + item.total_hours,
              0
            ) > 0 &&
              <button
                onClick={() => exportExcel()}
                className={`flex items-center justify-center gap-2 px-4 py-2 bg-[#1732ca] border rounded-lg text-white hover:bg-[#1732ca]/90`} >
                {'Export Data in Excel'}
              </button>
            }

          </div>
          <div className="flex flex-1 overflow-hidden">
            {/* Scrollable Content */}
            <div className="w-1/2 overflow-y-auto p-1 space-y-4">
              {projectArr && projectArr.length > 0 ? (
                projectArr.map((project: any) => (
                  <div
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      onSelectProject(project);
                    }}
                    key={project.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center hover:bg-[#1732ca10] cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">{project.description || 'No description'}</p>
                      <p className="text-sm text-gray-500">Assigned On: {format(project.assigned_at, "dd MMM yyyy")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Total Hours: {project.total_hours} hr</p>
                      <p className="text-sm text-gray-500">Allocated Hours: {project.allocated_hours} hr</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No projects assigned</p>
              )}
            </div>
            <div className="w-1/2 p-1 overflow-y-auto">

              <ProjectDistribution data={pieChartData} title={""} hideOutline={true} />
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
      {selectedProject ? (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          fetchDataTypeFromLast={fetchDataType || 'all'}
          selectedMonthFromLast={selectedMonth}
          customDateFromLast={customDate}
        />
      ) : null}
    </div>
  );
};
