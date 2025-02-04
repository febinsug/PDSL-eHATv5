import React from 'react';
import { X } from 'lucide-react';
import type { UserHours } from '../../types';

interface UserHoursModalProps {
  userHours: UserHours;
  onClose: () => void;
}

export const UserHoursModal: React.FC<UserHoursModalProps> = ({ userHours, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">{userHours.user.full_name || userHours.user.username}</h3>
          <p className="text-sm text-gray-500">Total Hours: {userHours.totalHours}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Project Breakdown</h4>
          <div className="space-y-2">
            {userHours.projectHours.map(({ project, hours }) => (
              <div key={project.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-gray-500">{project.client?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{hours} hours</p>
                  <p className="text-sm text-gray-500">
                    {((hours / project.allocated_hours) * 100).toFixed(1)}% of allocated
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Breakdown</h4>
          <div className="space-y-2">
            {userHours.weeklyHours.map(({ weekNumber, hours }) => (
              <div key={weekNumber} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <p className="font-medium">Week {weekNumber}</p>
                <p>{hours} hours</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);