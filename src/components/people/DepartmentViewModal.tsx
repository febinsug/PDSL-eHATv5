import React from 'react';
import { X, Building2 } from 'lucide-react';
import type { Department, User } from '../../types';

interface DepartmentViewModalProps {
  department: Department;
  users: User[];
  onClose: () => void;
}

export const DepartmentViewModal: React.FC<DepartmentViewModalProps> = ({
  department,
  users,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1732ca]/10 rounded-lg">
            <Building2 className="w-5 h-5 text-[#1732ca]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{department.name}</h3>
            <p className="text-sm text-gray-500">{department.description || 'No description'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Department Members</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map(user => (
            <div key={user.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1732ca]/10 flex items-center justify-center">
                  <span className="text-[#1732ca] font-medium">
                    {(user.full_name || user.username)[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.designation || user.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-500">
              <p>No members assigned to this department</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);