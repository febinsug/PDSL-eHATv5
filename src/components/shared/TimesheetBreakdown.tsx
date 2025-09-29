import React from 'react';
import { Clock } from 'lucide-react';
import type { Timesheet } from '../../types';
import { format } from 'date-fns';

interface TimesheetBreakdownProps {
  timesheet: Timesheet;
  expanded: boolean;
  selectedMonth: Date;
}

export const TimesheetBreakdown: React.FC<TimesheetBreakdownProps> = ({ timesheet, expanded, selectedMonth }) => {
  if (!expanded) return null;

  if (!selectedMonth || isNaN(selectedMonth.getTime())) {
    console.error("TimesheetBreakdown: Invalid selectedMonth value", selectedMonth);
    return null;
  }

  const monthKey = format(selectedMonth, 'yyyy-MM');
  const monthEntry = timesheet.month_hours?.[monthKey];
  console.log(timesheet, 'timesheettimesheettimesheet', monthKey, monthEntry);
  const days = [
    { name: 'Monday', hours: monthEntry?.monday_hours ?? 0 },
    { name: 'Tuesday', hours: monthEntry?.tuesday_hours ?? 0 },
    { name: 'Wednesday', hours: monthEntry?.wednesday_hours ?? 0 },
    { name: 'Thursday', hours: monthEntry?.thursday_hours ?? 0 },
    { name: 'Friday', hours: monthEntry?.friday_hours ?? 0 },
  ];

  const totalMonthHours = days.reduce((sum, day) => sum + (day.hours || 0), 0);

  return (
    <div className="overflow-hidden transition-all duration-200">
      <div className="bg-gray-50 py-4">
        <div className="max-w-4xl mx-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Daily Hours Breakdown ({totalMonthHours} {totalMonthHours === 1 ? 'hour' : 'hours'})
          </h4>
          <div className="grid grid-cols-5 gap-4">
            {days.map(day => (
              <div key={day.name} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-2">{day.name}</div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-base font-semibold text-gray-900">{day.hours || 0}</span>
                    <span className="text-xs text-gray-500 ml-1">hrs</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-black font-semibold">{"Work Details : "}</span>
                  {/* <span className="text-xs text-gray-500 ml-1">{timesheet.work_description ? timesheet.work_description[day.name.toLowerCase()] : "N/A"}</span> */}

                  <div className="relative group ml-1">
                    <span className="text-[10px] text-gray-500 line-clamp-2 break-words">
                      {timesheet.work_description?.[day.name.toLowerCase()] || "N/A"}
                    </span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-64 max-w-xs bg-gray-700 text-white text-[10px] p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 break-words">
                      {timesheet.work_description?.[day.name.toLowerCase()] || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};