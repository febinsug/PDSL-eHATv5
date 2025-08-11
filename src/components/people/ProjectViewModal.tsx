import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { User, Project } from '../../types';
import { supabase } from '../../lib/supabase';
import { ProjectDetailsModal } from '../projects/ProjectDetailsModal';
import { format } from 'date-fns';

interface ProjectViewModalProps {
  user: User & { projects?: Project[] };
  onClose: () => void;
}

type ProjectData = {
  id: string
  name: string
  description: string
  total_hours: number
  allocated_hours: number
  client_id: string
  completed_at: string
  status: string
  assigned_at?: string
}

export const ProjectViewModal: React.FC<ProjectViewModalProps> = ({ user, onClose }) => {
  useEffect(() => {
    fetchUserDetailedHours(user)
  }, [user]);

  const [projectArr, setProjectArr] = useState<ProjectData[]>([])
  const [selectedProject, setSelectedProject] = useState<(Project & { users?: User[], totalHoursUsed?: number }) | null>(null);

  const fetchUserDetailedHours = async (userData: any) => {
    try {


      const { data: projectList, error: projectListError } = await supabase
        .from('project_users')
        .select(`
          assigned_at,
          project_id, 
          projects (
            name,
            description,
            allocated_hours,
            client_id,
            status,
            completed_at
          )`
        )
        .eq('user_id', userData.id)

      if (projectListError) {
        console.error('Error fetching data:', projectListError)
        return
      }

      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          total_hours,
          project_id,
          projects (
            name,
            description,
            allocated_hours,
            client_id,
            status,
            completed_at
          )
        `)
        .eq('user_id', userData.id)
        .neq('status', 'rejected');

      if (error) {
        console.error('Error fetching data:', error)
        return
      }


      const groupedArray = Object.values(
        data.reduce((acc: any, row: any) => {
          const key = row.project_id
          if (!acc[key]) {
            acc[key] = {
              id: row.project_id,
              name: row.projects.name,
              description: row.projects.description,
              allocated_hours: row.projects.allocated_hours,
              client_id: row.projects.client_id,
              total_hours: 0,
              status: row.projects.status,
              completed_at: row.projects.completed_at
            }
          }
          acc[key].total_hours += row.total_hours
          return acc
        }, {} as Record<string, ProjectData>)
      ) as ProjectData[]

      console.log(groupedArray, 'timesheetsData', data)
      projectList.map((k: any) => {
        if (k.project_id && !groupedArray.find((p: any) => p.id === k.project_id)) {
          groupedArray.push({
            id: k.project_id,
            name: k.projects?.name || 'Unknown Project',
            description: k.projects?.description || 'No description',
            allocated_hours: k.projects?.allocated_hours || 0,
            client_id: k.projects?.client_id || '',
            total_hours: 0,
            status: k.projects?.status || 'Not started',
            completed_at: k.projects?.completed_at || '',
            assigned_at: k.assigned_at || ''
          })
        } else {
          const existingProject = groupedArray.find((p: any) => p.id === k.project_id);
          if (existingProject && k.assigned_at) {
            existingProject.assigned_at = k.assigned_at;
          }
        }
      })
      if (groupedArray && groupedArray.length) {
        setProjectArr(groupedArray)
      }

      // return Object.values(grouped)
      //.eq('year', year);


      if (error) {
        console.error('Error fetching user timesheets:', error);
        return null;
      }



    } catch (error) {
      console.error('Error fetching detailed user hours:', error);
      return null;
    }
  };
  const onSelectProject = async (project: any) => {
    console.log(project, user)

    const { data, error } = await supabase
      .from('clients')
      .select("*")
      .eq('id', project.client_id)
      .single();

    if (error) {
      console.error('Error fetching project & client:', error);
      return;
    }

    console.log(data)
    let obj = {
      allocated_hours: project.allocated_hours,
      client_id: project.client_id,
      completed_at: project.completed_at,
      created_at: "",
      created_by: "",
      description: project.description,
      id: project.id,
      name: project.name,
      status: project.status,
      totalHoursUsed: project.total_hours,
      users: [user],
      client: data
    }
    setSelectedProject(obj)
    console.log(obj, 'obj')
  }
  return (
    <div>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between mb-4 sticky top-30">
            {/* <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl"> */}
            <div>
              <h3 className="text-lg font-semibold">{user.full_name || user.username}</h3>
              {projectArr && projectArr.length &&
                <p className="text-sm text-gray-500">Total hours: {projectArr.reduce(
                  (sum, item) => sum + item.total_hours,
                  0
                )} hr</p>
              }
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Scrollable Content */}
          <div className="overflow-y-auto space-y-4 flex-1">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Total Projects Assigned : {projectArr && projectArr.length || 0}</h4>
            {projectArr && projectArr.length > 0 ? (
              projectArr.map((project: any) => (
                <div
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    onSelectProject(project);
                  }}
                  key={project.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center hover:bg-[#1732ca10] cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500">{project.description || 'No description'}</p>
                    <p className="text-sm text-gray-500">Assigned On: {format(project.assigned_at,"dd MMM yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Total Hours: {project.total_hours} hr</p>
                    <p className="text-sm text-gray-500">Allocated Hours: {project.allocated_hours} hr</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No projects assigned</p>
            )}
          </div>
        </div>
      </div>
      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};
