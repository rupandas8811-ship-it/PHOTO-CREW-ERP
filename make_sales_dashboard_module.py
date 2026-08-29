import os

sales_dashboard_code = """import React from 'react';
import { SalesModuleProps } from './SalesUtils';
import { useSalesDashboardState } from './sales/useSalesDashboardState';
import { SalesBookingConfirmationModal } from './sales/SalesBookingConfirmationModal';
import { SalesLeadsTable } from './sales/SalesLeadsTable';
import { SalesCustomerProfiles } from './sales/SalesCustomerProfiles';
import { SalesPackagesManager } from './sales/SalesPackagesManager';
import { SalesCrmWizard } from './sales/SalesCrmWizard';
import { SalesModals } from './sales/SalesModals';
import { SalesCalendar } from './SalesCalendar';
import { CustomPackageMaster } from './CustomPackageMaster';
import { Plus } from 'lucide-react';

export const SalesDashboardModule: React.FC<SalesModuleProps> = ({ 
  activeSubTab: externalActiveTab, 
  setActiveSubTab: externalSetActiveTab 
}) => {
  const state = useSalesDashboardState(externalActiveTab, externalSetActiveTab);

  return (
    <div id="sales_module" className="space-y-6">
      {/* Schema / Integrity Exception Modal */}
      {state.statusError && (
        <div className="fixed inset-0 bg-slate-955/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex items-center gap-3">
              <span className="p-2.5 bg-red-500/20 text-red-400 rounded-xl text-lg">⚠️</span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-sans">{state.statusError.title || 'Status Update Failed'}</h3>
                <p className="text-[10px] text-red-400 font-mono tracking-wider">DATABASE SCHEMA / INTEGRITY EXCEPTION</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Reason:</span>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-red-300 font-mono leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {state.statusError.reason}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Suggested Fix / Schema Migration:</span>
                <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-3 text-xs text-emerald-300 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {state.statusError.suggestedFix}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border-t border-slate-800 px-6 py-3.5 flex justify-end">
              <button
                onClick={() => state.setStatusError(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      {state.activeTab !== 'create' && state.activeTab !== 'custom_package_master' && !state.selectedLead && (
        <div 
          className={`${state.activeTab === 'calendar' ? 'hidden' : 'flex'} flex-col sm:flex-row sm:items-center justify-between gap-4`}
          style={state.activeTab === 'calendar' ? { display: 'none' } : undefined}
        >
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono rounded tracking-widest">SALES</span>
              <span>Sales & Lead Desk</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Capture enquiries, build bespoke quotations, coordinate shoot specifications, and track conversion workflows.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {state.canEdit && (
              <button
                id="btn_create_new_lead"
                onClick={() => state.setActiveTab('create')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create New Lead</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* View Sub-Tabs Switcher */}
      {state.activeTab === 'custom_package_master' && (
        <CustomPackageMaster />
      )}

      {state.activeTab === 'calendar' && (
        <SalesCalendar onSelectLead={(lead) => state.handleSelectLead(lead)} />
      )}

      {state.activeTab === 'profiles' && (
        <SalesCustomerProfiles {...state} />
      )}

      {state.activeTab === 'packages' && (
        <SalesPackagesManager {...state} />
      )}

      {/* Screen 2 Create Lead / Step 1, 2, 3 CRM Wizard */}
      {(state.activeTab === 'create' || state.selectedLead) && (
        <SalesCrmWizard {...state} />
      )}

      {/* Leads Directory & Table (when not in create/lead detail view) */}
      {state.activeTab === 'list' && !state.selectedLead && (
        <SalesLeadsTable {...state} />
      )}

      {/* Booking Confirmation & Contract Form Modal */}
      <SalesBookingConfirmationModal {...state} />

      {/* Supporting Global & Action Modals */}
      <SalesModals {...state} />
    </div>
  );
};

export const SalesModule = SalesDashboardModule;
"""

with open('src/components/SalesDashboardModule.tsx', 'w', encoding='utf-8') as f:
    f.write(sales_dashboard_code)

print(f"SalesDashboardModule.tsx written successfully with {len(sales_dashboard_code.splitlines())} lines.")
