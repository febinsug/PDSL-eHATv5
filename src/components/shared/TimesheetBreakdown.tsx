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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};