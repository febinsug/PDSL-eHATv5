import React, { useState } from 'react';
import { User, Settings as SettingsIcon, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface ConfirmationDialog {
  show: boolean;
  title: string;
  message: string;
  action: () => Promise<void>;
}

interface SettingsFormData {
  full_name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const Settings = () => {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState<SettingsFormData>({
    full_name: user?.full_name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [confirmation, setConfirmation] = useState<ConfirmationDialog>({
    show: false,
    title: '',
    message: '',
    action: async () => {},
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setConfirmation({
      show: true,
      title: 'Update Profile',
      message: 'Are you sure you want to update your profile information?',
      action: async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
          const { error } = await supabase
            .from('users')
            .update({
              full_name: formData.full_name,
              email: formData.email,
            })
            .eq('id', user.id);

          if (error) throw error;

          setMessage({ type: 'success', text: 'Profile updated successfully' });
        } catch (error) {
          console.error('Error updating profile:', error);
          setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setConfirmation({
      show: true,
      title: 'Change Password',
      message: 'Are you sure you want to change your password?',
      action: async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
          // Verify current password
          const { data: userData } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', user.id)
            .eq('password_hash', formData.currentPassword)
            .single();

          if (!userData) {
            setMessage({ type: 'error', text: 'Current password is incorrect' });
            return;
          }

          // Update password
          const { error } = await supabase
            .from('users')
            .update({ password_hash: formData.newPassword })
            .eq('id', user.id);

          if (error) throw error;

          setMessage({ type: 'success', text: 'Password updated successfully' });
          setFormData(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          }));
        } catch (error) {
          console.error('Error changing password:', error);
          setMessage({ type: 'error', text: 'Failed to update password' });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSendTestEmail = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('http://localhost:3001/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'kdanam@pdsl.com',
          subject: 'eHAT SMTP TestinG',
          text: 'Hi Karthik',
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test email sent successfully!' });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: `Failed to send test email: ${errorData.message || response.statusText}` });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({ type: 'error', text: 'Network error or backend not running.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600">
        <AlertCircle className="w-12 h-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm">Please log in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-full w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Profile Information</h2>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
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

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90 focus:outline-none focus:ring-2 focus:ring-[#1732ca] focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Change Password</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={formData.currentPassword}
                  onChange={e => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={formData.newPassword}
                  onChange={e => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90 focus:outline-none focus:ring-2 focus:ring-[#1732ca] focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Change Password
                </button>
              </div>
            </form>
          </div>

          {/* Email Test Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Email Test</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">Click the button below to send a test email to kdanam@pdsl.com.</p>
            <div className="flex justify-end">
              <button
                onClick={handleSendTestEmail}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Test Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmation.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-auto">
            <h3 className="text-lg font-semibold mb-4">{confirmation.title}</h3>
            <p className="text-gray-600 mb-6">{confirmation.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmation(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmation.action();
                  setConfirmation(prev => ({ ...prev, show: false }));
                }}
                className="px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};