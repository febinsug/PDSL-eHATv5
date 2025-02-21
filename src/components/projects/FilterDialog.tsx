import React from 'react';
import { X } from 'lucide-react';
import type { Client } from '../../types';

interface FilterDialogProps {
  show: boolean;
  onClose: () => void;
  filterOptions: {
    clients: string[];
    status: string[];
  };
  setFilterOptions: React.Dispatch<React.SetStateAction<{
    clients: string[];
    status: string[];
  }>>;
  clients: Client[];
}

export const FilterDialog: React.FC<FilterDialogProps> = ({
  show,
  onClose,
  filterOptions,
  setFilterOptions,
  clients,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Filter Projects</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Clients</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {clients.map(client => (
                <label key={client.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterOptions.clients.includes(client.id)}
                    onChange={e => {
                      setFilterOptions(prev => ({
                        ...prev,
                        clients: e.target.checked
                          ? [...prev.clients, client.id]
                          : prev.clients.filter(id => id !== client.id)
                      }));
                    }}
                    className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                  />
                  <span>{client.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="space-y-2">
              {['active', 'on_hold', 'completed'].map(status => (
                <label key={status} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterOptions.status.includes(status)}
                    onChange={e => {
                      setFilterOptions(prev => ({
                        ...prev,
                        status: e.target.checked
                          ? [...prev.status, status]
                          : prev.status.filter(s => s !== status)
                      }));
                    }}
                    className="rounded border-gray-300 text-[#1732ca] focus:ring-[#1732ca]"
                  />
                  <span className="capitalize">{status.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setFilterOptions({
                clients: [],
                status: []
              });
              onClose();
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};