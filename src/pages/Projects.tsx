import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ProjectForm } from '../components/projects/ProjectForm';
import { ProjectList } from '../components/projects/ProjectList';
import { ClientForm } from '../components/projects/ClientForm';
import { ClientList } from '../components/projects/ClientList';
import { FilterDialog } from '../components/projects/FilterDialog';
import { ConfirmationDialog } from '../components/shared/ConfirmationDialog';
import { ProjectDetailsModal } from '../components/projects/ProjectDetailsModal';
import type { Project, User, Client, ProjectStatus } from '../types';

interface ProjectFormData {
  name: string;
  description: string;
  allocated_hours: number;
  assigned_users: string[];
  client_id: string;
  status: ProjectStatus;
}

export const Projects = () => {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    allocated_hours: 0,
    assigned_users: [],
    client_id: '',
    status: 'active',
  });
  const [clientFormData, setClientFormData] = useState({
    name: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    clients: [] as string[],
    status: [] as string[],
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'name',
    direction: 'asc' as 'asc' | 'desc'
  });
  const [confirmation, setConfirmation] = useState({
    show: false,
    title: '',
    message: '',
    action: async () => {},
  });
  const [selectedProject, setSelectedProject] = useState<(Project & { users?: User[], totalHoursUsed?: number }) | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const [projectsResponse, usersResponse, clientsResponse] = await Promise.all([
          supabase
            .from('projects')
            .select(`
              *,
              client:clients(*)
            `)
            .order('created_at', { ascending: false }),
          supabase
            .from('users')
            .select('*')
            .neq('role', 'admin'),
          supabase
            .from('clients')
            .select('*')
            .order('name')
        ]);

        if (projectsResponse.data) {
          const activeProjects = projectsResponse.data.filter(p => p.status !== 'completed');
          const completed = projectsResponse.data.filter(p => p.status === 'completed');
          setProjects(activeProjects);
          setCompletedProjects(completed);
        }
        setUsers(usersResponse.data || []);
        setClients(clientsResponse.data || []);
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filterProjects = (projects: Project[]) => {
    return projects.filter(project => {
      // Search filter
      const searchMatch = !searchQuery || 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client?.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Client filter
      const clientMatch = filterOptions.clients.length === 0 || 
        filterOptions.clients.includes(project.client_id);

      // Status filter
      const statusMatch = filterOptions.status.length === 0 || 
        filterOptions.status.includes(project.status);

      return searchMatch && clientMatch && statusMatch;
    });
  };

  const sortProjects = (projects: Project[]) => {
    return [...projects].sort((a, b) => {
      let valueA, valueB;

      switch (sortConfig.field) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'client.name':
          valueA = (a.client?.name || '').toLowerCase();
          valueB = (b.client?.name || '').toLowerCase();
          break;
        default:
          valueA = a[sortConfig.field as keyof Project];
          valueB = b[sortConfig.field as keyof Project];
      }

      if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setConfirmation({
      show: true,
      title: editingProject ? 'Update Project' : 'Create Project',
      message: editingProject 
        ? `Are you sure you want to update "${formData.name}"?`
        : `Are you sure you want to create project "${formData.name}"?`,
      action: async () => {
        setSaving(true);
        setError('');

        try {
          if (editingProject) {
            // Set completed_at when status changes to completed
            const completed_at = formData.status === 'completed' 
              ? new Date().toISOString() 
              : formData.status === 'active' || formData.status === 'on_hold' 
                ? null 
                : editingProject.completed_at;

            const { error: updateError } = await supabase
              .from('projects')
              .update({
                name: formData.name,
                description: formData.description,
                allocated_hours: formData.allocated_hours,
                client_id: formData.client_id,
                status: formData.status,
                completed_at,
                updated_at: new Date().toISOString(),
              })
              .eq('id', editingProject.id);

            if (updateError) throw updateError;

            await supabase
              .from('project_users')
              .delete()
              .eq('project_id', editingProject.id);

            if (formData.assigned_users.length > 0) {
              await supabase
                .from('project_users')
                .insert(
                  formData.assigned_users.map(userId => ({
                    project_id: editingProject.id,
                    user_id: userId,
                  }))
                );
            }
          } else {
            const { data: newProject, error: createError } = await supabase
              .from('projects')
              .insert({
                name: formData.name,
                description: formData.description,
                allocated_hours: formData.allocated_hours,
                client_id: formData.client_id,
                created_by: user.id,
                status: formData.status,
                completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
              })
              .select()
              .single();

            if (createError) throw createError;

            if (newProject && formData.assigned_users.length > 0) {
              await supabase
                .from('project_users')
                .insert(
                  formData.assigned_users.map(userId => ({
                    project_id: newProject.id,
                    user_id: userId,
                  }))
                );
            }
          }

          const { data: updatedProjects } = await supabase
            .from('projects')
            .select(`
              *,
              client:clients(*)
            `)
            .order('created_at', { ascending: false });

          if (updatedProjects) {
            const activeProjects = updatedProjects.filter(p => p.status !== 'completed');
            const completed = updatedProjects.filter(p => p.status === 'completed');
            setProjects(activeProjects);
            setCompletedProjects(completed);
          }
          setShowForm(false);
          resetForm();
        } catch (error) {
          console.error('Error saving project:', error);
          setError(error instanceof Error ? error.message : 'Failed to save project');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleEdit = async (project: Project) => {
    try {
      const { data: assignments } = await supabase
        .from('project_users')
        .select('user_id')
        .eq('project_id', project.id);

      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        allocated_hours: project.allocated_hours,
        assigned_users: assignments?.map(a => a.user_id) || [],
        client_id: project.client_id || '',
        status: project.status,
      });
      setShowForm(true);
    } catch (error) {
      console.error('Error in handleEdit:', error);
      setError(error instanceof Error ? error.message : 'Failed to load project details');
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientFormData({
      name: client.name,
      description: client.description || '',
    });
    setShowClientForm(true);
  };

  const handleCreateOrEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setConfirmation({
      show: true,
      title: editingClient ? 'Update Client' : 'Create Client',
      message: editingClient
        ? `Are you sure you want to update "${clientFormData.name}"?`
        : `Are you sure you want to create client "${clientFormData.name}"?`,
      action: async () => {
        setSaving(true);
        setError('');

        try {
          if (editingClient) {
            const { error: updateError } = await supabase
              .from('clients')
              .update({
                name: clientFormData.name,
                description: clientFormData.description,
                updated_at: new Date().toISOString(),
              })
              .eq('id', editingClient.id);

            if (updateError) throw updateError;
          } else {
            const { error: createError } = await supabase
              .from('clients')
              .insert({
                name: clientFormData.name,
                description: clientFormData.description,
                created_by: user.id,
              });

            if (createError) throw createError;
          }

          const { data: updatedClients } = await supabase
            .from('clients')
            .select('*')
            .order('name');

          setClients(updatedClients || []);
          setShowClientForm(false);
          setEditingClient(null);
          setClientFormData({ name: '', description: '' });
        } catch (error) {
          console.error('Error saving client:', error);
          setError(error instanceof Error ? error.message : 'Failed to save client');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      allocated_hours: 0,
      assigned_users: [],
      client_id: '',
      status: 'active',
    });
    setEditingProject(null);
    setError('');
  };

  const handleDeleteProject = (project: Project) => {
    setConfirmation({
      show: true,
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
      action: async () => {
        try {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', project.id);

          if (error) throw error;

          setProjects(prev => prev.filter(p => p.id !== project.id));
        } catch (error) {
          console.error('Error deleting project:', error);
          setError('Failed to delete project');
        }
      },
    });
  };

  const handleCompleteProject = (project: Project) => {
    setConfirmation({
      show: true,
      title: 'Complete Project',
      message: `Are you sure you want to mark "${project.name}" as complete? This will move it to the completed projects section.`,
      action: async () => {
        try {
          const { error } = await supabase
            .from('projects')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', project.id);

          if (error) throw error;

          setProjects(prev => prev.filter(p => p.id !== project.id));
          setCompletedProjects(prev => [{ ...project, status: 'completed', completed_at: new Date().toISOString() }, ...prev]);
        } catch (error) {
          console.error('Error completing project:', error);
          setError('Failed to complete project');
        }
      },
    });
  };

  const handleReactivateProject = (project: Project) => {
    setConfirmation({
      show: true,
      title: 'Reactivate Project',
      message: `Are you sure you want to reactivate "${project.name}"? This will move it back to active projects.`,
      action: async () => {
        try {
          const { error } = await supabase
            .from('projects')
            .update({ 
              status: 'active',
              completed_at: null
            })
            .eq('id', project.id);

          if (error) throw error;

          setCompletedProjects(prev => prev.filter(p => p.id !== project.id));
          setProjects(prev => [{ ...project, status: 'active', completed_at: null }, ...prev]);
        } catch (error) {
          console.error('Error reactivating project:', error);
          setError('Failed to reactivate project');
        }
      },
    });
  };

  const handleProjectClick = async (project: Project) => {
    try {
      // Fetch users assigned to this project
      const { data: projectUsers } = await supabase
        .from('project_users')
        .select('user:users(*)')
        .eq('project_id', project.id);
      
      // Fetch total hours used for this project
      const { data: timesheets } = await supabase
        .from('timesheets')
        .select('total_hours')
        .eq('project_id', project.id)
        .neq('status', 'rejected');
      
      const users = projectUsers?.map(pu => pu.user) || [];
      const totalHoursUsed = timesheets?.reduce((sum, timesheet) => sum + (timesheet.total_hours || 0), 0) || 0;
      
      setSelectedProject({
        ...project,
        users,
        totalHoursUsed
      });
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600">
        <AlertCircle className="w-12 h-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm">Only administrators and managers can access this page.</p>
      </div>
    );
  }

  const filteredProjects = filterProjects(projects);
  const sortedProjects = sortProjects(filteredProjects);

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-full w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowClients(!showClients)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Building2 className="w-4 h-4" />
            {showClients ? 'Show Projects' : 'Show Clients'}
          </button>
          {showClients ? (
            <button
              onClick={() => setShowClientForm(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
            >
              <Plus className="w-4 h-4" />
              New Client
            </button>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {showClientForm ? (
        <ClientForm
          formData={clientFormData}
          setFormData={setClientFormData}
          onSubmit={handleCreateOrEditClient}
          onCancel={() => {
            setShowClientForm(false);
            setEditingClient(null);
            setClientFormData({ name: '', description: '' });
          }}
          saving={saving}
          editingClient={editingClient}
        />
      ) : showForm ? (
        <ProjectForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreateOrEdit}
          onCancel={() => {
            setShowForm(false);
            resetForm();
          }}
          saving={saving}
          users={users}
          clients={clients}
          editingProject={editingProject}
        />
      ) : showClients ? (
        <ClientList
          clients={clients}
          projects={projects}
          onEdit={handleEditClient}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1732ca] focus:border-[#1732ca] text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilterDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Filter className="w-5 h-5" />
              Filter
            </button>
          </div>

          <div className="space-y-8">
            <ProjectList
              title="Active Projects"
              projects={sortedProjects}
              onEdit={handleEdit}
              onArchive={handleDeleteProject}
              onComplete={handleCompleteProject}
              onSelect={handleProjectClick}
              onSort={handleSort}
              sortConfig={sortConfig}
            />

            {completedProjects.length > 0 && (
              <ProjectList
                title="Completed Projects"
                projects={completedProjects}
                onEdit={handleEdit}
                onArchive={handleDeleteProject}
                onComplete={handleCompleteProject}
                onSelect={handleProjectClick}
                onSort={handleSort}
                sortConfig={sortConfig}
                showReactivate={true}
                onReactivate={handleReactivateProject}
              />
            )}
          </div>
        </div>
      )}

      <FilterDialog
        show={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        filterOptions={filterOptions}
        setFilterOptions={setFilterOptions}
        clients={clients}
      />

      <ConfirmationDialog
        show={confirmation.show}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={async () => {
          await confirmation.action();
          setConfirmation(prev => ({ ...prev, show: false }));
        }}
        onCancel={() => setConfirmation(prev => ({ ...prev, show: false }))}
      />

      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};