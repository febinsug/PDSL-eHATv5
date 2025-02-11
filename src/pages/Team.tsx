import React, { useState, useEffect } from 'react';
import { Users, Briefcase, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { User, Project } from '../types';

interface TeamMember extends User {
  projects: Project[];
}

export const Team = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [expandedMembers, setExpandedMembers] = useState<string[]>([]);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!user || user.role !== 'manager') return;

      try {
        // Fetch team members
        const { data: members, error: membersError } = await supabase
          .from('users')
          .select('*')
          .eq('manager_id', user.id);

        if (membersError) throw membersError;

        // Fetch project assignments for each team member
        const membersWithProjects = await Promise.all(
          (members || []).map(async (member) => {
            const { data: projectAssignments } = await supabase
              .from('project_users')
              .select('project:projects(*)')
              .eq('user_id', member.id);

            return {
              ...member,
              projects: projectAssignments?.map(pa => pa.project) || [],
            };
          })
        );

        setTeamMembers(membersWithProjects);
      } catch (error) {
        console.error('Error fetching team:', error);
        setError('Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [user]);

  const toggleMember = (memberId: string) => {
    setExpandedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
      </div>
    );
  }

  if (!user || user.role !== 'manager') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600">
        <AlertCircle className="w-12 h-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm">Only managers can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your Team</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1732ca]/10 rounded-lg">
              <Users className="w-5 h-5 text-[#1732ca]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {teamMembers.length > 0 ? (
            teamMembers.map(member => (
              <div key={member.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#1732ca]/10 flex items-center justify-center">
                      <span className="text-[#1732ca] text-lg font-semibold">
                        {(member.full_name || member.username)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {member.full_name || member.username}
                      </h3>
                      <p className="text-sm text-gray-500">{member.email || 'No email'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMember(member.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {expandedMembers.includes(member.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {expandedMembers.includes(member.id) && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Assigned Projects</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {member.projects.length > 0 ? (
                        member.projects.map(project => (
                          <div key={project.id} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[#1732ca]/10 rounded-lg">
                                <Briefcase className="w-4 h-4 text-[#1732ca]" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{project.name}</p>
                                <p className="text-sm text-gray-500">
                                  {project.allocated_hours} hours allocated
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-4 text-gray-500">
                          No projects assigned
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No team members found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};