import React from 'react';
import { Users, X } from 'lucide-react';
import type { User } from '../../types';

interface TeamViewModalProps {
  manager: User & { team?: User[] };
  onClose: () => void;
}

export const TeamViewModal: React.FC<TeamViewModalProps> = ({ manager, onClose }) => {
  // Sort team members alphabetically
  const sortedTeam = manager.team ? [...manager.team].sort((a, b) => {
    const nameA = a.full_name || a.username;
    const nameB = b.full_name || b.username;
    return nameA.localeCompare(nameB);
  }) : [];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-full sm:max-w-lg md:max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10 rounded-t-2xl mb-0">
          <h3 className="text-lg sm:text-xl font-semibold">Team Members - {manager.full_name || manager.username}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 flex flex-col gap-4">
          {sortedTeam.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedTeam.map(member => (
                <div key={member.id} className="bg-gray-50 p-4 rounded-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1732ca]/10 flex items-center justify-center">
                    <span className="text-[#1732ca] font-medium">
                      {(member.full_name || member.username)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.full_name || member.username}</p>
                    <p className="text-sm text-gray-500">{member.designation || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No team members found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};