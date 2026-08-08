import React, { useState, useEffect } from 'react';
import { useRole } from './RoleContext';
import { 
  Calendar, Clock, CheckCircle2, Eye, FileVideo, Play, UserCheck, 
  ShieldCheck, ChevronDown, Upload, FileText, CheckSquare, Lock, Activity, 
  Link as LinkIcon, AlertCircle, X, Sparkles, Check, MessageSquare, Copy, ExternalLink, RefreshCw
} from 'lucide-react';
import { supabaseClient } from '../supabaseClient';
import { EditorAssignment } from '../types';
import { ProjectDetailModal } from './ProjectDetailModal';
import { parseQtyAndText, formatQtyItem } from '../utils';

// Image compression helper
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to extract Raw Footage Drive Link across Operations / Raw Footage / Production / Editor Assignment sources
const getRawFootageDriveLink = (assignment: any, prod: any, order: any, lead: any, operations: any[]): string => {
  const orderId = order?.order_id || prod?.order_id || assignment?.order_id || prod?.tracking_id;
  const leadId = lead?.lead_id || order?.lead_id || prod?.lead_id || assignment?.production_id;
  const trackingId = prod?.tracking_id || assignment?.production_id;

  // 1. Check Operations table matching order_id, lead_id, or tracking_id
  const matchedOp = (operations || []).find(o => 
    (orderId && (o.order_id === orderId || o.lead_id === orderId)) ||
    (leadId && (o.lead_id === leadId || o.order_id === leadId)) ||
    (trackingId && (o.order_id === trackingId || o.lead_id === trackingId)) ||
    (assignment?.production_id && (o.order_id === assignment.production_id || o.lead_id === assignment.production_id))
  );

  const opsLink = matchedOp ? (
    matchedOp.raw_footage_drive_link || 
    matchedOp.Raw_Footage_Drive_Link || 
    matchedOp.consolidated_drive_link || 
    matchedOp.Consolidated_Drive_Link
  ) : null;

  if (opsLink && typeof opsLink === 'string' && opsLink.trim() !== '') {
    return opsLink.trim();
  }

  // 2. Check assignment object direct field
  if ((assignment as any)?.raw_footage_link && typeof (assignment as any).raw_footage_link === 'string' && ((assignment as any).raw_footage_link as string).trim() !== '') {
    return ((assignment as any).raw_footage_link as string).trim();
  }

  // 3. Check Production object direct fields
  if (prod?.raw_footage_drive_link && typeof prod.raw_footage_drive_link === 'string' && prod.raw_footage_drive_link.trim() !== '') {
    return prod.raw_footage_drive_link.trim();
  }
  if (prod?.raw_footage_location && typeof prod.raw_footage_location === 'string' && prod.raw_footage_location.trim() !== '' && !prod.raw_footage_location.startsWith('s3://')) {
    return prod.raw_footage_location.trim();
  }

  // 4. Fallback for raw_footage_location
  if (prod?.raw_footage_location && typeof prod.raw_footage_location === 'string' && prod.raw_footage_location.trim() !== '') {
    return prod.raw_footage_location.trim();
  }

  return '';
};

// Helper to extract resolved Event Name without generic 'Project' fallback unless genuinely empty
const getResolvedEventName = (lead: any, order: any, prod: any): string => {
  const leadEventFirstName = lead?.events && lead.events.length > 0 
    ? (lead.events[0]?.event_name || lead.events[0]?.event_type) 
    : null;

  const candidate = (
    leadEventFirstName ||
    lead?.event_name ||
    lead?.custom_event_name ||
    order?.event_name ||
    order?.custom_event_name ||
    prod?.event_name ||
    lead?.custom_event_type ||
    lead?.event_type ||
    order?.event_type ||
    prod?.event_type ||
    order?.project_name ||
    prod?.project_name ||
    ''
  ).toString().trim();

  if (candidate && candidate !== 'Project' && candidate !== 'Other' && candidate !== 'Unnamed Event') {
    return candidate;
  }

  const secondary = (
    lead?.custom_event_name || 
    order?.custom_event_name || 
    lead?.custom_event_type || 
    lead?.event_type || 
    order?.event_type || 
    prod?.event_type || 
    ''
  ).toString().trim();

  return (secondary && secondary !== 'Other') ? secondary : 'Event';
};

export const ProductionStaffModule: React.FC = () => {
  const { 
    currentUser, 
    staff, 
    productionStaff,
    leads, 
    orders, 
    operations, 
    production,
    editorAssignments, 
    updateEditorAssignmentStatus, 
    updateProduction,
    updateOrderStage,
    updateLead,
    pushUpdate,
    refreshData 
  } = useRole();

  // Resolve production staff member
  const prodStaffMember = (productionStaff || []).find(s => 
    (s.staff_id && currentUser?.id && s.staff_id === currentUser.id) ||
    (s.mobile && currentUser?.mobile && s.mobile === currentUser.mobile) || 
    (s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase())
  );
  const opStaffMember = (staff || []).find(s => 
    (s.mobile && currentUser?.mobile && s.mobile === currentUser.mobile) || 
    (s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase())
  );
  const resolvedStaffId = prodStaffMember?.staff_id || opStaffMember?.staff_id || currentUser?.id;
  const staffName = prodStaffMember?.name || opStaffMember?.name || currentUser?.name || 'Staff';
  
  // Local state
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Selected project for ProjectDetailModal
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<string | null>(null);

  // Modal States for Production Workflow
  // 1. Editing Started Modal
  const [editingStartedModal, setEditingStartedModal] = useState<any | null>(null);
  const [editingStartedForm, setEditingStartedForm] = useState({ 
    expected_delivery_date: '',
    estimated_completion_date: '', 
    estimated_completion_time: '' 
  });

  // 2. Customer Review Modal
  const [customerReviewModal, setCustomerReviewModal] = useState<any | null>(null);
  const [customerReviewForm, setCustomerReviewForm] = useState({ edited_drive_link: '' });

  // WhatsApp Popup Modal (2nd Popup immediately after Customer Review save)
  const [whatsappModal, setWhatsappModal] = useState<{
    customerName: string;
    eventName: string;
    driveLink: string;
    phone: string;
    message: string;
  } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // 3. Editing Completed Modal
  const [editingCompletedModal, setEditingCompletedModal] = useState<any | null>(null);
  const [editingCompletedForm, setEditingCompletedForm] = useState({ confirmation_proof: '' });

  // 4. Client Acceptance Modal
  const [clientAcceptanceModal, setClientAcceptanceModal] = useState<any | null>(null);
  const [clientAcceptanceForm, setClientAcceptanceForm] = useState({
    checklist_1: false,
    checklist_2: false,
    checklist_3: false,
    communication_proof: '',
    internal_validation: true
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Build assigned bookings list grouped by Order/Event for logged in assigned editor
  useEffect(() => {
    if (!resolvedStaffId && !staffName && !currentUser?.id) return;

    // Strict filter: ONLY tasks assigned to THIS staff member
    const myAssignments = editorAssignments.filter(ea => {
      const matchId = (resolvedStaffId && ea.staff_id && ea.staff_id === resolvedStaffId) ||
                      (currentUser?.id && ea.staff_id && ea.staff_id === currentUser.id);
      const matchName = (staffName && ea.staff_name && ea.staff_name.trim().toLowerCase() === staffName.trim().toLowerCase()) ||
                        (currentUser?.name && ea.staff_name && ea.staff_name.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
      return matchId || matchName;
    });

    const individualDeliverables: any[] = [];
    myAssignments.forEach(assignment => {
        // Resolve production, order, and lead records flexibly
        const prod = production.find(p => 
          p.production_id === assignment.production_id || 
          p.tracking_id === assignment.production_id || 
          p.order_id === assignment.production_id || 
          p.lead_id === assignment.production_id ||
          p.production_id === `PRD-${assignment.production_id}`
        );
        
        const orderIdToFind = assignment.order_id || prod?.order_id || prod?.tracking_id || assignment.production_id;
        const leadIdToFind = prod?.lead_id || prod?.tracking_id || assignment.production_id;

        let order = orders.find(o => o.order_id === orderIdToFind || o.order_id === assignment.production_id);
        if (!order) {
          order = orders.find(o => o.lead_id === leadIdToFind || o.lead_id === assignment.production_id);
        }

        let lead = leads.find(l => l.lead_id === leadIdToFind || l.lead_id === order?.lead_id || l.lead_id === assignment.production_id);
        if (!lead && order) {
          lead = leads.find(l => l.lead_id === order.lead_id);
        }
        
        // Determine unified status
        let currentStatus = assignment.status || 'Assigned Editor';

        // Raw Footage Drive Link resolution across Operations / Raw Footage / Production / Assignment sources
        const rawFootageLink = getRawFootageDriveLink(assignment, prod, order, lead, operations);

        // Event Name resolution across Lead / Order / Production sources
        const eventName = getResolvedEventName(lead, order, prod);

        // Customer details resolution
        const customerName = (lead?.customer_name || order?.customer_name || prod?.customer_name || 'Client').trim();
        const customerMobile = (lead?.mobile || order?.customer_phone || prod?.customer_mobile || '').trim();
        const eventDate = (lead?.events?.[0]?.event_date || lead?.event_date || order?.event_date || prod?.event_date || '').trim();

        // Edited Drive Link resolution
        const editedDriveLink = (assignment.edited_drive_link || prod?.edited_drive_link || '').trim();

        individualDeliverables.push({
            assignmentId: assignment.assignment_id,
            orderId: order?.order_id || prod?.order_id || prod?.tracking_id || assignment.order_id || assignment.production_id || 'ORD-ASSIGNED',
            leadId: lead?.lead_id || order?.lead_id || prod?.lead_id,
            customerName,
            customerMobile,
            eventDate,
            eventName,
            deliverable: assignment.speciality,
            targetFinishDate: prod?.target_delivery_date || prod?.expected_delivery_date || assignment.target_finish_date || '',
            status: currentStatus,
            rawFootageLink,
            editedDriveLink,
            assignmentObj: assignment,
            orderObj: order,
            leadObj: lead,
            prodObj: prod
        });
    });

    // Group deliverables by Order ID + Event Name for this staff member
    const groupsMap = new Map<string, any>();
    individualDeliverables.forEach(item => {
      const groupKey = `${item.orderId}_${item.eventName}`;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          groupId: groupKey,
          orderId: item.orderId,
          leadId: item.leadId,
          customerName: item.customerName,
          customerMobile: item.customerMobile,
          eventName: item.eventName,
          eventDate: item.eventDate,
          targetFinishDate: item.targetFinishDate,
          rawFootageLink: item.rawFootageLink,
          orderObj: item.orderObj,
          leadObj: item.leadObj,
          prodObj: item.prodObj,
          deliverables: []
        });
      }

      const grp = groupsMap.get(groupKey);
      grp.deliverables.push(item);
      if (!grp.rawFootageLink && item.rawFootageLink) {
        grp.rawFootageLink = item.rawFootageLink;
      }
    });

    // Calculate stage rank helper
    const getTaskStageRank = (st: string, driveLink?: string) => {
      const status = st || '';
      if (['Client Acceptance', 'Business Owner Review', 'Project Completed', 'Completed', 'Order Closed'].includes(status)) return 5;
      if (['Editing Completed', 'Editing Complete'].includes(status)) return 4;
      if (['Customer Review', 'Client Review', 'Client Review Sent'].includes(status) || (driveLink && driveLink.trim() !== '')) return 3;
      if (['Editing Started', 'In Progress', 'Editing In Progress'].includes(status)) return 2;
      if (['Assigned Editor', 'Editor Assigned', 'Assigned'].includes(status)) return 1;
      return 0;
    };

    // Overall status per grouped task
    const groupedList = Array.from(groupsMap.values()).map(grp => {
      const ranks = grp.deliverables.map((d: any) => getTaskStageRank(d.status, d.editedDriveLink));
      const minRank = Math.min(...ranks);

      let overallStatus = 'Assigned Editor';
      if (minRank >= 5) overallStatus = 'Client Acceptance';
      else if (minRank >= 4) overallStatus = 'Editing Completed';
      else if (minRank >= 3) overallStatus = 'Customer Review';
      else if (minRank >= 2) overallStatus = 'Editing Started';
      else if (minRank >= 1) overallStatus = 'Assigned Editor';

      return {
        ...grp,
        overallStatus
      };
    });

    setActiveBookings(groupedList);
  }, [staffName, resolvedStaffId, currentUser, editorAssignments, orders, leads, production, operations]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Assigned Editor':
      case 'Editor Assigned':
      case 'Assigned': 
        return { label: 'Assigned Editor', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      case 'Editing Started': 
        return { label: 'Editing Started', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
      case 'Customer Review': 
        return { label: 'Customer Review', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'Client Acceptance':
      case 'Business Owner Review':
      case 'Project Completed':
      case 'Completed': 
      case 'Order Closed':
        return { label: 'Client Acceptance (Transferred)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      default: 
        return { label: status, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30' };
    }
  };

  // Helper to format WhatsApp phone number
  const formatWhatsAppPhone = (phone: string) => {
    let cleaned = (phone || '').replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.length === 8) {
      cleaned = '65' + cleaned;
    }
    return cleaned;
  };

  // 1. Submit Editing Started Modal
  const handleEditingStartedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStartedModal) return;
    if (!editingStartedForm.estimated_completion_date || !editingStartedForm.estimated_completion_time) {
      alert("Please provide both Estimated Completion Date and Estimated Completion Time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = editingStartedModal;

      // Update Editor Assignment
      await updateEditorAssignmentStatus(b.assignmentId, 'Editing Started' as any);

      // Save estimated completion info & expected delivery date
      await pushUpdate('editor_assignments', 'assignment_id', b.assignmentId, {
        target_finish_date: editingStartedForm.estimated_completion_date,
        estimated_completion_time: editingStartedForm.estimated_completion_time,
        started_at: timestamp,
        started_by: staffName,
        status: 'Editing Started'
      });

      // Update Production record
      if (b.prodObj?.production_id) {
        await updateProduction(b.prodObj.production_id, {
          editing_status: 'Editing Started',
          production_status: 'Editing Started',
          expected_delivery_date: editingStartedForm.expected_delivery_date || editingStartedForm.estimated_completion_date,
          remarks: `Editing Started by ${staffName} on ${new Date().toLocaleDateString()} at ${editingStartedForm.estimated_completion_time}`
        });
      }

      // Update Orders & Leads
      if (b.orderId) {
        await updateOrderStage(b.orderId, 'Editing Started' as any);
      }
      if (b.leadId) {
        await updateLead(b.leadId, {
          status: 'Editing Started' as any,
          current_status: 'Editing Started' as any
        });
      }

      setEditingStartedModal(null);
      setEditingStartedForm({ expected_delivery_date: '', estimated_completion_date: '', estimated_completion_time: '' });
      await refreshData();
      showToast('🚀 Status updated to Editing Started!');
    } catch (err: any) {
      console.error('Error submitting Editing Started:', err);
      alert('Failed to update status: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Customer Review Modal
  const handleCustomerReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerReviewModal) return;
    if (!customerReviewForm.edited_drive_link.trim()) {
      alert("Please provide the Edited Drive Link.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = customerReviewModal;
      const editedLink = customerReviewForm.edited_drive_link.trim();

      await updateEditorAssignmentStatus(b.assignmentId, 'Customer Review' as any);

      // Save Edited Drive Link
      await pushUpdate('editor_assignments', 'assignment_id', b.assignmentId, {
        raw_footage_link: editedLink,
        edited_drive_link: editedLink,
        edited_link_uploaded_at: timestamp,
        status: 'Customer Review'
      });

      if (b.prodObj?.production_id) {
        await updateProduction(b.prodObj.production_id, {
          editing_status: 'Customer Review',
          production_status: 'Customer Review',
          edited_drive_link: editedLink,
          remarks: `Edited Drive Link uploaded by ${staffName} on ${new Date().toLocaleDateString()}: ${editedLink}`
        });
      }

      if (b.orderId) {
        await updateOrderStage(b.orderId, 'Customer Review' as any);
      }
      if (b.leadId) {
        await updateLead(b.leadId, {
          status: 'Customer Review' as any,
          current_status: 'Customer Review' as any
        });
      }

      // Prepare WhatsApp popup payload
      const cName = b.customerName || 'Customer';
      const eName = b.eventName || 'Event';
      const cPhone = b.customerMobile || '';
      const messageText = `Hello ${cName},

Your edited photos/videos are ready for review.

Please review them using the following link:

${editedLink}

Kindly let us know if any changes are required.

Thank you.`;

      setCustomerReviewModal(null);
      setCustomerReviewForm({ edited_drive_link: '' });
      await refreshData();
      showToast('📁 Edited Drive Link saved & moved to Customer Review!');

      // Automatically open 2nd popup: WhatsApp review message
      setWhatsappModal({
        customerName: cName,
        eventName: eName,
        driveLink: editedLink,
        phone: cPhone,
        message: messageText
      });
    } catch (err: any) {
      console.error('Error submitting Customer Review:', err);
      alert('Failed to submit: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Editing Completed Modal
  const handleEditingCompletedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompletedModal) return;

    if (!editingCompletedForm.confirmation_proof.trim()) {
      alert("Validation Failed: Please upload or provide Customer Confirmation Proof or Image.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = editingCompletedModal;
      const proofStr = editingCompletedForm.confirmation_proof.trim();

      await updateEditorAssignmentStatus(b.assignmentId, 'Editing Completed' as any);

      await pushUpdate('editor_assignments', 'assignment_id', b.assignmentId, {
        customer_communication_proof: proofStr,
        status: 'Editing Completed'
      });

      if (b.prodObj?.production_id) {
        await updateProduction(b.prodObj.production_id, {
          editing_status: 'Editing Completed' as any,
          production_status: 'Editing Completed' as any,
          client_communication_proof: proofStr,
          remarks: `Editing Completed & Customer Confirmation Proof uploaded by ${staffName} on ${new Date().toLocaleDateString()}`
        });
      }

      if (b.orderId) {
        await updateOrderStage(b.orderId, 'Editing Completed' as any);
      }
      if (b.leadId) {
        await updateLead(b.leadId, {
          status: 'Editing Completed' as any,
          current_status: 'Editing Completed' as any
        });
      }

      setEditingCompletedModal(null);
      setEditingCompletedForm({ confirmation_proof: '' });
      await refreshData();
      showToast('🎉 Status updated to Editing Completed!');
    } catch (err: any) {
      console.error('Error submitting Editing Completed:', err);
      alert('Failed to submit: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Client Acceptance Modal
  const handleClientAcceptanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientAcceptanceModal) return;

    if (!clientAcceptanceForm.checklist_1 || !clientAcceptanceForm.checklist_2 || !clientAcceptanceForm.checklist_3) {
      alert("Validation Failed: Please complete all required items in the Final Delivery Checklist.");
      return;
    }

    if (!clientAcceptanceForm.communication_proof) {
      alert("Validation Failed: Please upload or provide Customer Communication Proof.");
      return;
    }

    if (!clientAcceptanceForm.internal_validation) {
      alert("Validation Failed: Please check Internal Validation.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = clientAcceptanceModal;

      await updateEditorAssignmentStatus(b.assignmentId, 'Completed' as any);

      await pushUpdate('editor_assignments', 'assignment_id', b.assignmentId, {
        customer_communication_proof: clientAcceptanceForm.communication_proof,
        accepted_at: timestamp,
        status: 'Client Acceptance'
      });

      if (b.prodObj?.production_id) {
        await updateProduction(b.prodObj.production_id, {
          editing_status: 'Client Acceptance' as any,
          production_status: 'Client Acceptance' as any,
          actual_delivery_date: timestamp.split('T')[0],
          remarks: `Client Acceptance verified by ${staffName} on ${new Date().toLocaleDateString()}`
        });
      }

      // System Action: Transfer project to Business Owner Dashboard for final review
      if (b.orderId) {
        await updateOrderStage(b.orderId, 'Client Acceptance' as any);
      }
      if (b.leadId) {
        await updateLead(b.leadId, {
          status: 'Client Acceptance' as any,
          current_status: 'Client Acceptance' as any
        });
      }

      setClientAcceptanceModal(null);
      setClientAcceptanceForm({
        checklist_1: false,
        checklist_2: false,
        checklist_3: false,
        communication_proof: '',
        internal_validation: true
      });
      await refreshData();
      showToast('🏆 Client Acceptance Verified! Project automatically transferred to Business Owner Dashboard.');
    } catch (err: any) {
      console.error('Error submitting Client Acceptance:', err);
      alert('Failed to submit: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-black min-h-screen text-white font-sans selection:bg-purple-500/30">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                EDITOR STAFF PORTAL
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-1">
              Production Staff Dashboard
            </h1>
            <p className="text-sm text-zinc-400">
              Welcome, <span className="text-purple-400 font-bold">{staffName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <Activity className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-[10px] uppercase font-mono text-zinc-400">Assigned Deliverables</div>
              <span className="text-xl font-black text-white">{activeBookings.length} Active</span>
            </div>
          </div>
        </div>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="bg-zinc-900 border border-purple-500/30 shadow-2xl rounded-xl px-5 py-3 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-white whitespace-nowrap">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* TASKS TABLE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h2 className="text-xs font-mono font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <span>🎬 My Assigned Deliverables</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">{activeBookings.length}</span>
            </h2>
          </div>

          {activeBookings.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed space-y-2">
              <CheckCircle2 className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-zinc-400 font-medium text-sm">No active deliverables assigned specifically to you right now.</p>
              <p className="text-zinc-600 text-xs">New assignments made by Production Manager will automatically appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeBookings.map((grp) => {
                const badge = getStatusBadge(grp.overallStatus);

                return (
                  <div key={grp.groupId} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
                    {/* TASK HEADER PANEL */}
                    <div className="p-4 sm:p-5 bg-zinc-900/90 border-b border-zinc-800 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start flex-1">
                        
                        {/* Customer */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Customer</div>
                          <div className="font-black text-white text-base leading-snug truncate" title={grp.customerName}>
                            {grp.customerName}
                          </div>
                          {grp.customerMobile ? (
                            <div className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1 mt-0.5">
                              <span>📞</span>
                              <span>{grp.customerMobile}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">No contact</div>
                          )}
                        </div>

                        {/* Event Name */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Event Name</div>
                          <div className="font-bold text-purple-300 text-sm truncate" title={grp.eventName}>
                            {grp.eventName}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span>{grp.eventDate || '—'}</span>
                          </div>
                        </div>

                        {/* Order ID */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Order ID</div>
                          <span 
                            onClick={() => setSelectedProjectForDetail(grp.orderId)}
                            className="font-mono font-bold text-violet-400 hover:text-violet-300 hover:underline cursor-pointer text-sm block truncate"
                            title="Click to view full dossier"
                          >
                            {grp.orderId}
                          </span>
                          {grp.leadId && grp.leadId !== grp.orderId && (
                            <span className="text-[10px] text-zinc-500 font-mono block">Ref: {grp.leadId}</span>
                          )}
                        </div>

                        {/* Raw Footage Link */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Raw Footage Link</div>
                          {grp.rawFootageLink && typeof grp.rawFootageLink === 'string' && grp.rawFootageLink.trim() !== '' ? (
                            <a
                              href={grp.rawFootageLink.trim().startsWith('http') ? grp.rawFootageLink.trim() : `https://${grp.rawFootageLink.trim()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm mt-0.5"
                              title={grp.rawFootageLink}
                            >
                              <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>View Raw Footage</span>
                            </a>
                          ) : (
                            <span className="text-zinc-500 italic text-xs font-mono block pt-1">Not Provided</span>
                          )}
                        </div>

                        {/* Target Delivery Date */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Target Delivery Date</div>
                          <span className="font-mono text-xs text-zinc-200 font-bold block pt-1">{grp.targetFinishDate || 'Not set'}</span>
                        </div>

                      </div>

                      {/* Overall Task Status Badge */}
                      <div className="shrink-0 flex xl:flex-col items-center xl:items-end justify-between border-t xl:border-t-0 border-zinc-800 pt-3 xl:pt-0">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-bold">Overall Task Status</div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* ASSIGNED DELIVERABLES TABLE */}
                    <div className="p-4 bg-zinc-950/90">
                      <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span>📦 Assigned Deliverables</span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                            {grp.deliverables.length} {grp.deliverables.length === 1 ? 'Deliverable' : 'Deliverables'}
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-500 font-normal">Assigned to: <strong className="text-purple-400">{staffName}</strong></span>
                      </div>

                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse min-w-[750px]">
                          <thead>
                            <tr className="bg-zinc-900/50 border-b border-zinc-800 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                              <th className="px-3.5 py-2.5 font-bold">Deliverable</th>
                              <th className="px-3.5 py-2.5 font-bold text-center">Qty</th>
                              <th className="px-3.5 py-2.5 font-bold">Current Status</th>
                              <th className="px-3.5 py-2.5 font-bold">Edited Drive Link</th>
                              <th className="px-3.5 py-2.5 font-bold text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/80 text-xs font-sans">
                            {grp.deliverables.map((delivItem: any) => {
                              const delivBadge = getStatusBadge(delivItem.status);
                              const isDelivLocked = ['Client Acceptance', 'Business Owner Review', 'Project Completed', 'Completed', 'Order Closed'].includes(delivItem.status) || grp.orderObj?.current_stage === 'Business Owner Review';

                              const parsedDeliv = parseQtyAndText(delivItem.deliverable);
                              const delivQty = parsedDeliv.qty || 1;
                              const delivName = parsedDeliv.text || delivItem.deliverable;

                              return (
                                <tr key={delivItem.assignmentId} className="hover:bg-zinc-900/40 transition-colors">
                                  {/* Deliverable Name */}
                                  <td className="px-3.5 py-3 font-bold text-purple-300">
                                    <div className="flex items-center gap-2">
                                      <span>🎯 {delivName}</span>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-mono font-normal block mt-0.5">{delivItem.assignmentId}</span>
                                  </td>

                                  {/* Qty */}
                                  <td className="px-3.5 py-3 font-mono font-bold text-center">
                                    <span className="px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-200 text-xs border border-zinc-800">
                                      {delivQty}
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td className="px-3.5 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${delivBadge.color}`}>
                                      {delivBadge.label}
                                    </span>
                                  </td>

                                  {/* Edited Link */}
                                  <td className="px-3.5 py-3 font-mono">
                                    {delivItem.editedDriveLink && (delivItem.editedDriveLink.startsWith('http://') || delivItem.editedDriveLink.startsWith('https://')) ? (
                                      <a
                                        href={delivItem.editedDriveLink.startsWith('http') ? delivItem.editedDriveLink : `https://${delivItem.editedDriveLink}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        referrerPolicy="no-referrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer max-w-[150px] truncate"
                                        title={delivItem.editedDriveLink}
                                      >
                                        <LinkIcon className="w-3 h-3 shrink-0" />
                                        <span className="truncate">View Link</span>
                                      </a>
                                    ) : (
                                      <span className="text-zinc-600 italic text-[11px]">Pending Upload</span>
                                    )}
                                  </td>

                                  {/* Action Dropdown */}
                                  <td className="px-3.5 py-3 text-center relative">
                                    <div className="relative inline-block text-left">
                                      <button
                                        type="button"
                                        onClick={() => setActiveDropdownId(activeDropdownId === delivItem.assignmentId ? null : delivItem.assignmentId)}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center gap-1.5 shadow-md cursor-pointer mx-auto"
                                      >
                                        <span>⚡ Action</span>
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>

                                      {/* DROPDOWN MENU */}
                                      {activeDropdownId === delivItem.assignmentId && (
                                        <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-zinc-800 animate-in fade-in zoom-in-95 text-left">
                                          
                                          {/* View Details */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              setSelectedProjectForDetail(grp.orderId);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-zinc-200 hover:bg-purple-600/20 hover:text-purple-300 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                          >
                                            <Eye className="w-4 h-4 text-purple-400" /> View Details
                                          </button>

                                          {/* Locked State Notification */}
                                          {isDelivLocked ? (
                                            <div className="px-4 py-3 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold flex items-center gap-2">
                                              <Lock className="w-3.5 h-3.5" /> Client Acceptance Complete
                                            </div>
                                          ) : (
                                            <>
                                              {/* Workflow Step 1: Editing Started */}
                                              {(delivItem.status === 'Assigned Editor' || delivItem.status === 'Editor Assigned' || delivItem.status === 'Assigned' || delivItem.status === 'Raw Footage Received') && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setActiveDropdownId(null);
                                                    setEditingStartedModal(delivItem);
                                                    setEditingStartedForm({
                                                      expected_delivery_date: delivItem.targetFinishDate || new Date().toISOString().split('T')[0],
                                                      estimated_completion_date: delivItem.targetFinishDate || new Date().toISOString().split('T')[0],
                                                      estimated_completion_time: '18:00'
                                                    });
                                                  }}
                                                  className="w-full text-left px-4 py-2.5 text-xs text-sky-400 hover:bg-sky-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                                >
                                                  <Play className="w-4 h-4" /> Start Editing
                                                </button>
                                              )}

                                              {/* Workflow Step 2: Customer Review */}
                                              {delivItem.status === 'Editing Started' && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setActiveDropdownId(null);
                                                    setCustomerReviewModal(delivItem);
                                                    setCustomerReviewForm({ edited_drive_link: delivItem.editedDriveLink || '' });
                                                  }}
                                                  className="w-full text-left px-4 py-2.5 text-xs text-amber-400 hover:bg-amber-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                                >
                                                  <UserCheck className="w-4 h-4" /> Upload Review
                                                </button>
                                              )}

                                              {/* Workflow Step 3: Re-send Customer Review, Upload Confirmation Proof & Client Acceptance */}
                                              {delivItem.status === 'Customer Review' && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setActiveDropdownId(null);
                                                      setCustomerReviewModal(delivItem);
                                                      setCustomerReviewForm({ edited_drive_link: delivItem.editedDriveLink || '' });
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-xs text-amber-400 hover:bg-amber-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                                  >
                                                    <RefreshCw className="w-4 h-4" /> Re-send Review Link
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setActiveDropdownId(null);
                                                      setEditingCompletedModal(delivItem);
                                                      setEditingCompletedForm({ confirmation_proof: '' });
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-xs text-indigo-400 hover:bg-indigo-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                                  >
                                                    <CheckCircle2 className="w-4 h-4" /> Upload Confirmation Proof
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setActiveDropdownId(null);
                                                      setClientAcceptanceModal(delivItem);
                                                      setClientAcceptanceForm({
                                                        checklist_1: false,
                                                        checklist_2: false,
                                                        checklist_3: false,
                                                        communication_proof: '',
                                                        internal_validation: true
                                                      });
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-xs text-emerald-400 hover:bg-emerald-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                                  >
                                                    <ShieldCheck className="w-4 h-4" /> Client Acceptance
                                                  </button>
                                                </>
                                              )}

                                              {/* Workflow Step 4: Editing Completed -> Client Acceptance */}
                                              {(delivItem.status === 'Editing Completed' || delivItem.status === 'Editing Complete' || delivItem.status === 'Completed') && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setActiveDropdownId(null);
                                                    setClientAcceptanceModal(delivItem);
                                                    setClientAcceptanceForm({
                                                      checklist_1: false,
                                                      checklist_2: false,
                                                      checklist_3: false,
                                                      communication_proof: delivItem.customer_communication_proof || '',
                                                      internal_validation: true
                                                    });
                                                  }}
                                                  className="w-full text-left px-4 py-2.5 text-xs text-emerald-400 hover:bg-emerald-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                                >
                                                  <ShieldCheck className="w-4 h-4" /> Client Acceptance
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================= */}
      {/* 1. EDITING STARTED MODAL POPUP */}
      {/* ========================================================= */}
      {editingStartedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Editing Started</h3>
              </div>
              <button 
                onClick={() => setEditingStartedModal(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Please review the expected delivery date and enter your estimated completion date & time.
            </p>

            <form onSubmit={handleEditingStartedSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Expected Delivery Date (Pre-filled)
                </label>
                <input
                  type="date"
                  value={editingStartedForm.expected_delivery_date}
                  onChange={(e) => setEditingStartedForm({ ...editingStartedForm, expected_delivery_date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Estimated Completion Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={editingStartedForm.estimated_completion_date}
                  onChange={(e) => setEditingStartedForm({ ...editingStartedForm, estimated_completion_date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Estimated Completion Time <span className="text-rose-400">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={editingStartedForm.estimated_completion_time}
                  onChange={(e) => setEditingStartedForm({ ...editingStartedForm, estimated_completion_time: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingStartedModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-sky-600/20"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit & Start Editing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CUSTOMER REVIEW MODAL POPUP */}
      {/* ========================================================= */}
      {customerReviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Customer Review</h3>
              </div>
              <button 
                onClick={() => setCustomerReviewModal(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Provide the Edited Drive Link containing the preview videos/photos for customer review.
            </p>

            <form onSubmit={handleCustomerReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Edited Drive Link <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={customerReviewForm.edited_drive_link}
                  onChange={(e) => setCustomerReviewForm({ edited_drive_link: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCustomerReviewModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-amber-600/20"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit & Generate WhatsApp Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2B. WHATSAPP REVIEW MESSAGE POPUP (AUTOMATIC SECOND POPUP) */}
      {/* ========================================================= */}
      {whatsappModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">WhatsApp Review Message</h3>
              </div>
              <button 
                onClick={() => setWhatsappModal(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Pre-filled WhatsApp review message generated for <strong className="text-zinc-200">{whatsappModal.customerName}</strong> ({whatsappModal.phone || 'No Phone Registered'}).
            </p>

            <div className="space-y-2">
              <label className="block text-[11px] font-mono font-bold text-emerald-400 uppercase">
                Generated Message
              </label>
              <textarea
                readOnly
                rows={8}
                value={whatsappModal.message}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none resize-none select-all"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsappModal.message);
                  setCopiedSuccess(true);
                  setTimeout(() => setCopiedSuccess(false), 3000);
                }}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-zinc-400" />
                <span>{copiedSuccess ? 'Copied!' : 'Copy Message'}</span>
              </button>

              {whatsappModal.phone ? (
                <a
                  href={`https://wa.me/${formatWhatsAppPhone(whatsappModal.phone)}?text=${encodeURIComponent(whatsappModal.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open WhatsApp</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 bg-zinc-800 text-zinc-500 text-xs font-bold rounded-xl flex items-center gap-1.5 opacity-60 cursor-not-allowed"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>No Phone Available</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setWhatsappModal(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. EDITING COMPLETED MODAL POPUP */}
      {/* ========================================================= */}
      {editingCompletedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Upload Customer Confirmation Proof</h3>
              </div>
              <button 
                onClick={() => setEditingCompletedModal(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Upload customer confirmation image or proof confirming edits/revisions are completed. This will update status to <strong className="text-indigo-400">Editing Completed</strong>.
            </p>

            <form onSubmit={handleEditingCompletedSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Customer Confirmation Image / Proof <span className="text-rose-400">*</span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const compressed = await compressImage(e.target.files[0]);
                      setEditingCompletedForm({ ...editingCompletedForm, confirmation_proof: compressed });
                    }
                  }}
                  className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer mb-2"
                />

                <div className="text-[10px] text-zinc-500 text-center uppercase font-mono my-1">- OR ENTER PROOF IMAGE URL / DRIVE LINK -</div>

                <input
                  type="text"
                  placeholder="https://..."
                  value={editingCompletedForm.confirmation_proof}
                  onChange={(e) => setEditingCompletedForm({ ...editingCompletedForm, confirmation_proof: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />

                {editingCompletedForm.confirmation_proof && (
                  <div className="mt-2 text-[11px] text-indigo-400 font-mono font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Confirmation Proof Attached
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingCompletedModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editingCompletedForm.confirmation_proof.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  {isSubmitting ? 'Saving...' : 'Submit & Mark Editing Completed 🎯'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CLIENT ACCEPTANCE MODAL POPUP */}
      {/* ========================================================= */}
      {clientAcceptanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Client Acceptance</h3>
              </div>
              <button 
                onClick={() => setClientAcceptanceModal(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Verify the final delivery checklist and upload customer communication proof to complete Production and transfer project to Business Owner.
            </p>

            <form onSubmit={handleClientAcceptanceSubmit} className="space-y-4">
              
              {/* CHECKLIST */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <label className="block text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" /> Final Delivery Checklist <span className="text-rose-400">*</span>
                </label>
                
                <label className="flex items-start gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientAcceptanceForm.checklist_1}
                    onChange={(e) => setClientAcceptanceForm({ ...clientAcceptanceForm, checklist_1: e.target.checked })}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>1. All Video & Photo Deliverables Rendered in Full Resolution</span>
                </label>

                <label className="flex items-start gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientAcceptanceForm.checklist_2}
                    onChange={(e) => setClientAcceptanceForm({ ...clientAcceptanceForm, checklist_2: e.target.checked })}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>2. Color Grading & Audio Mix Verified with Client Specifications</span>
                </label>

                <label className="flex items-start gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientAcceptanceForm.checklist_3}
                    onChange={(e) => setClientAcceptanceForm({ ...clientAcceptanceForm, checklist_3: e.target.checked })}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>3. Customer Final Sign-off & Confirmation Received</span>
                </label>
              </div>

              {/* COMMUNICATION PROOF */}
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Customer Communication Proof <span className="text-rose-400">*</span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const compressed = await compressImage(e.target.files[0]);
                      setClientAcceptanceForm({ ...clientAcceptanceForm, communication_proof: compressed });
                    }
                  }}
                  className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer mb-2"
                />

                <div className="text-[10px] text-zinc-500 text-center uppercase font-mono my-1">- OR ENTER PROOF IMAGE URL -</div>

                <input
                  type="text"
                  placeholder="https://..."
                  value={clientAcceptanceForm.communication_proof}
                  onChange={(e) => setClientAcceptanceForm({ ...clientAcceptanceForm, communication_proof: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />

                {clientAcceptanceForm.communication_proof && (
                  <div className="mt-2 text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Communication Proof Attached
                  </div>
                )}
              </div>

              {/* INTERNAL VALIDATION */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="internal_validation_cb"
                  checked={clientAcceptanceForm.internal_validation}
                  onChange={(e) => setClientAcceptanceForm({ ...clientAcceptanceForm, internal_validation: e.target.checked })}
                  className="rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="internal_validation_cb" className="text-xs text-zinc-300 font-bold cursor-pointer">
                  Internal Validation Verified <span className="text-rose-400">*</span>
                </label>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-[11px] text-purple-300 flex items-center gap-2">
                <span>🚀</span> Submission will automatically update status to Client Acceptance & transfer project to Business Owner Dashboard.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setClientAcceptanceModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting || 
                    !clientAcceptanceForm.checklist_1 || 
                    !clientAcceptanceForm.checklist_2 || 
                    !clientAcceptanceForm.checklist_3 || 
                    !clientAcceptanceForm.communication_proof ||
                    !clientAcceptanceForm.internal_validation
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  {isSubmitting ? 'Transferring...' : 'Submit & Transfer to Business Owner Dashboard 🏆'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT DETAIL MODAL */}
      {selectedProjectForDetail && (
        <ProjectDetailModal
          isOpen={!!selectedProjectForDetail}
          onClose={() => setSelectedProjectForDetail(null)}
          orderId={selectedProjectForDetail}
        />
      )}

    </div>
  );
};
