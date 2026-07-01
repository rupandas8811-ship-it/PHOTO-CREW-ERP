import React, { useState } from 'react';
import { useRole } from './RoleContext';
import { Menu, RefreshCw, LogOut } from 'lucide-react';
import { UserRole } from '../types';
import { AppLogo } from './AppLogo';
import { NotificationBell } from './NotificationBell';

interface RoleSwitcherProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { currentRole, currentUser, logout, refreshData } = useRole();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!currentUser) return null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'Business Owner':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.1)]';
      case 'Sales Team':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
      case 'Operations Team':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/40';
      case 'Production Team':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/40';
    }
  };

  return (
    <header className="bg-black/90 border-b border-zinc-900 backdrop-blur-md py-4 px-4 sm:px-6 sticky top-0 z-50 shadow-2xl font-sans">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left Side: Toggle (☰ Menu), Logo & Current Role Name */}
        <div className="flex items-center gap-3 sm:gap-4">
          {setSidebarOpen && (
            <button
              id="header_sidebar_toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 flex items-center justify-center bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-805 rounded-xl transition-all cursor-pointer shadow-md select-none touch-manipulation min-w-[38px] min-h-[38px]"
              title={sidebarOpen ? "Hide Navigation Sidebar" : "Show Navigation Sidebar"}
            >
              <Menu className="w-5 h-5 text-amber-500" />
            </button>
          )}
          
          <AppLogo size="sm" showTextOnFallback={false} />

          <div className="h-4 w-[1px] bg-zinc-800" />

          <span className={`text-[10px] sm:text-xs px-2.5 py-1 rounded font-mono font-bold tracking-wider uppercase border ${getRoleBadgeStyle(currentRole)}`}>
            {currentRole}
          </span>
        </div>

        {/* Right Side: Refresh & Logout Buttons (Always visible on all screen sizes) */}
        <div className="flex items-center gap-2">
          <NotificationBell />

          <button
            onClick={handleRefresh}
            className="p-2 sm:px-3 sm:py-1.5 flex items-center gap-2 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 hover:text-emerald-300 border border-emerald-500/15 hover:border-emerald-500/35 rounded-xl transition-all cursor-pointer shadow-md select-none touch-manipulation min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0"
            title="Refresh System Flow"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-xs font-mono font-bold uppercase tracking-wider">Refresh</span>
          </button>

          <button
            onClick={() => logout()}
            className="p-2 sm:px-3 sm:py-1.5 flex items-center gap-2 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 border border-rose-500/15 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer shadow-md select-none touch-manipulation min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0"
            title="Secure Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-mono font-bold uppercase tracking-wider">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
};
