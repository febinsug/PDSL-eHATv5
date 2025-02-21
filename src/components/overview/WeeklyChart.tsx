import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Project } from '../../types';

interface WeeklyChartProps {
  data: any[];
  projects?: Project[];
  isUserView?: boolean;
  colors: string[];
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data, projects, isUserView, colors }) => {
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
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barSize={32}
            barGap={0}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
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
                radius={[4, 4, 0, 0]}
              />
            ) : (
              projects?.map((project, index) => (
                <Bar 
                  key={project.id}
                  dataKey={project.name}
                  stackId="a"
                  fill={colors[index % colors.length]}
                  radius={(entry) => getTopProjectForWeek(entry, project.name) ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};