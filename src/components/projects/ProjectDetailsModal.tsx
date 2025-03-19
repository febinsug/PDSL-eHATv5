import React, { useState, useEffect } from 'react';
import { X, User, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Project, User as UserType } from '../../types';

interface ProjectDetailsModalProps {
  project: Project & { 
    users?: UserType[],
    totalHoursUsed?: number
  };
  onClose: () => void;
}

interface UserWithHours extends UserType {
  hoursUsed: number;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({ project, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [usersWithHours, setUsersWithHours] = useState<UserWithHours[]>([]);
  const utilization = project.totalHoursUsed 
    ? (project.totalHoursUsed / project.allocated_hours) * 100 
    : 0;

  useEffect(() => {
    const fetchUserHours = async () => {
      try {
        if (!project.users || project.users.length === 0) {
          setLoading(false);
          return;
        }

        const userIds = project.users.map(user => user.id);
        
        // Fetch hours for each user in this project
        const { data: timesheetData } = await supabase
          .from('timesheets')
          .select('user_id, total_hours')
          .eq('project_id', project.id)
          .in('user_id', userIds)
          .neq('status', 'rejected');

        // Calculate total hours per user
        const userHoursMap: Record<string, number> = {};
        timesheetData?.forEach(timesheet => {
          const userId = timesheet.user_id;
          userHoursMap[userId] = (userHoursMap[userId] || 0) + (timesheet.total_hours || 0);
        });

        // Combine user data with hours
        const enhancedUsers = project.users.map(user => ({
          ...user,
          hoursUsed: userHoursMap[user.id] || 0
        }));

        // Sort users by hours used (descending)
        enhancedUsers.sort((a, b) => b.hoursUsed - a.hoursUsed);
        
        setUsersWithHours(enhancedUsers);
      } catch (error) {
        console.error('Error fetching user hours:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserHours();
  }, [project.id, project.users]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 flex-1">
          {/* Project Details */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Description</p>
            <p className="text-gray-900">{project.description || 'No description provided'}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Used</p>
              <p className="text-2xl font-semibold">{project.totalHoursUsed || 0}h</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Allocated</p>
              <p className="text-2xl font-semibold">{project.allocated_hours}h</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Utilization</p>
              <p 
                className={`text-2xl font-semibold ${
                  utilization > 100 ? 'text-red-500' : 'text-emerald-500'
                }`}
              >
                {utilization.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Client Info */}
          {project.client && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Client</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{project.client.name}</p>
                <p className="text-sm text-gray-500 mt-1">{project.client.description || 'No description'}</p>
              </div>
            </div>
          )}

          {/* Team Members */}
          <h3 className="text-sm font-medium text-gray-500 mb-4">TEAM MEMBERS</h3>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : usersWithHours.length > 0 ? (
              usersWithHours.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-blue-700 font-medium">
                        {(user.full_name || user.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.full_name || user.username}</p>
                      {user.designation && (
                        <p className="text-xs text-gray-500">{user.designation}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{user.hoursUsed}h</p>
                    <p className="text-xs text-gray-500">
                      {((user.hoursUsed / project.allocated_hours) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No team members assigned</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 