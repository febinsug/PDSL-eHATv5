import React from 'react';
import { Clock } from 'lucide-react';
import type { Timesheet } from '../../types';

interface TimesheetBreakdownProps {
  timesheet: Timesheet;
  expanded: boolean;
}

export const TimesheetBreakdown: React.FC<TimesheetBreakdownProps> = ({ timesheet, expanded }) => {
  if (!expanded) return null;

  const days = [
    { name: 'Monday', hours: timesheet.monday_hours },
    { name: 'Tuesday', hours: timesheet.tuesday_hours },
    { name: 'Wednesday', hours: timesheet.wednesday_hours },
    { name: 'Thursday', hours: timesheet.thursday_hours },
    { name: 'Friday', hours: timesheet.friday_hours },
  ];

  return (
    <div className="overflow-hidden transition-all duration-200">
      <div className="bg-gray-50 py-4">
        <div className="max-w-4xl mx-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Daily Hours Breakdown</h4>
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