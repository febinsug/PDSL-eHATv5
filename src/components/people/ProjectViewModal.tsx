import React from 'react';
import { X } from 'lucide-react';
import type { User, Project } from '../../types';

interface ProjectViewModalProps {
  user: User & { projects?: Project[] };
  onClose: () => void;
}

export const ProjectViewModal: React.FC<ProjectViewModalProps> = ({ user, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Projects for {user.full_name || user.username}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-4">
        {user.projects && user.projects.length > 0 ? (
          user.projects.map(project => (
            <div key={project.id} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">{project.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{project.description || 'No description'}</p>
              <p className="text-sm text-gray-600 mt-2">Allocated Hours: {project.allocated_hours}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">No projects assigned</p>
        )}
      </div>
    </div>
  </div>
);