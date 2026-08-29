import re
import os

with open('src/components/SalesModule.tsx', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='ignore')
lines = text.split('\n')

# Common Header Imports for Sub-Components
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

# Let's create:
# 1. src/components/sales/SalesBookingConfirmationModal.tsx
# Slices lines 12227 to 12603 (Booking Confirmation & Contract Form)

booking_modal_slice = '\n'.join(lines[12235:12603])

# Apply Fix 2: Booking Confirmation Final Package Amount
booking_modal_slice = re.sub(
    r'value=\{confirmForm\.quotation_amount\s*\|\|.*?\}',
    r'value={confirmForm.quotation_amount || Number(selectedLead?.Final_Quotation_Amount) || Number((selectedLead as any)?.final_quotation_amount) || Number(selectedLead?.Final_Package_Amount) || Number((selectedLead as any)?.final_package_amount) || Number((selectedLead as any)?.final_amount) || (Number(wizardLeadData.final_amount) > 0 ? Number(wizardLeadData.final_amount) : 0)}',
    booking_modal_slice
)

booking_component = f"""{common_imports}

export interface SalesBookingConfirmationModalProps {{
  showConfirmModal: boolean;
  selectedLead: Lead | null;
  confirmBookingModalRef: React.RefObject<HTMLDivElement>;
  confirmForm: any;
  setConfirmForm: React.Dispatch<React.SetStateAction<any>>;
  packages: any[];
  isCustomerInfoExpanded: boolean;
  setIsCustomerInfoExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  eventsReporting: Record<string, {{ reporting_date: string; reporting_time: string }}>;
  setEventsReporting: React.Dispatch<React.SetStateAction<Record<string, {{ reporting_date: string; reporting_time: string }}>>>;
  formatDDMMYYYY: (d: any) => string;
  convertTo12Hour: (t: any) => string;
  isConfirmingBooking: boolean;
  handleConfirmOrder: (e: React.FormEvent) => Promise<void>;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  orders: any[];
  wizardLeadData: any;
}}

export const SalesBookingConfirmationModal: React.FC<SalesBookingConfirmationModalProps> = (props) => {{
  const {{
    showConfirmModal,
    selectedLead,
    confirmBookingModalRef,
    confirmForm,
    setConfirmForm,
    packages,
    isCustomerInfoExpanded,
    setIsCustomerInfoExpanded,
    eventsReporting,
    setEventsReporting,
    formatDDMMYYYY,
    convertTo12Hour,
    isConfirmingBooking,
    handleConfirmOrder,
    setShowConfirmModal,
    orders,
    wizardLeadData
  }} = props;

  if (!showConfirmModal || !selectedLead) return null;

  return (
    <>
{booking_modal_slice}
    </>
  );
}};
"""

with open('src/components/sales/SalesBookingConfirmationModal.tsx', 'w', encoding='utf-8') as f:
    f.write(booking_component)

print("SalesBookingConfirmationModal.tsx written.")
