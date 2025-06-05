import React from 'react';
import { Briefcase } from 'lucide-react';
import type { ProjectWithUtilization } from '../../types';

interface ProjectUtilizationProps {
  projects: ProjectWithUtilization[];
  onProjectClick: (project: ProjectWithUtilization) => void;
}

export const ProjectUtilization: React.FC<ProjectUtilizationProps> = ({ projects, onProjectClick }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Utilization</h2>
    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
      {projects.length > 0 ? (
        [...projects].sort((a, b) => a.name.localeCompare(b.name)).map(project => {
          const noAllocation = !project.allocated_hours || project.allocated_hours === 0;
          return (
            <div 
              key={project.id} 
              className="space-y-2 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
              onClick={() => onProjectClick(project)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#1732ca]/10 rounded-lg">
                    <Briefcase className="w-5 h-5 text-[#1732ca]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium mb-0">{project.name}</p>
                      {project.client?.name && (
                        <span className="text-xs text-gray-400 font-normal">({project.client.name})</span>
                      )}
                    </div>
                    {noAllocation ? (
                      <p className="text-sm text-gray-500">{project.totalHours} hours logged</p>
                    ) : (
                      <p className="text-sm text-gray-500">{project.totalHours} / {project.allocated_hours} hours</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {noAllocation ? (
                    <p className="text-sm font-medium text-yellow-600 flex items-center gap-1">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4 text-yellow-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z' /></svg>
                      No allocation set
                    </p>
                  ) : (
                    <>
                      <p className="font-medium">{project.utilization.toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">Utilization</p>
                    </>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: noAllocation ? '50%' : `${Math.min(project.utilization || 0, 100)}%`,
                    backgroundColor: noAllocation ? '#d1d5db' : (project.utilization > 100 ? '#ef4444' : project.utilization > 90 ? '#f97316' : project.utilization > 70 ? '#22c55e' : '#86efac')
                  }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No active projects with hours logged this month</p>
        </div>
      )}
    </div>
  </div>
);