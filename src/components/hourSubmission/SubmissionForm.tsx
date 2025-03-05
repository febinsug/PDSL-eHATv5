import React from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import type { Project } from '../../types';

interface SubmissionFormProps {
  projects: Project[];
  hours: Record<string, Record<string, number>>;
  weekDays: Date[];
  handleHourChange: (projectId: string, day: string, value: string) => void;
  isReadOnly?: boolean;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  projects,
  hours,
  weekDays,
  handleHourChange,
  isReadOnly = false,
}) => {
  const calculateWeeklyTotal = (projectHours: Record<string, number>) => {
    return Object.values(projectHours).reduce((sum, hours) => sum + (hours || 0), 0);
  };

  const getDayKey = (date: Date) => {
    const dayName = format(date, 'EEEE').toLowerCase();
    return `${dayName}_hours`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-4 px-6 text-left text-sm font-semibold text-gray-900 w-1/4">Project</th>
              {weekDays.map(day => (
                <th key={day.toString()} className="py-4 px-6 text-center w-1/6">
                  <div className="text-sm font-semibold text-gray-900">{format(day, 'EEE')}</div>
                  <div className="text-xs text-gray-500 mt-1">{format(day, 'MMM d')}</div>
                </th>
              ))}
              <th className="py-4 px-6 text-center text-sm font-semibold text-gray-900 w-1/6">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map(project => {
              const projectHours = hours[project.id] || {};
              const total = calculateWeeklyTotal(projectHours);

              return (
                <tr key={project.id} className={`${isReadOnly ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#1732ca]/10 rounded-lg">
                        <Clock className="w-5 h-5 text-[#1732ca]" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{project.name}</div>
                        <div className="text-sm text-gray-500">{project.allocated_hours} hours allocated</div>
                      </div>
                    </div>
                  </td>
                  {weekDays.map(day => {
                    const dayKey = getDayKey(day);
                    return (
                      <td key={day.toString()} className="py-4 px-6">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={projectHours[dayKey] || ''}
                            onChange={e => handleHourChange(project.id, format(day, 'EEEE').toLowerCase(), e.target.value)}
                            disabled={isReadOnly}
                            className={`
                              w-20 text-center rounded-lg border-gray-300 shadow-sm
                              focus:border-[#1732ca] focus:ring focus:ring-[#1732ca] focus:ring-opacity-50
                              hover:border-gray-400 transition-colors
                              placeholder-gray-400
                              ${isReadOnly ? 
                                'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 
                                'bg-white'
                              }
                            `}
                            placeholder="0.0"
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-4 px-6 text-center">
                    <div className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 bg-[#1732ca]/10 rounded-full">
                      <span className="font-semibold text-[#1732ca]">{total}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No projects found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};