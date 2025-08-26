import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, AlertCircle, Loader2, Users, Eye, Search, Clock, Trash2, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { TeamViewModal } from '../components/people/TeamViewModal';
import { ProjectViewModal } from '../components/people/ProjectViewModal';
import { UserDetailsModal } from '../components/people/UserDetailsModal';
import { UserFormModal } from '../components/people/UserFormModal';
import { DepartmentList } from '../components/people/DepartmentList';
import { DepartmentFormModal } from '../components/people/DepartmentFormModal';
import { DepartmentViewModal } from '../components/people/DepartmentViewModal';
import { ConfirmationDialog } from '../components/shared/ConfirmationDialog';
import type { User, Project, Department } from '../types';

interface UserWithProjects extends User {
  projects: Project[];
  team?: User[];
  manager?: User;
}

interface UserFormData {
  username: string;
  password: string;
  full_name: string;
  email: string;
  role: 'user' | 'manager';
  manager_id: string;
  department_id: string;
  designation: string;
}

interface DepartmentFormData {
  name: string;
  description: string;
  assigned_users: string[];
}

export const People = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserWithProjects[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithProjects[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedManager, setSelectedManager] = useState<UserWithProjects | null>(null);
  const [viewingProjects, setViewingProjects] = useState<UserWithProjects | null>(null);
  const [viewingUserDetails, setViewingUserDetails] = useState<UserWithProjects | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [showDepartmentList, setShowDepartmentList] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(null);
  const [confirmation, setConfirmation] = useState({
    show: false,
    title: '',
    message: '',
    action: async () => { },
  });


  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.role === 'admin') return;

      try {
        // Fetch users, their projects, and departments
        console.log("Fetching users and departments...");
        const [usersResponse, projectUsersResponse, departmentsResponse] = await Promise.all([
          supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('project_users')
            .select('user_id, project:projects(*)'),
          supabase
            .from('departments')
            .select('*')
            .order('name')
        ]);

        if (usersResponse.data) {
          // Create a map of user projects
          const userProjects = new Map<string, Project[]>();
          projectUsersResponse.data?.forEach(pu => {
            if (!userProjects.has(pu.user_id)) {
              userProjects.set(pu.user_id, []);
            }
            userProjects.get(pu.user_id)?.push(pu.project);
          });

          // Create team map
          const teamMap = new Map<string, User[]>();
          usersResponse.data.forEach(user => {
            if (user.manager_id) {
              const team = teamMap.get(user.manager_id) || [];
              team.push(user);
              teamMap.set(user.manager_id, team);
            }
          });

          // Sort teams alphabetically by full_name or username
          teamMap.forEach((team, managerId) => {
            teamMap.set(managerId, team.sort((a, b) => {
              const nameA = a.full_name || a.username;
              const nameB = b.full_name || b.username;
              return nameA.localeCompare(nameB);
            }));
          });

          const usersWithDetails = usersResponse.data.map(user => ({
            ...user,
            projects: userProjects.get(user.id) || [],
            team: teamMap.get(user.id) || [],
            manager: usersResponse.data.find(u => u.id === user.manager_id)
          }));
          console.log("usersWithDetails", usersWithDetails);
          setUsers(usersWithDetails);
          setFilteredUsers(usersWithDetails);
        }

        if (departmentsResponse.data) {
          setDepartments(departmentsResponse.data);
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  useEffect(() => {
    const filtered = users.filter(user => {
      const searchStr = searchQuery.toLowerCase();
      return (
        user.username.toLowerCase().includes(searchStr) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchStr)) ||
        (user.email && user.email.toLowerCase().includes(searchStr)) ||
        (user.designation && user.designation.toLowerCase().includes(searchStr))
      );
    });
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const handleCreateUser = async (userData: UserFormData) => {
    try {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          username: userData.username,
          password_hash: userData.password,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          manager_id: userData.manager_id || null,
          department_id: userData.department_id || null,
          designation: userData.designation,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update local state
      const userWithDetails = {
        ...newUser,
        projects: [],
        team: [],
        manager: users.find(u => u.id === userData.manager_id),
      };

      setUsers(prev => [userWithDetails, ...prev]);
      setFilteredUsers(prev => [userWithDetails, ...prev]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const handleUpdateUser = async (userData: UserFormData) => {
    if (!editingUser) return;

    try {
      const updateData: Partial<User> = {
        username: userData.username,
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        manager_id: userData.manager_id || null,
        department_id: userData.department_id || null,
        designation: userData.designation,
      };

      if (userData.password) {
        updateData.password_hash = userData.password;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) throw error;

      // Update local state
      const updatedUser = {
        ...editingUser,
        ...updateData,
        manager: users.find(u => u.id === userData.manager_id),
      };

      setUsers(prev =>
        prev.map(user =>
          user.id === editingUser.id
            ? { ...user, ...updatedUser }
            : user
        )
      );

      setFilteredUsers(prev =>
        prev.map(user =>
          user.id === editingUser.id
            ? { ...user, ...updatedUser }
            : user
        )
      );

      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const handleCreateDepartment = async (data: DepartmentFormData) => {
    if (!currentUser) return;

    try {
      // Create department
      const { data: newDepartment, error: createError } = await supabase
        .from('departments')
        .insert({
          name: data.name,
          description: data.description,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update user department assignments
      if (data.assigned_users.length > 0) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ department_id: newDepartment.id })
          .in('id', data.assigned_users);

        if (updateError) throw updateError;
      }

      // Update local state
      setDepartments(prev => [...prev, newDepartment]);
      setUsers(prev =>
        prev.map(user =>
          data.assigned_users.includes(user.id)
            ? { ...user, department_id: newDepartment.id }
            : user
        )
      );
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  };

  const handleUpdateDepartment = async (data: DepartmentFormData) => {
    if (!editingDepartment) return;

    try {
      // Update department
      const { error: updateError } = await supabase
        .from('departments')
        .update({
          name: data.name,
          description: data.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingDepartment.id);

      if (updateError) throw updateError;

      // Update user assignments
      const { error: clearError } = await supabase
        .from('users')
        .update({ department_id: null })
        .eq('department_id', editingDepartment.id);

      if (clearError) throw clearError;

      if (data.assigned_users.length > 0) {
        const { error: assignError } = await supabase
          .from('users')
          .update({ department_id: editingDepartment.id })
          .in('id', data.assigned_users);

        if (assignError) throw assignError;
      }

      // Update local state
      setDepartments(prev =>
        prev.map(dept =>
          dept.id === editingDepartment.id
            ? { ...dept, name: data.name, description: data.description }
            : dept
        )
      );

      setUsers(prev =>
        prev.map(user => ({
          ...user,
          department_id: data.assigned_users.includes(user.id)
            ? editingDepartment.id
            : user.department_id === editingDepartment.id
              ? null
              : user.department_id
        }))
      );

      setEditingDepartment(null);
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  };

  const handleDeleteDepartment = async (department: Department) => {
    if (!currentUser) return;

    try {
      // First update all users to remove the department reference
      const { error: updateError } = await supabase
        .from('users')
        .update({ department_id: null })
        .eq('department_id', department.id);

      if (updateError) throw updateError;

      // Then delete the department
      const { error: deleteError } = await supabase
        .from('departments')
        .delete()
        .eq('id', department.id);

      if (deleteError) throw deleteError;

      // Update local state
      setDepartments(prev => prev.filter(d => d.id !== department.id));
      setUsers(prev =>
        prev.map(user =>
          user.department_id === department.id
            ? { ...user, department_id: null }
            : user
        )
      );
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      setError("You cannot delete your own account");
      return;
    }

    setConfirmation({
      show: true,
      title: 'Delete User',
      message: `Are you sure you want to delete ${user.full_name || user.username}? This action cannot be undone.`,
      action: async () => {
        try {
          // Delete user's timesheets
          await supabase
            .from('timesheets')
            .delete()
            .eq('user_id', user.id);

          // Delete user's project assignments
          await supabase
            .from('project_users')
            .delete()
            .eq('user_id', user.id);

          // Delete the user
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id);

          if (error) throw error;

          // Update local state
          setUsers(prev => prev.filter(u => u.id !== user.id));
          setFilteredUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (error) {
          console.error('Error deleting user:', error);
          setError('Failed to delete user');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600">
        <AlertCircle className="w-12 h-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm">Only administrators can access this page.</p>
      </div>
    );
  }

  const managers = filteredUsers.filter(u => u.role === 'manager');
  const employees = filteredUsers.filter(u => u.role === 'user');
  const adminUsers = filteredUsers.filter(u => u.role === 'admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingUser(null);
              setShowUserForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
          <button
            onClick={() => setShowDepartmentList(!showDepartmentList)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Building2 className="w-5 h-5" />
            {showDepartmentList ? 'Show Users' : 'Manage Departments'}
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={showDepartmentList ? "Search departments..." : "Search users..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1732ca] focus:border-[#1732ca] text-sm"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {showDepartmentList ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingDepartment(null);
                setShowDepartmentForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
            >
              <Building2 className="w-5 h-5" />
              Add Department
            </button>
          </div>
          <DepartmentList
            departments={departments}
            users={users}
            onEdit={(department) => {
              setEditingDepartment(department);
              setShowDepartmentForm(true);
            }}
            onViewUsers={(department) => setViewingDepartment(department)}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Managers Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Managers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team Size
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {managers.map(manager => (
                    <tr key={manager.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#1732ca]/10 flex items-center justify-center">
                            <span className="text-[#1732ca] font-medium">
                              {(manager.full_name || manager.username)[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {manager.full_name || manager.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {manager.designation || 'Manager'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{manager.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {departments.find(d => d.id === manager.department_id)?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{manager.team?.length || 0} members</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(manager);
                              setShowUserForm(true);
                            }}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="Edit manager"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedManager(manager)}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="View team members"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingProjects(manager)}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="View active projects"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingUserDetails(manager)}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="View hours"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(manager)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete manager"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {managers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No managers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employees Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Employees</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map(employee => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#1732ca]/10 flex items-center justify-center">
                            <span className="text-[#1732ca] font-medium">
                              {(employee.full_name || employee.username)[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.full_name || employee.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.designation || 'Employee'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {departments.find(d => d.id === employee.department_id)?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {employee.manager ? (
                            employee.manager.full_name || employee.manager.username
                          ) : (
                            '-'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(employee);
                              setShowUserForm(true);
                            }}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="Edit employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingProjects(employee)}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="View active projects"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingUserDetails(employee)}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="View hours"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(employee)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Admin</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminUsers.map(admin => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#1732ca]/10 flex items-center justify-center">
                            <span className="text-[#1732ca] font-medium">
                              {(admin.full_name || admin.username)[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {admin.full_name || admin.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {admin.designation || 'Adminstrator'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{admin.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {departments.find(d => d.id === admin.department_id)?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(admin);
                              setShowUserForm(true);
                            }}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="Edit manager"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingProjects(admin)}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="View active projects"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingUserDetails(admin)}
                            className="text-[#1732ca] hover:text-[#1732ca]/80"
                            title="View hours"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(admin)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete manager"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {adminUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No Admins found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedManager && (
        <TeamViewModal
          manager={selectedManager}
          onClose={() => setSelectedManager(null)}
        />
      )}

      {viewingProjects && (
        <ProjectViewModal
          user={viewingProjects}
          onClose={() => setViewingProjects(null)}
        />
      )}

      {viewingUserDetails && (
        <UserDetailsModal
          user={viewingUserDetails}
          onClose={() => setViewingUserDetails(null)}
        />
      )}

      {showUserForm && (
        <UserFormModal
          show={showUserForm}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
          onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
          managers={managers}
          departments={departments}
          editingUser={editingUser}
        />
      )}

      {showDepartmentForm && (
        <DepartmentFormModal
          show={showDepartmentForm}
          onClose={() => {
            setShowDepartmentForm(false);
            setEditingDepartment(null);
          }}
          onSubmit={editingDepartment ? handleUpdateDepartment : handleCreateDepartment}
          onDelete={handleDeleteDepartment}
          users={users}
          editingDepartment={editingDepartment}
        />
      )}

      {viewingDepartment && (
        <DepartmentViewModal
          department={viewingDepartment}
          users={users.filter(u => u.department_id === viewingDepartment.id)}
          onClose={() => setViewingDepartment(null)}
        />
      )}

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


    </div>
  );
};