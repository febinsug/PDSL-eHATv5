import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import type { User, Department } from '../../types';

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

interface UserFormModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  managers: User[];
  departments: Department[];
  editingUser?: User | null;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  show,
  onClose,
  onSubmit,
  managers,
  departments,
  editingUser
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'user',
    manager_id: '',
    department_id: '',
    designation: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username,
        password: '',
        full_name: editingUser.full_name || '',
        email: editingUser.email || '',
        role: editingUser.role === 'manager' ? 'manager' : 'user',
        manager_id: editingUser.manager_id || '',
        department_id: editingUser.department_id || '',
        designation: editingUser.designation || '',
      });
    }
  }, [editingUser]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-lg z-10">
          <h3 className="text-lg font-semibold">{editingUser ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
                required
              />
            </div>

            {!editingUser && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
                  required={!editingUser}
                />
              </div>
            )}

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as 'user' | 'manager' }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
                required
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                id="department"
                value={formData.department_id}
                onChange={e => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              >
                <option value="">No Department</option>
                {departments.map(department => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="designation" className="block text-sm font-medium text-gray-700">
                Designation
              </label>
              <input
                type="text"
                id="designation"
                value={formData.designation}
                onChange={e => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
                placeholder="e.g. Senior Developer"
              />
            </div>

            <div>
              <label htmlFor="manager" className="block text-sm font-medium text-gray-700">
                Manager
              </label>
              <select
                id="manager"
                value={formData.manager_id}
                onChange={e => setFormData(prev => ({ ...prev, manager_id: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              >
                <option value="">No Manager</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name || manager.username}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        <div className="p-6 border-t sticky bottom-0 bg-white rounded-b-lg">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};