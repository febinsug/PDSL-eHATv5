import React from 'react';
import { Edit2, Building2, Users } from 'lucide-react';
import type { Department, User } from '../../types';

interface DepartmentListProps {
  departments: Department[];
  users: User[];
  onEdit: (department: Department) => void;
  onViewUsers: (department: Department) => void;
}

export const DepartmentList: React.FC<DepartmentListProps> = ({
  departments,
  users,
  onEdit,
  onViewUsers,
}) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Departments</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Members
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {departments.map(department => (
            <tr key={department.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="p-2 bg-[#1732ca]/10 rounded-lg">
                    <Building2 className="w-5 h-5 text-[#1732ca]" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {department.name}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-500">
                  {department.description || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {users.filter(u => u.department_id === department.id).length} members
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(department)}
                    className="text-[#1732ca] hover:text-[#1732ca]/80"
                    title="Edit department"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onViewUsers(department)}
                    className="text-[#1732ca] hover:text-[#1732ca]/80"
                    title="View members"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {departments.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No departments found</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);