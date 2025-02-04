import React from 'react';
import { UserIcon } from 'lucide-react';
import type { UserHours } from '../../types';

interface UserHoursListProps {
  userHours: UserHours[];
  onUserClick: (userHour: UserHours) => void;
}

export const UserHoursList: React.FC<UserHoursListProps> = ({ userHours, onUserClick }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Hours by User</h2>
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      {userHours.length > 0 ? (
        userHours.map(userHour => (
          <div
            key={userHour.user.id}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
            onClick={() => onUserClick(userHour)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1732ca]/10 rounded-lg">
                  <UserIcon className="w-5 h-5 text-[#1732ca]" />
                </div>
                <div>
                  <p className="font-medium">{userHour.user.full_name || userHour.user.username}</p>
                  <p className="text-sm text-gray-500 capitalize">{userHour.user.role}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{userHour.totalHours} hours</p>
                <p className="text-sm text-gray-500">
                  {userHour.projectHours.length} project{userHour.projectHours.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No hours logged this month</p>
        </div>
      )}
    </div>
  </div>
);