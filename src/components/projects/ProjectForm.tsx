import React, { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { Project, User, Client, ProjectStatus } from '../../types';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../utils/constants';

interface ProjectFormData {
  name: string;
  description: string;
  allocated_hours: number;
  assigned_users: string[];
  client_id: string;
  status: ProjectStatus;
}

interface ProjectFormProps {
  formData: ProjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProjectFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  users: User[];
  clients: Client[];
  editingProject: Project | null;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  saving,
  users,
  clients,
  editingProject,
}) => {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectAll, setSelectAll] = useState(false);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .order('full_name', { ascending: true });

        if (data) {
          // Sort alphabetically by full_name or username as fallback
          const sortedUsers = data.sort((a, b) => {
            const nameA = a.full_name || a.username;
            const nameB = b.full_name || b.username;
            return nameA.localeCompare(nameB);
          });

          setAvailableUsers(sortedUsers);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);
  const onSelectAll = () => {
    setSelectAll(prev => !prev)
    if (!selectAll) { // If not all selected, select all
      const allUserIds = availableUsers.map(user => user.id);
      setFormData(prev => ({ ...prev, assigned_users: allUserIds }));
    } else { // If all selected, deselect all
      setFormData(prev => ({ ...prev, assigned_users: [] }));
    }
  }
  const checkForSearchUser = (user: any) => {
    return (
      user.username.toLowerCase().includes(searchQuery) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchQuery)) ||
      (user.email && user.email.toLowerCase().includes(searchQuery)) ||
      (user.designation && user.designation.toLowerCase().includes(searchQuery))
    )
  }
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">
        {editingProject ? 'Edit Project' : 'Create New Project'}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              required
            />
          </div>

          <div>
            <label htmlFor="client" className="block text-sm font-medium text-gray-700">
              Client
            </label>
            <select
              id="client"
              value={formData.client_id}
              onChange={e => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              required
            >
              <option value="">Select a client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="allocated_hours" className="block text-sm font-medium text-gray-700">
              Allocated Hours
            </label>
            <input
              type="number"
              id="allocated_hours"
              value={formData.allocated_hours}
              onChange={e => setFormData(prev => ({ ...prev, allocated_hours: parseInt(e.target.value) }))}
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              required
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              required
            >
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign Users ({formData.assigned_users.length} selected)
          </label>
          <div className="mb-[0px] mt-[20px] flex items-baseline">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={"Search users..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1732ca] focus:border-[#1732ca] text-sm"
              />
            </div>
            <h3 onClick={() => onSelectAll()}
              style={{ color: !selectAll ? COLORS.blue1 : COLORS.terra1 }}
              className={`text-sm font-medium mb-4 items-center cursor-pointer ml-[20px]`}>{!selectAll ? 'Select All' : 'Deselect all'}</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md">
            {availableUsers.map(user => {
              if (searchQuery && !checkForSearchUser(user)) {
                return null; // Skip rendering this user if they don't match the search query
              }
              return (
                <label key={user.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.assigned_users.includes(user.id)}
                    onChange={e => {
                      setFormData(prev => ({
                        ...prev,
                        assigned_users: e.target.checked
                          ? [...prev.assigned_users, user.id]
                          : prev.assigned_users.filter(id => id !== user.id),
                      }));
                    }}
                    className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                  />
                  <span>{user.full_name || user.username}</span>
                  <span className="text-sm text-gray-500 capitalize">({user.role})</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </form>
    </div>
  );
};