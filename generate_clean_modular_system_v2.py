import re
import os

with open('src/components/SalesModule.tsx', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='ignore')
lines = text.split('\n')

common_imports = """import React, { useState, useEffect, useRef } from 'react';
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
"""

# 1. CustomerProfiles: lines 10123 to 10642 (0-indexed: 10122 to 10642)
cust_inner = '\n'.join(lines[10122:10642])
cust_file = common_imports + """
export interface SalesCustomerProfilesProps {
  [key: string]: any;
}

export const SalesCustomerProfiles: React.FC<SalesCustomerProfilesProps> = (props) => {
  const {
    leads,
    orders,
    payments,
    production,
    customerProfiles,
    selectedCustomerProfileId,
    setSelectedCustomerProfileId,
    customerSearchQuery,
    setCustomerSearchQuery,
    isQuickReorderView,
    setIsQuickReorderView,
    reorderForm,
    setReorderForm,
    handleQuickReorderSubmit,
    isSaving,
    EVENT_TYPES,
    SHOOT_TYPES,
    packages,
    formatDDMMYYYY,
    convertTo12Hour
  } = props;

  return (
""" + cust_inner + """
  );
};
"""
with open('src/components/sales/SalesCustomerProfiles.tsx', 'w', encoding='utf-8') as f:
    f.write(cust_file)

# 2. PackagesManager: lines 10647 to 11287 (0-indexed: 10646 to 11287)
pkg_inner = '\n'.join(lines[10646:11287])
pkg_file = common_imports + """
export interface SalesPackagesManagerProps {
  [key: string]: any;
}

export const SalesPackagesManager: React.FC<SalesPackagesManagerProps> = (props) => {
  const {
    isAddFormOpen,
    setIsAddFormOpen,
    editingPackage,
    setEditingPackage,
    pkgForm,
    setPkgForm,
    categoriesList,
    PACKAGE_CATEGORIES,
    customCategory,
    setCustomCategory,
    pkgTeamMembers,
    setPkgTeamMembers,
    pkgDeliverablesList,
    setPkgDeliverablesList,
    pkgDeliverableInput,
    setPkgDeliverableInput,
    activeMasterRoles,
    activeMasterDeliverables,
    isSaving,
    handleSavePackage,
    packageSuccessMsg,
    setPackageSuccessMsg,
    dbCategoryError,
    catSearchQuery,
    setCatSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    PACKAGES_LIST,
    packages,
    setViewingPkgDetails,
    setDeletingPackageId,
    setIsComparingPkgs,
    canEdit
  } = props;

  return (
""" + pkg_inner + """
  );
};
"""
with open('src/components/sales/SalesPackagesManager.tsx', 'w', encoding='utf-8') as f:
    f.write(pkg_file)

# 3. SalesLeadsTable: lines 11547 to 12224 (0-indexed: 11546 to 12224)
table_inner = '\n'.join(lines[11546:12224])

# Action Dropdown inside SalesLeadsTable
start_marker = r'<td className="p-3\.5 text-right pr-5 w-\[160px\] min-w-max overflow-visible relative">'
end_marker = r'</td>'

match_iter = list(re.finditer(start_marker, table_inner))
if len(match_iter) > 0:
    start_idx = match_iter[0].start()
    end_idx = table_inner.find(end_marker, start_idx) + len(end_marker)
    
    new_td = """<td className="p-3.5 text-right pr-5 w-[160px] min-w-max overflow-visible relative">
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
                          </td>"""
    table_inner = table_inner[:start_idx] + new_td + table_inner[end_idx:]

table_file = common_imports + """
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
    LEAD_SOURCES,
    statCreatedQuotation,
    statQuotesSent,
    statQuoteFollowups,
    statConfirmedOrders,
    statLostLeads,
    activeStageTab,
    setActiveStageTab,
    activeTab,
    setActiveTab,
    categoriesList,
    users
  } = props;

  return (
""" + table_inner + """
  );
};
"""
with open('src/components/sales/SalesLeadsTable.tsx', 'w', encoding='utf-8') as f:
    f.write(table_file)

# 4. SalesCrmWizard: lines 11289 to 11544 (0-indexed: 11288 to 11544) AND lines 13176 to 14513 (0-indexed: 13175 to 14513)
w1_inner = '\n'.join(lines[11288:11544])
w2_inner = '\n'.join(lines[13175:14513])

w2_inner = re.sub(
    r"\{isSaving \? 'Saving\.\.\.' : crmWizardStep === 3 \? 'SAVE & FOLLOW-UP' : 'Save & Next'\}",
    r"{isSaving ? 'Saving...' : crmWizardStep === 3 ? (['Order Confirmed', 'Event Scheduled', 'Completed'].includes(wizardLeadData.status || selectedLead?.status || '') ? 'SAVE' : 'SAVE & FOLLOW-UP') : 'Save & Next'}",
    w2_inner
)

crm_file = common_imports + """
export interface SalesCrmWizardProps {
  [key: string]: any;
}

export const SalesCrmWizard: React.FC<SalesCrmWizardProps> = (props) => {
  const {
    activeTab,
    selectedLead,
    wizardStep,
    setWizardStep,
    createForm,
    setCreateForm,
    otherSource,
    setOtherSource,
    createEvents,
    setCreateEvents,
    showEventForm,
    setShowEventForm,
    eventForm,
    setEventForm,
    editingEventId,
    setEditingEventId,
    handleEventFormSubmit,
    handleDeleteEvent,
    selectedPkgIds,
    setSelectedPkgIds,
    isPkgDropdownOpen,
    setIsPkgDropdownOpen,
    pkgSearchQuery,
    setPkgSearchQuery,
    categoriesList,
    PACKAGES_LIST,
    packages,
    pkgPrices,
    setPkgPrices,
    pkgDeliverables,
    setPkgDeliverables,
    pkgNotes,
    setPkgNotes,
    leadDiscount,
    setLeadDiscount,
    subtotal,
    finalTotal,
    handleCreateLead,
    isSaving,
    crmWizardStep,
    setCrmWizardStep,
    crmHighestStep,
    setCrmHighestStep,
    wizardLeadData,
    setWizardLeadData,
    crmEvents,
    setCrmEvents,
    collapsedEventIds,
    setCollapsedEventIds,
    handleUpdateLeadCrm,
    handleCancelCrmEdit,
    crmToast,
    detectedCustomer,
    showDetectionPopup,
    setShowDetectionPopup,
    isApprovedUnlocked,
    isLeadLocked,
    isCrmLocked,
    isLeadLost,
    isLeadConfirmed,
    currentRole,
    currentUser,
    users,
    canEdit,
    LEAD_SOURCES,
    EVENT_TYPES,
    SHOOT_TYPES,
    activeMasterRoles,
    activeMasterDeliverables,
    eventsReporting,
    setEventsReporting,
    formatDDMMYYYY,
    convertTo12Hour,
    quoteServices,
    setQuoteServices,
    isAddingInline,
    setIsAddingInline,
    newServiceName,
    setNewServiceName,
    newServiceQty,
    setNewServiceQty,
    newServicePrice,
    setNewServicePrice,
    editingServiceId,
    setEditingServiceId,
    editableInclusions,
    setEditableInclusions,
    editableDeliverables,
    setEditableDeliverables,
    quoteDiscount,
    setQuoteDiscount,
    quoteAdditional,
    setQuoteAdditional,
    generatedPDFBlobUrl,
    setGeneratedPDFBlobUrl,
    activeQuoteNum,
    setActiveQuoteNum,
    handleSavePdfAndPreview,
    handleSaveAndSendWhatsAppQuotation,
    setShowUnlockRequestModal,
    setSelectedUnlockLead,
    setUnlockRequestReason,
    setUnlockRequestCustomReason,
    setShowLostModal,
    setLostReason,
    setOtherLostReason,
    setLostNotes,
    setShowCancelConfirmPopup,
    getStrictLostReasonAndNotes,
    getLostReasonAndNotes,
    appendCompletedStep,
    showValidationError,
    showToastMsg,
    logStatusUpdateError,
    parseStatusUpdateError,
    statusHistory,
    orders,
    payments,
    isStep1Locked,
    isStep2Locked,
    isStep3Locked,
    resetForm,
    initEventsReporting,
    renderEventDetailsSection,
    renderStep3Workspace,
    customSource,
    setCustomSource,
    handleWizardNext,
    existingCustomerData,
    useExistingCustomerData,
    discardExistingCustomerData,
    confirmUseExistingCustomer,
    confirmDiscardExistingCustomer,
    customFieldValues,
    setCustomFieldValues,
    eventsList,
    setEventsList,
    getLeadCurrentStatus
  } = props;

  if (activeTab === 'create' && !selectedLead) {
    return (
      <div id="create_lead_wizard_container" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col text-slate-350">
""" + w1_inner + """
      </div>
    );
  }

  if (selectedLead) {
    return (
      <div id="crm_lead_detail_modal_container" className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
""" + w2_inner + """
      </div>
    );
  }

  return null;
};
"""
with open('src/components/sales/SalesCrmWizard.tsx', 'w', encoding='utf-8') as f:
    f.write(crm_file)

# 5. SalesModals: lines 12605 to 13174 (0-indexed: 12604 to 13174) AND lines 14518 to 15340 (0-indexed: 14517 to 15340)
m1_inner = '\n'.join(lines[12604:13174])
m2_inner = '\n'.join(lines[14517:15340])

modals_file = common_imports + """
export interface SalesModalsProps {
  [key: string]: any;
}

export const SalesModals: React.FC<SalesModalsProps> = (props) => {
  const {
    noteModalOpen,
    setNoteModalOpen,
    noteModalLeadId,
    noteModalOrderId,
    noteModalCustomerName,
    showFinalReportingModal,
    setShowFinalReportingModal,
    finalReportingEvent,
    finalReportingDate,
    setFinalReportingDate,
    finalReportingEndDate,
    setFinalReportingEndDate,
    finalReportingTime,
    setFinalReportingTime,
    handleSaveFinalReportingDetails,
    showStep3Popup,
    setShowStep3Popup,
    step3FollowUpDate,
    setStep3FollowUpDate,
    step3FollowUpTime,
    setStep3FollowUpTime,
    step3FollowUpNotes,
    setStep3FollowUpNotes,
    handleSaveStep3FollowUpPopup,
    errorDetails,
    setErrorDetails,
    showLostModal,
    setShowLostModal,
    selectedLead,
    lostReason,
    setLostReason,
    otherLostReason,
    setOtherLostReason,
    lostNotes,
    setLostNotes,
    handleSaveLostLead,
    isSaving,
    showUnlockRequestModal,
    setShowUnlockRequestModal,
    selectedUnlockLead,
    unlockRequestReason,
    setUnlockRequestReason,
    unlockRequestCustomReason,
    setUnlockRequestCustomReason,
    handleRequestUnlockQuotation,
    showCancelConfirmPopup,
    setShowCancelConfirmPopup,
    handleConfirmCancelCrm,
    unlockingRecordId,
    setUnlockingRecordId,
    unlockReason,
    setUnlockReason,
    unlockCustomReason,
    setUnlockCustomReason,
    handleUnlockRecord,
    viewingPkgDetails,
    setViewingPkgDetails,
    deletingPackageId,
    setDeletingPackageId,
    isDeletingPackage,
    deletePackageError,
    handleDeletePackageConfirm,
    isComparingPkgs,
    setIsComparingPkgs,
    packages,
    formatDDMMYYYY,
    convertTo12Hour
  } = props;

  return (
    <>
      <AddNoteModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        leadId={noteModalLeadId}
        orderId={noteModalOrderId}
        customerName={noteModalCustomerName}
      />

""" + m1_inner + "\n" + m2_inner + """
    </>
  );
};
"""
with open('src/components/sales/SalesModals.tsx', 'w', encoding='utf-8') as f:
    f.write(modals_file)

print("V2 generated successfully!")
