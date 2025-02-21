import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, X, Trash2 } from 'lucide-react';
import type { Department, User } from '../../types';

interface DepartmentFormData {
  name: string;
  description: string;
  assigned_users: string[];
}

interface DepartmentFormModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  onDelete?: (department: Department) => Promise<void>;
  users: User[];
  editingDepartment?: Department | null;
}

export const DepartmentFormModal: React.FC<DepartmentFormModalProps> = ({
  show,
  onClose,
  onSubmit,
  onDelete,
  users,
  editingDepartment
}) => {
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    description: '',
    assigned_users: [],
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingDepartment) {
      setFormData({
        name: editingDepartment.name,
        description: editingDepartment.description || '',
        assigned_users: users.filter(u => u.department_id === editingDepartment.id).map(u => u.id),
      });
    }
  }, [editingDepartment, users]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingDepartment || !onDelete) return;
    
    setDeleting(true);
    setError('');
    try {
      await onDelete(editingDepartment);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete department');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {editingDepartment ? 'Edit Department' : 'Add New Department'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Department Name
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Users
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md">
              {users.map(user => (
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
                  <span className="text-sm text-gray-500">
                    {user.designation || user.role}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-3">
            {editingDepartment && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
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
                {saving ? 'Saving...' : editingDepartment ? 'Update Department' : 'Create Department'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};