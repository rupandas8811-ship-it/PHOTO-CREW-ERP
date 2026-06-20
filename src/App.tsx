import React, { useState, useEffect } from 'react';
import { RoleProvider, useRole } from './components/RoleContext';
import { RoleSwitcher } from './components/RoleSwitcher';
import { Dashboard } from './components/Dashboard';
import { SalesAnalytics } from './components/analytics/SalesAnalytics';
import { OperationsAnalytics } from './components/analytics/OperationsAnalytics';
import { ProductionAnalytics } from './components/analytics/ProductionAnalytics';
import { BusinessOverviewAnalytics } from './components/analytics/BusinessOverviewAnalytics';
import { SalesModule } from './components/SalesModule';
import { OperationsModule } from './components/OperationsModule';
import { ProductionModule } from './components/ProductionModule';
import { StaffManagementModule } from './components/StaffManagementModule';
import { PaymentsModule } from './components/PaymentsModule';
import { PendingPaymentsReport } from './components/analytics/PendingPaymentsReport';
import { OrderSearch } from './components/OrderSearch';
import { LoginScreen } from './components/LoginScreen';
import { StudioLoader } from './components/StudioLoader';
import { UserManagementModule } from './components/UserManagementModule';
import { DatabaseHealthModule } from './components/DatabaseHealthModule';
import { NotificationsModule } from './components/NotificationsModule';
import { AppLogo } from './components/AppLogo';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Camera, Video, Landmark, Shield, Users, Search, Info, Target, Sparkles, Menu, RefreshCw, Activity, Bell,
  UserPlus, Truck, Layers, CheckSquare, Clock, Play, BarChart3, LogOut, Calendar, TrendingUp, DollarSign
} from 'lucide-react';

const AccessDeniedView: React.FC<{ section: string }> = ({ section }) => {
  return (
    <div className="bg-red-950/15 border border-red-900/40 rounded-2xl p-8 py-12 text-center max-w-xl mx-auto my-12 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-red-500/[0.03] blur-2xl pointer-events-none" />
      <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center rounded-3xl mx-auto mb-6 shadow-inner ring-4 ring-red-500/5">
        <Shield className="w-8 h-8 font-bold" />
      </div>
      <h3 className="text-lg font-black uppercase tracking-wider text-rose-450 font-sans">
        Access Denied / Security Shield
      </h3>
      <p className="text-xs text-red-450 font-mono mt-2 tracking-wide uppercase">
        Division bounds violations detected
      </p>
      <div className="h-px bg-zinc-850 my-5" />
      <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
        Your designated access credential level does not possess active read or execute clearance parameters for the requested section: <strong className="text-zinc-200">{section}</strong>.
      </p>
    </div>
  );
};

const MainAppContent: React.FC = () => {
  const { 
    currentUser, 
    currentRole, 
    resetAllData, 
    refreshData, 
    notifications, 
    logout,
    globalDateRange,
    setGlobalDateRange,
    resetGlobalDateRange
  } = useRole();
  const [appLoaded, setAppLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isTabAllowed = (tab: string): boolean => {
    if (currentRole === 'Business Owner') {
      // Remove deprecated analytics sections
      if (tab === 'revenue_analytics' || tab === 'payments') return false;
      return true;
    }

    if (currentRole === 'Sales Team') {
      // Sales users can access Leads Directory, Sales Analytics, and Pending Payment Report
      return ['sales', 'sales_analytics', 'pending_payments'].includes(tab);
    }

    if (currentRole === 'Operations Team') {
      // Operations users can only access Operations (which hosts its leads, calendar, staff, and analytics)
      return ['operations'].includes(tab);
    }

    if (currentRole === 'Production Team') {
      // Production users can only access Production (leads, roster, performance, and analytics)
      return ['production', 'staff_management', 'notifications'].includes(tab);
    }

    return false;
  };

  useEffect(() => {
    if (!currentUser) {
      setAppLoaded(false);
    }
  }, [currentUser]);

  const [startInput, setStartInput] = useState(globalDateRange.start);
  const [endInput, setEndInput] = useState(globalDateRange.end);

  useEffect(() => {
    setStartInput(globalDateRange.start);
    setEndInput(globalDateRange.end);
  }, [globalDateRange]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };
  
  // Collapse sidebar/hidden by default, read from sessionStorage to persist during session
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('erp_sidebar_state');
    return saved === 'true'; // Default is false (collapsed/hidden by default)
  });

  useEffect(() => {
    sessionStorage.setItem('erp_sidebar_state', sidebarOpen ? 'true' : 'false');
  }, [sidebarOpen]);

  // Sub-tab selection state for sales suite
  const [activeSalesSubTab, setActiveSalesSubTab] = useState<'list' | 'profiles' | 'packages' | 'calendar' | 'create'>('list');

  // Sub-tab selection state for production suite
  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'production_leads' | 'production_calendar' | 'project_queue' | 'assignments' | 'tracker' | 'delivery' | 'resources' | 'analytics' | 'staff_performance' | 'overall_performance' | 'deliveries_desk' | 'staff_management' | 'notifications' | 'crew_roster' | 'production_staff_directory' | 'production_role_specialities'>('production_leads');

  // Sub-tab selection state for operations suite
  const [activeOpSubTab, setActiveOpSubTab] = useState<
    | 'operations_leads'
    | 'operations_calendar'
    | 'equipment_management'
    | 'operations_staff'
    | 'event_scheduling'
    | 'team_assignments'
    | 'operations_notifications'
    | 'operations_analytics'
    | 'package_catalogue'
  >('operations_leads');

  // Initialize correct default tab according to user role to avoid visual flashes
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'sales'
    | 'operations'
    | 'production'
    | 'staff_management'
    | 'notifications'
    | 'payments'
    | 'search'
    | 'users'
    | 'diagnostics'
    | 'sales_analytics'
    | 'operations_analytics'
    | 'production_analytics'
    | 'business_overview_analytics'
    | 'revenue_analytics'
    | 'staff_performance_analytics'
    | 'pending_payments'
  >(() => {
    const savedUser = localStorage.getItem('erp_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === 'Sales Team') return 'sales';
      if (user.role === 'Operations Team') return 'operations';
      if (user.role === 'Production Team') return 'production';
    }
    return 'business_overview_analytics';
  });

  // Responsive tab toggles that collapse sidebar automatically on Tablet / Mobile sizes
  const handleTabSelect = (tab: any) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSubTabSelect = (subTab: any) => {
    setActiveSubTab(subTab);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Guard direct unauthorized access by syncing active tabs with user roles
  useEffect(() => {
    if (currentUser) {
      if (currentRole === 'Sales Team') {
        if (!['sales', 'sales_analytics', 'pending_payments'].includes(activeTab)) {
          setActiveTab('sales');
        }
      } else if (currentRole === 'Operations Team') {
        if (activeTab !== 'operations') {
          setActiveTab('operations');
        }
        if (!['operations_leads', 'operations_calendar', 'operations_staff', 'operations_analytics', 'team_assignments', 'package_catalogue', 'equipment_management', 'event_scheduling', 'operations_notifications'].includes(activeOpSubTab)) {
          setActiveOpSubTab('operations_leads');
        }
      } else if (currentRole === 'Production Team') {
        if (activeTab !== 'production') {
          setActiveTab('production');
        }
        if (!['production_leads', 'crew_roster', 'staff_performance', 'analytics'].includes(activeSubTab)) {
          setActiveSubTab('production_leads');
        }
      }
    }
  }, [currentUser, currentRole, activeTab, activeOpSubTab, activeSubTab]);

  // If session is unauthenticated, render the Login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Photography-themed loading screen
  if (!appLoaded) {
    return <StudioLoader onComplete={() => setAppLoaded(true)} duration={2400} />;
  }

  // Determine if active tab is write-protected for the current user
  const getWriteStatus = () => {
    if (currentRole === 'Business Owner') {
      return { label: 'STUDIO PRO ADMINISTRATIVE LEVEL // FULL READ-WRITE CLEARANCE', type: 'ok', readonly: false };
    }
    return { label: `ISOLATED DIVISION DESK ACTIVE // WRITING SIGNED FOR ${currentRole.toUpperCase()}`, type: 'ok', readonly: false };
  };

  const writeStatus = getWriteStatus();

  // Helper to render sidebar items to avoid visual design duplication
  const renderSidebarContent = () => (
    <aside className="w-full space-y-4">
      {/* Sidebar Brand Logo Header */}
      <div className="p-3 flex flex-col items-center justify-center relative border-b border-zinc-900/40 pb-5">
        <AppLogo size="md" showTextOnFallback={false} />
        {/* Interactive Close button for Mobile/Tablet */}
        <button
          id="btn_sidebar_close"
          onClick={() => setSidebarOpen(false)}
          className="absolute -top-1 -right-1 lg:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-850 rounded-xl cursor-pointer flex items-center justify-center transition-all shadow-md h-8 w-8 select-none"
          title="Close Navigation"
        >
          ✕
        </button>
      </div>

      {activeTab === 'operations' || currentRole === 'Operations Team' ? (
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-850 p-4 space-y-4 shadow-xl relative animate-in fade-in duration-300">
          {/* Corner calibration tick marks */}
          <div className="absolute top-2 left-2 w-1 h-1 bg-amber-500/50" />
          <div className="absolute top-2 right-2 w-1 h-1 bg-amber-500/50" />
          <div className="absolute bottom-2 left-2 w-1 h-1 bg-amber-500/50" />
          <div className="absolute bottom-2 right-2 w-1 h-1 bg-amber-500/50" />

          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 font-mono flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              <span>OPERATIONS DESK</span>
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          </div>

          {/* Return button for Business Owner */}
          {currentRole === 'Business Owner' && (
            <button
              onClick={() => {
                handleTabSelect('dashboard');
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[10px] font-mono uppercase tracking-wider font-extrabold rounded-xl transition-all duration-200 border cursor-pointer border-zinc-800 text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
            >
              <span>←</span>
              <span>Back to Studio Desks</span>
            </button>
          )}

          <nav className="space-y-1.5">
            {[
              { id: 'core_hub', label: 'Core Operations Hub', icon: Briefcase },
              { id: 'package_catalogue', label: 'Package Catalogue', icon: Layers },
              { id: 'equipment_management', label: 'Equipment Kits & Assemblies', icon: Camera },
              { id: 'operations_staff', label: 'Staff Directory', icon: Users },
              { id: 'event_scheduling', label: 'Event Reports', icon: Clock },
              { id: 'operations_notifications', label: 'Settings', icon: Bell }
            ].map((tab) => {
              const IconComponent = tab.icon;
              const isCoreHub = tab.id === 'core_hub';
              const isSelected = isCoreHub 
                ? ['operations_leads', 'operations_calendar', 'operations_analytics', 'team_assignments'].includes(activeOpSubTab)
                : activeOpSubTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleTabSelect('operations');
                    if (isCoreHub) {
                      if (!['operations_leads', 'operations_calendar', 'operations_analytics', 'team_assignments'].includes(activeOpSubTab)) {
                        setActiveOpSubTab('operations_leads');
                      }
                    } else {
                      setActiveOpSubTab(tab.id as any);
                    }
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-extrabold rounded-xl transition-all cursor-pointer border text-left ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/30 font-bold'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className="tracking-wide">{tab.label}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-amber-500">●</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      ) : activeTab === 'production' || currentRole === 'Production Team' ? (
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-850 p-4 space-y-4 shadow-xl relative">
          {/* Corner calibration tick marks */}
          <div className="absolute top-2 left-2 w-1 h-1 bg-purple-500/50" />
          <div className="absolute top-2 right-2 w-1 h-1 bg-purple-500/50" />
          <div className="absolute bottom-2 left-2 w-1 h-1 bg-purple-500/50" />
          <div className="absolute bottom-2 right-2 w-1 h-1 bg-purple-500/50" />

          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 font-mono flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-purple-400" />
              <span>PRODUCTION DESK</span>
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
          </div>

          {/* Return button for Business Owner */}
          {currentRole === 'Business Owner' && (
            <button
              onClick={() => {
                handleTabSelect('dashboard');
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[10px] font-mono uppercase tracking-wider font-extrabold rounded-xl transition-all duration-200 border cursor-pointer border-zinc-800 text-zinc-450 hover:bg-zinc-900/50 hover:text-white"
            >
              <span>←</span>
              <span>Back to Studio Desks</span>
            </button>
          )}

          <nav className="space-y-1.5">
            {[
              { id: 'production_staff_directory', label: 'Production Staff Directory', icon: Users },
              { id: 'production_role_specialities', label: 'Production Role Specialities', icon: Target },
              { id: 'production_leads', label: 'Production Leads', icon: Sparkles },
              { id: 'production_calendar', label: 'Production Calendar', icon: Calendar },
              { id: 'staff_management', label: 'Staff Management', icon: UserPlus },
              { id: 'crew_roster', label: 'Crew Roster', icon: Users },
              { id: 'staff_performance', label: 'Staff Performance', icon: Users },
              { id: 'overall_performance', label: 'Overall Performance', icon: BarChart3 },
              { id: 'deliveries_desk', label: 'Deliveries Desk', icon: Truck },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'pipeline', label: 'Workflow Board', icon: Layers },
              { id: 'project_queue', label: 'Active Queue', icon: CheckSquare },
              { id: 'assignments', label: 'Staff Assignments', icon: Users },
              { id: 'tracker', label: 'Kanban Tracker', icon: Clock },
              { id: 'resources', label: 'Resources Audit', icon: Play },
              { id: 'analytics', label: 'Studio Analytics', icon: BarChart3 }
            ].filter(tab => {
              if (currentRole === 'Production Team') {
                return ['production_leads', 'crew_roster', 'staff_performance', 'analytics'].includes(tab.id);
              }
              return true;
            }).map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = activeSubTab === tab.id;
              let label = tab.label;
              if (currentRole === 'Production Team') {
                if (tab.id === 'staff_performance') label = 'Editor Performance';
                if (tab.id === 'analytics') label = 'Production Analytics';
              }
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleTabSelect('production');
                    handleSubTabSelect(tab.id as any);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-extrabold rounded-xl transition-all cursor-pointer border text-left ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 border-purple-500/30 font-bold'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-purple-450' : 'text-zinc-500'}`} />
                    <span className="tracking-wide">{label}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-purple-400">●</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      ) : activeTab === 'sales' || currentRole === 'Sales Team' ? (
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-850 p-4 space-y-4 shadow-xl relative animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400 font-mono flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
              <span>SALES WORKSPACE</span>
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>

          {/* Return button for Business Owner */}
          {currentRole === 'Business Owner' && (
            <button
              onClick={() => {
                handleTabSelect('dashboard');
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[10px] font-mono uppercase tracking-wider font-extrabold rounded-xl transition-all duration-200 border cursor-pointer border-zinc-800 text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
            >
              <span>←</span>
              <span>Back to Studio Desks</span>
            </button>
          )}

          <nav className="space-y-1.5">
            {[
              { id: 'sales_analytics', label: 'Sales Analytics', icon: Briefcase, color: 'text-indigo-400' },
              { id: 'sales_list', label: 'Leads Directory', icon: Sparkles, color: 'text-emerald-400' },
              { id: 'sales_packages', label: 'Package Catalog', icon: Layers, color: 'text-teal-400' },
              { id: 'pending_payments', label: 'Pending Payment Report', icon: DollarSign, color: 'text-amber-500' }
            ].map(tab => {
              const IconComponent = tab.icon;
              let isSelected = false;
              if (tab.id === 'sales_list') isSelected = activeTab === 'sales' && activeSalesSubTab === 'list';
              else if (tab.id === 'sales_packages') isSelected = activeTab === 'sales' && activeSalesSubTab === 'packages';
              else isSelected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={`tab_${tab.id}`}
                  onClick={() => {
                    if (tab.id === 'sales_list') {
                      handleTabSelect('sales');
                      setActiveSalesSubTab('list');
                    } else if (tab.id === 'sales_packages') {
                      handleTabSelect('sales');
                      setActiveSalesSubTab('packages');
                    } else {
                      handleTabSelect(tab.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-zinc-800 to-zinc-900 text-white border-zinc-700 font-bold shadow-md'
                      : 'text-zinc-400 bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 flex-shrink-0 ${tab.color}`} />
                    <span className="tracking-wide">{tab.label}</span>
                  </div>
                  <ChevronRightIcon active={isSelected} />
                </button>
              );
            })}
          </nav>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-850 p-4 space-y-4 shadow-xl relative animate-in fade-in duration-300">
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
            {[
              { id: 'sales_analytics', label: '1. Sales Analytics', icon: Briefcase, color: 'text-indigo-400' },
              { id: 'operations_analytics', label: '2. Operations Analytics', icon: Camera, color: 'text-emerald-400' },
              { id: 'production_analytics', label: '3. Production Analytics', icon: Video, color: 'text-purple-400' },
              { id: 'business_overview_analytics', label: '4. Business Overview Analytics', icon: Landmark, color: 'text-amber-500' },
              { id: 'staff_performance_analytics', label: '5. Staff Performance Analytics', icon: Users, color: 'text-sky-450' }
            ].map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab_${tab.id}`}
                  onClick={() => handleTabSelect(tab.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left border cursor-pointer border-transparent ${
                    isSelected
                      ? 'bg-gradient-to-r from-zinc-800 to-zinc-900 text-white border-zinc-700 font-bold shadow-md'
                      : 'text-zinc-400 bg-transparent hover:bg-zinc-900/50 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 flex-shrink-0 ${tab.color}`} />
                    <span className="tracking-wide">{tab.label}</span>
                  </div>
                  <ChevronRightIcon active={isSelected} />
                </button>
              );
            })}
          </nav>
          
          {/* Divider replaced with subtle spacer at bottom of nav */}
          <div className="my-1" />
        </div>
      )}

      {/* Global Actions at bottom of sidebar */}
      <div className="bg-[#09090b]/80 border border-zinc-900 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
        <button
          onClick={handleRefresh}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-mono uppercase tracking-wider font-extrabold rounded-xl transition-all cursor-pointer border border-emerald-500/10 hover:border-emerald-500/35 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-450 group"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-450 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
            <span>Refresh System Flow</span>
          </div>
        </button>

        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-mono uppercase tracking-wider font-extrabold rounded-xl transition-all cursor-pointer border border-rose-500/10 hover:border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-455"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-3.5 h-3.5 text-rose-455" />
            <span>Secure Logout</span>
          </div>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col font-sans antialiased pb-12">
      
      {/* Platform Header with collapsible controller */}
      <RoleSwitcher sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 relative">
        
        {/* DESKTOP SIDEBAR PANEL */}
        {sidebarOpen && (
          <div className="hidden lg:block w-64 flex-shrink-0 transition-all duration-300">
            <div className="sticky top-24">
              {renderSidebarContent()}
            </div>
          </div>
        )}

        {/* MOBILE & TABLET SLIDE-OUT DRAWER */}
        <div 
          className={`fixed inset-y-0 left-0 h-full z-50 bg-[#060608]/95 border-r border-zinc-900 shadow-2xl flex flex-col p-5 overflow-y-auto duration-300 ease-in-out transition-all lg:hidden ${
            sidebarOpen 
              ? 'translate-x-0 w-full sm:w-[320px]' 
              : '-translate-x-full w-full sm:w-[320px]'
          }`}
        >
          {renderSidebarContent()}
        </div>

        {/* OVERLAY BACKDROP FOR DRAWER */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 lg:hidden transition-all duration-300"
          />
        )}

        {/* Right Side: Active Workspace panel */}
        <main className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Dashboard Header - Global Filter Section */}
          {['sales_analytics', 'operations_analytics', 'production_analytics', 'business_overview_analytics'].includes(activeTab) && (
            <div id="global_date_filter_header" className="bg-zinc-950/70 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 font-mono">
                    Global Temporal Range
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-sans">
                    Refined analytical bound parameters: <span className="text-amber-400 font-bold font-mono">{globalDateRange.start}</span> to <span className="text-amber-400 font-bold font-mono">{globalDateRange.end}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 uppercase font-bold text-[10px]">Start Date:</span>
                  <input
                    type="date"
                    id="filter_start_date"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    className="bg-zinc-900/95 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono text-xs cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 uppercase font-bold text-[10px]">End Date:</span>
                  <input
                    type="date"
                    id="filter_end_date"
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    className="bg-zinc-900/95 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono text-xs cursor-pointer"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    id="btn_apply_filter"
                    onClick={() => setGlobalDateRange({ start: startInput, end: endInput })}
                    className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 hover:border-amber-500/50 transition-all font-bold cursor-pointer hover:shadow-[0_0_12px_rgba(245,158,11,0.08)] text-[11px] uppercase tracking-wider h-9"
                  >
                    Apply Filter
                  </button>
                  <button
                    id="btn_reset_filter"
                    onClick={() => {
                      resetGlobalDateRange();
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 hover:border-zinc-700 transition-all font-bold cursor-pointer text-[11px] uppercase tracking-wider h-9"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Render Active View Container */}
          <div className="bg-transparent rounded-2xl relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(3px)' }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="will-change-transform"
              >
                {!isTabAllowed(activeTab) ? (
                  <AccessDeniedView section={activeTab.split('_').join(' ').toUpperCase()} />
                ) : (
                  <>
                    {activeTab === 'sales_analytics' && <SalesAnalytics />}
                    {activeTab === 'pending_payments' && (currentRole === 'Business Owner' || currentRole === 'Sales Team') && <PendingPaymentsReport />}
                    {activeTab === 'operations_analytics' && <OperationsAnalytics />}
                    {activeTab === 'production_analytics' && <ProductionAnalytics />}
                    {activeTab === 'business_overview_analytics' && <BusinessOverviewAnalytics />}
                    {activeTab === 'revenue_analytics' && <BusinessOverviewAnalytics />}
                    {activeTab === 'staff_performance_analytics' && <ProductionModule activeSubTab="staff_performance" />}
                    {activeTab === 'dashboard' && currentRole === 'Business Owner' && <Dashboard />}
                    {activeTab === 'sales' && (currentRole === 'Business Owner' || currentRole === 'Sales Team') && <SalesModule activeSubTab={activeSalesSubTab} setActiveSubTab={setActiveSalesSubTab} />}
                    {activeTab === 'operations' && (currentRole === 'Business Owner' || currentRole === 'Operations Team') && (
                      <OperationsModule activeSubTab={activeOpSubTab} setActiveSubTab={setActiveOpSubTab} />
                    )}
                    {activeTab === 'production' && (currentRole === 'Business Owner' || currentRole === 'Production Team') && (
                      <ProductionModule activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
                    )}
                    {activeTab === 'staff_management' && (currentRole === 'Business Owner' || currentRole === 'Production Team') && <StaffManagementModule />}
                    {activeTab === 'notifications' && (currentRole === 'Business Owner' || currentRole === 'Production Team') && <NotificationsModule />}
                    {activeTab === 'payments' && (currentRole === 'Business Owner' || currentRole === 'Sales Team') && <PaymentsModule />}
                    {activeTab === 'search' && currentRole === 'Business Owner' && <OrderSearch />}
                    {activeTab === 'users' && currentRole === 'Business Owner' && <UserManagementModule />}
                    {activeTab === 'diagnostics' && currentRole === 'Business Owner' && <DatabaseHealthModule />}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
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
