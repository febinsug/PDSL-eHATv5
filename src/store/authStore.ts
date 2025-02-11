import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,

      hydrate: async () => {
        try {
          const state = localStorage.getItem('auth-storage');
          if (state) {
            const { state: { user } } = JSON.parse(state);
            if (user) {
              // Verify user still exists
              const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();
              
              if (data) {
                const { password_hash, ...userData } = data;
                set({ user: userData, initialized: true });
                return;
              }
            }
          }
          set({ user: null, initialized: true });
        } catch (error) {
          console.error('Hydration error:', error);
          set({ user: null, initialized: true });
        }
      },

      login: async (username: string, password: string) => {
        set({ loading: true });
        try {
          const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password_hash', password)
            .single();

          if (error || !users) {
            throw new Error('Invalid credentials');
          }

          const { password_hash, ...user } = users;
          set({ user, initialized: true });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        set({ user: null, initialized: true });
        localStorage.removeItem('auth-storage');
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);