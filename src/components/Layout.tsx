import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  CheckSquare,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-white/10 text-white'
        : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`}
  >
    {icon}
    {label}
  </Link>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Check for auth on every render
  if (!user) {
    return <Navigate to="/eHAT" replace />;
  }

  const isAdmin = user.role === 'admin';
  const isManagerOrAdmin = user.role === 'manager' || isAdmin;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-[#1732ca] text-white shadow-lg"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open menu"
        style={{ marginRight: 8 }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      {/* Sidebar - desktop & mobile drawer */}
      <aside className={`bg-[#1732ca] p-4 flex flex-col transition-all duration-300 z-40
        w-64 md:static md:translate-x-0 fixed top-0 left-0 h-full
        ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} md:block`}
        style={{ boxShadow: drawerOpen ? '0 0 0 9999px rgba(0,0,0,0.4)' : undefined }}
      >
        <div className="flex items-center gap-2 px-4 py-3 md:mb-4 md:mt-2 md:justify-start justify-between">
          <Clock className="w-6 h-6 text-white" />
          <h1 className="text-lg font-bold text-white">PDSL eHAT</h1>
        </div>
        <nav className="mt-8 space-y-1 flex-1">
          <SidebarItem
            to="/"
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Overview"
            active={location.pathname === '/'}
          />
          <SidebarItem
            to="/hours"
            icon={<Clock className="w-5 h-5" />}
            label="Hour Submission"
            active={location.pathname === '/hours'}
          />
          {isManagerOrAdmin && (
            <>
              <SidebarItem
                to="/projects"
                icon={<FolderKanban className="w-5 h-5" />}
                label="Manage Projects"
                active={location.pathname === '/projects'}
              />
              <SidebarItem
                to="/approvals"
                icon={<CheckSquare className="w-5 h-5" />}
                label="Approvals"
                active={location.pathname === '/approvals'}
              />
              {user.role === 'manager' && (
                <SidebarItem
                  to="/team"
                  icon={<Users className="w-5 h-5" />}
                  label="Team"
                  active={location.pathname === '/team'}
                />
              )}
            </>
          )}
          {isAdmin && (
            <SidebarItem
              to="/people"
              icon={<UserPlus className="w-5 h-5" />}
              label="People"
              active={location.pathname === '/people'}
            />
          )}
        </nav>
        {/* User info, role, settings, sign out - stick to bottom in desktop, stack in mobile */}
        <div className="md:absolute md:bottom-0 md:left-0 md:w-full border-t border-white/10 pt-4 space-y-4 bg-[#1732ca]">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">
                  {(user.full_name || user.username)[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.full_name || user.username}
                </p>
                <div className="flex flex-col mt-1">
                  {user.role === 'admin' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white">
                      Administrator
                    </span>
                  ) : user.role === 'manager' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white">
                      Manager
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white break-words max-w-[150px]">
                      {user.designation || 'Employee'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <SidebarItem
            to="/settings"
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            active={location.pathname === '/settings'}
          />
          <button
            onClick={() => {
              const { logout } = useAuthStore.getState();
              logout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
        {/* Mobile close button */}
        <button
          className="md:hidden absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 text-white"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </aside>
      {/* Overlay for mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setDrawerOpen(false)} />
      )}
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 md:p-8 max-w-full w-full h-full">
          {/* Add margin to avoid overlap in mobile */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <div className="mr-2" />
            <h1 className="text-2xl font-semibold text-gray-900 ">Overview</h1>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export { Layout };