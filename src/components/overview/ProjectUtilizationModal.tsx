import React from 'react';
import { XIcon } from 'lucide-react';
import type { ProjectUtilizationDetails as ProjectDetails } from '../../types';

interface ProjectUtilizationModalProps {
  details: ProjectDetails;
  onClose: () => void;
}

export const ProjectUtilizationDetails: React.FC<ProjectUtilizationModalProps> = ({ details, onClose }) => {
  // Sort users by monthly hours in descending order
  const sortedUsers = [...details.users].sort((a, b) => b.monthlyHours - a.monthlyHours);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900">{details.project.name}</h2>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Used</p>
                <p className="text-2xl font-semibold">{details.totalHoursUsed}h</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Allocated</p>
                <p className="text-2xl font-semibold">{details.project.allocated_hours}h</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Utilization</p>
                <p 
                  className={`text-2xl font-semibold ${
                    details.project.utilization > 100 ? 'text-red-500' : 'text-emerald-500'
                  }`}
                >
                  {details.project.utilization.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Team Members */}
            <h3 className="text-sm font-medium text-gray-500 mb-4">TEAM MEMBERS</h3>
            <div className="space-y-3">
              {sortedUsers.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-blue-700 font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      {user.designation && (
                        <p className="text-xs text-gray-500">{user.designation}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{user.monthlyHours}h</span>
                      <span className="text-gray-500 ml-1">this month</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 mt-0.5">
                      {user.hours}h total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};