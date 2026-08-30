const fs = require('fs');

const leads = fs.readFileSync('/tmp/leads_ui.txt', 'utf8');

const tableStart = leads.indexOf('<table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">');
const tableEnd = leads.indexOf('</table>') + 8;
let tableBlock = leads.slice(tableStart, tableEnd);

const afterTable = leads.slice(tableEnd);
const portalBlockMatch = afterTable.match(/\{\/\* Floating Action Dropdown Menu \*\/\}[\s\S]*?createPortal\([\s\S]*?\),[\s\S]*?document\.body[\s\S]*?\)\}/);
let portalBlock = portalBlockMatch ? portalBlockMatch[0] : '';

// Fix rawFootageLeads
tableBlock = tableBlock.replace(/rawFootageLeads/g, 'rawFootage');
portalBlock = portalBlock.replace(/rawFootageLeads/g, 'rawFootage');
// Fix operations || -> operationsList ||
tableBlock = tableBlock.replace(/operations \|\|/g, 'operationsList ||');
portalBlock = portalBlock.replace(/operations \|\|/g, 'operationsList ||');

const helpers = fs.readFileSync('/tmp/prod_helpers.txt', 'utf8')
  .replace(/const filteredLeadsList = useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);/, '')
  .replace(/const count.*?;/g, '')
  .replace('  const downloadPDFReport = () => {', '');

const code = `import React, { useState, useMemo, useEffect } from 'react';
import { Camera, Calendar, User, Film, UploadCloud, Edit3, Image as ImageIcon, Link as LinkIcon, CheckCircle2, AlertCircle, Eye, EyeOff, Lock, Ban, FileText } from 'lucide-react';
import { formatDateDDMMYY, resolveStorageUrl, uploadProofToStorage, formatINR, parseCustomerProof } from '../../utils';
import * as XLSX from 'xlsx';
import { createPortal } from 'react-dom';
import { UnifiedEventDropdownCell } from '../UnifiedEventDropdownCell';
import { StatusText } from '../ui/StatusText';

export const ProductionTaskTable = ({
  activeSubTab,
  orders,
  productionList,
  editorAssignments = [],
  operationsList = [],
  productionStaff = [],
  rawFootage = [],
  logs = [],
  searchTerm: appliedCustName,
  statusFilter,
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
  
  const appliedStartDate = '';
  const appliedEndDate = '';
  const appliedOrdId = '';
  
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
    return \`\${yyyy}-\${mm}-\${dd}\`;
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
      const vMatch = text.match(/Verified\\s+Footage\\s+with\\s+Consolidated\\s+Link:\\s*(https?:\\/\\/[^\\s\\n\\r"']+)/i);
      if (vMatch && vMatch[1]) return vMatch[1].trim();
      const cMatch = text.match(/Consolidated\\s+(?:Drive\\s+)?Link:\\s*(https?:\\/\\/[^\\s\\n\\r"']+)/i);
      if (cMatch && cMatch[1]) return cMatch[1].trim();
      return '';
    };
    const extractAnyUrl = (text?: string | null): string => {
      if (!text || typeof text !== 'string') return '';
      const m = text.match(/(https?:\\/\\/[^\\s\\n\\r"']+)/i);
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
  
  const leads = productionList;

${helpers}

  const filteredLeadsList = useMemo(() => {
    return (leads || []).filter((prod: any) => {
      const { order } = resolveOrderAndLead(prod);
      if (appliedCustName) {
        const searchLower = appliedCustName.toLowerCase();
        const cName = (order?.customer_name || prod.customer_name || '').toLowerCase();
        const ordId = (prod.tracking_id || prod.order_id || '').toLowerCase();
        if (!cName.includes(searchLower) && !ordId.includes(searchLower)) return false;
      }
      if (statusFilter && statusFilter !== 'All') {
        if (prod.editing_status !== statusFilter) return false;
      }
      return true;
    });
  }, [leads, orders, appliedCustName, statusFilter]);

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
    <div className="w-full space-y-4 animate-fade-in text-zinc-100">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-x-auto shadow-xl">
        ${tableBlock}
      </div>
      ${portalBlock}
    </div>
  );
};
`;

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code);
console.log('Clean generation successful!');
