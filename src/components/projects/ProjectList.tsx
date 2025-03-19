import React from 'react';
import { Edit2, Trash2, Users, Check, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import type { Project } from '../../types';

interface ProjectListProps {
  title?: string;
  projects: Project[];
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onComplete: (project: Project) => void;
  onSelect: (project: Project) => void;
  onSort: (field: string) => void;
  sortConfig: { field: string; direction: 'asc' | 'desc' };
  showReactivate?: boolean;
  onReactivate?: (project: Project) => void;
  onClick: (project: Project) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const ProjectList: React.FC<ProjectListProps> = ({
  title = "Projects",
  projects,
  onEdit,
  onArchive,
  onComplete,
  onSelect,
  onSort,
  sortConfig,
  showReactivate = false,
  onReactivate,
  onClick,
}) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    {title && (
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
    )}
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th 
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
            onClick={() => onSort('name')}
          >
            <div className="flex items-center gap-2">
              Project Name
              {sortConfig.field === 'name' && (
                sortConfig.direction === 'asc' ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )
              )}
            </div>
          </th>
          <th 
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
            onClick={() => onSort('client.name')}
          >
            <div className="flex items-center gap-2">
              Client
              {sortConfig.field === 'client.name' && (
                sortConfig.direction === 'asc' ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )
              )}
            </div>
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Description
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Allocated Hours
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          {showReactivate && (
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Completed Date
            </th>
          )}
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {projects.map(project => (
          <tr 
            key={project.id} 
            className="hover:bg-gray-50 cursor-pointer"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              onSelect(project);
            }}
          >
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-gray-900">{project.name}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">{project.client?.name || '-'}</div>
            </td>
            <td className="px-6 py-4">
              <div className="text-sm text-gray-500">{project.description || '-'}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">{project.allocated_hours} hours</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                getStatusColor(project.status)
              }`}>
                {project.status.replace('_', ' ')}
              </span>
            </td>
            {showReactivate && project.completed_at && (
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {format(new Date(project.completed_at), 'MMM d, yyyy')}
                </div>
              </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(project);
                  }}
                  className="text-[#1732ca] hover:text-[#1732ca]/80"
                  title="Edit project"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {project.status !== 'completed' ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onComplete(project);
                      }}
                      className="text-green-600 hover:text-green-700"
                      title="Mark as complete"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive(project);
                      }}
                      className="text-red-600 hover:text-red-700"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : showReactivate && onReactivate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReactivate(project);
                    }}
                    className="text-[#1732ca] hover:text-[#1732ca]/80"
                    title="Reactivate project"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {projects.length === 0 && (
          <tr>
            <td colSpan={showReactivate ? 7 : 6} className="px-6 py-4 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <Users className="w-8 h-8 mb-2 text-gray-400" />
                <p className="text-sm">No projects found</p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);