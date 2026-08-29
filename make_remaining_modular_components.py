import re
import os

with open('src/components/SalesModule.tsx', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='ignore')
lines = text.split('\n')

common_imports = """import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight, ChevronDown, ChevronUp, Check, Package, Trash, Trash2, Eye, Loader2, CheckCircle2, RefreshCw
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

# Component 1: SalesCustomerProfiles.tsx (lines 10117 to 10714)
cust_slice = '\n'.join(lines[10116:10714])
cust_comp = common_imports + """
export interface SalesCustomerProfilesProps {
  [key: string]: any;
}

export const SalesCustomerProfiles: React.FC<SalesCustomerProfilesProps> = (props) => {
  const {
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
    <>
""" + cust_slice + """
    </>
  );
};
"""
with open('src/components/sales/SalesCustomerProfiles.tsx', 'w', encoding='utf-8') as f:
    f.write(cust_comp)

# Component 2: SalesPackagesManager.tsx (lines 10715 to 11288)
pkg_slice = '\n'.join(lines[10714:11288])
pkg_comp = common_imports + """
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
    activeMasterRoles,
    activeMasterDeliverables,
    isSaving,
    handleSavePackage,
    packageSuccessMsg,
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
    <>
""" + pkg_slice + """
    </>
  );
};
"""
with open('src/components/sales/SalesPackagesManager.tsx', 'w', encoding='utf-8') as f:
    f.write(pkg_comp)

# Component 3: SalesCrmWizard.tsx (lines 11289 to 11548 and lines 13179 to 14514)
wizard_slice1 = '\n'.join(lines[11288:11548])
wizard_slice2 = '\n'.join(lines[13178:14514])

# Apply Fix: Save & Follow-Up vs Save button
wizard_slice2 = re.sub(
    r"\{isSaving \? 'Saving\.\.\.' : crmWizardStep === 3 \? 'SAVE & FOLLOW-UP' : 'Save & Next'\}",
    r"{isSaving ? 'Saving...' : crmWizardStep === 3 ? (['Order Confirmed', 'Event Scheduled', 'Completed'].includes(wizardLeadData.status || selectedLead?.status || '') ? 'SAVE' : 'SAVE & FOLLOW-UP') : 'Save & Next'}",
    wizard_slice2
)

crm_wizard_comp = common_imports + """
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
    initEventsReporting
  } = props;

  if (activeTab === 'create' && !selectedLead) {
    return (
      <div id="create_lead_wizard_container" className="space-y-6">
""" + wizard_slice1 + """
      </div>
    );
  }

  if (selectedLead) {
    return (
      <div id="crm_lead_detail_wizard_container" className="space-y-6">
""" + wizard_slice2 + """
      </div>
    );
  }

  return null;
};
"""
with open('src/components/sales/SalesCrmWizard.tsx', 'w', encoding='utf-8') as f:
    f.write(crm_wizard_comp)

# Component 4: SalesModals.tsx (lines 12604 to 13178 and lines 14515 to 15340)
modals_slice1 = '\n'.join(lines[12603:13178])
modals_slice2 = '\n'.join(lines[14514:15340])

modals_comp = common_imports + """
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

""" + modals_slice1 + "\n" + modals_slice2 + """
    </>
  );
};
"""
with open('src/components/sales/SalesModals.tsx', 'w', encoding='utf-8') as f:
    f.write(modals_comp)

print("All modular components generated successfully!")
