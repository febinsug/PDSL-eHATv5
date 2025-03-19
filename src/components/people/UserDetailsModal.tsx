import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { User, Timesheet } from '../../types';
import { Loader2 } from 'lucide-react';

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);

  useEffect(() => {
    const fetchUserHours = async () => {
      try {
        const { data } = await supabase
          .from('timesheets')
          .select(`
            *,
            project:projects(*)
          `)
          .eq('user_id', user.id)
          .neq('status', 'rejected')
          .order('submitted_at', { ascending: false });

        if (data) {
          setTimesheets(data);
        }
      } catch (error) {
        console.error('Error fetching user hours:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserHours();
  }, [user.id]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900">{user.full_name || user.username}</h2>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
              <p className="text-gray-900">{user.email || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Role</h3>
              <p className="text-gray-900">{user.role || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Department</h3>
              <p className="text-gray-900">{user.department?.name || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Manager</h3>
              <p className="text-gray-900">{user.manager?.full_name || '-'}</p>
            </div>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Timesheets</h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {timesheets.length > 0 ? (
                timesheets.map(timesheet => (
                  <div key={timesheet.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{timesheet.project.name}</p>
                        <p className="text-sm text-gray-500">
                          Week {timesheet.week_number}, {timesheet.year}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{timesheet.total_hours} hours</p>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          timesheet.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : timesheet.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {timesheet.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No timesheets found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};