import React, { useState, useEffect, useRef } from 'react';
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

export const SHOOT_TYPES = [
  "CANDID PHOTOGRAPHY",
  "CINEMATOGRAPHY",
  "TRADITIONAL PHOTOGRAPHY",
  "TRADITIONAL VIDEOGRAPHY",
  "DRONEGRAPHY",
  "LIVE STREAMING",
  "SEMI CANDID PHOTOGRAPHY",
  "SEMI CANDID VIDEOGRAPHY",
  "STANDARD PHOTOGRAPHY",
  "STANDARD VIDEOGRAPHY"
];
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers, triggerAutoScrollAndFocus, normalizeCategory, parseTeamMembers, formatQtyItem, formatQtyArray, formatQtyList, formatDateDDMMYY } from '../utils';
import { SalesCalendar } from './SalesCalendar';
import { CustomPackageMaster } from './CustomPackageMaster';
import { AddressAutocomplete } from './AddressAutocomplete';
import { jsPDF } from 'jspdf';

interface LocalEditableInputProps {
  value: string;
  disabled?: boolean;
  onChange: (val: string) => void;
  className?: string;
  list?: string;
  placeholder?: string;
  options?: string[];
}

import { LocalEditableInput, parseQtyAndText, combineQtyAndText, formatListToStructuredObjects, buildStep3EventPayloads, parseTeamMembersJsonToRecord, parseDeliverablesJsonToRecord, CompactQtyItemRowProps, CompactQtyItemRow, validateAndFormatTime, getLogoBase64FromUrl, generateQuotationPdfFileName, generateQuotationPDF, highlightText, LEAD_SOURCES, SalesModuleProps } from './SalesUtils';
export const SalesModule: React.FC<SalesModuleProps> = ({ activeSubTab: externalActiveTab, setActiveSubTab: externalSetActiveTab }) => {
  const { 
    currentUser,
    currentRole, 
    leads: allLeads, 
    leadPackages, 
    orders: allOrders, 
    payments: allPayments, 
    production, 
    addLead, 
    updateLeadFollowUp, 
    confirmOrder,
    packages,
    addPackage,
    updatePackage,
    deletePackage,
    quotations: allQuotations,
    addQuotation,
    updateQuotation,
    updateLead,
    saveLeadPackages,
    unlockedRecords,
    unlockRecord,
    lockRecord,
    isRecordLocked,
    isDepartmentAllowedToEdit,
    deleteLead,
    deleteOrder,
    statusHistory,
    getLeadCurrentStatus,
    getLeadCurrentStage,
    addNotification,
    users
  } = useRole();

  const leads = currentRole === 'Sales Team' 
    ? allLeads.filter(l => l.sales_staff_id === currentUser?.id || l.sales_person === currentUser?.name) 
    : allLeads;
  const orders = currentRole === 'Sales Team' 
    ? allOrders.filter(o => leads.some(l => l.lead_id === o.lead_id)) 
    : allOrders;
  const payments = currentRole === 'Sales Team' 
    ? allPayments.filter(p => leads.some(l => l.lead_id === p.lead_id)) 
    : allPayments;
  const quotations = currentRole === 'Sales Team' 
    ? (allQuotations || []).filter((q: any) => leads.some(l => l.lead_id === q.lead_id)) 
    : (allQuotations || []);

  const [logoBase64, setLogoBase64] = useState<string>('');
  const [logoAspectRatio, setLogoAspectRatio] = useState<number>(1);
  const [unlockRequests, setUnlockRequests] = useState<any[]>([]);

  // Fetch unlock requests
  useEffect(() => {
    if (!supabaseClient) return;

    const fetchUnlockRequests = async () => {
      const { data, error } = await supabaseClient
        .from('unlock_requests')
        .select('*');
      
      if (!error && data) {
        const normalized = data.map((r: any) => {
          const isApproved = r.request_status === 'Approved' || r.status === 'Approved';
          const isCompleted = r.request_status === 'Completed' || r.status === 'Completed';
          const isRejected = r.request_status === 'Rejected' || r.status === 'Rejected';
          const effectiveStatus = isApproved ? 'Approved' : isCompleted ? 'Completed' : isRejected ? 'Rejected' : (r.request_status || r.status || 'Pending');
          return {
            ...r,
            request_status: effectiveStatus,
            status: effectiveStatus,
            reason: r.request_reason || r.reason || '',
            sales_staff_name: r.requested_by_name || r.sales_staff_name || '',
            sales_staff_id: r.requested_by_user_id || r.sales_staff_id || ''
          };
        });
        setUnlockRequests(normalized);
      }
    };

    fetchUnlockRequests();

    const channel = supabaseClient
      .channel('rt-unlock_requests-sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unlock_requests' }, () => {
        fetchUnlockRequests();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // Dynamic active master roles and deliverables loaded from Supabase master tables
  const [activeMasterRoles, setActiveMasterRoles] = useState<string[]>([]);
  const [activeMasterDeliverables, setActiveMasterDeliverables] = useState<string[]>([]);

  const loadActiveMasterItems = React.useCallback(async () => {
    try {
      let rList: string[] = [];
      let dList: string[] = [];

      if (supabaseClient) {
        const { data: rData } = await supabaseClient
          .from('custom_roles')
          .select('role_name')
          .eq('status', 'Active');
        if (rData && rData.length > 0) {
          rList = rData.map((r: any) => r.role_name);
        }

        const { data: dData } = await supabaseClient
          .from('custom_deliverables')
          .select('deliverable_name')
          .eq('status', 'Active');
        if (dData && dData.length > 0) {
          dList = dData.map((d: any) => d.deliverable_name);
        }
      }

      if (rList.length === 0) {
        const saved = localStorage.getItem('erp_custom_roles_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          rList = parsed.filter((r: any) => r.status === 'Active').map((r: any) => r.role_name);
        }
      }

      if (dList.length === 0) {
        const saved = localStorage.getItem('erp_custom_deliverables_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          dList = parsed.filter((d: any) => d.status === 'Active').map((d: any) => d.deliverable_name);
        }
      }

      if (rList.length > 0) setActiveMasterRoles(rList);
      if (dList.length > 0) setActiveMasterDeliverables(dList);
    } catch (err) {
      console.warn("Error fetching active custom master items in SalesModule:", err);
    }
  }, []);

  React.useEffect(() => {
    loadActiveMasterItems();
  }, [loadActiveMasterItems]);

  React.useEffect(() => {
    const preloadLogo = async () => {
      try {
        const logoUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/logo%20(4)%20(1).png';
        const result = await getLogoBase64FromUrl(logoUrl);
        setLogoBase64(result.base64);
        setLogoAspectRatio(result.aspect);
      } catch (e) {
        console.warn('Failed to pre-load logo image:', e);
      }
    };
    preloadLogo();
  }, []);

  // Role permissions gate
  const canEdit = (currentRole === 'Sales Team' || currentRole === 'Business Owner') && 
                  (isDepartmentAllowedToEdit(currentRole, 'Quote Sent') || isDepartmentAllowedToEdit(currentRole, 'New Lead'));

  // Toggle modes
  const [internalTab, setInternalTab] = useState<'list' | 'create' | 'profiles' | 'packages' | 'calendar'>('list');
  const activeTab = externalActiveTab || internalTab;
  const setActiveTab = externalSetActiveTab || setInternalTab;

  // Leads export report handlers
  const handleDownloadCSV = () => {
    const headers = ["Lead ID", "Order ID", "Customer Name", "Mobile Number", "Event Type", "Event Date", "Current Stage", "Current Status", "Payment Status", "Created Date"];
    const rows = filteredLeads.map(l => {
      const ord = orders.find(o => o.lead_id === l.lead_id);
      const pay = ord ? payments?.find(p => p.order_id === ord.order_id) : null;
      return [
        l.lead_id,
        ord?.order_id || 'N/A',
        l.customer_name === 'Inbound Prospect' ? '' : l.customer_name,
        l.mobile,
        l.event_type,
        l.event_date || 'N/A',
        getLeadCurrentStatus(l),
        l.remarks.slice(0, 50).replace(/["\n\r]/g, ' '),
        pay ? pay.payment_status : 'Pending',
        l.created_date
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Leads_Report_${appliedStartDate || 'all'}_to_${appliedEndDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcel = () => {
    const headers = ["Lead ID", "Order ID", "Customer Name", "Mobile Number", "Event Type", "Event Date", "Current Stage", "Current Status", "Payment Status", "Created Date"];
    const rows = filteredLeads.map(l => {
      const ord = orders.find(o => o.lead_id === l.lead_id);
      const pay = ord ? payments?.find(p => p.order_id === ord.order_id) : null;
      return [
        l.lead_id,
        ord?.order_id || 'N/A',
        l.customer_name === 'Inbound Prospect' ? '' : l.customer_name,
        l.mobile,
        l.event_type,
        l.event_date || 'N/A',
        getLeadCurrentStatus(l),
        l.remarks.slice(0, 50).replace(/["\t\n\r]/g, ' '),
        pay ? pay.payment_status : 'Pending',
        l.created_date
      ];
    });
    
    // Generate standard TSV structure compatible with native Excel import
    const content = [headers.join("\t"), ...rows.map(e => e.join("\t"))].join("\n");
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Leads_Report_${appliedStartDate || 'all'}_to_${appliedEndDate || 'all'}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rowsHtml = filteredLeads.map(l => {
      const ord = orders.find(o => o.lead_id === l.lead_id);
      const pay = ord ? payments?.find(p => p.order_id === ord.order_id) : null;
      return `
        <tr>
          <td>${l.lead_id}</td>
          <td>${ord?.order_id || 'N/A'}</td>
          <td>${l.customer_name === 'Inbound Prospect' ? '' : l.customer_name}</td>
          <td>${l.mobile}</td>
          <td>${l.event_type}</td>
          <td>${l.event_date || 'N/A'}</td>
          <td>${getLeadCurrentStatus(l)}</td>
          <td>${l.created_date}</td>
          <td>${pay ? pay.payment_status : 'Pending'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Leads Directory Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; margin-bottom: 5px; color: #111; text-transform: uppercase; letter-spacing: 1px; }
            p { font-size: 11px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>LEADS DIRECTORY REPORT</h1>
          <p>Generated on ${new Date().toLocaleString('en-IN')} | Date Range: ${appliedStartDate || 'All'} to ${appliedEndDate || 'All'} | Records Count: ${filteredLeads.length}</p>
          <div className="overflow-x-auto w-full max-w-full">
<table>
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Event Type</th>
                <th>Event Date</th>
                <th>Current Status</th>
                <th>Created Date</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
</div>
          <div class="footer">Confidential Systems Report | ERP Sales Desk</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Package Management States
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);
  const [isDeletingPackage, setIsDeletingPackage] = useState(false);
  const [deletePackageError, setDeletePackageError] = useState<string | null>(null);
  const [packageSuccessMsg, setPackageSuccessMsg] = useState<string | null>(null);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [viewingPkgDetails, setViewingPkgDetails] = useState<any | null>(null);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pkgForm, setPkgForm] = useState({
    package_name: '',
    category: 'Weddings',
    price: 0,
    status: 'Active' as 'Active' | 'Inactive',
    deliverables: '',
    team_members: '',
    seasonal_offer: '',
    terms_conditions: '',
    event_type: '',
    duration: '',
    package_includes: ''
  });
  const [pkgTeamMembers, setPkgTeamMembers] = useState<{qty: number, name: string}[]>([{ qty: 1, name: '' }]);
  const [pkgDeliverablesList, setPkgDeliverablesList] = useState<{qty: number, name: string}[]>([]);
  const [pkgDeliverableInput, setPkgDeliverableInput] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isComparingPkgs, setIsComparingPkgs] = useState(false);
  const [dbCategoryError, setDbCategoryError] = useState<string | null>(null);

  React.useEffect(() => {
    const checkCategoryColumn = async () => {
      if (!supabaseClient) return;
      try {
        const { error } = await supabaseClient.from('packages').select('category').limit(0);
        if (error && (error.code === '42703' || error.message?.toLowerCase().includes('column') || error.message?.toLowerCase().includes('does not exist'))) {
          setDbCategoryError(
            `‚ùå Database Schema Alert: The 'category' column is missing from the 'packages' table in Supabase. Although the app is safely resolving categories using automated description serialization, categories are not stored as a dedicated column at the database level.`
          );
        }
      } catch (e) {
        console.warn('Failed to check category column:', e);
      }
    };
    checkCategoryColumn();
  }, [packages]);

  React.useEffect(() => {
    const handleClose = () => {
      setIsAddFormOpen(false);
      setEditingPackage(null);
      setViewingPkgDetails(null);
      setShowStep2Popup(false);
      setShowLostModal(false);
      setShowEventForm(false);
      setShowConfirmModal(false);
      setShowFinalReportingModal(false);
      setShowStep3Popup(false);
    };
    window.addEventListener('close-all-popups', handleClose);
    return () => window.removeEventListener('close-all-popups', handleClose);
  }, []);

  // Group active packages directly loaded from Supabase!
  const categoriesList = React.useMemo(() => {
    const dbCats = Array.from(new Set((packages || []).map((p) => p.category))).filter(Boolean) as string[];
    const normalizedDbCats = dbCats.map(normalizeCategory);
    const normalizedPkgCats = PACKAGE_CATEGORIES.map(normalizeCategory);
    const customCats = normalizedDbCats.filter(c => !normalizedPkgCats.includes(c)).sort();
    return Array.from(new Set([...normalizedPkgCats, ...customCats]));
  }, [packages]);

  const PACKAGES_LIST = React.useMemo(() => {
    return categoriesList.map((cat) => ({
      categoryName: cat,
      items: (packages || [])
        .filter((p) => normalizeCategory(p.category) === cat && p.status === 'Active')
        .map((p) => ({
          id: p.package_id,
          name: p.package_name,
          cost: p.price,
          deliverables: p.deliverables || 'N/A',
          team_members: p.team_members || 'N/A',
          seasonal_offer: p.seasonal_offer || 'None'
        }))
    }));
  }, [categoriesList, packages]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [crmWizardStep, setCrmWizardStep] = useState<number>(1);
  const [crmHighestStep, setCrmHighestStep] = useState<number>(1);
  const [saveErrorPopup, setSaveErrorPopup] = useState<{ title: string; message: string } | null>(null);

  const appendCompletedStep = (existingRemarks: string | undefined, step: number) => {
    const cleanRemarks = (existingRemarks || '').replace(/\[CRM_COMPLETED_STEP:\s*\d+\]/g, '').trim();
    return `${cleanRemarks}\n[CRM_COMPLETED_STEP: ${step}]`.trim();
  };

  const [wizardLeadData, setWizardLeadData] = useState({
    customer_name: '',
    mobile: '',
    whatsapp_number: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    Specify_Custom_Lead_Source_Name: '',
    client_residence_address: '',
    desired_event_shoot_type: '',
    // Step 2
    event_type: '',
    custom_event_name: '',
    event_name: '',
    event_shoot_type: '',
    event_date: '',
    event_start_date: '',
    event_end_date: '',
    event_time: '',
    reporting_time: '',
    event_location: '',
    guest_pax: "" as any,
    staff_pax: "" as any,
    lead_source: '',
    shoot_type: '',
    // Step 3
    selected_package_id: '',
    package_cost: 0,
    deliverables: '',
    notes: '',
    // Step 4
    budget: 0,
    final_quoted_amount: 0,
    remarks: '',
    next_follow_up_date: '',
      // Step 5
    status: '' as CurrentStage,
    // Order Confirmed Rule fields
    confirmed_event_date: '',
    confirmed_event_time: '',
    final_amount: 0,
    advance_received: 0,
    package_price: 0,
    deliverables_description: '',
    notes_special_customizations: '',
    quotation_discount: 0,
    additional_services_cost: 0,
    total_pax: 0,
    reference_source: '',
    lead_value: 0,
    lead_score: 0,
    booking_status: 'Pending',
  });

  const [crmToast, setCrmToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showValidationError = (fieldId: string, msg: string) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      el.classList.add('!border-red-500', 'ring-1', '!ring-red-500');
      let msgEl = el.nextElementSibling as HTMLElement;
      if (!msgEl || !msgEl.classList.contains('validation-error-msg')) {
        msgEl = document.createElement('div');
        msgEl.className = 'validation-error-msg text-red-550 text-[10px] mt-1 font-bold animate-fade-in';
        el.parentNode?.insertBefore(msgEl, el.nextSibling);
      }
      msgEl.textContent = msg;
      
      const removeHighlight = () => {
        el.classList.remove('!border-red-500', 'ring-1', '!ring-red-500');
        if (msgEl && msgEl.parentNode) msgEl.parentNode.removeChild(msgEl);
        el.removeEventListener('input', removeHighlight);
        el.removeEventListener('change', removeHighlight);
      };
      el.addEventListener('input', removeHighlight);
      el.addEventListener('change', removeHighlight);
    } else {
      showToastMsg(msg, "error");
    }
  };

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setCrmToast({ message, type });
    setTimeout(() => setCrmToast(null), 3000);
  };

  React.useEffect(() => {
    if (crmToast) {
      const timer = setTimeout(() => {
        const el = document.getElementById('crm-toast-container') || document.getElementById('crm-create-toast-container');
        if (el) {
          const rect = el.getBoundingClientRect();
          const isInViewport = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
          if (!isInViewport) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [crmToast]);

  const logStatusUpdateError = (params: {
    leadId: string | null;
    orderId: string | null;
    oldStatus: string | null;
    newStatus: string | null;
    updatePayload: any;
    insertPayload: any;
    dbResponse: any;
    fullError: any;
  }) => {
    console.group("%c CRM STATUS UPDATE ERROR LOG ", "background: #f43f5e; color: white; font-weight: bold; padding: 4px;");
    console.log("Lead ID:", params.leadId);
    console.log("Order ID:", params.orderId);
    console.log("Old Status:", params.oldStatus);
    console.log("New Status:", params.newStatus);
    console.log("Supabase UPDATE payload:", params.updatePayload);
    console.log("Supabase INSERT payload:", params.insertPayload);
    console.log("Database response:", params.dbResponse);
    console.log("Full error message:", params.fullError);
    console.groupEnd();
  };

  const parseStatusUpdateError = (errorMsg: string): { reason: string; suggestedFix: string } => {
    const msg = errorMsg.toLowerCase();
    
    let reason = errorMsg;
    let suggestedFix = "Please contact support or review the database connections and tables.";

    if (msg.includes("relation \"leads\" does not exist") || msg.includes("table name: leads\nmissing")) {
      reason = "Table 'leads' does not exist in the database schema.";
      suggestedFix = "Please ensure the 'leads' table is created in your Supabase database using the SQL editor.";
    } else if (msg.includes("relation \"lead_status_history\" does not exist") || msg.includes("relation \"public.lead_status_history\" does not exist")) {
      reason = "Table 'lead_status_history' does not exist in the database schema.";
      suggestedFix = "Create the 'lead_status_history' table in your Supabase database using: \n\nCREATE TABLE lead_status_history (\n  id SERIAL PRIMARY KEY,\n  lead_id TEXT,\n  order_id TEXT,\n  old_status TEXT,\n  new_status TEXT,\n  changed_by TEXT,\n  changed_by_role TEXT,\n  remarks TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);";
    } else if (msg.includes("column \"current_status\"") || msg.includes("column leads.current_status") || msg.includes("missing column name: current_status")) {
      reason = "Missing column \"current_status\" in table \"leads\".";
      suggestedFix = "Create the \"current_status\" column or update the database mapping using: \n\nALTER TABLE leads ADD COLUMN current_status TEXT;";
    } else if (msg.includes("column \"new_status\"") || msg.includes("column lead_status_history.new_status")) {
      reason = "Missing column \"new_status\" in table \"lead_status_history\".";
      suggestedFix = "Add the missing 'new_status' column to 'lead_status_history' table using: \n\nALTER TABLE lead_status_history ADD COLUMN new_status TEXT;";
    } else if (msg.includes("rls policy denied") || msg.includes("row-level security") || msg.includes("violates row-level security")) {
      reason = `RLS policy denied UPDATE on table "leads".`;
      suggestedFix = "Update the RLS policy to allow authenticated users to update lead records.";
    } else if (msg.includes("permission denied") || msg.includes("insufficient privilege")) {
      reason = `Permission denied by database. Details: ${errorMsg}`;
      suggestedFix = "Ensure the API client role has correct permissions (SELECT/INSERT/UPDATE) granted on the table.";
    } else if (msg.includes("not found") && msg.includes("leads")) {
      reason = `Lead ID invalid or lead record not found. Details: ${errorMsg}`;
      suggestedFix = "Verify that the Lead ID exists in the 'leads' table and has not been deleted.";
    } else if (msg.includes("lead_status_history insert failed because \"lead_id\" is null") || msg.includes("lead_id is null") || msg.includes("lead_id\" is null")) {
      reason = `"lead_status_history" insert failed because "lead_id" is NULL.`;
      suggestedFix = "Pass a valid \"lead_id\" before inserting the status history.";
    } else if (msg.includes("foreign key constraint")) {
      reason = `Foreign key constraint failed. Details: ${errorMsg}`;
      suggestedFix = "Check if the referenced records (e.g. lead_id, order_id) exist in their parent tables first.";
    } else if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      reason = `Unique constraint violation. Details: ${errorMsg}`;
      suggestedFix = "Ensure that the record ID being inserted is unique and does not already exist.";
    } else if (msg.includes("network error") || msg.includes("failed to fetch") || msg.includes("database connection failed")) {
      reason = `Network error or failed to reach the database connection.`;
      suggestedFix = "Please check your internet connection or verify if your server/Supabase instances are active.";
    } else if (msg.includes("required field") || msg.includes("null value in column")) {
      reason = `Required database field is missing. Details: ${errorMsg}`;
      suggestedFix = "Ensure all required fields are filled and not null before submitting.";
    } else {
      const tableMatch = errorMsg.match(/table "([^"]+)"|relation "([^"]+)"/);
      const colMatch = errorMsg.match(/column "([^"]+)"/);
      if (tableMatch || colMatch) {
        const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : "unknown table";
        const colName = colMatch ? colMatch[1] : "";
        reason = `Database operation failed on table "${tableName}"` + (colName ? ` for column "${colName}".` : ".");
        suggestedFix = `Verify the schema of "${tableName}" table. If "${colName}" column is missing, add it using ALTER TABLE ${tableName} ADD COLUMN ${colName} TEXT;`;
      }
    }

    return { reason, suggestedFix };
  };


  const [statusError, setStatusError] = useState<{ title: string; reason: string; suggestedFix: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalLeadId, setNoteModalLeadId] = useState("");
  const [noteModalOrderId, setNoteModalOrderId] = useState("");
  const [noteModalCustomerName, setNoteModalCustomerName] = useState("");

  const [unlockingRecordId, setUnlockingRecordId] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState('Data Correction');
  const [unlockCustomReason, setUnlockCustomReason] = useState('');

  // Step 2 and Step 3 Follow-up states
  const [showStep2Popup, setShowStep2Popup] = useState(false);
  const [step2FollowUpDate, setStep2FollowUpDate] = useState('');
  const [step2FollowUpNotes, setStep2FollowUpNotes] = useState('');

  const [step3FollowUpDate, setStep3FollowUpDate] = useState('');
  const [step3FollowUpTime, setStep3FollowUpTime] = useState('');
  const [step3FollowUpNotes, setStep3FollowUpNotes] = useState('');

  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('Price too high');
  const [lostNotes, setLostNotes] = useState('');
  const [otherLostReason, setOtherLostReason] = useState('');
  
  // Unlock Request State
  const [showUnlockRequestModal, setShowUnlockRequestModal] = useState(false);
  const [unlockRequestReason, setUnlockRequestReason] = useState('Customer requested additional discount');
  const [unlockRequestCustomReason, setUnlockRequestCustomReason] = useState('');
  const [selectedUnlockLead, setSelectedUnlockLead] = useState<Lead | null>(null);

  // Helper function to resolve Lost Reason and Notes strictly and cleanly from fields
  const getStrictLostReasonAndNotes = (lead: Lead | null) => {
    if (!lead) return { reason: '', notes: '' };

    let rawReason = (lead.Lost_Reason || (lead as any).lost_reason || (lead as any).LostReason || (lead as any).lostReason || '').trim();
    let rawNotes = (lead.Lost_Notes || (lead as any).lost_notes || (lead as any).LostNotes || (lead as any).lostNotes || '').trim();

    // Check if string contains internal generated activity/update text or metadata
    const isDirty = (str: string) => {
      if (!str) return false;
      return /\[Update|\bNeg Notes:|\bNext follow-up:|\bWhatsApp:|^Lost Reason:/i.test(str);
    };

    let cleanReason = rawReason;
    let cleanNotes = rawNotes;

    const parseComposite = (text: string) => {
      let r = '';
      let n = '';
      if (!text) return { r, n };

      // Pattern 1: "Lost Reason: <reason>. Notes: <notes>"
      const explicitMatch = text.match(/Lost Reason:\s*([^.\n]+?)(?:\.\s*Notes:\s*([\s\S]*?))?(?=\n\[Update|\n\[Time|\[CRM_COMPLETED_STEP|$)/i);
      if (explicitMatch) {
        if (explicitMatch[1]) r = explicitMatch[1].trim();
        if (explicitMatch[2]) n = explicitMatch[2].trim();
      }

      // Pattern 2: "[Update YYYY-MM-DD]: <reason>. Neg Notes: <notes>. Next follow-up:"
      if (!r) {
        const updateMatch = text.match(/\[Update[^\]]*\]:\s*([^.]+?)(?:\.\s*(?:Neg Notes|Notes):\s*([\s\S]*?))?(?:\.\s*Next follow-up:|$|\n)/i);
        if (updateMatch) {
          if (updateMatch[1]) r = updateMatch[1].trim();
          if (updateMatch[2]) n = updateMatch[2].trim();
        }
      }

      // Standalone notes match
      if (!n) {
        const negMatch = text.match(/(?:Neg Notes|Notes):\s*([^.\n]+?)(?:\.\s*Next follow-up:|$|\n)/i);
        if (negMatch && negMatch[1]) {
          n = negMatch[1].trim();
        }
      }
      return { r, n };
    };

    if (isDirty(cleanReason)) {
      const parsed = parseComposite(cleanReason);
      if (parsed.r) cleanReason = parsed.r;
      if (parsed.n && !cleanNotes) cleanNotes = parsed.n;
    }

    if (isDirty(cleanNotes)) {
      const parsed = parseComposite(cleanNotes);
      if (parsed.n) cleanNotes = parsed.n;
      else {
        cleanNotes = cleanNotes
          .replace(/^Neg Notes:\s*/i, '')
          .replace(/\.?\s*Next follow-up:.*$/i, '')
          .replace(/^Notes:\s*/i, '')
          .trim();
      }
    }

    // If reason is still empty or dirty, check remarks field
    if ((!cleanReason || cleanReason === 'N/A' || cleanReason === 'NULL' || isDirty(cleanReason)) && lead.remarks) {
      const parsed = parseComposite(lead.remarks);
      if (parsed.r) cleanReason = parsed.r;
      if (parsed.n && !cleanNotes) cleanNotes = parsed.n;
    }

    // Final clean-up of any stray prefix/suffix
    cleanReason = cleanReason
      .replace(/^WhatsApp:\s*\d+\s*/i, '')
      .replace(/^\[Update[^\]]*\]:\s*/i, '')
      .replace(/\.?\s*Neg Notes:.*$/i, '')
      .replace(/\.?\s*Next follow-up:.*$/i, '')
      .replace(/[,;]+$/, '')
      .trim();

    cleanNotes = cleanNotes
      .replace(/\.?\s*Next follow-up:.*$/i, '')
      .replace(/^Neg Notes:\s*/i, '')
      .replace(/^Notes:\s*/i, '')
      .replace(/[,;]+$/, '')
      .trim();

    return {
      reason: cleanReason || 'No reason provided.',
      notes: cleanNotes || ''
    };
  };

  // Helper function to resolve Lost Reason and Notes
  const getLostReasonAndNotes = (lead: Lead | null, _historyList?: any[]) => {
    return getStrictLostReasonAndNotes(lead);
  };

  const [showCancelConfirmPopup, setShowCancelConfirmPopup] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    reason: string;
    source?: string;
    failedFunction?: string;
    database?: string;
    leadId?: string;
    suggestedFix?: string;
    stack?: string;
  } | null>(null);

  const showErrorHelper = (title: string, reason: string, failedFunction: string, leadId: string, suggestedFix: string, err?: any) => {
    console.error(`‚ùå ${title}\nReason: ${reason}\nFunction: ${failedFunction}\n`, err);
    setErrorDetails({
      title,
      reason: err?.message || reason,
      source: 'SalesModule.tsx',
      failedFunction,
      database: 'quotations / leads',
      leadId,
      suggestedFix,
      stack: err?.stack || ''
    });
  };

  const isLeadConfirmed = selectedLead
    ? (['Confirm Order', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed'].includes(selectedLead.status || '') ||
       (selectedLead as any).current_status === 'Order Confirmed' ||
       (selectedLead as any).booking_status === 'Confirmed' ||
       getLeadCurrentStatus(selectedLead) === 'Order Confirmed' ||
       ['Operations', 'Production', 'Post-Production', 'Completed'].includes(getLeadCurrentStage(selectedLead)) ||
       (orders && orders.some(o => o.lead_id === selectedLead.lead_id && o.status !== 'Cancelled')))
    : false;

  const isApprovedUnlocked = selectedLead
    ? (selectedLead.quotation_locked === false ||
       unlockRequests.some(r => {
         const matchesLead = r.lead_id === selectedLead.lead_id || r.order_id === selectedLead.lead_id || r.project_id === selectedLead.lead_id;
         const matchesOrder = orders && orders.some(o => o.lead_id === selectedLead.lead_id && (o.order_id === r.order_id || o.order_id === r.lead_id));
         const matchesLeadOrderId = (selectedLead as any).order_id && (r.order_id === (selectedLead as any).order_id || r.lead_id === (selectedLead as any).order_id);
         const isApproved = r.status === 'Approved' || r.request_status === 'Approved';
         return (matchesLead || matchesOrder || matchesLeadOrderId) && isApproved;
       })) && selectedLead.quotation_locked !== true
    : false;

  const isCrmLocked = false;
  const isLeadLocked = false;
  const isLeadLost = Boolean(
    selectedLead && ['Lost Lead', 'Lead Lost', 'Lost'].includes(
      selectedLead.status || (selectedLead as any).current_status || wizardLeadData.status || ''
    )
  );

  // No longer locking steps so Sales can update/add required services
  const isStep1Locked = false;
  const isStep2Locked = false;
  const isStep3Locked = false;

  const [openDropdownLeadId, setOpenDropdownLeadId] = useState<string | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number | string, right: number | string, bottom: number | string }>({ top: 0, right: 0, bottom: 'auto' });

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.actions-dropdown-container') && !target.closest('.actions-dropdown-menu')) {
        setOpenDropdownLeadId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Repeat Customer / Reorder System states
  const [detectedCustomer, setDetectedCustomer] = useState<any>(null);
  const [showDetectionPopup, setShowDetectionPopup] = useState(false);
  const [isQuickReorderView, setIsQuickReorderView] = useState(false);
  
  // Custom states for configuring quick reorder
  const [reorderForm, setReorderForm] = useState({
    event_type: '',
    custom_event_name: '',
    custom_event_type: '',
    event_date: '',
    event_time: '12:00',
    event_location: '',
    package_name: '',
    quotation_amount: 0,
    advance_received: 0,
  });

  // Customer Profiles sub-tab states
  const [selectedCustomerProfileId, setSelectedCustomerProfileId] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Filter & Collapse States
  const [filterQuery, setFilterQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [isDownloadReportsExpanded, setIsDownloadReportsExpanded] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSalesPerson, setFilterSalesPerson] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  // Extra state for "Other" lead source name input
  const [otherSource, setOtherSource] = useState('');

  // Screen 2 Form State (Wizard support)
  const [createForm, setCreateForm] = useState<{
    customer_name: string;
    mobile: string;
    alternate_mobile: string;
    email: string;
    lead_source: string;
    event_type: string;
    custom_event_name: string;
    event_name: string;
    event_shoot_type: string;
    event_date: string;
    event_start_date: string;
    event_end_date: string;
    event_time: string;
    event_location: string;
    guest_pax: number | '';
    staff_pax: number | '';
    budget: number | '';
    remarks: string;
    whatsapp_number: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    client_residence_address: string;
    desired_event_shoot_type: string;
    Select_Package_Option: string;
    total_pax: number | '';
    reference_source: string;
    lead_value: number | '';
    lead_score: number | '';
    booking_status: string;
  }>({
    customer_name: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    lead_source: '',
    event_type: '',
    custom_event_name: '',
    event_name: '',
    event_shoot_type: '',
    event_date: '',
    event_start_date: '',
    event_end_date: '',
    event_time: '',
    event_location: '',
    guest_pax: "" as any,
    staff_pax: "" as any,
    budget: '',
    remarks: '',
    whatsapp_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    Specify_Custom_Lead_Source_Name: '',
    client_residence_address: '',
    desired_event_shoot_type: '',
    Select_Package_Option: '',
    total_pax: '',
    reference_source: '',
    lead_score: '',
    booking_status: '',
  });

  const [createEvents, setCreateEvents] = useState<LeadEvent[]>([]);
  const [crmEvents, setCrmEvents] = useState<LeadEvent[]>([]);
  const [collapsedEventIds, setCollapsedEventIds] = useState<Record<string, boolean>>({});
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState<Omit<LeadEvent, 'id'>>({
    event_type: '',
    event_name: '',
    event_shoot_type: '',
    event_date: '',
    event_start_time: '',
    event_end_time: '',
    event_location: '',
    google_maps_link: '',
    guest_pax: "" as any,
    staff_pax: "" as any,
    event_start_date: '',
    event_end_date: ''
  });

  const [wizardStep, setWizardStep] = useState(1);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);

  // Package customizations
  const [pkgPrices, setPkgPrices] = useState<Record<string, number>>({});
  const [pkgDeliverables, setPkgDeliverables] = useState<Record<string, string>>({});
  const [pkgNotes, setPkgNotes] = useState<Record<string, string>>({});

  // Additional form fields for Steps 4 & 5
  const [reportingTime, setReportingTime] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [salesStatus, setSalesStatus] = useState<string>('');

  // Order Confirmed Additional mandatory fields
  const [confirmedEventDate, setConfirmedEventDate] = useState('');
  const [confirmedEventTime, setConfirmedEventTime] = useState('');
  const [finalPackageAmount, setFinalPackageAmount] = useState<number | ''>('');
  const [advanceReceived, setAdvanceReceived] = useState<number | ''>('');

  const resetForm = () => {
    setCreateForm({
      customer_name: '',
      mobile: '',
      alternate_mobile: '',
      email: '',
      lead_source: '',
      event_type: '',
      custom_event_name: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_date: '',
      event_end_date: '',
      event_time: '',
      event_location: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      budget: '',
      remarks: '',
      whatsapp_number: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    Specify_Custom_Lead_Source_Name: '',
      client_residence_address: '',
      desired_event_shoot_type: '',
      Select_Package_Option: '',
      total_pax: '',
      reference_source: '',
      lead_value: '',
      lead_score: '',
      booking_status: '',
    });
    setCreateEvents([]);
    setWizardLeadData({
      customer_name: '',
      mobile: '',
      whatsapp_number: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    Specify_Custom_Lead_Source_Name: '',
      client_residence_address: '',
      desired_event_shoot_type: '',
      event_type: '',
      custom_event_name: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_date: '',
      event_end_date: '',
      event_time: '',
      reporting_time: '',
      event_location: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      lead_source: '',
      shoot_type: '',
      selected_package_id: '',
      package_cost: 0,
      deliverables: '',
      notes: '',
      budget: 0,
      final_quoted_amount: 0,
      remarks: '',
      next_follow_up_date: '',
      status: '' as CurrentStage,
      confirmed_event_date: '',
      confirmed_event_time: '',
      final_amount: 0,
      advance_received: 0,
      package_price: 0,
      deliverables_description: '',
      notes_special_customizations: '',
      quotation_discount: 0,
      additional_services_cost: 0,
      total_pax: 0,
      reference_source: '',
      lead_value: 0,
      lead_score: 0,
      booking_status: 'Pending',
    });
    setOtherSource('');
    setSelectedPkgIds([]);
    setLeadDiscount('');
    setIsPkgDropdownOpen(false);
    
    // Reset wizard fields
    setWizardStep(1);
    setCrmWizardStep(1);
    setCreatedLeadId(null);
    setPkgPrices({});
    setPkgDeliverables({});
    setPkgNotes({});
    setReportingTime('');
    setInternalNotes('');
    setFollowUpDate('');
    setSalesStatus('');
    setConfirmedEventDate('');
    setConfirmedEventTime('');
    setFinalPackageAmount('');
    setAdvanceReceived('');
    setQuoteDiscount('');
    setQuoteAdditional('');
    
    setFollowUpForm({
      status: '',
      quotation_amount: '',
      advance_received: '',
      call_notes: ''
    });
    setConfirmForm({
      package_name: '',
      quotation_amount: '',
      advance_received: '',
      event_date: '',
      event_time: ''
    });
    setEventForm({
      event_type: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_time: '',
      event_end_time: '',
      event_location: '',
      google_maps_link: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      event_start_date: '',
      event_end_date: ''
    });
    setShowEventForm(false);
    setEditingEventId(null);
    setCollapsedEventIds({});
    setShowConfirmModal(false);
    setGeneratedPDFBlobUrl('');
    setActiveQuoteNum('');
    setEditableInclusions({});
    setEditableDeliverables({});
    setQuoteServices([]);
    setEditingServiceId(null);
    setNewServiceName('');
    setNewServiceQty(1);
    setNewServicePrice(0);
    setIsAddingInline(false);
    setStatusError(null);
    setUnlockingRecordId(null);
    setPkgSearchQuery('');

    // Clear cached quote services
    localStorage.removeItem('erp_quote_services_create');
  };

  // Action hook to reset state, auto-scroll and auto-focus when transitioning to 'create' tab
  React.useEffect(() => {
    if (activeTab === 'create') {
      resetForm();

      setTimeout(() => {
        const titleEl = document.getElementById('create_lead_form_heading');
        if (titleEl) {
          titleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const formEl = document.querySelector('form');
          if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        const firstInput = document.querySelector('input[placeholder*="Enter customer name"]') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 150);
    }
  }, [activeTab]);

  // Packages creation hooks
  const [selectedPkgIds, setSelectedPkgIds] = useState<string[]>([]);
  const [leadDiscount, setLeadDiscount] = useState<number>(0);
  const [isPkgDropdownOpen, setIsPkgDropdownOpen] = useState(false);
  const [pkgSearchQuery, setPkgSearchQuery] = useState('');

  // Auto calculate and sync with createForm.budget
  const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
  
  // Package Selection Price is editable, so subtotal sums the edited prices
  const subtotal = selectedPkgs.reduce((sum, item) => sum + (pkgPrices[item.id] !== undefined ? pkgPrices[item.id] : item.cost), 0);
  const finalTotal = Math.max(0, subtotal - leadDiscount);

  // Sync package configurations on changes
  React.useEffect(() => {
    const allPkgs = PACKAGES_LIST.flatMap(cat => cat.items);
    const newPrices = { ...pkgPrices };
    const newDeliverables = { ...pkgDeliverables };
    const newNotes = { ...pkgNotes };
    let changed = false;

    selectedPkgIds.forEach(id => {
      const p = allPkgs.find(item => item.id === id);
      if (p) {
        if (newPrices[id] === undefined) {
          newPrices[id] = p.cost;
          changed = true;
        }
        if (newDeliverables[id] === undefined) {
          newDeliverables[id] = p.deliverables || 'N/A';
          changed = true;
        }
        if (newNotes[id] === undefined) {
          newNotes[id] = p.seasonal_offer !== 'None' ? `Offers: ${p.seasonal_offer}` : '';
          changed = true;
        }
      }
    });

    // Remove unselected package keys
    Object.keys(newPrices).forEach(id => {
      if (!selectedPkgIds.includes(id)) {
        delete newPrices[id];
        delete newDeliverables[id];
        delete newNotes[id];
        changed = true;
      }
    });

    if (changed) {
      setPkgPrices(newPrices);
      setPkgDeliverables(newDeliverables);
      setPkgNotes(newNotes);
    }
  }, [selectedPkgIds, PACKAGES_LIST]);

  React.useEffect(() => {
    // Only auto-override if packages are actively selected
    if (selectedPkgIds.length > 0) {
      setCreateForm(prev => ({
        ...prev,
        budget: finalTotal,
        Select_Package_Option: selectedPkgIds[0] || ''
      }));
    } else {
      setCreateForm(prev => ({
        ...prev,
        Select_Package_Option: ''
      }));
    }
  }, [finalTotal, selectedPkgIds]);

  // Body scroll lock effect when Create Lead modal is open (REMOVED to allow scrolling on smaller screens)
  React.useEffect(() => {
    // Body scroll lock removed to fix scrolling issues on smaller screens.
  }, [activeTab]);

  // Screen 3 Follow-Up Form State
  const [followUpForm, setFollowUpForm] = useState({
    call_notes: '',
    next_follow_up_date: '',
    status: 'Quote Follow-up' as CurrentStage,
    quotation_amount: 3500,
    negotiation_notes: '',
    event_date: '',
    event_time: '',
    reporting_time: '08:00',
    advance_received: 0,
    payment_mode: 'UPI',
    transaction_id: '',
  });

  // Confirm Order Form State & Auto-scroll Ref
  const confirmBookingModalRef = useRef<HTMLDivElement | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCustomerInfoExpanded, setIsCustomerInfoExpanded] = useState(true);

  // Auto-scroll to Booking Confirmation modal & manage scroll locking smoothly
  useEffect(() => {
    if (showConfirmModal) {
      // 1. Prevent background dashboard scrolling while modal is active
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // 2. Smoothly scroll the viewport to ensure the modal is immediately visible and centered
      const timer = setTimeout(() => {
        if (confirmBookingModalRef.current) {
          confirmBookingModalRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showConfirmModal]);
  const [confirmForm, setConfirmForm] = useState({
    package_name: '',
    quotation_amount: 0,
    advance_received: 0,
    event_date: '',
    event_time: '',
    payment_mode: 'UPI',
    notes: '',
    transaction_id: '',
  });

  // Final Reporting Details State per event
  const [eventsReporting, setEventsReporting] = useState<Record<string, { reporting_date: string, reporting_time: string }>>({});

  const initEventsReporting = (lead: Lead | null | undefined) => {
    if (!lead) return;
    const initialMap: Record<string, { reporting_date: string, reporting_time: string }> = {};
    if (lead.events && Array.isArray(lead.events) && lead.events.length > 0) {
      lead.events.forEach((ev, idx) => {
        const key = ev.id || `ev_${idx}`;
        initialMap[key] = {
          reporting_date: ev.reporting_date || (ev as any).Reporting_date || ev.event_date || ev.event_start_date || lead.Reporting_date || (lead as any).reporting_date || lead.event_date || '',
          reporting_time: ev.reporting_time || lead.reporting_time || ''
        };
      });
    } else {
      initialMap['default'] = {
        reporting_date: lead.Reporting_date || (lead as any).reporting_date || lead.event_date || '',
        reporting_time: lead.reporting_time || ''
      };
    }
    setEventsReporting(initialMap);
  };

  const [showFinalReportingModal, setShowFinalReportingModal] = useState(false);
  const [finalReportingForm, setFinalReportingForm] = useState<Record<string, { reporting_date: string, reporting_time: string }>>({});

  const areReportingDetailsComplete = (lead: Lead | null | undefined): boolean => {
    if (!lead) return false;

    if (lead.events && Array.isArray(lead.events) && lead.events.length > 0) {
      return lead.events.every((ev) => {
        const rDate = ev.reporting_date || (ev as any).Reporting_date;
        const rTime = ev.reporting_time;
        return typeof rDate === 'string' && rDate.trim() !== '' && typeof rTime === 'string' && rTime.trim() !== '';
      });
    }

    const leadRDate = lead.Reporting_date || (lead as any).reporting_date;
    const leadRTime = lead.reporting_time;
    return typeof leadRDate === 'string' && leadRDate.trim() !== '' && typeof leadRTime === 'string' && leadRTime.trim() !== '';
  };

  const openReportingDetailsModal = (lead: Lead, customMsg?: string) => {
    setSelectedLead(lead);
    const crmEvents = lead.events || [];
    const initialFormState: Record<string, { reporting_date: string, reporting_time: string }> = {};

    if (crmEvents.length > 0) {
      crmEvents.forEach((ev) => {
        initialFormState[ev.id] = {
          reporting_date: ev.reporting_date || ev.event_date || lead.Reporting_date || lead.event_date || '',
          reporting_time: ev.reporting_time || lead.reporting_time || ''
        };
      });
    } else {
      initialFormState['default'] = {
        reporting_date: lead.Reporting_date || (lead as any).reporting_date || lead.event_date || '',
        reporting_time: lead.reporting_time || ''
      };
    }

    setFinalReportingForm(initialFormState);
    setShowFinalReportingModal(true);
    showToastMsg(customMsg || "Please complete and save the Reporting Details before confirming the order.", "error");
  };

  // Quotation System State
  const [quotationTerms, setQuotationTerms] = useState(
    "1. Payments are non-refundable.\n" +
    "2. Crew food arrangements from client side.\n" +
    "3. 50% advance payment before the event.\n" +
    "4. If duration exceeds 1 hour, additional charges of ‚Çπ1,500 per hour will be applicable.\n" +
    "5. 50% full payment on event day.\n" +
    "6. Pendrive and Hard Disk are not included.\n" +
    "7. Edited data will be shared via Google Drive link."
  );
  const [generatedPDFBlobUrl, setGeneratedPDFBlobUrl] = useState<string>('');
  const [activeQuoteNum, setActiveQuoteNum] = useState<string>('');
  const [showStep3Popup, setShowStep3Popup] = useState<boolean>(false);
  const [step3Option, setStep3Option] = useState<'negotiation' | 'quotation_send'>('negotiation');

  // Customizable inclusions, deliverables, discount, and additional charges states
  const [editableInclusions, setEditableInclusions] = useState<Record<string, string[]>>({});
  const [editableDeliverables, setEditableDeliverables] = useState<Record<string, string[]>>({});
  
  const [step3AutoSaveStatus, setStep3AutoSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);

  const step3SaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveStep3DataRealtime = async (
    updatedInclusions: Record<string, string[]>,
    updatedDeliverables: Record<string, string[]>,
    activePkgId?: string,
    packageCostOverride?: number | null,
    discountOverride?: number | null,
    additionalOverride?: number | null
  ) => {
    if (isStep3Locked) return;
    const pkgId = activePkgId || wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedPkgIds[0] || 'Custom Package';
    const leadId = selectedLead?.lead_id || createdLeadId;
    if (!leadId || leadId === 'DRAFT-LEAD' || !pkgId || !supabaseClient) return;

    setStep3AutoSaveStatus('saving');

    const activeEventsList = (activeTab === 'create' && createEvents.length > 0) ? createEvents : (crmEvents && crmEvents.length > 0 ? crmEvents : []);
    const { teamMembersJson, deliverablesJson, flatTeamMembers, teamMembersText, deliverablesText } = buildStep3EventPayloads(
      pkgId,
      activeEventsList,
      updatedInclusions,
      updatedDeliverables
    );

    const safeTeamMembersText = teamMembersText;
    const safeDeliverablesText = deliverablesText;

    console.log('TEAM MEMBERS SAVE', { leadId, teamMembers: flatTeamMembers, serialized: safeTeamMembersText });

    const cleanPkgCost = packageCostOverride !== undefined ? packageCostOverride : (
      wizardLeadData.package_cost !== "" && wizardLeadData.package_cost != null && !isNaN(Number(wizardLeadData.package_cost))
      ? Number(wizardLeadData.package_cost)
      : (wizardLeadData.package_price !== "" && wizardLeadData.package_price != null && !isNaN(Number(wizardLeadData.package_price))
        ? Number(wizardLeadData.package_price)
        : (wizardLeadData.budget ? Number(wizardLeadData.budget) : null))
    );

    const cleanDiscount = discountOverride !== undefined ? (discountOverride || 0) : (
      quoteDiscount === "" || quoteDiscount == null || isNaN(Number(quoteDiscount)) ? 0 : Number(quoteDiscount)
    );
    const cleanAdditional = additionalOverride !== undefined ? (additionalOverride || 0) : (
      quoteAdditional === "" || quoteAdditional == null || isNaN(Number(quoteAdditional)) ? 0 : Number(quoteAdditional)
    );
    const cleanFinalAmt = Math.max(0, (cleanPkgCost || 0) + cleanAdditional - cleanDiscount);

    const updatePayload: any = {
      Team_Members: safeTeamMembersText,
      Add_Deliverable: safeDeliverablesText,
      Select_Package_Option: pkgId,
      Quotation_Discount: cleanDiscount,
      Additional_Services_Cost: cleanAdditional,
      Final_Quotation_Amount: cleanFinalAmt,
      Final_Package_Amount: cleanFinalAmt,
      final_package_amount: cleanFinalAmt,
      _explicit_step3_save: true
    };

    if (cleanPkgCost !== null && cleanPkgCost !== undefined) {
      updatePayload.package_price = cleanPkgCost;
      updatePayload.budget = cleanPkgCost;
    }

    if (step3SaveTimeoutRef.current) {
      clearTimeout(step3SaveTimeoutRef.current);
    }

    step3SaveTimeoutRef.current = setTimeout(async () => {
      try {
        // Direct Supabase update to ensure public.leads.Team_Members and Final_Package_Amount are immediately saved
        try {
          const { data: dbResult, error: dbError } = await supabaseClient
            .from('leads')
            .update({
              Team_Members: safeTeamMembersText,
              Add_Deliverable: safeDeliverablesText,
              Select_Package_Option: pkgId,
              Quotation_Discount: cleanDiscount,
              Additional_Services_Cost: cleanAdditional,
              Final_Quotation_Amount: cleanFinalAmt,
              Final_Package_Amount: cleanFinalAmt,
              ...(cleanPkgCost !== null && cleanPkgCost !== undefined ? { package_price: cleanPkgCost, budget: cleanPkgCost } : {})
            })
            .eq('lead_id', leadId)
            .select('*');
          console.log('TEAM MEMBERS SAVED', { leadId, Team_Members: safeTeamMembersText });
          console.log('FINAL PACKAGE AMOUNT SAVED', { leadId, Final_Package_Amount: cleanFinalAmt });
          console.log('TEAM MEMBERS DB RESULT', { data: dbResult, error: dbError });
        } catch (dbErr) {
          console.warn("Direct Supabase update warning:", dbErr);
        }

        // Update using RoleContext to keep the local leads array perfectly in sync
        await updateLead(leadId, updatePayload);
        setStep3AutoSaveStatus('saved');
        
        // Update local context manually to ensure instant visual sync in modal
        if (selectedLead) {
          setSelectedLead(prev => {
            if (!prev) return null;
            return {
              ...prev,
              Team_member: safeTeamMembersText,
              Team_Members: safeTeamMembersText,
              team_members: safeTeamMembersText,
              Add_Deliverable: safeDeliverablesText,
              deliverables_description: safeDeliverablesText,
              Select_Package_Option: pkgId,
              Quotation_Discount: cleanDiscount,
              Additional_Services_Cost: cleanAdditional,
              Final_Quotation_Amount: cleanFinalAmt,
              Final_Package_Amount: cleanFinalAmt,
              final_package_amount: cleanFinalAmt,
              ...(cleanPkgCost !== null && cleanPkgCost !== undefined ? {
                package_price: cleanPkgCost,
                budget: cleanPkgCost
              } : {})
            };
          });
        }
        
        // Also sync wizardLeadData deliverables and team members state
        setWizardLeadData(prev => ({
          ...prev,
          Team_member: safeTeamMembersText,
          Team_Members: safeTeamMembersText,
          team_members: safeTeamMembersText,
          Add_Deliverable: safeDeliverablesText,
          deliverables: deliverablesText,
          deliverables_description: deliverablesText,
          Select_Package_Option: pkgId,
          final_amount: cleanFinalAmt,
          ...(cleanPkgCost !== null && cleanPkgCost !== undefined ? {
            package_price: cleanPkgCost,
            budget: cleanPkgCost
          } : {})
        }));

        // Also save / update lead_packages record in Supabase
        try {
          const isTeamEmpty = teamMembersText === '[]' || teamMembersText === '';
          const isDelEmpty = deliverablesText === '[]' || deliverablesText === '';

          const packagePayload = {
            lead_id: leadId,
            package_id: pkgId,
            package_name: wizardLeadData.package_name || (pkgId === 'Custom Package' || pkgId === 'custom_package' ? 'Custom Package' : `Package ${pkgId}`),
            quantity: 1,
            total_amount: cleanPkgCost || 0,
            discount: quoteDiscount || 0,
            final_amount: (cleanPkgCost || 0) + (quoteAdditional || 0) - (quoteDiscount || 0),
            Team_Members_Included: teamMembersJson,
            editable_inclusions: updatedInclusions,
            deliverables_descriptionn: deliverablesJson, // keeping typo just in case other code uses it, but adding deliverables_json too
            deliverables_json: deliverablesJson,
            deliverables_description: deliverablesText,
            editable_deliverables: updatedDeliverables,
            updated_at: new Date().toISOString()
          };

          const { data: existingLps } = await supabaseClient
            .from('lead_packages')
            .select('*')
            .eq('lead_id', leadId);
          
          let targetLpId = `LP-${leadId}-${pkgId}`;
          
          if (existingLps && existingLps.length > 0) {
            const matched = existingLps.find(lp => String(lp.package_id) === String(pkgId)) || existingLps[0];
            targetLpId = matched.lead_package_id || matched.id || targetLpId;
            await supabaseClient
              .from('lead_packages')
              .update(packagePayload)
              .eq(matched.lead_package_id ? 'lead_package_id' : 'id', targetLpId);
          } else {
            await supabaseClient
              .from('lead_packages')
              .insert({
                ...packagePayload,
                lead_package_id: targetLpId,
                created_at: new Date().toISOString()
              });
          }
        } catch (e) {
          console.warn("Could not update lead_packages in saveStep3DataRealtime:", e);
        }
      } catch (err) {
        console.error("Exception in saveStep3DataRealtime:", err);
        setStep3AutoSaveStatus('error');
      }
    }, 400);
  };

  const getCleanSalesStaffName = (rawName?: any, leadObj?: Lead | null): string => {
    let candidate = String(rawName || '').trim();

    if (!candidate && leadObj) {
      if (leadObj.sales_staff_name && String(leadObj.sales_staff_name).trim()) {
        candidate = String(leadObj.sales_staff_name).trim();
      } else if (leadObj.sales_person && !['Sales', 'Sales Team', 'Admin', 'Admin User'].includes(String(leadObj.sales_person).trim())) {
        candidate = String(leadObj.sales_person).trim();
      }
    }

    if (!candidate && currentUser?.name) {
      candidate = currentUser.name;
    }

    if (!candidate) return '';

    // If candidate contains comma-separated names, extract only the actual Sales Person
    if (candidate.includes(',')) {
      if (leadObj?.sales_person && !['Sales', 'Sales Team', 'Admin', 'Admin User'].includes(String(leadObj.sales_person).trim())) {
        const sp = String(leadObj.sales_person).trim().toLowerCase();
        const parts = candidate.split(',').map(s => s.trim());
        const match = parts.find(p => p.toLowerCase() === sp || p.toLowerCase().includes(sp) || sp.includes(p.toLowerCase()));
        if (match) return match;
      }
      return candidate.split(',')[0].trim();
    }

    return candidate;
  };

  const getCleanSalesStaffMobile = (rawMobile?: any, leadObj?: Lead | null): string => {
    let candidate = String(rawMobile || '').trim();

    if (!candidate && leadObj && leadObj.sales_staff_mobile && String(leadObj.sales_staff_mobile).trim()) {
      candidate = String(leadObj.sales_staff_mobile).trim();
    }

    if (!candidate && currentUser?.mobile) {
      candidate = currentUser.mobile || '';
    }

    if (!candidate) return '';

    if (candidate.includes('||')) {
      candidate = candidate.split('||')[0].trim();
    }
    if (candidate.includes(',')) {
      candidate = candidate.split(',')[0].trim();
    }

    return candidate;
  };

  const [salesStaffName, setSalesStaffName] = useState<string>('');
  const [salesStaffMobile, setSalesStaffMobile] = useState<string>('');

  const getEffectiveSalesStaffName = (): string => {
    if (salesStaffName && String(salesStaffName).trim()) {
      return String(salesStaffName).trim();
    }
    if (currentUser?.name && String(currentUser.name).trim()) {
      return String(currentUser.name).trim();
    }
    if (selectedLead?.sales_staff_name && String(selectedLead.sales_staff_name).trim()) {
      return String(selectedLead.sales_staff_name).trim();
    }
    return 'Sales Staff';
  };

  const getEffectiveSalesStaffMobile = (): string => {
    let raw = '';
    if (salesStaffMobile && String(salesStaffMobile).trim()) {
      raw = String(salesStaffMobile).trim();
    } else if (currentUser?.mobile && String(currentUser.mobile).trim()) {
      raw = String(currentUser.mobile).trim();
    } else if (selectedLead?.sales_staff_mobile && String(selectedLead.sales_staff_mobile).trim()) {
      raw = String(selectedLead.sales_staff_mobile).trim();
    }
    const digits = raw.replace(/\D/g, '');
    return digits || raw;
  };

  React.useEffect(() => {
    if (currentUser?.name && (!salesStaffName || !salesStaffName.trim())) {
      setSalesStaffName(currentUser.name);
    }
    if (currentUser?.mobile && (!salesStaffMobile || !salesStaffMobile.trim())) {
      setSalesStaffMobile(currentUser.mobile);
    }
  }, [currentUser]);
  const [quoteDiscount, setQuoteDiscount] = useState<number | ''>('');
  const [quoteAdditional, setQuoteAdditional] = useState<number | ''>('');
  
  const [quoteServices, setQuoteServices] = useState<{ id: string; name: string; qty: number; price: number; isAdditional?: boolean }[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  // Adding service inline temp states
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceQty, setNewServiceQty] = useState(1);
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [isAddingInline, setIsAddingInline] = useState(false);

  const handleAddInlineService = () => {
    if (!newServiceName.trim()) return;
    const newService = {
      id: `add_${Date.now()}`,
      name: newServiceName.trim(),
      qty: Math.max(1, newServiceQty),
      price: Math.max(0, newServicePrice),
      isAdditional: true
    };
    setQuoteServices(prev => [...prev, newService]);
    // reset states
    setNewServiceName('');
    setNewServiceQty(1);
    setNewServicePrice(0);
    setIsAddingInline(false);
  };

  const handleEditServiceItem = (id: string, updatedFields: Partial<{ name: string; qty: number; price: number }>) => {
    setQuoteServices(prev => prev.map(s => s.id === id ? { ...s, ...updatedFields } : s));
  };

  const handleRemoveServiceItem = (id: string) => {
    setQuoteServices(prev => prev.filter(s => s.id !== id));
  };

  
  // Synchronize/initialize services on entering Step 4
  React.useEffect(() => {
    const isStep4Active = wizardStep === 3 || crmWizardStep === 3;
    if (!isStep4Active) {
      setEditingServiceId(null);
      setIsAddingInline(false);
      return;
    }

    const activePkgs = getSelectedPkgsInfo(crmWizardStep === 3);
    const activePkgIds = activePkgs.map(lp => lp.package_id).filter(Boolean);

    // Build expected list of base deliverables from active packages directly from packages table
    const expectedBaseDeliverables: { pkgId: string; name: string }[] = [];
    activePkgs.forEach((lp) => {
      const pkgKey = lp.package_id || 'default';
      const pObj = (packages || []).find(p => p.package_id === lp.package_id);
      const incStr = pObj?.team_members || '';
      const delStr = pObj?.deliverables || '';

      const inclusionsList = parseTeamMembers(incStr);
      const deliverablesList = delStr
        ? delStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      const combined = [...inclusionsList, ...deliverablesList];
      if (combined.length === 0) {
        const defaultItems = [
          '2 Photographers',
          '1 Cinematographer',
          'Drone Coverage',
          'LED Wall',
          'Album (40 Sheets)',
          'Teaser Video',
          'Highlight Video',
          'Full Event Coverage'
        ];
        defaultItems.forEach(name => {
          expectedBaseDeliverables.push({ pkgId: pkgKey, name });
        });
      } else {
        combined.forEach(name => {
          expectedBaseDeliverables.push({ pkgId: pkgKey, name });
        });
      }
    });

    const leadId = crmWizardStep === 3 ? (selectedLead?.lead_id || 'edit') : (createdLeadId || 'create');
    const storageKey = `erp_quote_services_${leadId}`;
    const cached = localStorage.getItem(storageKey);
    let cacheIsValid = false;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          const cachedBaseServices = parsed.filter(s => !s.isAdditional && s.id.startsWith('base_'));
          
          if (cachedBaseServices.length === expectedBaseDeliverables.length) {
            const allMatched = expectedBaseDeliverables.every((expected) => {
              return cachedBaseServices.some(s => {
                const parts = s.id.split('_');
                const pkgIdPart = parts[1];
                return pkgIdPart === expected.pkgId && s.name === expected.name;
              });
            });
            if (allMatched) {
              cacheIsValid = true;
              setQuoteServices(parsed);
              return;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse cached quote services", e);
      }
    }

    // Fallback/Rebuild: auto-initialize directly using data from packages table
    const initialServices: { id: string; name: string; qty: number; price: number; isAdditional: boolean }[] = [];
    activePkgs.forEach((lp) => {
      const pkgKey = lp.package_id || 'default';
      const pObj = (packages || []).find(p => p.package_id === lp.package_id);
      const incStr = pObj?.team_members || '';
      const delStr = pObj?.deliverables || '';

      const inclusionsList = parseTeamMembers(incStr);
      const deliverablesList = delStr
        ? delStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      const combined = [...inclusionsList, ...deliverablesList];

      if (combined.length === 0) {
        // Fallback standard photography inclusions
        const defaultItems = [
          '2 Photographers',
          '1 Cinematographer',
          'Drone Coverage',
          'LED Wall',
          'Album (40 Sheets)',
          'Teaser Video',
          'Highlight Video',
          'Full Event Coverage'
        ];
        const defaultPrices = [20000, 15000, 10000, 10050, 8000, 7000, 5000, 5000];
        const sumDefault = defaultPrices.reduce((a, b) => a + b, 0);
        const totalCost = Number(lp.package_cost || 0);
        const ratio = totalCost ? (totalCost / sumDefault) : 1;

        let distributed = 0;
        defaultItems.forEach((name, idx) => {
          let pricePerItem;
          if (idx === defaultItems.length - 1) {
            pricePerItem = totalCost - distributed;
          } else {
            pricePerItem = Math.round((defaultPrices[idx] || 5000) * ratio);
            distributed += pricePerItem;
          }
          initialServices.push({
            id: `base_${pkgKey}_${idx}`,
            name,
            qty: 1,
            price: pricePerItem,
            isAdditional: false
          });
        });
      } else {
        // Divide lp.package_cost equally among combined items
        const count = combined.length;
        const totalCost = Number(lp.package_cost || 0);
        let distributed = 0;
        combined.forEach((name, idx) => {
          let pricePerItem;
          if (idx === count - 1) {
            pricePerItem = totalCost - distributed;
          } else {
            pricePerItem = Math.round(totalCost / count);
            distributed += pricePerItem;
          }
          initialServices.push({
            id: `base_${pkgKey}_${idx}`,
            name,
            qty: 1,
            price: pricePerItem,
            isAdditional: false
          });
        });
      }
    });

    setQuoteServices(initialServices);
  }, [wizardStep, crmWizardStep, selectedLead, createdLeadId, packages, wizardLeadData.selected_package_id, selectedPkgIds]);

  // Save services to local storage whenever they change
  React.useEffect(() => {
    const isStep4Active = wizardStep === 3 || crmWizardStep === 3;
    if (!isStep4Active) return;
    const leadId = crmWizardStep === 3 ? (selectedLead?.lead_id || 'edit') : (createdLeadId || 'create');
    localStorage.setItem(`erp_quote_services_${leadId}`, JSON.stringify(quoteServices));
  }, [quoteServices, selectedLead, createdLeadId, crmWizardStep, wizardStep]);

  const handleEditInclusion = (pkgKey: string, index: number, value: string) => {
    if (isStep3Locked) return;
    setEditableInclusions(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list[index] = value;
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleRemoveInclusion = (pkgKey: string, index: number) => {
    if (isStep3Locked) return;
    setEditableInclusions(prev => {
      const list = prev[pkgKey] ? prev[pkgKey].filter((_, i) => i !== index) : [];
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleAddInclusion = (pkgKey: string, value: string) => {
    if (isStep3Locked) return;
    if (!value.trim()) return;
    setEditableInclusions(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list.push(value.trim());
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleEditDeliverable = (pkgKey: string, index: number, value: string) => {
    if (isStep3Locked) return;
    setEditableDeliverables(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list[index] = value;
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleRemoveDeliverable = (pkgKey: string, index: number) => {
    if (isStep3Locked) return;
    setEditableDeliverables(prev => {
      const list = prev[pkgKey] ? prev[pkgKey].filter((_, i) => i !== index) : [];
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleAddDeliverable = (pkgKey: string, value: string) => {
    if (isStep3Locked) return;
    if (!value.trim()) return;
    setEditableDeliverables(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list.push(value.trim());
      return { ...prev, [pkgKey]: list };
    });
  };

  // Reset or clear state when selectedLead changes or is deselected
  React.useEffect(() => {
    if (!selectedLead && activeTab === 'create') {
      return;
    }
    if (!selectedLead) {
      setEditableInclusions({});
      setEditableDeliverables({});
      return;
    }
  }, [selectedLead, activeTab]);

  const lastLoadedLeadIdRef = React.useRef<string | null>(null);

  // Fetch from Supabase directly for the JSON columns
  React.useEffect(() => {
    const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
    const targetLeadId = selectedLead?.lead_id || (activeTab === 'create' ? createdLeadId : null);
    if (targetLeadId && targetLeadId !== 'DRAFT-LEAD' && supabaseClient) {
      const currentKey = `${targetLeadId}`;
      if (lastLoadedLeadIdRef.current === currentKey) {
        return;
      }
      const fetchSupabasePackageData = async () => {
        try {
          const { data: lpData } = await supabaseClient
            .from('lead_packages')
            .select('*')
            .eq('lead_id', targetLeadId);

          const { data, error } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('lead_id', targetLeadId)
            .maybeSingle();
          
          if (!error && (data || (lpData && lpData.length > 0))) {
            lastLoadedLeadIdRef.current = currentKey;
            
            const primaryLp = lpData && lpData.length > 0 ? lpData[0] : null;
            const effectivePkgId = pkgId || data?.Select_Package_Option || primaryLp?.package_id || 'Custom Package';

            const cleanCost = primaryLp?.package_cost ?? data?.package_price ?? data?.budget;
            if (cleanCost != null && !isNaN(Number(cleanCost))) {
              setWizardLeadData(prev => {
                const existingPkg = prev.selected_package_id || prev.Select_Package_Option;
                const finalPkg = (existingPkg && existingPkg.trim() !== '') ? existingPkg : effectivePkgId;
                return {
                  ...prev,
                  package_cost: Number(cleanCost),
                  package_price: Number(cleanCost),
                  budget: Number(cleanCost),
                  notes: data?.notes_special_customizations ?? prev.notes,
                  Select_Package_Option: finalPkg,
                  selected_package_id: finalPkg,
                };
              });
            }
            if (data?.Quotation_Discount != null) {
              setQuoteDiscount(Number(data.Quotation_Discount));
            }
            if (data?.Additional_Services_Cost != null) {
              setQuoteAdditional(Number(data.Additional_Services_Cost));
            }

            const rawTeamData = data?.Team_Members || data?.Team_member || (data as any)?.team_members || primaryLp?.Team_Members_Included || primaryLp?.editable_inclusions;
            console.log('TEAM MEMBERS LOADED', { leadId: targetLeadId, Team_Members: rawTeamData });
            if (rawTeamData) {
              const loadedInclusions = parseTeamMembersJsonToRecord(rawTeamData, effectivePkgId, crmEvents);
              if (Object.keys(loadedInclusions).length > 0) {
                setEditableInclusions(loadedInclusions);
              }
            }

            const rawDelData = data?.Add_Deliverable || primaryLp?.deliverables_descriptionn || primaryLp?.editable_deliverables || data?.deliverables_description;
            console.log('DELIVERABLES LOADED', { leadId: targetLeadId, Add_Deliverable: rawDelData });
            if (rawDelData) {
              const loadedDeliverables = parseDeliverablesJsonToRecord(rawDelData, effectivePkgId, crmEvents);
              if (Object.keys(loadedDeliverables).length > 0) {
                setEditableDeliverables(loadedDeliverables);
              }
            }
          }
        } catch (e) {
          console.error('Error fetching leads/lead_packages details from Supabase', e);
        }
      };
      fetchSupabasePackageData();
    } else {
      if (!selectedLead && !createdLeadId) {
        lastLoadedLeadIdRef.current = null;
      }
    }
  }, [selectedLead?.lead_id, createdLeadId, activeTab, wizardLeadData.selected_package_id, wizardLeadData.Select_Package_Option, supabaseClient, crmEvents, crmWizardStep, wizardStep]);

  // Save to Supabase directly for the JSON columns
  const isFirstRender = React.useRef(true);
  
  // Explicit saves are now handled directly in the onChange handlers for immediate persistence
  // to avoid closure stale state overwrites in debounced effects.

  // Step 1 Automatic Data Prefill & Hydration from Supabase leads table
  React.useEffect(() => {
    if (!selectedLead?.lead_id || !supabaseClient || selectedLead.lead_id === 'DRAFT-LEAD') return;

    let isMounted = true;

    const loadStep1DataFromDB = async () => {
      try {
        const { data: dbLead, error } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', selectedLead.lead_id)
          .maybeSingle();

        if (error || !dbLead || !isMounted) return;

        setWizardLeadData(prev => ({
          ...prev,
          customer_name: dbLead.customer_name || prev.customer_name || '',
          mobile: dbLead.mobile ? String(dbLead.mobile) : (prev.mobile ? String(prev.mobile) : ''),
          whatsapp_number: dbLead.whatsapp_number ? String(dbLead.whatsapp_number) : (dbLead.mobile ? String(dbLead.mobile) : (prev.whatsapp_number ? String(prev.whatsapp_number) : '')),
          email: dbLead.email ?? prev.email ?? '',
          lead_source: dbLead.lead_source || prev.lead_source || '',
          Specify_Custom_Lead_Source_Name: dbLead.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name || '',
          address: dbLead.address || prev.address || '',
          city: dbLead.city || prev.city || '',
          state: dbLead.state || prev.state || '',
          pincode: dbLead.pincode || prev.pincode || '',
          client_residence_address: dbLead.client_residence_address || prev.client_residence_address || '',
          desired_event_shoot_type: dbLead.desired_event_shoot_type || prev.desired_event_shoot_type || '',
          status: dbLead.status || dbLead.current_status || prev.status,
          budget: dbLead.budget ?? prev.budget ?? 0,
          package_price: dbLead.package_price ?? prev.package_price ?? 0,
          Select_Package_Option: prev.Select_Package_Option || prev.selected_package_id || dbLead.Select_Package_Option || '',
          selected_package_id: prev.selected_package_id || prev.Select_Package_Option || dbLead.Select_Package_Option || '',
        }));

        // Keep selectedLead object in sync with fresh database values
        setSelectedLead(prev => {
          if (!prev || prev.lead_id !== dbLead.lead_id) return prev;
          return {
            ...prev,
            customer_name: dbLead.customer_name || prev.customer_name,
            mobile: dbLead.mobile ? String(dbLead.mobile) : prev.mobile,
            whatsapp_number: dbLead.whatsapp_number ? String(dbLead.whatsapp_number) : prev.whatsapp_number,
            email: dbLead.email ?? prev.email,
            lead_source: dbLead.lead_source || prev.lead_source,
            Specify_Custom_Lead_Source_Name: dbLead.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name,
            status: dbLead.status || dbLead.current_status || prev.status,
          };
        });
      } catch (err) {
        console.error("Error loading Step 1 data from DB:", err);
      }
    };

    loadStep1DataFromDB();

    return () => { isMounted = false; };
  }, [selectedLead?.lead_id, supabaseClient]);

  // Step 1 Customer Details Automatic Data Hydration from Supabase
  React.useEffect(() => {
    if (!selectedLead?.lead_id || selectedLead.lead_id === 'DRAFT-LEAD' || !supabaseClient) return;

    let isMounted = true;

    const hydrateCustomerDetails = async () => {
      try {
        const { data: leadData, error } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', selectedLead.lead_id)
          .maybeSingle();

        if (error || !leadData || !isMounted) return;

        setWizardLeadData(prev => ({
          ...prev,
          customer_name: leadData.customer_name || prev.customer_name || selectedLead.customer_name || '',
          mobile: String(leadData.mobile || prev.mobile || selectedLead.mobile || ''),
          whatsapp_number: String(leadData.whatsapp_number || prev.whatsapp_number || leadData.mobile || prev.mobile || selectedLead.whatsapp_number || selectedLead.mobile || ''),
          email: leadData.email ?? prev.email ?? selectedLead.email ?? '',
          lead_source: leadData.lead_source || prev.lead_source || selectedLead.lead_source || 'Reference',
          Specify_Custom_Lead_Source_Name: leadData.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name || selectedLead.Specify_Custom_Lead_Source_Name || '',
          address: leadData.address || prev.address || selectedLead.address || '',
          city: leadData.city || prev.city || selectedLead.city || '',
          state: leadData.state || prev.state || selectedLead.state || '',
          pincode: leadData.pincode || prev.pincode || selectedLead.pincode || '',
          client_residence_address: leadData.client_residence_address || prev.client_residence_address || selectedLead.client_residence_address || '',
          desired_event_shoot_type: leadData.desired_event_shoot_type || prev.desired_event_shoot_type || selectedLead.desired_event_shoot_type || '',
          Select_Package_Option: prev.Select_Package_Option || prev.selected_package_id || leadData.Select_Package_Option || selectedLead.Select_Package_Option || '',
          status: leadData.status || leadData.current_status || prev.status || selectedLead.status || '',
        }));
      } catch (err) {
        console.warn("Failed to hydrate customer details from Supabase", err);
      }
    };

    hydrateCustomerDetails();

    return () => { isMounted = false; };
  }, [selectedLead?.lead_id, supabaseClient]);

  // Step 2 Automatic Data Persistence & Prefill
  React.useEffect(() => {
    const isStep2 = (activeTab === 'create' && wizardStep === 2) || (activeTab === 'crm' && crmWizardStep === 2);
    const activeLeadId = activeTab === 'create' ? createdLeadId : selectedLead?.lead_id;

    if (!isStep2 || !activeLeadId || !supabaseClient) return;

    let isMounted = true;

    const loadStep2DataFromDB = async () => {
      try {
        // 1. Fetch lead details
        const { data: leadData, error: leadErr } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', activeLeadId)
          .maybeSingle();

        if (leadErr) {
          console.error("Error fetching lead for step 2:", leadErr);
          return;
        }

        if (!isMounted) return;

        // 2. Fetch lead events
        const { data: eventsData, error: eventsErr } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', activeLeadId);

        if (eventsErr) {
          console.error("Error fetching events for step 2:", eventsErr);
          return;
        }

        if (!isMounted) return;

        if (leadData) {
          // Restore follow-up details
          if (leadData.next_follow_up_date) {
            setStep2FollowUpDate(leadData.next_follow_up_date);
          }
          if (leadData.follow_up_notes) {
            setStep2FollowUpNotes(leadData.follow_up_notes);
          }
          
          setWizardLeadData(prev => ({
            ...prev,
            lead_source: leadData.lead_source || prev.lead_source,
            Specify_Custom_Lead_Source_Name: leadData.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name,
            client_residence_address: leadData.client_residence_address || prev.client_residence_address,
            city: leadData.city || prev.city,
            state: leadData.state || prev.state,
            pincode: leadData.pincode || prev.pincode,
            reference_source: leadData.reference_source || prev.reference_source,
          }));
        }

        if (eventsData && eventsData.length > 0) {
          const mappedEvents: LeadEvent[] = eventsData.map(ev => ({
            id: ev.id,
            event_type: ev.event_type,
            event_name: ev.event_name,
            event_date: ev.event_date,
            event_start_date: ev.event_date,
            event_end_date: ev.event_end_date || ev.Event_End_Date || '',
            event_location: ev.event_location,
            event_shoot_type: ev.event_shoot_type,
            guest_pax: ev.guest_pax,
            staff_pax: ev.staff_pax,
            event_start_time: ev.event_start_time,
            event_end_time: ev.event_end_time,
            google_maps_link: ev.google_maps_link,
            assigned_staff_names: ev.assigned_staff_names,
            assigned_staff_mobiles: ev.assigned_staff_mobiles,
            reporting_date: ev.reporting_date,
            reporting_time: ev.reporting_time
          }));

          if (activeTab === 'create') {
            setCreateEvents(mappedEvents);
          } else {
            setCrmEvents(mappedEvents);
          }

          // Pre-fill the form with the first event's details
          const firstEv = mappedEvents[0];
          setEventForm({
            event_type: firstEv.event_type || '',
            event_name: firstEv.event_name || '',
            event_date: firstEv.event_date || '',
            event_start_date: firstEv.event_date || '',
            event_end_date: firstEv.event_end_date || (firstEv as any).Event_End_Date || '',
            event_location: firstEv.event_location || '',
            event_shoot_type: firstEv.event_shoot_type || '',
            guest_pax: firstEv.guest_pax || '',
            staff_pax: firstEv.staff_pax || '',
            event_start_time: firstEv.event_start_time || '',
            event_end_time: firstEv.event_end_time || '',
            google_maps_link: firstEv.google_maps_link || ''
          });
          setEditingEventId(firstEv.id);
          setShowEventForm(true); // Force form to display so fields are not blank
        }
      } catch (err) {
        console.error("Error in loadStep2DataFromDB effect:", err);
      }
    };

    loadStep2DataFromDB();

    return () => {
      isMounted = false;
    };
  }, [wizardStep, crmWizardStep, activeTab, createdLeadId, selectedLead?.lead_id, supabaseClient]);

  // Auto-scroll and focus transitions for Sales Popups & Forms
  React.useEffect(() => {
    if (activeTab === 'create') {
      triggerAutoScrollAndFocus('#create_lead_form', 150);
    }
  }, [wizardStep, activeTab]);

  React.useEffect(() => {
    if (selectedLead) {
      triggerAutoScrollAndFocus('#lead_details_mobile_modal', 150);
    }
  }, [crmWizardStep, selectedLead?.lead_id]);

  React.useEffect(() => {
    if (isAddFormOpen || editingPackage) {
      triggerAutoScrollAndFocus('#add_edit_package_modal', 150);
    }
  }, [isAddFormOpen, editingPackage]);

  React.useEffect(() => {
    if (showConfirmModal) {
      triggerAutoScrollAndFocus('#confirm_booking_modal', 150);
      if (selectedLead) {
         initEventsReporting(selectedLead);
         setConfirmForm(prev => ({
            ...prev,
            quotation_amount: Number(selectedLead.Final_Quotation_Amount) || Number((selectedLead as any).final_quotation_amount) || Number(wizardLeadData.final_amount) || Number(selectedLead.final_amount) || 0
         }));
      }
    }
  }, [showConfirmModal, selectedLead?.lead_id]);

  React.useEffect(() => {
    if (showFinalReportingModal) {
      triggerAutoScrollAndFocus('#final_reporting_modal', 150);
    }
  }, [showFinalReportingModal]);

  React.useEffect(() => {
    if (showStep3Popup) {
      triggerAutoScrollAndFocus('#step3_followup_modal', 150);
    }
  }, [showStep3Popup]);

  React.useEffect(() => {
    // Completely removed automated quotation number generation as per instructions
  }, [wizardStep, crmWizardStep, activeQuoteNum]);

  const getSelectedPkgsInfo = (isEdit: boolean) => {
    const finalPkgId = (isEdit
      ? (wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedLead?.Select_Package_Option)
      : (wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedPkgIds[0])) || 'Custom Package';

    if (finalPkgId === 'Custom Package' || finalPkgId === 'custom_package') {
      return [{
        package_name: 'Custom Package',
        package_id: 'Custom Package',
        package_cost: Number(wizardLeadData.package_cost) || 0,
        deliverables: wizardLeadData.deliverables || '',
        inclusions: '',
        team_members: '',
        seasonal_offer: '',
        terms_conditions: '',
        event_type: '',
        duration: '',
        category: ''
      }];
    }

    const primaryPkg = (packages || []).find(p => String(p.package_id) === String(finalPkgId) || String(p.package_name) === String(finalPkgId));
    if (primaryPkg) {
      return [{
        package_name: primaryPkg.package_name,
        package_id: primaryPkg.package_id,
        package_cost: pkgPrices[primaryPkg.package_id] !== undefined ? Number(pkgPrices[primaryPkg.package_id]) : (Number(wizardLeadData.package_cost) || Number(primaryPkg.price) || 0),
        deliverables: wizardLeadData.deliverables || pkgDeliverables[primaryPkg.package_id] || primaryPkg.deliverables || '',
        inclusions: primaryPkg.package_includes || '',
        team_members: primaryPkg.team_members || '',
        seasonal_offer: primaryPkg.seasonal_offer || '',
        terms_conditions: primaryPkg.terms_conditions || '',
        event_type: primaryPkg.event_type || '',
        duration: primaryPkg.duration || '',
        category: primaryPkg.category || ''
      }];
    }

    return [{
      package_name: wizardLeadData.package_name || 'Custom Package',
      package_id: finalPkgId || 'Custom Package',
      package_cost: Number(wizardLeadData.package_cost) || 0,
      deliverables: wizardLeadData.deliverables || '',
      inclusions: '',
      team_members: '',
      seasonal_offer: '',
      terms_conditions: '',
      event_type: '',
      duration: '',
      category: ''
    }];
  };

  const dynamicBaseSum = getSelectedPkgsInfo(crmWizardStep > 0).reduce((sum, p) => sum + Number(p.package_cost || 0), 0);
  const dynamicAdditionalSum = quoteServices
    .filter(s => s.isAdditional)
    .reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);
    const discountVal = Number(quoteDiscount || 0);
  const rawDynamicFinalAmt = Math.max(0, dynamicBaseSum + Number(quoteAdditional || 0) - discountVal);
  const dynamicFinalAmt = Number.isNaN(rawDynamicFinalAmt) ? 0 : rawDynamicFinalAmt;

  React.useEffect(() => {
    setWizardLeadData(prev => {
      if (prev.final_amount !== dynamicFinalAmt) {
        return { ...prev, final_amount: dynamicFinalAmt };
      }
      return prev;
    });
  }, [dynamicFinalAmt]);

  const getLeadInfoForQuote = (isEdit: boolean) => {
    const effectiveSalesName = getEffectiveSalesStaffName();
    const effectiveSalesMobile = getEffectiveSalesStaffMobile();

    const finalAmountVal = dynamicFinalAmt;
    if (isEdit) {
      return {
        ...selectedLead,
        customer_name: wizardLeadData.customer_name,
        mobile: wizardLeadData.mobile,
        email: wizardLeadData.email,
        event_date: wizardLeadData.event_date,
        event_location: wizardLeadData.event_location,
        event_type: wizardLeadData.event_type,
        shoot_type: wizardLeadData.shoot_type,
        budget: wizardLeadData.budget || finalAmountVal,
        whatsapp_number: wizardLeadData.whatsapp_number,
        address: wizardLeadData.address,
        city: wizardLeadData.city,
        state: wizardLeadData.state,
        pincode: wizardLeadData.pincode,
        client_residence_address: wizardLeadData.client_residence_address,
        desired_event_shoot_type: wizardLeadData.desired_event_shoot_type,
        deliverables_description: wizardLeadData.deliverables,
        notes_special_customizations: wizardLeadData.notes,
        Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || '',
        sales_staff_name: effectiveSalesName,
        sales_staff_mobile: effectiveSalesMobile,
        events: crmEvents,
        Final_Quotation_Amount: finalAmountVal || wizardLeadData.final_quoted_amount || wizardLeadData.budget || selectedLead?.Final_Quotation_Amount || selectedLead?.final_quotation_amount || selectedLead?.final_amount,
        final_quotation_amount: finalAmountVal || wizardLeadData.final_quoted_amount || wizardLeadData.budget || selectedLead?.final_quotation_amount || selectedLead?.Final_Quotation_Amount || selectedLead?.final_amount,
        final_amount: finalAmountVal || wizardLeadData.final_quoted_amount || wizardLeadData.budget || selectedLead?.final_amount || selectedLead?.Final_Quotation_Amount || selectedLead?.final_quotation_amount,
        dynamicFinalAmt: finalAmountVal
      };
    } else {
      return {
        ...createForm,
        lead_id: createdLeadId || 'DRAFT-LEAD',
        deliverables_description: selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
        notes_special_customizations: selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
        Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || '',
        sales_staff_name: effectiveSalesName,
        sales_staff_mobile: effectiveSalesMobile,
        events: createEvents,
        Final_Quotation_Amount: finalAmountVal || createForm.budget,
        final_quotation_amount: finalAmountVal || createForm.budget,
        final_amount: finalAmountVal || createForm.budget,
        dynamicFinalAmt: finalAmountVal
      };
    }
  };

  const validateLeadForQuotation = (leadObj: any, activePkgs: any[]) => {
    const missing: string[] = [];
    if (!String(leadObj.customer_name || '').trim()) missing.push('Customer Name');
    if (!String(leadObj.mobile || '').trim()) missing.push('Mobile Number');
    if (!String(leadObj.event_type || '').trim()) missing.push('Event Type');
    if (!String(leadObj.event_date || '').trim()) missing.push('Event Date');
    if (!String(leadObj.event_location || '').trim() && !String(leadObj.location || '').trim()) missing.push('Event Location');
    if (activePkgs.length === 0) missing.push('At least one selected package');
    return missing;
  };

  const handleGenerateQuote = async (isEdit: boolean): Promise<string | null> => {
    setIsSaving(true);
    console.log("‚úî Starting quotation generation...");
    try {
      const effName = getEffectiveSalesStaffName();
      const effMobile = getEffectiveSalesStaffMobile();
      if (!salesStaffName || !salesStaffName.trim()) setSalesStaffName(effName);
      if (!salesStaffMobile || !salesStaffMobile.trim()) setSalesStaffMobile(effMobile);

      const leadObj = getLeadInfoForQuote(isEdit);
      const leadIdForError = leadObj?.lead_id || createdLeadId || 'UNKNOWN';

      console.log("‚úî Validating form...");
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        showErrorHelper(
          "Quotation Incomplete",
          `Missing required fields: ${missingFields.join(', ')}`,
          "validateLeadForQuotation()",
          leadIdForError,
          "Complete all required fields before generating the quotation."
        );
        setIsSaving(false);
        return null;
      }

      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;

      const leadId = leadObj.lead_id || 'DRAFT-LEAD';
      let dbQuote = null;
      if (supabaseClient && leadId !== 'DRAFT-LEAD') {
        const { data, error } = await supabaseClient
          .from('quotations')
          .select('quotation_id, quotation_number, created_at')
          .eq('lead_id', leadId)
          .maybeSingle();
        if (!error && data) {
          dbQuote = data;
        }
      }

      const existingQuotation = dbQuote || (quotations || []).find(q => q.lead_id === leadId);
      
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const randomFour = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
      const generatedQuotNum = existingQuotation ? existingQuotation.quotation_number : `QT-${dateStr}-${randomFour}`;
      const quotNum = activeQuoteNum || generatedQuotNum;
      
      console.log(`‚úî Creating/Updating quotation ${quotNum}...`);
      const qId = existingQuotation ? existingQuotation.quotation_id : ('QT-' + Math.random().toString(36).substring(2, 9).toUpperCase());
      
      const activePkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || 'Custom Package';
      const { teamMembersJson, deliverablesJson, teamMembersText, deliverablesText } = buildStep3EventPayloads(
        activePkgId,
        crmEvents,
        editableInclusions,
        editableDeliverables
      );
      
      const activeDeliverablesText = (deliverablesText === '[]' && leadObj.deliverables_description && leadObj.deliverables_description !== '[]') 
        ? leadObj.deliverables_description 
        : deliverablesText;
        
      const activeTeamMembersText = (teamMembersText === '[]' && (leadObj.Team_member || leadObj.Team_Members) && (leadObj.Team_member !== '[]' || leadObj.Team_Members !== '[]'))
        ? (leadObj.Team_member || leadObj.Team_Members)
        : teamMembersText;
        
      let finalBasePkgSum = basePkgSum;
      if (finalBasePkgSum === 0 && leadObj.package_price && leadObj.package_price > 0) {
        finalBasePkgSum = leadObj.package_price;
      }

      const standardQuotation = {
        quotation_id: qId,
        quotation_number: quotNum,
        lead_id: leadId,
        customer_id: leadObj.customer_name || '',
        customer_name: leadObj.customer_name || '',
        order_id: '',
        package_name: activePkgs.map(p => p.package_name).join(' + '),
        package_price: finalBasePkgSum,
        quotation_amount: finalBasePkgSum + Number(quoteAdditional || 0),
        discount: quoteDiscount,
        discount_amount: quoteDiscount,
        additional_services_cost: Number(quoteAdditional || 0),
        final_quotation_amount: finalAmt,
        final_amount: finalAmt,
        tax_amount: 0,
        quotation_status: 'Sent',
        pdf_url: '',
        generated_date: new Date().toISOString().split('T')[0],
        created_at: existingQuotation ? existingQuotation.created_at : new Date().toISOString(),
        created_by: salesStaffName || 'System',
        whatsapp_sent_status: false,
        viewed_status: false,
        terms_conditions: quotationTerms,
        deliverables_description: activeDeliverablesText,
        notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
        client_residence_address: leadObj.client_residence_address,
        city: leadObj.city,
        state: leadObj.state,
        pincode: leadObj.pincode,
        desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,

        editableInclusions: editableInclusions,
        editableDeliverables: editableDeliverables
      };

      console.log("‚úî Saving to Supabase...");
      const finalQuoteNum = await addQuotation(standardQuotation);
      console.log(`‚úî Quotation saved successfully. Confirmed Quotation Number: ${finalQuoteNum}`);
      setActiveQuoteNum(finalQuoteNum);

      if (isEdit) {
        if (wizardLeadData.selected_package_id) {
          const selectedPkg = packages.find((p) => p.package_id === wizardLeadData.selected_package_id);
          const activePackagesList = (leadPackages || []).filter(lp => lp.lead_id === selectedLead.lead_id);
          
          if (!activePackagesList.some(lp => lp.package_id === wizardLeadData.selected_package_id)) {
            activePackagesList.push({
              package_id: wizardLeadData.selected_package_id,
              package_name: selectedPkg?.package_name || 'Selected Package',
              package_cost: Number(wizardLeadData.package_cost),
              quantity: 1,
              total_amount: Number(wizardLeadData.package_cost),
              discount: 0,
              final_amount: Number(wizardLeadData.package_cost),
              deliverables_description: activeDeliverablesText,
              notes_special_customizations: wizardLeadData.notes,
              additional_services_cost: 0,
              team_members: '',
              deliverables: ''
            } as any);
          }
          
          const payloadToSave = activePackagesList.map(lp => {
            const isPrimary = lp.package_id === wizardLeadData.selected_package_id;
            const incStr = (editableInclusions[lp.package_id!] || []).join(', ');
            const delStr = (editableDeliverables[lp.package_id!] || []).join(', ');
            
            // Protect against empty object overwriting valid data during a race condition
            const hasNewInclusions = Object.keys(editableInclusions).length > 0;
            const hasNewDeliverables = Object.keys(editableDeliverables).length > 0;
            
            return {
              package_id: lp.package_id!,
              package_name: lp.package_name || 'Selected Package',
              package_cost: isPrimary ? Number(wizardLeadData.package_cost) : lp.package_cost,
              quantity: lp.quantity || 1,
              total_amount: isPrimary ? Number(wizardLeadData.package_cost) : lp.total_amount,
              discount: lp.discount || 0,
              final_amount: isPrimary ? Number(wizardLeadData.package_cost) : lp.final_amount,
              deliverables_description: isPrimary ? activeDeliverablesText : lp.deliverables_description,
              notes_special_customizations: isPrimary ? wizardLeadData.notes : lp.notes_special_customizations,
              additional_services_cost: lp.additional_services_cost || 0,
              team_members: incStr || lp.team_members || '',
              deliverables: delStr || lp.deliverables || '',
              ...(hasNewInclusions ? { editable_inclusions: editableInclusions, Team_Members_Included: teamMembersJson } : {}),
              ...(hasNewDeliverables ? { editable_deliverables: editableDeliverables, deliverables_descriptionn: deliverablesJson } : {}),
            };
          });

          await saveLeadPackages(selectedLead.lead_id, payloadToSave);
        }

        const updatedRemarks = appendCompletedStep(wizardLeadData.notes || '', 3);

        setWizardLeadData(prev => ({
          ...prev,
          budget: finalAmt,
          final_quoted_amount: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          remarks: updatedRemarks,
          deliverables: activeDeliverablesText,
          deliverables_description: activeDeliverablesText,
          Team_member: activeTeamMembersText,
          Team_Members: activeTeamMembersText,
          team_members: activeTeamMembersText
        }));
        await updateLead(leadObj.lead_id, {
          budget: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          package_price: finalBasePkgSum,
          deliverables_description: activeDeliverablesText,
          Team_member: activeTeamMembersText,
          Team_Members: activeTeamMembersText,
          team_members: activeTeamMembersText,
          notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
          
          client_residence_address: leadObj.client_residence_address,
          city: leadObj.city,
          state: leadObj.state,
          pincode: leadObj.pincode,
          desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
          remarks: updatedRemarks,
          Select_Package_Option: leadObj.Select_Package_Option || ''
        });
        
        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'Quotation Sent' as CurrentStage,
            remarks: updatedRemarks
          };
        });
      } else {
        setCreateForm(prev => ({
          ...prev,
          budget: finalAmt
        }));
        setSalesStatus('Quotation Sent');
        await updateLead(createdLeadId!, {
          budget: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          package_price: finalBasePkgSum,
          deliverables_description: activeDeliverablesText,
          Team_member: activeTeamMembersText,
          Team_Members: activeTeamMembersText,
          team_members: activeTeamMembersText,
          notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
          sales_staff_name: salesStaffName,
          sales_staff_mobile: salesStaffMobile,
          client_residence_address: leadObj.client_residence_address,
          city: leadObj.city,
          state: leadObj.state,
          pincode: leadObj.pincode,
          desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
          Select_Package_Option: leadObj.Select_Package_Option || ''
        });
      }

      console.log("‚úî Process completed");
      return finalQuoteNum;
    } catch (err: any) {
      showErrorHelper(
        "Quotation Save Failed",
        err.message || "Failed to save quotation data to the database.",
        "handleGenerateQuote()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check your network connection and ensure the lead data is valid.",
        err
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewQuotePDF = async (isEdit: boolean) => {
    try {
      const effName = getEffectiveSalesStaffName();
      const effMobile = getEffectiveSalesStaffMobile();
      if (!salesStaffName || !salesStaffName.trim()) setSalesStaffName(effName);
      if (!salesStaffMobile || !salesStaffMobile.trim()) setSalesStaffMobile(effMobile);

      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        showToastMsg(`Quotation Incomplete! Please enter the following fields: ${missingFields.join(', ')}`, "error");
        return;
      }

      let currentLogo = logoBase64;
      let currentAspect = logoAspectRatio;
      try {
        const logoUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/logo%20(4)%20(1).png';
        const result = await getLogoBase64FromUrl(logoUrl);
        currentLogo = result.base64;
        currentAspect = result.aspect;
      } catch (e) {
        console.warn("Failed to wait-load logo for preview, using preloaded:", e);
      }

      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        "",
        quotationTerms,
        currentLogo,
        currentAspect,
        editableInclusions,
        editableDeliverables,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
        quoteServices
      );
      
      const blobUrl = doc.output('bloburl');
      setGeneratedPDFBlobUrl(blobUrl);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to preview PDF.");
    }
  };

  const handleDownloadQuotePDF = async (isEdit: boolean) => {
    try {
      console.log("‚úî Generating PDF...");
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      
      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        "",
        quotationTerms,
        logoBase64,
        logoAspectRatio,
        editableInclusions,
        editableDeliverables,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
        quoteServices
      );
      
      console.log("‚úî PDF generated");
      const pdfFileName = generateQuotationPdfFileName(leadObj);
      doc.save(pdfFileName);
      
      showToastMsg("Quotation successfully generated!", "success");
    } catch (err: any) {
      showErrorHelper(
        "PDF Generation Failed",
        err.message || "jsPDF failed to render the quotation document.",
        "handleDownloadQuotePDF()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check console logs to see if there is an issue with the document template or variables.",
        err
      );
    }
  };

  const handleSendWhatsAppQuote = async (isEdit: boolean) => {
    try {
      console.log("‚úî Generating PDF...");
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      const finalAmt = dynamicFinalAmt;

      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        "",
        quotationTerms,
        logoBase64,
        logoAspectRatio,
        editableInclusions,
        editableDeliverables,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
        quoteServices
      );
      
      console.log("‚úî PDF generated");
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setGeneratedPDFBlobUrl(blobUrl);

      // Download the PDF automatically as requested
      const pdfFileName = generateQuotationPdfFileName(leadObj);
      doc.save(pdfFileName);

      console.log("‚úî Opening WhatsApp...");
      const rawPhone = leadObj.whatsapp_number || leadObj.mobile || '';
      const phoneStr = typeof rawPhone === 'string' ? rawPhone : String(rawPhone);
      
      const safeCustomerName = String(leadObj.customer_name || '');
      const safeEventLocation = String(leadObj.event_location || leadObj.location || 'N/A');

      let eventDetailsStr = '';
      if (leadObj.events && leadObj.events.length > 0) {
        eventDetailsStr = leadObj.events.map((ev) => {
          const eName = ev.event_name || ev.event_type || 'Event';
          const eDate = ev.event_date || 'N/A';
          const eTime = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : '';
          return `üéâ ${eName}\nüìÖ Date: ${eDate}${eTime ? ` | Time: ${eTime}` : ''}`;
        }).join('\n\n') + '\n';
      } else {
        const safeEventType = String(leadObj.event_type || 'Event');
        const safeEventDate = String(leadObj.event_date || 'N/A');
        eventDetailsStr = `üéâ Event: ${safeEventType}\nüìÖ Event Date: ${safeEventDate}\n`;
      }

      const message = `Hello *${safeCustomerName}*,\n\n` +
        `Thank you for choosing *PhotoCrew Pictures*.\n\n` +
        `Please find your quotation details below:\n\n` +
        eventDetailsStr +
        `üìç Event Address: ${safeEventLocation}\n` +
        `üí∞ Final Amount: ‚Çπ${finalAmt.toLocaleString('en-IN')}\n\n` +
        `Thank you.\nPhotoCrew Pictures`;

      const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
      if (!cleanPhone) {
        showErrorHelper(
          "WhatsApp Redirect Failed",
          "Customer WhatsApp or mobile number is missing.",
          "handleSendWhatsAppQuote()",
          isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
          "Enter a valid mobile/WhatsApp number in Customer Details."
        );
        return;
      }
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');

      showToastMsg("Quotation downloaded and WhatsApp prepared!", "success");
      console.log("‚úî Process completed");
    } catch (err: any) {
      showErrorHelper(
        "WhatsApp Redirect Failed",
        err.message || "Failed to prepare WhatsApp message or generate PDF.",
        "handleSendWhatsAppQuote()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check console logs to see if there is an issue with the document template or variables.",
        err
      );
    }
  };

  const handleSendEmailQuote = async (isEdit: boolean) => {
    try {
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;
      
      const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';
      const email = leadObj.email || '';
      
      const safeCustomerName = String(leadObj.customer_name || '');
      const safeEventType = String(leadObj.event_type || 'Event');

      const subject = `Photocrew Pictures - Custom Quotation Details`;
      const body = `Dear ${safeCustomerName},\n\n` +
        `Thank you for reach out to us! We are pleased to provide the custom quotation details for your upcoming ${safeEventType} shoot.\n\n` +
        `Selected Package: ${pkgNames}\n` +
        `Package Base Price: Rs. ${basePkgSum.toLocaleString('en-IN')}\n` +
        `Discount Applied: Rs. ${(quoteDiscount || 0).toLocaleString('en-IN')}\n` +
        `Final Quotation Amount: Rs. ${finalAmt.toLocaleString('en-IN')}\n\n` +
        `We will follow up shortly to discuss any specific adjustments you might need.\n\n` +
        `Warm regards,\n` +
        `The Photocrew Pictures Team\n` +
        `https://www.photocrewpictures.com/`;

      window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    } catch (err: any) {
      showToastMsg("Failed to open email client.", "error");
    }
  };

  const renderQuotationAndStep4Section = (isEdit: boolean) => {
    const activePkgs = getSelectedPkgsInfo(isEdit);
    const basePkgSum = dynamicBaseSum;
    const finalAmt = dynamicFinalAmt;
    const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';

    const budgetValue = isEdit ? wizardLeadData.budget : createForm.budget;
    const setBudget = (val: number | '') => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, budget: val === '' ? 0 : val }));
      } else {
        setCreateForm(prev => ({ ...prev, budget: val }));
      }
    };

    const remarksValue = isEdit ? wizardLeadData.remarks : createForm.remarks;
    const setRemarks = (val: string) => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, remarks: val }));
      } else {
        setCreateForm(prev => ({ ...prev, remarks: val }));
      }
    };

    const notesValue = isEdit ? wizardLeadData.notes : internalNotes;
    const setNotes = (val: string) => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, notes: val }));
      } else {
        setInternalNotes(val);
      }
    };

    const followUpValue = isEdit ? wizardLeadData.next_follow_up_date : followUpDate;
    const setFollowUp = (val: string) => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, next_follow_up_date: val }));
      } else {
        setFollowUpDate(val);
      }
    };

    const leadValue = isEdit ? wizardLeadData.lead_value : createForm.lead_value;
    const setLeadValue = (val: number | '') => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, lead_value: val === '' ? 0 : val }));
      } else {
        setCreateForm(prev => ({ ...prev, lead_value: val }));
      }
    };

    const leadScore = isEdit ? wizardLeadData.lead_score : createForm.lead_score;
    const setLeadScore = (val: number | '') => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, lead_score: val === '' ? 0 : val }));
      } else {
        setCreateForm(prev => ({ ...prev, lead_score: val }));
      }
    };

    return (
      <div className="space-y-6">
        {/* Quotation Details */}
        <div className="bg-slate-900/50 border border-slate-805/40 rounded-xl p-4.5 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <span>üìã</span> Quotation Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Package Amount (Editable Package Base Price) */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5 font-mono">
                <span>üí∞</span> Package Base Price (‚Çπ)
              </label>
              <input
                type="number"
                id={isEdit ? "input_section2_package_base_price" : "create_section2_package_base_price"}
                value={wizardLeadData.package_cost !== undefined && wizardLeadData.package_cost !== null ? wizardLeadData.package_cost : (basePkgSum || 0)}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  const numVal = rawVal === '' ? '' : rawVal;
                  const parsedNum = rawVal === '' ? 0 : Number(numVal);
                  const currentPkg = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || 'Custom Package';
                  setWizardLeadData(prev => ({
                    ...prev,
                    package_cost: numVal,
                    package_price: numVal,
                    budget: parsedNum,
                    final_quoted_amount: parsedNum
                  }));
                  if (currentPkg) {
                    setPkgPrices(prev => ({ ...prev, [currentPkg]: parsedNum }));
                  }
                  saveStep3DataRealtime(editableInclusions, editableDeliverables, currentPkg, parsedNum);
                }}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg py-2 px-3 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all"
              />
            </div>

            {/* Discount */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Quotation Discount (‚Çπ)
              </label>
              <input
                type="number"
                value={quoteDiscount || ''}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  const discNum = rawVal === '' ? 0 : Number(rawVal);
                  setQuoteDiscount(rawVal === '' ? 0 : discNum);
                  const currentPkg = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || 'Custom Package';
                  saveStep3DataRealtime(editableInclusions, editableDeliverables, currentPkg, undefined, discNum, quoteAdditional);
                }}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />
            </div>

            {/* Additional Services Cost - Hidden per user request */}
            <div className="hidden">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Additional Services Cost (‚Çπ)
              </label>
              <input
                type="number"
                value={quoteAdditional || ''}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  const addNum = rawVal === '' ? 0 : Number(rawVal);
                  setQuoteAdditional(rawVal === '' ? 0 : addNum);
                  const currentPkg = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || 'Custom Package';
                  saveStep3DataRealtime(editableInclusions, editableDeliverables, currentPkg, undefined, quoteDiscount, addNum);
                }}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />
            </div>

            {/* Extra Charges */}

          </div>

          {/* Final Calculated Amount Badge */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between shadow-inner mt-2">
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide font-mono">Final Quotation Amount</p>
              <p className="text-[9px] text-slate-500 font-mono">Formula: Base Price (‚Çπ{basePkgSum}) - Disc (‚Çπ{quoteDiscount || 0})</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-amber-500 font-mono">
                ‚Çπ{finalAmt.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action buttons directly under Quotation Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-800/60">
            {/* Download PDF */}
            <button
              type="button"
              onClick={() => handleDownloadQuotePDF(isEdit)}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-lg transition-all border border-red-900/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>üìÑ</span> {isSaving ? 'Processing...' : 'Download PDF Document'}
            </button>

            {/* Send WhatsApp */}
            <button
              type="button"
              onClick={() => handleSendWhatsAppQuote(isEdit)}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded-lg transition-all border border-emerald-900/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>üí¨</span> {isSaving ? 'Processing...' : 'Send Quotation via WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3Workspace = (isEdit: boolean) => {
    const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
    const rawPkgId = isEdit
      ? (wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedLead?.Select_Package_Option || '')
      : (wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedPkgIds[0] || '');
    const currentPkgId = (rawPkgId && rawPkgId.trim() !== '') ? rawPkgId : 'Custom Package';

    let selectedPkg = availablePkgs.find(p => String(p.package_id) === String(currentPkgId) || String(p.package_name) === String(currentPkgId));
    if (!selectedPkg && currentPkgId) {
      selectedPkg = {
        package_id: currentPkgId,
        package_name: (currentPkgId === 'custom_package' || currentPkgId === 'Custom Package') ? 'Custom Package' : `Package ${currentPkgId}`,
        price: wizardLeadData.package_cost || 0,
        deliverables: wizardLeadData.deliverables || "",
        status: "Active"
      } as any;
    }
    const selectedPkgId = selectedPkg?.package_id || 'Custom Package';
    const inclusionsList = editableInclusions[selectedPkgId] || editableInclusions['Custom Package'] || editableInclusions['custom_package'] || (Object.values(editableInclusions).find(v => Array.isArray(v) && v.length > 0) || []);
    const deliverablesList = editableDeliverables[selectedPkgId] || editableDeliverables['Custom Package'] || editableDeliverables['custom_package'] || (Object.values(editableDeliverables).find(v => Array.isArray(v) && v.length > 0) || []);
    const currentEvents = isEdit ? crmEvents : createEvents;

    return (
      <div className="space-y-4 animate-fade-in text-left">
        <div className="space-y-3.5 text-left">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono tracking-wider">Select Package Option *</label>
            {step3AutoSaveStatus === 'saving' && (
              <span className="text-[10px] text-amber-400 font-mono font-semibold animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Saving...
              </span>
            )}
            {step3AutoSaveStatus === 'saved' && (
              <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Saved ‚úì
              </span>
            )}
            {step3AutoSaveStatus === 'error' && (
              <span className="text-[10px] text-red-400 font-mono font-semibold flex items-center gap-1">
                Save failed
              </span>
            )}
          </div>
          <select
            id={isEdit ? "select_package_option" : "wizard_step3_first_field"}
            value={currentPkgId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedPkgIds([val]);
              handlePackageDropdownChange(val);
            }}
            className="w-full bg-slate-955 border border-slate-800 focus:border-indigo-500 text-white focus:outline-none rounded-lg py-1.5 px-3 text-xs cursor-pointer"
          >
              <option value="Custom Package">Custom Package</option>
              {(() => {
                const activePkgs = availablePkgs.filter(p => {
                  if (p.status && p.status.toLowerCase() !== 'active') return false;
                  const pId = String(p.package_id || '');
                  const pName = String(p.package_name || '');
                  if (pId === 'Custom Package' || pId === 'custom_package' || pName === 'Custom Package') return false;
                  if (pName.toLowerCase().includes('legacy') || pName.toLowerCase().includes('‚Çπ0')) return false;
                  return true;
                });
                if (currentPkgId && currentPkgId !== 'Custom Package' && currentPkgId !== 'custom_package' && !activePkgs.some(p => String(p.package_id) === String(currentPkgId))) {
                  const matched = availablePkgs.find(p => String(p.package_id) === String(currentPkgId));
                  if (matched && !String(matched.package_name || '').toLowerCase().includes('legacy')) {
                    activePkgs.unshift(matched);
                  }
                }
                return activePkgs.map((pkg) => (
                  <option key={pkg.package_id} value={pkg.package_id}>
                    {pkg.package_name} (‚Çπ{Number(pkg.price).toLocaleString('en-IN')})
                  </option>
                ));
              })()}
            </select>
          </div>

          {/* Sales Executive Details */}
          <div className="hidden bg-slate-900/50 border border-slate-805/40 rounded-lg p-3 space-y-2.5 shadow-sm mt-3">
            <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <span>üë§</span> Sales Executive Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Sales Staff Name *
                </label>
                <input
                  id={isEdit ? "input_sales_staff_name" : "wizard_sales_staff_name"}
                  type="text"
                  required
                  value={salesStaffName}
                  onChange={(e) => setSalesStaffName(e.target.value)}
                  placeholder="E.g., Jane Doe"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-sans transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Sales Staff Mobile Number *
                </label>
                <input
                  id={isEdit ? "input_sales_staff_mobile" : "wizard_sales_staff_mobile"}
                  type="text"
                  required
                  value={salesStaffMobile}
                  onChange={(e) => setSalesStaffMobile(e.target.value)}
                  placeholder="E.g., 9876543210"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-mono transition-all"
                />
              </div>
            </div>
          </div>

          {/* Single Package Base Price (‚Çπ) Field (Hidden visually per request, keeping value intact internally) */}
          <div className="hidden" style={{ display: 'none' }}>
            <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
              <span>üí∞</span> Package Base Price (‚Çπ) *
            </label>
            <input
              type="number"
              value={wizardLeadData.package_cost !== undefined && wizardLeadData.package_cost !== null ? wizardLeadData.package_cost : (selectedPkg?.price || '')}
              onChange={(e) => {
                const val = e.target.value;
                const numVal = val === '' ? 0 : Number(val);
                setWizardLeadData(prev => ({
                  ...prev,
                  package_cost: val,
                  package_price: numVal,
                  budget: numVal,
                  final_quoted_amount: numVal
                }));
                saveStep3DataRealtime(editableInclusions, editableDeliverables, wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option, numVal);
              }}
              placeholder="Enter package base price..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-amber-300 font-mono font-bold"
              required
            />
          </div>

          {/* Event-Wise Configuration or Single Configuration */}
          <div>
            {currentEvents && currentEvents.length > 0 ? (
              currentEvents.map((event, eventIdx) => {
                const eventKey = `${selectedPkgId}_${event.id}`;
                const nameKey = `${selectedPkgId}_${event.event_name || event.event_type || 'Unnamed Event'}`;
                const customKey = `Custom Package_${event.id}`;
                const customNameKey = `Custom Package_${event.event_name || event.event_type || 'Unnamed Event'}`;
                const customLowerKey = `custom_package_${event.id}`;
                const customLowerNameKey = `custom_package_${event.event_name || event.event_type || 'Unnamed Event'}`;

                const eventInclusions = editableInclusions[eventKey] !== undefined
                  ? editableInclusions[eventKey]
                  : (editableInclusions[nameKey] !== undefined
                    ? editableInclusions[nameKey]
                    : (editableInclusions[customKey] !== undefined
                      ? editableInclusions[customKey]
                      : (editableInclusions[customNameKey] !== undefined
                        ? editableInclusions[customNameKey]
                        : (editableInclusions[customLowerKey] !== undefined
                          ? editableInclusions[customLowerKey]
                          : (editableInclusions[customLowerNameKey] !== undefined
                            ? editableInclusions[customLowerNameKey]
                            : (currentEvents.length === 1 ? inclusionsList : []))))));

                const eventDeliverables = editableDeliverables[eventKey] !== undefined
                  ? editableDeliverables[eventKey]
                  : (editableDeliverables[nameKey] !== undefined
                    ? editableDeliverables[nameKey]
                    : (editableDeliverables[customKey] !== undefined
                      ? editableDeliverables[customKey]
                      : (editableDeliverables[customNameKey] !== undefined
                        ? editableDeliverables[customNameKey]
                        : (editableDeliverables[customLowerKey] !== undefined
                          ? editableDeliverables[customLowerKey]
                          : (editableDeliverables[customLowerNameKey] !== undefined
                            ? editableDeliverables[customLowerNameKey]
                            : (currentEvents.length === 1 ? deliverablesList : []))))));

                const startDateStr = formatDDMMYYYY(event.event_start_date || event.event_date);
                const endDateRaw = event.event_end_date || (event as any).Event_End_Date || '';
                const endDateStr = endDateRaw ? formatDDMMYYYY(endDateRaw) : 'N/A';
                const startTimeStr = event.event_start_time ? convertTo12Hour(event.event_start_time) : 'N/A';
                const endTimeStr = event.event_end_time ? convertTo12Hour(event.event_end_time) : 'N/A';
                const guestPaxVal = event.guest_pax !== '' && event.guest_pax !== null && event.guest_pax !== undefined ? event.guest_pax : 'N/A';

                return (
                  <div key={event.id || eventIdx} className="bg-slate-900/25 border border-slate-800/60 p-4 rounded-xl space-y-4 mt-3 mb-4">
                    {/* VERY SMALL COMPACT EVENT SUMMARY */}
                    <div className="bg-slate-950/60 border border-slate-800/70 p-2.5 sm:p-3 rounded-lg text-left font-mono">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-100 font-sans">
                          {event.event_name || `Event ${eventIdx + 1}`}
                        </span>
                        {event.event_type && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold border border-slate-700">
                            [{event.event_type}]
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 leading-tight flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>
                          Start: <span className="text-slate-100 font-semibold">{startDateStr}{startTimeStr !== 'N/A' ? ` | ${startTimeStr}` : ''}</span>
                        </span>
                        {(endDateRaw || endTimeStr !== 'N/A') && (
                          <>
                            <span className="text-slate-500">‚Ä¢</span>
                            <span>
                              End: <span className="text-slate-100 font-semibold">{endDateStr !== 'N/A' ? endDateStr : startDateStr}{endTimeStr !== 'N/A' ? ` | ${endTimeStr}` : ''}</span>
                            </span>
                          </>
                        )}
                        <span className="text-slate-500">‚Ä¢</span>
                        <span>
                          Guest Pax: <span className="text-slate-100 font-semibold">{guestPaxVal}</span>
                        </span>
                      </div>
                    </div>

                    {/* Team Members Included */}
                    <div>
                      <div className="mb-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Team Members Included</label>
                      </div>
                      {eventInclusions.length === 0 ? (
                        <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                          <p className="text-xs text-zinc-500 italic">No team members added yet.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const currentList = [...eventInclusions];
                              currentList.push("");
                              const updated = {
                                ...editableInclusions,
                                [eventKey]: currentList,
                                [nameKey]: currentList
                              };
                              setEditableInclusions(updated);
                              saveStep3DataRealtime(updated, editableDeliverables);
                            }}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-all cursor-pointer"
                          >
                            + Add Member
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {eventInclusions.map((item, idx) => (
                            <CompactQtyItemRow
                              key={idx}
                              value={item}
                              options={activeMasterRoles}
                              placeholder="Type or select Role / Team Member..."
                              accentColor="indigo"
                              onChange={(newVal) => {
                                const currentList = [...eventInclusions];
                                currentList[idx] = newVal;
                                const updated = {
                                  ...editableInclusions,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableInclusions(updated);
                                saveStep3DataRealtime(updated, editableDeliverables);
                              }}
                              onDelete={() => {
                                const currentList = [...eventInclusions];
                                currentList.splice(idx, 1);
                                const updated = {
                                  ...editableInclusions,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableInclusions(updated);
                                saveStep3DataRealtime(updated, editableDeliverables);
                              }}
                            />
                          ))}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentList = [...eventInclusions];
                                currentList.push("");
                                const updated = {
                                  ...editableInclusions,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableInclusions(updated);
                                saveStep3DataRealtime(updated, editableDeliverables);
                              }}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-all cursor-pointer"
                            >
                              + Add Member
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Deliverables Description / Base Package Deliverables */}
                    <div>
                      <div className="mb-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Deliverables Description / Base Package Deliverables</label>
                      </div>
                      {eventDeliverables.length === 0 ? (
                        <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                          <p className="text-xs text-zinc-500 italic">No deliverables added yet.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const currentList = [...eventDeliverables];
                              currentList.push("");
                              const updated = {
                                ...editableDeliverables,
                                [eventKey]: currentList,
                                [nameKey]: currentList
                              };
                              setEditableDeliverables(updated);
                              saveStep3DataRealtime(editableInclusions, updated);
                            }}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold font-mono bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                          >
                            + Add Deliverable
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {eventDeliverables.map((item, idx) => (
                            <CompactQtyItemRow
                              key={idx}
                              value={item}
                              options={activeMasterDeliverables}
                              placeholder="Type or select Deliverable..."
                              accentColor="emerald"
                              onChange={(newVal) => {
                                const currentList = [...eventDeliverables];
                                currentList[idx] = newVal;
                                const updated = {
                                  ...editableDeliverables,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableDeliverables(updated);
                                saveStep3DataRealtime(editableInclusions, updated);
                              }}
                              onDelete={() => {
                                const currentList = [...eventDeliverables];
                                currentList.splice(idx, 1);
                                const updated = {
                                  ...editableDeliverables,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableDeliverables(updated);
                                saveStep3DataRealtime(editableInclusions, updated);
                              }}
                            />
                          ))}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentList = [...eventDeliverables];
                                currentList.push("");
                                const updated = {
                                  ...editableDeliverables,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableDeliverables(updated);
                                saveStep3DataRealtime(editableInclusions, updated);
                              }}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold font-mono bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                            >
                              + Add Deliverable
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-slate-900/25 border border-slate-800/60 p-4 rounded-xl space-y-4 mt-3 mb-4">
                {/* Single Team Members Included */}
                <div>
                  <div className="mb-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Team Members Included</label>
                  </div>
                  {inclusionsList.length === 0 ? (
                    <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                      <p className="text-xs text-zinc-500 italic">No team members added yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          const currentList = [...inclusionsList];
                          currentList.push("");
                          const updated = {
                            ...editableInclusions,
                            [selectedPkgId]: currentList
                          };
                          setEditableInclusions(updated);
                          saveStep3DataRealtime(updated, editableDeliverables);
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-all cursor-pointer"
                      >
                        + Add Member
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {inclusionsList.map((item, idx) => (
                        <CompactQtyItemRow
                          key={idx}
                          value={item}
                          options={activeMasterRoles}
                          placeholder="Type or select Role / Team Member..."
                          accentColor="indigo"
                          onChange={(newVal) => {
                            const currentList = [...inclusionsList];
                            currentList[idx] = newVal;
                            const updated = {
                              ...editableInclusions,
                              [selectedPkgId]: currentList
                            };
                            setEditableInclusions(updated);
                            saveStep3DataRealtime(updated, editableDeliverables);
                          }}
                          onDelete={() => {
                            const currentList = [...inclusionsList];
                            currentList.splice(idx, 1);
                            const updated = {
                              ...editableInclusions,
                              [selectedPkgId]: currentList
                            };
                            setEditableInclusions(updated);
                            saveStep3DataRealtime(updated, editableDeliverables);
                          }}
                        />
                      ))}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const currentList = [...inclusionsList];
                            currentList.push("");
                            const updated = {
                              ...editableInclusions,
                              [selectedPkgId]: currentList
                            };
                            setEditableInclusions(updated);
                            saveStep3DataRealtime(updated, editableDeliverables);
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-all cursor-pointer"
                        >
                          + Add Member
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Single Deliverables */}
                <div>
                  <div className="mb-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Deliverables Description / Base Package Deliverables</label>
                  </div>
                  {deliverablesList.length === 0 ? (
                    <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                      <p className="text-xs text-zinc-500 italic">No deliverables added yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          const currentList = [...deliverablesList];
                          currentList.push("");
                          const updated = {
                            ...editableDeliverables,
                            [selectedPkgId]: currentList
                          };
                          setEditableDeliverables(updated);
                          saveStep3DataRealtime(editableInclusions, updated);
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold font-mono bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                      >
                        + Add Deliverable
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {deliverablesList.map((item, idx) => (
                        <CompactQtyItemRow
                          key={idx}
                          value={item}
                          options={activeMasterDeliverables}
                          placeholder="Type or select Deliverable..."
                          accentColor="emerald"
                          onChange={(newVal) => {
                            const currentList = [...deliverablesList];
                            currentList[idx] = newVal;
                            const updated = {
                              ...editableDeliverables,
                              [selectedPkgId]: currentList
                            };
                            setEditableDeliverables(updated);
                            saveStep3DataRealtime(editableInclusions, updated);
                          }}
                          onDelete={() => {
                            const currentList = [...deliverablesList];
                            currentList.splice(idx, 1);
                            const updated = {
                              ...editableDeliverables,
                              [selectedPkgId]: currentList
                            };
                            setEditableDeliverables(updated);
                            saveStep3DataRealtime(editableInclusions, updated);
                          }}
                        />
                      ))}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const currentList = [...deliverablesList];
                            currentList.push("");
                            const updated = {
                              ...editableDeliverables,
                              [selectedPkgId]: currentList
                            };
                            setEditableDeliverables(updated);
                            saveStep3DataRealtime(editableInclusions, updated);
                          }}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold font-mono bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                        >
                          + Add Deliverable
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        <div className="mt-4 flex justify-end pb-2">
          <button
            type="button"
            onClick={handleSavePackageOnly}
            disabled={isSaving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg shadow transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving Package...' : 'Save Package'}
          </button>
        </div>

        {renderQuotationAndStep4Section(isEdit)}
      </div>
    );
  };

  useEffect(() => {
    let isMounted = true;

    const fetchReportingData = async () => {
       if (!selectedLead?.lead_id) return;
       try {
          if (!supabaseClient) return;
          const { data, error } = await supabaseClient
             .from('order_event_reporting')
             .select('*')
             .eq('lead_id', selectedLead.lead_id);
          
          if (error) {
             console.error("Failed to load order_event_reporting data", error);
             return;
          }

          if (isMounted && data && data.length > 0) {
             const first = data[0];
             setWizardLeadData(prev => ({
                ...prev,
                confirmed_event_date: first.confirmed_event_date || prev.confirmed_event_date,
                confirmed_event_time: first.confirmed_event_time || prev.confirmed_event_time,
                final_amount: first.contract_final_amount || prev.final_amount,
                advance_received: first.advance_payment_received || prev.advance_received,
             }));

             setCrmEvents(prev => prev.map(ev => {
                const rep = data.find(r => r.event_id === ev.id);
                if (rep) {
                   return {
                      ...ev,
                      reporting_date: rep.reporting_date || ev.reporting_date,
                      reporting_time: rep.reporting_time || ev.reporting_time
                   };
                }
                return ev;
             }));
          }
       } catch (err) {
          console.error("Error loading reporting data", err);
       }
    };

    fetchReportingData();
    
    return () => { isMounted = false; };
  }, [selectedLead?.lead_id, supabaseClient]);

  // Sync wizardLeadData.advance_received and wizardLeadData.final_amount with latest payment and order confirmation data
  React.useEffect(() => {
    if (!selectedLead?.lead_id) return;
    const linkedOrder = orders?.find(o => o.lead_id === selectedLead.lead_id);
    const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
    
    if (linkedOrder || linkedPayment) {
      setWizardLeadData(prev => {
        const latestAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : prev.advance_received);
        const latestFinalAmount = linkedOrder ? (linkedOrder.quotation_amount || 0) : prev.final_amount;
        
        if (prev.advance_received !== latestAdvance || prev.final_amount !== latestFinalAmount) {
          return {
            ...prev,
            advance_received: latestAdvance,
            final_amount: latestFinalAmount
          };
        }
        return prev;
      });
    }
  }, [selectedLead?.lead_id, orders, payments]);

  // Handle lead select
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.role === 'sales' || e.detail?.role === 'owner' || !e.detail?.role) {
        const leadId = e.detail?.leadId || e.detail?.lead_id;
        const orderId = e.detail?.orderId || e.detail?.order_id;
        const targetLead = leads.find(
          l => (leadId && (l.lead_id === leadId || l.order_id === leadId)) ||
               (orderId && (l.lead_id === orderId || l.order_id === orderId)) ||
               (l.events && l.events.some(ev => ev.id === leadId || ev.id === orderId))
        );
        if (targetLead) {
          handleSelectLead(targetLead);
        }
      }
    };
    window.addEventListener('calendar-action-click-deferred', handler);
    window.addEventListener('calendar-action-click', handler);
    return () => {
      window.removeEventListener('calendar-action-click-deferred', handler);
      window.removeEventListener('calendar-action-click', handler);
    };
  }, [leads]);
  
  const handleSelectLead = async (lead: Lead, targetStep?: number) => {
    let fullLead = lead;
    if (supabaseClient && lead.lead_id && lead.lead_id !== 'DRAFT-LEAD') {
      try {
        const { data: dbLead, error: dbLeadErr } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', lead.lead_id)
          .maybeSingle();
        
        if (!dbLeadErr && dbLead) {
          const directLostReason = dbLead.Lost_Reason || dbLead.lost_reason || lead.Lost_Reason || (lead as any).lost_reason || '';
          const directLostNotes = dbLead.Lost_Notes || dbLead.lost_notes || lead.Lost_Notes || (lead as any).lost_notes || '';
          fullLead = {
            ...lead,
            ...dbLead,
            Lost_Reason: directLostReason,
            lost_reason: directLostReason,
            Lost_Notes: directLostNotes,
            lost_notes: directLostNotes
          };
        }
      } catch (err) {
        console.warn("Failed to fetch full lead details on select", err);
      }
    }

    // If lost lead, ensure clean reason and notes without dirty metadata
    if (['Lost Lead', 'Lead Lost', 'Lost'].includes(fullLead.status || (fullLead as any).current_status || '')) {
      const { reason: cleanR, notes: cleanN } = getStrictLostReasonAndNotes(fullLead);
      fullLead.Lost_Reason = cleanR;
      fullLead.lost_reason = cleanR;
      fullLead.Lost_Notes = cleanN;
      fullLead.lost_notes = cleanN;
    }

    setSelectedLead(fullLead);
    setCrmEvents(fullLead.events || []);

    // Always fetch fresh events to ensure no cached EV- IDs are used
    let eventsForCheck = fullLead.events || [];
    if (supabaseClient && fullLead.lead_id && fullLead.lead_id !== 'DRAFT-LEAD') {
      try {
        const { data: freshEvents, error } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', fullLead.lead_id)
          .order('created_at', { ascending: true });
        
        if (!error && freshEvents && freshEvents.length > 0) {
          setCrmEvents(freshEvents as LeadEvent[]);
          eventsForCheck = freshEvents as LeadEvent[];
          setSelectedLead(prev => prev ? { ...prev, events: freshEvents as LeadEvent[] } : prev);
        }
      } catch (err) {
        console.warn("Failed to load fresh events on selection", err);
      }
    }

    setGeneratedPDFBlobUrl('');
    setActiveQuoteNum('');
    setQuoteDiscount(0);
    setQuoteAdditional(0);
    // Explicitly reset only when switching to a different lead ID
    if (!selectedLead || selectedLead.lead_id !== lead.lead_id) {
      setEditableInclusions({});
      setEditableDeliverables({});
      lastLoadedLeadIdRef.current = null;
    }
    // Clean and set Sales Executive Details (isolated from Operations/Production staff on events)
    const initialSalesStaffName = getCleanSalesStaffName(lead.sales_staff_name, lead);
    const initialSalesStaffMobile = getCleanSalesStaffMobile(lead.sales_staff_mobile, lead);
    setSalesStaffName(initialSalesStaffName);
    setSalesStaffMobile(initialSalesStaffMobile);

    const activePackages = (leadPackages || []).filter(lp => lp.lead_id === lead.lead_id);
    const primaryLP = activePackages[0];
    
    // Find the latest quotation for this lead if it exists
    const latestQuote = [...(quotations || [])]
      .filter(q => q.lead_id === lead.lead_id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];

    // Determine the target CRM step based on persisted data and status
    const hasQuotationOrPackage = !!(
      latestQuote ||
      primaryLP?.package_id ||
      (fullLead.Select_Package_Option && String(fullLead.Select_Package_Option).trim() !== '') ||
      ['Quotation Sent', 'Negotiation', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed', 'Lost Lead'].includes(fullLead.status || '') ||
      ['Quotation Sent', 'Negotiation', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed', 'Lost Lead'].includes((fullLead as any).current_status || '')
    );

    const hasCustomerDetails = !!(
      (fullLead.customer_name && String(fullLead.customer_name).trim() !== '') ||
      (fullLead.mobile && String(fullLead.mobile).trim() !== '')
    );

    const localSavedStep = localStorage.getItem(`crm_last_step_${lead.lead_id}`);
    const remarksMatch = fullLead.remarks?.match(/\[CRM_COMPLETED_STEP:\s*(\d+)\]/);
    const explicitStep = localSavedStep ? parseInt(localSavedStep, 10) : (remarksMatch ? parseInt(remarksMatch[1], 10) : null);

    const isConfirmedLead = ['Confirm Order', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed'].includes(fullLead.status || '') || (fullLead as any).current_status === 'Order Confirmed' || (fullLead as any).booking_status === 'Confirmed' || orders.some(o => o.lead_id === fullLead.lead_id && o.status !== 'Cancelled');
    const isUnlockedLead = unlockRequests.some(r => (r.lead_id === fullLead.lead_id || r.order_id === fullLead.lead_id || r.project_id === fullLead.lead_id) && (r.status === 'Approved' || r.request_status === 'Approved')) || unlockedRecords.some(r => r.recordId === fullLead.lead_id && r.module === 'Sales');

    // Navigation logic: always open first incomplete step. If lead is unlocked, open Step 3.
    let startStep = 1;
    if (isConfirmedLead && isUnlockedLead) {
      startStep = 3;
    } else if (explicitStep) {
      if (explicitStep >= 2) startStep = 3;
      else if (explicitStep === 1) startStep = 2;
    } else {
      if (hasQuotationOrPackage) startStep = 3;
      else if (hasCustomerDetails) startStep = 2;
      else startStep = 1;
    }

    const finalStep = targetStep || startStep;
    const completedStep = Math.max(finalStep === 3 ? 3 : (startStep === 3 ? (hasQuotationOrPackage ? 3 : 2) : startStep - 1), explicitStep || 1);
    setCrmHighestStep(completedStep);
    setCrmWizardStep(finalStep);
    
    const hasPackageAnywhere = !!(lead.Select_Package_Option || primaryLP?.package_id || latestQuote?.package_id);
    if (completedStep >= 3 || hasPackageAnywhere) {
    } else {
    }

    setQuoteDiscount(fullLead.Quotation_Discount ?? latestQuote?.discount_amount ?? 0);
    setQuoteAdditional(fullLead.Additional_Services_Cost ?? latestQuote?.additional_services_cost ?? 0);
    if (latestQuote) {
      setActiveQuoteNum(latestQuote.quotation_number || '');
      const quoteSalesName = getCleanSalesStaffName(latestQuote.sales_staff_name || lead.sales_staff_name, lead);
      const quoteSalesMobile = getCleanSalesStaffMobile(latestQuote.sales_staff_mobile || lead.sales_staff_mobile, lead);
      setSalesStaffName(quoteSalesName);
      setSalesStaffMobile(quoteSalesMobile);
    }

    const matchedPkgId = fullLead.Select_Package_Option || latestQuote?.package_id || primaryLP?.package_id || 'Custom Package';
    const matchedPkg = (packages || []).find(p => p.package_id === matchedPkgId);

    // 1. Load Deliverables
    const rawDelData = fullLead.Add_Deliverable || primaryLP?.deliverables_descriptionn || primaryLP?.editable_deliverables || fullLead.deliverables_description || latestQuote?.deliverables_description || matchedPkg?.deliverables;
    if (rawDelData) {
      const newDeliverables = parseDeliverablesJsonToRecord(rawDelData, matchedPkgId, fullLead.events || crmEvents);
      setEditableDeliverables(newDeliverables);
    } else {
      setEditableDeliverables({});
    }

    // 2. Load Team Members
    const rawTeamData = fullLead.Team_Members || fullLead.Team_member || (fullLead as any)?.team_members || primaryLP?.Team_Members_Included || primaryLP?.editable_inclusions || matchedPkg?.team_members;
    console.log('TEAM MEMBERS LOADED in openCRMModal', { leadId: fullLead.lead_id, Team_Members: rawTeamData });
    if (rawTeamData) {
      const newInclusions = parseTeamMembersJsonToRecord(rawTeamData, matchedPkgId, fullLead.events || crmEvents);
      setEditableInclusions(newInclusions);
    } else {
      setEditableInclusions({});
    }

    const firstEvent = fullLead.events && fullLead.events.length > 0 ? fullLead.events[0] : null;
    const evName = firstEvent?.event_name || fullLead.custom_event_name || '';
    const evShootType = firstEvent?.event_shoot_type || fullLead.desired_event_shoot_type || fullLead.shoot_type || '';
    const evDate = firstEvent?.event_date || fullLead.event_date || '';
    const evStartDate = firstEvent?.event_start_date || fullLead.event_date || '';
    const evEndDate = firstEvent?.event_end_date || (firstEvent as any)?.Event_End_Date || fullLead.Event_End_Date || '';
    const evLocation = firstEvent?.event_location || fullLead.event_location || '';
    const evGuestPax = firstEvent?.guest_pax ?? fullLead.guest_pax ?? fullLead.total_pax ?? '';
    const evStaffPax = firstEvent?.staff_pax ?? fullLead.staff_pax ?? '';
    setInternalNotes(fullLead.follow_up_notes || '');
    setFollowUpDate(fullLead.next_follow_up_date || '');
    
    const cleanPkgPrice = (fullLead.package_price && Number(fullLead.package_price) > 0)
      ? Number(fullLead.package_price)
      : ((primaryLP?.package_cost && Number(primaryLP.package_cost) > 0)
        ? Number(primaryLP.package_cost)
        : ((latestQuote?.package_price && Number(latestQuote.package_price) > 0)
          ? Number(latestQuote.package_price)
          : (fullLead.budget && Number(fullLead.budget) > 0
            ? Number(fullLead.budget)
            : (matchedPkg ? Number(matchedPkg.price) : 0))));
    
    setWizardLeadData({
      customer_name: fullLead.customer_name || '',
      mobile: fullLead.mobile ? String(fullLead.mobile) : '',
      whatsapp_number: fullLead.whatsapp_number ? String(fullLead.whatsapp_number) : (fullLead.mobile ? String(fullLead.mobile) : ''),
      email: fullLead.email || '',
      address: fullLead.address || '',
      city: latestQuote?.city || fullLead.city || '',
      state: latestQuote?.state || fullLead.state || '',
      pincode: latestQuote?.pincode || fullLead.pincode || '',
      client_residence_address: latestQuote?.client_residence_address || fullLead.client_residence_address || '',
      desired_event_shoot_type: latestQuote?.desired_event_shoot_type || fullLead.desired_event_shoot_type || '',
      // Step 2
      event_type: fullLead.event_type || '',
      custom_event_name: fullLead.custom_event_name || '',
      event_name: evName,
      event_shoot_type: evShootType,
      event_date: evDate,
      event_start_date: evStartDate,
      event_end_date: evEndDate,
      event_time: fullLead.event_time || '',
      reporting_time: fullLead.reporting_time || '',
      event_location: evLocation,
      guest_pax: evGuestPax,
      staff_pax: evStaffPax,
      lead_source: fullLead.lead_source || '',
      Specify_Custom_Lead_Source_Name: fullLead.Specify_Custom_Lead_Source_Name || '',
      shoot_type: evShootType,
      // Step 3
      selected_package_id: matchedPkgId || 'Custom Package',
      Select_Package_Option: matchedPkgId || 'Custom Package',
      package_cost: cleanPkgPrice || '',
      package_price: cleanPkgPrice || '',
      deliverables: typeof rawDelData === 'string' ? rawDelData : JSON.stringify(rawDelData || ''),
      deliverables_description: typeof rawDelData === 'string' ? rawDelData : JSON.stringify(rawDelData || ''),
      notes_special_customizations: fullLead.notes_special_customizations || latestQuote?.notes_special_customizations || primaryLP?.notes_special_customizations || '',
      notes: fullLead.remarks || '',
      // Step 4
      budget: cleanPkgPrice || fullLead.budget || latestQuote?.quotation_amount || 0,
      final_quoted_amount: fullLead.Final_Quotation_Amount ?? latestQuote?.final_amount ?? (primaryLP ? Number(primaryLP.final_amount) : 0),
      remarks: fullLead.remarks || '',
      next_follow_up_date: '',
      // Step 5
      status: fullLead.status || 'New Lead',
      // Order Confirmed Rule fields
      confirmed_event_date: fullLead.booking_date || fullLead.event_date || '',
      confirmed_event_time: fullLead.booking_time || fullLead.event_time || '',
      final_amount: (fullLead.Final_Package_Amount !== null && fullLead.Final_Package_Amount !== undefined && !isNaN(Number(fullLead.Final_Package_Amount)) && Number(fullLead.Final_Package_Amount) > 0)
        ? Number(fullLead.Final_Package_Amount)
        : (Number(fullLead.final_package_amount) || Number(fullLead.Final_Quotation_Amount) || (Number((fullLead as any).final_amount) > 0 ? Number((fullLead as any).final_amount) : 0)),
      advance_received: fullLead.advance_collected || 0,
      total_pax: fullLead.total_pax || 0,
      reference_source: fullLead.reference_source || '',
      lead_value: fullLead.lead_value || 0,
      lead_score: fullLead.lead_score || 0,
      booking_status: fullLead.booking_status || 'Pending',
    });

    setFollowUpForm({
      call_notes: lead.follow_up_notes || '',
      next_follow_up_date: '',
      status: lead.status,
      quotation_amount: 0,
      negotiation_notes: '',
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      reporting_time: lead.reporting_time || '08:00',
      advance_received: 0,
      payment_mode: 'UPI',
    });
    setConfirmForm({
      package_name: packages?.find((p) => String(p.package_id) === String(lead.Select_Package_Option))?.package_name || lead.Select_Package_Option || '',
      quotation_amount: Number(fullLead.Final_Package_Amount) || Number((fullLead as any).final_package_amount) || Number(fullLead.Final_Quotation_Amount) || Number((fullLead as any).final_amount) || (Number(wizardLeadData.final_amount) > 0 ? Number(wizardLeadData.final_amount) : 0),
      advance_received: 0,
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      payment_mode: 'UPI',
      notes: '',
    });
  };

  const handlePackageDropdownChange = (packageId: string) => {
    if (isStep3Locked) {
      showToastMsg("Quotation details are locked. Owner unlock approval required to edit.", "error");
      return;
    }

    const activeEvents = activeTab === 'create' ? createEvents : crmEvents;
    
    // Auto save by logged in sales user
    if (currentUser) {
      setSalesStaffName(currentUser.name || '');
      setSalesStaffMobile(currentUser.mobile || '');
    }
    
    const targetPkgId = packageId || 'Custom Package';
    setSelectedPkgIds([targetPkgId]);

    if (targetPkgId === 'Custom Package' || targetPkgId === 'custom_package') {
      const customPkgVal = 'Custom Package';
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: customPkgVal,
        Select_Package_Option: customPkgVal,
        package_name: 'Custom Package',
        package_cost: 0,
        package_price: 0,
        budget: 0,
        final_quoted_amount: 0,
      }));
      setPkgPrices(prev => ({ ...prev, [customPkgVal]: 0, 'custom_package': 0 }));

      const newInclusions = { ...editableInclusions };
      if (!newInclusions[customPkgVal]) newInclusions[customPkgVal] = [];
      const newDeliverables = { ...editableDeliverables };
      if (!newDeliverables[customPkgVal]) newDeliverables[customPkgVal] = [];

      if (activeEvents && activeEvents.length > 0) {
        activeEvents.forEach((ev) => {
          const k1 = `${customPkgVal}_${ev.id}`;
          const k2 = `${customPkgVal}_${ev.event_name || ev.event_type || 'Unnamed Event'}`;
          if (!newInclusions[k1]) newInclusions[k1] = [];
          if (!newInclusions[k2]) newInclusions[k2] = [];
          if (!newDeliverables[k1]) newDeliverables[k1] = [];
          if (!newDeliverables[k2]) newDeliverables[k2] = [];
        });
      }

      setEditableInclusions(newInclusions);
      setEditableDeliverables(newDeliverables);
      if (selectedLead && selectedLead.lead_id && selectedLead.lead_id !== 'DRAFT-LEAD') {
        saveStep3DataRealtime(newInclusions, newDeliverables, customPkgVal);
      }
      return;
    }

    const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
    const pkg = availablePkgs.find((p) => String(p.package_id) === String(targetPkgId) || String(p.package_name) === String(targetPkgId));
    if (pkg) {
      const pkgIdStr = String(pkg.package_id);
      const pkgPrice = Number(pkg.price) || 0;
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: pkgIdStr,
        Select_Package_Option: pkgIdStr,
        package_name: pkg.package_name,
        package_cost: pkgPrice,
        package_price: pkgPrice,
        deliverables: pkg.deliverables || '',
        notes: pkg.seasonal_offer ? `Seasonal Offer: ${pkg.seasonal_offer}` : prev.notes,
        budget: pkgPrice,
        final_quoted_amount: pkgPrice,
      }));
      
      const incList = parseTeamMembers(pkg.team_members);
      const defaultInc = incList.length > 0 ? incList : [];
      
      const delList = parseTeamMembers(pkg.deliverables);
      const defaultDel = delList.length > 0 ? delList : [];

      const newInclusions = { ...editableInclusions };
      newInclusions[pkgIdStr] = [...defaultInc];
      newInclusions[targetPkgId] = [...defaultInc];
      
      const newDeliverables = { ...editableDeliverables };
      newDeliverables[pkgIdStr] = [...defaultDel];
      newDeliverables[targetPkgId] = [...defaultDel];

      if (activeEvents && activeEvents.length > 0) {
        activeEvents.forEach((ev) => {
          newInclusions[`${pkgIdStr}_${ev.id}`] = [...defaultInc];
          newInclusions[`${pkgIdStr}_${ev.event_name || ev.event_type || 'Unnamed Event'}`] = [...defaultInc];
          newInclusions[`${targetPkgId}_${ev.id}`] = [...defaultInc];
          newInclusions[`${targetPkgId}_${ev.event_name || ev.event_type || 'Unnamed Event'}`] = [...defaultInc];
          
          newDeliverables[`${pkgIdStr}_${ev.id}`] = [...defaultDel];
          newDeliverables[`${pkgIdStr}_${ev.event_name || ev.event_type || 'Unnamed Event'}`] = [...defaultDel];
          newDeliverables[`${targetPkgId}_${ev.id}`] = [...defaultDel];
          newDeliverables[`${targetPkgId}_${ev.event_name || ev.event_type || 'Unnamed Event'}`] = [...defaultDel];
        });
      }

      setEditableInclusions(newInclusions);
      setEditableDeliverables(newDeliverables);
      if (selectedLead && selectedLead.lead_id && selectedLead.lead_id !== 'DRAFT-LEAD') {
        saveStep3DataRealtime(newInclusions, newDeliverables, pkgIdStr);
      }
    } else {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: targetPkgId,
        Select_Package_Option: targetPkgId,
      }));
      if (selectedLead && selectedLead.lead_id && selectedLead.lead_id !== 'DRAFT-LEAD') {
        saveStep3DataRealtime(editableInclusions, editableDeliverables, targetPkgId);
      }
    }
  };

  const validateStep3Data = (mode: 'package' | 'all'): boolean => {
    // Validate package selection
    const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
    if (!pkgId || pkgId.trim() === '') {
      showValidationError("select_package_option", "Please select a package before continuing.");
      showToastMsg("‚ùå Please complete all required fields before saving the package.", "error");
      return false;
    }

    // Auto-detect & attach current logged-in Sales Executive
    const effName = getEffectiveSalesStaffName();
    const effMobile = getEffectiveSalesStaffMobile();
    if (!salesStaffName || !salesStaffName.trim()) {
      setSalesStaffName(effName);
    }
    if (!salesStaffMobile || !salesStaffMobile.trim()) {
      setSalesStaffMobile(effMobile);
    }

    if (mode === 'all') {
      if (wizardLeadData.status === 'Order Confirmed') {
        if (!wizardLeadData.confirmed_event_date) {
          showValidationError("input_confirmed_event_date", "Please provide Confirmed Event Date.");
          showToastMsg("‚ùå Please complete all required fields before saving.", "error");
          return false;
        }

        if (wizardLeadData.final_amount === undefined || wizardLeadData.final_amount === null || isNaN(wizardLeadData.final_amount) || wizardLeadData.final_amount <= 0) {
          showValidationError("input_final_amount", "Please provide Final Amount.");
          showToastMsg("‚ùå Please complete all required fields before saving.", "error");
          return false;
        }
        if (wizardLeadData.advance_received === undefined || wizardLeadData.advance_received === null || isNaN(wizardLeadData.advance_received)) {
          showValidationError("input_advance_received", "Please provide Advance Payment Received.");
          showToastMsg("‚ùå Please complete all required fields before saving.", "error");
          return false;
        }

        if (crmEvents && crmEvents.length > 0) {
          for (const ev of crmEvents) {
            const rDate = ev.reporting_date || ev.event_date || wizardLeadData.confirmed_event_date;
            if (!rDate) {
              showValidationError(`reporting_date_${ev.id}`, "Reporting Date is required.");
              showToastMsg("‚ùå Please complete all required fields before saving.", "error");
              return false;
            }
            if (!ev.reporting_time) {
              showValidationError(`reporting_time_${ev.id}`, "Reporting Time is required.");
              showToastMsg("‚ùå Please complete all required fields before saving.", "error");
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  const completeApprovedUnlockRequest = async (leadId: string) => {
    if (!leadId) return;
    console.log("[DEBUG completeApprovedUnlockRequest] Executing completeApprovedUnlockRequest for leadId:", leadId);
    try {
      const linkedOrder = (orders || []).find(o => o.lead_id === leadId);
      const orderId = linkedOrder?.order_id || (selectedLead as any)?.order_id;
      const nowIso = new Date().toISOString();

      // 1. Update lead record in Supabase & context state: set quotation_locked = true
      try {
        await updateLead(leadId, { quotation_locked: true, updated_at: nowIso } as any);
        console.log("[DEBUG completeApprovedUnlockRequest] Successfully updated lead quotation_locked = true via updateLead for", leadId);
      } catch (lErr: any) {
        console.warn("[DEBUG completeApprovedUnlockRequest] updateLead warning:", lErr?.message || lErr);
      }

      if (selectedLead && selectedLead.lead_id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, quotation_locked: true } : prev);
      }

      // 2. Update unlock_requests table status to Completed
      if (supabaseClient) {
        try {
          const { data: allReqs } = await supabaseClient
            .from('unlock_requests')
            .select('*');

          if (allReqs && allReqs.length > 0) {
            const matchingReqs = allReqs.filter((r: any) => {
              const matchesLead = r.lead_id === leadId || r.order_id === leadId || r.project_id === leadId;
              const matchesOrder = orderId && (r.order_id === orderId || r.lead_id === orderId);
              return matchesLead || matchesOrder;
            });

            for (const req of matchingReqs) {
              const reqKeyCol = req.id ? 'id' : (req.request_id ? 'request_id' : 'lead_id');
              const reqKeyVal = req.id || req.request_id || req.lead_id;

              await supabaseClient
                .from('unlock_requests')
                .update({
                  request_status: 'Completed',
                  status: 'Completed',
                  completed_at: nowIso,
                  edited_at: nowIso,
                  updated_at: nowIso
                })
                .eq(reqKeyCol, reqKeyVal);
            }
          }

          // Proxy call fallback
          await fetch('/api/db/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table: 'unlock_requests',
              matchColumn: 'lead_id',
              matchValue: leadId,
              updates: { request_status: 'Completed', status: 'Completed', completed_at: nowIso, updated_at: nowIso }
            })
          }).catch(() => {});

          if (orderId && orderId !== leadId) {
            await fetch('/api/db/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                table: 'unlock_requests',
                matchColumn: 'order_id',
                matchValue: orderId,
                updates: { request_status: 'Completed', status: 'Completed', completed_at: nowIso, updated_at: nowIso }
              })
            }).catch(() => {});
          }
        } catch (dbErr: any) {
          console.warn("[DEBUG completeApprovedUnlockRequest] unlock_requests DB update warning:", dbErr?.message || dbErr);
        }
      }

      // 3. Update local React unlockRequests state
      setUnlockRequests(prev => Array.isArray(prev) ? prev.map(r => {
        const matchesLead = r.lead_id === leadId || r.order_id === leadId || r.project_id === leadId;
        const matchesOrder = orderId && (r.order_id === orderId || r.lead_id === orderId);
        if (matchesLead || matchesOrder) {
          return {
            ...r,
            request_status: 'Completed',
            status: 'Completed',
            completed_at: nowIso,
            edited_at: nowIso
          };
        }
        return r;
      }) : []);

      // Re-fetch unlock_requests from DB to stay synchronized
      if (supabaseClient) {
        const { data } = await supabaseClient.from('unlock_requests').select('*');
        if (data) {
          setUnlockRequests(data.map((r: any) => ({
            ...r,
            request_status: r.request_status || r.status || 'Pending',
            status: r.request_status || r.status || 'Pending',
            reason: r.request_reason || r.reason || '',
            sales_staff_name: r.requested_by_name || r.sales_staff_name || '',
            sales_staff_id: r.requested_by_user_id || r.sales_staff_id || ''
          })));
        }
      }

    } catch (err: any) {
      console.error("[DEBUG completeApprovedUnlockRequest] Exception during unlock completion:", err?.message || err);
    }
  };

  const handleSavePackageOnly = async () => {
    if (isSaving) return;
    if (isStep3Locked) {
      showToastMsg("Quotation details are locked. Owner unlock approval required to edit.", "error");
      return;
    }
    const targetLeadId = selectedLead?.lead_id || createdLeadId;
    setIsSaving(true);
    try {
      // 1. Perform unified validation
      if (!validateStep3Data('package')) {
        setIsSaving(false);
        return;
      }

      const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedLead?.Select_Package_Option || 'Custom Package';
      const currentEvents = selectedLead ? crmEvents : createEvents;

      const { teamMembersJson, deliverablesJson, flatTeamMembers, teamMembersText, deliverablesText } = buildStep3EventPayloads(
        pkgId,
        currentEvents,
        editableInclusions,
        editableDeliverables
      );

      // 3. Update the lead record in Supabase with latest Step 3 package / pricing / staff info
      const updatedRemarks = appendCompletedStep(wizardLeadData.notes || '', 3);
      
      const updatedEvents = currentEvents.map(ev => ({
        ...ev,
        assigned_staff_names: ev.assigned_staff_names || '',
        assigned_staff_mobiles: ev.assigned_staff_mobiles || ''
      }));

      const cleanPkgCost = wizardLeadData.package_cost !== "" && wizardLeadData.package_cost != null && !isNaN(Number(wizardLeadData.package_cost))
        ? Number(wizardLeadData.package_cost)
        : (wizardLeadData.package_price !== "" && wizardLeadData.package_price != null && !isNaN(Number(wizardLeadData.package_price))
          ? Number(wizardLeadData.package_price)
          : (wizardLeadData.budget ? Number(wizardLeadData.budget) : (selectedLead?.package_price || selectedLead?.budget || null)));

      const cleanDiscount = quoteDiscount === "" || quoteDiscount == null || isNaN(Number(quoteDiscount)) ? null : Number(quoteDiscount);
      const cleanAdditional = quoteAdditional === "" || quoteAdditional == null || isNaN(Number(quoteAdditional)) ? null : Number(quoteAdditional);
      const cleanFinalAmt = Math.max(0, (cleanPkgCost || 0) + (cleanAdditional || 0) - (cleanDiscount || 0));

      const effectiveSalesName = getEffectiveSalesStaffName();
      const effectiveSalesMobile = getEffectiveSalesStaffMobile();

      const safeTeamMembersText = teamMembersText;
      const safeDeliverablesText = deliverablesText;

      if (targetLeadId && targetLeadId !== 'DRAFT-LEAD' && supabaseClient) {
        console.log('TEAM MEMBERS SAVE in handleSavePackageOnly', { leadId: targetLeadId, teamMembers: flatTeamMembers, serialized: safeTeamMembersText });
        
        try {
          const { data: dbResult, error: dbError } = await supabaseClient
            .from('leads')
            .update({
              budget: cleanPkgCost,
              package_price: cleanPkgCost,
              deliverables_description: safeDeliverablesText,
              Team_member: safeTeamMembersText,
              Team_Members: safeTeamMembersText,
              team_members: safeTeamMembersText,
              notes_special_customizations: wizardLeadData.notes,
              remarks: updatedRemarks,
              Select_Package_Option: pkgId,
              sales_staff_name: effectiveSalesName,
              sales_staff_mobile: effectiveSalesMobile,
              Quotation_Discount: cleanDiscount,
              Additional_Services_Cost: cleanAdditional,
              Final_Quotation_Amount: cleanFinalAmt,
              Final_Package_Amount: cleanFinalAmt,
              events: updatedEvents
            })
            .eq('lead_id', targetLeadId)
            .select('*');
          console.log('TEAM MEMBERS DB RESULT handleSavePackageOnly', { data: dbResult, error: dbError });
        } catch (dbErr) {
          console.warn("Direct Supabase update warning in handleSavePackageOnly:", dbErr);
        }

        await updateLead(targetLeadId, {
          budget: cleanPkgCost,
          package_price: cleanPkgCost,
          deliverables_description: safeDeliverablesText,
          Team_member: safeTeamMembersText,
          Team_Members: safeTeamMembersText,
          team_members: safeTeamMembersText,
          notes_special_customizations: wizardLeadData.notes,
          remarks: updatedRemarks,
          Select_Package_Option: pkgId,
          sales_staff_name: effectiveSalesName,
          sales_staff_mobile: effectiveSalesMobile,
          Quotation_Discount: cleanDiscount,
          Additional_Services_Cost: cleanAdditional,
          Final_Quotation_Amount: cleanFinalAmt,
          Final_Package_Amount: cleanFinalAmt,
          final_package_amount: cleanFinalAmt,
          _explicit_step3_save: true,
          events: updatedEvents
        });

        // Also upsert to lead_packages table so that Step 3 reloads from lead_packages perfectly
        try {
          // If we safely retained the old lead data, we should also try to retain the old json data
          // if the new one is empty. We can check if teamMembersText was '[]' but we saved safeTeamMembersText
          const isTeamEmpty = teamMembersText === '[]' || teamMembersText === '';
          const isDelEmpty = deliverablesText === '[]' || deliverablesText === '';
          
          const packagePayload = {
            lead_id: targetLeadId,
            package_id: pkgId,
            package_name: wizardLeadData.package_name || (pkgId === 'Custom Package' || pkgId === 'custom_package' ? 'Custom Package' : `Package ${pkgId}`),
            quantity: 1,
            total_amount: cleanPkgCost || 0,
            discount: cleanDiscount || 0,
            final_amount: cleanFinalAmt || 0,
            Team_Members_Included: teamMembersJson,
            editable_inclusions: editableInclusions,
            deliverables_descriptionn: deliverablesJson,
            deliverables_json: deliverablesJson,
            deliverables_description: deliverablesText,
            editable_deliverables: editableDeliverables,
            updated_at: new Date().toISOString()
          };

          const { data: existingLps } = await supabaseClient
            .from('lead_packages')
            .select('*')
            .eq('lead_id', targetLeadId);

          let targetLpId = `LP-${targetLeadId}-${pkgId}`;
          if (existingLps && existingLps.length > 0) {
            const matched = existingLps.find(lp => String(lp.package_id) === String(pkgId)) || existingLps[0];
            targetLpId = matched.lead_package_id;
            await supabaseClient
              .from('lead_packages')
              .update(packagePayload)
              .eq('lead_package_id', targetLpId);
          } else {
            await supabaseClient
              .from('lead_packages')
              .insert({
                ...packagePayload,
                lead_package_id: targetLpId,
                created_at: new Date().toISOString()
              });
          }
        } catch (lpErr) {
          console.warn("Could not upsert lead_packages record:", lpErr);
        }
      }

      setWizardLeadData(prev => ({
        ...prev,
        deliverables: deliverablesText,
        deliverables_description: deliverablesText,
        package_price: cleanPkgCost ?? prev.package_price,
        selected_package_id: pkgId,
        Select_Package_Option: pkgId
      }));

      // Update the local selectedLead state so that the UI reflects it
      if (selectedLead) {
        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            budget: cleanPkgCost || 0,
            package_price: cleanPkgCost || 0,
            deliverables_description: deliverablesText,
            notes_special_customizations: wizardLeadData.notes,
            remarks: updatedRemarks,
            Select_Package_Option: pkgId,
            sales_staff_name: effectiveSalesName,
            sales_staff_mobile: effectiveSalesMobile,
            Quotation_Discount: cleanDiscount,
            Additional_Services_Cost: cleanAdditional,
            Final_Quotation_Amount: cleanFinalAmt,
          };
        });
        await completeApprovedUnlockRequest(selectedLead.lead_id);
      }

      showToastMsg("Package configuration saved successfully!", "success");
    } catch (err: any) {
      console.error("Save package only failed:", err);
      setSaveErrorPopup({
        title: "Failed to save package",
        message: "‚ùå Failed to save package.\nPlease try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep = async (step: number) => {
    if (!selectedLead) return;
    setIsSaving(true);
    try {
      if (step === 1) {
        if (isStep1Locked) {
          showToastMsg("Customer details are locked after order confirmation.", "error");
          setIsSaving(false);
          return;
        }
        if (!wizardLeadData.mobile) {
          showToastMsg("Phone Number is required.", "error");
          setIsSaving(false);
          return;
        }
        const mobileVal = String(wizardLeadData.mobile || '').trim();
        if (!/^\d{10}$/.test(mobileVal)) {
          showToastMsg("Please enter a valid 10-digit mobile number.", "error");
          setIsSaving(false);
          return;
        }
        if (!wizardLeadData.lead_source) {
          showToastMsg("Lead Source is required.", "error");
          setIsSaving(false);
          return;
        }
        const updatedRemarks = appendCompletedStep(selectedLead.remarks || wizardLeadData.remarks, 1);
        await updateLead(selectedLead.lead_id, {
          customer_name: wizardLeadData.customer_name || '',
          mobile: wizardLeadData.mobile,
          whatsapp_number: wizardLeadData.whatsapp_number,
          email: wizardLeadData.email,
          address: wizardLeadData.address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode,
          client_residence_address: wizardLeadData.client_residence_address,
          lead_source: wizardLeadData.lead_source,
          Specify_Custom_Lead_Source_Name: wizardLeadData.lead_source === 'Other' && wizardLeadData.Specify_Custom_Lead_Source_Name?.trim() !== '' ? wizardLeadData.Specify_Custom_Lead_Source_Name.trim() : null,
          total_pax: wizardLeadData.total_pax,
          reference_source: wizardLeadData.reference_source,
          Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead.Select_Package_Option || '',
          remarks: updatedRemarks,
          status: getStatusRank(selectedLead.status || selectedLead.current_status) < 1 || selectedLead.status === 'New Lead' ? 'Create Quote' : (selectedLead.status || 'Create Quote'),
          current_status: getStatusRank(selectedLead.status || selectedLead.current_status) < 1 || selectedLead.status === 'New Lead' ? 'Create Quote' : (selectedLead.current_status || selectedLead.status || 'Create Quote')
        });

        const newCompleted = Math.max(crmHighestStep, 1);
        setCrmHighestStep(newCompleted);
        localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));

        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            remarks: updatedRemarks
          };
        });

        showToastMsg("CRM Updated Successfully.", "success");
      } else if (step === 2) {
        if (isStep2Locked) {
          showToastMsg("Event details are locked after order confirmation.", "error");
          setIsSaving(false);
          return;
        }
        let finalEventsList = [...crmEvents];

        if (showEventForm || finalEventsList.length === 0) {
          if (!eventForm.event_type || eventForm.event_type === '') {
            showToastMsg("Please select Event Type.", "error");
            setIsSaving(false);
            return;
          }
          if (!eventForm.event_date || eventForm.event_date === '') {
            showToastMsg("Please select Event Date.", "error");
            setIsSaving(false);
            return;
          }
          if (!eventForm.event_location || eventForm.event_location.trim() === '') {
            showToastMsg("Please enter Event Location.", "error");
            setIsSaving(false);
            return;
          }

          const dateTimeErrMsg = getEventDateTimeErrorMessage(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time);
          if (dateTimeErrMsg) {
            showToastMsg(dateTimeErrMsg, "error");
            setIsSaving(false);
            return;
          }

          const guestPaxVal = eventForm.guest_pax !== '' ? Math.max(0, parseInt(String(eventForm.guest_pax)) || 0) : '';
          const staffPaxVal = eventForm.staff_pax !== '' ? Math.max(0, parseInt(String(eventForm.staff_pax)) || 0) : '';

          const eventData = {
            ...eventForm,
            guest_pax: guestPaxVal,
            staff_pax: staffPaxVal,
            event_start_date: eventForm.event_date,
            event_end_date: eventForm.event_end_date || ''
          };

          if (editingEventId) {
            finalEventsList = finalEventsList.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev);
          } else {
            finalEventsList.push({
              ...eventData,
              id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
            });
          }

          setCrmEvents(finalEventsList);
          setEditingEventId(null);
          setShowEventForm(false);
        }

        if (finalEventsList.length === 0) {
          showToastMsg("Please add at least one event.", "error");
          setIsSaving(false);
          return;
        }

        // Pre-validate and format all events in the finalEventsList
        for (const ev of finalEventsList) {
          if (!ev.event_type || ev.event_type.trim() === '') {
            showToastMsg("Please select Event Type for all events.", "error");
            setIsSaving(false); return;
          }
          if (ev.event_type === 'Other' && (!ev.event_name || ev.event_name.trim() === '')) {
            showToastMsg("Please enter Event Name for 'Other' event types.", "error");
            setIsSaving(false); return;
          }
          if (!ev.event_date || ev.event_date.trim() === '') {
            showToastMsg("Please select Event Date for all events.", "error");
            setIsSaving(false); return;
          }
          if (!ev.event_start_time || ev.event_start_time.trim() === '') {
            showToastMsg("Please select Event Start Time for all events.", "error");
            setIsSaving(false); return;
          }
          if (!ev.event_end_time || ev.event_end_time.trim() === '') {
            showToastMsg("Please select Event End Time for all events.", "error");
            setIsSaving(false); return;
          }
          if (!ev.event_location || ev.event_location.trim() === '') {
            showToastMsg("Please enter Event Location for all events.", "error");
            setIsSaving(false); return;
          }
          
          try {
            ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
          } catch (err: any) {
            showToastMsg(err.message, "error");
            setIsSaving(false);
            return;
          }
          try {
            ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
          } catch (err: any) {
            showToastMsg(err.message, "error");
            setIsSaving(false);
            return;
          }
          
          const dateTimeErrMsg = getEventDateTimeErrorMessage(ev.event_date, ev.event_end_date, ev.event_start_time, ev.event_end_time);
          if (dateTimeErrMsg) {
            showToastMsg(dateTimeErrMsg, "error");
            setIsSaving(false);
            return;
          }
        }


        // Perform direct save for Step 2 without showing follow-up popup
        await handleSaveStep2Direct();
        return;
      } else if (step === 3) {
        if (isStep3Locked) {
          showToastMsg("Quotation details are locked. Owner unlock approval required to edit.", "error");
          setIsSaving(false);
          return;
        }
        if (!validateStep3Data('all')) {
          setIsSaving(false);
          return;
        }
        const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedLead.Select_Package_Option || 'Custom Package';
        const { teamMembersJson, deliverablesJson, flatTeamMembers, teamMembersText, deliverablesText } = buildStep3EventPayloads(
          pkgId,
          crmEvents,
          editableInclusions,
          editableDeliverables
        );

        const updatedRemarks = appendCompletedStep(wizardLeadData.notes || '', 3);
        
        const updatedEvents = crmEvents.map(ev => ({
          ...ev,
          assigned_staff_names: ev.assigned_staff_names || '',
          assigned_staff_mobiles: ev.assigned_staff_mobiles || ''
        }));

        const cleanPkgCost = wizardLeadData.package_cost !== "" && wizardLeadData.package_cost != null && !isNaN(Number(wizardLeadData.package_cost)) ? Number(wizardLeadData.package_cost) : (wizardLeadData.package_price !== "" && wizardLeadData.package_price != null && !isNaN(Number(wizardLeadData.package_price)) ? Number(wizardLeadData.package_price) : null);
        const cleanDiscount = quoteDiscount === "" || quoteDiscount == null || isNaN(Number(quoteDiscount)) ? null : Number(quoteDiscount);
        const cleanAdditional = quoteAdditional === "" || quoteAdditional == null || isNaN(Number(quoteAdditional)) ? null : Number(quoteAdditional);
        const cleanFinalAmt = Math.max(0, (cleanPkgCost || 0) + (cleanAdditional || 0) - (cleanDiscount || 0));
        const cleanPincode = wizardLeadData.pincode === "" || wizardLeadData.pincode == null ? null : wizardLeadData.pincode;

        const effectiveSalesName = getEffectiveSalesStaffName();
        const effectiveSalesMobile = getEffectiveSalesStaffMobile();

        const safeTeamMembersText = teamMembersText;
        const safeDeliverablesText = deliverablesText;

        console.log('TEAM MEMBERS SAVE in handleStep3Submit', { leadId: selectedLead.lead_id, teamMembers: flatTeamMembers, serialized: safeTeamMembersText });

        try {
          const { data: dbResult, error: dbError } = await supabaseClient
            .from('leads')
            .update({
              budget: cleanPkgCost,
              package_price: cleanPkgCost,
              deliverables_description: safeDeliverablesText,
              Team_member: safeTeamMembersText,
              Team_Members: safeTeamMembersText,
              team_members: safeTeamMembersText,
              notes_special_customizations: wizardLeadData.notes,
              remarks: updatedRemarks,
              Select_Package_Option: pkgId,
              client_residence_address: wizardLeadData.client_residence_address,
              city: wizardLeadData.city,
              state: wizardLeadData.state,
              pincode: cleanPincode,
              sales_staff_name: effectiveSalesName,
              sales_staff_mobile: effectiveSalesMobile,
              Quotation_Discount: cleanDiscount,
              Additional_Services_Cost: cleanAdditional,
              Final_Quotation_Amount: cleanFinalAmt,
              Final_Package_Amount: cleanFinalAmt,
              events: updatedEvents
            })
            .eq('lead_id', selectedLead.lead_id)
            .select('*');
          console.log('TEAM MEMBERS DB RESULT handleStep3Submit', { data: dbResult, error: dbError });
        } catch (dbErr) {
          console.warn("Direct Supabase update warning in handleStep3Submit:", dbErr);
        }

        await updateLead(selectedLead.lead_id, {
          budget: cleanPkgCost,
          package_price: cleanPkgCost,
          deliverables_description: safeDeliverablesText,
          Team_member: safeTeamMembersText,
          Team_Members: safeTeamMembersText,
          team_members: safeTeamMembersText,
          notes_special_customizations: wizardLeadData.notes,
          remarks: updatedRemarks,
          Select_Package_Option: pkgId,
          client_residence_address: wizardLeadData.client_residence_address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: cleanPincode,
          sales_staff_name: effectiveSalesName,
          sales_staff_mobile: effectiveSalesMobile,
          Quotation_Discount: cleanDiscount,
          Additional_Services_Cost: cleanAdditional,
          Final_Quotation_Amount: cleanFinalAmt,
          Final_Package_Amount: cleanFinalAmt,
          final_package_amount: cleanFinalAmt,
          _explicit_step3_save: true,
          events: updatedEvents
        });

        setWizardLeadData(prev => ({
          ...prev,
          deliverables: safeDeliverablesText,
          deliverables_description: safeDeliverablesText,
          Team_member: safeTeamMembersText,
          Team_Members: safeTeamMembersText,
          team_members: safeTeamMembersText,
          package_price: cleanPkgCost ?? prev.package_price,
          selected_package_id: pkgId,
          Select_Package_Option: pkgId,
          final_amount: cleanFinalAmt
        }));

        const newCompleted = Math.max(crmHighestStep, 3);
        setCrmHighestStep(newCompleted);
        localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));

        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            budget: cleanPkgCost ?? prev.budget,
            package_price: cleanPkgCost ?? prev.package_price,
            deliverables_description: safeDeliverablesText,
            Team_member: safeTeamMembersText,
            Team_Members: safeTeamMembersText,
            team_members: safeTeamMembersText,
            notes_special_customizations: wizardLeadData.notes,
            remarks: updatedRemarks,
            Select_Package_Option: pkgId,
            client_residence_address: wizardLeadData.client_residence_address,
            city: wizardLeadData.city,
            state: wizardLeadData.state,
            pincode: wizardLeadData.pincode,
            sales_staff_name: effectiveSalesName,
            sales_staff_mobile: effectiveSalesMobile,
            Quotation_Discount: cleanDiscount,
            Additional_Services_Cost: cleanAdditional,
            Final_Quotation_Amount: cleanFinalAmt,
            Final_Package_Amount: cleanFinalAmt,
            final_package_amount: cleanFinalAmt
          };
        });

        if (wizardLeadData.status === 'Order Confirmed') {
          if (!wizardLeadData.confirmed_event_date) {
             showToastMsg("Please provide Confirmed Event Date.", "error");
             setIsSaving(false); return;
          }
          if (!wizardLeadData.final_amount || isNaN(wizardLeadData.final_amount)) {
             showToastMsg("Please provide Final Amount.", "error");
             setIsSaving(false); return;
          }
          
          const pkgName = packages.find(p => p.package_id === wizardLeadData.selected_package_id)?.package_name || 'Selected Package';
          
          let masterOrderId = '';
          try {
             masterOrderId = await confirmOrder(
               selectedLead.lead_id,
               pkgName,
               Number(wizardLeadData.final_amount),
               Number(wizardLeadData.advance_received || 0),
               wizardLeadData.confirmed_event_date,
               wizardLeadData.confirmed_event_time,
               'UPI',
               wizardLeadData.notes || 'Order confirmed via CRM Wizard',
               undefined,
               undefined
             );
          } catch (err: any) {
             console.error('confirmOrder error', err);
             showToastMsg('Failed to confirm order: ' + err.message, 'error');
             setIsSaving(false); return;
          }

          // Save to order_event_reporting
          try {
             if (supabaseClient) {
               const finalAmt = Number(wizardLeadData.final_amount);
               const advanceAmt = Number(wizardLeadData.advance_received || 0);
               const pendingAmt = finalAmt - advanceAmt;
               const paymentStatus = pendingAmt <= 0 ? 'Paid' : 'Pending';

               for (const ev of crmEvents) {
                 const payload = {
                   order_id: masterOrderId,
                   lead_id: selectedLead.lead_id,
                   event_id: ev.id,
                   event_name: ev.event_name || ev.event_type || 'Unknown Event',
                   confirmed_event_date: wizardLeadData.confirmed_event_date,
                   confirmed_event_time: wizardLeadData.confirmed_event_time,
                   contract_final_amount: finalAmt,
                   advance_payment_received: advanceAmt,
                   reporting_date: ev.reporting_date || ev.event_date || wizardLeadData.confirmed_event_date,
                   reporting_time: ev.reporting_time || wizardLeadData.confirmed_event_time,
                   pending_amount: pendingAmt,
                   payment_status: paymentStatus
                 };

                 const { data: existing, error: fetchErr } = await supabaseClient
                   .from('order_event_reporting')
                   .select('event_id')
                   .eq('event_id', ev.id)
                   .maybeSingle();

                 if (fetchErr && fetchErr.code !== 'PGRST116') {
                    throw fetchErr;
                 }

                 if (existing) {
                   const { error: updErr } = await supabaseClient
                     .from('order_event_reporting')
                     .update(payload)
                     .eq('event_id', ev.id);
                   if (updErr) throw updErr;
                 } else {
                   const { error: insErr } = await supabaseClient
                     .from('order_event_reporting')
                     .insert(payload);
                   if (insErr) throw insErr;
                 }
               }
             }
          } catch (err: any) {
             const errMsg = `Failed to save Order Event Reporting.\nTable Name: order_event_reporting\nColumn Name: Multiple (Check schema)\nFailed Function: handleSaveStep -> UPSERT\nSQL Operation: INSERT/UPDATE\nExact Supabase Error: ${err.message || String(err)}\nSuggested Fix: Verify table schema 'order_event_reporting' exists with correct columns.`;
             alert(errMsg);
             setIsSaving(false);
             return;
          }
          
          await completeApprovedUnlockRequest(selectedLead.lead_id);
          showToastMsg("Order Confirmed and sent to Operations.", "success");
          setSelectedLead(null);
          setIsSaving(false);
          return;
        }

        await completeApprovedUnlockRequest(selectedLead.lead_id);
        showToastMsg(`‚úÖ Quotation & CRM changes saved.`, "success");
        setStep3FollowUpDate(selectedLead?.next_follow_up_date || '');
        setStep3FollowUpTime((selectedLead as any)?.next_follow_up_time || '');
        setStep3FollowUpNotes(selectedLead?.follow_up_notes || '');
        setShowStep3Popup(true);
        setIsSaving(false);
        return; // Open follow-up popup
      }

      if (step < 3) {
        let nextStep = step + 1;
        setCrmWizardStep(nextStep);
        setTimeout(() => {
          document.getElementById('crm-wizard-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      } else {
        setSelectedLead(null);
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);
      
      const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;
      const newStatus = wizardLeadData?.status || null;
      
      logStatusUpdateError({
        leadId: selectedLead?.lead_id || null,
        orderId: null,
        oldStatus,
        newStatus,
        updatePayload: {
          budget: Number(wizardLeadData?.package_cost || wizardLeadData?.budget || 0),
          package_price: Number(wizardLeadData?.package_cost || 0),
          remarks: wizardLeadData?.remarks || wizardLeadData?.notes || '',
          Select_Package_Option: wizardLeadData?.selected_package_id || wizardLeadData?.Select_Package_Option || ''
        },
        insertPayload: null,
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "CRM Multi-step Wizard Status Update Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      showToastMsg(parsed.reason, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Automatic background sync for Quote Sent -> Quote Follow-up when follow-up date and time are reached
  React.useEffect(() => {
    if (!leads || leads.length === 0) return;

    const checkAndSyncFollowUp = () => {
      leads.forEach(async (ld) => {
        const rawSt = ld.current_status || ld.status;
        if ((rawSt === 'Quote Sent' || rawSt === 'Quotation Sent') && isFollowUpDateTimeReached(ld)) {
          try {
            await updateLeadFollowUp(
              ld.lead_id,
              'Quote Follow-up' as CurrentStage,
              'Auto updated: Scheduled follow-up date and time reached',
              ld.next_follow_up_date || '',
              Number(ld.budget || 0),
              ld.follow_up_notes || 'Follow-up date and time reached'
            );
          } catch (e) {
            // Silent auto sync
          }
        }
      });
    };

    checkAndSyncFollowUp();
    const interval = setInterval(checkAndSyncFollowUp, 30000);
    return () => clearInterval(interval);
  }, [leads]);

  const handleSaveStep2Direct = async (passedEvents?: any[]) => {
    const isCreateFlow = activeTab === 'create';
    if (!isCreateFlow && isStep2Locked) {
      showToastMsg("Event details are locked after order confirmation.", "error");
      return;
    }
    const currentLeadId = isCreateFlow ? createdLeadId : selectedLead?.lead_id;
    if (!currentLeadId) {
      showToastMsg("Lead not initialized yet.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const finalEventsList = passedEvents || (isCreateFlow ? [...createEvents] : [...crmEvents]);
      if (finalEventsList.length === 0) {
        showToastMsg("Please add at least one event.", "error");
        setIsSaving(false);
        return;
      }
      
      // Pre-validate and format all events in the finalEventsList
      for (const ev of finalEventsList) {
        if (!ev.event_type || ev.event_type.trim() === '') {
          showToastMsg("Please select Event Type for all events.", "error");
          setIsSaving(false); return;
        }
        if (ev.event_type === 'Other' && (!ev.event_name || ev.event_name.trim() === '')) {
          showToastMsg("Please enter Event Name for 'Other' event types.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_date || ev.event_date.trim() === '') {
          showToastMsg("Please select Event Date for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_start_time || ev.event_start_time.trim() === '') {
          showToastMsg("Please select Event Start Time for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_end_time || ev.event_end_time.trim() === '') {
          showToastMsg("Please select Event End Time for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_location || ev.event_location.trim() === '') {
          showToastMsg("Please enter Event Location for all events.", "error");
          setIsSaving(false); return;
        }
        
        try {
          ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          setIsSaving(false); return;
        }
        try {
          ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          setIsSaving(false); return;
        }
        
        const dateTimeErrMsg = getEventDateTimeErrorMessage(ev.event_date, ev.event_end_date, ev.event_start_time, ev.event_end_time);
        if (dateTimeErrMsg) {
          showToastMsg(dateTimeErrMsg, "error");
          setIsSaving(false); return;
        }
      }

      const firstEvent = finalEventsList[0];

      const formattedEventTime = validateAndFormatTime(firstEvent.event_start_time, "Event Start Time");
      const formattedReportingTime = validateAndFormatTime(isCreateFlow ? reportingTime : wizardLeadData.reporting_time, "Reporting Time");

      await updateLead(currentLeadId, {
        event_type: firstEvent.event_type === 'Other' ? 'Other' : firstEvent.event_type,
        custom_event_name: firstEvent.event_name,
        custom_event_type: firstEvent.event_type === 'Other' ? firstEvent.event_name : undefined,
        event_date: firstEvent.event_date,
        Event_End_Date: firstEvent.event_end_date || (firstEvent as any).Event_End_Date || null,
        event_time: formattedEventTime || null,
        event_start_time: firstEvent.event_start_time || null,
        event_end_time: firstEvent.event_end_time || null,
        reporting_time: formattedReportingTime || null,
        event_location: firstEvent.event_location,
        google_maps_link: firstEvent.google_maps_link || '',
        lead_source: isCreateFlow ? createForm.lead_source : wizardLeadData.lead_source,
        shoot_type: firstEvent.event_shoot_type || '',
        event_shoot_type: firstEvent.event_shoot_type || '',
        desired_event_shoot_type: firstEvent.event_shoot_type || '',
        client_residence_address: isCreateFlow ? createForm.client_residence_address : wizardLeadData.client_residence_address,
        city: isCreateFlow ? createForm.city : wizardLeadData.city,
        state: isCreateFlow ? createForm.state : wizardLeadData.state,
        pincode: isCreateFlow ? createForm.pincode : wizardLeadData.pincode,
        total_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        guest_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        staff_pax: firstEvent.staff_pax !== '' && firstEvent.staff_pax != null ? Number(firstEvent.staff_pax) : null,
        reference_source: isCreateFlow ? createForm.reference_source : wizardLeadData.reference_source || '',
        Select_Package_Option: isCreateFlow ? (createForm.Select_Package_Option || selectedPkgIds[0] || '') : (wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || ''),
        events: finalEventsList
      });

      let reloadedEvents = finalEventsList;
      if (supabaseClient) {
        const { data: dbEvents, error: dbErr } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', currentLeadId)
          .order('created_at', { ascending: true });
          
        if (!dbErr && dbEvents && dbEvents.length > 0) {
          reloadedEvents = dbEvents as LeadEvent[];
          if (isCreateFlow) {
            setCreateEvents(reloadedEvents);
          } else {
            setCrmEvents(reloadedEvents);
          }
        }
      }

      if (isCreateFlow) {
        // Await confirmation from Supabase that the lead and events are persisted before initializing Step 3
        if (supabaseClient && currentLeadId) {
          try {
            await supabaseClient
              .from('leads')
              .select('lead_id')
              .eq('lead_id', currentLeadId)
              .maybeSingle();
          } catch (refetchErr) {
            console.warn("Silent confirmation before Step 3 failed:", refetchErr);
          }
        }

        if (selectedPkgIds.length === 0) {
          setSelectedPkgIds(['Custom Package']);
          setWizardLeadData(prev => ({ ...prev, selected_package_id: 'Custom Package', Select_Package_Option: 'Custom Package' }));
        }
        setWizardStep(3);
      } else {
        const newCompleted = Math.max(crmHighestStep, 2);
        setCrmHighestStep(newCompleted);
        if (selectedLead) {
          localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));
        }

        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            events: reloadedEvents
          };
        });

        setCrmWizardStep(3);
      }

      showToastMsg("‚úÖ Event Details Saved Successfully", "success");
    } catch (err: any) {
      console.error("Step 2 direct save failed:", err);
      showToastMsg(`Failed to save event details: ${err.message || err}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep3FollowUp = async () => {
    const isCreateFlow = activeTab === 'create';
    const currentLeadId = isCreateFlow ? createdLeadId : selectedLead?.lead_id;

    if (!currentLeadId) {
      showToastMsg("Lead record not found.", "error");
      return;
    }
    if (!step3FollowUpDate) {
      showToastMsg("Follow-up Date is required.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const fullNotes = step3FollowUpTime
        ? `[Time: ${step3FollowUpTime}] ${step3FollowUpNotes}`.trim()
        : step3FollowUpNotes;

      const currentPkgCost = Number(isCreateFlow ? (createForm.budget || finalTotal || 0) : (wizardLeadData.package_cost || selectedLead?.budget || 0));

      const previousStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'Create Quote') : 'Create Quote';
      const prevRank = getStatusRank(previousStatus);

      // Target stage:
      // If previous status rank < 2 (i.e. Create Quote or New Lead), update status to Quote Sent.
      // If previous status rank >= 2 (already Quote Sent, Quote Follow-up, Confirm Order, Lost Lead), preserve existing status!
      const targetStage: CurrentStage = (isCreateFlow || prevRank < 2) 
        ? ('Quote Sent' as CurrentStage) 
        : (previousStatus as CurrentStage);

      await updateLeadFollowUp(
        currentLeadId,
        targetStage,
        fullNotes || 'Quotation created & follow-up scheduled',
        step3FollowUpDate,
        currentPkgCost,
        fullNotes || 'Quotation sent'
      );

      await completeApprovedUnlockRequest(currentLeadId);

      localStorage.setItem(`follow_up_date_${currentLeadId}`, step3FollowUpDate);
      localStorage.setItem(`follow_up_notes_${currentLeadId}`, fullNotes);

      if (isCreateFlow) {
        setSalesStatus('Quote Sent' as CurrentStage);
        resetForm();
        setActiveTab('list');
      } else {
        setSelectedLead(null);
        setCrmWizardStep(1);
        setActiveTab('list');
      }

      showToastMsg("‚úÖ Quotation & Follow-up saved! Status updated to Quote Sent.", "success");
      setShowStep3Popup(false);
    } catch (err: any) {
      console.error("Failed to save Step 3 follow-up:", err);
      showToastMsg(`Failed to save follow-up: ${err.message || err}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep2FollowUp = async () => {
    const isCreateFlow = activeTab === 'create';
    const currentLeadId = isCreateFlow ? createdLeadId : selectedLead?.lead_id;
    if (!currentLeadId) {
      showToastMsg("Lead not initialized yet.", "error");
      return;
    }
    if (!step2FollowUpDate) {
      showToastMsg("Next Follow-up Date is mandatory.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const finalEventsList = (isCreateFlow ? [...createEvents] : [...crmEvents]);
      if (finalEventsList.length === 0) {
        showToastMsg("No events found to save.", "error");
        setIsSaving(false);
        return;
      }
      
      // Pre-validate and format all events in the finalEventsList
      for (const ev of finalEventsList) {
        if (!ev.event_type || ev.event_type.trim() === '') {
          showToastMsg("Please select Event Type for all events.", "error");
          setIsSaving(false); return;
        }
        if (ev.event_type === 'Other' && (!ev.event_name || ev.event_name.trim() === '')) {
          showToastMsg("Please enter Event Name for 'Other' event types.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_date || ev.event_date.trim() === '') {
          showToastMsg("Please select Event Date for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_start_time || ev.event_start_time.trim() === '') {
          showToastMsg("Please select Event Start Time for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_end_time || ev.event_end_time.trim() === '') {
          showToastMsg("Please select Event End Time for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_location || ev.event_location.trim() === '') {
          showToastMsg("Please enter Event Location for all events.", "error");
          setIsSaving(false); return;
        }
        
        try {
          ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          setIsSaving(false); return;
        }
        try {
          ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          setIsSaving(false); return;
        }
        
        const dateTimeErrMsg = getEventDateTimeErrorMessage(ev.event_date, ev.event_end_date, ev.event_start_time, ev.event_end_time);
        if (dateTimeErrMsg) {
          showToastMsg(dateTimeErrMsg, "error");
          setIsSaving(false); return;
        }
      }

      const firstEvent = finalEventsList[0];

      const formattedEventTime = validateAndFormatTime(firstEvent.event_start_time, "Event Start Time");
      const formattedReportingTime = validateAndFormatTime(isCreateFlow ? reportingTime : wizardLeadData.reporting_time, "Reporting Time");

      // Save event details first
      await updateLead(currentLeadId, {
        event_type: firstEvent.event_type === 'Other' ? 'Other' : firstEvent.event_type,
        custom_event_name: firstEvent.event_name,
        custom_event_type: firstEvent.event_type === 'Other' ? firstEvent.event_name : undefined,
        event_date: firstEvent.event_date,
        Event_End_Date: firstEvent.event_end_date || (firstEvent as any).Event_End_Date || null,
        event_time: formattedEventTime || null,
        event_start_time: firstEvent.event_start_time || null,
        event_end_time: firstEvent.event_end_time || null,
        reporting_time: formattedReportingTime || null,
        event_location: firstEvent.event_location,
        google_maps_link: firstEvent.google_maps_link || '',
        lead_source: isCreateFlow ? createForm.lead_source : wizardLeadData.lead_source,
        shoot_type: firstEvent.event_shoot_type || '',
        event_shoot_type: firstEvent.event_shoot_type || '',
        desired_event_shoot_type: firstEvent.event_shoot_type || '',
        client_residence_address: isCreateFlow ? createForm.client_residence_address : wizardLeadData.client_residence_address,
        city: isCreateFlow ? createForm.city : wizardLeadData.city,
        state: isCreateFlow ? createForm.state : wizardLeadData.state,
        pincode: isCreateFlow ? createForm.pincode : wizardLeadData.pincode,
        total_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        guest_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        staff_pax: firstEvent.staff_pax !== '' && firstEvent.staff_pax != null ? Number(firstEvent.staff_pax) : null,
        
        reference_source: isCreateFlow ? createForm.reference_source : wizardLeadData.reference_source || '',
        Select_Package_Option: isCreateFlow ? (createForm.Select_Package_Option || selectedPkgIds[0] || '') : (wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || ''),
        events: finalEventsList
      });

      // Reload latest Event Details from the database to ensure we have the real IDs
      let reloadedEvents = finalEventsList;
      if (supabaseClient) {
        const { data: dbEvents, error: dbErr } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', currentLeadId)
          .order('created_at', { ascending: true });
          
        if (dbErr) {
          throw new Error(`Failed to verify saved events: ${dbErr.message || dbErr.details || 'Unknown database error'}`);
        }
        
        if (dbEvents && dbEvents.length > 0) {
          reloadedEvents = dbEvents as LeadEvent[];
          if (isCreateFlow) {
            setCreateEvents(reloadedEvents);
          } else {
            setCrmEvents(reloadedEvents);
          }
        }
      }

      const notesWithTag = appendCompletedStep(step2FollowUpNotes || 'Saved event details', 2);

      // Determine target status: If the current status is New Lead or empty, update to Follow Up. Otherwise preserve advanced status.
      const previousStatus = isCreateFlow ? 'New Lead' : (selectedLead ? getLeadCurrentStatus(selectedLead) : 'New Lead');
      const targetStatus = (previousStatus === 'New Lead' || !previousStatus) ? 'Follow Up' : previousStatus;

      // Update lead follow up and preserve/update status
      await updateLeadFollowUp(
        currentLeadId,
        targetStatus as CurrentStage,
        notesWithTag,
        step2FollowUpDate,
        Number(isCreateFlow ? (createForm.budget || 0) : (wizardLeadData.package_cost || selectedLead?.budget || 0)),
        step2FollowUpNotes || 'Saved event details'
      );

      localStorage.setItem(`follow_up_date_${currentLeadId}`, step2FollowUpDate);
      localStorage.setItem(`follow_up_notes_${currentLeadId}`, step2FollowUpNotes);

      if (isCreateFlow) {
        setSalesStatus(targetStatus as CurrentStage);
        setSelectedPkgIds(['Custom Package']);
        setWizardLeadData(prev => ({ ...prev, selected_package_id: 'Custom Package', Select_Package_Option: 'Custom Package' }));
        setWizardStep(3);
      } else {
        const newCompleted = Math.max(crmHighestStep, 2);
        setCrmHighestStep(newCompleted);
        if (selectedLead) {
          localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));
        }

        // Locally update the status and remarks
        const timestamp = new Date().toISOString();
        const updatedRemarks = `${selectedLead?.remarks || ''}\n[Update ${timestamp.split('T')[0]}]: ${notesWithTag}. ${step2FollowUpNotes ? 'Neg Notes: ' + step2FollowUpNotes : ''}. Next follow-up: ${step2FollowUpDate}`;

        // Locally update the status
        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: targetStatus as CurrentStage,
            current_status: targetStatus,
            remarks: updatedRemarks,
            follow_up_notes: step2FollowUpNotes,
            next_follow_up_date: step2FollowUpDate,
            events: reloadedEvents
          };
        });

        setCrmWizardStep(3);
      }

      showToastMsg("‚úÖ Event Details Saved Successfully", "success");
      setShowStep2Popup(false);
    } catch (err: any) {
      console.error("Step 2 Follow-up save failed:", err);
      const errorMsg = err?.details || err?.message || String(err);
      showToastMsg(`Save Failed: ${errorMsg}`, "error");
      showErrorHelper(
        "Step 2 Save & Next Failed",
        errorMsg,
        "handleSaveStep2FollowUp",
        currentLeadId,
        "Check event details and try again.",
        err
      );
      setTimeout(() => {
        document.getElementById('error_details_modal')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLostLead = async () => {
    if (!selectedLead) return;
    const finalReason = lostReason === 'Other' ? otherLostReason : lostReason;
    if (!finalReason || finalReason.trim() === '') {
      showToastMsg("Lost Reason is mandatory.", "error");
      return;
    }
    if (!lostNotes || lostNotes.trim() === '') {
      showToastMsg("Lost Notes are mandatory.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await updateLead(selectedLead.lead_id, {
        status: 'Lost Lead',
        current_status: 'Lost Lead',
        remarks: `Lost Reason: ${finalReason}. Notes: ${lostNotes}`,
        "Lost_Reason": finalReason,
        "Lost_Notes": lostNotes,
        lost_reason: finalReason,
        lost_notes: lostNotes,
        follow_up_notes: finalReason
      } as any);

      await updateLeadFollowUp(
        selectedLead.lead_id,
        'Lost Lead',
        finalReason,
        '',
        Number(selectedLead.package_price || selectedLead.budget || 0),
        lostNotes
      );

      showToastMsg("Lead status set to Lost successfully.", "success");
      setShowLostModal(false);
      setSelectedLead(null);
    } catch (err: any) {
      console.error("Failed to set lead as lost:", err);
      showToastMsg(err.message || String(err), "error");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSubmitUnlockRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnlockLead) return;
    
    if (unlockRequestReason === 'Other' && !unlockRequestCustomReason.trim()) {
      showToastMsg("Please enter a custom reason.", "error");
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (!supabaseClient) {
        throw new Error("Supabase database client is not initialized.");
      }

      const order = orders.find(o => o.lead_id === selectedUnlockLead.lead_id);
      const orderId = order?.order_id || (selectedUnlockLead as any).order_id || selectedUnlockLead.lead_id || 'ORD-UNKNOWN';
      
      // 1. Prevent Duplicate Requests: Check if a Pending request already exists
      const { data: existingPending, error: checkErr } = await supabaseClient
        .from('unlock_requests')
        .select('*')
        .or(`lead_id.eq.${selectedUnlockLead.lead_id},order_id.eq.${orderId}`)
        .eq('request_status', 'Pending');

      if (checkErr) {
        console.error("Error checking existing pending unlock requests:", checkErr);
      }

      const localPending = unlockRequests.find((r: any) => 
        (r.lead_id === selectedUnlockLead.lead_id || r.order_id === orderId) &&
        (r.status === 'Pending' || r.request_status === 'Pending')
      );

      if ((existingPending && existingPending.length > 0) || localPending) {
        showToastMsg("An Unlock Request is already pending Business Owner approval.", "error");
        setIsSaving(false);
        return;
      }

      const fullReason = unlockRequestReason === 'Other' ? unlockRequestCustomReason.trim() : unlockRequestReason;

      const unlockRequestPayload = {
        lead_id: selectedUnlockLead.lead_id,
        order_id: orderId,
        requested_by_user_id: currentUser?.id || 'sales-user',
        requested_by_name: currentUser?.name || 'Sales Staff',
        requested_by_role: currentUser?.role || 'Sales',
        business_owner_user_id: 'BO-MAIN',
        chapter_id: selectedUnlockLead.chapter_id || 'DEFAULT',
        request_reason: fullReason || 'Unlock quotation for editing',
        request_status: 'Pending',
        requested_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      // 2. Save to Supabase: MUST succeed
      const { data: insertedData, error: reqErr } = await supabaseClient
        .from('unlock_requests')
        .insert([unlockRequestPayload])
        .select();

      if (reqErr) {
        console.error("Supabase unlock_requests insert failed:", reqErr);
        throw new Error(`Database insert failed: ${reqErr.message}`);
      }

      if (!insertedData || insertedData.length === 0) {
        throw new Error("Database insert did not return confirmation. Request not saved.");
      }



      // 4. Send notification to Business Owner
      if (addNotification) {
        try {
          const payload = {
            title: unlockRequestReason,
            message: `New unlock request received for ${selectedUnlockLead.customer_name || 'Lead'}.`,
            notification_type: 'Quotation Unlock Request',
            recipient_role: 'Business Owner',
            project_id: orderId,
            task_id: 'Pending',
            priority: 'High',
            action_url: JSON.stringify({
              lead_id: selectedUnlockLead.lead_id,
              customer_name: selectedUnlockLead.customer_name,
              mobile: selectedUnlockLead.mobile,
              sales_staff_id: currentUser?.id || '',
              sales_staff_name: currentUser?.name || '',
              sales_staff_mobile: currentUser?.mobile || ''
            })
          };
          await addNotification(payload);
        } catch (notifErr) {
          console.error("Notification error:", notifErr);
        }
      }
      
      const normalizedNewRecord = {
        ...insertedData[0],
        status: 'Pending',
        request_status: 'Pending',
        reason: fullReason,
        request_reason: fullReason,
        sales_staff_name: currentUser?.name || 'Sales Staff',
        sales_staff_id: currentUser?.id || 'sales-user',
        customer_name: selectedUnlockLead.customer_name || 'Unknown'
      };

      setUnlockRequests(prev => [
        ...prev.filter(r => r.lead_id !== selectedUnlockLead.lead_id && r.order_id !== orderId),
        normalizedNewRecord
      ]);

      showToastMsg("Unlock request submitted successfully.", "success");
      setShowUnlockRequestModal(false);
      setSelectedUnlockLead(null);
    } catch (err: any) {
      console.error("Failed to submit unlock request:", err);
      showToastMsg(err.message || String(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelLead = async () => {
    const targetLeadId = createdLeadId || selectedLead?.lead_id;
    if (!targetLeadId) {
      showToastMsg("No lead found to cancel.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const existingLead = leads.find(l => l.lead_id === targetLeadId) || selectedLead;
      const leadBudget = existingLead?.budget || 0;

      const finalReason = "Cancelled";
      const cancellationNotes = createdLeadId ? "Cancelled during Step 2 creation" : "Cancelled during Operations configuration";

      let finalEventsList = [...(createdLeadId ? createEvents : crmEvents)];
      if (finalEventsList.length === 0 && (eventForm.event_type || eventForm.event_name || eventForm.event_date || eventForm.event_location)) {
        finalEventsList.push({
          id: `EV-${Math.floor(1000 + Math.random() * 9000)}`,
          event_type: eventForm.event_type || '',
          event_name: eventForm.event_name || '',
          event_shoot_type: eventForm.event_shoot_type || '',
          event_date: eventForm.event_date || '',
          event_start_time: eventForm.event_start_time || '',
          event_end_time: eventForm.event_end_time || '',
          event_location: eventForm.event_location || '',
          google_maps_link: eventForm.google_maps_link || '',
          guest_pax: eventForm.guest_pax || '',
          staff_pax: eventForm.staff_pax || '',
          event_start_date: eventForm.event_date || '',
          event_end_date: eventForm.event_end_date || ''
        } as any);
      }
      const firstEvent = finalEventsList[0] || {};
      const payload: any = {
        status: 'Lost Lead',
        current_status: 'Lost Lead',
        remarks: `Lost Reason: ${finalReason}. Notes: ${cancellationNotes}`,
        "Lost_Reason": finalReason,
        "Lost_Notes": cancellationNotes,
        lost_reason: finalReason,
        lost_notes: cancellationNotes,
        
        client_residence_address: createForm.client_residence_address || existingLead?.client_residence_address || '',
        city: createForm.city || existingLead?.city || '',
        state: createForm.state || existingLead?.state || '',
        pincode: createForm.pincode || existingLead?.pincode || '',
        
        event_type: firstEvent.event_type || '',
        custom_event_name: firstEvent.event_name || '',
        event_date: firstEvent.event_date || '',
        event_start_time: firstEvent.event_start_time || null,
        event_end_time: firstEvent.event_end_time || null,
        event_location: firstEvent.event_location || '',
        google_maps_link: firstEvent.google_maps_link || '',
        event_shoot_type: firstEvent.event_shoot_type || '',
        guest_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        staff_pax: firstEvent.staff_pax !== '' && firstEvent.staff_pax != null ? Number(firstEvent.staff_pax) : null,
        
        next_follow_up_date: step2FollowUpDate || null,
        follow_up_notes: step2FollowUpNotes || null,
        
        events: finalEventsList
      };

      await updateLead(targetLeadId, payload);

      await updateLeadFollowUp(
        targetLeadId,
        'Lost Lead',
        finalReason,
        step2FollowUpDate || '',
        Number(leadBudget),
        cancellationNotes
      );

      showToastMsg("Lead marked as Lost successfully.", "success");
      setShowCancelConfirmPopup(false);
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      console.error("Error marking lead as Lost:", err);
      showToastMsg(`Failed to mark lead as Lost: ${err.message || err}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // On-change/blur handler for phone/email inputs to detect repeat customers
  const handleCheckExistingCustomer = (type: 'phone' | 'email', value: string) => {
    if (!value || value.length < 5) return;
    const parsedCustomers = getCustomers(leads, orders, payments || []);
    
    const matched = parsedCustomers.find(c => {
      if (type === 'phone') {
        const cleanInput = String(value).replace(/[^\d]/g, '').slice(-10);
        if (!cleanInput || cleanInput.length < 10) return false;
        const cleanMobile = String(c.mobile || '').replace(/[^\d]/g, '').slice(-10);
        const cleanAlt = String(c.alternate_mobile || '').replace(/[^\d]/g, '').slice(-10);
        return cleanInput === cleanMobile || (cleanAlt && cleanInput === cleanAlt);
      } else {
        const cleanInput = value.trim().toLowerCase();
        if (!cleanInput.includes('@')) return false;
        return c.email && c.email.trim().toLowerCase() === cleanInput;
      }
    });

    if (matched) {
      setDetectedCustomer(matched);
      setShowDetectionPopup(true);
    }
  };

  // Handle repeat bookings (Pre-fills customized data and issues a Lead AND dynamic Order immediately)
  const handleExecuteQuickReorder = async (cust: any) => {
    if (!reorderForm.event_date) {
      alert('Please specify the event date for the repeat customer booking.');
      return;
    }

    const newLeadId = await addLead({
      customer_name: cust.customer_name,
      mobile: cust.mobile,
      alternate_mobile: cust.alternate_mobile || undefined,
      whatsapp_number: cust.whatsapp_number || cust.mobile,
      email: cust.email,
      address: cust.address,
      city: cust.city,
      state: cust.state,
      pincode: cust.pincode,
      client_residence_address: cust.client_residence_address,
      lead_source: 'Repeat Customer Desk',
      event_type: reorderForm.event_type,
      custom_event_name: reorderForm.event_type === 'Other' ? reorderForm.custom_event_name : undefined,
      custom_event_type: reorderForm.event_type === 'Other' ? reorderForm.custom_event_name : undefined,
      event_date: reorderForm.event_date,
      event_time: reorderForm.event_time,
      event_location: reorderForm.event_location,
      budget: Number(reorderForm.quotation_amount),
      remarks: `Dynamic Repeat reservation. [CUST_ID: ${cust.customer_id}]`
    });

    const newOrderId = await confirmOrder(
      newLeadId,
      reorderForm.package_name,
      Number(reorderForm.quotation_amount),
      Number(reorderForm.advance_received)
    );

    alert(`Success! Repeat booking completed.\nNew Lead ID: ${newLeadId}\nNew Order ID: ${newOrderId}\nSame Customer ID: ${cust.customer_id}`);

    // Reset forms and view
    setShowDetectionPopup(false);
    setIsQuickReorderView(false);
    setDetectedCustomer(null);
    setReorderForm({
      event_type: '',
      custom_event_name: '',
      custom_event_type: '',
      event_date: '',
      event_time: '',
      event_location: '',
      package_name: '',
      quotation_amount: 0,
      advance_received: 0,
    });
    setActiveTab('list');
  };

  // Wizard action helpers and handlers
  const autoScrollToFormHeader = () => {
    const el = document.getElementById('create_lead_form_heading');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const formEl = document.getElementById('create_lead_form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const getRemarksPayload = (formRemarks: string, intNotes: string, fDate: string, wNum: string, adr: string, cty: string, resAdr?: string) => {
    let result = '';
    if (wNum) result += `WhatsApp: ${wNum}\n`;
    if (adr) result += `Event Venue: ${adr}\n`;
    if (resAdr) result += `Residence: ${resAdr}\n`;
    if (cty) result += `City: ${cty}\n`;
    if (fDate) result += `Follow-up Date: ${fDate}\n`;
    if (intNotes) result += `Internal Notes: ${intNotes}\n`;
    if (formRemarks) result += `Remarks: ${formRemarks}\n`;
    
    if (selectedPkgIds.length > 0) {
      result += `\n--- Selected Package Customizations ---\n`;
      selectedPkgIds.forEach(id => {
        const p = PACKAGES_LIST.flatMap(cat => cat.items).find(item => item.id === id);
        if (p) {
          result += `Package: ${p.name}\n`;
          result += `  Custom Price: ‚Çπ${(pkgPrices[id] !== undefined ? pkgPrices[id] : p.cost).toLocaleString('en-IN')}\n`;
          result += `  Deliverables: ${pkgDeliverables[id] || 'N/A'}\n`;
          result += `  Notes: ${pkgNotes[id] || 'N/A'}\n`;
        }
      });
    }
    return result;
  };

  const handleSaveEventForm = (isCrm: boolean = !!selectedLead, addAnother: boolean = false) => {
    if (!eventForm.event_type) {
      showValidationError("input_event_type", "Event Type is required.");
      return;
    }
    if (!eventForm.event_date) {
      showValidationError("input_event_date", "Event Date is required.");
      return;
    }
    if (!eventForm.event_location.trim()) {
      showValidationError("input_event_location", "Event Location is required.");
      return;
    }

    const dateTimeErrMsg = getEventDateTimeErrorMessage(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time);
    if (dateTimeErrMsg) {
      showToastMsg(dateTimeErrMsg, "error");
      return;
    }

    const guestPaxVal = eventForm.guest_pax !== '' ? Math.max(0, parseInt(String(eventForm.guest_pax)) || 0) : '';
    const staffPaxVal = eventForm.staff_pax !== '' ? Math.max(0, parseInt(String(eventForm.staff_pax)) || 0) : '';

    const eventData = {
      ...eventForm,
      guest_pax: guestPaxVal,
      staff_pax: staffPaxVal,
      event_start_date: eventForm.event_date,
      event_end_date: eventForm.event_end_date || ''
    };

    const savedEventType = eventForm.event_type;

    if (isCrm) {
      if (editingEventId) {
        setCrmEvents(prev => prev.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev));
        showToastMsg("Event updated in list.", "success");
      } else {
        const newEv: LeadEvent = {
          ...eventData,
          id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
        };
        setCrmEvents(prev => [...prev, newEv]);
        showToastMsg("Event added to list.", "success");
      }
    } else {
      if (editingEventId) {
        setCreateEvents(prev => prev.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev));
        showToastMsg("Event updated in list.", "success");
      } else {
        const newEv: LeadEvent = {
          ...eventData,
          id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
        };
        setCreateEvents(prev => [...prev, newEv]);
        showToastMsg("Event added to list.", "success");
      }
    }

    setEditingEventId(null);

    if (addAnother) {
      setEventForm({
        event_type: '',
        event_name: '',
        event_shoot_type: '',
        event_date: '',
        event_start_time: '',
        event_end_time: '',
        event_location: '',
        google_maps_link: '',
        guest_pax: "" as any,
        staff_pax: "" as any,
        event_start_date: '',
        event_end_date: ''
      });
      setShowEventForm(true);
    } else {
      setShowEventForm(false);
    }
  };

  const handleEditEvent = (ev: LeadEvent) => {
    setEditingEventId(ev.id);
    const startDate = ev.event_start_date || ev.event_date || '';
    const endDate = ev.event_end_date || (ev as any).Event_End_Date || (ev as any).Event_end_date || '';
    const startTime = ev.event_start_time || (ev as any).start_time || (ev as any).event_time || '';
    const endTime = ev.event_end_time || (ev as any).end_time || '';
    const location = ev.event_location || (ev as any).location || (ev as any).venue_address || '';
    const maps = ev.google_maps_link || (ev as any).maps_link || '';

    setEventForm({
      event_type: ev.event_type || '',
      event_name: ev.event_name || '',
      event_shoot_type: ev.event_shoot_type || '',
      event_date: startDate,
      event_start_date: startDate,
      event_end_date: endDate,
      event_start_time: startTime,
      event_end_time: endTime,
      event_location: location,
      google_maps_link: maps,
      guest_pax: ev.guest_pax !== null && ev.guest_pax !== undefined ? ev.guest_pax : ('' as any),
      staff_pax: ev.staff_pax !== null && ev.staff_pax !== undefined ? ev.staff_pax : ('' as any),
      reporting_date: ev.reporting_date || '',
      reporting_time: ev.reporting_time || ''
    });
    setShowEventForm(true);
  };

  const handleDeleteEvent = (id: string, isCrm: boolean = !!selectedLead) => {
    if (isCrm) {
      setCrmEvents(prev => prev.filter(ev => ev.id !== id));
    } else {
      setCreateEvents(prev => prev.filter(ev => ev.id !== id));
    }
    showToastMsg("Event removed from list.", "success");
  };

  const handleAddNewEventClick = (isCrm: boolean = !!selectedLead) => {
    setEditingEventId(null);
    setEventForm({
      event_type: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_time: '',
      event_end_time: '',
      event_location: '',
      google_maps_link: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      event_start_date: '',
      event_end_date: ''
    });
    setShowEventForm(true);
  };

  const formatDDMMYYYY = (dateStr: string | undefined | null): string => {
    if (!dateStr) return 'N/A';
    const clean = dateStr.trim();
    if (!clean) return 'N/A';
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) return clean;
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return clean;
  };

  const convertTo24Hour = (timeStr: string | undefined | null): string => {
    if (!timeStr) return '';
    const clean = timeStr.trim().toUpperCase();
    if (!clean) return '';

    // Match 12-hour AM/PM format (e.g., "08:00 AM", "8:00:00 AM", "12:30 PM", "01:00:00 PM")
    const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const period = ampmMatch[3];

      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      const hh = String(hours).padStart(2, '0');
      return `${hh}:${minutes}`;
    }

    // Check if it's in 24-hour format with or without seconds (e.g., "14:30", "14:30:00", "8:30:00")
    const hhmmssMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hhmmssMatch) {
      const hh = String(parseInt(hhmmssMatch[1], 10)).padStart(2, '0');
      const mm = hhmmssMatch[2];
      return `${hh}:${mm}`;
    }

    return '';
  };

  const convertTo12Hour = (timeStr: string | undefined | null): string => {
    if (!timeStr) return '';
    const clean = timeStr.trim();
    if (!clean) return '';

    // If it already has AM/PM, format nicely
    if (clean.toUpperCase().includes('AM') || clean.toUpperCase().includes('PM')) {
      const ampmMatch = clean.toUpperCase().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
      if (ampmMatch) {
        const hh = String(parseInt(ampmMatch[1], 10)).padStart(2, '0');
        const mm = ampmMatch[2];
        const period = ampmMatch[3];
        return `${hh}:${mm} ${period}`;
      }
      return clean;
    }

    // Match 24-hour format HH:MM or HH:MM:SS
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) {
      return clean;
    }

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    if (hours === 0) {
      hours = 12;
    }

    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes} ${period}`;
  };

  const parseDateParts = (dStr: string | undefined | null): { year: number; month: number; day: number } | null => {
    if (!dStr) return null;
    const clean = dStr.trim();
    if (!clean) return null;

    // YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { year, month, day };
      }
    }

    // DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { year, month, day };
      }
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate()
      };
    }

    return null;
  };

  const parseTimeParts = (tStr: string | undefined | null): { hours: number; minutes: number } | null => {
    if (!tStr) return null;
    const clean = tStr.trim();
    if (!clean) return null;

    const t24 = convertTo24Hour(clean);
    if (!t24) return null;

    const parts = t24.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        return { hours, minutes };
      }
    }
    return null;
  };

  const buildDateTime = (
    dateStr: string | undefined | null,
    timeStr: string | undefined | null,
    defaultTime: { hours: number; minutes: number }
  ): Date | null => {
    const dParts = parseDateParts(dateStr);
    if (!dParts) return null;

    const tParts = parseTimeParts(timeStr) || defaultTime;
    return new Date(dParts.year, dParts.month - 1, dParts.day, tParts.hours, tParts.minutes, 0, 0);
  };

  const normalizeDateStr = (dStr: string | undefined | null): string => {
    const parts = parseDateParts(dStr);
    if (!parts) return dStr ? dStr.trim() : '';
    const y = parts.year;
    const m = String(parts.month).padStart(2, '0');
    const d = String(parts.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEventDateTimeErrorMessage = (
    startDate: string | undefined | null,
    endDate: string | undefined | null,
    startTime: string | undefined | null,
    endTime: string | undefined | null
  ): string | null => {
    if (!startDate || startDate.trim() === '') return null;

    const startParts = parseDateParts(startDate);
    if (!startParts) return null;

    const effectiveEndDate = endDate && endDate.trim() !== '' ? endDate : startDate;
    const endParts = parseDateParts(effectiveEndDate);
    if (!endParts) return null;

    // Rule 3 ‚Äì Check if End Date is earlier than Start Date
    if (
      startParts.year > endParts.year ||
      (startParts.year === endParts.year && startParts.month > endParts.month) ||
      (startParts.year === endParts.year && startParts.month === endParts.month && startParts.day > endParts.day)
    ) {
      return "Event End Date cannot be earlier than Event Start Date.";
    }

    const isSameDate =
      startParts.year === endParts.year &&
      startParts.month === endParts.month &&
      startParts.day === endParts.day;

    // Rule 1 ‚Äì If Start Date and End Date are the same date
    if (isSameDate) {
      const startT = parseTimeParts(startTime);
      const endT = parseTimeParts(endTime);
      if (startT && endT) {
        const startMin = startT.hours * 60 + startT.minutes;
        const endMin = endT.hours * 60 + endT.minutes;
        if (endMin <= startMin) {
          return "End Time must be later than Start Time when the Event Start Date and Event End Date are the same.";
        }
      }
    }

    // Rule 2 ‚Äì Different Start Date & End Date (End Date > Start Date): any End Time allowed
    return null;
  };

  const isEventDateTimeInvalid = (
    startDate: string | undefined | null,
    endDate: string | undefined | null,
    startTime: string | undefined | null,
    endTime: string | undefined | null
  ): boolean => {
    return getEventDateTimeErrorMessage(startDate, endDate, startTime, endTime) !== null;
  };

  const isTimeEarlier = (start: string | undefined | null, end: string | undefined | null): boolean => {
    return isEventDateTimeInvalid(eventForm.event_date, eventForm.event_end_date, start, end);
  };

  const renderEventDetailsSection = (isCrm: boolean) => {
    const eventsList = isCrm ? crmEvents : createEvents;
    const isNewFormVisible = !editingEventId && (showEventForm || eventsList.length === 0);

    const renderFormFields = (isEditingThisEvent: boolean) => (
      <div className="space-y-4">
        {/* Event Type */}
        <div className="text-left">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Event Type *
          </label>
          <select
            id="input_event_type"
            value={eventForm.event_type}
            onChange={(e) => {
              const val = e.target.value;
              setEventForm(prev => ({
                ...prev,
                event_type: val,
                event_name: prev.event_name || ''
              }));
            }}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all cursor-pointer font-bold"
          >
            <option value="">Select Event Type</option>
            {EVENT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Conditional Event Details fields displayed only after Event Type is selected */}
        {eventForm.event_type && eventForm.event_type !== '' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            {/* Event Name */}
            <div className="sm:col-span-2 text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event Name
              </label>
              <input
                id="input_event_name"
                type="text"
                placeholder="e.g. Sangeet, Haldi, Reception"
                value={eventForm.event_name}
                onChange={(e) => setEventForm({ ...eventForm, event_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Event Date */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event Date *
              </label>
              <input
                id="input_event_date"
                type="date"
                required
                value={eventForm.event_date}
                onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>

            {/* Event Start Time */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event Start Time
              </label>
              <input
                id="input_event_start_time"
                type="time"
                value={convertTo24Hour(eventForm.event_start_time)}
                onChange={(e) => {
                  const val24 = e.target.value;
                  const val12 = convertTo12Hour(val24);
                  setEventForm({ ...eventForm, event_start_time: val12 });
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
              />
            </div>

            {/* Event End Date */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event End Date
              </label>
              <input
                id="input_event_end_date"
                type="date"
                value={eventForm.event_end_date || ''}
                onChange={(e) => setEventForm({ ...eventForm, event_end_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
              />
            </div>

            {/* Event End Time */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event End Time
              </label>
              <input
                id="input_event_end_time"
                type="time"
                value={convertTo24Hour(eventForm.event_end_time)}
                onChange={(e) => {
                  const val24 = e.target.value;
                  const val12 = convertTo12Hour(val24);
                  setEventForm({ ...eventForm, event_end_time: val12 });
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
              />
              {(() => {
                const dateTimeErrMsg = getEventDateTimeErrorMessage(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time);
                return dateTimeErrMsg ? (
                  <p className="text-[11px] text-rose-400 mt-1 animate-fade-in font-medium">
                    {dateTimeErrMsg}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Event Location - Multiline Address */}
            <div className="sm:col-span-2 text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event Location * (Venue Address)
              </label>
              <textarea
                required
                rows={3}
                placeholder="Enter the full event location and venue address details"
                value={eventForm.event_location}
                onChange={(e) => setEventForm({ ...eventForm, event_location: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none"
              />
            </div>

            {/* Google Maps Link */}
            <div className="sm:col-span-2 text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Google Maps Location Link (Optional)
              </label>
              <input
                type="url"
                placeholder="e.g. https://maps.app.goo.gl/..."
                value={eventForm.google_maps_link}
                onChange={(e) => setEventForm({ ...eventForm, google_maps_link: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Guest Pax */}
            <div className="sm:col-span-2 text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Guest Pax
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 150"
                value={eventForm.guest_pax}
                onChange={(e) => setEventForm({ ...eventForm, guest_pax: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>

            {/* Save Event Buttons */}
            <div className="sm:col-span-2 flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEventId(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {isEditingThisEvent ? (
                <button
                  type="button"
                  onClick={() => handleSaveEventForm(isCrm, false)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-slate-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Update Event
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSaveEventForm(isCrm, false)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Save Event
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEventForm(isCrm, true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-slate-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Save & Add Another Event
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-4">
        {/* Render Event Cards */}
        {eventsList.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Added Events ({eventsList.length})
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {eventsList.map((ev, idx) => {
                const isEditingThisEvent = editingEventId === ev.id;
                const isCollapsed = collapsedEventIds[ev.id] ?? true;
                const startDateStr = formatDDMMYYYY(ev.event_start_date || ev.event_date);
                const endDateRaw = ev.event_end_date || (ev as any).Event_End_Date || '';
                const endDateStr = endDateRaw ? formatDDMMYYYY(endDateRaw) : 'N/A';
                const startTimeStr = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A';
                const endTimeStr = ev.event_end_time ? convertTo12Hour(ev.event_end_time) : 'N/A';

                const guestPaxVal = ev.guest_pax !== '' && ev.guest_pax !== null && ev.guest_pax !== undefined ? ev.guest_pax : 'N/A';
                const staffPaxVal = ev.staff_pax !== '' && ev.staff_pax !== null && ev.staff_pax !== undefined ? ev.staff_pax : 'N/A';

                const dateTimeSummary = (() => {
                  const startPart = `${startDateStr} ‚Ä¢ ${startTimeStr}`;
                  if (endDateRaw && endDateStr !== 'N/A') {
                    return `${startPart} ‚Üí ${endDateStr} ‚Ä¢ ${endTimeStr}`;
                  } else if (endTimeStr !== 'N/A') {
                    return `${startPart} ‚Üí ${endTimeStr}`;
                  }
                  return startPart;
                })();

                if (isEditingThisEvent) {
                  return (
                    <div key={ev.id} className="bg-slate-900 border border-cyan-500/50 rounded-xl p-4 space-y-4 shadow-lg animate-fade-in text-left">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Edit className="w-3.5 h-3.5" /> Edit Event {idx + 1}: {ev.event_name || ev.event_type}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEventId(null);
                            setShowEventForm(false);
                          }}
                          className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      {renderFormFields(true)}
                    </div>
                  );
                }

                return (
                  <div key={ev.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                    <div 
                      className="flex items-center justify-between p-3.5 bg-slate-950/40 cursor-pointer select-none border-b border-slate-800/40 hover:bg-slate-950/60 transition-colors"
                      onClick={() => setCollapsedEventIds(prev => ({ ...prev, [ev.id]: !isCollapsed }))}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="bg-cyan-500/10 text-cyan-400 p-1.5 rounded-lg shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="text-left space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100">{ev.event_name || `Event ${idx + 1}`}</span>
                            <span className="text-xs text-slate-500 font-mono">|</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                              {ev.event_type}
                            </span>
                          </div>

                          {/* Show compact summary ONLY when COLLAPSED */}
                          {isCollapsed && (
                            <>
                              <p className="text-[11px] text-slate-300 font-mono">
                                {dateTimeSummary}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                Guest Pax: <span className="text-slate-200 font-semibold">{guestPaxVal}</span>
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleEditEvent(ev)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Edit Event"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id, isCrm)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove Event"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCollapsedEventIds(prev => ({ ...prev, [ev.id]: !isCollapsed }))}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-4 bg-slate-900/50 text-xs text-slate-300 space-y-3">
                        {/* Event Name & Type Info Header if name differs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Event Name</span>
                            <span className="text-slate-100 font-semibold">{ev.event_name || `Event ${idx + 1}`}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Event Type</span>
                            <span className="text-slate-100 font-semibold">{ev.event_type}</span>
                          </div>
                          {(ev.event_shoot_type || (ev as any).shoot_type) && (
                            <div>
                              <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Event Shoot Type</span>
                              <span className="text-slate-100 font-semibold">{ev.event_shoot_type || (ev as any).shoot_type}</span>
                            </div>
                          )}
                        </div>

                        {/* Dates & Times Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Start Date</span>
                            <span className="text-slate-200 font-semibold">{startDateStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Start Time</span>
                            <span className="text-slate-200 font-semibold">{startTimeStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">End Date</span>
                            <span className="text-slate-200 font-semibold">{endDateStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">End Time</span>
                            <span className="text-slate-200 font-semibold">{endTimeStr}</span>
                          </div>
                        </div>

                        {/* Pax Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Guest Pax</span>
                            <span className="text-slate-200 font-semibold">{guestPaxVal}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Staff Pax</span>
                            <span className="text-slate-200 font-semibold">{staffPaxVal}</span>
                          </div>
                        </div>

                        {/* Reporting Info if present */}
                        {(ev.reporting_date || ev.reporting_time) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
                            {ev.reporting_date && (
                              <div>
                                <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Reporting Date</span>
                                <span className="text-slate-200 font-semibold">{formatDDMMYYYY(ev.reporting_date)}</span>
                              </div>
                            )}
                            {ev.reporting_time && (
                              <div>
                                <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Reporting Time</span>
                                <span className="text-slate-200 font-semibold">{convertTo12Hour(ev.reporting_time)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Venue Address */}
                        <div className="border-t border-slate-800/40 pt-2.5 text-left">
                          <span className="text-slate-400 block mb-1 text-[10px] font-sans font-bold uppercase tracking-wider">Venue Address / Location:</span>
                          <p className="text-slate-200 bg-slate-950/20 p-2 rounded border border-slate-850/50 whitespace-pre-wrap font-mono">
                            {ev.event_location || 'N/A'}
                          </p>
                        </div>

                        {/* Google Maps Link */}
                        {ev.google_maps_link && (
                          <div className="flex items-center gap-1.5 text-cyan-400 text-left pt-1 font-mono text-[11px]">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <a 
                              href={ev.google_maps_link} 
                              target="_blank" 
                              referrerPolicy="no-referrer"
                              rel="noopener noreferrer" 
                              className="hover:underline break-all"
                            >
                              {ev.google_maps_link}
                            </a>
                          </div>
                        )}

                        {/* Assigned Staff if present */}
                        {ev.assigned_staff_names && (
                          <div className="border-t border-slate-800/40 pt-2 text-left font-mono">
                            <span className="text-slate-400 block mb-0.5 text-[10px] font-sans font-bold uppercase tracking-wider">Assigned Staff:</span>
                            <span className="text-slate-200">{ev.assigned_staff_names}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inline Event Form for New Event */}
        {isNewFormVisible ? (
          <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-4 space-y-4 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Event Details
              </span>
              {eventsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEventId(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
            {renderFormFields(false)}
          </div>
        ) : (
          /* Add Another Event Button */
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => handleAddNewEventClick(isCrm)}
              className="flex items-center gap-1.5 border border-dashed border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 bg-slate-900/30 px-4 py-2.5 rounded-lg text-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Another Event</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleWizardNext = async () => {
    if (isSaving) return;

    let finalUser: any = null;

    if (wizardStep === 1) {
      if (!createForm.mobile) {
        showValidationError("input_mobile", "Phone Number is required.");
        return;
      }
      if (!createForm.lead_source || createForm.lead_source === '') {
        showValidationError("input_lead_source", "Lead Source is required.");
        return;
      }

      // Check Supabase Authentication and Session before creating lead
      if (supabaseClient) {
        try {
          const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
          const { data: userData, error: userErr } = await supabaseClient.auth.getUser();

          const session = sessionData?.session;
          const authUser = userData?.user;

          console.log('SESSION', session);
          console.log('USER', authUser);

          if (sessionErr || userErr) {
            console.warn("Session/user fetch error:", sessionErr || userErr);
          }

          // If BOTH session and authUser are null AND we don't have a currentUser in React state
          if (!session && !authUser && !currentUser) {
            showToastMsg("Please login again.", "error");
            return;
          }

          // Check if session is expired
          const isExpired = session?.expires_at ? (session.expires_at <= Math.floor(Date.now() / 1000)) : false;
          if (isExpired && !authUser) {
            showToastMsg("Session expired.", "error");
            return;
          }

          // Users Table Lookup
          const currentUid = authUser?.id || session?.user?.id || currentUser?.id;
          const emailFromAuth = authUser?.email || session?.user?.email || currentUser?.email;

          let dbUser: any = null;
          if (currentUid) {
            const { data: userById, error: dbUserErr } = await supabaseClient
              .from('users')
              .select('*')
              .eq('id', currentUid)
              .maybeSingle();

            dbUser = userById;
            if (dbUserErr) {
              console.warn("Users table lookup failed in UI:", dbUserErr.message);
            }
          }

          if (!dbUser && emailFromAuth) {
            const { data: dbUserByEmail } = await supabaseClient
              .from('users')
              .select('*')
              .eq('email', emailFromAuth.toLowerCase().trim())
              .maybeSingle();
            
            if (dbUserByEmail && currentUid) {
              console.log("Aligning user profile ID during lead creation...");
              await supabaseClient
                .from('users')
                .update({ id: currentUid })
                .eq('email', emailFromAuth.toLowerCase().trim());
              dbUser = { ...dbUserByEmail, id: currentUid };
            } else if (dbUserByEmail) {
              dbUser = dbUserByEmail;
            }
          }

          finalUser = currentUser;
          if (dbUser) {
            finalUser = mapUserFieldsFromDb(dbUser);
          }

          if (!finalUser) {
            showToastMsg("User record missing from users table.", "error");
            return;
          }

          if (emailFromAuth && finalUser.email && finalUser.email.toLowerCase().trim() !== emailFromAuth.toLowerCase().trim()) {
            showToastMsg("User record email does not match logged-in account.", "error");
            return;
          }

          if (!finalUser.role) {
            showToastMsg("User role not loaded correctly.", "error");
            return;
          }

          if (!finalUser.active) {
            showToastMsg("User account is deactivated.", "error");
            return;
          }

          if (finalUser.role !== 'Sales Team' && finalUser.role !== 'Business Owner') {
            showToastMsg("User does not have permission to create quotations.", "error");
            return;
          }
        } catch (authErr: any) {
          showToastMsg(`Authentication error: ${authErr.message || authErr}`, "error");
          return;
        }
      } else {
        if (!currentUser) {
          showToastMsg("Please login again.", "error");
          return;
        }
        finalUser = currentUser;
        if (currentUser.role !== 'Sales Team' && currentUser.role !== 'Business Owner') {
          showToastMsg("User does not have permission to create quotations.", "error");
          return;
        }
      }

      const mobileVal = String(createForm.mobile || '').trim();
      if (!/^\d{10}$/.test(mobileVal)) {
        showToastMsg("Please enter a valid 10-digit mobile number.", "error");
        return;
      }
      if (createForm.email && createForm.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(createForm.email.trim())) {
          showToastMsg("Please enter a valid email address.", "error");
          return;
        }
      }

      try {
        setIsSaving(true);
        const finalSource = createForm.lead_source === 'Other' ? 'Other' : createForm.lead_source;
        const customLeadSourceName = createForm.lead_source === 'Other' && otherSource.trim() !== '' ? otherSource.trim() : null;
        let finalId = createdLeadId;
        if (!createdLeadId) {
          const newId = await addLead({
            customer_name: createForm.customer_name || '',
            mobile: createForm.mobile,
            alternate_mobile: (createForm.alternate_mobile && String(createForm.alternate_mobile).trim() !== '' && String(createForm.alternate_mobile).trim() !== '+91') ? String(createForm.alternate_mobile) : undefined,
            email: createForm.email,
            lead_source: finalSource,
            Specify_Custom_Lead_Source_Name: customLeadSourceName,
            whatsapp_number: createForm.whatsapp_number,
            address: createForm.address,
            city: createForm.city,
            state: createForm.state,
            pincode: createForm.pincode,
            client_residence_address: createForm.client_residence_address,
            shoot_type: createForm.shoot_type,
            desired_event_shoot_type: createForm.desired_event_shoot_type,
            total_pax: createForm.total_pax !== '' ? Number(createForm.total_pax) : undefined,
            reference_source: createForm.reference_source,
            booking_status: createForm.booking_status || undefined,
            event_type: createForm.event_type || '',
            event_date: createForm.event_date || '',
            event_time: createForm.event_time || '',
            event_location: createForm.event_location || '',
            budget: Number(createForm.budget) || 0,
            remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
            Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
          });
          setCreatedLeadId(newId);
          finalId = newId;
          console.log(`Created lead with ID: ${newId}`);
        } else {
          await updateLead(createdLeadId, {
            customer_name: createForm.customer_name || '',
            mobile: createForm.mobile,
            alternate_mobile: (createForm.alternate_mobile && String(createForm.alternate_mobile).trim() !== '' && String(createForm.alternate_mobile).trim() !== '+91') ? String(createForm.alternate_mobile) : undefined,
            email: createForm.email,
            lead_source: finalSource,
            Specify_Custom_Lead_Source_Name: customLeadSourceName,
            whatsapp_number: createForm.whatsapp_number,
            address: createForm.address,
            city: createForm.city,
            state: createForm.state,
            pincode: createForm.pincode,
            client_residence_address: createForm.client_residence_address,
            desired_event_shoot_type: createForm.desired_event_shoot_type,
            total_pax: createForm.total_pax !== '' ? Number(createForm.total_pax) : undefined,
            reference_source: createForm.reference_source,
            booking_status: createForm.booking_status || undefined,
            remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
            Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
          });
        }
        const isEdit = !!createdLeadId;

        const newLeadObj: Lead = {
          lead_id: finalId,
          customer_name: createForm.customer_name || '',
          mobile: createForm.mobile,
          alternate_mobile: (createForm.alternate_mobile && String(createForm.alternate_mobile).trim() !== '' && String(createForm.alternate_mobile).trim() !== '+91') ? String(createForm.alternate_mobile) : undefined,
          email: createForm.email,
          lead_source: finalSource,
            Specify_Custom_Lead_Source_Name: customLeadSourceName,
          whatsapp_number: createForm.whatsapp_number,
          address: createForm.address,
          city: createForm.city,
          state: createForm.state,
          pincode: createForm.pincode,
          client_residence_address: createForm.client_residence_address,
          shoot_type: createForm.shoot_type,
          desired_event_shoot_type: createForm.desired_event_shoot_type,
          total_pax: createForm.total_pax !== '' ? Number(createForm.total_pax) : undefined,
          reference_source: createForm.reference_source,
          booking_status: createForm.booking_status || 'Pending',
          event_type: createForm.event_type || 'Other',
          event_date: createForm.event_date || new Date().toISOString().split('T')[0],
          event_time: createForm.event_time || '12:00',
          event_location: createForm.event_location || 'TBD',
          budget: Number(createForm.budget) || 0,
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
          next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
          Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || '',
          status: 'Create Quote',
          created_date: new Date().toISOString().split('T')[0],
          sales_person: finalUser?.name || currentUser?.name || 'Sales Team',
          created_by: finalUser?.name || currentUser?.name || 'Sales Team'
        };

        // Stay in Create Lead form, and advance to Step 2
        setWizardStep(2);

        showToastMsg("Inbound quotation created successfully! Continuing to Step 2.", "success");
      } catch (err: any) {
        console.error("Step 1 saving failed:", err);
  
      const errMsg = err.message || String(err);
      
      if (errMsg.includes('FATAL_MISSING_COLUMN')) {
        const parts = errMsg.split('||');
        const table = parts[1] || 'leads';
        const col = parts[2] || 'Unknown';
        const sql = `ALTER TABLE "${table}" ADD COLUMN "${col}" numeric;`;
        const colType = col === 'Specify_Custom_Lead_Source_Name' ? 'text' : 'numeric';
        const properSql = `ALTER TABLE "${table}" ADD COLUMN "${col}" ${colType};`;
        
        showToastMsg(`CRITICAL DB ERROR:\nTable: ${table}\nMissing Column: ${col}\nSuggested SQL: ${properSql}`, "error");
        setIsSaving(false);
        return;
      }

        let displayedMsg = errMsg;
        
        const lowerMsg = errMsg.toLowerCase();
        if (lowerMsg.includes("row-level security policy") || lowerMsg.includes("rls") || lowerMsg.includes("security policy")) {
          displayedMsg = "Lead insert blocked by RLS policy.";
        } else if (lowerMsg.includes("user record missing") || lowerMsg.includes("missing from users table") || lowerMsg.includes("missing from users")) {
          displayedMsg = "User record missing from users table.";
        } else if (lowerMsg.includes("session expired") || lowerMsg.includes("jwt expired")) {
          displayedMsg = "Session expired.";
        } else if (lowerMsg.includes("permission") || lowerMsg.includes("permission denied")) {
          displayedMsg = "User does not have permission to create quotations.";
        } else if (lowerMsg.includes("login") || lowerMsg.includes("unauthenticated") || lowerMsg.includes("jwt")) {
          displayedMsg = "Please login again.";
        } else {
          displayedMsg = errMsg;
        }
        
        showToastMsg(displayedMsg, "error");
      } finally {
        setIsSaving(false);
      }
    }

    else if (wizardStep === 2) {
      let finalEventsList = [...createEvents];
      
      // If eventForm is visible or there are no events in the list, validate and add
      if (showEventForm || finalEventsList.length === 0) {
        if (!eventForm.event_type || eventForm.event_type === '') {
          showValidationError("input_event_type", "Please select Event Type.");
          return;
        }
        if (!eventForm.event_date || eventForm.event_date === '') {
          showValidationError("input_event_date", "Please select Event Date.");
          return;
        }
        if (!eventForm.event_location || eventForm.event_location.trim() === '') {
          showValidationError("input_event_location", "Please enter Event Location.");
          return;
        }
        const dateTimeErrMsg = getEventDateTimeErrorMessage(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time);
        if (dateTimeErrMsg) {
          showValidationError("input_event_end_time", dateTimeErrMsg);
          return;
        }

        const guestPaxVal = eventForm.guest_pax !== '' ? Math.max(0, parseInt(String(eventForm.guest_pax)) || 0) : '';
        const staffPaxVal = eventForm.staff_pax !== '' ? Math.max(0, parseInt(String(eventForm.staff_pax)) || 0) : '';

        const eventData = {
          ...eventForm,
          guest_pax: guestPaxVal,
          staff_pax: staffPaxVal,
          event_start_date: eventForm.event_date,
          event_end_date: eventForm.event_end_date || ''
        };

        if (editingEventId) {
          finalEventsList = finalEventsList.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev);
        } else {
          finalEventsList.push({
            ...eventData,
            id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
          });
        }
        
        setCreateEvents(finalEventsList);
        setEditingEventId(null);
        setShowEventForm(false);
      }

      if (finalEventsList.length === 0) {
        showToastMsg("Please add at least one event.", "error");
        return;
      }

      // Pre-validate and format all events in the finalEventsList
      for (const ev of finalEventsList) {
        if (!ev.event_type || ev.event_type.trim() === '') {
          showToastMsg("Please select Event Type for all events.", "error");
          return;
        }
        if (ev.event_type === 'Other' && (!ev.event_name || ev.event_name.trim() === '')) {
          showToastMsg("Please enter Event Name for 'Other' event types.", "error");
          return;
        }
        if (!ev.event_date || ev.event_date.trim() === '') {
          showToastMsg("Please select Event Date for all events.", "error");
          return;
        }
        if (!ev.event_start_time || ev.event_start_time.trim() === '') {
          showToastMsg("Please select Event Start Time for all events.", "error");
          return;
        }
        if (!ev.event_end_time || ev.event_end_time.trim() === '') {
          showToastMsg("Please select Event End Time for all events.", "error");
          return;
        }
        if (!ev.event_location || ev.event_location.trim() === '') {
          showToastMsg("Please enter Event Location for all events.", "error");
          return;
        }
        
        try {
          ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          return;
        }
        try {
          ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          return;
        }
        
        const dateTimeErrMsg = getEventDateTimeErrorMessage(ev.event_date, ev.event_end_date, ev.event_start_time, ev.event_end_time);
        if (dateTimeErrMsg) {
          showToastMsg(dateTimeErrMsg, "error");
          return;
        }
      }

      const firstEvent = finalEventsList[0];

      try {
        await handleSaveStep2Direct();
      } catch (err: any) {
        console.error("Step 2 saving failed:", err);
  
      const errMsg = err.message || String(err);
      
      if (errMsg.includes('FATAL_MISSING_COLUMN')) {
        const parts = errMsg.split('||');
        const table = parts[1] || 'leads';
        const col = parts[2] || 'Unknown';
        const sql = `ALTER TABLE "${table}" ADD COLUMN "${col}" numeric;`;
        const colType = col === 'Specify_Custom_Lead_Source_Name' ? 'text' : 'numeric';
        const properSql = `ALTER TABLE "${table}" ADD COLUMN "${col}" ${colType};`;
        
        showToastMsg(`CRITICAL DB ERROR:\nTable: ${table}\nMissing Column: ${col}\nSuggested SQL: ${properSql}`, "error");
        setIsSaving(false);
        return;
      }

        let displayedMsg = errMsg;
        if (errMsg.toLowerCase().includes("database") || errMsg.toLowerCase().includes("connection") || errMsg.toLowerCase().includes("failed to fetch") || errMsg.toLowerCase().includes("supabase")) {
          displayedMsg = "Database save failed: connection error.";
        } else {
          displayedMsg = `Unable to save event details: ${errMsg}`;
        }
        showToastMsg(displayedMsg, "error");
      } finally {
        setIsSaving(false);
      }
    }

  };

  const handleStatusSave = async () => {
    if (isSaving) return;
    const finalStatus = salesStatus || 'New Lead';
    try {
      setIsSaving(true);

      // Save Packages
      const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
      if (selectedPkgIds.length > 0) {
        const packagesPayload = selectedPkgs.map(pkg => ({
          package_id: pkg.id,
          package_name: pkg.name,
          package_cost: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          quantity: 1,
          total_amount: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          discount: leadDiscount,
          final_amount: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          deliverables_description: pkgDeliverables[pkg.id] || pkg.deliverables || 'N/A',
          notes_special_customizations: pkgNotes[pkg.id] || '',
          additional_services_cost: 0,
          team_members: pkg.team_members || '',
          deliverables: pkg.deliverables || ''
        }));
        await saveLeadPackages(createdLeadId!, packagesPayload);
      }

      const activePkgId = createForm.Select_Package_Option || selectedPkgIds[0] || 'Custom Package';
      const activeEventsList = createEvents.length > 0 ? createEvents : [];
      const { teamMembersText, deliverablesText } = buildStep3EventPayloads(
        activePkgId,
        activeEventsList,
        editableInclusions,
        editableDeliverables
      );

      await updateLead(createdLeadId!, {
        status: finalStatus as CurrentStage,
        budget: finalTotal,
          package_price: finalTotal,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalTotal,
        deliverables_description: deliverablesText || selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
        notes_special_customizations: teamMembersText || selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
        sales_staff_name: salesStaffName,
        sales_staff_mobile: salesStaffMobile,
        client_residence_address: createForm.client_residence_address,
        city: createForm.city,
        state: createForm.state,
        pincode: createForm.pincode,
        desired_event_shoot_type: createForm.desired_event_shoot_type,
        remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
        Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
      });
      showToastMsg("‚úÖ Quotation created successfully.", "success");
      setStep3FollowUpDate(followUpDate || '');
      setStep3FollowUpTime('');
      setStep3FollowUpNotes(internalNotes || '');
      setShowStep3Popup(true);
    } catch (err: any) {
      console.error("Step 5 status save failed:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const targetLd = leads.find(l => l.lead_id === createdLeadId);
      const oldStatus = targetLd ? (targetLd.current_status || targetLd.status || 'New Lead') : null;
      const newStatus = finalStatus || null;

      logStatusUpdateError({
        leadId: createdLeadId || null,
        orderId: null,
        oldStatus,
        newStatus,
        updatePayload: {
          status: finalStatus,
          budget: finalTotal,
          package_price: finalTotal,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalTotal,
          Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
        },
        insertPayload: null,
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Lead Stage Transition Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderConfirmedSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    const targetLd = leads.find(l => l.lead_id === createdLeadId) || selectedLead;
    if (targetLd && !areReportingDetailsComplete(targetLd)) {
      openReportingDetailsModal(targetLd, "Please complete and save the Reporting Details before confirming the order.");
      return;
    }

    if (!confirmedEventDate) {
      showToastMsg("Please select Confirmed Event Date.", "error");
      return;
    }

    if (finalPackageAmount === undefined || finalPackageAmount === 0 || isNaN(finalPackageAmount)) {
      showToastMsg("Please enter Final Amount.", "error");
      return;
    }
    if (advanceReceived === undefined || isNaN(advanceReceived)) {
      showToastMsg("Please enter Advance Paid Amount.", "error");
      return;
    }

    try {
      setIsSaving(true);
      const selectedPkgsNames = selectedPkgs.map(p => p.name).join(' + ') || 'Custom Configured Coverage';
      await confirmOrder(
        createdLeadId!,
        selectedPkgsNames,
        finalPackageAmount,
        advanceReceived,
        confirmedEventDate,
        confirmedEventTime,
        'UPI / Cash / Bank Transfer',
        getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
        reportingTime
      );
      
      showToastMsg("Quotation created successfully.", "success");
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      console.error("Failed to commit confirmed order details:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const targetLd = leads.find(l => l.lead_id === createdLeadId);
      const oldStatus = targetLd ? (targetLd.current_status || targetLd.status || 'New Lead') : null;

      logStatusUpdateError({
        leadId: createdLeadId || null,
        orderId: null,
        oldStatus,
        newStatus: 'Order Confirmed',
        updatePayload: {
          status: 'Order Confirmed',
          event_date: confirmedEventDate,
          event_time: confirmedEventTime,
          reporting_time: reportingTime,
        },
        insertPayload: {
          order_status: 'Confirmed',
          current_stage: 'Order Confirmed',
          package_name: selectedPkgs.map(p => p.name).join(' + ') || 'Custom Configured Coverage',
          quotation_amount: finalPackageAmount,
          advance_received: advanceReceived,
        },
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Order Confirmation Pipeline Transition Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle follow up submit
  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    if (followUpForm.status === 'Order Confirmed' || followUpForm.status === 'Confirm Order') {
      if (!areReportingDetailsComplete(selectedLead)) {
        openReportingDetailsModal(selectedLead, "Please complete and save the Reporting Details before confirming the order.");
        return;
      }

      if (!followUpForm.event_date) {
        showToastMsg("Please select Confirmed Event Date.", "error");
        return;
      }

      if (followUpForm.quotation_amount === undefined || followUpForm.quotation_amount === 0 || isNaN(followUpForm.quotation_amount)) {
        showToastMsg("Please enter Final Amount.", "error");
        return;
      }
      if (followUpForm.advance_received === undefined || isNaN(followUpForm.advance_received) || Number(followUpForm.advance_received) <= 0) {
        showToastMsg("Please enter Advance Paid Amount.", "error");
        return;
      }
      if (!followUpForm.transaction_id || !followUpForm.transaction_id.trim()) {
        showToastMsg("Please enter Payment Tracking ID / Transaction Reference Number.", "error");
        return;
      }

      const packageName = packages?.find(p => String(p.package_id) === String(selectedLead.Select_Package_Option))?.package_name || selectedLead.Select_Package_Option || '';

      try {
        setIsSaving(true);
        await confirmOrder(
          selectedLead.lead_id,
          packageName,
          Number(followUpForm.quotation_amount),
          Number(followUpForm.advance_received),
          followUpForm.event_date,
          followUpForm.event_time,
          followUpForm.payment_mode || 'UPI',
          followUpForm.call_notes || 'Confirmed from CRM activity logger',
          followUpForm.reporting_time || '08:00',
          followUpForm.transaction_id
        );

        setSelectedLead(null);
        showToastMsg("Order Confirmed Successfully.", "success");
      } catch (err: any) {
        console.error("Failed to convert lead:", err);
        const errMsg = err?.message || String(err);
        const parsed = parseStatusUpdateError(errMsg);

        const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;

        logStatusUpdateError({
          leadId: selectedLead?.lead_id || null,
          orderId: null,
          oldStatus,
          newStatus: 'Order Confirmed',
          updatePayload: {
            status: 'Order Confirmed',
            remarks: followUpForm.call_notes
          },
          insertPayload: {
            order_status: 'Confirmed',
            current_stage: 'Order Confirmed',
            package_name: packageName,
            quotation_amount: Number(followUpForm.quotation_amount),
            advance_received: Number(followUpForm.advance_received),
          },
          dbResponse: null,
          fullError: err
        });

        setStatusError({
          title: "Follow-up Transition to Order Confirmed Failed",
          reason: parsed.reason,
          suggestedFix: parsed.suggestedFix
        });
        alert(parsed.reason);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!followUpForm.call_notes) {
      alert('Please fill in some Call Notes to update lead follow-up.');
      return;
    }

    try {
      setIsSaving(true);
      await updateLeadFollowUp(
        selectedLead.lead_id,
        followUpForm.status,
        followUpForm.call_notes,
        followUpForm.next_follow_up_date || '',
        Number(followUpForm.quotation_amount),
        followUpForm.negotiation_notes
      );

      // Refresh selected lead state
      setSelectedLead((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: followUpForm.status,
          budget: Number(followUpForm.quotation_amount),
        };
      });

      // Clear follow up text
      setFollowUpForm(prev => ({ ...prev, call_notes: '', negotiation_notes: '' }));
      alert('CRM Updated Successfully.');
    } catch (err: any) {
      console.error("Failed to update follow-up:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;

      logStatusUpdateError({
        leadId: selectedLead?.lead_id || null,
        orderId: null,
        oldStatus,
        newStatus: followUpForm.status,
        updatePayload: {
          status: followUpForm.status,
          budget: Number(followUpForm.quotation_amount),
          remarks: followUpForm.call_notes
        },
        insertPayload: null,
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Follow-up Pipeline Status Update Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalReportingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    try {
      setIsSaving(true);
      
      const crmEvents = selectedLead.events || [];
      let updatedLeadFields: any = {};

      if (crmEvents.length > 0) {
        // Validate all events have required reporting details
        for (const ev of crmEvents) {
          const fd = finalReportingForm[ev.id] || { reporting_date: '', reporting_time: '' };
          if (!fd.reporting_date || !fd.reporting_date.trim() || !fd.reporting_time || !fd.reporting_time.trim()) {
            showToastMsg("Please complete Reporting Date and Reporting Time for all events.", "error");
            setIsSaving(false);
            return;
          }
        }

        // Save event-wise reporting details
        const updatedEvents = crmEvents.map(ev => {
          const fd = finalReportingForm[ev.id] || { reporting_date: '', reporting_time: '' };
          return {
            ...ev,
            reporting_date: fd.reporting_date,
            reporting_time: fd.reporting_time
          };
        });
        
        updatedLeadFields = {
          events: updatedEvents,
          Reporting_date: updatedEvents[0]?.reporting_date || '', // fallback
          reporting_time: updatedEvents[0]?.reporting_time || ''
        };
        await updateLead(selectedLead.lead_id, updatedLeadFields);
      } else {
        // Fallback for leads without explicit events
        const fd = finalReportingForm['default'] || { reporting_date: '', reporting_time: '' };
        if (!fd.reporting_date || !fd.reporting_date.trim() || !fd.reporting_time || !fd.reporting_time.trim()) {
          showToastMsg("Please complete Reporting Date and Reporting Time.", "error");
          setIsSaving(false);
          return;
        }

        updatedLeadFields = {
          Reporting_date: fd.reporting_date,
          reporting_time: fd.reporting_time
        };
        await updateLead(selectedLead.lead_id, updatedLeadFields);
      }

      const updatedLead = {
        ...selectedLead,
        ...updatedLeadFields
      };

      setShowFinalReportingModal(false);
      setSelectedLead(updatedLead);
      showToastMsg("Reporting Details Saved Successfully.", "success");

      // Auto-open Confirm Order modal once reporting details are saved
      const today = new Date().toISOString().split('T')[0];
      const linkedOrder = orders?.find(o => o.lead_id === updatedLead.lead_id);
      const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
      const calcAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : (Number(updatedLead.advance_collected) || 0));

      setConfirmForm(prev => ({
        ...prev,
        package_name: packages?.find((p) => String(p.package_id) === String(updatedLead.Select_Package_Option))?.package_name || updatedLead.Select_Package_Option || prev.package_name || '',
        quotation_amount: Number(updatedLead.Final_Quotation_Amount) || Number(updatedLead.Final_Package_Amount) || Number((updatedLead as any).final_package_amount) || Number((updatedLead as any).final_amount) || Number(updatedLead.budget) || (updatedLead.lead_id === selectedLead?.lead_id ? Number(wizardLeadData.final_amount) : 0) || prev.quotation_amount || 0,
        advance_received: calcAdvance || prev.advance_received || 0,
        event_date: updatedLead.event_date || prev.event_date || today,
        event_time: updatedLead.event_time || prev.event_time || ''
      }));
      setShowConfirmModal(true);
    } catch (err) {
      console.error(err);
      showToastMsg("Failed to save Reporting Details.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Order Confirmation Process
  const handleConfirmOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    if (!confirmForm.event_date) {
      showToastMsg("Please select Confirmed Event Date.", "error");
      return;
    }

    const effectiveFinalAmt = Number(confirmForm.quotation_amount) || Number(selectedLead.Final_Package_Amount) || Number((selectedLead as any).final_package_amount) || Number(selectedLead.Final_Quotation_Amount) || (Number(wizardLeadData.final_amount) > 0 ? Number(wizardLeadData.final_amount) : 0);
    if (!effectiveFinalAmt || effectiveFinalAmt <= 0 || isNaN(effectiveFinalAmt)) {
      showToastMsg("Please enter Final Amount.", "error");
      return;
    }
    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received) || Number(confirmForm.advance_received) <= 0) {
      showToastMsg("Please enter Advance Paid Amount.", "error");
      return;
    }
    if (!confirmForm.transaction_id || !confirmForm.transaction_id.trim()) {
      showToastMsg("Please enter Payment Tracking ID / Transaction Reference Number.", "error");
      return;
    }

    // Validate that each event has a Reporting Date and Reporting Time
    if (selectedLead.events && selectedLead.events.length > 0) {
      for (let i = 0; i < selectedLead.events.length; i++) {
        const ev = selectedLead.events[i];
        const key = ev.id || `ev_${i}`;
        const rep = eventsReporting[key];
        const evTitle = ev.event_name || ev.event_type || `Event ${i + 1}`;
        if (!rep?.reporting_date || !rep.reporting_date.trim()) {
          showToastMsg(`Please enter Reporting Date for ${evTitle}.`, "error");
          return;
        }
        if (!rep?.reporting_time || !rep.reporting_time.trim()) {
          showToastMsg(`Please enter Reporting Time for ${evTitle}.`, "error");
          return;
        }
      }
    } else {
      const rep = eventsReporting['default'];
      if (!rep?.reporting_date || !rep.reporting_date.trim()) {
        showToastMsg("Please enter Reporting Date.", "error");
        return;
      }
      if (!rep?.reporting_time || !rep.reporting_time.trim()) {
        showToastMsg("Please enter Reporting Time.", "error");
        return;
      }
    }

    try {
      setIsSaving(true);

      // Save each event's reporting details to lead_events table in Supabase
      if (selectedLead.events && selectedLead.events.length > 0) {
        const updatedEvents = selectedLead.events.map((ev, idx) => {
          const key = ev.id || `ev_${idx}`;
          const rep = eventsReporting[key] || { reporting_date: '', reporting_time: '' };
          return {
            ...ev,
            reporting_date: rep.reporting_date || ev.reporting_date || ev.event_date || '',
            Reporting_date: rep.reporting_date || (ev as any).Reporting_date || ev.event_date || '',
            reporting_time: rep.reporting_time || ev.reporting_time || ''
          };
        });

        await updateLead(selectedLead.lead_id, {
          events: updatedEvents,
          Reporting_date: updatedEvents[0]?.reporting_date || '',
          reporting_time: updatedEvents[0]?.reporting_time || ''
        });
      } else {
        const rep = eventsReporting['default'] || { reporting_date: '', reporting_time: '' };
        await updateLead(selectedLead.lead_id, {
          Reporting_date: rep.reporting_date,
          reporting_time: rep.reporting_time
        });
      }

      const firstRepTime = (selectedLead.events && selectedLead.events.length > 0)
        ? eventsReporting[selectedLead.events[0].id || 'ev_0']?.reporting_time
        : eventsReporting['default']?.reporting_time;

      await confirmOrder(
        selectedLead.lead_id,
        confirmForm.package_name,
        effectiveFinalAmt,
        Number(confirmForm.advance_received),
        confirmForm.event_date,
        confirmForm.event_time,
        confirmForm.payment_mode,
        confirmForm.notes,
        firstRepTime,
        confirmForm.transaction_id
      );

      setShowConfirmModal(false);
      showToastMsg("Booking Confirmation saved successfully. Order transferred to Operations.", "success");
      setWizardLeadData(prev => ({
        ...prev,
        advance_received: Number(confirmForm.advance_received)
      }));
      setSelectedLead(null);
    } catch (err: any) {
      console.error("Failed to convert order:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;

      logStatusUpdateError({
        leadId: selectedLead?.lead_id || null,
        orderId: null,
        oldStatus,
        newStatus: 'Order Confirmed',
        updatePayload: {
          status: 'Order Confirmed',
          event_date: confirmForm.event_date,
          event_time: confirmForm.event_time,
          reporting_time: undefined,
        },
        insertPayload: {
          order_status: 'Confirmed',
          current_stage: 'Order Confirmed',
          package_name: confirmForm.package_name,
          quotation_amount: Number(confirmForm.quotation_amount),
          advance_received: Number(confirmForm.advance_received),
        },
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Action Button Order Confirmation Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  // Companion lead metadata parse
  const getFollowUpDate = (remarks?: string) => {
    if (!remarks) return null;
    const match = remarks.match(/Next follow-up:\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const todayStr = '2026-06-10';

  const statCreatedQuotation = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Create Quote' || st === 'Created Quotation' || st === 'New Lead';
  }).length;
  const statQuotesSent = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Quote Sent' || st === 'Quotation Sent';
  }).length;
  const statQuoteFollowups = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Quote Follow-up' || st === 'Follow Up' || st === 'Follow-up';
  }).length;
  const statConfirmedOrders = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Confirm Order' || st === 'Order Confirmed';
  }).length;
  const statLeadLost = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Lead Lost' || st === 'Lost Lead';
  }).length;

  // Filter Leads List
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.customer_name.toLowerCase().includes(filterQuery.toLowerCase()) || 
      lead.lead_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      lead.mobile.includes(filterQuery);

    const matchesSource = filterSource === '' || lead.lead_source === filterSource;
    const leadStatus = getLeadCurrentStatus(lead);
    const matchesStatus = filterStatus === '' 
      ? true 
      : filterStatus === 'Overdue' 
        ? (() => {
            if (leadStatus !== 'Follow Up') return false;
            const fDate = getFollowUpDate(lead.remarks);
            return fDate ? fDate < todayStr : false;
          })()
        : (() => {
            const statusLower = leadStatus.toLowerCase().trim();
            const filterLower = filterStatus.toLowerCase().trim();
            if (filterLower === 'create quote' || filterLower === 'created quotation') {
              return statusLower === 'create quote' || statusLower === 'created quotation' || statusLower === 'new lead';
            }
            if (filterLower === 'quote sent') {
              return statusLower === 'quote sent' || statusLower === 'quotation sent';
            }
            if (filterLower === 'quote follow-up') {
              return statusLower === 'quote follow-up' || statusLower === 'follow up' || statusLower === 'follow-up';
            }
            if (filterLower === 'confirm order') {
              return statusLower === 'confirm order' || statusLower === 'order confirmed';
            }
            if (filterLower === 'lead lost') {
              return statusLower === 'lead lost' || statusLower === 'lost lead';
            }
            if (filterLower === 'customer review') {
              return statusLower === 'customer review' || statusLower === 'client review' || statusLower === 'client review sent';
            }
            if (filterLower === 'project completed') {
              return statusLower === 'project completed' || statusLower === 'project closed' || statusLower === 'completed' || statusLower === 'closed' || statusLower === 'project delivered' || statusLower === 'delivered' || statusLower === 'approved' || statusLower === 'final approval' || statusLower === 'client approved';
            }
            if (filterLower === 'approved') {
              return statusLower === 'approved' || statusLower === 'client approved';
            }
            if (filterLower === 'project delivered') {
              return statusLower === 'project delivered' || statusLower === 'delivered';
            }
            if (filterLower === 'project closed') {
              return statusLower === 'project closed' || statusLower === 'closed';
            }
            if (filterLower === 'new project received') {
              return statusLower === 'new project received' || statusLower === 'new order received';
            }
            if (filterLower === 'follow up') {
              return statusLower === 'follow up' || statusLower === 'follow-up';
            }
            return statusLower === filterLower;
          })();
    const matchesSales = filterSalesPerson === '' || lead.sales_person === filterSalesPerson;
    const matchesDate = filterDate === '' || lead.event_date === filterDate;

    let matchesDateRange = true;
    if (appliedStartDate) {
      matchesDateRange = matchesDateRange && (lead.created_date >= appliedStartDate);
    }
    if (appliedEndDate) {
      matchesDateRange = matchesDateRange && (lead.created_date <= appliedEndDate);
    }

    return matchesSearch && matchesSource && matchesStatus && matchesSales && matchesDate && matchesDateRange;
  }).sort((a, b) => {
    const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_date).getTime());
    const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_date).getTime());
    return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div id="sales_module" className="space-y-6">
      {statusError && (
        <div className="fixed inset-0 bg-slate-955/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex items-center gap-3">
              <span className="p-2.5 bg-red-500/20 text-red-400 rounded-xl text-lg">‚ö†Ô∏è</span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-sans">{statusError.title || 'Status Update Failed'}</h3>
                <p className="text-[10px] text-red-400 font-mono tracking-wider">DATABASE SCHEMA / INTEGRITY EXCEPTION</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Reason:</span>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-red-300 font-mono leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {statusError.reason}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Suggested Fix / Schema Migration:</span>
                <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-3 text-xs text-emerald-300 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {statusError.suggestedFix}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border-t border-slate-800 px-6 py-3.5 flex justify-end">
              <button
                onClick={() => setStatusError(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      {activeTab !== 'create' && activeTab !== 'custom_package_master' && !selectedLead && (
        <div 
          className={`${activeTab === 'calendar' ? 'hidden' : 'flex'} flex-col sm:flex-row sm:items-center justify-between gap-4`}
          style={activeTab === 'calendar' ? { display: 'none' } : undefined}
        >
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono rounded tracking-widest">SALES</span>
              <span>Sales & Lead Desk</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Collect potential inbound queries, log CRM call reports, propose quotations and confirm contracts.
            </p>
          </div>

          {/* Create and Tabs Controls */}
          <div className="flex items-center gap-2">
            <button
              id="btn_lead_tab_profiles"
              onClick={() => { setActiveTab('profiles'); setSelectedLead(null); setSelectedCustomerProfileId(null); }}
              className={`hidden px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                activeTab === 'profiles'
                  ? 'bg-zinc-900 border-zinc-750 text-white font-black hover:border-zinc-700'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              üë• Customer Profiles
            </button>

            <button
              id="btn_lead_tab_calendar"
              onClick={() => { setActiveTab('calendar'); setSelectedLead(null); setSelectedCustomerProfileId(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-zinc-900 border-zinc-750 text-white font-black hover:border-zinc-700'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-405 group-hover:text-zinc-200" />
              <span>Sales Calendar</span>
            </button>
            
            {canEdit ? (
              <button
                id="btn_lead_create_flag"
                onClick={() => { setActiveTab('create'); setSelectedLead(null); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all ${
                  activeTab === 'create'
                    ? 'bg-emerald-600 hover:bg-emerald-505 text-white'
                    : 'bg-emerald-500/10 hover:bg-emerald-600/20 text-emerald-450 border border-emerald-500/25'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Quotation</span>
              </button>
            ) : (
              <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2.5 py-1 flex items-center gap-1.5" title="You are restricted from adding leads in this role.">
                <Ban className="w-3 h-3" />
                <span>Sales Access Blocked</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Sandbox Area */}
      {false && selectedLead && (
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A: Lead Details & Meta */}
          <div className="lg:col-span-4 bg-slate-850 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded font-black border border-slate-700">
                  {selectedLead.lead_id}
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-2">{selectedLead.customer_name}</h3>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-450 hover:text-slate-250 text-xs rounded transition-all cursor-pointer text-slate-400"
              >
                Close Back
              </button>
            </div>

            {/* Informational Items */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-350">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="font-mono text-slate-200">{formatIndianPhoneNumber(selectedLead.mobile)}</span>
              </div>
              {selectedLead.alternate_mobile && (
                <div className="flex items-center gap-2.5 text-slate-350">
                  <Phone className="w-4 h-4 text-slate-505 flex-shrink-0" />
                  <span>Alt: <span className="font-mono text-slate-200">{formatIndianPhoneNumber(selectedLead.alternate_mobile)}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-slate-350">
                <Mail className="w-4 h-4 text-slate-505 flex-shrink-0" />
                <span className="text-slate-200 break-words">{selectedLead.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-350">
                <MapPin className="w-4 h-4 text-slate-505 flex-shrink-0" />
                <span className="text-slate-200">{selectedLead.event_location}</span>
              </div>
            </div>

            {/* Detailed Parameters */}
            <div className="border-t border-slate-800 pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block">Event Type</span>
                <strong className="text-slate-200 font-medium">{selectedLead.event_type === 'Other' ? (selectedLead.custom_event_name || selectedLead.custom_event_type || 'Other') : selectedLead.event_type}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Lead Source</span>
                <strong className="text-slate-200 font-medium">
                  {selectedLead.lead_source === 'Other' && selectedLead.Specify_Custom_Lead_Source_Name 
                    ? `Other: ${selectedLead.Specify_Custom_Lead_Source_Name}` 
                    : selectedLead.lead_source}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Events Scheduled</span>
                <div className="flex flex-col gap-1 mt-1">
                  {selectedLead.events && selectedLead.events.length > 0 ? (
                    selectedLead.events.map((ev, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-amber-500 font-semibold">{ev.event_name || ev.event_type || 'Event'}</span>
                        <br/>
                        <strong className="text-slate-200 font-medium font-mono text-[10px]">{ev.event_date} {ev.event_start_time ? `@ ${formatTime12Hour(ev.event_start_time)}` : ''}</strong>
                      </div>
                    ))
                  ) : (
                    <strong className="text-slate-200 font-medium">{selectedLead.event_date || 'N/A'} {selectedLead.event_time ? `@ ${formatTime12Hour(selectedLead.event_time)}` : ''}</strong>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block">Current Budget</span>
                <strong className="text-amber-400 font-extrabold font-mono">{formatINR(selectedLead.budget)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">City / State</span>
                <strong className="text-slate-200 font-medium">{selectedLead.city || 'N/A'} / {selectedLead.state || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Pincode</span>
                <strong className="text-slate-200 font-medium">{selectedLead.pincode || 'N/A'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Residence Address</span>
                <strong className="text-slate-200 font-medium block break-words">{selectedLead.client_residence_address || 'N/A'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Package Option</span>
                <strong className="text-slate-200 font-medium block break-words">
                  {(() => {
                    const pkg = packages.find(p => p.package_id === selectedLead.Select_Package_Option);
                    return pkg ? `${pkg.package_name} (${selectedLead.Select_Package_Option})` : (selectedLead.Select_Package_Option || 'Not selected');
                  })()}
                </strong>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 text-[11px]">
              <span className="text-slate-500 block mb-1">Remarks & Audits</span>
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 font-mono text-[10px] text-slate-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {selectedLead.remarks || 'No remarks recorded.'}
              </div>
            </div>

            {/* Action Area: Convert Lead */}
            {canEdit && (
              <div className="border-t border-slate-800 pt-4">
                <button
                  id="btn_confirm_order"
                  onClick={() => {
                    if (!selectedLead) return;
                    const today = new Date().toISOString().split('T')[0];
                    const linkedOrder = orders?.find(o => o.lead_id === selectedLead.lead_id);
                    const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
                    const calcAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : (Number(selectedLead.advance_collected) || Number(wizardLeadData.advance_received) || 0));
                    
                    setConfirmForm({
                      ...confirmForm,
                      package_name: packages?.find((p) => String(p.package_id) === String(selectedLead.Select_Package_Option))?.package_name || selectedLead.Select_Package_Option || '',
                      quotation_amount: Number(selectedLead.Final_Quotation_Amount) || Number(selectedLead.Final_Package_Amount) || Number((selectedLead as any).final_package_amount) || Number((selectedLead as any).final_amount) || Number(wizardLeadData.final_amount) || 0,
                      advance_received: calcAdvance,
                      event_date: selectedLead.event_date || today,
                      event_time: selectedLead.event_time || ''
                    });
                    initEventsReporting(selectedLead);
                    setShowConfirmModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950/20 text-xs transition-all cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>CONFIRM ORDER CONTRACT</span>
                </button>
              </div>
            )}
          </div>

          {/* Column B: Follow-up Activity Logger */}
          <div className="lg:col-span-8 bg-slate-850 rounded-xl border border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 pb-2.5 border-b border-slate-800 mb-4">
              <span>üìù</span> Log Lead Follow-up activity & CRM notes
            </h3>

            {selectedLead && isLeadLocked && (
              <div className="p-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left animate-fade-in relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                    <span className="animate-pulse">üîí</span> Stage-Locked: Order Confirmed
                  </div>
                  <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                    This lead is lock-protected due to having officially transitioned to operations. Only payment schedules are editable.
                  </p>
                </div>
                {currentRole === 'Business Owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockReason('Data Correction');
                      setUnlockingRecordId(selectedLead.lead_id);
                    }}
                    className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer font-mono font-extrabold uppercase tracking-wide border border-amber-500/20 shadow-lg"
                  >
                    üîì Owner Override
                  </button>
                )}
              </div>
            )}

            {canEdit ? (
              <form onSubmit={handleFollowUpSubmit} className="space-y-4">
                <fieldset disabled={isLeadLocked} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                    {/* Status Options */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Transition ERP Stage *
                      </label>
                      <select
                        value={followUpForm.status}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value as CurrentStage })}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Quote Sent">Quote Sent</option>
                        <option value="Quote Follow-up">Quote Follow-up</option>
                        <option value="Confirm Order">Confirm Order</option>
                        {followUpForm.status && !['Quote Sent', 'Quote Follow-up', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Follow Up'].includes(followUpForm.status) && (
                          <option value={followUpForm.status}>{followUpForm.status}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {(followUpForm.status === 'Confirm Order' || followUpForm.status === 'Order Confirmed') ? (
                    <div className="space-y-4 pt-2 border-t border-slate-800">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Configure Confirmed Order Settings</h4>
                      
                      {/* Read-only multiple events display */}
                      {selectedLead?.events && selectedLead.events.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <label className="block text-xs font-medium text-slate-400 mb-2">Confirmed Event Dates</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedLead.events.map(ev => (
                              <div key={ev.id} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex flex-col">
                                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">üé¨ {ev.event_name || ev.event_type || 'Event'}</span>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500 font-mono">Date:</span>
                                    <span className="text-[11px] text-slate-300 font-mono font-semibold">{ev.event_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500 font-mono">Time:</span>
                                    <span className="text-[11px] text-slate-300 font-mono font-semibold">{ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Hidden inputs to preserve existing API requirements silently */}
                        <div className="hidden">
                          <label className="block text-xs font-medium text-slate-400 mb-1">Event Date * (Required)</label>
                          <input
                            type="date"
                            value={followUpForm.event_date || (selectedLead?.events?.[0]?.event_date) || ''}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, event_date: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                          />
                        </div>
                        <div className="hidden">
                          <label className="block text-xs font-medium text-slate-400 mb-1">Event Time * (Required)</label>
                          <input
                            type="time"
                            value={followUpForm.event_time || (selectedLead?.events?.[0]?.event_start_time) || ''}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, event_time: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Reporting Time * (Required)
                          </label>
                          <input
                            type="time"
                            required
                            value={followUpForm.reporting_time}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, reporting_time: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Final Amount (‚Çπ) *
                          </label>
                          <input
                            type="number"
                            required
                            value={followUpForm.quotation_amount}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, quotation_amount: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Advance Amount Received (‚Çπ)
                          </label>
                          <input
                            type="number"
                            value={followUpForm.advance_received}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, advance_received: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Payment Mode
                          </label>
                          <select
                            value={followUpForm.payment_mode}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, payment_mode: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="UPI">UPI (GPay/PhonePe)</option>
                            <option value="Cash">Cash Handover</option>
                            <option value="Bank Transfer">Bank NFT/RTGS/IMPS</option>
                            <option value="Card">Credit/Debit Card</option>
                            <option value="Cheque">Cheque Deposit</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Payment Tracking ID / Transaction Reference Number *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter Transaction Ref / Tracking ID (e.g. TXN12345678)"
                            value={followUpForm.transaction_id || ''}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, transaction_id: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Next Date */}
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Next Follow-up Action Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={followUpForm.next_follow_up_date}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_date: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>

                        {/* Proposed budget */}
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Negotiated Quotation Amount (‚Çπ) *
                          </label>
                          <input
                            type="number"
                            required
                            value={followUpForm.quotation_amount}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, quotation_amount: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Call reports */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Call / Conversation Notes *
                        </label>
                        <textarea
                          rows={4}
                          required
                          placeholder="Log exact customer concerns, desired outputs, specific package selections, or callbacks."
                          value={followUpForm.call_notes}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, call_notes: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        ></textarea>
                      </div>

                      {/* Negotiation notes */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Negotiation Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Specific price offsets, discount justifications, extra features offered..."
                          value={followUpForm.negotiation_notes}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, negotiation_notes: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </fieldset>

                {/* Buttons */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition-all cursor-pointer"
                  >
                    Discard Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLeadLocked || isSaving}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all border ${
                      isLeadLocked || isSaving
                      ? 'bg-slate-800/80 text-slate-500 border-slate-800/50 cursor-not-allowed opacity-50'
                      : 'bg-indigo-650 hover:bg-indigo-550 text-white border-indigo-500/10 cursor-pointer text-shadow'
                    }`}
                  >
                    {isSaving ? 'Saving...' : (isLeadLocked ? 'üîí Locked' : followUpForm.status === 'Order Confirmed' ? 'üíç Confirm Order booking' : 'Save Follow-up Notes')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                <Ban className="w-10 h-10 text-slate-650 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-350">Access Restrictions Active</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Only the **Sales Team** or the **Business Owner** possess authorized write clearances to log client interaction updates. Keep testing with another persona.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Sandbox Area & Mobile Base view */}
      <div className="space-y-6">
        {selectedLead ? null : activeTab === 'calendar' ? (
          <SalesCalendar onSelectLead={(lead) => handleSelectLead(lead)} />
        ) : activeTab === 'profiles' ? (
          /* NEW SCREEN: Customer Profiles & History Timeline sub-tab */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Accounts Directory / Ledger */}
            <div className="lg:col-span-4 bg-slate-850 rounded-xl border border-slate-800 p-4 space-y-4 text-left">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-mono">
                  <span>üë•</span> CLIENT ACCOUNTS ({getCustomers(leads, orders, payments).length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Unified customer profiles compiled via CRM phone & email graphs.
                </p>
              </div>

              {/* Search Customer Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, phone, email..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                {customerSearchQuery && (
                  <button 
                    onClick={() => setCustomerSearchQuery('')} 
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Roster List */}
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {(() => {
                  const items = getCustomers(leads, orders, payments);
                  const filtered = items.filter(c => 
                    c.customer_name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.customer_id.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.mobile.includes(customerSearchQuery)
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No clients match your query.
                      </div>
                    );
                  }

                  return filtered.map((cust) => {
                    const isSelected = selectedCustomerProfileId === cust.customer_id;
                    return (
                      <div
                        key={cust.customer_id}
                        onClick={() => {
                          setSelectedCustomerProfileId(cust.customer_id);
                          setIsQuickReorderView(false);
                        }}
                        className={`p-3 rounded-xl border transition-all text-left cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600/10 border-indigo-500/40 shadow-sm shadow-indigo-505/10' 
                            : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-slate-800 border border-slate-700 text-amber-500/90 px-2 py-0.5 rounded font-mono font-bold">
                            {cust.customer_id}
                          </span>
                          {cust.totalOrders >= 2 && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-black uppercase">
                              üî• REPEAT ({cust.totalOrders})
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-xs font-black text-slate-100 mt-2 font-sans break-words">
                          {cust.customer_name}
                        </h4>
                        
                        <div className="text-[10px] text-slate-400 font-mono mt-1 space-y-0.5">
                          <div className="break-words">{cust.email}</div>
                          <div>{formatIndianPhoneNumber(cust.mobile)}</div>
                        </div>

                        <div className="border-t border-slate-800/60 mt-2.5 pt-2 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Total CLV:</span>
                          <strong className="text-emerald-450 font-bold font-mono">{formatINR(cust.totalRevenue)}</strong>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Column: In-depth Timeline & Historiography Ledger */}
            <div className="lg:col-span-8 bg-slate-850 rounded-xl border border-slate-800 p-5 space-y-6 text-left">
              {(() => {
                const list = getCustomers(leads, orders, payments);
                // default to first customer if none is explicitly clicked
                const currentProfileId = selectedCustomerProfileId || (list.length > 0 ? list[0].customer_id : null);
                const cust = list.find(c => c.customer_id === currentProfileId);

                if (!cust) {
                  return (
                    <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                      <h4 className="text-sm font-semibold text-slate-400">Select customer profile</h4>
                      <p className="text-xs text-slate-505">Pick any client from the directory to review lifetime timeline history.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6 animate-fade-in text-slate-200">
                    {/* Header profile details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-slate-900 border border-slate-750 font-mono text-amber-500 px-2.5 py-0.5 rounded font-black font-mono">
                            {cust.customer_id}
                          </span>
                          {cust.totalOrders >= 2 && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-black">
                              LOYAL RETIRED BUYER COHORT
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-black text-white mt-1.5">{cust.customer_name}</h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 font-mono text-[10px] mt-1.5">
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-indigo-400" /> {cust.email}</span>
                          <span className="text-slate-800">|</span>
                          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-400" /> {formatIndianPhoneNumber(cust.mobile)}</span>
                          {cust.alternate_mobile && (
                            <>
                              <span className="text-slate-800">|</span>
                              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-zinc-500" /> Alt: {formatIndianPhoneNumber(cust.alternate_mobile)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsQuickReorderView(!isQuickReorderView);
                            // Set event date default to next month
                            const defaultReorderDate = new Date();
                            defaultReorderDate.setMonth(defaultReorderDate.getMonth() + 1);
                            setReorderForm(prev => ({
                              ...prev,
                              event_date: defaultReorderDate.toISOString().split('T')[0]
                            }));
                          }}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-650 to-indigo-750 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-lg transition-all cursor-pointer font-sans"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isQuickReorderView ? "Close Reorder Desk" : "Create New Reorder"}</span>
                        </button>
                      )}
                    </div>

                    {/* Quick Reorder Config Section */}
                    {isQuickReorderView && (
                      <div className="bg-slate-900 border border-indigo-500/20 p-4 rounded-xl space-y-4 animate-fade-in-up">
                        <div className="border-b border-slate-800 pb-2">
                          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono">
                            ‚úçÔ∏è CONFIGURE REPEAT SHOOT CONTRACT
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Book a new independent contract project. This generates a new Lead and verified Order ID, keeping customer ID intact.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className={reorderForm.event_type === 'Other' ? "sm:col-span-2 space-y-2" : ""}>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Event Type</label>
                            <select
                              value={reorderForm.event_type}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_type: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                            >
                              {EVENT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>

                            {reorderForm.event_type === 'Other' && (
                              <div className="animate-fade-in-down mt-2">
                                <label className="block text-[11px] font-mono font-bold text-amber-500 mb-1.5">
                                  Custom Event Type *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Specify custom event type"
                                  value={reorderForm.custom_event_name}
                                  onChange={(e) => setReorderForm({ ...reorderForm, custom_event_name: e.target.value })}
                                  className="w-full bg-slate-950 border border-amber-500/50 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all text-white"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Shoot Date *</label>
                            <input
                              type="date"
                              required
                              value={reorderForm.event_date}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_date: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Execution Location</label>
                            <input
                              type="text"
                              placeholder="e.g. Grand Hyatt, Goa"
                              value={reorderForm.event_location}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_location: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Package Designation</label>
                            <input
                              type="text"
                              placeholder="e.g. Royal Gold Cinema"
                              value={reorderForm.package_name}
                              onChange={(e) => setReorderForm({ ...reorderForm, package_name: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-440 mb-1">Quotation Contract Sum (‚Çπ)</label>
                            <input
                              type="number"
                              value={reorderForm.quotation_amount}
                              onChange={(e) => setReorderForm({ ...reorderForm, quotation_amount: Number(e.target.value), advance_received: Math.round(Number(e.target.value)/3) })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-440 mb-1">Advance Deposited (‚Çπ)</label>
                            <input
                              type="number"
                              value={reorderForm.advance_received}
                              onChange={(e) => setReorderForm({ ...reorderForm, advance_received: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                          <button
                            type="button"
                            onClick={() => setIsQuickReorderView(false)}
                            className="bg-slate-800 hover:bg-slate-750 px-4 py-1.5 text-xs rounded border border-slate-700 text-slate-350 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteQuickReorder(cust)}
                            className="bg-indigo-600 hover:bg-indigo-555 px-4 py-1.5 text-xs text-white rounded font-bold shadow shadow-indigo-650/30 cursor-pointer"
                          >
                            Issue Repeat Order Contract
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stats Summary widgets */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-750 text-indigo-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Total Bookings</span>
                          <span className="text-sm font-black text-slate-100 font-mono">{cust.totalOrders}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-750 text-emerald-400">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Lifetime Revenue</span>
                          <span className="text-sm font-black text-emerald-400 font-mono">{formatINR(cust.totalRevenue)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-750 text-amber-500">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Latest Event Date</span>
                          <span className="text-sm font-bold text-slate-205 font-mono">{cust.lastEventDate || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timelines history segments */}
                    <div className="space-y-6">
                      
                      {/* Subsegment 1: Historical Inquiries Timeline */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Inquiries Timeline</span>
                        </h4>
                        <div className="space-y-3">
                          {cust.leads.map((ld, i) => (
                            <div key={ld.lead_id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-800">
                              <span className="absolute left-[3px] top-[5px] w-1.5 h-1.5 rounded-full bg-indigo-505 ring-4 ring-slate-850" />
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs w-full">
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-amber-400 font-bold">{ld.lead_id}</span>
                                    <span className="text-[11px] text-slate-400">
                                      Source: {ld.lead_source === 'Other' && ld.Specify_Custom_Lead_Source_Name ? `Other: ${ld.Specify_Custom_Lead_Source_Name}` : ld.lead_source}
                                    </span>
                                  </div>
                                  
                                  {/* Render each event separately */}
                                  <div className="space-y-2 mt-2">
                                    {ld.events && ld.events.length > 0 ? ld.events.map((ev, evIdx) => (
                                      <div key={ev.id || evIdx} className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] text-slate-500 font-mono">üìÖ {ev.event_name || ev.event_type || 'Event'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                          <span className="text-slate-300">Date: {ev.event_date || 'N/A'}</span>
                                          <span className="text-slate-300">Time: {ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                        </div>
                                      </div>
                                    )) : (
                                      <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] text-slate-500 font-mono">üìÖ {ld.event_type || 'Event'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                          <span className="text-slate-300">Date: {ld.event_date || 'N/A'}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[9px] font-mono text-indigo-400 font-semibold uppercase">
                                    {ld.status}
                                  </span>
                                  <span className="font-mono text-[11px] text-emerald-450 font-black">
                                    {formatINR(ld.budget)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {cust.leads.length === 0 && (
                            <p className="text-[11px] text-slate-500 font-mono italic">No previous inquiries logged.</p>
                          )}
                        </div>
                      </div>

                      {/* Subsegment 2: Confirmed Orders History */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Verified Orders & Contracts History</span>
                        </h4>
                        <div className="space-y-3">
                          {cust.orders.map((ord) => (
                            <div key={ord.order_id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-indigo-400 font-bold">{ord.order_id}</span>
                                  <span className="text-[11px] text-slate-400">
                                    Package: <strong className="text-slate-200">{ord.package_name}</strong> | Location: {ord.event_location}
                                  </span>
                                </div>

                                {/* Render each event separately */}
                                <div className="space-y-2 mt-2">
                                  {(() => {
                                    const ordLead = leads.find(l => l.lead_id === ord.lead_id);
                                    if (ordLead && ordLead.events && ordLead.events.length > 0) {
                                      return ordLead.events.map((ev, evIdx) => (
                                        <div key={ev.id || evIdx} className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] text-slate-500 font-mono">üìÖ {ev.event_name || ev.event_type || 'Event'}</span>
                                          </div>
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                            <span className="text-slate-300">Date: {ev.event_date || 'N/A'}</span>
                                            <span className="text-slate-300">Time: {ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                          </div>
                                        </div>
                                      ));
                                    } else {
                                      return (
                                        <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                            <span className="text-slate-300">Date: {ord.event_date || 'N/A'}</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-slate-550 font-mono text-[10px] uppercase">Quotation</div>
                                  <strong className="text-emerald-450 text-[11px] font-mono font-black">{formatINR(ord.quotation_amount)}</strong>
                                </div>
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-amber-500 font-semibold uppercase">
                                  {ord.order_status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {cust.orders.length === 0 && (
                            <p className="text-[11px] text-slate-500 font-mono italic">No confirmed order folders detected.</p>
                          )}
                        </div>
                      </div>

                      {/* Subsegment 3: Payment History Ledger */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Financial Ledger Payments History</span>
                        </h4>
                        <div className="space-y-3">
                          {(() => {
                            const customerOrdersIds = cust.orders.map(o => o.order_id);
                            const customerPayments = payments.filter(p => customerOrdersIds.includes(p.order_id));
                            
                            if (customerPayments.length === 0) {
                              return <p className="text-[11px] text-slate-550 font-mono italic">Awaiting payment ledger clearance logs...</p>;
                            }

                            return customerPayments.map(p => (
                              <div key={p.payment_id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-mono">Invoice Code</span>
                                  <span className="font-mono text-indigo-400 font-bold">{p.payment_id} (Ref: {p.order_id})</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-mono">Deposited Cash</span>
                                  <span className="font-mono text-emerald-445 font-bold">{formatINR(p.advance_received + p.final_payment_received)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-505 text-[10px] block font-mono">Balance Due</span>
                                  <span className={`font-mono font-black ${p.balance_due > 0 ? 'text-red-405 animate-pulse' : 'text-slate-405'}`}>{formatINR(p.balance_due)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-mono">Clearance Status</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold leading-none inline-block mt-0.5 uppercase ${
                                    p.payment_status === 'Cleared' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                                  }`}>
                                    {p.payment_status}
                                  </span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Subsegment 4: Delivery History */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Operational Crews & Delivery History</span>
                        </h4>
                        <div className="space-y-3">
                          {(() => {
                            const customerOrdersIds = cust.orders.map(o => o.order_id);
                            // Link production items
                            const linkedProduction = production.filter(prod => customerOrdersIds.includes(prod.order_id));

                            if (linkedProduction.length === 0) {
                              return <p className="text-[11px] text-slate-550 font-mono italic">Roster operations not yet dispatched to editors...</p>;
                            }

                            return linkedProduction.map(prod => (
                              <div key={prod.production_id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs flex justify-between items-center text-zinc-300">
                                <div>
                                  <span className="font-mono text-[10px] text-indigo-400 font-black">PROD-{prod.production_id} / {prod.order_id}</span>
                                  <div className="text-[11px] text-slate-450 mt-0.5">
                                    Editor assigned: <strong className="text-slate-205">{prod.editor_assigned || 'Unassigned'}</strong>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-[10px] text-slate-550 font-mono uppercase">Delivery Stage</div>
                                  <span className="text-amber-500 font-black font-mono text-[11px] uppercase">{prod.editing_status}</span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                      
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : activeTab === 'custom_package_master' ? (
          <CustomPackageMaster />
        ) : activeTab === 'packages' ? (
          /* NEW SCREEN: Package Management Catalog */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-left relative overflow-hidden font-sans">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>Dynamic Package Catalog</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Manage core service offerings, pricing rates, and category bindings synced directly with Supabase.
                </p>
              </div>
              
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPackage(null);
                    setPkgForm({ 
                      package_name: '', 
                      category: 'Weddings', 
                      price: 0, 
                      status: 'Active', 
                      deliverables: '', 
                      team_members: '', 
                      seasonal_offer: '',
                      terms_conditions: '',
                      event_type: '',
                      duration: '',
                      package_includes: ''
                    });
                    setPkgTeamMembers([{ qty: 1, name: '' }]);
                    setPkgDeliverablesList([{ qty: 1, name: '' }]);
                    setPkgDeliverableInput('');
                    setCustomCategory('');
                    setIsAddFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer border border-transparent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create offering</span>
                </button>
              )}
            </div>

            {packageSuccessMsg && (
              <div id="package_success_banner" className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-300 font-medium flex items-center justify-between shadow-lg animate-fade-in">
                <span className="font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{packageSuccessMsg}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPackageSuccessMsg(null)}
                  className="text-emerald-400 hover:text-emerald-200 p-1 rounded-lg hover:bg-emerald-900/40 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {dbCategoryError && (
              <div id="db_category_error_banner" className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-400 font-medium space-y-1">
                <span className="font-bold flex items-center gap-1">‚ö†Ô∏è Database Schema Notice</span>
                <p>{dbCategoryError}</p>
              </div>
            )}

            {/* In-place Add / Edit Package Modal */}
            {(isAddFormOpen || editingPackage) && (
              <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 text-left text-xs bg-black/70 animate-fade-in">
                <div id="add_edit_package_modal" className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl relative text-slate-350 overflow-hidden" style={{ maxHeight: 'calc(100vh - 40px)' }}>
                  {/* Modal Header */}
                  <div className="border-b border-slate-800 p-4 sm:p-6 flex items-center justify-between shrink-0">
                    <h4 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-wide flex items-center gap-2">
                      <span>{editingPackage ? '‚úèÔ∏è Edit Service Package' : '‚ú® Define New Service Package'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFormOpen(false);
                        setEditingPackage(null);
                        setPkgForm({ 
                          package_name: '', 
                          category: 'Weddings', 
                          price: 0, 
                          status: 'Active', 
                          deliverables: '', 
                          team_members: '', 
                          seasonal_offer: '',
                          terms_conditions: '',
                          event_type: '',
                          duration: '',
                          package_includes: ''
                        });
                        setPkgTeamMembers([{ qty: 1, name: '' }]);
                        setPkgDeliverablesList([{ qty: 1, name: '' }]);
                        setPkgDeliverableInput('');
                        setCustomCategory('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                      title="Close modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable Form Body */}
                  <div className="overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 text-xs text-slate-300 flex-1 min-h-0 w-full max-w-full">
                    {/* SECTION 1: PACKAGE DETAILS */}
                    <div className="space-y-3 w-full max-w-full">
                      <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] font-mono text-emerald-400">
                        Package Details
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
                        {/* Package Name */}
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1 text-xs">
                            Package Name <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Traditional Wedding Photography"
                            value={pkgForm.package_name}
                            onChange={(e) => setPkgForm({ ...pkgForm, package_name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none transition-colors text-xs font-sans"
                          />
                        </div>

                        {/* Package Category */}
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1 text-xs">
                            Package Category <span className="text-rose-400">*</span>
                          </label>
                          <select
                            value={pkgForm.category}
                            onChange={(e) => setPkgForm({ ...pkgForm, category: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none transition-colors font-sans text-xs"
                          >
                            {categoriesList.filter(c => c !== 'CUSTOM_CATEGORY').map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="CUSTOM_CATEGORY">‚ûï Create Custom Category...</option>
                          </select>
                          {pkgForm.category === 'CUSTOM_CATEGORY' && (
                            <div className="animate-slide-down mt-2">
                              <label className="block text-amber-400 font-semibold mb-1 text-[11px]">New Custom Category Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Newborn Baby shoot"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full bg-slate-950 border border-amber-500/40 focus:border-amber-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none font-sans text-xs"
                              />
                            </div>
                          )}
                        </div>

                        {/* Package Price */}
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1 text-xs">
                            Package Price (INR) <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">‚Çπ</span>
                            <input
                              type="number"
                              placeholder="e.g. 25000"
                              value={pkgForm.price || ''}
                              onChange={(e) => setPkgForm({ ...pkgForm, price: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 pl-7 pr-3 text-slate-200 focus:outline-none font-mono text-xs transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: TEAM MEMBERS INCLUDED */}
                    <div className="border-t border-slate-800/80 pt-4 space-y-3 w-full max-w-full">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] font-mono">
                          Team Members Included
                        </label>
                      </div>

                      {/* Column Header */}
                      <div className="flex items-center gap-2 sm:gap-3 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="flex-1 min-w-0">Team Member Name / Role</div>
                        <div className="w-[60px] sm:w-[75px] text-center shrink-0">Qty</div>
                        <div className="w-9 sm:w-10 text-center shrink-0">Remove</div>
                      </div>

                      <div className="space-y-2.5 w-full max-w-full">
                        {pkgTeamMembers.map((member, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 sm:gap-3 w-full min-w-0 animate-fade-in"
                          >
                            {/* Member Name */}
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                placeholder="e.g. Candid Photographer"
                                value={member.name}
                                onChange={(e) => {
                                  const newList = [...pkgTeamMembers];
                                  newList[index] = { ...member, name: e.target.value };
                                  setPkgTeamMembers(newList);
                                }}
                                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none font-sans text-xs"
                              />
                            </div>

                            {/* Qty */}
                            <div className="w-[60px] sm:w-[75px] shrink-0">
                              <input
                                type="number"
                                min="1"
                                value={member.qty || 1}
                                onChange={(e) => {
                                  const newList = [...pkgTeamMembers];
                                  newList[index] = { ...member, qty: Math.max(1, parseInt(e.target.value) || 1) };
                                  setPkgTeamMembers(newList);
                                }}
                                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl py-2 px-1 text-xs font-mono font-bold text-center text-emerald-400 focus:outline-none"
                              />
                            </div>

                            {/* Remove */}
                            <div className="w-9 sm:w-10 shrink-0 flex justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = pkgTeamMembers.filter((_, idx) => idx !== index);
                                  setPkgTeamMembers(newList.length > 0 ? newList : [{ qty: 1, name: '' }]);
                                }}
                                className="w-9 h-9 sm:w-10 sm:h-10 text-slate-400 hover:text-rose-400 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                                title="Remove item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPkgTeamMembers([...pkgTeamMembers, { qty: 1, name: '' }])}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add More</span>
                      </button>
                    </div>

                    {/* SECTION 3: DELIVERABLES */}
                    <div className="border-t border-slate-800/80 pt-4 space-y-3 w-full max-w-full">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] font-mono">
                          Deliverables
                        </label>
                      </div>

                      {/* Column Header */}
                      <div className="flex items-center gap-2 sm:gap-3 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="flex-1 min-w-0">Deliverable Name / Description</div>
                        <div className="w-[60px] sm:w-[75px] text-center shrink-0">Qty</div>
                        <div className="w-9 sm:w-10 text-center shrink-0">Remove</div>
                      </div>

                      <div className="space-y-2.5 w-full max-w-full">
                        {pkgDeliverablesList.map((del, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 sm:gap-3 w-full min-w-0 animate-fade-in"
                          >
                            {/* Deliverable Name */}
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                placeholder="e.g. Traditional 30 Edited Photos"
                                value={del.name}
                                onChange={(e) => {
                                  const newList = [...pkgDeliverablesList];
                                  newList[index] = { ...del, name: e.target.value };
                                  setPkgDeliverablesList(newList);
                                  setPkgForm({ ...pkgForm, deliverables: JSON.stringify(newList) });
                                }}
                                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none font-sans text-xs"
                              />
                            </div>

                            {/* Qty */}
                            <div className="w-[60px] sm:w-[75px] shrink-0">
                              <input
                                type="number"
                                min="1"
                                value={del.qty || 1}
                                onChange={(e) => {
                                  const newList = [...pkgDeliverablesList];
                                  newList[index] = { ...del, qty: Math.max(1, parseInt(e.target.value) || 1) };
                                  setPkgDeliverablesList(newList);
                                  setPkgForm({ ...pkgForm, deliverables: JSON.stringify(newList) });
                                }}
                                className="w-full bg-slate-950 border border-slate-750 focus:border-emerald-500 rounded-xl py-2 px-1 text-xs font-mono font-bold text-center text-emerald-400 focus:outline-none"
                              />
                            </div>

                            {/* Remove */}
                            <div className="w-9 sm:w-10 shrink-0 flex justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = pkgDeliverablesList.filter((_, idx) => idx !== index);
                                  const updatedList = newList.length > 0 ? newList : [{ qty: 1, name: '' }];
                                  setPkgDeliverablesList(updatedList);
                                  setPkgForm({ ...pkgForm, deliverables: JSON.stringify(updatedList) });
                                }}
                                className="w-9 h-9 sm:w-10 sm:h-10 text-slate-400 hover:text-rose-400 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                                title="Remove item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPkgDeliverablesList([...pkgDeliverablesList, { qty: 1, name: '' }])}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add More</span>
                      </button>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-slate-800 shrink-0 bg-slate-900 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFormOpen(false);
                        setEditingPackage(null);
                        setPkgForm({ 
                          package_name: '', 
                          category: 'Weddings', 
                          price: 0, 
                          status: 'Active', 
                          deliverables: '', 
                          team_members: '', 
                          seasonal_offer: '',
                          terms_conditions: '',
                          event_type: '',
                          duration: '',
                          package_includes: ''
                        });
                        setPkgTeamMembers([{ qty: 1, name: '' }]);
                        setPkgDeliverablesList([{ qty: 1, name: '' }]);
                        setPkgDeliverableInput('');
                        setCustomCategory('');
                      }}
                      className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer font-medium border border-transparent"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!pkgForm.package_name.trim()) {
                           alert('Please supply a package name.');
                          return;
                        }
                        if (pkgForm.price <= 0) {
                          alert('Please enter a valid price greater than zero.');
                          return;
                        }

                        let resolvedCategory = pkgForm.category;
                        if (resolvedCategory === 'CUSTOM_CATEGORY') {
                          if (!customCategory.trim()) {
                            alert('Please enter a valid custom category name.');
                            return;
                          }
                          resolvedCategory = customCategory.trim();
                        }
                        
                        const filteredMembers = pkgTeamMembers.filter(item => item.name.trim() !== '');
                        const teamMembersStr = filteredMembers.length > 0 ? JSON.stringify(filteredMembers) : '';
                        
                        const filteredDeliverables = pkgDeliverablesList.filter(item => item.name.trim() !== '');
                        const deliverablesStr = filteredDeliverables.length > 0 ? JSON.stringify(filteredDeliverables) : '';
                        
                        const payload = {
                          ...pkgForm,
                          team_members: teamMembersStr,
                          deliverables: deliverablesStr,
                          category: resolvedCategory
                        };
                        
                        try {
                          setIsSaving(true);
                          if (editingPackage) {
                            await updatePackage(editingPackage.package_id, payload);
                          } else {
                            await addPackage(payload);
                          }
                          setIsAddFormOpen(false);
                          setEditingPackage(null);
                          setPkgForm({ 
                            package_name: '', 
                            category: 'Weddings', 
                            price: 0, 
                            status: 'Active', 
                            deliverables: '', 
                            team_members: '', 
                            seasonal_offer: '',
                            terms_conditions: '',
                            event_type: '',
                            duration: '',
                            package_includes: ''
                          });
                          setPkgTeamMembers([{ qty: 1, name: '' }]);
                          setPkgDeliverablesList([{ qty: 1, name: '' }]);
                          setCustomCategory('');
                        } catch (err: any) {
                          alert(`Failed to save package: ${err.message || err}`);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all cursor-pointer border border-transparent disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {isSaving ? 'Saving...' : 'Save Package'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Multi-Search & Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
              {/* Search Package Field */}
              <div className="relative w-full">
                <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-tight">Search Package</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search package name..."
                    value={catSearchQuery}
                    onChange={(e) => setCatSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-250 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  {catSearchQuery && (
                    <button
                      onClick={() => setCatSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter by Category selection */}
              <div className="w-full">
                <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-tight font-sans">Filter by Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-250 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Categories ({categoriesList.length})</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Status selection */}
              <div className="w-full">
                <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-tight font-sans">Filter by Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-250 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Packages Only</option>
                  <option value="Inactive">Inactive Packages Only</option>
                </select>
              </div>
            </div>

            {/* Category Listing Grid */}
            <div className="space-y-6">
              {categoriesList.map((cat) => {
                // Respect category filter
                if (categoryFilter !== 'All' && cat !== categoryFilter) return null;

                const catPkgs = (packages || []).filter(
                  p => normalizeCategory(p.category) === cat && 
                  p.package_name.toLowerCase().includes(catSearchQuery.toLowerCase()) &&
                  (statusFilter === 'All' || p.status === statusFilter)
                );
                
                if (catPkgs.length === 0) return null;
                
                return (
                  <div key={cat} className="space-y-2.5 text-left animate-fade-in">
                    <h4 className="text-[10px] font-black font-mono tracking-wider text-slate-400 border-b border-slate-800 pb-1 uppercase flex justify-between items-center bg-slate-950/20 px-2 py-1 rounded">
                      <span>{cat}</span>
                      <span className="text-slate-500 font-mono">({catPkgs.length})</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {catPkgs.map((pkg) => (
                        <div
                          key={pkg.package_id}
                          className="bg-slate-955 border border-slate-850 p-4 rounded-xl flex flex-col justify-between hover:border-slate-800 transition-all space-y-4 hover:shadow-lg relative group"
                        >
                          <div className="space-y-1.5 text-left">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] text-slate-500 font-bold uppercase">{pkg.package_id}</span>
                              <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded ${
                                pkg.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}>
                                {pkg.status}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-100 leading-tight">{pkg.package_name}</h5>
                            <p className="text-[11px] text-slate-400 break-words leading-snug">
                              {pkg.deliverables || 'No custom deliverables specified'}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 pt-2.5 border-t border-slate-900/80">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-emerald-400">‚Çπ{pkg.price.toLocaleString('en-IN')}</span>
                            </div>
                            
                            {canEdit && (
                              <div className="grid grid-cols-3 gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPackage(pkg);
                                    setPkgForm({
                                      package_name: pkg.package_name,
                                      category: pkg.category,
                                      price: pkg.price,
                                      status: pkg.status as 'Active' | 'Inactive',
                                      deliverables: pkg.deliverables || '',
                                      team_members: pkg.team_members || '',
                                      seasonal_offer: pkg.seasonal_offer || '',
                                      terms_conditions: pkg.terms_conditions || '',
                                      event_type: pkg.event_type || '',
                                      duration: pkg.duration || '',
                                      package_includes: pkg.package_includes || ''
                                    });
                                    const parsed = parseTeamMembers(pkg.team_members);
                                    setPkgTeamMembers(parsed.length > 0 ? parsed.map(s => { const r = parseQtyAndText(s); return { qty: r.qty, name: r.text }; }) : [{ qty: 1, name: '' }]);
                                    const parsedDel = parseTeamMembers(pkg.deliverables);
                                    setPkgDeliverablesList(parsedDel.length > 0 ? parsedDel.map(s => { const r = parseQtyAndText(s); return { qty: r.qty, name: r.text }; }) : []);
                                    setCustomCategory('');
                                    setIsAddFormOpen(true);
                                  }}
                                  className="py-1 px-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] uppercase font-mono tracking-tight font-bold border border-slate-800 hover:border-slate-700 rounded transition-all cursor-pointer text-center"
                                  title="Edit package details"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextStatus = pkg.status === 'Active' ? 'Inactive' : 'Active';
                                    await updatePackage(pkg.package_id, { status: nextStatus });
                                  }}
                                  className={`py-1 px-1 text-center text-[10px] uppercase font-mono tracking-tight font-bold border rounded transition-all cursor-pointer ${
                                    pkg.status === 'Active'
                                      ? 'bg-amber-500/10 border-amber-550/20 text-amber-500 hover:bg-amber-500/20'
                                      : 'bg-emerald-500/10 border-emerald-555/20 text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                  title={pkg.status === 'Active' ? "Deactivate Package" : "Activate Package"}
                                >
                                  {pkg.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingPackageId(pkg.package_id);
                                  }}
                                  className="py-1 px-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-350 text-[10px] uppercase font-mono tracking-tight font-bold rounded transition-all cursor-pointer text-center"
                                  title="Delete Package"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'create' ? (
          /* SCREEN 2: Create Lead Layout as dedicated Full Page inside the application */
          <div 
            id="create_lead_form"
            className="bg-[#030303] border border-slate-800 rounded-2xl w-full shadow-2xl flex flex-col overflow-hidden relative h-[calc(100vh-220px)] min-h-[500px]"
          >
            <button 
              type="button"
              onClick={() => { resetForm(); setActiveTab('list'); }}
              className="absolute top-2 right-3 z-20 p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-slate-700/50 bg-slate-950/80"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {crmToast && (
              <div id="crm-create-toast-container" className={`mx-4 mt-4 p-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shrink-0 ${
                crmToast.type === 'success' 
                  ? 'bg-emerald-950/90 border border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-950/90 border border-red-500/20 text-red-400'
              }`}>
                <span>{crmToast.type === 'success' ? '‚ö°' : '‚ö†Ô∏è'}</span>
                <span className="text-[11px] font-mono font-bold whitespace-pre-wrap">{crmToast.message}</span>
              </div>
            )}

            {/* Wizard Progress Bar */}
            <div className="bg-slate-955/30 px-4 sm:px-6 py-1.5 border-b border-slate-800/50 shrink-0">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                {[
                  { step: 1, label: 'Customer' },
                  { step: 2, label: 'Event Info' },
                  { step: 3, label: 'CRM & Quotation' }
                ].map((item) => {
                  const isActive = wizardStep === item.step;
                  const isCompleted = wizardStep > item.step;
                  return (
                    <div key={item.step} className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1">
                      <div className="w-full flex items-center gap-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-300 ${
                          isActive 
                            ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/10' 
                            : isCompleted 
                              ? 'bg-emerald-500 text-slate-955' 
                              : 'bg-slate-800 text-slate-500'
                        }`}>
                          {isCompleted ? '‚úì' : item.step}
                        </span>
                        <div className={`hidden sm:block flex-1 h-0.5 rounded transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-slate-800'
                        }`} />
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                        isActive ? 'text-cyan-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Body: Content Fields */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              
              {/* STEP 1: CUSTOMER DETAILS */}
              {wizardStep === 1 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 space-y-4 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                    <Users className="w-4 h-4 text-cyan-405" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">1. Customer Details</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Customer Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                        Customer Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={createForm.customer_name}
                        onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                        Mobile Number *
                      </label>
                      <input
                        id="input_mobile"
                        type="text"
                        required
                        placeholder="e.g. 9876543210"
                        value={createForm.mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                          setCreateForm({ ...createForm, mobile: val });
                          if (val.length === 10) {
                            handleCheckExistingCustomer('phone', val);
                          }
                        }}
                        onBlur={(e) => handleCheckExistingCustomer('phone', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                      />
                    </div>

                    {/* WhatsApp Number */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-404">
                          WhatsApp Number
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (createForm.mobile) {
                              setCreateForm(prev => ({ ...prev, whatsapp_number: prev.mobile }));
                            }
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider cursor-pointer hover:underline"
                        >
                          Copy Mobile
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="WhatsApp contact number"
                        value={createForm.whatsapp_number}
                        onChange={(e) => setCreateForm({ ...createForm, whatsapp_number: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="customer@domain.com"
                        value={createForm.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateForm({ ...createForm, email: val });
                          if (val.includes('@') && val.length > 5 && (val.endsWith('.com') || val.endsWith('.in') || val.endsWith('.org'))) {
                            handleCheckExistingCustomer('email', val);
                          }
                        }}
                        onBlur={(e) => handleCheckExistingCustomer('email', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
                      />
                    </div>

                    {/* Lead Source */}
                    <div className="space-y-2 text-left">
                      <div>
                        <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                          Inbound Lead Channel Source *
                        </label>
                        <select
                          value={createForm.lead_source}
                          required
                          onChange={(e) => setCreateForm({ ...createForm, lead_source: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all cursor-pointer"
                        >
                          <option value="">Select Lead Source</option>
                          {LEAD_SOURCES.map(source => (
                            <option key={source} value={source}>{source}</option>
                          ))}
                        </select>
                      </div>
                      {createForm.lead_source === 'Other' && (
                        <div className="animate-fade-in-down">
                          <label className="block text-xs font-mono font-bold text-amber-500 mb-1.5">
                            Specify Custom Lead Source Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Billboard, Event Flyer"
                            value={otherSource}
                            onChange={(e) => setOtherSource(e.target.value)}
                            className="w-full bg-slate-955 border border-amber-500/50 rounded-lg py-2 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 2: EVENT DETAILS */}
              {wizardStep === 2 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm animate-fade-in text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1 text-left">
                    <Calendar className="w-4 h-4 text-cyan-405" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">2. Event Details</span>
                  </div>

                  {renderEventDetailsSection(false)}
                </div>
              )}

              {/* STEP 3: PACKAGE SELECTION */}
              {wizardStep === 3 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm animate-fade-in text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                    <CheckSquare className="w-4 h-4 text-cyan-405" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">3. Package Selection</span>
                  </div>

                  {renderStep3Workspace(false)}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex justify-between items-center gap-3 border-t border-slate-800/80 py-2 px-4 sm:px-5 bg-slate-950/40 backdrop-blur-md shrink-0">
              {/* Back or Cancel */}
              <div className="flex items-center gap-2">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-4.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer border border-slate-850 hover:border-slate-700 transition-colors"
                  >
                    ‚Üê Back Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab('list'); }}
                    className="px-4.5 py-2 text-xs font-semibold bg-slate-805 hover:bg-slate-800 text-slate-300 rounded-xl cursor-pointer border border-slate-800 hover:border-slate-700/50 transition-colors"
                  >
                    Back
                  </button>
                )}
                {wizardStep === 2 && (!createdLeadId || leads.find(l => l.lead_id === createdLeadId)?.status === 'New Lead') && (
                  <div />
                )}
              </div>

              {/* Next or Save */}
              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={handleWizardNext}
                  disabled={isSaving || (wizardStep === 3 && selectedPkgIds.length === 0)}
                  className={`px-5.5 py-2 text-xs font-bold text-white rounded-xl shadow-lg border border-transparent transition-colors flex items-center gap-1.5 ${
                    wizardStep === 3 && selectedPkgIds.length === 0
                      ? 'bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed opacity-50 shadow-none'
                      : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/10 cursor-pointer'
                  }`}
                >
                  {isSaving ? 'Processing...' : 'Save & Continue ‚Üí'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    if (salesStatus === 'Order Confirmed') {
                      handleOrderConfirmedSubmit(e);
                    } else {
                      handleStatusSave();
                    }
                  }}
                  disabled={isSaving}
                  className="px-5.5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer border border-transparent transition-colors flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : salesStatus === 'Order Confirmed' ? 'üéâ Confirm Order & Transition' : '‚úçÔ∏è Create Quotation'}
                </button>
              )}
            </div>
          </div>
        ) : (
        /* SCREEN 1: Lead List datagrid */
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
                      <span className="text-xl">üìÅ</span>
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
                        <span>üì•</span>
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
                          <span>üñ®Ô∏è</span> Print Report
                        </button>
                        
                        <button
                          type="button"
                          onClick={handlePrintReport}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-rose-400 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                          title="Download report as PDF format"
                        >
                          <span>üìÑ</span> Download PDF
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleDownloadExcel}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-emerald-450 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                          title="Download report as Excel spreadsheet"
                        >
                          <span>üìä</span> Excel (.xlsx)
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadCSV}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-indigo-400 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                          title="Download report as CSV file"
                        >
                          <span>üìù</span> CSV
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
                            {LEAD_SOURCES.map(source => (
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
                            {ACTIVE_STAGE_GROUPS.map((group, idx) => (
                              <optgroup key={idx} label={group.label} className={`bg-slate-950 ${group.colorClass} font-bold`}>
                                {group.options.map(opt => (
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
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => {
                      const leadStatus = getLeadCurrentStatus(lead);
                      const currentStage = getLeadCurrentStage(lead);
                      const isActiveInSales = currentStage === 'Sales';
                      const linkedOrder = orders.find((o) => o.lead_id === lead.lead_id);
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
                                      <span>{isApprovedUnlock ? '‚úî Edit Record' : '‚ö° Actions'}</span>
                                      <span className="text-[10px] ml-1">‚ñº</span>
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
                                        
                                        {/* CONFIRM ORDER */}
                                        {isActionsDropdownStatus && leadStatus !== 'Order Confirmed' && leadStatus !== 'Order Close' && currentStage === 'Sales' && (
                                          <button
                                            type="button"
                                            id={`btn_confirm_order_direct_${lead.lead_id}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              handleSelectLead(lead);
                                              const today = new Date().toISOString().split('T')[0];
                                              const linkedOrder = orders?.find(o => o.lead_id === lead.lead_id);
                                              const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
                                              const calcAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : (Number(lead.advance_collected) || 0));
                                              setConfirmForm({
                                                ...confirmForm,
                                                package_name: packages?.find((p) => String(p.package_id) === String(lead.Select_Package_Option))?.package_name || lead.Select_Package_Option || '',
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
                                        
                                        {/* UNLOCK QUOTATION (if pending/rejected) */}
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
        )}
      </div>

      {/* Confirmation Modal to Officially Log and Book Contract */}
      <AddNoteModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        leadId={noteModalLeadId}
        orderId={noteModalOrderId}
        customerName={noteModalCustomerName}
      />

      {showConfirmModal && selectedLead && (
        <div 
          className="fixed inset-0 bg-black/85 z-[95] flex items-center justify-center p-2.5 sm:p-4 md:p-6 backdrop-blur-md overflow-hidden transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm_booking_modal_title"
        >
          <div 
            ref={confirmBookingModalRef}
            id="confirm_booking_modal" 
            className="bg-slate-850 border border-slate-750 rounded-2xl overflow-hidden max-w-lg md:max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150 relative"
          >
            {/* Header - Fixed at Top */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-5 py-3 sm:py-3.5 shrink-0 bg-slate-850">
              <h4 id="confirm_booking_modal_title" className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2 font-sans min-w-0">
                <span className="text-base sm:text-lg shrink-0">üíç</span>
                <span className="truncate">Booking Confirmation & Contract Form</span>
              </h4>
              <button 
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
                title="Close"
                aria-label="Close Booking Confirmation Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ONE SINGLE SCROLLABLE CONTAINER FOR THE ENTIRE POPUP CONTENT */}
            <div className="overflow-y-auto overflow-x-hidden px-3.5 sm:px-5 md:px-6 py-4 custom-scrollbar flex-1">
              <form onSubmit={handleConfirmOrderSubmit} className="space-y-4 text-xs">
                
                {/* Collapsible Customer Information Card - Expands naturally with NO inner scrollbar */}
                {(() => {
                  const combinedType = (selectedLead.events && selectedLead.events.length > 0)
                    ? selectedLead.events
                        .map(ev => ev.event_name || ev.event_type)
                        .filter(Boolean)
                        .join(', ') || selectedLead.event_type || 'Event'
                    : (selectedLead.event_type === 'Other'
                        ? (selectedLead.custom_event_name || selectedLead.custom_event_type || 'Other')
                        : (selectedLead.event_type || 'Event'));

                  return (
                    <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setIsCustomerInfoExpanded(!isCustomerInfoExpanded)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer select-none"
                      >
                        <span className="flex items-center gap-1.5 text-slate-200 font-medium truncate">
                          Customer Information
                        </span>
                        <span className="flex items-center gap-1 text-slate-400 text-[11px] font-medium shrink-0">
                          <span>{isCustomerInfoExpanded ? 'Hide' : 'Show'}</span>
                          {isCustomerInfoExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      </button>

                      {isCustomerInfoExpanded && (
                        <div className="px-3.5 pb-3.5 pt-1.5 border-t border-slate-800/60 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-slate-300">
                            <div className="min-w-0">
                              <span className="text-slate-400 font-medium text-[11px] block">Client Name</span>
                              <strong className="text-slate-100 font-semibold text-xs break-words">{selectedLead.customer_name || 'N/A'}</strong>
                            </div>
                            <div className="min-w-0">
                              <span className="text-slate-400 font-medium text-[11px] block">Mobile Number</span>
                              <strong className="text-slate-100 font-mono font-semibold text-xs break-all">{selectedLead.mobile || 'N/A'}</strong>
                            </div>
                            <div className="sm:col-span-2 min-w-0">
                              <span className="text-slate-400 font-medium text-[11px] block">Address</span>
                              <strong className="text-slate-100 font-semibold text-xs break-words">{selectedLead.event_location || 'N/A'}</strong>
                            </div>
                            <div className="sm:col-span-2 pt-1 border-t border-slate-800/60 min-w-0">
                              <span className="text-slate-400 font-medium text-[11px] block">Type</span>
                              <strong className="text-amber-400 font-semibold text-xs break-words">{combinedType}</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Product package name - Read-Only */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Product Package Name *
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={confirmForm.package_name || packages?.find((p) => String(p.package_id) === String(selectedLead.Select_Package_Option))?.package_name || selectedLead.Select_Package_Option || 'Custom Selected Package'}
                    className="w-full h-9 bg-slate-900/80 border border-slate-750 rounded-lg px-3 text-slate-200 text-xs font-medium focus:outline-none opacity-85 cursor-not-allowed select-none shadow-inner"
                  />
                </div>

                {/* Event Date & Reporting Details Section */}
                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1.5 flex items-center justify-between flex-wrap gap-1">
                    <span>üìÖ Events & Reporting Details *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Set reporting time for crew</span>
                  </label>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-3">
                    {selectedLead?.events && selectedLead.events.length > 0 ? (
                      selectedLead.events.map((ev, i) => {
                        const key = ev.id || `ev_${i}`;
                        const repData = eventsReporting[key] || {
                          reporting_date: ev.reporting_date || (ev as any).Reporting_date || ev.event_date || ev.event_start_date || selectedLead.Reporting_date || (selectedLead as any).reporting_date || selectedLead.event_date || '',
                          reporting_time: ev.reporting_time || selectedLead.reporting_time || ''
                        };

                        const startDateStr = formatDDMMYYYY(ev.event_start_date || ev.event_date);
                        const startTimeStr = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : (selectedLead.event_time ? convertTo12Hour(selectedLead.event_time) : 'TBD');
                        const endTimeStr = ev.event_end_time ? convertTo12Hour(ev.event_end_time) : '';
                        const eventTimeDisplay = endTimeStr ? `${startTimeStr} ‚Äì ${endTimeStr}` : startTimeStr;

                        return (
                          <div key={key} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                              <span className="text-xs font-bold text-amber-400 font-sans tracking-wide">
                                {selectedLead.events.length > 1 ? `EVENT ${i + 1}` : 'EVENT DETAILS'}
                              </span>
                              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 truncate max-w-[150px]">
                                {ev.event_shoot_type || selectedLead.shoot_type || 'Shoot'}
                              </span>
                            </div>

                            {/* Event Name, Date, Time info */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-md border border-slate-800/60 text-[11px]">
                              <div className="min-w-0">
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Name</span>
                                <span className="text-slate-200 font-semibold break-words">{ev.event_name || ev.event_type || 'Event'}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Date</span>
                                <span className="text-slate-200 font-semibold font-mono">{startDateStr}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Time</span>
                                <span className="text-slate-200 font-semibold font-mono">{eventTimeDisplay}</span>
                              </div>
                            </div>

                            {/* Reporting Date & Reporting Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                              <div>
                                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                                  Reporting Date *
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={repData.reporting_date || ''}
                                  onChange={(e) => {
                                    setEventsReporting(prev => ({
                                      ...prev,
                                      [key]: {
                                        ...(prev[key] || { reporting_time: '' }),
                                        reporting_date: e.target.value
                                      }
                                    }));
                                  }}
                                  className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                                  Reporting Time *
                                </label>
                                <input
                                  type="time"
                                  required
                                  value={repData.reporting_time || ''}
                                  onChange={(e) => {
                                    setEventsReporting(prev => ({
                                      ...prev,
                                      [key]: {
                                        ...(prev[key] || { reporting_date: '' }),
                                        reporting_time: e.target.value
                                      }
                                    }));
                                  }}
                                  className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-xs font-bold text-amber-400 font-sans tracking-wide">
                            EVENT DETAILS
                          </span>
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 truncate max-w-[150px]">
                            {selectedLead.shoot_type || 'Shoot'}
                          </span>
                        </div>

                        {/* Single Event Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-md border border-slate-800/60 text-[11px]">
                          <div className="min-w-0">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Name</span>
                            <span className="text-slate-200 font-semibold break-words">{selectedLead.event_type === 'Other' ? (selectedLead.custom_event_name || selectedLead.custom_event_type || 'Other') : (selectedLead.event_type || 'General Event')}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Date</span>
                            <span className="text-slate-200 font-semibold font-mono">{formatDDMMYYYY(selectedLead.event_date)}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Time</span>
                            <span className="text-slate-200 font-semibold font-mono">{selectedLead.event_time ? convertTo12Hour(selectedLead.event_time) : 'TBD'}</span>
                          </div>
                        </div>

                        {/* Reporting Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                          <div>
                            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                              Reporting Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={eventsReporting['default']?.reporting_date || selectedLead.Reporting_date || (selectedLead as any).reporting_date || selectedLead.event_date || ''}
                              onChange={(e) => {
                                setEventsReporting(prev => ({
                                  ...prev,
                                  default: {
                                    ...(prev['default'] || { reporting_time: '' }),
                                    reporting_date: e.target.value
                                  }
                                }));
                              }}
                              className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                              Reporting Time *
                            </label>
                            <input
                              type="time"
                              required
                              value={eventsReporting['default']?.reporting_time || selectedLead.reporting_time || ''}
                              onChange={(e) => {
                                setEventsReporting(prev => ({
                                  ...prev,
                                  default: {
                                    ...(prev['default'] || { reporting_date: '' }),
                                    reporting_time: e.target.value
                                  }
                                }));
                              }}
                              className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="hidden" value={confirmForm.event_date || ''} />
                </div>

                {/* Package cost and advance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Final Package Amount (‚Çπ) *
                    </label>
                    <input
                      type="number"
                      required
                      readOnly
                      value={confirmForm.quotation_amount || Number(selectedLead?.Final_Quotation_Amount) || Number(selectedLead?.Final_Package_Amount) || Number((selectedLead as any)?.final_package_amount) || (Number(wizardLeadData.final_amount) > 0 ? Number(wizardLeadData.final_amount) : 0)}
                      className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-3 text-slate-100 text-xs focus:outline-none font-mono opacity-80 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Advance Collected (‚Çπ)
                    </label>
                    <input
                      type="number"
                      value={confirmForm.advance_received}
                      onChange={(e) => setConfirmForm({ ...confirmForm, advance_received: Number(e.target.value) })}
                      className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-3 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Payment Mode & Payment Tracking ID in a responsive 2-column layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Payment Mode
                    </label>
                    <select
                      value={confirmForm.payment_mode}
                      onChange={(e) => setConfirmForm({ ...confirmForm, payment_mode: e.target.value })}
                      className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-3 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="UPI">UPI (GPay/PhonePe)</option>
                      <option value="Cash">Cash Handover</option>
                      <option value="Bank Transfer">Bank NFT/RTGS/IMPS</option>
                      <option value="Card">Credit/Debit Card</option>
                      <option value="Cheque">Cheque Deposit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Payment Tracking / Ref Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TXN12345678"
                      value={confirmForm.transaction_id || ''}
                      onChange={(e) => setConfirmForm({ ...confirmForm, transaction_id: e.target.value })}
                      className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-3 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Balance due readout */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-300">Remaining Balance Due:</span>
                  <strong className="text-emerald-400 font-mono font-bold text-sm sm:text-base">
                    {formatINR(Math.max(0, confirmForm.quotation_amount - confirmForm.advance_received))}
                  </strong>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 border-t border-slate-800 pt-3.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer text-xs font-medium transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn_confirm_submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/20 text-xs transition-all text-center"
                  >
                    <span>{isSaving ? 'Processing...' : 'Approve & Book Contract'}</span>
                    {!isSaving && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Final Reporting Details Popup */}
      {showFinalReportingModal && selectedLead && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md overflow-y-auto">
          <div id="final_reporting_modal" className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl space-y-0 my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
              <h4 className="font-bold text-slate-100 text-base flex items-center gap-2.5 font-sans leading-none m-0">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-sm">‚è∞</span>
                <span>Final Reporting Details</span>
              </h4>
              <button 
                type="button"
                onClick={() => {
                  setShowFinalReportingModal(false);
                  setSelectedLead(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleFinalReportingSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {(selectedLead.events && selectedLead.events.length > 0) ? (
                selectedLead.events.map((ev, idx) => {
                  const evData = finalReportingForm[ev.id] || { reporting_date: '', reporting_time: '' };
                  return (
                    <div key={ev.id} className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
                      {selectedLead.events.length > 1 && (
                        <h5 className="font-bold text-indigo-400 text-xs uppercase tracking-wider font-mono border-b border-slate-800/80 pb-2.5 flex items-center justify-between">
                          <span>Event #{idx + 1}</span>
                        </h5>
                      )}
                      
                      {/* Row 1: Event Name (Full Width) */}
                      <div className="w-full">
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Event Name
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={ev.event_name || ev.event_type || ''}
                          className="w-full h-10 bg-slate-900/90 border border-slate-800 rounded-lg px-3 text-xs text-slate-300 font-mono cursor-not-allowed focus:outline-none"
                        />
                      </div>

                      {/* Row 2: Event Date & Event Start Time */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Event Date *
                          </label>
                          <input
                            type="date"
                            readOnly
                            value={ev.event_date || ''}
                            className="w-full h-10 bg-slate-900/90 border border-slate-800 rounded-lg px-3 text-xs text-slate-300 font-mono cursor-not-allowed focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Event Start Time *
                          </label>
                          <input
                            type="time"
                            readOnly
                            value={ev.event_start_time || ev.event_time || ''}
                            className="w-full h-10 bg-slate-900/90 border border-slate-800 rounded-lg px-3 text-xs text-slate-300 font-mono cursor-not-allowed focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Row 3: Reporting Date, Reporting End Date, Reporting Time */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 whitespace-nowrap">
                            Reporting Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={evData.reporting_date}
                            onChange={(e) => setFinalReportingForm({ 
                              ...finalReportingForm, 
                              [ev.id]: { ...evData, reporting_date: e.target.value } 
                            })}
                            className="w-full h-10 bg-slate-900 border border-slate-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 text-xs text-slate-100 font-mono transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 whitespace-nowrap">
                            Reporting End Date
                          </label>
                          <input
                            type="date"
                            readOnly
                            value={ev.event_end_date || ev.Event_End_Date || (selectedLead?.Event_End_Date && selectedLead?.events?.length === 1 ? selectedLead.Event_End_Date : '') || ''}
                            className="w-full h-10 bg-slate-900/90 border border-slate-800 rounded-lg px-3 text-xs text-slate-300 font-mono cursor-not-allowed focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 whitespace-nowrap">
                            Reporting Time *
                          </label>
                          <input
                            type="time"
                            required
                            value={evData.reporting_time}
                            onChange={(e) => setFinalReportingForm({ 
                              ...finalReportingForm, 
                              [ev.id]: { ...evData, reporting_time: e.target.value } 
                            })}
                            className="w-full h-10 bg-slate-900 border border-slate-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 text-xs text-slate-100 font-mono transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
                  {/* Row 1: Event Name (Full Width) */}
                  <div className="w-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Event Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLead.event_type || selectedLead.customer_name || 'Event'}
                      className="w-full h-10 bg-slate-900/90 border border-slate-800 rounded-lg px-3 text-xs text-slate-300 font-mono cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  {/* Row 2: Event Date & Event Start Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Event Date *
                      </label>
                      <input
                        type="date"
                        readOnly
                        value={selectedLead.event_date || selectedLead.Reporting_date || ''}
                        className="w-full h-10 bg-slate-900/90 border border-slate-800 rounded-lg px-3 text-xs text-slate-300 font-mono cursor-not-allowed focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Event Start Time *
                      </label>
                      <input
                        type="time"
                        readOnly
                        value={selectedLead.event_time || selectedLead.reporting_time || ''}
                        className="w-full h-10 bg-slate-900/90 border border-slate-800 rounded-lg px-3 text-xs text-slate-300 font-mono cursor-not-allowed focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: Reporting Date, Reporting End Date, Reporting Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 whitespace-nowrap">
                        Reporting Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={finalReportingForm['default']?.reporting_date || ''}
                        onChange={(e) => setFinalReportingForm({ 
                          ...finalReportingForm, 
                          'default': { ...finalReportingForm['default'], reporting_date: e.target.value } 
                        })}
                        className="w-full h-10 bg-slate-900 border border-slate-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 text-xs text-slate-100 font-mono transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 whitespace-nowrap">
                        Reporting End Date
                      </label>
                      <input
                        type="date"
                        readOnly
                        value={selectedLead.Event_End_Date || ''}
                        className="w-full h-10 bg-slate-900/90 border border-slate-800 rounded-lg px-3 text-xs text-slate-300 font-mono cursor-not-allowed focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 whitespace-nowrap">
                        Reporting Time *
                      </label>
                      <input
                        type="time"
                        required
                        value={finalReportingForm['default']?.reporting_time || ''}
                        onChange={(e) => setFinalReportingForm({ 
                          ...finalReportingForm, 
                          'default': { ...finalReportingForm['default'], reporting_time: e.target.value } 
                        })}
                        className="w-full h-10 bg-slate-900 border border-slate-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 text-xs text-slate-100 font-mono transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
                
              {/* Button: Centered */}
              <div className="flex justify-center items-center pt-4 border-t border-slate-800/80">
                 <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer inline-flex items-center justify-center min-w-max"
                >
                  {isSaving ? 'Saving...' : 'Save Reporting Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 3 Follow-up Popup Modal */}
      {showStep3Popup && (selectedLead || activeTab === 'create') && (
        <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4 backdrop-blur-md">
          <div id="step3_followup_modal" className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-md w-fuxúÏ}[s‹∆öÿ˚˘-∆ÒmŒpx≥}xD™(í≤ôCë:$eÔñV°¿AìÉ3Q4Õ™≠≠ Sv≥ï›ìó≠lùM*èy»„ÓﬂÒ»˘	˘ææ †h`ÜegWÊ çÓF˜wøµÔìh‡∏¡eg˘ΩO∆ù5çù>Ì\uVâ3ÚÜNL;ﬁàú;.˚ÔOA0Ñˇv~ªF‹IËƒ^0Í,˜zsõø! ıÿıﬁëæÔD—Å3§sÁ>}Oºò£Nüébíˇ4âbÔ¸™sF„KJG‰,]vŒ‰ëè”ÎëÒYg%◊=0XÕÙå‚ŒY‡ª$¶ÔcÒÚºÃIqŒ∏≥‘]#Ï’»EÖ1`Xä—ÊüˇÙèˇ˘Ò"˚ì<|ñj2&;0˘‹éGNº!Õœoq∞ZòÛŸ$éÉQaî¯jü¿Œû£mﬂÎø›∏nœìçM—¯x\«tºÚ"O∆Ìs«èË¸M·EeyîEYÉEÔh∏Æ‹\Åõ˝Iagxlyƒ6Ù»ŸE'ay∆NóüüfÕ˛B˘†h–Yù#ãÖ’X‰_úúEÄúÕﬂîÃ»πﬁEÄ≥∏‘sïSVû-ÙtVHLF.u;˛áá˜ˇØhY_B^¯‘â(â˙ÍN|J‚Hë{Ô‚ﬁ«9˜FéÔ˝D…èì f∏ („‚x˛Äõì[>é‚0]l˛Rr+	≈ouk/ÄD– ﬂÃ%ªYƒ÷kaØ|Áå˙ôµıÉ˛[ﬁŸ´••Ò˚◊DãZ´ 0ìÒòÜ}\%÷då2<Î,ià‰ÒÜ!VB√ b]œm~A⁄GÙ«âRw^†^qÚãlˆöﬁh<â5ì‡àÜõWD3BB1†Ê—;«ü–çÎëé…À1~GÈæú—4o”cÛ/∂i7v¬wY◊Ï%Y,:ü¯>¢"_˛ﬂˆÚ@œÔΩ÷SÅ}|’Y&„˜Ä9™xÙ'—z0â}oD;£`D≈≠–]tñ‘)6%†ñlwq5X^Á˚çH∫–ò–ÀπÕˆ·ë€Ògå1åØFƒ·\Aæ¯ q˜‚ÄD∑rÿpkGG‰ÇÀh„zE∑˚c∏  >îÜs«ì·–	ëµΩ•W0O8áÙúÇ–ß—°Ô«¥Só∏¥ÔE»˙ñq{Hí~f∑€µn∂,ç†õΩ˘1É˜T@]ê≤•`MAAwY~Q¨≠cçhmT´D’)Ñ’ÃÓ¿
Ø≤µ˘&Ÿ¢o¡5πıu"‡'Rlä≠r€@©ëd$ëi≥≤nÒCtºÌ ‹˚,‘â±3ZE |◊ß«Œ;öÅx›Úπ^‰ú˘‘›∏ˆ"x ç¸¸3Ò¢Ìp∏$~>≤í`r‡õÓ≈EË∏H:q–	…y»îA–_·fù3¿>ˆ7ﬂ+µÖ¢zàvxGN|= ©÷ãØ‡&ﬂ∞ÀËk˙ıFœÃZeN«ÀÈ6BﬂU‘	v†ê.Ò“:ûúΩ8Ü_@ÌZd]ﬁió÷+ªKoÂnd~>âøÆø ªaÙwá∆éÁG‰y‡:>˘bQŒÊö‚c˘ÙÛœI;Ì3ONº˜ 6ﬁ∞òÎÅg¿!ﬁ.~≥F~ÊÿÎΩ÷h’π"ü¡KnåqÀ√Œ–Õçng¢» ö„›EÖ$( <ù#kxÆKGdËºÔ∞≠$>c€¯*±m¨›€∆jM€.√™$|ùzÀ∆≤—öÒÀ?ˇ≠4fd`°{±_†%vba™ÿUhè`?¨Ì´Y;'Ã·±}È~XgÒ£˘ˇΩé·!sÀ§v'V•*•{º)ı˛#ÍD¡h=Q˙sk≤«7è«˘>≤Ì¢`ˆ)¢≠“˜1ªiÏõø√˙Œ/~∂·9¸K›gìQüY2≤É<câ|j-€â≈®†é;g(Eg«€∑ç…˜,Ü@[Ãûõ`4{;∆˛˘KΩGìã
å’}ÊΩœT cîo éM>¯€µﬁ‚JûﬁÒ'YÇ'Y{¶96úÑ9133Éá2}À“(N$æá(QóéﬁuwvOwæ'è66Hû∏-\úÏ–1∞Ü˙K&DvY>‡L‚ÄqÅ–≠Pˇç§û¿ƒè©oy%L«˚ã_–l’,Œ?:/‘©ÃåÃ 5iµï`Œ…6»ÛkRÜÃC2⁄ÊŸ˙S◊õõP¯m?àäÊw+o/TÌQL…`zLQ¨ä@œ¡F¸¿tD}¶≥óÀYkk≥≤<wcV*>E¬v:ƒiŒÈ˜s≠Z6
^CW+x=8ïîQÑSÈ˛(Â∞ÁN¯ñó1Hõ≠v¨ÇÊL‹Ekwë‹Tf˙0iS»YÑ≥÷S$T∏â∞Yôèà!:q F î··‚Û˘¡∑Ö°®ƒ1Ñtü]B"ù”çFOF4π‰KTèNS&_‹Fﬁ$v|p[≥‚~Ú∆ùôëXLiPtÜg0  +V∆ã«3,ãUöõ€Ït»1a±UùŒ„Eﬁ»‚˝ßñâl#Ä]à¡‹f·VçÓ∂¿Ã·’·òÇ>Ñsõ˘;5:€}áVkn∏CÂeòwèa1Å?ñ<¨1ƒA ´¡[0«EÚ-Ã5∆Œµ∑ktªC#nÓ,}9rﬁÅPÜV≤πM”ìù∆
À˛C⁄«c⁄ûI ˇÇÀys7@úîÿô¶Ï#®∞—Zfa_;Ô“"B‰ánÉêÌâS	y*qÔ%>òüŒ∆[J¡rŒò]∆b˚|ﬁ∏∞Ç¡‹+	pÕ˜K…†ûf_¥°Ü˜ê*Ròf¬√¨∂}∆…Ö˘fô–w∂ﬁAÆ%≤†˙ﬁÈKxî~BÙ¬ñó^DÀ˝Ä—µ‹˚ÚÖèíM2nøjù#ÔıCÈï˘XKçkØü¢ñÊÙ)[È'˜—Òáãà™°ΩœÔë¬z·g€ÃâÂƒ|Ú∫u^ZÉ_’¶Ø÷òSêv·ﬂäSê=V=Çº—¨=Çw·|¡≠üäêiÙBô◊8F∂¥ˇˆ¯«	È,âB‡ø5¯Æ\à/Gåu!„°¿â¥∆.ﬁF4)XΩ¯”Èl_∑Óc|∞t›≤•Îi6∆IÿwxØ©⁄
pûÄ⁄í@ZA≥∑Ñ·ˆ4â%ã_4ä•è*Ãbº! Ô‚7E„“…¿ãò§âõzÈ°‘Öñ2„Ä…çO'@/Åhí√À~¿Çç«a Ç\ﬁVC™C:tÄBü«±LF1»ûº1u-Le–˜ÄÅáe$ºï˝  √çŒ†∂öàkwo?˚`¶≥â∫,ılh/ãØ~îRz#c7-¿D‰¥:ÆÎÒ@Nîk˙0ﬂxn”Æ]≥Y±CÄﬂ∑Œ%√¿ıŒΩ>C%Ì»∫Ü”Môi≠œ`#“éôi1›`1uÜdHqﬂJá‘¥õn`ó˙pUK÷¥´1ã–Î£òŸ¬êˆ=‰¯;∑YÚ∞°=pfˆ?	π/Ü@nN˚MvVøÃ sx¨kˇ{iÍ‚¡òm6KL1˛oˆñò2Ôßiíâò4®[–¢ç•ﬁöq¸J]≥ú%ê[5îıJµ1√ È$Il{ïæ\ﬂæQ§”lIıƒÏ†ÏÜÀ≥Ü∑ÂˆGco§5u+^≠üàˆ›˘4[*ó”Fd£—0zÌ h—-zÓÖCÆ⁄h-+º°h«√çÓ<~Hgª0,“¯"-Í≥Èüˆ˘¸o-“(>ÿ_¨"ç~˘ß˘ˇ˙˜wkTÑﬂOÕ¬¢èÁ<Å«Ì”Û∏∞a[!%W¡ÑDÒ«•√Ì%C‹≥-*æ≤qOjOk6é¢Yñ1h*œ√lÖéNtË1l¥á©É¿
x¶^=nº‚À¶wŸ,¶µL\0…R≤;M”¥˚\äÎ[·o˘KÃH-u∫Ã6"∏"∏WÈ0aã.è¨~xÊ˘T≤E•eñCæ˙wΩ¸ﬂkcª\h‰{EN»pù•ÔıÉ")t„Ω£		ï¸1°N)c…Ò§tØ≤KârŒw%øur∞^)rçhÚËUkîXÄV£µ@ƒo75¸„Õz…xTÎu◊ı˝âK£6(ùxk{bíc@ŸV˜a~^gT»—¿Î7"ù¡}4\g±È	˜ÆfÙˇ¥D•»Wh>œàN@ı£hüo·Òg◊8ˆ"ú*ãÔÄ…ˆ√·ﬁONËbz'3è¨ |Kº√¥ê$á!A≈≈ïÉy5BiñàV≠‹‡7on4xïù¬#1ù»_-qv¢ÄÇﬂeËåÜò«Éï◊™ ªíI`‚lÜÿîKC,ï#ÕŒèCxÕóûãv.ì⁄"√≤ˇNäJ;ﬁÖÉxŒ•˜£Á‰á |À§KÚÀ_ˇëlÛ`óß,ûA1¨>\õ˝/“Q
Âm‘Z5´˚IÆ‹Õ{n8πÍÙ“deY:=∑π∏t=K X“”©áYO˙ö∫…JΩ«¥¯ÏêÖ∆4ª{ÉXá*¸RF¡Òµi’òïb∫h]Ωà Õ“n≥<v|µƒ2æ≥¨+≥ƒï6ıaÂÅL&ΩΩ L·C∂ö¡^(π\|
„I8ˆif‚Vq"J€≤π`∑?’O”¥ÿØbÏˆ◊Ωù„óñ⁄Òã}ﬂ:ä*h%>H\+Do¯¸’°çi7äÔM≥¿…a;™|›E◊ZqπihW…÷
;ù—.ÿéV3*ÿ€Ï&fvçÌç"ò-√≠“EÊæ≤N^_”∏.Ñ§6(_g•Ω}∞öÀ5 I¢√wSãÛËÖ£†K–zEˆèO»˛Ó÷ym˙⁄í”BÆ	:5VJì˝E´V+cJ„4¨ó™Í≠5Íbäæ uE‘ö¯2µZå8†§É:~A°,˙⁄êùΩ˚)1∆ ¢iÃƒy'™E"„‡$p a∂|∆E’‰p˛‹§√†"	ç:1∂•nÍ‰‰Ÿ°¢V3åπ»˛Uúj©˛m¢lÉi‰{Ïè⁄Dµg9c9-’v‰Gu—∫¡eàh“G›Ω•fŒ©Ëﬂe	ﬁY–ëOTö!Ô≠"M‘Ù…Y´RËO…ˇSKkX)NúH\ó}!|Œ/ˇÙ?•Ê6ÿñQÆ.%ï:˙∆êç[∫«!‹(ùÕ& tﬁ0û%ÿÇ∏wbà÷S'$üì=P4˙òﬂ†∑†d{ƒg◊µı›Â^™ç€(æöˆ©|£8íSm?ÅX©€G±(ôÍ≠ü]ﬂ≤ùæπ⁄é¿æU«‘µò?d(-†?+Pm∆@|◊zûu2ê®eUd∆(˛`ñ ΩZ’ØöDÍˆ(«
º2µES¡)’®ÕíÎ(k#π!¡9àRZÜnDk-Ib~rìy§∞#(X≤f[àA7®\2É|ìó@I•ïJ∑¡zıÄ‰§Y—}*à‰›É∫nåõx]¸»%¸ú$VKΩ0Í§≈˜óÒ}ûAZır+iNÏG⁄îÄÇ\≠Á˙‚ˆo+•Ì±(Ò÷Î¶`ñ‡aâú|KR±â4§	&Œ©‡Œ ~h´√0Vî∑Äãˇ ÓÒP≤°Ø•á…¿ÜÔSqz¿G …¨â∞ÑK]ì!Æıéóö˘êZf≈W>Ã‰ö ÕåÎ‰Õg◊ÌÏãdeû|AñzΩõˇÜ‹Ë;“T‘√Ì€Ê†<(—îöÎJmâI≥—îä, GË?ê÷î0]LîM U®≤Ë¨¬™õ≥ôä∫,ã%ñ
¿~<Ä’ΩüñO∆Z=∫–≠R´∫d(“â˙a‡˚zÌJúÑí\qakÃ¸I(\ÍúÂU≤öNÀ%,à∏L⁄IYŒ=w&~‹û◊&,Ë2;±Oè˙.÷Q˝√IqP}OiP
©C¸P/;˙ XFk‰X¶&´fß§ŸyìOq)«·®Ã˙cÈîJ¢u |Rz	9*œ±«Rﬁñòr?ê—fÃ*eo.ïÒ^eõy9®Í=≥_ã=õÙÿ¨1„«Œm>wFhë©„Û˙1‡%¸Ú‚´Ç…?>èp«Ç.ñü^•ux≤`xÉ¡öG]M≈t⁄ÜËrˆ0@°Á¸›Áí≈·z˙sôm.Íî¯ﬂ§"d)àö£€ìÁÂ’»{•’»1ﬁ][í<Ô˛Lvá jôqc§{2Asƒªº™"ﬂÂ%b’9ŸEéÅıª}1∑”ŒÌÁüQˇ-ÌFº˛C¶œˆ5ÈvªŸqHf†uíçj'71@^eÒÌÜê∆oí»ıÇ€V—^
/ÛÔ›)[ecLm.‹H}Œ"e»¡ÑÂÏ|q îÔ4ÇLìßN^},óÑ√íç<vC rB⁄ãØ˛„_πØ/@nnÕw#fiª∑ ¬¸¸Ô*:∑D˛yÎl7ùtá‰s pdÌNq§Ï¯ı*Õ ·◊«éR?ú8⁄èR›î∫ƒ)9„ÒÈà„˘-R˝‹P3›∑ÉÈè\wôÏw;2
ì+õ ,HoLŸ ≥Œ˚HpßŒåÊ8\±ºÉZKï∆u'`ª7:√•ÅÉ #ìWi∑cå©˚È•áMø'äƒﬂ"Ñ*√|‘D4†ŒñΩˇ5Gf/a°lãIÿsõø¸ÒØ·ˇ ^,x…`G¿Rñ—ù^◊hé?=>|y¥Ω{‹:„∂ ÿ]ìÁ ?•∑Ùj„Zê÷ƒn^'«	ÿÃfæL)ÂôÔ)Å |ÚÃ`9¢ë32u‹‡rÑFâr¬z*#"øf.NtXeÖíWæh•Lˇ¢jÆ’‘Ü5´ÊöxŸJzxY ø2˘Ó¥{—%O=ﬂ?√∞Í¬}lœ¸+]‚j˛“”D±Ñß|	OÒ˛)_¬”K3^Mie≈µÈ'^µx}Ö\zòY°¨O√‚ÜﬂC’ûï» Ï™à¡âhıvŸSÛ≥b viLﬂÀ%4iñ∂ÔYøÔ“˙}ÀÊÔÂjÛ∑∞g¸¯ïoï[øıÊÔ%≠˘{	s0x.qÜ0	óëìÑn+yq¥ $uõx‘b$¨‡»Ç–ªF•ÊÔ
l0›ø)¨r∏ÀOlâéy©ôv+ÄÃÅ ¢
gTà®V#Xäá(Å,j™›òEÀ2wﬂ™1DÀ<œ99.ZÑjfmàäÀ!{È¥ÚàûÜ®k1›/jQœDZ1Q1mÇÑJJ—›∏µÕ2J	˚êkÍ¢	ˇôñ∆X∆ﬂkWuVA¯VIfSÖ·+kX7_,b≈*õEárR)H";í3Ÿ”RjHäLö«UxKO¯®6VöÓ»"Œñêô'‹ñge±≤É∞ﬁÓTT≤;ÂöiÖÏ©WdòQ“ó«NÕ´|<ÒMß‚õlâÇ¡˙EO;a0F=î∑±+∂ï\ö¯kùVPﬂ`í≥ísŒíÎQ€vΩÏV_ç˝z¢ÔLWª-wiXÁjŒÆîT;H)·≤)•-si¯Ø—b•∞ƒÚéÕq~Ï™¢úÂˆ•æöñ‘Ä¨ci"◊Ì∂ïgS∏6˚<ûÔ≈€ã=ólXnΩ=‚Uπ@≈,íS`L£-∆cg· øª>]ƒ≤Iz¨ü4Y'{{'{[˚ß/∂∂øıÌÓ±Ì®}¨∂ ÜÃL°{Ó˘ÄUÌ13–=w≈—PMÚÔnÏó4‹B€©∏º√Ñ<éQoèªÈ“ÕÛ√Ö’H,W´º1èâêÎØoå·˙æ+]–ƒ;'Ì`˙ta∫Q0§|¥sƒœ‘^ÊÁÁ´PnË®Miˆ`‰6∫Úõ˘Wãa≠&JXÈNF—¿;èì,∆ª!‘Ùn:í’{Ñ§´≥û¡ÎÖzØÛËõ7R6¯ÏZÌÎÜ¥˜ÈÖ”øöc€mË°C"G3‰`}ó‹‰ô7r¸”DH?›bÈ]l◊≥5	Ã≠-éì6o›`ùgteµ£UM*Ñ4ûÑ£JÛ?\∆¢~ôÎZÙ0¥«o/Êmr’œ Ô*»ñ¯r∑≠Ê≈Ê¶æà`ÙÀﬂ¸€5xh≥ß&Ûå™ˆü
Ãn—QgÔ†5c!J∞è∞cí¸*˜É§}ÍäK+C˜‰Ô–óHÃŒ∞oÊ€Âﬂ`„Ã!◊—p
æoÃPgU4«q˚ƒZ/Ø€Ä§ãF9Eïëñ§Òƒ7k∞6nû˛Y80RJ]gÙ<ôH{£	ñµ™≤äõ≠|xŸÿƒK¨6b››S∑,D˛ÆdEÒiú{vDÈ®(;<Rá≈å!ı}r]˙>…Õ˘⁄Ã∑s,9+®mËƒCX◊b£ºPò¶Ÿ•B®√∑‰ÂΩµºzThØ>ƒˆss	øû„¸z.a∆ÂõQJ¸8p*´Õ†S˘˝§õ…r}Öw«¢"¨¯≥Ô¡œB]/∆OŸKº ˘{~ı∫∫guYr}Ô(èΩóto%iX;ø*	+& ±⁄Ld˜=ÌOXE;·§(§˚TœC§™µ ç)kh<P'ùï§Ú,À‚≈¢!2}NNn6Ÿí∞™Á(«®ò!Lµ≈ÛÉÀ›Ñ3N≠≥ˇÌKÎ¨a7™ø^Sv∂z«l≤4V¨‚,,Ã•iK[ªií»m6AÒ‚+z;ÁÁv!bívÅ¢±]¯ø–‡ ⁄üF8µ”ß∆¯FuÑøÍÑëÀ:òÑ_2f	Á«VŒJ'˙@è„LO5≥…ï=Ÿ°{—] ˇ¡í÷K7„Ë9õPπFG/d´*µDkÖá´Zy!6ë"≤·GÄÁπÃó{â<W‰˛¢<_√Ÿ =ÔkÜhˇ€oæ˛jmueyIõ_≠ª>bƒón¡ä¯VÕÙgÂ/&u¬∑ÜJEÊ)ä`xe÷¶yÚ”≠I˚;.RæÛ¢	|ıß'CÕ7ñPÁ“:Æt]≠ìnJã‹X *»öN‚‰·}S
úµ$ ¯øR¢4.q5Y¥&â÷‰êì1û>d√z'sFãEg
‚‚9†ÛâT5∆:†Wó5>´{≤ecjß’™ùº»/s
£Öô;yV˜{÷Î≠
XJ≠%l∏pﬂ∆nNtièXBÅY™-—ãÔX˙à∫,è≤Óã¬Ó¡¡ˆÂ≥âK]˜≠sÊ˙¿s6©{Í0øáÏ¬™á+\ëÛé≤h‹Ç#Í¯æÿ.Z3¥VàÖZ˘ƒ˜YMº"√ï_ö”⁄≥.R,∂ü∆#€≤◊,xºzÊY£Ãﬁ¡JO[æÀÊ+¨∑JˆnœéYxjÁ/ ï∂%A(YuˆæÔ≠Ê∂ èD9'˛C±y– ^È´Ã£∆¬ÅxTû˚æ6f/˛û^}ÛŸu∆éws˙Ÿ5{‹ı‹õ7µ(3ÄfUüÏﬂ§~ÉzèU»DÙrÑè]æi-úB›KIÜﬁ**ø˛uñªZ“≈'•]Zv,X”ãX¡‹ºÙ#&m—ü,Yƒ.g#^'Ø^#UÆª†*Ω5Égµ®˙NÎ/k¶ü Ö’∑.[⁄Çëº¡‚≤(~`GËdÜu≈¬NNº≥Û¸˘_¬’V±Éµ<u±bZoû%£;:BHèúK‹J•'xêå¿óa]∂ßª–`G4∞à®*é…?Sô¿ì¬7'œÿ	}ã[µ∆aÀt‚É©∞Ç(Z¿®–ˆ.>	ññø&°f©±a£)¿Ë'ÄÀk1ºl÷hT_8ÔπÑÃªe˜@zœ≥X‰ñÓ	Sœ2(ì{ûL”jûˆ¡&Ïb*.ë<)Å‡{ô∫d«Ã≤1•}Ò´;“P©@ûzò–Év9S≠G›Ö∆˜ªGIéüoÌÔìÌ√Á/∂∂O»Ó˜ª'‰¯ÂÛÁ[¨Z†»}≥ˆ√÷ÿÏMˆu/SlNÁrÁ6Ò(Î	ï’˝≈““∫‹èZ∆M1à6°4ΩLµAô:,ø¥í…ûı%ƒ 5Ú%Y™à∏-~PuH˘lòLT≈R∏"´#UrU(≠œ2’ü¨Ω˙Ñº*|Úç-ªOæ∑¡B[€g˘ ÷nÒÇÓ»G5”/]sÃ–Kèl©¬,æAºÆ\œ“j¶L´˛:±#XBP˝ı@ï«@·Îò€ºVÖõõÎgfåô∞ì7‰g@3ıÒÕû7◊dW°ú"u0Óírd¢6¡d≈…‘GÜ≤E^CÙ˙ÂØˇWìoL˙Æˇ! ˜’ﬂ~E‰S∑[πΩN≤ ¢[˜@“á”Ä[ÜFÔYƒHfÆZ‰ÂˆˆΩ—ûã≤1≤˛Æ+Ë·oM“lg4R.ÔN®3$œ)öæ"≤«Qªµd∫~eÂÖLi‡3ã⁄#˘>Í˚rR˜¥MˆûvajπöÂLÎ2X!(•U?∑µ™©(∫WÕB˜7=¢ ⁄Úh’≤îÌ˙2í&LY⁄cY≈ ¥Á‚Yî^nÛ v	we(v≈qVØh\ö˝oŸpqÂU~`qÂï+∆nÎé…\ôê`«¯™€ÌÊ ß4 “‹y⁄mw<âÌπ9K+åvñì±À™ﬂo4˚TÊà“xLöıïö›÷’Ôl⁄õ4ße:k“◊M£éhº[Xô∂Xf{¶˜Xâ.ın™&YyòrWôŒ°DÜ*«àªâK'w a°ﬁArñA·hYëıøîP√a^OÃæRzAm¢—@≤˝ílπÆ‡_µ)£ÒºÇä◊Í2:”yî•£b®m„,≤WÅ’2≤∏‚	ÔS›≤YnCòX¸á¯j:;
.QfÑy4¿íƒ`‡◊4ÎÄßYE"ÌÌπÙÄÛÕ˙À∏åO–»⁄Éª%ã™<jÈ;.^N•ìÌ¿BåﬂCºl÷ë2¢óË=oÃ±…-3mí·€Ø f^C˜|÷ç;úˇ&≥e·d÷\úÃíëì¶ºú‹
;'w∆—I3¶NÀ`l”©$brß¯’ç∆¨=†ŸYjº5÷Ëz@∞:WMÎ^ñI€ôKÎGìÊ:r…8ÆÌ6=7U‘…‘∫:ôç∫NÓñ8M•¥ì≤Ù@ñÍ]˘˛ß´œìF*=ôN´'ç{“D∑oÙRæS∑wÙvd¢˝vh‘=^wdQdYà ÊLªg»fìuªK_â:ÓÉ∑$Òñdä@<xK¥≤ó
:ø:I&õ‰¡cíµ‘µπüâ.ÀgäafÌ1°C¯vﬂÕãXÚvâå%õ‰Ö,ıæ≠îï{Áû∏M–xù/Î}û(ó÷{¢.◊Ïù(JÔ≥Òû¸º˜ÓìÈπ8˘X(3‡È‰S0•Ãéøì;bÒ‰~ªPfçc˜ŸâÚÄd%◊'âdnî{ÔFô9Å∫óéî“Tr}í§ÈìWÙ…t˛î)‘}Úi;Uj5∑D	ã2Ù∂∂≥-ˇÛ®ï¢iS&€‘Ú-MÎW˙8lÍ¡Îu∂h»û¢{Î%˙0˘4çdÀ)Ñ i•IìôÖè˙2‰LÑ«Hç≥äª…’AüJ¥´/”Õ8.ÊbÍäoüfLMëßi–K¡¨;©ÎÇôù˚%œ»f‡wôÅœ•πøe*_À,≥TÓ Ce&Ÿ)≥s≠‹+$3ˆßÃ∆ñ2√Ä‘YÚF“–‰1˚»—ªâm`ÊòÖã„n`}~ç`◊\ü∞◊≠«R∑ À≠∏ö∫¶s-Ã¿≠pGDa_¬9–\ü9¯T’D“ƒ™?EÜD3C~˝˙yıtL[€pù‚OäI⁄ŸˇâZ•Ô"”°¶—:_é˘¡l=´ƒÜ_ãŸ:!ø
√ıîq˜∆t=õ8Ñ[@ò•È˙Wr–»~›0»‡◊lƒ.0∂3ˆl”n3U`6i∑o«ûû7í˚n…û>"ûÈÛ3›ªã∞Ω{fÀû5ºﬂGkˆ¿˚ºè ˇ`œ∂æn—û=s¬pØ,⁄$¡ÿÁ}$	ü¥˛Hö∂õá™ˇ¨€3lZ9≤ùAΩ`œé;´§»ÄÏ¨‹ˆ,ß.ìIÿ
([ÆOèÅ$Cˆ·»ø≤Ÿ◊ãË\–n#x›]ÿº•¨†‹™<{UA»Øzz,ÂÑ‡r ∫¥j≠W{J)Ä·hÓP=&,8np©"qU◊»pj˜rÚ¡Î¡ÿÈ{ÒL*Ω'êƒHÇKj°˙⁄Äo≤∏‰	iÒøÄ«µT‹3È}hUØΩ-∫[û4åÙì fß»nç\d)´«¿0·g;'¥£*Ò≤ÑÌ‹Ã∑Kz/Ìπ¸˚ò#Ïd˜Y#{'ªﬂmùÏÓêˆˆ—Û˘u<*ûD‰%„ädë2Ê¿N”≈É—)¥Cc«Û#‚ƒ‰È·……·sú\≤R‚@3ô–Vâ3ÚÜËs9w\⁄ÒF ·v@Xæ*!!«gag≈3ìÅUôÍVÍùU'–TèIÑØpœò–&ék+8™Û>oyê[Å2É WmN›·'	e∂ª˙µ«ãÉïí˝(áv3$;^∫l◊ØZ˚x‹=û˘›Z -¸/¡;Ï˛˜5è_qAxÃ"ŒøÛÁüâxÒ—Â~[} J}“Úi⁄∞’öGˇ£çÆ¬˛kR'
FÎƒáI±øO‡ãêRÒ€¯'ﬁ%7†\–¯8Ω~ºüº‘áµ…Ã≥Bjµ<úìmåÁnÃ·DNÒ¸:Òπß\8>ç8≈õÀyQ√ ‚N‘Âºï=A‡]È©˛”qgè≥˚éK‹¥óËˇS·ø–1q≈˘›ùe´ì´ËA2´eIf‰—}<X5âˆúh¯ét◊≥9d˝Ú˛)GzàãΩ”Å„¯üˇÙ®M"{#~TØg%{‚ØZ≠Ñ˛§ ﬂäÉ*’HóU3¸†⁄bsÇe≤†ñã√Iﬂz∫$VÀ`wúôm`Jb/Bœ%¯
jËi∏ﬂà')Oå….Ìà¸æe"Lzâí ‚La%È^”bŸ rÍUÁ∏≤xS∞Ü*ıÚCs≥‡ï9◊./[[Æ&^◊Ynß…Y+rˆÒL˜agë}†}Âœó•∆rì∆8gáî∂Zˇ·Î,+Fn`¨”ûüsl2Éw@´›ÆÖN¬æº& Ã§ôE£RÒıtìøjet  d/~úÚq@›âüπÖGÄ™7–5çnvOd}Ä>uAÅ0Ù©˜N4≈Pytw|˝àæÛË•⁄Fv»%ùO#˙°DWx|»î•‡áqg≠t	∞˝£GX£'›sêÕ€ ÉAóâO@≈ÒÖlè‚…¸|e¯Z[;S6Ö¸^øãµŒo”˝˙LEÚÏ„êìêûˆÂ‡ßlXìÏ)≠&ZÒS5bﬁ+	4oë≠VKìûÌEL’êl!eŒ°Ä¯w%äæµÏWg‘2–ÍŸI◊'
ÛrBò€ òçÙ’˚	Ñ;Wÿ–Üèº:ÑÁ^D¯üá¡êµ≈ƒ9É≥ã¥$¨µ7x‡πÆ≠í‡ç∆ìXX1qEÊdËå#ô¶ÄØ¸Tu˘,GÍR‹…6kµn‘†Æπﬁ‹ÿ˘(3ÛM0∆‹0s∂ÖßcnÆ;uÜÄvqÒû±VâUÌt+ió˚ﬁ]⁄MÔN>¬qﬂ9£>“!üﬂ÷ÃL∂	õnv3S¢·z˙s˘~Ík6&#ú q-≠ñò≈a rBû)dQvû0:ËüΩ4CÕÇò∑vÆÉ_ 73˘µúp¨eR#y‡∫ô·i˜…JøY+ê>}ù,“wÎh!c1ãÎÑcTÕÿEˆÒ,ÓêæÎzÓç±h—Z6Tì∂¿&¯‚ .!˚;.2¨
[
;¶ü™¶ïZ±⁄Ëãd‹!»óù°Ûæf¸Ö¡x¢†êÉÀÃpHa˙FOêƒ$.bt'˘í,5;«];5–ª¥y'LX¬]Âlã‰!âLn Ê ’‚V´¡|Í;hu˚≈@¢Ó5)^VF[ì<Œm>ÂÚŸ±≤ÿÎ'§ßê|ÛV≠Z”ÌL§
π{÷§SôB˝*p˜hÈOº·áYzFπN1ñ(7H{ÔhüKÀﬂì∞≠iÖ
¸ùn”≠ñ“´Æë«ö’àÌØS∑$Ë®M>o\Â`≈…qπñ¡°ÑZ	à{„ƒ‰≥LìLãõ7nıa≠X≈Œ|p3™˝ﬁ3e(…Ø‰™–,Ñ].(¨JAÅ”ë_˛ÊﬂÆò§÷æ[≈mæ˚AﬂÒ)z5GÌuˆZÛµ@≈ﬁä˙°wuãÎá∞ØWC:õUç:6[⁄Xç˝‘ˆJÏy∏ıºµIÓòèt:Ñëö…Oœ™û`»ô√,∑dog∆ÎjÎÃió¨?7t;—@c/6<å4dql”P¬»æßﬂãVqËRt"ÕÊc‘ç«]n”vÛv3√˙ì¥ó¬‘„ªnJlÓñ—ß∑ñ6Êé:·∑'è1?`-–-¿Sπ^„†,PêËQÖçôπÖ˚˙	ÓyDraïÌ_œëXŸŒ¬í˜õTßf±√â?∆v„k&3…îŒbÈ±aﬂoGTÒí¨’5ÀeLiµ¨ge∂≥rªjbnfc´a0±D˜z6òñ®?ˇÈø˛Raé™mÖ™´È÷>"˜và∑6¥U[/n≈`Ùë.ıa<Ö©Æˆrárƒd…ˆ@Ó¡Ó»Ωc∞ß#W›Üyß0ç”q≥]`§(Ù-!+Õ πWüdÁüÆK9Ô‹‰ÜÜŸ)çY∆Ó
ØÍ ÍX *;ª©ÔùŒD˜ŸàkΩÍhÏƒ:éb„mª±`π∂ñÀlLÈ‹Ê∂„˜'>KÚ}D s&ñ=[B™$å…‹Ü2∫∆§–Ä‘˛0FA“!36]ômWNÁ˝≠n≠àÅ™L Íf≤õ$@ÁÚ h&{9üPÅá“¥'ê–˚Ï]H_ôÀÃŒh§≈Ø’‰k◊¸‚gﬂø"/œ≠Ò±6yï3ä7fÎZ⁄‰◊z[Ò†∑∫-W?çë¢üi€÷*ª¯–∫—°b\H	ˇÏá‘A”òÉ9u~áI_„0p'‹‘ÿ^u…… Ê}Ùüú{>Ö∂C«EI1c‚ù≥“>è1ÈèXÑàÙY¯^dRjôBº¯ŸÒ¢±Ô\ÍÙÑi@‰«@\≠Æ8;+€õ)˝rŸ˛`∑äB¥∫›<É˛À•¯<N∞we“n ©È¢NÒŸFQìµÏò%èæõï	Øhö[Nô@e ‹å*‘ñπ›ÆÕÆ:¶Õ∆¶«Ù2∂?çÇÃtü_H∆\AÇU∑–í]◊ıãK⁄(1|ç◊≤:-"’z”à&˝àKπ3Zt6Ø‘VX?T±YhŸΩ⁄¥c‹è˝ò*‚Ïˆ˜Ó6„Õ>îµ≈™YµIfÍt`G˘Ê;ñCDÇE Bçh¯éí≥I‰çh?∏˙†c∆É ö†8èO.òˆrœ™Ë˛4y7MÑñ•™PPùXBæ®#ó∞≥Ç.TáXÎS]Çè].û˘bﬂ^‰∆X&µm2í€ØzØUjø.0[ñÈ¥Jûe^”à∆?d&⁄æ∆2yŸ…/›Ï◊	ÌÒ∫†qó}2π±4)tŸ9ΩõTÁ3ØeÛôy](PÛWª¶Æ îÕÜÕ8ÕËÉ‚S*	èåØˆ/ÛoÛ∑è^™≠ZâÑ≤)´òÎv´ò†∑Nû;Ò ò˜Ìﬁ≈4¢{£∏ùEãyaTºÿ°	mU »jv®{!µ©¯aèXïÕ>(^ÂBRìÏ˚ªB≠ºI˘n—Kü∞y´(ñÚcC3m¿ÒGÅh0öÕòø˘Òáπ)—,Sºq3ômÒc^C-§„›ëÀÑÏr",Z÷ıÇ-k∞•WÛ–æïªÌ≥}Äı[éÿkîZ”™r;<9 Vã´s„öwM3≤ÊÎ7ŸÄ±”œ»Ω©]ŸZQ/kœD∞lÀ¯µ÷MÌ
,ºA·ı|ÌˆI√cw∞gˆGWÑÔ≥≈Z¬‰ˆdÅd?±®}qa-õT=…d[N´yıÙõ˙|øt·Ã%%êöﬂTÎÙÜ_J√#?íÏ¸√“°T‘®è!HX\ºÓ{ô3´∑jÉy9.~eDB<Â“uNÉ&¡3◊'áeË◊˘∞|}4S„v2>üÑœ˛jÿ:~—[ˇŸzΩZv˚gg˙∞ß‹j†∑eÕE+≥•m|w!Ì‡‚ªßçÓfa€˘Jß⁄ ‡|£∫ë”ˆA—∂vè40ÿ‚ÛlB`KûVáõqè€y™™(≥xWqﬁÇeŸ3˝v•Q+özEAŸ±![Ô‡?ÏV´c**OPôÓåîöœ¥£=^<˜®Ôü.æœÇpòøØ@G|1ºÀ%√R>e€Dx@ã◊[åÕC;Âã?◊·øk(‚&‘8£L¨ˆHƒ'q¿§Üù˘©ËÄrºÖ_gNˇ≠„Œô?ÅqÜ≥ã∑“ï@S2˜æ∞g6…í!!°ÏX©ÍÉ§r'r	,∑ùùEá,†0{‘ä<}-YŒo‘É†¯≠Ø◊zyçK9éÀMú”ûïúSvÜõñd|›K¿•ß[ =⁄<Öm◊báÈP&Ωõıﬁ+∂¸ˆ‰ÿá›j≤[≈EÀa#*GÀEﬂJi˘rÉ£mÊ 0.∑QÓÒ≈ÿ/ÇÒd\vÑózˆ ?Go©[7◊oT¿ôj„˘Ÿm(Df“kïâaeöúÊ∏t—TCî#ﬁƒX£`DŸ±kÚ§ñÃ9uÚLUÅÀAßËGæª∏¥÷“N˝&«Ï”«¥§5IË!∏Ï‡ñ`¨◊zÃ¡ÔÏhâ&Ã
`Âv „,Œ‚—iÑGûä4©$⁄Õ
Gå0vN⁄è2GN	è¶IÅe/¿V&F/!˜…£≤ÁWÕómÇ1Â{y∏éüÈbÅÃΩ)"R_å@úëÀä«≥ ”ÇﬂöúQ…®åîÅ®l—∫e˚ñ∑IÂ¶Ê}E6»à^23{ÆΩ„C°mÕ≥«„vÎ§5ˇ™g<§ò˜ÂÉîE]NI7HùRIy(õ§í¥ëâMa+ÂÖ‰2{‰ΩÂCÉ⁄ó°Jπâ‡°kô;]ñ|IrÌd≤-/Îïœj]óÕÂ™?Mc¿KöÙ⁄bv-ãË-+4q¸c‹√mN9(?M£m∆ßnW∆ÔbCÛy—2)ΩÓÎÚó‹Óˆòë∑„Ælåå[/‰œ`ktö6œ';wπîv*jaûéëb!3u>ödÂ∆}sª≥y~L“Æe†§n«ı)⁄Í∂köÀâkè!‘fã€æUl]b6‚0h^ìbTõÇ±Ê◊‘xÎÃrdù˚åJVı¬Ïö^R_ÇâDQKJà=8ìa≤°˛√…ﬂ≈„Çq:™îÜ!IèÏ‡∑∫UPmÿÊh◊2’8»…¶´≥ìLáÆ˘|¬D±^ç>C°÷0∆≠ÌF”o2YÃÌø’82ÏÎúA≠Ô≥âˆ	øÜˇx{@˚oèú‡Q@üjR¸wŒ‰π·'\ÌÏëÌ√Ég{GœwK ç÷“nÕ"yï@.≈qêˇOQerπÆaNO*/Zô¥¯mGqLj»m¡æv™˜îUì°€&BwΩ;Õ>Û÷ËßJ‚pÎØ÷¢$Ôï—$]Ø:⁄£#ÍπÛz∑K¡˜°ê$πÀÚ6Ω¥ÚHGNX˙^ò]÷â∆ﬁhn”L®§∂§u7∞ó‘Ÿ∑¯_ ‡£˘FPOÏœqú›ôä8±≠ÔwôI	ˇ üìgá˚˚á?t^æh±Da$up˜ ∂◊ú0l"⁄f'äÒFö5{çty7ÉêY≥fô§#ﬁ[ùé±Y¶ÊÃπ˜†›ÅàN’EÚÕZŒ	4ÍßŒ´Ø{ØKú-‚':Ë$ò»˙3˙ú‹2o†¡_™‘æY~Ô÷1tﬁw.——,uô˘	øR˝ÑIÚBæRH~óù•e¿¯ßƒôõ¡â æÔ8ìX÷ÎÎ}∫9‡¯Âüˇ∂2ÃQä’Vä–a>~ù£ª±rÖyÆhÏ∆^Ï”¢°r∞RòY±™é±a—ö ”æ7¢A8µê˙@±≈îÜ4äÄü'5Æ@Aì •1“gF‘{jä1Ic,a#`-k∞¶Å∂psô∏Å∂˜úƒëHâËëïÍÚÀ∏ÌÕ-OëòÂñ,Û)÷o~Éé‡Áá;[˚Îd˜ΩÒspI≈—Æ…+bX∑–≤‘7|ÅVõ<O(ùÀÓP7ÈBO˝Ü®üR1‡i_¥>ueá÷‰0ÔÊ‰´['á!Ä9¶0≈AÁåù™PH∏g
f¢G≈ Q(&‚RÏCC“)âIædÓ‰÷å’ùÚΩãAL–^VÈŒwŒ¢¿ü†3ñ∞G€ëƒ^vVøbˇ§ÚN˙UØ€[yù%≥l·aÕ1ŒFHOf8âò|∆T¨“9([≈O–+D	‰í Rar|Üqar}0Z@†·˝5(Ø9€≠^=óÇ‘7ÊN`e}%?∑V¸Viª‹Sœì™åí¿ß÷·y˘bo{ÎdÔÄ¸∞ut∞wmâ2ÀÏ˛≈ﬁÒ	¥#€/èOüÉº≥{≤ª}bVÉu|ƒPü--#>h%©–Vq∫:ñ` ÆÄ"∏∞˙AH∞õO %«¬vñ¡Ò1d˛
iaÒXx<≤ÄƒÈ˜— Ÿ’LøPúMØ#∏N—lû˜|IÎ_ñN∂œ?¢Ûø√ß;9z…Y”Ôtv@}†‘™&. o–l…_dŸ›*¢∫∆¢êu~Mì»≥öEŒ|HŒ¸îªƒä∏À´ÍysB®%^†_∂:ä(;+Ûq< ‡–Ç~ﬂ‹≤ÁX>«¬Ñ◊¬ﬂ`‰,X÷+¿ò´ò0Ql˚x1LﬂÂÜ8‹Z?õô_`õOîy>≥Ëv{ÜLÅßÙÍ˚Ñ˚°é∂˜q|∏Wµ∂ùG•e°÷∏µÆÂÁ©)◊yë©õHCËñ›5÷j˝ÒDëÒ¬x√‡ÃÛg?ê¡*S5ÜH'<Ú'jÚ|âÌ;Ò'≈∫›Æ°Gv8äüûçíºÎwy–4˘ª7ﬂΩ†1f◊¥ÁÁÁK}ÎeÊqV∑Lø∏3Xˆ[YÏíµÜA¥8 Q¥mË0
¬∏›vƒôŒgöE?+]t“I[:Â€{`ˆé4⁄#}——∏çÃ .¯vãÎUúΩFïR∫˘¯i)*”ëÀ√Ö*ı!π\∆Z%c]ë{ìW¢‹'aÌS*È€‰"}„-&◊ù8gÌñ•ÆÇBπ<%ΩÀâPôπñ/*™ûÃ$,Â<^9ıﬂX˝§}<ÿ–(®˝
6µ¡f©Íx»’q’»»__'€©∂YÎ≠I!:Hﬂ[SU@e'SÁ–Ïˆöz£	5Ójˆnû§Tôy¯_ä©Á©,†xx9Çâø±°#ÍDhÎÅï«™≠g¬ûÀ;¢} Ò=∑‘¨9>ç0éöûÚWß¥nä›W{ØVeŒÅœ®2ÁTYømÏ4Èdööi‘‹ù…¶D„øˇ∆õt—•zõ÷ë3¡JÀÕ·ªG‰˚›££Ωù›*£ÕÀÉ˝√Ìﬂì£›≠„√¯œ^ÓÕÿ`ìj¿Vˆ 'Ô`Ââ#@ƒÎÛ¨≠8 ú8*¸„0‡‹Å0˙A8˝∏##ÕÀ<Åkc¶Ù	ßåÌ∫(ÅXÉÿÀx^¶Áj≤eÎ£4‚`F,–Ò‰lË≈∆Ïw⁄áåpÏ–sg‚«ÌÁ!∑,¸O0ï±ŸÚgzˆ-Ëì¬Ç∏Æ∂œ˜œB¡ïÓE Ç.ÊÄ	ê÷	\	r!≈ãí|ÔÆNl‘fÁ∑UŒAß]‡ïËåàn-®RÃÖ¶vx354oÓ±T|tÒUàèì~dÖsvÃ9ö[]›6èÚ=‹‹ÿX k”˙Ú  —$πz_≤àF∑p¨7⁄eú®Z“≈É{…!`fà$L¿Ê¢d®ªÒòG1h˙5+T(◊È¶∫"ëômÕïy,ê≤Ø∂–ÀW[X6ñnYÓ!ËO¢ı`£òâ‚V^%*ÍZ^8jæHs9»eß
®7/Úˆ]%6’#~4ãbewjt∂ÂA∆î‡Å•P’ﬂ5:bîX=˛á¥OÑ	nÑjﬁ‹∞vb¶òª{m§¬⁄Ï°ÇöØır“á√W"\◊9I£àØ%K ™–ä"50g}ÍSiU“L)¶]&o
nîôn∑€’wû°*ı◊€¥Ãî#√9,Ë«åÍµË(—ïïo≈l…çiä∂ãVL,ûv†’t
V6Ãƒå”=ç°M±Òß“8 ¯ÉJØSÕ
æ?≥qÃdNÀû%b≈I¥÷≤≤pÌ™≠âòl¨€ö™µ·Í_&ê(—ÀMM†⁄ÊVà≠º:π£ï,îÂ’i¢vÎ¯Á?˝ÒeÄß∞Y/™6ú2_º¬ﬁÜıÌ˛·”≠}n :&[€€ª««{O˜w…ˆ—·ÒqÁdÎ©bªRﬁ[Íío˝‡ÃÒQés;XMè|Ô°oA§o≤ÏÇY∏cf†g¬Ω¬ÓÉæä€ÜÆ1ÌuLÇstf»∞Ç1kaéﬂ[Jé·]:"À¬5JxÇ´bS{#√>Ωx+Py≈Ët¿ú}m™x®Â^œ⁄Ññ∏‰Øxl§—§¶¬6≥Z,~’kEZî:64:öƒ?iMj•û⁄¨ÊQa≤	Å≈ÿÌrØLÈ¬^±:&âJT^'G_gÂΩ{‡˘Úkuø¸”ø¸ø˝{£uGsñc—J∆kâEœGﬂ É»QG)™£;ç±$N4ÎÊ61hGÜ†+ñ÷Éˆπ'"˝`ì¬Aœ∞u¯ò µò–üù83N
»Ù}Ã%=¥¥>ìµ¶ÀÅ ∏“}P√B≈fÈΩ%Ø+ƒÑ≤≤ß ,˘XÔÚY\${8<:Ö1íıÅÎDZ”œz{|@»AÁ{V™pÉ¥«o/Ñ#¯-ΩZ'Û£\L"Ω÷CºŸu”e& +.vI√m‡}E3îÏÑ°≥Ë$üÛk—I·öü‡∏˛4qµÙı¯¯@?˚òÛ…∆ì.{÷^lˇï˚Â_E_¢iÖ∫Ôıgº˚ÂìÙ7ˇﬁ0”d~—”˙€péb\YXAŒ√P ﬂ¿ÂNs3¯∑±∏:PYØÆ|º©⁄ˇ˛	»alxN®3|NQâ
;k»åUVíl§=ä‹Ò(LQvGK?®¢mU£æ3r=∑e ≠Ov!ª∫∆:2#ﬁi«0å∫‰;Ôb–9ÇÖ‹eÄBvºÖì|4æ‘b—≈Ù¢iﬁΩà`Ìµ†¿ûî¡J‘8¨ÿ÷◊>ç±“F¯Ò@í≤ç,¡-∑<ÊÜ…JMr)Ä≠˛ûlÀÒêÒÚÔŸG÷Ö÷‡‡{|∫nê¡ŸØë≤y§âˆA4 	˚„µÙ;Ãm‰'Õ&épaâî	K6T8&2Yï¢¢ê>ö˘«‰∫ûö™kﬁ9/ñFËa¡'º"Q–˜T p≤R∞ÙÍNvF†Î¯gÏÎ,AW6/BËYº’3\Äóètï/47J?∂ÑãÔû!|ßL˛È£∞ŒŸ(Ÿbìæc–9jê=÷^œgù—;Á#í…î/)ï≥¯GÕ ñ»ßı«'ãh*Ñ!»iú -ë}¥Àìù+ËòÚV?º}UôÚ@hÚÊ‚V·ÖõﬂÂ€'™Ç“t>Ü ÌOá.e˙˜ó§ˇ˚“®ŒB£K•6KÑ‰ö …Ω¸˘ÁA#Õ–‡Åöt¶qH,s˙$⁄G§ΩÑ0É.ê%rív;_z≠>CKe∏‚S	«/¬‡úFˇb>·ÃáL3€ÊãôY±ôÕ«ny´ ÎD1ÃKÌ^ÙdPÒINØ'O»õœÆ•íøÙ˙ÜYù3ﬂ÷éÊﬂ`(¸“TëÆ°]/VJh}Ñ„
ã5≤eG©F∂ÔïˆŸÿÄ3E∂¬'î®Õ§éÜ]˛©æß~(i´™‡Tg^˚JÎA=‰UÁ_k¬»>˙NL/ÇÍI•†ÎëﬁR5›ißrEòÁIËUˆ+l ®_Öznàt¨qN6/n†CC–√¨ èÜÌÄ÷+Ïçº|L⁄)<n±ﬁ¢˙´Kù@ò4GáﬁdH∂\∑åt˝UÍt∞“®
qΩNy•∏RÃ¥¢∑Xå√¿ùÃ†°3∞√⁄åº> √3<-Äl%√€Æû(ë“ÀÁBò◊±$|^bmN^/g{qÄÀçÙ†‚‰=`Y@\{%">wì¨Ãßüø∏Lé·Ô1˘úÏ≥ïMø_g≠üD-‹ÜyÅ.Ë‹?e	;EÊm‘?a√ßõaö“…!â⁄mzI ±fL¬2m6Ø3Ö¥sI]¨£Uõ¢Aƒ⁄'Ã?Ê°ˆ°¿ßj$ZA˜˛E´p0Ú˚ÇÆä‘†`	#§˝råÛ]ZÊì¨O%ü°[}«π"ÌoXG=sGU‰ëgê‘ÿÈô¨ Ûâ{<{EYñ)Åv¯É¯ãôv®€Ñ”>wº[ß›ÃHñ	Ω—%ã´,C0â›¿ “…≥™%⁄}ØD†É∞q»_"˚Çñ’ÉÎÏ‰JŒ'ûæW5Ûg,“|èuÖv¿Ä´^ª‰8û∏^ ˜éhr`àu∑ıª´3<Ï∫˝4àrîßŒË«	çÅá»•˙X ->Gf0æ]⁄x~∆î?¿Ñw9b!|é o2⁄]◊ "˚(Xﬁ;àƒ¸èG¯⁄ó≈*∞∫ΩIÕQDÑÂFYQå{¿úr_ÜU5@µæÍ®˙≥¡1◊,d˘Á!•ï∞m\≥T6=V≤û±eˆ7ÊΩõÑ0ﬁbxÜ|’s• ˘îDÛÑ9ΩÌ
pcâ›Ê¶R9ΩoÍœNŒÏôÁÂÙ⁄Kå∏Áû™ÌI\ü∆'“ûÙsÌ®Êƒ≠Òÿø∫=‹Á—ﬂ3qX1”.®-§·&˙î+ÓŒØ◊£–˜»kı:Y}Ã#TØ?·D2$ô1øIΩ•Ø•l[ÑJùtúÿ¥Õªíò/Jˆ¶^∑Y´àæ[¶í[ˆ'‘w√ŒHµ…≤3EÀ5,$Síﬁ2*é∂G°4Ëß«ÕΩI…Tﬂ
d5:„Úõ·;%K˙S8∫∂∑î¡Í'óa>÷ΩÊXVa≤ÇDi“|¥Eåø ﬂQÉtÛ’Iƒ[eâ2\M/O	7§]õ“≈≥|§læ(W·V53CâõÁ9J√3~™a4Bˆv÷5°€›l·ÏñÙŸÌ{£∑Üä3,q´‰åJCÏn4‰)¬gInTöêçÊMÛ,”úÄÌ#%_˜Á?˝„)˚ºƒ ôÂq&Ä∑‰Suë√¸âqsõÂ(ﬁœÅ+üúÁ™Bá¶Íoíìo<eÇê‚:©Á—Ò¢4Ê3d]tÂÄÑ§ÄÄºW,!†∂6ùê¿/Â∞µLùdy÷ZÆä≥lgÓÙÊÕçr4@£TÏk—JŒ/√´˙3º¶äˆÊWÆÙC.¡)WŸ>ó“üñ
2f=ôÁŒj6oÃ±nû§bjkﬁ €bI{cÇj@[ÛAﬂ»N@_Ë£è«®mK%®ﬁ#ksÅö;˛ÉÏƒÙÁ2#	´ÖCe’≥√ﬂ˚¶t≈Y∞ılLåd\%ópë+©û¡-ÿO≤6ﬂ¬¨«Ë°ùÇR>67:û|~=
¬°„{?Q9RQûHl»Û∆Ú˘•êP‹;NJY–-≠gA…;bu*Î/´JòÛã∞∫-ÇOóX<_]√aô^¸D√Sÿ”ÍÂUÌ )kCñ≤ç»¥ﬁùÂ(|≠Å-q¨Êπ(>w'°#R+ë∂ÑÌeﬁtÙe]˙±¬Ë«JC˙ë‚óa74˚Æ,ÑÒ‰wòa™qzq*–%ì^õ 7}cMÇrå˘ˇ   ˇˇÏ][o€F~ﬂ_1õEkà[é∂âìÿ:IalÓv∫XA¿ätDDíä#~Ëhê-∞ÏKü⁄Á›ßˆ˜Ùl¬Œô9∑3$uq›DzHdä3‰úôsô3Á|ßÍ5:œDa<°,‚%áWË∞G˘J∞£Z‹ÒÃb≠]‘	∏#^p˘‰ó§8?‚õ¨|a'·Ø—î‹ÙÅÂœÇIì•Ã⁄∆D`∑œbá—m§Óˆ◊üw7ﬁˆ_Xô≈„‘QÖò¶Q=±èÉQ4@4å/”òUíC%ˆò’[RDªÃ–Ìxº Ó˘µˆí8Z∏^Ω≈ÙA ^í.Ûí 8J3ÿ:˛°;˚	¨aç®2x∂}Ç¯ﬁ©‘ÉUâ‘jû8WøõÂ,·æÂéÃp.ôYÈı¶≥ûÜ©û'%1$ 
òãù”‚ò`>Iëëùæ-éÏ]K.ãìî—›»…œœ‹ñE}yÍ¥"æBrñó¥4íÀÉπ…í≥ÛÓÂ-Û‚r>¢˚ú0ËfûYOYû/ùô…p¥ÕC?/#™Í⁄[à±˛,÷ªH1Cª>gcÓ˜iŒÅA˜·àÇ≠0Ê™ÃπŸl¸:∆û»ﬁûÍ≤Ù}Ú∞s>5oÖÆ˙…(ØÊ
Ôö<#ö†í”+Ï¶ßñI≤$za5=yÇƒ#˙cê'K£®å ˘®IY$,ãäj¯Ã¸î¨£Ô}™Vjp	ÂµR∑s™€Ô~.â*<u”¥M\'ç‚nƒm&Ï,ÄØô,†…ÛîÇπ˘Ã®ñ&C ñ!´.!y}>¿ód$ôu∂ÕàYÑ‘}‘‘˝WE®ø\üã&¶(<—ﬂË'ˇÅ.è*§ªæ«Q˙S%!B@Klv›Ejãy≈4EÖºk¢+ÃàáYîE9$¶-–E¯Î˜ﬂ~SƒÙ”¬/…¨tdû<áÚ3Ï¡∂85˛∫˛c≥EXYóve&#G•Ù≠l9\‡JÑmÉ˘πÁ(±o/ÉŸ»Qñ2©aÜœNíe∆Qî3Ê(Ò,¸r£4.∑™ë„Ê/,p)26eÏfC°!g±€4Ü®VŸf ~‡ôjA/üP>ê$Í$ö[h˙íY‡EÆ^°‘‰ß∞€Jt¬ÿ >0•Rm°qŒÉ¸Ü˚≤,DÓxÚ5–`@∞å{ƒ‡6U)˘)BªòõÖd<A0ã“∑Pıj<–( H ©<€§ªÒ	¬∑Ä
œjŸÙ8§9{∏B∂∫ü∏7œ+ÉÈ™∏IØÜº"lh⁄&w!ÓöÁñÇ`v)Èı≥â°%{‘ª∆òöû’˚ôî√ôﬂKíú9cXe]>≈ë¬ç
¿õhÏpøå øÇ=YªS@/q•ö!ıHƒÀ.#"èÛ.“Ç^ø"∑Ìp47ZˇdQ~óK÷$w"¯E⁄ıΩ$∂|oDàìøMÃú˝+ﬁ∂2¥ì∑ì˘€∞8ƒÌ2—7˛Ê∑ÛÔ˛˚UØm%ôg±˙{Pq¬x6rX≈;kô≥€h6m’{ËÇPæã-´z*É·xz–dUkÀ%®©TVµ4„èÙ’UDj±û<ùy◊π`)¿ 	1Buk0ç÷úu¨ñﬂc≈ø3^;Ed8 Á?…ß{£à™°}ûLó:%or )iõ˛wÖpvK€£ÓÏ&%Ÿ&œ≈=õÚ˜µ5rˆ¢ˆ¯ÔDÉ9@U®—=˜„,opë./É˛ë”7=»ˆ¬d‹£q4Ú‘Vö Ÿx+g˘A{ºÃ Âk¨(ù*+™◊¯´K£yk‹bö‘ÔëÙ's`VáWÀ÷—±sÁ‹‡U÷Yÿp’Y–ÍÈ8Î,¯'£,ÒÏùlRx¶$«aF?>à±wÀ ‘1ã/^nÈ°õŒÇ:•‰ìﬁvêm(e/ÆB‚´¿å(˝§£c_1ï…UrG˘îÏ˜#∫ù‚∂&ÿñ≤}çK√G‘å6m-’≤í∂áè√çc5≥D´WÖ
¨((ÿWRV¡⁄Rí`˘≥‚ÏW9éB≈€¿÷≥nZ∑Ç¸ch^‹$Võ‘ütı*‘&‚Ñƒ∆ÃzŒÑæÚ¡à˝O∞/¥{*j€Y2åÿ€äË º‘†h◊ÊE-_äQΩ|4.ÌÏ]’>%êÖËÙˆmN/Ω	CÀ(Ô(»§vufaoê%t%… ﬁ–Gyã\Ò∑Fõ±M1äÅµ¿¯‰√ÊU˘≠j6õ≤#g˙…$…”1†∞ºÜ˜¶¸K\é–Òô;(v76dÁΩº∏dæl“»Ωƒ<ÕZ˙ã5£∑÷◊e?ı∑$ıÅr∆(œ™'¸õJqÆ›Qä≥üørD˜™ †›:8°∏˙D[0Í¿ «Ä“P#‚ÆBÊpÃTálÛ‹Îê˘=iÕ+ë—±ÃYà¨â√Eù˘—\UƒÍ%–◊-wœ©<∏¥ÛÎ˜ˇ˙‡©:ÊÛ≤ﬂÍoY]ñP•;ñW@ﬂ—w±z÷-Z∞ﬁÄÉ`eÂ˙≤‚√u–∂π·‚®C4ÁÂ”?∆Ÿ›ê¿\[>Éª⁄‹ÆÈŒ D•™xôªiö§˛Ωîl¢öBæ»Œ9≠’Û‰E=ÿıM’Vwe⁄óˆz/$iu¡4ÃZoíè€Ì÷)øZ¥ØWxYd•™pÄ√ñvxRb>lm	™™¸Â»,8írö2¨™=àπ`Áî:+'Î|ÒQ‚›1B‚?ø5ﬁq–wllÁƒùämÑ]#≤ip¥Cvï%rÂÑôÁ4Ug#G˝X)Üìë`@Uz8•⁄È8J°F+oΩã3‡jzÍgbcqÖ[qÙ∫:πtπM˛ûLHè.Ö0b.{®iÁ†¸sÿz∞læé]"Büù'i‹+üñπNC∞yi|±UQâOòﬂ≈∆8€¬€ßñò«úµœf’ÕÖµ«QÜ’∏ƒùdn'Y3ﬂKaÕaπ }1Ó–©¿8˘MGêMG=RµD$¸ﬂ£ïÆñ€∫À>ƒ◊söÿ 49arÏËúa}rT“5∏—n.∂:æ#ˇ∏ó˜⁄¡Ëm0àÀ±w⁄0áPvú&ΩàäÆì8ÔÔL2j€jÍáoi<nbÙó<ùVΩˇÅ9≠≠<ùT∫≤õ35!¡I@•≠¶›Z(ŸÎ<øæ|≠ƒ›áìïÁŸÉÏU´@„Øíåˇ;•i≈¥–è‚aîLÚV·∂ü¿ﬁÎ
ÈV®g
·<≥◊'≠(MpÓ,Îé∂mÈca<tMúz’GŒ3rè +nºP™=∞uŸXZ3„Osì`Û˘»•ú.}ÂRﬁm'îy„úÓå≈Â·É∆ïÿ{•]≤&/µ€Ì5 º·≥á`ﬁÃ‰Zwô|P
yY¶]g”n/ç»î⁄bŸD|9Åújq.$πb˙Ì÷7ªó≥Qg«í©ÑpJóŒx2 @SÄøß—1µ9˚˚'˙BR˙Ï_Ÿ6éG>¨3∂Öëc-4œqöI‰x(Ë‚õ	L©ú∆ »˝›πÆì‡Y›Ú)sã”ïÈª2}W¶Øı¸ïÈª2}œ¡ÙıdŒo{B´ΩôGò…S]sâu§ôL∆kÄvÁ∂¥™»ÿBÉß¥!–ª∑Ó1„k‹6 µ∞·6ù69å√h˝ÎÈ:¸O ë$H„,)·5‚ˆ8ø≤`*õÁ>µ]ÃôÌ∆πüŸ.ˆƒ∂ÀÚHÊ:≤’˛`„œêŸÏ`◊}∫∫$ |âˆ⁄+◊"–ƒöBè@◊/≠˛óˇÛ?ø◊πEá¢WôßuZò}íâPÿ≥"‡¨0Ù.;DÅç\Ôò…Ï7ñÌ…ù±Ö≤¥Eû˚zß©é97NQaﬁuË∑4vñrÉbøÑD»#V’≥ä„
!Ùé!DZ\ΩÆÂ§òø6€ÂÏ·⁄(πÑâGºìO†$„,Ú‰©› ˚Tz8URûjbïÙ}üˇi„ﬁÊùΩÿŒüÓå3‰R ◊ÅZPG) N÷Ø]/Nù›~ç…„ PÆr»
Õ˚HFê¡°ïﬁäCÔ∞iËh¢6'9Íæ≠¢¢í˝u4•[ﬂ¨!˝7Âfë∂§%¥∑\¢†•Î‡g‡ãvÓ¨kñ!©DYﬂË:™UP˚"¥Eë	ÎV.)#√íÉ¶ªK\‹`¡ÔJóéçeØ&5yÍ9∞±÷Ëwùë	Êƒs*h•;W(ØS3(¯åjînC˙+´%_ZPÙÜj}æŸÅ	Û&ÜÀ`“óÂÂvÀ$ØYqÁÎ∑	V¯ª¸ú9'úvî∫Ï|Dﬂ ¡dw=ôi%±¥»”‰Kß¨)≈Å•},Pwî 6T∫á¶t—ëÜ\˜ ï
°AÔõKû“Œ©ø~sY^C<á®x∆itÕíΩä…™¿çæa/ÎœQn´`¿k_F#‡vø·Û1´ K_p˘¥V˛?˛√.ÀÜ¨~]M‰]˝BÈÏ.RÎú–’ø≠©:º›ètWñÍeRW,°Ë§FÖ>0v∂
'∂πÁ6˝8ç÷Â¢≠Öù¡5–Æïjo†NÄéK;ìú„gºöî‡d>ì∞⁄‹;/Ó’ês?Ó˝a~ΩôƒlŒVú[:Îs*Á`¢.ﬂò5–	t{ß¯πÍM«Û˙îx‰€o ¡3‘èï~≥∏§Ä&´¡%Ñ ÁüªÄUX`≈C(N-A„˜ÌzÃ’•Dı G∫H¸ƒ±Qe)ØOÜù~yˇ_„æ„|≈OÛhÈ‡ÄYè©È˜∑(eDí„ÅZ˛¨˙#wı|‰∂Ñ˜i≠e˝$…◊Ï#1ı≥K÷∂ ˆ¥À¡~◊\a§ÂánﬂÓ¡â…ù`JZ◊◊77x´ÀcCwÿK∆Qâh¯…∞(›”˝Da≤9	V‹πÓ‹U8âUEXª‹êˇﬁŒ‘

'U3Ì>›,êKèw´‰€¬d}0‰Ò:€D¥Xıå´¨á¬√ıqIu6˛›pÍ«W[◊˝‚«¯ØÌ~1◊âÇ[Ó6ÄìÃ?wYÇ˚oº+ÆòZ±µaÎÌBUQ¡‹=Å_K“…@B¶^8∑é„™Î¥é^áV„@ì£ÑíãNÜCÄoÆä5·Q«õ_tÇhXD∆)ë&zA¥l∏Õæß…âˇÉïT≠ƒ1†?_IN2Oûï¨¸˝GÔ==8|ÙêÏ?{Ï˛ﬁ—¡Ww…·≥hXXñæ
€apÒ•ùø$yøå◊
“àE§M Ù:‰!jã‹≥∆Yäº@Í˚0—6°õRQ8òB‚{ﬁèËu˙Ö¡fç”‰8D$ã≤øà2Sí"≠Ó‡/¥“=…˙i<zÌå‘®™6ÙÅúÜ0˛5ï!yú&„$£˛*L¢Ì⁄îØ:¿QjŸ‡ú‘dìØs†-v6É@ê;»ÖÒ† *ﬁÎπı∂7Æ≤§ ? fèﬂ.,o¸nù¬tÅX¯N√$‘£—çXuºÜ"Çeh/é_X
EkRÎÒÕà@®5•
‚ÏÊ˛  ˇˇ ΩïÍ˛