import React from 'react';
import { OperationsLeads } from './operations/OperationsLeads';
import { EquipmentManagement } from './operations/EquipmentManagement';
import { OperationsStaffManagement } from './operations/OperationsStaffManagement';
import { EventScheduling } from './operations/EventScheduling';
import { TeamAssignments } from './operations/TeamAssignments';
import { NotificationsModule } from './NotificationsModule';
import { OperationsAnalytics } from './operations/OperationsAnalytics';
import { OperationsCalendar } from './OperationsCalendar';
import { useRole } from './RoleContext';
import { normalizeCategory, parseTeamMembers } from '../utils';
import { 
  Briefcase, Sparkles, Calendar, BarChart3, Shield, Search, 
  Layers, Camera, Users, Clock, Bell
} from 'lucide-react';

interface OperationsModuleProps {
  activeSubTab?: 'operations_leads' | 'operations_calendar' | 'equipment_management' | 'operations_staff' | 'event_scheduling' | 'team_assignments' | 'operations_notifications' | 'operations_analytics' | 'package_catalogue';
  setActiveSubTab?: (tab: any) => void;
}

const PackageCatalogueView: React.FC = () => {
  const { packages } = useRole();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [catFilter, setCatFilter] = React.useState('All');

  const filtered = (packages || []).filter(p => {
    const matchesSearch = p.package_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.deliverables && p.deliverables.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = catFilter === 'All' || normalizeCategory(p.category) === catFilter;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', ...Array.from(new Set((packages || []).map(p => normalizeCategory(p.category))))];

  return (
    <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-6 space-y-6 text-left relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/[0.02] rounded-full blur-3xl pointer-events-none" />
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 font-sans tracking-wide">
            Operational Service Catalogue
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Active production & dispatch package layouts synced directly with client pipeline presets.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-48">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900/80 border border-zinc-800 text-xs px-3 py-1.5 pl-8 text-zinc-100 rounded-xl focus:outline-none focus:border-amber-500/50 w-full"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-zinc-900/80 border border-zinc-800 text-xs px-3 py-1.5 text-zinc-350 rounded-xl focus:outline-none focus:border-amber-500/50 cursor-pointer"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-850 rounded-xl">
          <p className="text-xs text-zinc-500 font-mono">No matching package templates found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pkg) => (
            <div key={pkg.package_id} className="bg-[#09090b]/90 border border-zinc-900 hover:border-zinc-800 rounded-xl p-4.5 space-y-4 relative flex flex-col justify-between transition-all duration-350">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[9px] px-2 py-0.5 border border-zinc-800 text-zinc-500 uppercase font-mono font-bold rounded">
                      {normalizeCategory(pkg.category)}
                    </span>
                    <h4 className="text-zinc-200 text-sm font-bold mt-1.5 leading-snug">{pkg.package_name}</h4>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-zinc-500 font-mono">PKG ID:</span>
                    <span className="text-[10px] text-amber-500 font-bold font-mono pl-1">{pkg.package_id}</span>
                  </div>
                </div>

                <div className="h-px bg-zinc-900" />

                <div className="space-y-2 text-xs">
                  {pkg.duration && (
                    <div className="flex justify-between text-zinc-400">
                      <span className="text-zinc-500 font-mono text-[10px]">DURATION:</span>
                      <span>{pkg.duration}</span>
                    </div>
                  )}
                  {pkg.team_members && (
                    <div className="flex justify-between text-zinc-400 gap-2">
                      <span className="text-zinc-500 font-mono text-[10px] shrink-0">CREW PROFILE:</span>
                      <span className="text-right break-words max-w-[150px]">{parseTeamMembers(pkg.team_members).join(', ')}</span>
                    </div>
                  )}
                </div>

                {pkg.deliverables && (
                  <div className="bg-[#040405] border border-zinc-905 p-2.5 rounded-lg text-[11px] text-zinc-405 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block pb-1">Included Deliverables:</span>
                    <span className="leading-relaxed block">{pkg.deliverables}</span>
                  </div>
                )}

                {pkg.seasonal_offer && (
                  <div className="bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg text-[10px] text-amber-400/80 flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="break-words">Special: {pkg.seasonal_offer}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between mt-4">
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">STANDARD TARIFF</span>
                <span className="text-sm font-black text-white font-mono flex items-center">
                  <span className="text-amber-500 font-light pr-0.5">₹</span>
                  <span>{pkg.price.toLocaleString('en-IN')}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const OperationsModule: React.FC<OperationsModuleProps> = ({ 
  activeSubTab = 'operations_leads',
  setActiveSubTab
}) => {
  // Helper to determine the header metadata
  const getHeaderMeta = () => {
    switch (activeSubTab) {
      case 'operations_leads':
        return {
          badge: 'Operations Leads',
          title: 'Confirmed Project Directives',
          desc: 'Monitor booked events, coordinate lead photographer/videographer staff, register safety logs, and advance workflows.'
        };
      case 'operations_calendar':
        return {
          badge: 'Operations Calendar',
          title: 'Squad Roster & Dispatch Calendar',
          desc: 'Monitor physical shoot event dates, reporting countdown timetables, photography teams, and custom site coordinates.'
        };
      case 'equipment_management':
        return {
          badge: 'Gears Registry',
          title: 'Equipment & Asset Logistics',
          desc: 'Register high-end cameras, primes, drones, audios, and accessories. Track equipment states and maintenance lifecycles.'
        };
      case 'operations_staff':
        return {
          badge: 'Roster Board',
          title: 'Staff Onboarding & Field Comms',
          desc: 'Onboard field operators, configure day commission rates, map specialties, and audit duty logs.'
        };
      case 'event_scheduling':
        return {
          badge: 'Timetables',
          title: 'Shoot Timelines & Site Scheduling',
          desc: 'Manage site reporting hours, lock countdown intervals, calendar event dates, and customize site parameters.'
        };
      case 'team_assignments':
        return {
          badge: 'Squad Audit',
          title: 'Roster & Team Double-Book Security',
          desc: 'Inspect double-booking constraints across active calendar dates and manage operator capacities.'
        };
      case 'operations_notifications':
        return {
          badge: 'Bulletins',
          title: 'Operational Telemetry Bulletins',
          desc: 'View alerts, booking modifications, real-time allocations, and database state change triggers.'
        };
      case 'operations_analytics':
        return {
          badge: 'Metrics',
          title: 'Studio Fleet & Resource Analytics',
          desc: 'Analyze deployment rates, camera vs drone units, lifecycles, and capacity segmentation.'
        };
      case 'package_catalogue':
        return {
          badge: 'Catalogue',
          title: 'Premium Package Catalogue',
          desc: 'Verify template structures, price listings, deliverable inclusions, and staff quotas.'
        };
      default:
        return {
          badge: 'Operations',
          title: 'Crew & Gear Dispatch Desk',
          desc: 'Review booked orders, allocate crew personnel, deploy equipment kits, and execute shoot deliveries.'
        };
    }
  };

  const meta = getHeaderMeta();
  const isCoreTab = ['operations_leads', 'operations_calendar', 'operations_analytics', 'team_assignments'].includes(activeSubTab);

  return (
    <div id="operations_module" className="space-y-6">
      {/* Universal Module Header Banner & Core Top Tabs Switcher */}
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span className="p-1 px-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-mono rounded tracking-widest uppercase">
                {meta.badge}
              </span>
              <span>{meta.title}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-4xl">
              {meta.desc}
            </p>
          </div>
        </div>

        {/* Top level sub-tabs removed as functionality exists elsewhere */}
      </div>

      {/* Render sub-modules based on selection state */}
      <div className="w-full">
        {activeSubTab === 'operations_leads' && <OperationsLeads />}
        {activeSubTab === 'operations_calendar' && <OperationsCalendar />}
        {activeSubTab === 'equipment_management' && <EquipmentManagement />}
        {activeSubTab === 'operations_staff' && <OperationsStaffManagement />}
        {activeSubTab === 'event_scheduling' && <EventScheduling />}
        {activeSubTab === 'team_assignments' && <TeamAssignments />}
        {activeSubTab === 'operations_notifications' && <NotificationsModule />}
        {activeSubTab === 'operations_analytics' && <OperationsAnalytics />}
        {activeSubTab === 'package_catalogue' && <PackageCatalogueView />}
      </div>
    </div>
  );
};
