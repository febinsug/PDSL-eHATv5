import React from 'react';
import type { User, Project } from '../../types';

interface FilterDialogProps {
  show: boolean;
  onClose: () => void;
  filterOptions: {
    users: string[];
    projects: string[];
    status: string[];
    dateRange: {
      start: string;
      end: string;
    };
  };
  setFilterOptions: React.Dispatch<React.SetStateAction<{
    users: string[];
    projects: string[];
    status: string[];
    dateRange: {
      start: string;
      end: string;
    };
  }>>;
  users: User[];
  projects: Project[];
}

export const FilterDialog: React.FC<FilterDialogProps> = ({
  show,
  onClose,
  filterOptions,
  setFilterOptions,
  users,
  projects,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Filter Timesheets</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Users</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {users.map(user => (
                <label key={user.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterOptions.users.includes(user.id)}
                    onChange={e => {
                      setFilterOptions(prev => ({
                        ...prev,
                        users: e.target.checked
                          ? [...prev.users, user.id]
                          : prev.users.filter(id => id !== user.id)
                      }));
                    }}
                    className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                  />
                  <span>{user.full_name || user.username}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Projects</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {projects.map(project => (
                <label key={project.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterOptions.projects.includes(project.id)}
                    onChange={e => {
                      setFilterOptions(prev => ({
                        ...prev,
                        projects: e.target.checked
                          ? [...prev.projects, project.id]
                          : prev.projects.filter(id => id !== project.id)
                      }));
                    }}
                    className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                  />
                  <span>{project.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setFilterOptions({
                users: [],
                projects: [],
                status: [],
                dateRange: {
                  start: '',
                  end: ''
                }
              });
              onClose();
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};