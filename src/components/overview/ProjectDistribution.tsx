import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ProjectDistributionProps {
  data: Array<{
    name: string;
    hours: number;
    color: string;
  }>;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-gray-600">{payload[0].value} hours</p>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, fill } = props;
  if (percent < 0.04) return null; // Only show for >4%
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
      {name} ({Math.round(percent * 100)}%)
    </text>
  );
};

export const ProjectDistribution: React.FC<ProjectDistributionProps> = ({ data }) => {
  // Sort data by hours descending
  const sortedData = [...data].sort((a, b) => b.hours - a.hours);
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ marginTop: 12 }}>Hours by Project</h2>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sortedData}
              dataKey="hours"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={150}
              isAnimationActive={false}
              label={renderCustomizedLabel}
              labelLine={true}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              payload={(() => {
                const total = sortedData.reduce((sum, d) => sum + d.hours, 0);
                return sortedData.filter(d => d.hours / total <= 0.04).map((entry, index) => ({
                  id: entry.name,
                  type: 'square',
                  value: `${entry.name} (${Math.round((entry.hours / total) * 100)}%)`,
                  color: entry.color
                }));
              })()}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};