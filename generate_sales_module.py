import os

CODE = """import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AddNoteModal } from "./AddNoteModal";
import { createPortal } from 'react-dom';
import { useRole, mapUserFieldsFromDb, INITIAL_PACKAGES, getStatusRank, isFollowUpDateTimeReached } from './RoleContext';
import { supabaseClient } from '../supabaseClient';
import { 
  FileText, Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight, ChevronDown, ChevronUp, Check, Package, Trash, Trash2, Eye, Loader2, CheckCircle2, RefreshCw
} from 'lucide-react';
import { Lead, CurrentStage, LeadPackage, EVENT_TYPES, PACKAGE_CATEGORIES, ACTIVE_STAGE_GROUPS, LeadEvent } from '../types';
import { StatusText } from './ui/StatusText';
import { EventDropdownCell } from './EventDropdownCell';
import { UnifiedEventDropdownCell } from './UnifiedEventDropdownCell';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { CameraLensStatsCard, CameraLensTheme } from './CameraLensStatsCard';
import { ListSortFilter, SortOrder } from './ui/ListSortFilter';
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers, triggerAutoScrollAndFocus, normalizeCategory, parseTeamMembers, formatQtyItem, formatQtyArray, formatQtyList, formatDateDDMMYY } from '../utils';
import { SalesCalendar } from './SalesCalendar';
import { CustomPackageMaster } from './CustomPackageMaster';
import { AddressAutocomplete } from './AddressAutocomplete';

export const SHOOT_TYPES = [
  "CANDID PHOTOGRAPHY", "CINEMATOGRAPHY", "TRADITIONAL PHOTOGRAPHY", 
  "TRADITIONAL VIDEOGRAPHY", "DRONEGRAPHY", "LIVE STREAMING", 
  "SEMI CANDID PHOTOGRAPHY", "SEMI CANDID VIDEOGRAPHY", 
  "STANDARD PHOTOGRAPHY", "STANDARD VIDEOGRAPHY"
];

export interface SalesModuleProps {
  activeSubTab?: string;
  setActiveSubTab?: (val: string) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ activeSubTab: externalActiveTab, setActiveSubTab: externalSetActiveTab }) => {
  const { userRole, userContext } = useRole();
  const [activeTab, setActiveTab] = useState(externalActiveTab || 'list');
  
  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  
  // Modals
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  useEffect(() => {
    if (externalActiveTab && externalActiveTab !== activeTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);
  
  useEffect(() => {
    fetchLeads();
  }, []);
  
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setLeads(data as Lead[] || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
  };
  
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = l.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.mobile?.includes(searchQuery);
      const matchStatus = filterStatus ? l.status === filterStatus : true;
      return matchSearch && matchStatus;
    }).sort((a, b) => {
      const tA = new Date(a.created_at || a.created_date).getTime();
      const tB = new Date(b.created_at || b.created_date).getTime();
      return sortOrder === 'latest' ? tB - tA : tA - tB;
    });
  }, [leads, searchQuery, filterStatus, sortOrder]);

  const statCreatedQuotation = leads.filter(l => l.status === 'Created Quotation').length;
  const statConfirmedOrders = leads.filter(l => l.status === 'Confirm Order' || l.status === 'Order Confirmed').length;
  const statLeadLost = leads.filter(l => l.status === 'Lead Lost').length;

  return (
    <div id="sales_module" className="space-y-6">
      {/* Top dashboard */}
      <div className="space-y-4">
        {selectedLead ? null : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-2">
            {[
              { label: 'Create Quote', val: statCreatedQuotation, theme: 'blue' as CameraLensTheme, filterValue: 'Created Quotation', chartPoints: [10, 15, 12, 18, 14, 20, 16], trendText: 'Initial Lead' },
              { label: 'Confirm Order', val: statConfirmedOrders, theme: 'cyan' as CameraLensTheme, filterValue: 'Confirm Order', chartPoints: [8, 15, 12, 20, 16, 25, 24], trendText: 'To Operations' },
              { label: 'Lead Lost', val: statLeadLost, theme: 'red' as CameraLensTheme, filterValue: 'Lead Lost', chartPoints: [4, 6, 3, 7, 5, 8, 4], trendText: 'Opportunity Closed' },
            ].map((card, idx) => (
              <CameraLensStatsCard
                key={idx}
                label={card.label}
                val={card.val}
                theme={card.theme}
                trendText={card.trendText}
                subText="SALES STATUS"
                chartPoints={card.chartPoints} 
                activeFilterValue={filterStatus} 
                currentFilterValue={card.filterValue} 
                onClick={() => setFilterStatus(filterStatus === card.filterValue ? '' : card.filterValue)}
                lensLabel={card.label.slice(0, 10).toUpperCase()} 
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {selectedLead ? (
           <div className="bg-slate-800 p-6 rounded-xl text-white">
              <button onClick={() => setSelectedLead(null)} className="mb-4 text-blue-400 hover:text-blue-300">&larr; Back to Leads</button>
              <h2 className="text-2xl font-bold mb-2">{selectedLead.customer_name}</h2>
              <p>Mobile: {selectedLead.mobile}</p>
              <p>Status: <StatusText status={selectedLead.status} /></p>
           </div>
        ) : activeTab === 'calendar' ? (
          <SalesCalendar onSelectLead={(lead) => handleSelectLead(lead as Lead)} />
        ) : (
          <div className="space-y-4">
            {/* Leads Directory Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 shadow-sm gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search leads..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <ListSortFilter sortOrder={sortOrder} setSortOrder={setSortOrder} />
              </div>
              <button 
                onClick={() => setIsAddLeadModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New Lead
              </button>
            </div>

            {/* Datagrid */}
            {loading ? (
               <div className="flex justify-center items-center py-20 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
               </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700/50 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-4 py-4 w-12">#</th>
                        <th className="px-4 py-4 min-w-[200px]">Customer</th>
                        <th className="px-4 py-4 min-w-[150px]">Contact</th>
                        <th className="px-4 py-4 min-w-[200px]">Event Details</th>
                        <th className="px-4 py-4 min-w-[150px]">Status</th>
                        <th className="px-4 py-4 min-w-[120px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {filteredLeads.length > 0 ? (
                        filteredLeads.map((lead, idx) => (
                          <tr key={lead.lead_id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="px-4 py-4 text-slate-500">{idx + 1}</td>
                            <td className="px-4 py-4 font-medium text-slate-200">{lead.customer_name}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1 text-slate-300">
                                <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-500" /> {lead.mobile}</span>
                                {lead.email && <span className="flex items-center gap-1.5 text-xs text-slate-400"><Mail className="w-3 h-3" /> {lead.email}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-slate-200 font-medium">{lead.event_type}</span>
                                <span className="text-xs text-slate-400">{lead.event_date}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <StatusText status={lead.status} />
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button onClick={() => handleSelectLead(lead)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">View &rarr;</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                            No leads found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Modals placeholders */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Add New Lead</h3>
            <p className="text-slate-400 mb-6">Create a new lead entry (Form implementation required).</p>
            <div className="flex justify-end gap-3">
               <button onClick={() => setIsAddLeadModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
"""

with open('src/components/SalesModule.tsx', 'w') as f:
    f.write(CODE)

