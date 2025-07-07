import React, { useState } from 'react';
import { UserIcon, Search } from 'lucide-react';
import type { UserHours } from '../../types';

interface UserHoursListProps {
  userHours: UserHours[];
  onUserClick: (userHour: UserHours) => void;
}

export const UserHoursList: React.FC<UserHoursListProps> = ({ userHours, onUserClick }) => {
  const [search, setSearch] = useState('');
  const filteredUsers = userHours.filter(uh =>
    uh.user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    uh.user.username?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Hours by User</h2>
        <div className="relative w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-9 pr-3 py-2 w-full rounded-md border border-gray-200 focus:border-[#1732ca] focus:ring-[#1732ca]/20 focus:ring-2 text-sm bg-gray-50 placeholder-gray-400"
          />
        </div>
      </div>
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {filteredUsers.length > 0 ? (
          filteredUsers.map(uh => (
            <div
              key={uh.user.id}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => onUserClick(uh)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#1732ca]/10 rounded-lg">
                    <UserIcon className="w-5 h-5 text-[#1732ca]" />
                  </div>
                  <div>
                    <p className="font-medium">{uh.user.full_name || uh.user.username}</p>
                    <p className="text-sm text-gray-500">{uh.user.designation || '-'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{uh.totalHours} hours</p>
                  <p className="text-sm text-gray-500">
                    {uh.projectHours.length} project{uh.projectHours.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};