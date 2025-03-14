import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, CheckCircle, X, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import type { User, Timesheet } from '../../types';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{user.full_name || user.username}</h3>
            <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
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
  );
};