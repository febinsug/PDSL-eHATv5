import React from 'react';
import { Users, X } from 'lucide-react';
import type { User } from '../../types';

interface TeamViewModalProps {
  manager: User & { team?: User[] };
  onClose: () => void;
}

export const TeamViewModal: React.FC<TeamViewModalProps> = ({ manager, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Team Members - {manager.full_name || manager.username}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      {manager.team && manager.team.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manager.team.map(member => (
            <div key={member.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
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
);