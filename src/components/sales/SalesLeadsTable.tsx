import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight, ChevronDown, ChevronUp, Check, Package, Trash, Trash2, Eye, Loader2, CheckCircle2, RefreshCw, AlertCircle, MessageSquare
} from 'lucide-react';
import { Lead, CurrentStage, LeadPackage, EVENT_TYPES, PACKAGE_CATEGORIES, ACTIVE_STAGE_GROUPS, LeadEvent } from '../../types';
import { StatusText } from '../ui/StatusText';
import { EventDropdownCell } from '../EventDropdownCell';
import { UnifiedEventDropdownCell } from '../UnifiedEventDropdownCell';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { CameraLensStatsCard, CameraLensTheme } from '../CameraLensStatsCard';
import { ListSortFilter, SortOrder } from '../ui/ListSortFilter';
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers, triggerAutoScrollAndFocus, normalizeCategory, parseTeamMembers, formatQtyItem, formatQtyArray, formatQtyList, formatDateDDMMYY } from '../../utils';
import { SalesCalendar } from '../SalesCalendar';
import { CustomPackageMaster } from '../CustomPackageMaster';
import { AddressAutocomplete } from '../AddressAutocomplete';
import { jsPDF } from 'jspdf';
import { SHOOT_TYPES, LocalEditableInput, parseQtyAndText, combineQtyAndText, formatListToStructuredObjects, buildStep3EventPayloads, parseTeamMembersJsonToRecord, parseDeliverablesJsonToRecord, CompactQtyItemRowProps, CompactQtyItemRow, validateAndFormatTime, getLogoBase64FromUrl, generateQuotationPdfFileName, generateQuotationPDF, highlightText, LEAD_SOURCES, SalesModuleProps } from '../SalesUtils';
import { AddNoteModal } from '../AddNoteModal';

export interface SalesLeadsTableProps {
  [key: string]: any;
}

export const SalesLeadsTable: React.FC<SalesLeadsTableProps> = (props) => {
  const {
    leads,
    filteredLeads,
    orders,
    payments,
    packages,
    currentRole,
    currentUser,
    canEdit,
    filterQuery,
    setFilterQuery,
    sortOrder,
    setSortOrder,
    isDownloadReportsExpanded,
    setIsDownloadReportsExpanded,
    isFiltersExpanded,
    setIsFiltersExpanded,
    filterSource,
    setFilterSource,
    filterStatus,
    setFilterStatus,
    filterSalesPerson,
    setFilterSalesPerson,
    filterDate,
    setFilterDate,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    appliedStartDate,
    setAppliedStartDate,
    appliedEndDate,
    setAppliedEndDate,
    handleDownloadCSV,
    handleDownloadExcel,
    handlePrintReport,
    resetFilters,
    getLeadCurrentStatus,
    getLeadCurrentStage,
    getStatusRank,
    isFollowUpDateTimeReached,
    unlockRequests,
    openDropdownLeadId,
    setOpenDropdownLeadId,
    dropdownCoords,
    setDropdownCoords,
    setNoteModalOpen,
    setNoteModalLeadId,
    setNoteModalOrderId,
    setNoteModalCustomerName,
    handleSelectLead,
    setSelectedLead,
    selectedLead,
    confirmForm,
    setConfirmForm,
    initEventsReporting,
    setShowConfirmModal,
    setSelectedUnlockLead,
    setUnlockRequestReason,
    setUnlockRequestCustomReason,
    setShowUnlockRequestModal,
    setLostReason,
    setOtherLostReason,
    setLostNotes,
    setShowLostModal,
    wizardLeadData,
    statCreatedQuotation,
    statQuotesSent,
    statQuoteFollowups,
    statConfirmedOrders,
    statLeadLost,
    statLostLeads,
    activeStageTab,
    setActiveStageTab,
    activeTab,
    setActiveTab,
    categoriesList,
    users
  } = props;

  const leadSourcesList = props.LEAD_SOURCES || LEAD_SOURCES || [];
  const safeFilteredLeads = Array.isArray(filteredLeads) ? filteredLeads : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safePackages = Array.isArray(packages) ? packages : [];

  return (
        <div className="space-y-4">

          {/* Sales Performance Dashboard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-2">
            {[
              { label: 'Create Quote', val: statCreatedQuotation, theme: 'blue' as CameraLensTheme, filterValue: 'Create Quote', chartPoints: [10, 15, 12, 18, 14, 20, 16], trendText: 'Initial Lead' },
              { label: 'Quote Sent', val: statQuotesSent, theme: 'purple' as CameraLensTheme, filterValue: 'Quote Sent', chartPoints: [12, 14, 18, 15, 21, 25, 22], trendText: 'Quotation Saved' },
              { label: 'Quote Follow-up', val: statQuoteFollowups, theme: 'gold' as CameraLensTheme, filterValue: 'Quote Follow-up', chartPoints: [5, 12, 8, 15, 10, 19, 14], trendText: 'Scheduled CRM' },
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
          
          {/* Leads Directory Header Bar & Collapsible Utilities */}
          {(() => {
            const activeFilterCount = [
              Boolean(filterQuery.trim()),
              Boolean(filterSource),
              Boolean(filterStatus),
              Boolean(dateRangeStart || appliedStartDate),
              Boolean(dateRangeEnd || appliedEndDate)
            ].filter(Boolean).length;

            return (
              <div className="space-y-3">
                {/* Leads Directory Title & Control Buttons Bar */}
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-850 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Leads Directory</h3>
                        <p className="text-[10px] text-zinc-400">Export active pipeline registers using start and end filters</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      {/* Sort Order Filter Button */}
                      <ListSortFilter value={sortOrder} onChange={setSortOrder} />

                      {/* Download Reports Button */}
                      <button
                        type="button"
                        id="btn_toggle_download_reports"
                        onClick={() => setIsDownloadReportsExpanded(!isDownloadReportsExpanded)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm ${
                          isDownloadReportsExpanded
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10'
                            : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <span>📥</span>
                        <span>Download Reports</span>
                        {isDownloadReportsExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-amber-400 ml-0.5 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5 shrink-0" />
                        )}
                      </button>

                      {/* Filters Toggle Button */}
                      <button
                        type="button"
                        id="btn_toggle_filters"
                        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm ${
                          isFiltersExpanded || activeFilterCount > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                            : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                          <span className="bg-emerald-500 text-zinc-950 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                            {activeFilterCount}
                          </span>
                        )}
                        {isFiltersExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-emerald-400 ml-0.5 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Download Reports Options Panel */}
                  <div 
                    className={`grid transition-all duration-300 ease-in-out ${
                      isDownloadReportsExpanded 
                        ? 'grid-rows-[1fr] opacity-100 pt-3 border-t border-zinc-800/60' 
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handlePrintReport}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-amber-400 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                          title="Print lead report to paper"
                        >
                          <span>🖨️</span> Print Report
                        </button>
                        
                        <button
                          type="button"
                          onClick={handlePrintReport}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-rose-400 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                          title="Download report as PDF format"
                        >
                          <span>📄</span> Download PDF
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleDownloadExcel}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-emerald-450 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                          title="Download report as Excel spreadsheet"
                        >
                          <span>📊</span> Excel (.xlsx)
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadCSV}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-indigo-400 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                          title="Download report as CSV file"
                        >
                          <span>📝</span> CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Quick Filters Panel */}
                <div 
                  className={`grid transition-all duration-300 ease-in-out ${
                    isFiltersExpanded 
                      ? 'grid-rows-[1fr] opacity-100 my-3' 
                      : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="bg-zinc-900/40 rounded-2xl border border-zinc-850 shadow-xl relative p-4">
                      {/* Corner calibration tick marks */}
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-emerald-500/40" />
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-emerald-500/40" />
                      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-emerald-500/40" />
                      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-emerald-500/40" />

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Search query */}
                        <div className="md:col-span-3">
                          <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">
                            Search Lead / Customer Name
                          </label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-emerald-505 absolute left-3 top-3" />
                            <input
                              type="text"
                              placeholder="ID, name, or phone..."
                              value={filterQuery}
                              onChange={(e) => setFilterQuery(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                            />
                          </div>
                        </div>

                        {/* Source */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                            Lead Source
                          </label>
                          <select
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100/90"
                          >
                            <option value="">All Sources</option>
                            {(leadSourcesList || []).map(source => (
                              <option key={source} value={source}>{source}</option>
                            ))}
                          </select>
                        </div>

                        {/* Status (Stage) */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                            Active Stage
                          </label>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100/90 font-sans cursor-pointer focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">All Stages</option>
                            {(ACTIVE_STAGE_GROUPS || []).map((group, idx) => (
                              <optgroup key={idx} label={group.label} className={`bg-slate-950 ${group.colorClass} font-bold`}>
                                {(group.options || []).map(opt => (
                                  <option key={opt.value} value={opt.value} className="text-white font-normal">{opt.label}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        {/* Start Date */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                            Start Date (Created)
                          </label>
                          <input
                            type="date"
                            value={dateRangeStart}
                            onChange={(e) => setDateRangeStart(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                          />
                        </div>

                        {/* End Date */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                            End Date (Created)
                          </label>
                          <input
                            type="date"
                            value={dateRangeEnd}
                            onChange={(e) => setDateRangeEnd(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
                          />
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex flex-col sm:flex-row md:flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedStartDate(dateRangeStart);
                              setAppliedEndDate(dateRangeEnd);
                            }}
                            className="w-full flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 py-1.5 text-[10px] font-bold text-white rounded transition-all cursor-pointer"
                            title="Apply Date Filter"
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFilterQuery('');
                              setFilterSource('');
                              setFilterStatus('');
                              setFilterSalesPerson('');
                              setFilterDate('');
                              setDateRangeStart('');
                              setDateRangeEnd('');
                              setAppliedStartDate('');
                              setAppliedEndDate('');
                            }}
                            className="w-full flex items-center justify-center gap-0.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 py-1.5 px-1.5 text-[10px] text-zinc-300 rounded transition-all cursor-pointer animate-none"
                            title="Reset all filters"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Table view */}
          <div className="bg-zinc-900/20 rounded-2xl border border-zinc-850 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-max">
                <thead>
                  <tr className="bg-zinc-950/70 text-zinc-405 font-bold border-b border-zinc-850 text-[10px] uppercase font-mono tracking-wider">
                    <th className="p-3.5 pl-5">Lead ID</th>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Mobile Number</th>
                    <th className="p-3.5">Event</th>
                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Created Date</th>
                    <th className="p-3.5 text-right pr-5 w-[160px] min-w-max">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {safeFilteredLeads.length > 0 ? (
                    safeFilteredLeads.map((lead) => {
                      const leadStatus = getLeadCurrentStatus ? getLeadCurrentStatus(lead) : lead.status;
                      const currentStage = getLeadCurrentStage ? getLeadCurrentStage(lead) : 'Sales';
                      const isActiveInSales = currentStage === 'Sales';
                      const linkedOrder = safeOrders.find((o) => o.lead_id === lead.lead_id);
                      return (
                        <tr 
                          key={lead.lead_id} 
                          className="hover:bg-zinc-900/30 text-zinc-300 transition-all"
                        >
                          <td className="p-3.5 pl-5 font-mono text-[11px] font-bold text-indigo-400">
                            {lead.lead_id}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-violet-400 font-bold">
                            {linkedOrder ? linkedOrder.order_id : 'N/A'}
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {lead.customer_name === 'Inbound Prospect' ? '' : lead.customer_name}
                          </td>
                          <td className="p-3.5 font-mono text-zinc-400">
                            {formatIndianPhoneNumber(lead.mobile)}
                          </td>
                          <td className="p-3.5 text-zinc-300 font-sans">
                            <UnifiedEventDropdownCell lead={lead} />
                          </td>
                          <td className="p-3.5">
                            <StatusText status={leadStatus} />
                          </td>
                          <td className="p-3.5 font-mono text-zinc-400">
                            {lead.created_date ? lead.created_date.split('T')[0] : 'N/A'}
                          </td>
                          <td className="p-3.5 text-right pr-5 w-[160px] min-w-max overflow-visible relative">
                            {(() => {
                              const isManageCrmOnlyStatus = ['New Lead', 'Follow-up', 'Follow Up', 'Contacted', 'Create Quote', 'Created Quotation'].includes(leadStatus);
                              const isActionsDropdownStatus = ['Quote Sent', 'Quotation Sent', 'Quote Follow-up', 'Negotiation', 'Confirm Order', 'Order Confirmed'].includes(leadStatus) || currentStage !== 'Sales';
                              const isLeadLostStatus = ['Lead Lost', 'Lost Lead'].includes(leadStatus);
                              
                              const latestUnlockRequest = unlockRequests
                                .filter((r: any) => r.lead_id === lead.lead_id || (linkedOrder && r.order_id === linkedOrder.order_id) || ((lead as any).order_id && r.order_id === (lead as any).order_id))
                                .sort((a: any, b: any) => new Date(b.created_at || b.requested_at || "").getTime() - new Date(a.created_at || a.requested_at || "").getTime())[0];
                              const isPendingUnlock = latestUnlockRequest?.status === 'Pending' || latestUnlockRequest?.request_status === 'Pending';
                              const isRejectedUnlock = latestUnlockRequest?.status === 'Rejected' || latestUnlockRequest?.request_status === 'Rejected';
                              const isApprovedUnlock = lead.quotation_locked === false || (
                                lead.quotation_locked !== true && (latestUnlockRequest?.status === 'Approved' || latestUnlockRequest?.request_status === 'Approved')
                              );
                              
                              return (
                                  <div className="relative flex justify-end actions-dropdown-container">
                                    <button
                                      type="button"
                                      id={`btn_actions_confirm_${lead.lead_id}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (openDropdownLeadId === lead.lead_id) {
                                          setOpenDropdownLeadId(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const spaceBelow = window.innerHeight - rect.bottom;
                                          const spaceAbove = rect.top;
                                          const menuHeight = 180;
                                          
                                          let top: number | string = rect.bottom + 4;
                                          let bottom: number | string = 'auto';
                                          
                                          if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                                            top = 'auto';
                                            bottom = window.innerHeight - rect.top + 4;
                                          }
                                          
                                          setDropdownCoords({ top, right: window.innerWidth - rect.right, bottom });
                                          setOpenDropdownLeadId(lead.lead_id);
                                        }
                                      }}
                                      className={`w-36 h-8 text-[11px] font-bold rounded-xl border transition-all cursor-pointer inline-flex items-center justify-between px-2.5 shadow shrink-0 ${
                                        isApprovedUnlock
                                          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40'
                                          : 'bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white border-zinc-850'
                                      }`}
                                    >
                                      <span>{isApprovedUnlock ? '✔ Edit Record' : '⚡ Actions'}</span>
                                      <span className="text-[10px] ml-1">▼</span>
                                    </button>
                                    
                                    {openDropdownLeadId === lead.lead_id && createPortal(
                                      <div 
                                        className="fixed w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-[9999] p-1.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 text-left actions-dropdown-menu"
                                        style={{ top: dropdownCoords.top, right: dropdownCoords.right, bottom: dropdownCoords.bottom }}
                                      >
                                        {/* ALWAYS SHOW ADD NOTE */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            setNoteModalLeadId(lead.lead_id);
                                            setNoteModalOrderId('');
                                            setNoteModalCustomerName(lead.customer_name);
                                            setNoteModalOpen(true);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 hover:text-white rounded-lg border border-blue-900/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <FileText className="w-3.5 h-3.5 shrink-0" />
                                          <span>Add Note</span>
                                        </button>
                                        
                                        {/* VIEW / MANAGE CRM */}
                                        <button
                                          type="button"
                                          id={`btn_followup_${lead.lead_id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            handleSelectLead(lead);
                                          }}
                                          className={`w-full h-8 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 shadow ${(!isLeadLostStatus && canEdit) ? 'bg-sky-950/30 hover:bg-sky-900/50 text-sky-400 hover:text-white border border-sky-900/50' : 'bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white border border-zinc-850/40'}`}
                                        >
                                          {(!isLeadLostStatus && canEdit) ? <Edit className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0" />}
                                          <span>{(!isLeadLostStatus && canEdit) ? 'Manage CRM' : 'View CRM'}</span>
                                        </button>
                                        
                                        {/* CONFIRM ORDER - only show before confirmation */}
                                        {isActionsDropdownStatus && leadStatus !== 'Order Confirmed' && leadStatus !== 'Order Close' && currentStage === 'Sales' && (
                                          <button
                                            type="button"
                                            id={`btn_confirm_order_direct_${lead.lead_id}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              handleSelectLead(lead);
                                              const today = new Date().toISOString().split('T')[0];
                                              const linkedOrder = orders?.find((o: any) => o.lead_id === lead.lead_id);
                                              const linkedPayment = linkedOrder ? payments?.find((p: any) => p.order_id === linkedOrder.order_id) : null;
                                              const calcAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : (Number(lead.advance_collected) || 0));
                                              setConfirmForm({
                                                ...confirmForm,
                                                package_name: packages?.find((p: any) => String(p.package_id) === String(lead.Select_Package_Option))?.package_name || lead.Select_Package_Option || '',
                                                quotation_amount: Number(lead.Final_Quotation_Amount) || Number((lead as any).final_quotation_amount) || Number(lead.Final_Package_Amount) || Number((lead as any).final_package_amount) || Number((lead as any).final_amount) || (lead.lead_id === selectedLead?.lead_id ? Number(wizardLeadData.final_amount) : 0) || 0,
                                                advance_received: calcAdvance,
                                                event_date: lead.event_date || today,
                                                event_time: lead.event_time || ''
                                              });
                                              initEventsReporting(lead);
                                              setShowConfirmModal(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-white rounded-lg border border-emerald-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                                            <span>Confirm Order</span>
                                          </button>
                                        )}
                                        
                                        {/* UNLOCK QUOTATION (if pending/rejected/locked) */}
                                        {(!isApprovedUnlock && !isPendingUnlock && lead.quotation_locked) && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              setSelectedUnlockLead(lead);
                                              setUnlockRequestReason('Customer requested additional discount');
                                              setUnlockRequestCustomReason('');
                                              setShowUnlockRequestModal(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-amber-950 hover:bg-amber-900 text-amber-400 hover:text-white rounded-lg border border-amber-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <Ban className="w-3.5 h-3.5 shrink-0" />
                                            <span>Unlock Quotation</span>
                                          </button>
                                        )}
                                        
                                        {/* LOST LEAD */}
                                        {!isLeadLostStatus && leadStatus !== 'Order Confirmed' && leadStatus !== 'Order Close' && (
                                          <button
                                            type="button"
                                            id={`btn_lost_lead_direct_${lead.lead_id}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              setSelectedLead(lead);
                                              setLostReason('');
                                              setOtherLostReason('');
                                              setLostNotes('');
                                              setShowLostModal(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-rose-950 hover:bg-rose-900 text-rose-400 hover:text-white rounded-lg border border-rose-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <X className="w-3.5 h-3.5 shrink-0" />
                                            <span>Lost Lead</span>
                                          </button>
                                        )}
                                      </div>,
                                      document.body
                                    )}
                                  </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-500">
                        <Filter className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                        <span className="text-xs font-mono text-zinc-500">No matching records in the directory grid. Try resetting filters.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
  );
};
