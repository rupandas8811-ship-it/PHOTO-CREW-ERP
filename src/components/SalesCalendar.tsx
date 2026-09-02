import React from 'react';
import { UnifiedCalendar } from './UnifiedCalendar';
import { useRole } from './RoleContext';

interface SalesCalendarProps {
  onSelectLead?: (lead: any) => void;
}

export const SalesCalendar: React.FC<SalesCalendarProps> = ({ onSelectLead }) => {
  const { currentUser, currentUserName } = useRole();
  const salesPersonName = currentUser?.name || currentUserName || 'Sales Team';

  return (
    <div className="space-y-4">
      {/* Calendar Header with Logged-in Sales Person's Name */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-850 shadow-xl">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="p-1 px-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono rounded tracking-widest">CALENDAR</span>
          <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Sales Calendar</h3>
          {salesPersonName && (
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
              <span className="text-xs">👤</span>
              <span>{salesPersonName}</span>
            </span>
          )}
        </div>
      </div>
      <UnifiedCalendar role="sales" onSelectLead={onSelectLead} />
    </div>
  );
};

