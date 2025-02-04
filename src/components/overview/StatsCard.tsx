import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  label: string;
  value: number | string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  iconColor,
  iconBgColor,
  label,
  value,
}) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <div className="flex items-center gap-4">
      <div className={`p-3 ${iconBgColor} rounded-lg`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);