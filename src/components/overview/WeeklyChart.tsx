import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Project } from '../../types';
import { startOfWeek, addDays, format as formatDate, startOfMonth, endOfMonth } from 'date-fns';

interface WeeklyChartProps {
  data: any[];
  projects?: Project[];
  isUserView?: boolean;
  colors: string[];
  selectedMonth?: Date;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data, projects, isUserView, colors, selectedMonth }) => {
  // For each week, find the last project that has hours > 0
  const getTopProjectForWeek = (weekData: any, projectName: string) => {
    if (!projects) return false;
    const projectIndex = projects.findIndex(p => p.name === projectName);
    if (projectIndex === -1) return false;

    // Check if this is the last project with non-zero hours for this week
    let isLastNonZero = true;
    for (let i = projectIndex + 1; i < projects.length; i++) {
      if (weekData[projects[i].name] > 0) {
        isLastNonZero = false;
        break;
      }
    }
    return isLastNonZero && weekData[projectName] > 0;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Hours Overview</h2>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            barSize={32}
            barGap={0}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="week"
              tick={({ x, y, payload }) => {
                // Extract week number from 'Week 27'
                const match = payload.value.match(/Week (\d+)/);
                let weekLabel = payload.value;
                let dateLabel = '';
                if (match && selectedMonth) {
                  const weekNum = parseInt(match[1], 10);
                  const year = selectedMonth.getFullYear();
                  const weekStart = startOfWeek(new Date(year, 0, 1 + (weekNum - 1) * 7), { weekStartsOn: 1 });
                  const weekEnd = addDays(weekStart, 4);
                  // Clamp to selected month
                  const monthStart = startOfMonth(selectedMonth);
                  const monthEnd = endOfMonth(selectedMonth);
                  const rangeStart = weekStart < monthStart ? monthStart : weekStart;
                  const rangeEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
                  dateLabel = `${formatDate(rangeStart, 'MMM d')} - ${formatDate(rangeEnd, 'MMM d')}`;
                }
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={18} textAnchor="middle" fill="#555" fontSize="14" fontWeight="500">{weekLabel}</text>
                    {dateLabel && (
                      <text x={0} y={0} dy={32} textAnchor="middle" fill="#888" fontSize="12">
                        {dateLabel}
                      </text>
                    )}
                  </g>
                );
              }}
            />
            <YAxis />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
              }}
            />
            {isUserView ? (
              <Bar 
                dataKey="hours" 
                fill={colors[0]}
                name="Total Hours" 
                radius={0}
              />
            ) : (
              projects?.map((project, index) => (
                <Bar 
                  key={project.id}
                  dataKey={project.name}
                  stackId="a"
                  fill={colors[index % colors.length]}
                  radius={0}
                />
              ))
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};