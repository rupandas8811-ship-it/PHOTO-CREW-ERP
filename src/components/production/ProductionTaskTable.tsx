import React, { useState, useMemo, useEffect } from 'react';
import { Camera, Calendar, User, Film, UploadCloud, Edit3, Image as ImageIcon, Link as LinkIcon, CheckCircle2, AlertCircle, Eye, EyeOff, Lock, Ban, FileText, Search, FileSpreadsheet, Download, Printer } from 'lucide-react';
import { formatDateDDMMYY, resolveStorageUrl, uploadProofToStorage, formatINR, parseCustomerProof } from '../../utils';
import * as XLSX from 'xlsx';
import { createPortal } from 'react-dom';
import { UnifiedEventDropdownCell } from '../UnifiedEventDropdownCell';
import { StatusText } from '../ui/StatusText';
import { CameraLensStatsCard } from '../CameraLensStatsCard';
import { ListSortFilter } from '../ui/ListSortFilter';

export const ProductionTaskTable = ({
  activeSubTab,
  orders,
  productionList,
  editorAssignments = [],
  operationsList = [],
  productionStaff = [],
  rawFootage = [],
  logs = [],
  searchTerm: _ignoredSearchTerm, // we will use internal
  statusFilter: _ignoredStatusFilter,
  onSelectProject,
  onAssignEditor,
  onAssignOps,
  onReassignStaff,
  onUploadProof,
  onUpdateStatus,
  onPreviewImage,
  payments = [],
  leadsData = [],
  currentRole = 'Production Team',
  editorsList = [],
  setAssignedEditorsModalProd = () => {},
  handleOpenAssignEditor = () => {},
  isProjectLocked = () => false,
  setNoteModalLeadId = () => {},
  setNoteModalOrderId = () => {},
  setNoteModalCustomerName = () => {},
  setNoteModalOpen = () => {},
  handleOpenResendReviewPopup = () => {},
  handleOpenClientAcceptance = () => {},
  prepareEditorWhatsappData = () => {},
  setSelectedLeadProd = () => {},
  setDossierError = () => {},
  setDossierSuccessMessage = () => {},
  setLeadEditor = () => {},
  setLeadStaff = () => {},
  setAssignRoleFilter = () => {},
  setLeadPriority = () => {},
  setLeadFootageStatus = () => {},
  setLeadProdStatus = () => {},
  setLeadRemarks = () => {},
  setLeadStartDate = () => {},
  setLeadTargetDeliveryDate = () => {},
  setLeadExpectedDeliveryDate = () => {},
  setLeadActualDeliveryDate = () => {},
  setLeadRawFootageDate = () => {},
  setLeadClientReviewDate = () => {},
  setLeadClientApprovalDate = () => {},
  getAssignedEditorsText = () => ''
}: any) => {
  const [openActionDropdown, setOpenActionDropdown] = useState<any>(null);
  const [activeCardFilter, setActiveCardFilter] = useState('All');
  const [showSmartFilter, setShowSmartFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState('Newest');
  
  const [searchCustName, setSearchCustName] = useState('');
  const [searchOrdId, setSearchOrdId] = useState('');
  
  
  
  
  
  const [dtStart, setDtStart] = useState('');
  const [dtEnd, setDtEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [appliedCustName, setAppliedCustName] = useState('');
  const [appliedOrdId, setAppliedOrdId] = useState('');
  
  const leadSearch = appliedCustName || appliedOrdId || '';

  const leads = productionList;

  const getProductionPriority = (prod: any) => prod.project_priority || 'Medium';
  const getTargetDeliveryDateFromAssignments = (prod: any) => prod.expected_delivery_date || '';
  const calculateDaysRemaining = (date: string) => {
    if (!date) return 0;
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };
  const compareRecordsByDate = (a: any, b: any) => {
    const d1 = new Date(a.event_date || a.created_at || 0).getTime();
    const d2 = new Date(b.event_date || b.created_at || 0).getTime();
    return d2 - d1;
  };
  const printReport = () => window.print();
  const formatDisplayDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB') : '';
  const setMasterOrderIdForDetail = () => {};
  const setIsDetailModalOpen = () => {};

  
  const resolveOrderAndLead = (prodItem: any) => {
    const order = orders?.find((o: any) => o.order_id === prodItem.tracking_id || o.order_id === prodItem.order_id) || {};
    return { order, lead: {} };
  };

  const toInputDateFormat = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getProductionStatus = (prod: any): string => {
    const status = (prod.editing_status || 'Verified Footage') as string;
    if (['Pending', 'Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Uploaded', 'Footage Handover', 'Assigned Crew', 'Staff Assigned', 'Crew Assigned', 'Operations Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'New Project', 'New Project Arrived', 'Order Created', 'New Order', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Booking Requested', 'Follow Up', 'Follow-Up', 'New Lead'].includes(status)) {
      const assignments = (editorAssignments || []).filter((a: any) => 
        a.production_id === prod.production_id ||
        a.production_id === (prod as any).order_id ||
        a.production_id === prod.tracking_id ||
        a.order_id === (prod as any).order_id ||
        a.order_id === prod.tracking_id
      );
      if (assignments && assignments.length > 0) return 'Assigned Editor';
      return 'Verified Footage';
    }
    if (['Editor Assigned', 'Assigned Editor', 'Assigned'].includes(status)) return 'Assigned Editor';
    if (['Editing Started', 'Editing', 'Editing In Progress'].includes(status)) return 'Editing Started';
    if (['Internal QC Review'].includes(status)) return 'Internal QC Review';
    if (['Ready For Review', 'Client Review Sent', 'Customer Review'].includes(status)) return 'Customer Review';
    if (['Editing Completed', 'Editing Complete'].includes(status)) return 'Editing Completed';
    if (['Client Acceptance'].includes(status)) return 'Client Acceptance';
    if (['Revision Required'].includes(status)) return 'Revision Required';
    if (['Revision In Progress'].includes(status)) return 'Revision In Progress';
    if (['Approved', 'Final Approval'].includes(status)) return 'Final Approval';
    if (['Delivered', 'Project Delivered', 'Payment Pending'].includes(status)) return 'Project Delivered';
    if (['Order Closed'].includes(status)) return 'Order Closed';
    if (['Closed', 'Project Closed', 'Completed', 'Project Completed'].includes(status)) return 'Completed';
    if (['Project Cancelled', 'Cancelled', 'Canceled'].includes(status)) return 'Project Cancelled';
    return status;
  };

  const getAutomatedProductionStatus = (prod: any): string => {
    const baseStatus = (prod.editing_status || 'Pending') as string;
    if (['Order Closed', 'Closed', 'Completed', 'Project Closed'].includes(baseStatus)) {
      return 'Order Closed';
    }
    if (baseStatus === 'Client Acceptance' || (prod as any).production_status === 'Client Acceptance' || (prod as any).current_status === 'Client Acceptance') {
      return 'Client Acceptance';
    }
    const assignments = (editorAssignments || []).filter((a: any) => 
      a.production_id === prod.production_id ||
      a.production_id === (prod as any).order_id ||
      a.production_id === prod.tracking_id ||
      a.order_id === (prod as any).order_id ||
      a.order_id === prod.tracking_id
    );
    if (assignments.length > 0) {
      const getTaskStageRank = (st: string, driveLink?: string) => {
        const status = st || '';
        if (['Client Acceptance'].includes(status)) return 5;
        if (['Completed', 'Editing Completed', 'Editing Complete'].includes(status)) return 4;
        if (['Customer Review', 'Client Review', 'Client Review Sent'].includes(status) || (driveLink && driveLink.trim() !== '')) return 3;
        if (['Editing Started', 'In Progress', 'Editing In Progress'].includes(status)) return 2;
        if (['Assigned Editor', 'Editor Assigned', 'Assigned'].includes(status)) return 1;
        return 0;
      };
      const ranks = assignments.map((a: any) => getTaskStageRank(a.status, (a as any).edited_drive_link));
      const minRank = Math.min(...ranks);
      if (minRank >= 5) return 'Client Acceptance';
      if (minRank >= 4) return 'Editing Completed';
      if (minRank >= 3) return 'Customer Review';
      if (minRank >= 2) return 'Editing Started';
      if (minRank >= 1) return 'Assigned Editor';
    }
    if (['Pending', 'Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Uploaded', 'Footage Handover', 'Assigned Crew', 'Staff Assigned', 'Crew Assigned', 'Operations Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'New Project', 'New Project Arrived', 'Order Created', 'New Order', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Booking Requested', 'Follow Up', 'Follow-Up', 'New Lead'].includes(baseStatus)) {
      return 'Verified Footage';
    }
    return baseStatus;
  };

  const isProductionStaffAssignment = (a: any) => {
    if (!a) return false;
    const sName = (a.staff_name || a.name || '').trim();
    const sId = (a.staff_id || '').trim();
    const prodStaffRec = (productionStaff || []).find((s: any) => 
      (sId && s.staff_id === sId) ||
      (sName && s.name && s.name.toLowerCase() === sName.toLowerCase())
    );
    const dept = (prodStaffRec?.department || a.department || '').trim().toLowerCase();
    const role = (prodStaffRec?.role || prodStaffRec?.production_role_speciality || a.staff_role || a.speciality || '').trim().toLowerCase();
    const nonProdRoles = ['photographer', 'cinematographer', 'drone operator', 'dop', 'camera', 'camera operator', 'operation staff', 'operations executive', 'operation manager', 'venue manager', 'operations', 'sales', 'sales executive', 'sales staff', 'sales manager', 'accountant'];
    if (dept === 'operations' || dept === 'operation' || dept === 'sales' || dept === 'accounts' || dept === 'hr') return false;
    if (nonProdRoles.some(r => role.includes(r))) return false;
    if (prodStaffRec) return true;
    if (dept.includes('production') || dept.includes('editing') || dept.includes('post')) return true;
    const prodRoles = ['editor', 'editing', 'album', 'teaser', 'colorist', 'audio', 'sound', 'designer', 'quality', 'qa', 'promo', 'trailer', 'post production', 'production', 'retoucher'];
    if (prodRoles.some(r => role.includes(r))) return true;
    return true;
  };

  const getRawFootageDriveLink = (prodItem: any): string => {
    if (!prodItem) return '';
    const { order, lead } = resolveOrderAndLead(prodItem);
    const orderId = prodItem.order_id || order?.order_id || prodItem.tracking_id;
    const leadId = prodItem.lead_id || lead?.lead_id || order?.lead_id;
    const eventId = prodItem.event_id;
    const extractFromNotes = (text?: string | null): string => {
      if (!text || typeof text !== 'string') return '';
      const vMatch = text.match(/Verified\s+Footage\s+with\s+Consolidated\s+Link:\s*(https?:\/\/[^\s\n\r"']+)/i);
      if (vMatch && vMatch[1]) return vMatch[1].trim();
      const cMatch = text.match(/Consolidated\s+(?:Drive\s+)?Link:\s*(https?:\/\/[^\s\n\r"']+)/i);
      if (cMatch && cMatch[1]) return cMatch[1].trim();
      return '';
    };
    const extractAnyUrl = (text?: string | null): string => {
      if (!text || typeof text !== 'string') return '';
      const m = text.match(/(https?:\/\/[^\s\n\r"']+)/i);
      return m ? m[1].trim() : '';
    };
    const noteCandidates = [
      prodItem.project_notes, prodItem.remarks, prodItem.upload_notes, order?.notes, lead?.notes
    ];
    for (const n of noteCandidates) {
      const verified = extractFromNotes(n);
      if (verified) return verified;
    }
    const candidateOps = (operationsList || []).filter((o: any) => {
      if (eventId && eventId !== 'MULTIPLE' && o.event_id && o.event_id === eventId) {
        return !orderId || o.order_id === orderId;
      }
      return (orderId && (o.order_id === orderId || o.lead_id === orderId)) ||
             (leadId && (o.lead_id === leadId || o.order_id === leadId)) ||
             (prodItem.tracking_id && (o.order_id === prodItem.tracking_id || o.lead_id === prodItem.tracking_id));
    });
    for (const op of candidateOps) {
      const fromOpNotes = extractFromNotes(op.remarks) || extractFromNotes(op.upload_notes_remarks) || extractFromNotes((op as any).Upload_Notes_Remarks);
      if (fromOpNotes) return fromOpNotes;
    }
    const rf = (rawFootage || []).find((f: any) => 
      (orderId && (f.order_id === orderId || f.tracking_id === orderId)) ||
      (prodItem.tracking_id && (f.tracking_id === prodItem.tracking_id || f.order_id === prodItem.tracking_id))
    );
    if (rf?.upload_notes) {
      const fromRfNotes = extractFromNotes(rf.upload_notes);
      if (fromRfNotes) return fromRfNotes;
    }
    for (const op of candidateOps) {
      const consLink = op.consolidated_drive_link || op.Consolidated_Drive_Link;
      if (consLink && typeof consLink === 'string' && consLink.trim() !== '') {
        return consLink.trim();
      }
    }
    const prodConsLink = (prodItem as any).final_consolidated_drive_link || prodItem.consolidated_drive_link || prodItem.Consolidated_Drive_Link;
    if (prodConsLink && typeof prodConsLink === 'string' && prodConsLink.trim() !== '') return prodConsLink.trim();
    if (order?.consolidated_drive_link && typeof order.consolidated_drive_link === 'string' && order.consolidated_drive_link.trim() !== '') return order.consolidated_drive_link.trim();
    if (lead?.consolidated_drive_link && typeof lead.consolidated_drive_link === 'string' && lead.consolidated_drive_link.trim() !== '') return lead.consolidated_drive_link.trim();
    for (const n of noteCandidates) {
      const anyUrl = extractAnyUrl(n);
      if (anyUrl) return anyUrl;
    }
    for (const op of candidateOps) {
      const anyUrl = extractAnyUrl(op.remarks) || extractAnyUrl(op.upload_notes_remarks) || extractAnyUrl((op as any).Upload_Notes_Remarks);
      if (anyUrl) return anyUrl;
    }
    if (prodItem.raw_footage_location && typeof prodItem.raw_footage_location === 'string' && prodItem.raw_footage_location.trim() !== '') return prodItem.raw_footage_location.trim();
    for (const op of candidateOps) {
      const rawLink = op.raw_footage_drive_link || op.Raw_Footage_Drive_Link;
      if (rawLink && typeof rawLink === 'string' && rawLink.trim() !== '') return rawLink.trim();
    }
    if (rf?.server_path && typeof rf.server_path === 'string' && rf.server_path.trim() !== '') return rf.server_path.trim();
    if (order?.raw_footage_link && typeof order.raw_footage_link === 'string' && order.raw_footage_link.trim() !== '') return order.raw_footage_link.trim();
    if (lead?.raw_footage_link && typeof lead.raw_footage_link === 'string' && lead.raw_footage_link.trim() !== '') return lead.raw_footage_link.trim();
    return '';
  };

  const getRawFootageStatus = (prod: any) => {
    if (prod.raw_footage_status) return prod.raw_footage_status;
    const rf = (rawFootage || []).find((r: any) => r.tracking_id === prod.tracking_id);
    if (rf && rf.status === 'Received') return 'Footage Received';
    return 'Pending';
  };

  const getAssignedEditorsList = (prod: any) => {
    const fromAssignments = (editorAssignments || []).filter((a: any) => 
      (a.production_id === prod.production_id ||
       a.production_id === (prod as any).order_id ||
       a.production_id === prod.tracking_id ||
       a.order_id === (prod as any).order_id ||
       a.order_id === prod.tracking_id) &&
      isProductionStaffAssignment(a)
    );
    if (fromAssignments.length > 0) {
      const grouped = new Map<string, any>();
      fromAssignments.forEach((a: any) => {
        const staffName = a.staff_name;
        if (!grouped.has(staffName)) {
          const staffRec = (productionStaff || []).find((s: any) => s.staff_id === a.staff_id || s.name === staffName);
          grouped.set(staffName, {
            name: staffName,
            deliverables: [],
            role: staffRec?.role || staffRec?.production_role_speciality || 'Editor',
            mobile: staffRec?.mobile || 'N/A',
            type: staffRec?.staff_type || (staffRec as any)?.Staff_Type || 'In-House',
            status: a.status || 'Editor Assigned'
          });
        }
        if (a.speciality) {
          grouped.get(staffName).deliverables.push(a.speciality);
        }
      });
      return Array.from(grouped.values()).map(g => ({
        ...g,
        deliverable: g.deliverables.join(', ') || 'Assigned'
      }));
    }
    const staffStr = prod.assigned_staff || prod.editor_assigned;
    if (staffStr && staffStr !== 'Unassigned') {
      return staffStr.split(',').map((s: string) => {
        const name = s.trim();
        const staffRec = (productionStaff || []).find((st: any) => st.name === name);
        return {
          name,
          deliverable: 'Assigned',
          role: staffRec?.role || staffRec?.production_role_speciality || 'Editor',
          mobile: staffRec?.mobile || 'N/A',
          type: staffRec?.staff_type || (staffRec as any)?.Staff_Type || 'In-House',
          status: staffRec?.status || 'Active',
          deliverables: ['Assigned']
        };
      });
    }
    return [];
  };

  const isNewProject = (prod: any) => {
    const s = getProductionStatus(prod);
    const autoS = getAutomatedProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Raw Footage Received' || s === 'Verified Footage' || s === 'Assigned Editor' || s === 'Editor Assigned' ||
           autoS === 'Raw Footage Received' || autoS === 'Assigned Editor' || autoS === 'Editor Assigned' || autoS === 'Verified Footage' ||
           ['Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Editor Assigned', 'Assigned Editor', 'Pending', 'Footage Handover'].includes(raw);
  };
  const isInProgressEdit = (prod: any) => {
    const s = getProductionStatus(prod);
    const autoS = getAutomatedProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Editing Started' || s === 'Editing In Progress' || s === 'Internal QC Review' || s === 'Assigned Editor' || s === 'Editor Assigned' ||
           autoS === 'Editing Started' || autoS === 'Customer Review' || autoS === 'Editing Completed' || autoS === 'Assigned Editor' ||
           ['Editing Started', 'Editing', 'Editing In Progress', 'Internal QC Review', 'Assigned Editor', 'Editor Assigned'].includes(raw);
  };
  const isClientApproved = (prod: any) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Final Approval' || s === 'Project Delivered' || s === 'Completed' || raw === 'Approved' || raw === 'Final Approval' || raw === 'Delivered' || raw === 'Project Delivered' || raw === 'Closed' || raw === 'Project Closed' || raw === 'Completed' || raw === 'Payment Pending' || raw === 'Client Acceptance' || raw === 'Order Closed' || s === 'Order Closed';
  };
  const isClientNotApproved = (prod: any) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Client Review Sent' || s === 'Revision Required' || s === 'Revision In Progress' || raw === 'Ready For Review' || raw === 'Client Review Sent' || raw === 'Customer Review' || raw === 'Revision Required' || raw === 'Revision In Progress';
  };
  const isTotalProjectsCompleted = (prod: any) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Project Delivered' || s === 'Completed' || raw === 'Delivered' || raw === 'Project Delivered' || raw === 'Closed' || raw === 'Project Closed' || raw === 'Completed' || raw === 'Project Completed' || s === 'Project Completed' || raw === 'Project Cancelled' || s === 'Project Cancelled' || raw === 'Order Closed' || s === 'Order Closed';
  };

  const filteredLeadsList = useMemo(() => {
    return (leads || []).filter((prod: any) => {
      const { order: foundOrder, lead } = resolveOrderAndLead(prod);
      const order = { ...foundOrder, mobile: foundOrder?.mobile || lead?.mobile || 'No contact phone',
        order_id: foundOrder?.order_id || prod.order_id || prod.tracking_id || prod.production_id,
        customer_name: prod.customer_name || lead?.customer_name || 'Client',
        event_type: lead?.event_type || 'Event',
        event_date: prod.event_date || lead?.event_date || '',
        current_stage: prod.editing_status || 'Verified Footage'
      };
      
      const eventDate = order?.event_date || '';
      if (appliedStartDate && eventDate && eventDate < appliedStartDate) return false;
      if (appliedEndDate && eventDate && eventDate > appliedEndDate) return false;
      
      if (appliedCustName) {
        const cName = order?.customer_name || '';
        if (!cName.toLowerCase().includes(appliedCustName.toLowerCase())) return false;
      }
      if (appliedOrdId) {
        if (!order?.order_id.toLowerCase().includes(appliedOrdId.toLowerCase())) return false;
      }
      return true;
    });
  }, [leads, orders, rawFootage, leadsData, appliedStartDate, appliedEndDate, appliedCustName, appliedOrdId]);

  const countNewProjects = useMemo(() => filteredLeadsList.filter(isNewProject).length, [filteredLeadsList]);
  const countInProgressEdit = useMemo(() => filteredLeadsList.filter(isInProgressEdit).length, [filteredLeadsList]);
  const countClientApproved = useMemo(() => filteredLeadsList.filter(isClientApproved).length, [filteredLeadsList]);
  const countClientNotApproved = useMemo(() => filteredLeadsList.filter(isClientNotApproved).length, [filteredLeadsList]);
  const countTotalCompleted = useMemo(() => filteredLeadsList.filter(isTotalProjectsCompleted).length, [filteredLeadsList]);

  // Download logic placeholder since we don't strictly need PDF/CSV right now to restore UI.
  const downloadExcelReport = () => { console.log('Download not implemented in this proxy'); };
  const downloadCSVReport = () => { console.log('Download not implemented in this proxy'); };
  const downloadPDFReport = () => { console.log('Download not implemented in this proxy'); };

  useEffect(() => {
    const handleGlobalClick = () => {
      if (openActionDropdown) {
         setOpenActionDropdown(null);
      }
    };
    if (openActionDropdown) {
      setTimeout(() => window.addEventListener('click', handleGlobalClick), 10);
    }
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [openActionDropdown]);

  const toggleActionDropdown = (e: React.MouseEvent, prod: any, order: any, displayStatus: any, isEditorAssigned: any, hasSavedAssignments: any, isStatusActiveFn: any) => {
    e.stopPropagation();
    if (openActionDropdown && openActionDropdown.id === prod.id) {
      setOpenActionDropdown(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setOpenActionDropdown({
        id: prod.id,
        rect,
        prod,
        order,
        displayStatus,
        isEditorAssigned,
        hasSavedAssignments,
        isStatusActive: isStatusActiveFn
      });
    }
  };

  const isStatusActive = (status: string) => {
    return !['Project Delivered', 'Delivered', 'Completed', 'Closed'].includes(status);
  };
  
  const isDepartmentAllowedToEdit = () => true;

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
{/* Dashboard Widgets specific to Production Leads */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <CameraLensStatsCard
              label="New Projects Received"
              val={countNewProjects}
              theme="blue"
              trendText="Ready Ingest"
              subText="AF focus"
              chartPoints={[4, 12, 8, 16, 12, 22, countNewProjects || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="new_projects_received"
              onClick={() => setActiveCardFilter(activeCardFilter === 'new_projects_received' ? 'All' : 'new_projects_received')}
              lensLabel="AF-BLUE 50"
            />
            <CameraLensStatsCard
              label="In Progress Edit"
              val={countInProgressEdit}
              theme="purple"
              trendText="Active Cutting"
              subText="AF focus"
              chartPoints={[15, 10, 19, 14, 22, 18, countInProgressEdit || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="in_progress_edit"
              onClick={() => setActiveCardFilter(activeCardFilter === 'in_progress_edit' ? 'All' : 'in_progress_edit')}
              lensLabel="V-EDIT 35"
            />
            <CameraLensStatsCard
              label="Client Approved"
              val={countClientApproved}
              theme="green"
              trendText="Approved Gallery"
              subText="AF focus"
              chartPoints={[8, 15, 12, 20, 16, 25, countClientApproved || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="client_approved"
              onClick={() => setActiveCardFilter(activeCardFilter === 'client_approved' ? 'All' : 'client_approved')}
              lensLabel="M-GREEN 85"
            />
            <CameraLensStatsCard
              label="Client Not Approved"
              val={countClientNotApproved}
              theme="gold"
              trendText="Revision Loop"
              subText="AF focus"
              chartPoints={[5, 9, 7, 14, 11, 16, countClientNotApproved || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="client_not_approved"
              onClick={() => setActiveCardFilter(activeCardFilter === 'client_not_approved' ? 'All' : 'client_not_approved')}
              lensLabel="QC-GOLD 24"
            />
            <CameraLensStatsCard
              label="Total Projects Completed"
              val={countTotalCompleted}
              theme="cyan"
              trendText="Delivered Vault"
              subText="AF focus"
              chartPoints={[12, 18, 15, 26, 22, 34, countTotalCompleted || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="total_projects_completed"
              onClick={() => setActiveCardFilter(activeCardFilter === 'total_projects_completed' ? 'All' : 'total_projects_completed')}
              lensLabel="C-GLASS 70"
            />
          </div>

          {/* Advanced Search & Filter Center Toggle */}
          <div className="flex flex-wrap items-center gap-3 justify-start">
            <button
              type="button"
              onClick={() => setShowSmartFilter(!showSmartFilter)}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold rounded-xl transition-all uppercase tracking-wider flex items-center gap-2"
            >
              <span>[ FILTER ]</span>
            </button>
            <ListSortFilter value={sortOrder} onChange={setSortOrder} />
          </div>

          {/* Advanced Search & Filter Center */}
          {showSmartFilter && (
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div>
                <h4 className="text-xs font-black text-zinc-300 uppercase tracking-widest font-mono">
                  🔍 Smart Filter & Report Center
                </h4>
                <p className="text-[11.5px] text-zinc-500 font-mono mt-0.5">
                  Refine live interactive metrics, card counts, and sheet data. Apply start & end date thresholds securely.
                </p>
              </div>
              
              {/* ACTIVE CARD FILTER STATE INDICATOR */}
              {activeCardFilter !== 'All' && (
                <div className="flex items-center gap-2 self-start bg-amber-400/10 text-amber-300 border border-amber-400/10 rounded-lg px-3 py-1.5 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Active Focus: <strong>{
                    activeCardFilter === 'new_projects_received' ? 'New Projects Received Only' :
                    activeCardFilter === 'in_progress_edit' ? 'In Progress Edit Only' :
                    activeCardFilter === 'client_approved' ? 'Client Approved Only' :
                    activeCardFilter === 'client_not_approved' ? 'Client Not Approved Only' :
                    'Total Projects Completed Only'
                  }</strong></span>
                  <button 
                    onClick={() => setActiveCardFilter('All')} 
                    className="ml-2 hover:text-white transition-colors cursor-pointer text-amber-400/70 font-bold"
                    title="Clear Focus"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {/* Customer Name Search */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">Customer Name</label>
                <input
                  type="text"
                  placeholder="Search Customer..."
                  value={searchCustName}
                  onChange={(e) => setSearchCustName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-150 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                />
              </div>

              {/* Order ID Search */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">Order ID</label>
                <input
                  type="text"
                  placeholder="Order ID..."
                  value={searchOrdId}
                  onChange={(e) => setSearchOrdId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-150 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1 font-sans">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">Start Date</label>
                <input
                  type="date"
                  value={dtStart}
                  onChange={(e) => setDtStart(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-150 focus:outline-none focus:ring-1 focus:ring-violet-505 font-mono cursor-pointer"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1 font-sans">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">End Date</label>
                <input
                  type="date"
                  value={dtEnd}
                  onChange={(e) => setDtEnd(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-150 focus:outline-none focus:ring-1 focus:ring-violet-505 font-mono cursor-pointer"
                />
              </div>

              {/* Status Dropdown - Immediate execution */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">CRM Stage/Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-505 font-mono cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Verified Footage">Verified Footage</option>
                  <option value="Assigned Editor">Assigned Editor</option>
                  <option value="Editing Started">Editing Started</option>
                  <option value="Customer Review">Customer Review</option>
                  <option value="Editing Completed">Editing Completed</option>
                  <option value="Client Acceptance">Client Acceptance</option>
                  <option value="Order Closed">Order Closed</option>
                </select>
              </div>

              {/* Priority Dropdown - Immediate execution */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold font-bold">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-505 font-mono cursor-pointer animate-none"
                >
                  <option value="All">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAppliedStartDate(dtStart);
                    setAppliedEndDate(dtEnd);
                    setAppliedCustName(searchCustName);
                    setAppliedOrdId(searchOrdId);
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1.8 rounded-lg text-[11px] font-black uppercase font-mono tracking-wider hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] duration-200 cursor-pointer text-center"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDtStart('');
                    setDtEnd('');
                    setSearchCustName('');
                    setSearchOrdId('');
                    setAppliedStartDate('');
                    setAppliedEndDate('');
                    setAppliedCustName('');
                    setAppliedOrdId('');
                    setStatusFilter('All');
                    setPriorityFilter('All');
                    setActiveCardFilter('All');
                  }}
                  className="flex-1 bg-zinc-850 hover:bg-zinc-750 text-zinc-300 px-3 py-1.8 rounded-lg text-[11px] font-bold uppercase font-mono tracking-wider duration-200 cursor-pointer text-center"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* EXPORTS BAR CONTAINER */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-900/60 font-mono">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                📄 REPORT DOWNLOAD VAULT ({filteredLeadsList.length} items parsed)
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* PDF Export */}
                <button
                  onClick={downloadPDFReport}
                  className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/10 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                  title="Export to standardized PDF document"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {/* Excel Export */}
                <button
                  onClick={downloadExcelReport}
                  className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                  title="Export to Excel spreadsheet document (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </button>

                {/* CSV Export */}
                <button
                  onClick={downloadCSVReport}
                  className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/10 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                  title="Download standard comma-separated values document"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>

                {/* Print */}
                <button
                  onClick={printReport}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-705 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                  title="Send report directly to physical or virtual printer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Newly Arrived - Raw Footage Received Queue */}
          {(() => {
            return null;
            const rawFootage = filteredLeadsList.filter(prod => {
              const { order } = resolveOrderAndLead(prod);
              if (!order) return false;
              return prod.editing_status === 'Raw Footage Received';
            });

            if (rawFootage.length === 0) return null;

            return (
              <div id="newly_arrived_raw_footage_section" className="bg-zinc-950/80 border border-purple-900/45 p-5 rounded-2xl mb-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                    <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest font-mono">
                      ### Newly Arrived Raw Footage
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {rawFootage.length} Action Needed
                  </span>
                </div>

                <div className="overflow-x-auto border border-zinc-900 rounded-xl">
                  <table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                        <th className="p-3 font-bold">Order ID</th>
                        <th className="p-3 font-bold">Customer Name</th>
                        <th className="p-3 font-bold">Event Details</th>
                        <th className="p-3 font-bold text-center">Assigned Team</th>
                        <th className="p-3 font-bold">Raw Footage Drive Link</th>
                        <th className="p-3 font-bold">Current Production Status</th>
                        <th className="p-3 font-bold text-right pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {rawFootage.map(prod => {
                        const { order } = resolveOrderAndLead(prod);
                        if (!order) return null;

                        const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                        const op = operations?.find(o => o.order_id === order?.order_id);
                        const matchedSa = staffAssignments ? staffAssignments.filter(sa => sa.order_id === order?.order_id) : [];

                        const editorsList = getAssignedEditorsList(prod);

                        const prodStatus = getProductionStatus(prod);
                        const lead = leadsData?.find(l => l.lead_id === order?.lead_id);

                        return (
                          <tr key={prod.production_id} className="hover:bg-zinc-900/40 transition-all font-mono">
                            <td className="p-3 text-violet-400 font-bold">{order?.order_id}</td>
                            <td className="p-3 font-sans font-bold text-white">{order?.customer_name}</td>
                            <td className="p-3 text-zinc-300 font-sans">
                              <UnifiedEventDropdownCell lead={lead || order} />
                            </td>
                            <td className="p-3 font-sans text-center">
                              {editorsList.length > 0 ? (
                                <span 
                                  onClick={() => setAssignedEditorsModalProd(prod)}
                                  className="cursor-pointer text-indigo-400 hover:text-indigo-300 underline underline-offset-2 px-2 py-1 bg-indigo-500/10 rounded font-bold"
                                  title="View Assigned Team"
                                >
                                  👥 {editorsList.length}
                                </span>
                              ) : (
                                <span className="text-zinc-650 italic text-[10px]">No Production Staff Assigned.</span>
                              )}
                            </td>
                            <td className="p-3">
                              {(() => {
                                const finalDriveLink = getRawFootageDriveLink(prod);
                                const isDriveLinkAvailable = finalDriveLink !== '' && (finalDriveLink.startsWith('http://') || finalDriveLink.startsWith('https://') || finalDriveLink.includes('drive.google.com') || finalDriveLink.length > 5);

                                if (isDriveLinkAvailable) {
                                  const fullHref = finalDriveLink.startsWith('http') ? finalDriveLink : `https://${finalDriveLink}`;
                                  return (
                                    <a
                                      href={fullHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1.5 cursor-pointer max-w-[200px] break-words"
                                      title={finalDriveLink}
                                    >
                                      <span>🔗</span> Open Drive Link
                                    </a>
                                  );
                                }

                                return <span className="text-zinc-500 italic text-[11px]">No Drive Link Uploaded</span>;
                              })()}
                            </td>
                            <td className="p-3">
                              <StatusText status={prodStatus} />
                            </td>
                            <td className="p-3 text-right pr-4">
                              <div className="inline-flex flex-col gap-1 items-end">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignEditor(prod)}
                                  className="px-3 py-1.5 bg-purple-600 border border-purple-500 text-white hover:bg-purple-500 hover:border-purple-400 transition-all text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={isProjectLocked(prod.editing_status)}
                                >
                                  <span>👤</span> Assign Editor
                                </button>
                                {(() => {
                                  const isEditorAssigned = prod.editor_assigned && prod.editor_assigned !== 'Unassigned' && prod.editor_assigned.trim() !== '';
                                  const hasSavedAssignments = editorAssignments.some(a => a.production_id === prod.production_id);
                                  const isStatusActive = prodStatus && !isProjectLocked(prodStatus) && 
                                                         prod.editing_status && !isProjectLocked(prod.editing_status);
                                  
                                  if (isEditorAssigned && hasSavedAssignments && isStatusActive) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          prepareEditorWhatsappData(prod.production_id);
                                        }}
                                        className="px-2 py-1 bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 hover:border-emerald-400 transition-all text-[9px] font-bold uppercase tracking-wider rounded-lg shadow-sm cursor-pointer inline-flex items-center gap-1 mt-1"
                                      >
                                        <span>💬</span> Share
                                      </button>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* TABLE CONTAINER */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/70 px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                    <th className="p-4 font-black">Order ID</th>
                    <th className="p-4 font-black">Customer Name</th>
                    <th className="p-4 font-black">Event Details</th>
                    <th className="p-4 font-black">Raw Footage Link</th>
                    <th className="p-4 font-black text-center">Assigned Team</th>
                    <th className="p-4 font-black">Current Status</th>
                    <th className="p-4 font-black">Target Delivery Date</th>
                    <th className="p-4 font-black">Delivery Status</th>
                    {currentRole !== 'Production Team' && (
                      <>
                        <th className="p-4 font-black">Payment Status</th>
                        <th className="p-4 font-black">Remaining Amount</th>
                      </>
                    )}
                    <th className="p-4 font-black text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-sans">
                  {(() => {
                    const postProdStages = [
                      'Verified Footage',
                      'Footage Handover Verified',
                      'Raw Footage Received', 
                      'Editor Assigned', 
                      'Editing Started', 
                      'Editing In Progress', 
                      'Internal QC Review', 
                      'Client Review Sent', 
                      'Revision Required', 
                      'Revision In Progress', 
                      'Final Approval', 
                      'Delivered', 
                      'Closed',
                      'Customer Review',
                      'Approved',
                      'Payment Pending',
                      'Project Completed',
                      'Project Cancelled'
                    ];

                    const filteredLeads = filteredLeadsList.filter(prod => {
                      const { order: foundOrder, lead } = resolveOrderAndLead(prod);
                      const order = { ...foundOrder, mobile: foundOrder?.mobile || lead?.mobile || 'No contact phone',
                        order_id: prod.order_id || prod.tracking_id || prod.production_id,
                        customer_name: prod.customer_name || lead?.customer_name || 'Client',
                        event_type: lead?.event_type || 'Event',
                        event_date: prod.event_date || lead?.event_date || '',
                        current_stage: prod.editing_status || 'Verified Footage'
                      };
                      
                      // For Production Staff, exclude Client Acceptance and Order Closed
                      const displayStatus = getAutomatedProductionStatus(prod);
                      if (currentRole === 'Production Staff' && (displayStatus === 'Client Acceptance' || displayStatus === 'Order Closed' || displayStatus === 'Completed' || displayStatus === 'Closed')) {
                        return false;
                      }
                      
                      const searchLower = leadSearch.toLowerCase();
                      const clientMatch = (order?.customer_name || '').toLowerCase().includes(searchLower) || (order?.order_id || '').toLowerCase().includes(searchLower);
                      if (leadSearch && !clientMatch) return false;

                      const pVal = getProductionPriority(prod);
                      if (priorityFilter !== 'All' && pVal !== priorityFilter) return false;

                      const sVal = getProductionStatus(prod);
                      if (statusFilter === 'Overdue') {
                        const targetDate = getTargetDeliveryDateFromAssignments(prod);
                        const days = calculateDaysRemaining(targetDate);
                        if (!(days !== null && days < 0 && prod.editing_status !== 'Delivered' && prod.editing_status !== 'Closed' && prod.editing_status as any !== 'Project Closed' && prod.editing_status as any !== 'Project Delivered' && prod.editing_status as any !== 'Completed' && prod.editing_status as any !== 'Order Closed')) return false;
                      } else if (statusFilter !== 'All') {
                        const matchStatus = (sVal === statusFilter) || (displayStatus === statusFilter) || (prod.editing_status === statusFilter) ||
                          (statusFilter === 'Verified Footage' && (sVal === 'Verified Footage' || displayStatus === 'Verified Footage' || prod.editing_status === 'Verified Footage' || prod.editing_status === 'Raw Footage Received' || prod.editing_status === 'Footage Handover Verified')) ||
                          (statusFilter === 'Assigned Editor' && (sVal === 'Assigned Editor' || displayStatus === 'Assigned Editor' || prod.editing_status === 'Editor Assigned' || prod.editing_status === 'Assigned Editor')) ||
                          (statusFilter === 'Editing Started' && (sVal === 'Editing Started' || displayStatus === 'Editing Started' || prod.editing_status === 'Editing In Progress' || prod.editing_status === 'Editing')) ||
                          (statusFilter === 'Customer Review' && (sVal === 'Customer Review' || displayStatus === 'Customer Review' || prod.editing_status === 'Client Review Sent' || prod.editing_status === 'Ready For Review')) ||
                          (statusFilter === 'Editing Completed' && (sVal === 'Editing Completed' || displayStatus === 'Editing Completed' || prod.editing_status === 'Editing Complete')) ||
                          (statusFilter === 'Client Acceptance' && (sVal === 'Client Acceptance' || displayStatus === 'Client Acceptance' || prod.editing_status === 'Client Acceptance')) ||
                          (statusFilter === 'Order Closed' && (sVal === 'Order Closed' || displayStatus === 'Order Closed' || prod.editing_status === 'Order Closed' || prod.editing_status === 'Closed' || prod.editing_status === 'Completed' || prod.editing_status === 'Project Closed'));
                        if (!matchStatus) return false;
                      }

                      // Active Card filtration
                      if (activeCardFilter && activeCardFilter !== 'All') {
                        if (activeCardFilter === 'new_projects_received' && !isNewProject(prod)) return false;
                        if (activeCardFilter === 'in_progress_edit' && !isInProgressEdit(prod)) return false;
                        if (activeCardFilter === 'client_approved' && !isClientApproved(prod)) return false;
                        if (activeCardFilter === 'client_not_approved' && !isClientNotApproved(prod)) return false;
                        if (activeCardFilter === 'total_projects_completed' && !isTotalProjectsCompleted(prod)) return false;
                      }

                      return true;
                    });

                    if (filteredLeads.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} className="p-10 text-center text-zinc-550 font-mono text-xs">
                            No production leads matching filter parameters found.
                          </td>
                        </tr>
                      );
                    }

                    return [...(filteredLeads || [])].sort((a, b) => compareRecordsByDate(a, b, sortOrder)).map((prod, idx) => {
                      const { order: foundOrder, lead: foundLead } = resolveOrderAndLead(prod);
                      const order = { ...foundOrder, mobile: foundOrder?.mobile || foundLead?.mobile || 'No contact phone',
                        order_id: prod.order_id || prod.tracking_id || prod.production_id,
                        customer_name: prod.customer_name || foundLead?.customer_name || 'Client',
                        event_type: foundLead?.event_type || 'Event',
                        event_date: prod.event_date || foundLead?.event_date || '',
                        current_stage: prod.editing_status || 'Verified Footage',
                        quotation_amount: 0,
                        lead_id: prod.lead_id || prod.tracking_id
                      };

                      const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                      const priority = getProductionPriority(prod);
                      const status = prod.editing_status || 'Pending';
                      const lead = leadsData?.find(l => l.lead_id === order?.lead_id);
                      const displayStatus = getAutomatedProductionStatus(prod);
                      const targetDeliveryDate = getTargetDeliveryDateFromAssignments(prod);
                      const daysRem = calculateDaysRemaining(targetDeliveryDate);

                      // Payments calculations
                      const payment = (payments || []).find(p => p.order_id === order?.order_id);
                      const totalAmount = order.quotation_amount || 0;
                      const advanceReceived = payment?.advance_received !== undefined ? payment.advance_received : (payment?.advance_paid || 0);
                      const balanceDue = payment?.balance_due !== undefined ? payment.balance_due : (totalAmount - advanceReceived);
                      const payStatus = payment?.payment_status || 'Pending';

                      const isFinished = isProjectLocked(displayStatus) || isProjectLocked(prod.production_status) || isProjectLocked(prod.editing_status);

                      const isAssigned = getAssignedEditorsList(prod).length > 0 || (prod.editor_assigned && prod.editor_assigned !== 'Unassigned');

                      let flagBg = 'text-green-400 bg-green-500/5 border-green-500/10';
                      let flagLabel = 'On Time';
                      
                      if (!isAssigned) {
                        flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                        flagLabel = 'Pending';
                      } else if (daysRem !== null) {
                        if (daysRem < 0) {
                          if (isFinished) {
                            flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                            flagLabel = 'Completed';
                          } else {
                            flagBg = 'text-red-400 bg-red-500/5 border-red-500/10 font-bold';
                            flagLabel = 'OVERDUE';
                          }
                        } else if (daysRem <= 3) {
                          if (isFinished) {
                            flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                            flagLabel = 'Completed';
                          } else {
                            flagBg = 'text-yellow-400 bg-yellow-500/5 border-yellow-500/10';
                            flagLabel = 'Due Soon';
                          }
                        } else {
                          if (isFinished) {
                            flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                            flagLabel = 'Completed';
                          }
                        }
                      } else {
                        if (isFinished) {
                          flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                          flagLabel = 'Completed';
                        }
                      }

                      let displayStatusColor = 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
                      if (displayStatus === 'Raw Footage Received') displayStatusColor = 'bg-purple-500/15 text-purple-400 border border-purple-500/20 animate-pulse';
                      else if (displayStatus === 'Editor Assigned') displayStatusColor = 'bg-sky-500/15 text-sky-400 border border-sky-500/20';
                      else if (displayStatus === 'Editing Started') displayStatusColor = 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20';
                      else if (displayStatus === 'Editing In Progress') displayStatusColor = 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
                      else if (displayStatus === 'Internal QC Review') displayStatusColor = 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
                      else if (displayStatus === 'Client Review Sent') displayStatusColor = 'bg-pink-500/15 text-pink-400 border border-pink-500/20';
                      else if (displayStatus === 'Revision Required') displayStatusColor = 'bg-red-500/15 text-red-400 border border-red-500/20';
                      else if (displayStatus === 'Revision In Progress') displayStatusColor = 'bg-orange-500/15 text-orange-400 border border-orange-500/20';
                      else if (displayStatus === 'Final Approval') displayStatusColor = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
                      else if (displayStatus === 'Project Delivered') displayStatusColor = 'bg-violet-500/15 text-violet-400 border border-violet-500/20';
                      else if (displayStatus === 'Completed') displayStatusColor = 'bg-zinc-800 text-zinc-400 border border-zinc-700';

                      let payBadge = 'bg-amber-500/10 text-amber-400 border border-amber-500/15';
                      if (payStatus === 'Fully Paid') payBadge = 'bg-green-500/10 text-green-400 border border-green-500/15';
                      else if (payStatus === 'Partially Paid') payBadge = 'bg-blue-500/10 text-blue-400 border border-blue-500/15';

                      return (
                        <tr key={`${prod.production_id}_${prod.event_id || idx}`} className="hover:bg-zinc-900/30 transition-all font-mono text-xs">
                          {/* Order ID */}
                          <td className="px-3 py-2 align-middle">
                            <span 
                              onClick={() => {
                                setMasterOrderIdForDetail(order?.order_id);
                                setIsDetailModalOpen(true);
                              }}
                              className="font-mono font-bold text-violet-400 hover:underline cursor-pointer block"
                              title="Click to view full order dossier details"
                            >
                              {order?.order_id}
                            </span>
                            
                          </td>

                          {/* Customer Name */}
                          <td className="px-3 py-2 font-bold text-white text-left font-sans align-middle">
                            <div className="hover:text-violet-300 transition-colors cursor-pointer" onClick={() => {
                              setSelectedLeadProd(prod);
                              setDossierError('');
                              setDossierSuccessMessage('');
                              setLeadEditor(prod.editor_assigned || 'Unassigned');
                              setLeadStaff(prod.assigned_staff ? prod.assigned_staff.split(', ').map(s => s.trim()) : []);
                              setAssignRoleFilter('');
                              setLeadPriority(prod.project_priority || 'Medium');
                              setLeadFootageStatus(getRawFootageStatus(prod));
                              setLeadProdStatus(getProductionStatus(prod));
                              setLeadRemarks(prod.remarks || '');
                              setLeadStartDate(prod.editing_start_date || '');
                              setLeadTargetDeliveryDate(getTargetDeliveryDateFromAssignments(prod) || '');
                              setLeadExpectedDeliveryDate(prod.expected_delivery_date || '');
                              setLeadActualDeliveryDate(prod.delivery_date || prod.actual_delivery_date || '');
                              
                              const pLogs = (logs || []).filter(log => 
                                log.record_id === prod.production_id ||
                                log.record_id === prod.tracking_id ||
                                log.record_id === order?.order_id
                              );
                              const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                              const computedRfDate = rf && (rf.status === 'Received' || rf.raw_received) 
                                ? (rf.uploaded_date || rf.event_completed_date) 
                                : '';
                              const crLog = pLogs.find(log => 
                                log.new_stage === 'Client Review Sent' || 
                                log.new_stage === 'Customer Review' ||
                                log.action.includes('Client Review Sent') ||
                                log.action.includes('Customer Review')
                              );
                              const caLog = pLogs.find(log => 
                                log.new_stage === 'Final Approval' || 
                                log.new_stage === 'Approved' ||
                                log.action.includes('Final Approval') ||
                                log.action.includes('Approved')
                              );
                              setLeadRawFootageDate(toInputDateFormat((prod as any).raw_footage_received_date || computedRfDate));
                              setLeadClientReviewDate(toInputDateFormat((prod as any).client_review_upload_date || (crLog ? crLog.timestamp : null)));
                              setLeadClientApprovalDate(toInputDateFormat((prod as any).client_approval_date || (caLog ? caLog.timestamp : null)));
                            }}>{order?.customer_name}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 font-normal">{foundOrder?.mobile || lead?.mobile || 'No contact phone'}</div>
                          </td>

                          {/* Event Type */}
                          <td className="p-4 text-left font-sans text-zinc-300">
                            <UnifiedEventDropdownCell lead={foundLead || order} />
                          </td>

                            {/* Raw Footage Link */}
                            <td className="p-4 text-left font-sans">
                              {(() => {
                                const finalDriveLink = getRawFootageDriveLink(prod);
                                const isDriveLinkAvailable = finalDriveLink !== '' && (finalDriveLink.startsWith('http://') || finalDriveLink.startsWith('https://') || finalDriveLink.includes('drive.google.com') || finalDriveLink.length > 5);

                                if (isDriveLinkAvailable) {
                                  const fullHref = finalDriveLink.startsWith('http') ? finalDriveLink : `https://${finalDriveLink}`;
                                  return (
                                    <a
                                      href={fullHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1.5 cursor-pointer max-w-[150px] break-words"
                                      title={finalDriveLink}
                                    >
                                      <span>🔗</span> Open Drive Link
                                    </a>
                                  );
                                }

                                return <span className="text-zinc-500 italic text-[11px]">No Drive Link Uploaded</span>;
                              })()}
                            </td>

                          {/* Editor Assigned */}
                          <td className="p-4 text-center font-sans">
                            <div className="font-bold text-zinc-200">
                              {(() => {
                                const editorsList = getAssignedEditorsList(prod);
                                if (editorsList.length === 0) {
                                  return <span className="text-zinc-650 italic text-[10px]">No Production Staff Assigned.</span>;
                                }
                                return (
                                  <span 
                                    onClick={() => setAssignedEditorsModalProd(prod)}
                                    className="cursor-pointer text-indigo-400 hover:text-indigo-300 underline underline-offset-2 px-2 py-1 bg-indigo-500/10 rounded font-bold"
                                    title="View Assigned Team"
                                  >
                                    👥 {editorsList.length}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>

                          {/* Current Status */}
                          <td className="px-3 py-2 align-middle">
                            <StatusText status={displayStatus} />
                          </td>

                          {/* Target Delivery Date */}
                          <td className="p-4 text-zinc-350 font-mono">
                            {targetDeliveryDate && targetDeliveryDate !== 'Pending' && targetDeliveryDate !== 'Not Set' ? (
                              formatDisplayDate(targetDeliveryDate)
                            ) : (
                              <span className="text-zinc-600 italic">Pending</span>
                            )}
                          </td>

                          {/* Remaining Days */}
                          <td className="px-3 py-2 align-middle">
                            {!isAssigned ? (
                              <span className={`inline-flex px-2 py-0.5 rounded font-bold border font-mono ${flagBg}`}>
                                Pending
                              </span>
                            ) : daysRem !== null ? (
                              <span className={`inline-flex px-2 py-0.5 rounded font-bold border font-mono ${flagBg}`}>
                                {flagLabel === 'Completed' ? 'Completed' : flagLabel === 'OVERDUE' ? `Overdue by ${Math.abs(daysRem)} Days` : `${daysRem} days (${flagLabel})`}
                              </span>
                            ) : (
                              <span className="text-zinc-600 italic text-[10px]">Not set</span>
                            )}
                          </td>

                          {/* Payment Status */}
                          {currentRole !== 'Production Team' && (
                            <td className="px-3 py-2 align-middle">
                              <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-mono font-black border ${payBadge}`}>
                                {payStatus}
                              </span>
                            </td>
                          )}

                          {/* Remaining Amount */}
                          {currentRole !== 'Production Team' && (
                            <td className="p-4 font-bold text-zinc-300 font-mono">
                              <span className={balanceDue > 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}>
                                {formatINR(balanceDue)}
                              </span>
                            </td>
                          )}

                          {/* Actions column */}
                          <td className="p-4 text-center">
                            <div className="flex flex-col gap-1.5 items-center justify-center">
                              {(() => {
                                const isEditorAssigned = prod.editor_assigned && prod.editor_assigned !== "Unassigned" && prod.editor_assigned.trim() !== "";
                                const hasSavedAssignments = (editorAssignments || []).some(a => a.production_id === prod.production_id);
                                const isStatusActive = displayStatus && !isProjectLocked(displayStatus) && prod.editing_status && !isProjectLocked(prod.editing_status);
                                
                                return (
                                  <>
                                    
                                    {isFinished && (
                                      <div className="flex flex-col gap-1 w-full items-center mb-1">
                                        <span className="px-2.5 py-1 bg-zinc-800/90 border border-zinc-700 text-zinc-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 font-mono">
                                          🔒 Order Closed
                                        </span>
                                      </div>
                                    )}
                                    
                                    {displayStatus === "Editing Completed" && currentRole === "Production Staff" && (
                                      <span className="px-3 py-1.5 mb-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 w-full max-w-[160px]">
                                        ✓ Editing Completed
                                      </span>
                                    )}
                                    
                                    {!isFinished && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const btn = e.currentTarget;
                                          if (openActionDropdown?.id === prod.production_id) {
                                            setOpenActionDropdown(null);
                                          } else {
                                            const rect = btn.getBoundingClientRect();
                                            setOpenActionDropdown({
                                              id: prod.production_id,
                                              buttonEl: btn,
                                              rect,
                                              prod,
                                              order,
                                              displayStatus,
                                              isEditorAssigned: !!isEditorAssigned,
                                              hasSavedAssignments: !!hasSavedAssignments,
                                              isStatusActive: !!isStatusActive
                                            });
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono transition-all duration-150 flex items-center justify-center gap-1.5 shadow-md border cursor-pointer ${
                                          openActionDropdown?.id === prod.production_id
                                            ? 'bg-purple-900/60 border-purple-500 text-purple-200 ring-2 ring-purple-500/30'
                                            : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white'
                                        }`}
                                      >
                                        <span>Action</span>
                                        <span className={`text-[8px] transition-transform duration-200 ${openActionDropdown?.id === prod.production_id ? 'rotate-180 text-purple-300' : 'text-zinc-400'}`}>▼</span>
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>

                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Floating Action Dropdown Menu */}
          {openActionDropdown && createPortal(
            (() => {
              const { id, rect, prod, order, displayStatus, isEditorAssigned, hasSavedAssignments, isStatusActive } = openActionDropdown;
              
              const menuWidth = 224; // w-56
              const menuHeightEstimate = 320;
              const spaceBelow = window.innerHeight - rect.bottom;
              const spaceAbove = rect.top;
              const openUp = spaceBelow < menuHeightEstimate && spaceAbove > spaceBelow;

              const topPos = openUp ? undefined : rect.bottom + 6;
              const bottomPos = openUp ? window.innerHeight - rect.top + 6 : undefined;
              const maxHeight = openUp ? Math.max(160, rect.top - 16) : Math.max(160, window.innerHeight - rect.bottom - 16);

              let leftCalc = rect.right - menuWidth;
              if (leftCalc < 12) leftCalc = rect.left;
              if (leftCalc < 12) leftCalc = 12;
              if (leftCalc + menuWidth > window.innerWidth - 12) {
                leftCalc = Math.max(12, window.innerWidth - menuWidth - 12);
              }

              const isLocked = isProjectLocked(displayStatus) || isProjectLocked(prod.editing_status);

              return (
                <div className="fixed inset-0 z-[9999] pointer-events-none">
                  {/* Transparent overlay backdrop to close menu on outside click */}
                  <div 
                    className="fixed inset-0 bg-transparent cursor-default pointer-events-auto"
                    onClick={() => setOpenActionDropdown(null)}
                  />

                  {/* Floating Action Dropdown Panel */}
                  <div
                    id="production-action-dropdown"
                    style={{
                      top: topPos !== undefined ? `${topPos}px` : undefined,
                      bottom: bottomPos !== undefined ? `${bottomPos}px` : undefined,
                      left: `${leftCalc}px`,
                      maxHeight: `${maxHeight}px`,
                    }}
                    className="fixed z-[10000] pointer-events-auto w-56 max-w-[calc(100vw-24px)] overflow-y-auto bg-zinc-900/98 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 text-zinc-200 text-xs font-sans ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-2.5 py-1.5 text-[9px] font-black uppercase font-mono tracking-wider text-zinc-400 border-b border-zinc-800/80 mb-1 flex items-center justify-between sticky top-0 bg-zinc-900/95 z-10 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        <span>Action Menu</span>
                      </span>
                      <span className="text-zinc-500 font-normal text-[8px] font-mono">
                        ID: {prod.tracking_id || prod.production_id}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {/* Assign / Reassign Editor */}
                      {(() => {
                        const hasAssignedEditors = getAssignedEditorsList(prod).length > 0 || (prod.editor_assigned && prod.editor_assigned !== 'Unassigned' && prod.editor_assigned !== '');
                        const isProductionClosed = prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed' || prod.editing_status === 'Delivered' || prod.editing_status === 'Project Delivered';
                        
                        if (isProductionClosed) return null;

                        if (hasAssignedEditors || ["Assigned Editor", "Editing Started", "Customer Review", "Revision Required", "Internal QC Review"].includes(displayStatus)) {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionDropdown(null);
                                handleOpenAssignEditor(prod);
                              }}
                              className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-purple-300 hover:text-white hover:bg-purple-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="text-sm">👤</span>
                              <span>Reassign Editor</span>
                            </button>
                          );
                        } else {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionDropdown(null);
                                handleOpenAssignEditor(prod);
                              }}
                              className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-purple-300 hover:text-white hover:bg-purple-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="text-sm">👤</span>
                              <span>Assign Editor</span>
                            </button>
                          );
                        }
                      })()}

                      {/* Add Note */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionDropdown(null);
                          setNoteModalLeadId(order?.lead_id || '');
                          setNoteModalOrderId(order?.order_id || '');
                          setNoteModalCustomerName(order?.customer_name || '');
                          setNoteModalOpen(true);
                        }}
                        className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-blue-300 hover:text-white hover:bg-blue-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Add Note</span>
                      </button>
                      
                      {/* Send Review Link */}
                      {(displayStatus === "Customer Review" || displayStatus === "Editing Completed") && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionDropdown(null);
                            handleOpenResendReviewPopup(prod);
                          }}
                          className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-cyan-300 hover:text-white hover:bg-cyan-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-sm">📤</span>
                          <span>Send Review Link</span>
                        </button>
                      )}

                      {/* Client Acceptance */}
                      {displayStatus === "Editing Completed" && currentRole !== "Production Staff" && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionDropdown(null);
                            handleOpenClientAcceptance(prod);
                          }}
                          className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-emerald-300 hover:text-white hover:bg-emerald-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-sm">✓</span>
                          <span>Client Acceptance</span>
                        </button>
                      )}

                      {/* Share via WhatsApp */}
                      {isEditorAssigned && hasSavedAssignments && isStatusActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionDropdown(null);
                            prepareEditorWhatsappData(prod.production_id);
                          }}
                          className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-green-300 hover:text-white hover:bg-green-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-sm">💬</span>
                          <span>Share</span>
                        </button>
                      )}

                      {/* Edit Full Dossier */}
                      {!(currentRole === 'Production Team' || currentRole === 'Production Staff') && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionDropdown(null);
                            setSelectedLeadProd(prod);
                            setDossierError("");
                            setDossierSuccessMessage("");
                            setLeadEditor(prod.editor_assigned || "Unassigned");
                            setLeadStaff(prod.assigned_staff ? prod.assigned_staff.split(", ").map(s => s.trim()) : []);
                            setAssignRoleFilter("");
                            setLeadPriority(prod.project_priority || "Medium");
                            setLeadFootageStatus(getRawFootageStatus(prod));
                            setLeadProdStatus(getProductionStatus(prod));
                            setLeadRemarks(prod.remarks || "");
                            setLeadStartDate(prod.editing_start_date || "");
                            setLeadTargetDeliveryDate(prod.target_delivery_date || "");
                            setLeadExpectedDeliveryDate(prod.expected_delivery_date || "");
                            setLeadActualDeliveryDate(prod.delivery_date || prod.actual_delivery_date || "");
                            const pLogs = (logs || []).filter(log => 
                              log.record_id === prod.production_id ||
                              log.record_id === prod.tracking_id ||
                              log.record_id === order?.order_id
                            );
                            const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                            const computedRfDate = rf && (rf.status === "Received" || rf.raw_received) 
                              ? (rf.uploaded_date || rf.event_completed_date) 
                              : "";
                            const crLog = pLogs.find(log => 
                              log.new_stage === "Client Review Sent" || 
                              log.new_stage === "Customer Review" ||
                              log.action.includes("Client Review Sent") ||
                              log.action.includes("Customer Review")
                            );
                            const caLog = pLogs.find(log => 
                              log.new_stage === "Final Approval" || 
                              log.new_stage === "Approved" ||
                              log.action.includes("Final Approval") ||
                              log.action.includes("Approved")
                            );
                            setLeadRawFootageDate(toInputDateFormat((prod as any).raw_footage_received_date || computedRfDate));
                            setLeadClientReviewDate(toInputDateFormat((prod as any).client_review_upload_date || (crLog ? crLog.timestamp : null)));
                            setLeadClientApprovalDate(toInputDateFormat((prod as any).client_approval_date || (caLog ? caLog.timestamp : null)));
                          }}
                          className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/90 rounded-lg transition-colors flex items-center gap-2 cursor-pointer border-t border-zinc-800/80 mt-0.5 pt-1.5"
                        >
                          <span className="text-sm">✎</span>
                          <span>Edit Full Dossier</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })(),
            document.body
          )}
          )
    </div>
  );
};
