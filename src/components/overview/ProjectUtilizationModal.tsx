import React from 'react';
import { X } from 'lucide-react';
import type { ProjectUtilizationDetails } from '../../types';

interface ProjectUtilizationModalProps {
  details: ProjectUtilizationDetails;
  onClose: () => void;
}

export const ProjectUtilizationDetails: React.FC<ProjectUtilizationModalProps> = ({ details, onClose }) => {
  if (!details) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{details.project.name} - Utilization Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Hours Used</p>
              <p className="text-2xl font-semibold">{details.project.totalHours}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Allocated Hours</p>
              <p className="text-2xl font-semibold">{details.project.allocated_hours}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Utilization</p>
              <p className="text-2xl font-semibold">{details.project.utilization.toFixed(1)}%</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Team Member Breakdown</h4>
            <div className="space-y-2">
              {details.users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1732ca]/10 rounded-lg">
                      <div className="w-4 h-4 text-[#1732ca]">
                        {user.name[0].toUpperCase()}
                      </div>
                    </div>
                    <span className="font-medium">{user.name}</span>
                  </div>
                  <span>{user.hours} hours</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};