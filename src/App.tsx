import React, { useState, useEffect } from 'react';
import { RoleProvider, useRole } from './components/RoleContext';
import { RoleSwitcher } from './components/RoleSwitcher';
import { Dashboard } from './components/Dashboard';
import { SalesModule } from './components/SalesModule';
import { OperationsModule } from './components/OperationsModule';
import { ProductionModule } from './components/ProductionModule';
import { PaymentsModule } from './components/PaymentsModule';
import { OrderSearch } from './components/OrderSearch';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModule } from './components/UserManagementModule';
import { DatabaseHealthModule } from './components/DatabaseHealthModule';
import { 
  Briefcase, Camera, Video, Landmark, Shield, Users, Search, Info, Target, Sparkles, Menu, RefreshCw, Activity
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, currentRole, resetAllData, refreshData } = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Initialize correct default tab according to user role to avoid visual flashes
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'operations' | 'production' | 'payments' | 'search' | 'users' | 'diagnostics'>(() => {
    const savedUser = localStorage.getItem('erp_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === 'Sales Team') return 'sales';
      if (user.role === 'Operations Team') return 'operations';
      if (user.role === 'Production Team') return 'production';
    }
    return 'dashboard';
  });

  // Guard direct unauthorized access by syncing active tabs with user roles
  useEffect(() => {
    if (currentUser) {
      if (currentRole === 'Sales Team' && activeTab !== 'sales') {
        setActiveTab('sales');
      } else if (currentRole === 'Operations Team' && activeTab !== 'operations') {
        setActiveTab('operations');
      } else if (currentRole === 'Production Team' && activeTab !== 'production') {
        setActiveTab('production');
      }
    }
  }, [currentUser, currentRole, activeTab]);

  // If session is unauthenticated, render the Login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Determine if active tab is write-protected for the current user
  const getWriteStatus = () => {
    if (currentRole === 'Business Owner') {
      return { label: 'STUDIO PRO ADMINISTRATIVE LEVEL // FULL READ-WRITE CLEARANCE', type: 'ok', readonly: false };
    }
    return { label: `ISOLATED DIVISION DESK ACTIVE // WRITING SIGNED FOR ${currentRole.toUpperCase()}`, type: 'ok', readonly: false };
  };

  const writeStatus = getWriteStatus();

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col font-sans antialiased pb-12">
      
      {/* Platform Header */}
      <RoleSwitcher />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Navigation Sidebar Container */}
        <div className={`flex-shrink-0 flex flex-col gap-3 transition-all duration-200 ${sidebarOpen ? 'w-full lg:w-64' : 'w-auto'}`}>
          <div className="flex items-center gap-2">
            <button
              id="btn_sidebar_toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 w-10 h-10 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-350 hover:text-white border border-zinc-850 hover:border-zinc-700 rounded-xl transition-all cursor-pointer shadow-md select-none"
              title={sidebarOpen ? "Collapse Menu" : "Expand Menu"}
            >
              <Menu className="w-5 h-5 text-amber-500" />
            </button>
            <button
              id="btn_refresh_data"
              onClick={handleRefresh}
              className="p-2.5 px-3 h-10 flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-350 hover:text-white border border-zinc-850 hover:border-zinc-700 rounded-xl transition-all cursor-pointer shadow-md select-none text-xs font-bold font-mono"
              title="Refresh Displayed Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-[10px] tracking-wide uppercase">Refresh</span>
            </button>
          </div>

          {sidebarOpen && (
            <aside className="w-full space-y-4">
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-850 p-4 space-y-4 shadow-xl relative">
            {/* Corner calibration tick marks */}
            <div className="absolute top-2 left-2 w-1 h-1 bg-amber-500/50" />
            <div className="absolute top-2 right-2 w-1 h-1 bg-amber-500/50" />
            <div className="absolute bottom-2 left-2 w-1 h-1 bg-amber-500/50" />
            <div className="absolute bottom-2 right-2 w-1 h-1 bg-amber-500/50" />

            <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
              <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 font-mono flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-500" />
                <span>STUDIO WORKSPACES</span>
              </h3>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            
            <nav className="space-y-1.5">
              {/* Dashboard tab */}
              {currentRole === 'Business Owner' && (
                <button
                  id="tab_dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/30 font-bold shadow-[0_0_12px_rgba(245,158,11,0.06)]'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">👑</span>
                    <span className="tracking-wide">Executive Studio Desk</span>
                  </div>
                  <ChevronRightIcon active={activeTab === 'dashboard'} />
                </button>
              )}

              {/* Sales Module */}
              {(currentRole === 'Business Owner' || currentRole === 'Sales Team') && (
                <button
                  id="tab_sales"
                  onClick={() => setActiveTab('sales')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                    activeTab === 'sales'
                      ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-400 border-emerald-500/30 font-bold shadow-[0_0_12px_rgba(16,185,129,0.06)]'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    <span className="tracking-wide">Sales & CRM Desk</span>
                  </div>
                  <ChevronRightIcon active={activeTab === 'sales'} />
                </button>
              )}

              {/* Operations Module */}
              {(currentRole === 'Business Owner' || currentRole === 'Operations Team') && (
                <button
                  id="tab_operations"
                  onClick={() => setActiveTab('operations')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                    activeTab === 'operations'
                      ? 'bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-sky-400 border-sky-500/30 font-bold shadow-[0_0_12px_rgba(56,189,248,0.06)]'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Camera className="w-4 h-4 flex-shrink-0 text-sky-400 animate-pulse" />
                    <span className="tracking-wide">Crew & Gear Call</span>
                  </div>
                  <ChevronRightIcon active={activeTab === 'operations'} />
                </button>
              )}

              {/* Production Module */}
              {(currentRole === 'Business Owner' || currentRole === 'Production Team') && (
                <button
                  id="tab_production"
                  onClick={() => setActiveTab('production')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                    activeTab === 'production'
                      ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 border-purple-500/30 font-bold shadow-[0_0_12px_rgba(168,85,247,0.06)]'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Video className="w-4 h-4 flex-shrink-0 text-purple-400" />
                    <span className="tracking-wide">VFX Post-Production</span>
                  </div>
                  <ChevronRightIcon active={activeTab === 'production'} />
                </button>
              )}

              {/* Payments Module */}
              {currentRole === 'Business Owner' && (
                <button
                  id="tab_payments"
                  onClick={() => setActiveTab('payments')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                    activeTab === 'payments'
                      ? 'bg-gradient-to-r from-amber-500/10 to-rose-500/10 text-rose-450 border-rose-500/30 font-bold shadow-[0_0_12px_rgba(244,63,94,0.06)]'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Landmark className="w-4 h-4 flex-shrink-0 text-rose-500" />
                    <span className="tracking-wide">Ledger Purchases</span>
                  </div>
                  <ChevronRightIcon active={activeTab === 'payments'} />
                </button>
              )}

              {/* Search Everywhere tab */}
              {currentRole === 'Business Owner' && (
                <button
                  id="tab_search"
                  onClick={() => setActiveTab('search')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                    activeTab === 'search'
                      ? 'bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-blue-400 border-blue-500/30 font-bold shadow-[0_0_12px_rgba(59,130,246,0.06)]'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Search className="w-4 h-4 flex-shrink-0 text-blue-400" />
                    <span className="tracking-wide">Archival Global Search</span>
                  </div>
                  <ChevronRightIcon active={activeTab === 'search'} />
                </button>
              )}

              {/* Personnel Administration tab */}
              {currentRole === 'Business Owner' && (
                <button
                  id="tab_users"
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-400 border-violet-500/30 font-bold shadow-[0_0_12px_rgba(139,92,246,0.06)]'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 flex-shrink-0 text-violet-400" />
                    <span className="tracking-wide">Personnel Security</span>
                  </div>
                  <ChevronRightIcon active={activeTab === 'users'} />
                </button>
              )}

              {/* Database Health Diagnostics tab */}
              {currentRole === 'Business Owner' && (
                <button
                  id="tab_diagnostics"
                  onClick={() => setActiveTab('diagnostics')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                    activeTab === 'diagnostics'
                      ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/30 font-bold shadow-[0_0_12px_rgba(245,158,11,0.06)]'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 flex-shrink-0 text-amber-500" />
                    <span className="tracking-wide text-zinc-300">Database Health Rig</span>
                  </div>
                  <ChevronRightIcon active={activeTab === 'diagnostics'} />
                </button>
              )}
            </nav>
            
            {/* Divider replaced with subtle spacer at bottom of nav */}
            <div className="my-1" />
          </div>
        </aside>
        )}
      </div>

        {/* Right Side: Active Workspace panel */}
        <main className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Render Active View Container */}
          <div className="bg-transparent rounded-2xl relative">
            {activeTab === 'dashboard' && currentRole === 'Business Owner' && <Dashboard />}
            {activeTab === 'sales' && (currentRole === 'Business Owner' || currentRole === 'Sales Team') && <SalesModule />}
            {activeTab === 'operations' && (currentRole === 'Business Owner' || currentRole === 'Operations Team') && <OperationsModule />}
            {activeTab === 'production' && (currentRole === 'Business Owner' || currentRole === 'Production Team') && <ProductionModule />}
            {activeTab === 'payments' && currentRole === 'Business Owner' && <PaymentsModule />}
            {activeTab === 'search' && currentRole === 'Business Owner' && <OrderSearch />}
            {activeTab === 'users' && currentRole === 'Business Owner' && <UserManagementModule />}
            {activeTab === 'diagnostics' && currentRole === 'Business Owner' && <DatabaseHealthModule />}
          </div>
        </main>

      </div>
    </div>
  );
};

// Simple visual indicators helper for sidebar Buttons
const ChevronRightIcon: React.FC<{ active: boolean }> = ({ active }) => {
  return (
    <span className={`text-[10px] text-zinc-650 transition-transform duration-200 ${active ? 'translate-x-0.5 text-amber-400' : 'group-hover:translate-x-0.5'}`}>
      {active ? '●' : '›'}
    </span>
  );
};

export default function App() {
  return (
    <RoleProvider>
      <MainAppContent />
    </RoleProvider>
  );
}
