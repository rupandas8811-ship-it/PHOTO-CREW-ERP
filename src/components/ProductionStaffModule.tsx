import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from './RoleContext';
import { 
  Calendar, Clock, CheckCircle2, Eye, FileVideo, Play, UserCheck, 
  ShieldCheck, ChevronDown, ChevronUp, Upload, FileText, CheckSquare, Lock, Activity, 
  Link as LinkIcon, AlertCircle, X, Sparkles, Check, MessageSquare, Copy, ExternalLink, RefreshCw
} from 'lucide-react';
import { supabaseClient } from '../supabaseClient';
import { EditorAssignment } from '../types';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ListSortFilter, SortOrder, compareRecordsByDate } from './ui/ListSortFilter';
import { parseQtyAndText, formatQtyItem, deserializeLeadEvents, parseDeliverablesWithQty, uploadProofToStorage, resolveStorageUrl, parseCustomerProof, ParsedCustomerProof } from '../utils';

// Floating Action Menu Dropdown using React Portal
interface ActionMenuDropdownProps {
  buttonContent: React.ReactNode;
  buttonClassName?: string;
  dropdownId: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

const ActionMenuDropdown: React.FC<ActionMenuDropdownProps> = ({
  buttonContent,
  buttonClassName,
  dropdownId,
  isOpen,
  onToggle,
  onClose,
  children
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return false;
    const rect = buttonRef.current.getBoundingClientRect();

    // CRITICAL: If button is inside a display:none container (e.g. desktop vs mobile view toggle),
    // rect.width & rect.height will be 0. Do NOT compute coordinates or render portal for hidden buttons!
    if (rect.width === 0 || rect.height === 0) {
      setCoords(null);
      return false;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Desired dropdown width: max 230px, or screen width minus 24px padding
    const dropdownWidth = Math.min(230, windowWidth - 24);

    const spaceBelow = windowHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 220; // estimated max height of dropdown menu

    let top: number | undefined = undefined;
    let bottom: number | undefined = undefined;

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      // Open upward
      bottom = windowHeight - rect.top + 6;
    } else {
      // Open downward
      top = rect.bottom + 6;
    }

    // Calculate horizontal positioning:
    // Default right-aligned to button, clamped within screen margins
    let leftCandidate = rect.right - dropdownWidth;
    let left = Math.max(12, Math.min(leftCandidate, windowWidth - dropdownWidth - 12));

    setCoords({ top, bottom, left, width: dropdownWidth });
    return true;
  }, []);

  // Compute position synchronously BEFORE paint when isOpen changes
  useLayoutEffect(() => {
    if (isOpen) {
      const isVisible = updatePosition();
      if (!isVisible) {
        setCoords(null);
      }
    } else {
      setCoords(null);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (isOpen && coords) {
      const handleScrollOrResize = (e: Event) => {
        if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
          return;
        }
        updatePosition();
      };

      const handleClickOutside = (e: MouseEvent) => {
        if (
          buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
        ) {
          onClose();
        }
      };

      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, coords, updatePosition, onClose]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={buttonClassName}
      >
        {buttonContent}
      </button>

      {isOpen && coords !== null && createPortal(
        <div
          ref={dropdownRef}
          id={dropdownId}
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : 'auto',
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: 'calc(100vh - 32px)',
            zIndex: 99999,
          }}
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-y-auto divide-y divide-zinc-800 animate-in fade-in zoom-in-95 text-left font-sans text-xs"
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
};

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
const getRawFootageDriveLink = (assignment: any, prod: any, order: any, lead: any, operations: any[], rawFootage?: any[]): string => {
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
    matchedOp.consolidated_drive_link || 
    matchedOp.Consolidated_Drive_Link
  ) : (
    prod.consolidated_drive_link || 
    prod.Consolidated_Drive_Link
  );

  if (opsLink && typeof opsLink === 'string' && opsLink.trim() !== '') {
    return opsLink.trim();
  }

  return '';
};

// Helper to extract events array from lead (either directly on lead.events or deserialized from notes_special_customizations)
const getLeadEvents = (lead: any) => {
  if (lead?.events && Array.isArray(lead.events) && lead.events.length > 0) {
    return lead.events;
  }
  if (lead?.notes_special_customizations) {
    const deserialized = deserializeLeadEvents(lead.notes_special_customizations);
    if (deserialized.events && Array.isArray(deserialized.events) && deserialized.events.length > 0) {
      return deserialized.events;
    }
  }
  return [];
};

// Helper to identify the exact event record in lead.events for an assignment / prod / order
const getTargetEventForAssignment = (lead: any, order: any, prod: any, assignment?: any) => {
  const targetEventId = assignment?.event_id || prod?.event_id;
  const rawEvents = getLeadEvents(lead);

  if (rawEvents.length > 0) {
    // 1. Try matching by exact event_id / id or index
    if (targetEventId !== undefined && targetEventId !== null && String(targetEventId).trim() !== '') {
      const searchStr = String(targetEventId).trim().toLowerCase();
      const matchById = rawEvents.find((ev: any, idx: number) => 
        (ev.id && String(ev.id).trim().toLowerCase() === searchStr) ||
        (ev.event_id && String(ev.event_id).trim().toLowerCase() === searchStr) ||
        `ev_${idx}` === searchStr ||
        String(idx) === searchStr ||
        (ev.event_name && String(ev.event_name).trim().toLowerCase() === searchStr) ||
        (ev.event_type && String(ev.event_type).trim().toLowerCase() === searchStr)
      );
      if (matchById) return matchById;
    }

    // 2. Try matching by event_name or custom_event_name or speciality on assignment / prod / order
    const searchName = assignment?.event_name || prod?.custom_event_name || prod?.event_name || order?.custom_event_name || order?.event_name;
    if (searchName && searchName.trim() !== '') {
      const searchLower = searchName.trim().toLowerCase();
      const matchByName = rawEvents.find((ev: any) => 
        (ev.event_name && ev.event_name.trim().toLowerCase() === searchLower) ||
        (ev.custom_event_name && ev.custom_event_name.trim().toLowerCase() === searchLower) ||
        (ev.event_type && ev.event_type.trim().toLowerCase() === searchLower)
      );
      if (matchByName) return matchByName;
    }

    // 3. Fallback: return the first event from THIS lead's EVENTS_JSON
    return rawEvents[0];
  }

  return null;
};

// Helper to extract resolved Event Name without generic fallback
const getResolvedEventName = (lead: any, order: any, prod: any, assignment?: any): string => {
  const targetEv = getTargetEventForAssignment(lead, order, prod, assignment);
  if (targetEv) {
    if (targetEv.event_name === 'Other') {
      return targetEv.custom_event_name || 'Other';
    }
    if (targetEv.custom_event_name && targetEv.custom_event_name.trim() !== '') {
      return targetEv.custom_event_name;
    }
    if (targetEv.event_name && targetEv.event_name.trim() !== '') {
      return targetEv.event_name;
    }
    const eType = targetEv.event_type === 'Other' ? targetEv.custom_event_type : targetEv.event_type;
    if (eType && eType.trim() !== '') {
      return eType;
    }
  }

  const candidate = (
    lead?.custom_event_name ||
    (lead?.event_name && lead.event_name !== 'Other' ? lead.event_name : null) ||
    (order?.event_name && order.event_name !== 'Other' ? order.event_name : null) ||
    order?.custom_event_name ||
    (lead?.event_type === 'Other' ? lead?.custom_event_type : lead?.event_type) ||
    order?.event_type ||
    prod?.event_name ||
    ''
  ).toString().trim();

  if (candidate && candidate !== 'Project' && candidate !== 'Other' && candidate !== 'Unnamed Event') {
    return candidate;
  }

  return 'N/A';
};

// Helper to extract resolved Event Type from Sales Step 2 records
const getResolvedEventType = (lead: any, order: any, prod: any, assignment?: any): string => {
  const targetEv = getTargetEventForAssignment(lead, order, prod, assignment);
  if (targetEv) {
    if (targetEv.event_type === 'Other') {
      return targetEv.custom_event_type || 'Other';
    }
    if (targetEv.event_type && targetEv.event_type.trim() !== '') {
      return targetEv.event_type;
    }
  }

  const candidate = (
    (lead?.event_type === 'Other' ? lead?.custom_event_type : lead?.event_type) ||
    order?.event_type ||
    prod?.event_type ||
    ''
  ).toString().trim();

  return candidate || 'N/A';
};

// Helper to extract exact deliverable quantity saved for an assigned deliverable
const getAssignedDeliverableQty = (
  assignment: any,
  targetEvent: any,
  lead: any,
  order: any,
  prod: any,
  quotationsList: any[]
): number => {
  if (!assignment) return 1;

  const rawSpeciality = (
    assignment.speciality ||
    assignment.deliverable_id ||
    assignment.deliverable ||
    ''
  ).toString().trim();

  // 1. Direct check: If assignment speciality itself starts with or contains quantity (e.g. "2 x Photobook Album", "2 × Photobook Album", "Photobook Album - Qty: 2")
  const directParsed = parseQtyAndText(rawSpeciality);
  if (directParsed.qty > 1) {
    return directParsed.qty;
  }

  // 2. Direct property on assignment if present
  if (typeof (assignment as any).qty === 'number' && (assignment as any).qty > 0) {
    return (assignment as any).qty;
  }
  if (typeof (assignment as any).quantity === 'number' && (assignment as any).quantity > 0) {
    return (assignment as any).quantity;
  }

  const cleanSpeciality = (directParsed.text || rawSpeciality).trim();
  if (!cleanSpeciality) return 1;

  const targetEventId = targetEvent?.id || targetEvent?.event_id || assignment.event_id || prod?.event_id;
  const targetEventName = targetEvent?.event_name || targetEvent?.custom_event_name || targetEvent?.event_type || getResolvedEventName(lead, order, prod, assignment);

  let eventDeliverablesList: { name: string; qty: number }[] = [];

  // 3. Extract deliverables directly from targetEvent (from lead.events / order.events / prod.events)
  if (targetEvent && targetEvent.deliverables) {
    if (Array.isArray(targetEvent.deliverables)) {
      eventDeliverablesList = parseDeliverablesWithQty(JSON.stringify(targetEvent.deliverables));
    } else if (typeof targetEvent.deliverables === 'string') {
      eventDeliverablesList = parseDeliverablesWithQty(targetEvent.deliverables);
    }
  }

  // 4. If targetEvent has no deliverables, parse deliverables_description from order, lead, or quotation
  if (eventDeliverablesList.length === 0) {
    let deliverablesText = order?.deliverables_description || lead?.deliverables_description || (prod as any)?.deliverables_description || '';
    
    if (!deliverablesText && lead) {
      const targetLeadQuotes = (quotationsList || []).filter((q: any) => q.lead_id === lead.lead_id);
      targetLeadQuotes.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      if (targetLeadQuotes[0]) {
        deliverablesText = targetLeadQuotes[0].deliverables_description || targetLeadQuotes[0].deliverables || '';
      }
    }

    if (deliverablesText) {
      eventDeliverablesList = parseDeliverablesWithQty(deliverablesText, targetEventName, targetEventId);
    }
  }

  // 5. Fallback: check general package deliverables on lead, order
  if (eventDeliverablesList.length === 0) {
    const fallbackText = lead?.deliverables || order?.deliverables || '';
    if (fallbackText) {
      eventDeliverablesList = parseDeliverablesWithQty(fallbackText);
    }
  }

  // 6. Match cleanSpeciality against items in eventDeliverablesList
  if (eventDeliverablesList.length > 0) {
    const normSearch = cleanSpeciality.toLowerCase();

    // 6a. Exact clean name match
    const exactMatch = eventDeliverablesList.find(d => {
      const normD = parseQtyAndText(d.name).text.trim().toLowerCase();
      return normD === normSearch || d.name.trim().toLowerCase() === normSearch;
    });
    if (exactMatch && exactMatch.qty > 0) {
      return exactMatch.qty;
    }

    // 6b. Partial / substring match
    const substringMatch = eventDeliverablesList.find(d => {
      const normD = parseQtyAndText(d.name).text.trim().toLowerCase();
      return (normD && normSearch.includes(normD)) || (normSearch && normD.includes(normSearch));
    });
    if (substringMatch && substringMatch.qty > 0) {
      return substringMatch.qty;
    }
  }

  return 1;
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
    rawFootage,
    editorAssignments, 
    quotations,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Selected project for ProjectDetailModal
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<{ orderId: string; eventId?: string } | string | null>(null);

  // Modal States for Production Workflow
  // 1. Editing Started Modal
  const [editingStartedModal, setEditingStartedModal] = useState<{group: any, actionItem: any} | null>(null);
  const [editingStartedForm, setEditingStartedForm] = useState<{
    expected_delivery_date: string;
    estimated_completion_date: string;
    estimated_completion_time: string;
    selectedIds: string[];
  }>({ 
    expected_delivery_date: '',
    estimated_completion_date: '', 
    estimated_completion_time: '',
    selectedIds: []
  });

  // 2. Customer Review Modal
  const [customerReviewModal, setCustomerReviewModal] = useState<{group: any, actionItem: any} | null>(null);
  const [customerReviewForm, setCustomerReviewForm] = useState<{edited_drive_link: string, selectedIds: string[]}>({ edited_drive_link: '', selectedIds: [] });

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
  const [editingCompletedModal, setEditingCompletedModal] = useState<{group: any, actionItem: any} | null>(null);
  const [editingCompletedForm, setEditingCompletedForm] = useState<{
    confirmation_proof: string;
    selectedIds: string[];
    server_upload_confirmed: boolean;
    server_upload_event_date: string;
    server_upload_folder_name: string;
  }>({ 
    confirmation_proof: '', 
    selectedIds: [],
    server_upload_confirmed: false,
    server_upload_event_date: '',
    server_upload_folder_name: ''
  });
  const [previewProofModal, setPreviewProofModal] = useState<{ url: string; title: string } | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');

  const openEditingCompletedModal = (grp: any, delivItem: any) => {
    const existingConfirmed = Boolean(
      delivItem.serverUploadConfirmed ||
      delivItem.assignmentObj?.server_upload_confirmed ||
      delivItem.assignmentObj?.edited_folder_uploaded_to_server ||
      delivItem.prodObj?.server_upload_confirmed
    );
    const existingEventDate = (
      delivItem.serverUploadEventDate ||
      delivItem.assignmentObj?.server_upload_event_date ||
      delivItem.prodObj?.server_upload_event_date ||
      delivItem.eventDate ||
      grp.eventDate ||
      ''
    ).trim();
    const existingFolderName = (
      delivItem.serverUploadFolderName ||
      delivItem.assignmentObj?.server_upload_folder_name ||
      delivItem.prodObj?.server_upload_folder_name ||
      delivItem.prodObj?.server_path ||
      ''
    ).trim();

    setEditingCompletedModal({ group: grp, actionItem: delivItem });
    setEditingCompletedForm({
      confirmation_proof: delivItem.confirmationProof || '',
      selectedIds: [delivItem.assignmentId],
      server_upload_confirmed: existingConfirmed,
      server_upload_event_date: existingEventDate,
      server_upload_folder_name: existingFolderName
    });
  };

  // Auto-scroll popup/modal into view whenever ANY modal popup is opened from Production Staff Dashboard
  useEffect(() => {
    if (
      editingStartedModal ||
      customerReviewModal ||
      whatsappModal ||
      editingCompletedModal ||
      selectedProjectForDetail
    ) {
      const timer = setTimeout(() => {
        let activeEl: HTMLElement | null = null;

        if (editingStartedModal) {
          activeEl = document.getElementById('editing_started_modal_card');
        } else if (customerReviewModal) {
          activeEl = document.getElementById('customer_review_modal_card');
        } else if (whatsappModal) {
          activeEl = document.getElementById('whatsapp_modal_card');
        } else if (editingCompletedModal) {
          activeEl = document.getElementById('editing_completed_modal_card');
        } else if (selectedProjectForDetail) {
          activeEl = document.getElementById('project_detail_modal_card') || document.getElementById('project_detail_master_modal');
        }

        // Fallback search for any active popup/dialog
        if (!activeEl) {
          activeEl = document.querySelector(
            '#editing_started_modal_card, #customer_review_modal_card, #whatsapp_modal_card, #editing_completed_modal_card, #project_detail_modal_card, [role="dialog"]'
          ) as HTMLElement;
        }

        if (activeEl) {
          const rect = activeEl.getBoundingClientRect();
          const windowHeight = window.innerHeight || document.documentElement.clientHeight;
          const windowWidth = window.innerWidth || document.documentElement.clientWidth;

          // Check if popup/element is already fully within the visible viewport
          const isFullyVisible = (
            rect.top >= 8 &&
            rect.left >= 8 &&
            rect.bottom <= (windowHeight - 8) &&
            rect.right <= (windowWidth - 8)
          );

          if (!isFullyVisible) {
            activeEl.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [
    editingStartedModal,
    customerReviewModal,
    whatsappModal,
    editingCompletedModal,
    selectedProjectForDetail
  ]);



  // Build assigned bookings list grouped by Order/Event for logged in assigned editor
  const activeBookings = useMemo(() => {
    if (!resolvedStaffId && !staffName && !currentUser?.id) return [];

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

        const excludedStatuses = ['Editing Completed', 'Editing Complete', 'Business Owner Review', 'Project Completed', 'Completed', 'Order Closed', 'Closed'];
        const operationsOnlyStages = ['Order Confirmed', 'Confirm Order', 'New Order', 'Operations Assigned', 'Assigned Crew', 'Staff Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'Footage Handover'];

        // Exclude deliverables that are complete on an individual assignment basis,
        // or if the overall order is completely finalized/closed.
        const isOrderFinalized = order && ['Business Owner Review', 'Project Completed', 'Completed', 'Order Closed', 'Closed'].includes(order.current_stage);
        const isProdFinalized = prod && ['Business Owner Review', 'Project Completed', 'Completed', 'Order Closed', 'Closed'].includes(prod.editing_status);

        if (excludedStatuses.includes(currentStatus) || isOrderFinalized || isProdFinalized) {
          return;
        }

        if (order && operationsOnlyStages.includes(order.current_stage) && (!prod || !['Verified Footage', 'Footage Handover Verified', 'Raw Footage Received', 'Assigned Editor', 'Editor Assigned', 'Editing Started', 'Customer Review', 'Editing Completed'].includes(prod.editing_status))) {
          return;
        }

        // Raw Footage Drive Link resolution across Operations / Raw Footage / Production / Assignment sources
        const rawFootageLink = getRawFootageDriveLink(assignment, prod, order, lead, operations, rawFootage);

        // Event Name, Type & Date resolution across Lead / Order / Production sources
        const targetEvent = getTargetEventForAssignment(lead, order, prod, assignment);
        const eventName = getResolvedEventName(lead, order, prod, assignment);
        const eventType = getResolvedEventType(lead, order, prod, assignment);
        const eventDate = (targetEvent?.event_date || lead?.events?.[0]?.event_date || lead?.event_date || order?.event_date || prod?.event_date || '').trim();
        const eventId = targetEvent?.id || targetEvent?.event_id || assignment.event_id || prod?.event_id || null;

        // Customer details resolution
        const customerName = (lead?.customer_name || order?.customer_name || prod?.customer_name || 'Client').trim();
        const customerMobile = (lead?.mobile || order?.customer_phone || prod?.customer_mobile || '').trim();

        // Edited Drive Link resolution
        const editedDriveLink = (assignment.Edited_Drive_Link || assignment.edited_drive_link || prod?.edited_drive_link || '').trim();

        // Customer Confirmation Image / Proof resolution
        const confirmationProof = (
          assignment.confirmation_proof ||
          assignment.customer_communication_proof ||
          assignment.client_communication_proof ||
          assignment.proof_url ||
          assignment.proof_image ||
          assignment.uploaded_proof ||
          ''
        ).trim();

        // Server Upload Confirmation resolution
        const serverUploadConfirmed = Boolean(
          assignment.server_upload_confirmed ||
          assignment.edited_folder_uploaded_to_server ||
          prod?.server_upload_confirmed
        );
        const serverUploadEventDate = (
          assignment.server_upload_event_date ||
          prod?.server_upload_event_date ||
          eventDate ||
          ''
        ).trim();
        const serverUploadFolderName = (
          assignment.server_upload_folder_name ||
          prod?.server_upload_folder_name ||
          prod?.server_path ||
          ''
        ).trim();
        const serverUploadConfirmedAt = (assignment.server_upload_confirmed_at || '').trim();
        const serverUploadConfirmedBy = (assignment.server_upload_confirmed_by || '').trim();

        const delivQty = getAssignedDeliverableQty(assignment, targetEvent, lead, order, prod, quotations);

        individualDeliverables.push({
            assignmentId: assignment.assignment_id,
            orderId: order?.order_id || prod?.order_id || prod?.tracking_id || assignment.order_id || assignment.production_id || 'OR-ASSIGNED',
            eventId,
            leadId: lead?.lead_id || order?.lead_id || prod?.lead_id,
            customerName,
            customerMobile,
            eventDate,
            eventName,
            eventType,
            deliverable: assignment.speciality,
            qty: delivQty,
            targetFinishDate: prod?.target_delivery_date || prod?.expected_delivery_date || assignment.target_finish_date || '',
            status: currentStatus,
            rawFootageLink,
            editedDriveLink,
            confirmationProof,
            serverUploadConfirmed,
            serverUploadEventDate,
            serverUploadFolderName,
            serverUploadConfirmedAt,
            serverUploadConfirmedBy,
            assignmentObj: assignment,
            orderObj: order,
            leadObj: lead,
            prodObj: prod,
            targetEventObj: targetEvent
        });
    });

    // Group deliverables by Order ID for this staff member
    const groupsMap = new Map<string, any>();
    individualDeliverables.forEach(item => {
      const groupKey = item.orderId;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          groupId: groupKey,
          orderId: item.orderId,
          eventId: item.eventId,
          leadId: item.leadId,
          customerName: item.customerName,
          customerMobile: item.customerMobile,
          eventName: item.eventName,
          eventType: item.eventType,
          eventDate: item.eventDate,
          targetFinishDate: item.targetFinishDate,
          rawFootageLink: item.rawFootageLink,
          confirmationProof: item.confirmationProof,
          serverUploadConfirmed: item.serverUploadConfirmed,
          serverUploadEventDate: item.serverUploadEventDate,
          serverUploadFolderName: item.serverUploadFolderName,
          orderObj: item.orderObj,
          leadObj: item.leadObj,
          prodObj: item.prodObj,
          targetEventObj: item.targetEventObj,
          deliverables: []
        });
      }

      const grp = groupsMap.get(groupKey);
      grp.deliverables.push(item);
      if (!grp.rawFootageLink && item.rawFootageLink) {
        grp.rawFootageLink = item.rawFootageLink;
      }
      if (!grp.confirmationProof && item.confirmationProof) {
        grp.confirmationProof = item.confirmationProof;
      }
      if (!grp.serverUploadConfirmed && item.serverUploadConfirmed) {
        grp.serverUploadConfirmed = item.serverUploadConfirmed;
        grp.serverUploadEventDate = item.serverUploadEventDate;
        grp.serverUploadFolderName = item.serverUploadFolderName;
      }
      if (item.targetFinishDate && (!grp.targetFinishDate || item.targetFinishDate < grp.targetFinishDate)) {
        grp.targetFinishDate = item.targetFinishDate;
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
    return Array.from(groupsMap.values()).map(grp => {
      const ranks = grp.deliverables.map((d: any) => getTaskStageRank(d.status, d.editedDriveLink));
      const minRank = Math.min(...ranks);

      let overallStatus = 'Assigned Editor';
      if (minRank >= 5) overallStatus = 'Client Acceptance';
      else if (minRank >= 4) overallStatus = 'Editing Completed';
      else if (minRank >= 3) overallStatus = 'Customer Review';
      else if (minRank >= 2) overallStatus = 'Editing Started';
      else if (minRank >= 1) overallStatus = 'Assigned Editor';

      const uniqueEventNames = Array.from(new Set(grp.deliverables.map((d: any) => d.eventName).filter(Boolean)));
      const displayName = uniqueEventNames.join(', ') || 'Unnamed Event';
      const eventCount = uniqueEventNames.length || 1;

      const uniqueEventDates = Array.from(new Set(grp.deliverables.map((d: any) => d.eventDate).filter(Boolean)));
      const displayDate = uniqueEventDates.join(', ') || grp.eventDate;

      return {
        ...grp,
        eventName: displayName,
        eventCount,
        eventDate: displayDate,
        overallStatus
      };
    });
  }, [staffName, resolvedStaffId, currentUser, editorAssignments, orders, leads, production, operations, quotations, rawFootage]);

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
      case 'Editing Completed':
      case 'Editing Complete':
        return { label: 'Editing Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'Client Acceptance':
        return { label: 'Client Acceptance', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      case 'Business Owner Review':
      case 'Project Completed':
      case 'Completed': 
      case 'Order Closed':
        return { label: 'Editing Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
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
    if (editingStartedForm.selectedIds.length === 0) {
      alert("Please select at least one deliverable to update.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = editingStartedModal.group;
      const deliverablesToUpdate = b.deliverables.filter((d: any) => editingStartedForm.selectedIds.includes(d.assignmentId));

      for (const deliv of deliverablesToUpdate) {
        // Update Editor Assignment
        await updateEditorAssignmentStatus(deliv.assignmentId, 'Editing Started' as any);

        // Save estimated completion info & expected delivery date
        await pushUpdate('editor_assignments', 'assignment_id', deliv.assignmentId, {
          target_finish_date: editingStartedForm.estimated_completion_date,
          status: 'Editing Started'
        });
      }

      const uniqueProdIds = Array.from(new Set(deliverablesToUpdate.map((d: any) => d.prodObj?.production_id).filter(Boolean)));
      for (const prodId of uniqueProdIds as string[]) {
        await updateProduction(prodId, {
          editing_status: 'Editing Started',
          production_status: 'Editing Started',
          expected_delivery_date: editingStartedForm.expected_delivery_date || editingStartedForm.estimated_completion_date,
          remarks: `Editing Started by ${staffName} on ${new Date().toLocaleDateString()} at ${editingStartedForm.estimated_completion_time}`
        });
      }

      const uniqueOrderIds = Array.from(new Set(deliverablesToUpdate.map((d: any) => d.orderId).filter(Boolean)));
      for (const orderId of uniqueOrderIds as string[]) {
        if (orderId !== 'ORD-ASSIGNED') {
          await updateOrderStage(orderId, 'Editing Started' as any);
        }
      }

      const uniqueLeadIds = Array.from(new Set(deliverablesToUpdate.map((d: any) => d.leadId).filter(Boolean)));
      for (const leadId of uniqueLeadIds as string[]) {
        await updateLead(leadId, {
          status: 'Editing Started' as any,
          current_status: 'Editing Started' as any
        });
      }

      setEditingStartedModal(null);
      setEditingStartedForm({ expected_delivery_date: '', estimated_completion_date: '', estimated_completion_time: '', selectedIds: [] });
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
    if (customerReviewForm.selectedIds.length === 0) {
      alert("Please select at least one deliverable to update.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = customerReviewModal.group;
      const editedLink = customerReviewForm.edited_drive_link.trim();
      const deliverablesToUpdate = b.deliverables.filter((d: any) => customerReviewForm.selectedIds.includes(d.assignmentId));

      for (const deliv of deliverablesToUpdate) {
        await updateEditorAssignmentStatus(deliv.assignmentId, 'Customer Review' as any);

        // Save Edited Drive Link directly into editor_assignments.Edited_Drive_Link
        const saveRes = await pushUpdate('editor_assignments', 'assignment_id', deliv.assignmentId, {
          Edited_Drive_Link: editedLink,
          edited_drive_link: editedLink,
          status: 'Customer Review'
        });

        if (saveRes && saveRes.success === false) {
          throw new Error(saveRes.error || 'Failed to save Edited Drive Link to editor_assignments table');
        }
      }

      const uniqueProdIds = Array.from(new Set(deliverablesToUpdate.map((d: any) => d.prodObj?.production_id).filter(Boolean)));
      for (const prodId of uniqueProdIds as string[]) {
        await updateProduction(prodId, {
          editing_status: 'Customer Review',
          production_status: 'Customer Review',
          edited_drive_link: editedLink,
          remarks: `Edited Drive Link uploaded by ${staffName} on ${new Date().toLocaleDateString()}: ${editedLink}`
        });
      }

      const uniqueOrderIds = Array.from(new Set(deliverablesToUpdate.map((d: any) => d.orderId).filter(Boolean)));
      for (const orderId of uniqueOrderIds as string[]) {
        if (orderId !== 'ORD-ASSIGNED') {
          await updateOrderStage(orderId, 'Customer Review' as any);
        }
      }

      const uniqueLeadIds = Array.from(new Set(deliverablesToUpdate.map((d: any) => d.leadId).filter(Boolean)));
      for (const leadId of uniqueLeadIds as string[]) {
        await updateLead(leadId, {
          status: 'Customer Review' as any,
          current_status: 'Customer Review' as any
        });
      }

      // Prepare WhatsApp popup payload
      const cName = b.customerName || 'Customer';
      const eName = customerReviewModal.actionItem?.eventName || b.eventName || 'Event';
      const cPhone = b.customerMobile || '';
      const messageText = `Hello ${cName},

Your edited photos/videos are ready for review.

Please review them using the following link:

${editedLink}

Kindly let us know if any changes are required.

Thank you.`;

      setCustomerReviewModal(null);
      setCustomerReviewForm({ edited_drive_link: '', selectedIds: [] });
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

    if (!editingCompletedForm.server_upload_confirmed || !editingCompletedForm.server_upload_event_date?.trim() || !editingCompletedForm.server_upload_folder_name?.trim()) {
      alert("Please confirm that the edited folder is uploaded and enter the Event Date and Folder Name.");
      return;
    }

    if (editingCompletedForm.selectedIds.length === 0) {
      alert("Please select at least one deliverable to update.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = editingCompletedModal.group;
      const proofInput = editingCompletedForm.confirmation_proof.trim();
      const serverEventDate = editingCompletedForm.server_upload_event_date.trim();
      const serverFolderName = editingCompletedForm.server_upload_folder_name.trim();

      // 1. Upload proof image to Supabase Storage bucket ('img') if file/data-uri, or resolve public URL
      const deliverablesToUpdate = b.deliverables.filter((d: any) => editingCompletedForm.selectedIds.includes(d.assignmentId));
      let mainProofUrl = '';

      // 2. Save status and proof references to editor_assignments table
      for (const deliv of deliverablesToUpdate) {
        const cleanId = (deliv.assignmentId || 'proof').replace(/[^a-zA-Z0-9_-]/g, '_');
        const uploadedProofUrl = await uploadProofToStorage(proofInput, `cust_confirmation_${cleanId}`);
        if (!uploadedProofUrl || !uploadedProofUrl.trim()) {
          throw new Error("Proof upload failed: Returned Storage URL is null or empty.");
        }
        mainProofUrl = uploadedProofUrl;
        console.log(`[ProductionStaffModule] Proof Storage URL generated for ${deliv.assignmentId}:`, uploadedProofUrl);

        const assignPayload = {
          confirmation_proof: uploadedProofUrl,
          customer_communication_proof: uploadedProofUrl,
          proof_url: uploadedProofUrl,
          proof_image: uploadedProofUrl,
          uploaded_proof: uploadedProofUrl,
          server_upload_confirmed: true,
          server_upload_event_date: serverEventDate,
          server_upload_folder_name: serverFolderName,
          server_upload_confirmed_at: timestamp,
          server_upload_confirmed_by: staffName || currentUser?.name || 'Production Staff',
          edited_folder_uploaded_to_server: true
        };

        await updateEditorAssignmentStatus(deliv.assignmentId, 'Editing Completed' as any, assignPayload);

        const resAssign = await pushUpdate('editor_assignments', 'assignment_id', deliv.assignmentId, {
          status: 'Editing Completed',
          ...assignPayload
        });

        if (resAssign && resAssign.success === false) {
          throw new Error(`Failed to update editor assignment (${deliv.assignmentId}): ${resAssign.error || 'Database update failed'}`);
        }
      }

      // 3. Save status and proof URL in remarks to production table
      const uniqueProdIds = Array.from(new Set(deliverablesToUpdate.map((d: any) => d.prodObj?.production_id).filter(Boolean)));
      for (const prodId of uniqueProdIds as string[]) {
        await updateProduction(prodId, {
          editing_status: 'Editing Completed' as any,
          production_status: 'Editing Completed' as any,
          server_upload_confirmed: true,
          server_upload_event_date: serverEventDate,
          server_upload_folder_name: serverFolderName,
          server_path: serverFolderName,
          remarks: `Editing Completed & Customer Confirmation Proof (${mainProofUrl || proofInput}) uploaded. Server Folder: "${serverFolderName}" (Event Date: ${serverEventDate}) by ${staffName} on ${new Date().toLocaleDateString()}`
        });
      }

      // 4. Save proof URL to orders table
      const uniqueOrderIds = Array.from(new Set(deliverablesToUpdate.map((d: any) => d.orderId).filter(Boolean)));
      for (const orderId of uniqueOrderIds as string[]) {
        if (orderId !== 'ORD-ASSIGNED') {
          await updateOrderStage(orderId, 'Editing Completed' as any);
        }
      }

      const uniqueLeadIds = Array.from(new Set(deliverablesToUpdate.map((d: any) => d.leadId).filter(Boolean)));
      for (const leadId of uniqueLeadIds as string[]) {
        await updateLead(leadId, {
          status: 'Editing Completed' as any,
          current_status: 'Editing Completed' as any
        });
      }

      setEditingCompletedModal(null);
      setEditingCompletedForm({ 
        confirmation_proof: '', 
        selectedIds: [],
        server_upload_confirmed: false,
        server_upload_event_date: '',
        server_upload_folder_name: ''
      });
      await refreshData();
      showToast("✅ Customer Confirmation Proof & Server Upload confirmed!");
      alert("✅ Customer Confirmation Proof and Server Upload confirmed successfully!");
    } catch (err: any) {
      console.error("[ProductionStaffModule] Error saving confirmation proof:", err);
      alert("❌ Failed to save Customer Confirmation Proof: " + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // End of Production Staff handlers

  const renderOrderHeader = (group: any) => (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4 text-[10px] font-mono text-zinc-400 space-y-1">
      <div className="flex justify-between">
        <span>Customer: <span className="text-white font-sans text-xs font-bold">{group.customerName}</span></span>
        <span>Order ID: <span className="text-white">{group.orderId}</span></span>
      </div>
      <div className="flex justify-between">
        <span>Event: <span className="text-white font-sans text-xs font-bold">{group.eventName}</span></span>
        <span>Assigned To: <span className="text-white font-sans text-xs">{staffName || currentUser?.name || 'Staff'}</span></span>
      </div>
    </div>
  );

  const renderDeliverableChecklist = (
    group: any,
    selectedIds: string[],
    setSelectedIds: (ids: string[]) => void,
    validStatuses: string[]
  ) => {
    const validDeliverables = group.deliverables.filter((d: any) => validStatuses.includes(d.status));
    if (validDeliverables.length === 0) return null;

    return (
      <div className="space-y-3 pt-3 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-mono font-bold text-zinc-300 uppercase">
            Select Deliverables to Update
          </label>
          <button
            type="button"
            onClick={() => {
              if (selectedIds.length === validDeliverables.length) {
                setSelectedIds([]);
              } else {
                setSelectedIds(validDeliverables.map((d: any) => d.assignmentId));
              }
            }}
            className="text-[10px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
          >
            {selectedIds.length === validDeliverables.length ? 'Clear All' : 'Select All'}
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
          {group.deliverables.map((d: any) => {
            const isValid = validStatuses.includes(d.status);
            const delivQty = d.qty || getAssignedDeliverableQty(d.assignmentObj, d.targetEventObj, d.leadObj, d.orderObj, d.prodObj, quotations);
            const parsedDeliv = parseQtyAndText(d.deliverable);
            const delivName = parsedDeliv.text || d.deliverable;
            const isSelected = selectedIds.includes(d.assignmentId);
            return (
              <label key={d.assignmentId} className={`flex items-start gap-3 p-3 rounded-xl border ${isValid ? isSelected ? 'bg-sky-500/10 border-sky-500/30' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500' : 'bg-zinc-950 border-zinc-800/50 opacity-50'} cursor-${isValid ? 'pointer' : 'not-allowed'} transition-colors`}>
                {isValid ? (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds([...selectedIds, d.assignmentId]);
                      else setSelectedIds(selectedIds.filter(id => id !== d.assignmentId));
                    }}
                    className="mt-1 shrink-0 accent-sky-500"
                  />
                ) : (
                  <div className="mt-1 w-3.5 h-3.5 rounded border border-zinc-700 bg-zinc-900 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white flex justify-between gap-2">
                    <span className="truncate">{delivName}</span>
                    <span className="text-zinc-500 font-mono text-[10px] shrink-0">Qty: {delivQty}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 font-mono">Current Status: {d.status}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
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
          <div className="flex flex-wrap items-center justify-between gap-3 pl-1">
            <h2 className="text-xs font-mono font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <span>🎬 My Assigned Deliverables</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">{activeBookings.length}</span>
            </h2>
            <ListSortFilter value={sortOrder} onChange={setSortOrder} />
          </div>

          {activeBookings.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed space-y-2">
              <CheckCircle2 className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-zinc-400 font-medium text-sm">No active deliverables assigned specifically to you right now.</p>
              <p className="text-zinc-600 text-xs">New assignments made by Production Manager will automatically appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {[...activeBookings].sort((a, b) => compareRecordsByDate(a, b, sortOrder)).map((grp) => {
                const isDetailsVisible = expandedOrderIds.includes(grp.orderId);

                return (
                  <div key={grp.groupId} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl space-y-0 w-full max-w-full">
                    {/* CUSTOMER / ORDER DETAILS CARD (HIDDEN BY DEFAULT, VISIBLE WHEN VIEW DETAILS IS CLICKED) */}
                    {isDetailsVisible && (
                      <div className="p-4 sm:p-5 bg-zinc-900/90 border-b border-zinc-800 relative animate-in fade-in duration-200">
                        <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                              📋 Customer & Order Details
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                              {grp.orderId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleOrderDetails(grp.orderId)}
                            className="text-xs font-bold text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Hide Details Card"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Hide Details</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
                          
                          {/* 1. Customer */}
                          <div className="space-y-0.5 col-span-2 sm:col-span-1 min-w-0">
                            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Customer</div>
                            <div className="font-black text-white text-base leading-snug break-words" title={grp.customerName}>
                              {grp.customerName}
                            </div>
                            {grp.customerMobile ? (
                              <div className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1 mt-0.5 break-all">
                                <span>📞</span>
                                <span>{grp.customerMobile}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">No contact</div>
                            )}
                          </div>

                          {/* 2. Order ID */}
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Order ID</div>
                            <span className="font-mono font-bold text-violet-400 text-sm block truncate">
                              {grp.orderId}
                            </span>
                            {grp.leadId && grp.leadId !== grp.orderId && (
                              <span className="text-[10px] text-zinc-500 font-mono block truncate">Ref: {grp.leadId}</span>
                            )}
                          </div>

                          {/* 3. Event Count */}
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Event Count</div>
                            <div className="font-bold text-purple-300 text-sm">
                              {grp.eventCount} {grp.eventCount === 1 ? 'Event' : 'Events'}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono truncate" title={grp.eventName}>
                              {grp.eventName}
                            </div>
                          </div>

                          {/* 4. Target Delivery Date */}
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Target Delivery Date</div>
                            <span className="font-mono text-xs text-zinc-200 font-bold block pt-1 truncate">{grp.targetFinishDate || 'Not set'}</span>
                          </div>

                          {/* 5. Overall Task Status */}
                          <div className="space-y-0.5 min-w-0">
                          </div>

                        </div>
                      </div>
                    )}

                    {/* ASSIGNED DELIVERABLES PANEL (ALWAYS VISIBLE BY DEFAULT) */}
                    <div className="p-4 bg-zinc-950/90 w-full max-w-full">
                      <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span>📦 Assigned Deliverables</span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                            {grp.deliverables.length} {grp.deliverables.length === 1 ? 'Deliverable' : 'Deliverables'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-violet-300 font-mono text-[10px] font-bold">
                            Order ID: {grp.orderId}
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-500 font-normal">Assigned to: <strong className="text-purple-400">{staffName}</strong></span>
                      </div>

                      {/* DESKTOP LAYOUT (Table view, visible on all screens) */}
                      <div className="block overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse min-w-max">
                          <thead>
                            <tr className="bg-zinc-900/50 border-b border-zinc-800 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                              <th className="px-3.5 py-2.5 font-bold">Order ID</th>
                              <th className="px-3.5 py-2.5 font-bold">Customer Name</th>
                              <th className="px-3.5 py-2.5 font-bold">Event Name</th>
                              <th className="px-3.5 py-2.5 font-bold">Assigned Task</th>
                              <th className="px-3.5 py-2.5 font-bold">Target Delivery Date</th>
                              <th className="px-3.5 py-2.5 font-bold">Note</th>
                              <th className="px-3.5 py-2.5 font-bold">Current Status</th>
                              <th className="px-3.5 py-2.5 font-bold">Edited Drive Link</th>
                              <th className="px-3.5 py-2.5 font-bold">Customer Proof</th>
                              <th className="px-3.5 py-2.5 font-bold">Row Footage</th>
                              <th className="px-3.5 py-2.5 font-bold text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/80 text-xs font-sans">
                            {grp.deliverables.map((delivItem: any) => {
                              const delivBadge = getStatusBadge(delivItem.status);
                              const isDelivLocked = ['Business Owner Review', 'Project Completed', 'Completed', 'Order Closed', 'Closed'].includes(delivItem.status) || grp.orderObj?.current_stage === 'Business Owner Review';

                              const delivQty = delivItem.qty || getAssignedDeliverableQty(delivItem.assignmentObj, delivItem.targetEventObj, delivItem.leadObj, delivItem.orderObj, delivItem.prodObj, quotations);
                              const parsedDeliv = parseQtyAndText(delivItem.deliverable);
                              const delivName = parsedDeliv.text || delivItem.deliverable;
                              const effectiveRawFootageLink = delivItem.rawFootageLink || grp.rawFootageLink;

                              return (
                                <tr key={delivItem.assignmentId} className="hover:bg-zinc-900/40 transition-colors">
                                  {/* 1. Order ID */}
                                  <td className="px-3.5 py-3 font-mono font-bold text-violet-400 whitespace-nowrap">
                                    {delivItem.orderId}
                                  </td>

                                  {/* 2. Customer Name */}
                                  <td className="px-3.5 py-3 font-bold text-white whitespace-nowrap">
                                    <div>{delivItem.customerName}</div>
                                    {delivItem.customerMobile && (
                                      <div className="text-[10px] text-emerald-400 font-mono font-normal flex items-center gap-1 mt-0.5">
                                        <span>📞</span>
                                        <span>{delivItem.customerMobile}</span>
                                      </div>
                                    )}
                                  </td>

                                  {/* 3. Event Name */}
                                  <td className="px-3.5 py-3 font-semibold text-purple-300">
                                    <div className="flex items-center gap-2">
                                      <span className="text-zinc-200 font-bold">{delivItem.eventName || 'N/A'}</span>
                                    </div>
                                    {delivItem.eventType && delivItem.eventType !== delivItem.eventName && delivItem.eventType !== 'N/A' && (
                                      <span className="text-[10px] text-amber-400 font-mono font-semibold block">{delivItem.eventType}</span>
                                    )}
                                  </td>

                                  {/* 4. Assigned Task (Deliverable) */}
                                  <td className="px-3.5 py-3 font-bold text-zinc-300">
                                    <div className="flex items-center gap-1.5">
                                      <span>🎯 {delivName}</span>
                                      {delivQty > 1 && (
                                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono text-[10px] border border-zinc-800">
                                          x{delivQty}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-mono font-normal block mt-0.5">{delivItem.assignmentId}</span>
                                  </td>

                                  {/* 5. Target Delivery Date */}
                                  <td className="px-3.5 py-3 font-mono text-xs text-zinc-200 font-bold whitespace-nowrap">
                                    {delivItem.targetFinishDate || grp.targetFinishDate || 'Not set'}
                                  </td>

                                  {/* 6. Note */}
                                  <td className="px-3.5 py-3 font-mono whitespace-nowrap">
                                     {delivItem.prodObj?.project_notes ? (
                                       <button
                                         onClick={() => setSelectedNote(delivItem.prodObj?.project_notes)}
                                         className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                                       >
                                         <FileText className="w-3.5 h-3.5 shrink-0" />
                                         Click to Read
                                       </button>
                                     ) : (
                                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-500 border border-zinc-800 text-[11px] font-mono">
                                         No Note
                                       </span>
                                     )}
                                  </td>

                                  {/* 7. Current Status */}
                                  <td className="px-3.5 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${delivBadge.color}`}>
                                      {delivBadge.label}
                                    </span>
                                  </td>

                                  {/* 8. Edited Drive Link */}
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

                                  {/* 9. Customer Proof */}
                                  <td className="px-3.5 py-3 whitespace-nowrap font-mono">
                                    {(() => {
                                      const proof = parseCustomerProof(delivItem.assignmentObj, delivItem.prodObj, delivItem.orderObj);

                                      if (!proof.hasProof) {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 text-[11px] font-mono">
                                            <Clock className="w-3 h-3 text-zinc-600" />
                                            <span>Pending</span>
                                          </span>
                                        );
                                      }

                                      // CASE 4: Both Image & Link exist
                                      if (proof.proofType === 'both' && proof.imageUrl && proof.linkUrl) {
                                        return (
                                          <div className="inline-flex items-center gap-1.5 flex-wrap">
                                            <button
                                              type="button"
                                              onClick={() => setPreviewProofModal({
                                                url: proof.imageUrl!,
                                                title: `Customer Confirmation Image - ${delivItem.customerName} (${delivItem.orderId})`
                                              })}
                                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                                              title="Click to view uploaded confirmation image"
                                            >
                                              <Eye className="w-3 h-3 text-emerald-400 shrink-0" />
                                              <span>View Image</span>
                                            </button>
                                            <a
                                              href={proof.linkUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              referrerPolicy="no-referrer"
                                              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                                              title={proof.linkUrl}
                                            >
                                              <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                                              <span>Open Link</span>
                                            </a>
                                          </div>
                                        );
                                      }

                                      // CASE 2: Image exists
                                      if (proof.proofType === 'image' && proof.imageUrl) {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewProofModal({
                                              url: proof.imageUrl!,
                                              title: `Customer Confirmation Image - ${delivItem.customerName} (${delivItem.orderId})`
                                            })}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                                            title="Click to view full confirmation image"
                                          >
                                            <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span>View Image</span>
                                          </button>
                                        );
                                      }

                                      // CASE 1: Link exists
                                      if (proof.proofType === 'link' && proof.linkUrl) {
                                        return (
                                          <a
                                            href={proof.linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            referrerPolicy="no-referrer"
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                                            title={proof.linkUrl}
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                            <span>View Customer Proof</span>
                                          </a>
                                        );
                                      }

                                      // CASE 3: Button/proof reference
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (proof.imageUrl) {
                                              setPreviewProofModal({
                                                url: proof.imageUrl,
                                                title: `Customer Confirmation Proof - ${delivItem.customerName} (${delivItem.orderId})`
                                              });
                                            } else if (proof.linkUrl) {
                                              window.open(proof.linkUrl, '_blank', 'noopener,noreferrer');
                                            }
                                          }}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/25 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                                          title="View Proof"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                          <span>View Proof</span>
                                        </button>
                                      );
                                    })()}
                                    {Boolean(delivItem.serverUploadFolderName) && (
                                      <div className="text-[9px] font-mono text-zinc-400 mt-1 flex items-center gap-1" title={`Server Folder: ${delivItem.serverUploadFolderName} (Event Date: ${delivItem.serverUploadEventDate || 'N/A'})`}>
                                        <span className="text-emerald-400">📁</span>
                                        <span className="truncate max-w-[120px]">{delivItem.serverUploadFolderName}</span>
                                      </div>
                                    )}
                                  </td>

                                  {/* Row Footage */}
                                  <td className="px-3.5 py-3 whitespace-nowrap">
                                    {effectiveRawFootageLink && (
                                      effectiveRawFootageLink.startsWith('http') || effectiveRawFootageLink.includes('drive.google.com') 
                                    ) ? (
                                      <a
                                        href={effectiveRawFootageLink.startsWith('http') ? effectiveRawFootageLink : `https://${effectiveRawFootageLink}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                                      >
                                        View Row Footage ↗
                                      </a>
                                    ) : (
                                      <span className="text-zinc-500 italic text-[11px]">Pending</span>
                                    )}
                                  </td>

                                  {/* 10. Action Dropdown */}
                                  <td className="px-3.5 py-3 text-center">
                                    <ActionMenuDropdown
                                      dropdownId={`action_dropdown_menu_${delivItem.assignmentId}`}
                                      isOpen={activeDropdownId === delivItem.assignmentId}
                                      onToggle={() => setActiveDropdownId(activeDropdownId === delivItem.assignmentId ? null : delivItem.assignmentId)}
                                      onClose={() => setActiveDropdownId(null)}
                                      buttonClassName="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center gap-1.5 shadow-md cursor-pointer mx-auto"
                                      buttonContent={
                                        <>
                                          <span>⚡ Action</span>
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </>
                                      }
                                    >
                                      {/* View Details */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          if (!expandedOrderIds.includes(grp.orderId)) {
                                            toggleOrderDetails(grp.orderId);
                                          }
                                          setSelectedProjectForDetail({ orderId: grp.orderId, eventId: grp.eventId });
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs text-zinc-200 hover:bg-purple-600/20 hover:text-purple-300 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Eye className="w-4 h-4 text-purple-400" /> View Details
                                      </button>

                                      {/* View Customer Confirmation Proof */}
                                      {(() => {
                                        const proof = parseCustomerProof(delivItem.assignmentObj, delivItem.prodObj, delivItem.orderObj);
                                        if (!proof.hasProof) return null;

                                        return (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              if (proof.proofType === 'link' && proof.linkUrl) {
                                                window.open(proof.linkUrl, '_blank', 'noopener,noreferrer');
                                              } else if (proof.imageUrl) {
                                                setPreviewProofModal({
                                                  url: proof.imageUrl,
                                                  title: `Customer Confirmation Proof - ${delivItem.customerName} (${delivItem.orderId})`
                                                });
                                              }
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-indigo-400 hover:bg-indigo-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-zinc-800/80"
                                          >
                                            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                            <span>{proof.proofType === 'link' ? 'View Customer Proof Link' : 'View Customer Proof Image'}</span>
                                          </button>
                                        );
                                      })()}

                                      {/* Locked State Notification */}
                                      {isDelivLocked ? (
                                        <div className="px-4 py-3 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold flex items-center gap-2 border-t border-zinc-800/80">
                                          <Lock className="w-3.5 h-3.5" /> Editing Completed
                                        </div>
                                      ) : (
                                        <>
                                          {/* Workflow Step 1: Editing Started */}
                                          {(delivItem.status === 'Assigned Editor' || delivItem.status === 'Editor Assigned' || delivItem.status === 'Assigned' || delivItem.status === 'Raw Footage Received') && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveDropdownId(null);
                                                setEditingStartedModal({ group: grp, actionItem: delivItem });
                                                setEditingStartedForm({
                                                  expected_delivery_date: delivItem.targetFinishDate || new Date().toISOString().split('T')[0],
                                                  estimated_completion_date: delivItem.targetFinishDate || new Date().toISOString().split('T')[0],
                                                  estimated_completion_time: '18:00',
                                                  selectedIds: [delivItem.assignmentId]
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
                                                setCustomerReviewModal({ group: grp, actionItem: delivItem });
                                                setCustomerReviewForm({ edited_drive_link: delivItem.editedDriveLink || '', selectedIds: [delivItem.assignmentId] });
                                              }}
                                              className="w-full text-left px-4 py-2.5 text-xs text-amber-400 hover:bg-amber-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                            >
                                              <UserCheck className="w-4 h-4" /> Upload Review
                                            </button>
                                          )}

                                          {/* Workflow Step 3: Re-send Customer Review & Upload Confirmation Proof */}
                                          {delivItem.status === 'Customer Review' && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveDropdownId(null);
                                                  setCustomerReviewModal({ group: grp, actionItem: delivItem });
                                                  setCustomerReviewForm({ edited_drive_link: delivItem.editedDriveLink || '', selectedIds: [delivItem.assignmentId] });
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-xs text-amber-400 hover:bg-amber-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                              >
                                                <RefreshCw className="w-4 h-4" /> Re-send Review Link
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveDropdownId(null);
                                                  openEditingCompletedModal(grp, delivItem);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-xs text-indigo-400 hover:bg-indigo-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                              >
                                                <CheckCircle2 className="w-4 h-4" /> Upload Confirmation Proof
                                              </button>
                                            </>
                                          )}

                                          {/* Workflow Step 4: Editing Completed */}
                                          {(delivItem.status === 'Editing Completed' || delivItem.status === 'Editing Complete' || delivItem.status === 'Completed') && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveDropdownId(null);
                                                  openEditingCompletedModal(grp, delivItem);
                                                }}
                                                className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                              >
                                                <Upload className="w-3.5 h-3.5 text-indigo-400" /> Update Proof
                                              </button>
                                              <div className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center gap-2 border-t border-zinc-800">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Editing Completed
                                              </div>
                                            </>
                                          )}
                                        </>
                                      )}
                                    </ActionMenuDropdown>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* MOBILE LAYOUT (Responsive list view, hidden on all screens) */}
                      <div className="hidden space-y-4">
                        {grp.deliverables.map((delivItem: any) => {
                          const delivBadge = getStatusBadge(delivItem.status);
                          const isDelivLocked = ['Business Owner Review', 'Project Completed', 'Completed', 'Order Closed', 'Closed'].includes(delivItem.status) || grp.orderObj?.current_stage === 'Business Owner Review';

                          const delivQty = delivItem.qty || getAssignedDeliverableQty(delivItem.assignmentObj, delivItem.targetEventObj, delivItem.leadObj, delivItem.orderObj, delivItem.prodObj, quotations);
                          const parsedDeliv = parseQtyAndText(delivItem.deliverable);
                          const delivName = parsedDeliv.text || delivItem.deliverable;
                          const effectiveRawFootageLink = delivItem.rawFootageLink || grp.rawFootageLink;

                          return (
                            <div key={delivItem.assignmentId} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                              {/* Order ID & Customer */}
                              <div className="flex items-start justify-between gap-2 pb-2 border-b border-zinc-800/60">
                                <div>
                                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Order ID</div>
                                  <span className="font-mono font-bold text-violet-400 text-xs">{delivItem.orderId}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Customer</div>
                                  <span className="font-bold text-white text-xs">{delivItem.customerName}</span>
                                </div>
                              </div>

                              {/* Event Name & Qty */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Event Name</div>
                                  <div className="text-sm font-bold text-white break-words">
                                    {delivItem.eventName || 'N/A'}
                                  </div>
                                  {delivItem.eventType && delivItem.eventType !== delivItem.eventName && delivItem.eventType !== 'N/A' && (
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[9px] font-bold">
                                      {delivItem.eventType}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="shrink-0 text-right">
                                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold mb-1">Qty</div>
                                  <span className="inline-block px-2.5 py-1 rounded bg-zinc-950 text-zinc-100 text-xs font-mono font-black border border-zinc-800">
                                    {delivQty}
                                  </span>
                                </div>
                              </div>

                              {/* Deliverable Name (Assigned Task) & Target Delivery Date */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1 min-w-0">
                                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Assigned Task</div>
                                  <div className="text-xs font-bold text-purple-300 break-words flex items-start gap-1.5">
                                    <span className="shrink-0 mt-0.5">🎯</span>
                                    <span className="flex-1">{delivName}</span>
                                  </div>
                                  <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">{delivItem.assignmentId}</span>
                                </div>

                                <div className="space-y-1 min-w-0 text-right">
                                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Target Delivery</div>
                                  <span className="font-mono text-xs text-zinc-200 font-bold block pt-0.5">
                                    {delivItem.targetFinishDate || grp.targetFinishDate || 'Not set'}
                                  </span>
                                </div>
                              </div>

                              {/* Raw Footage Received */}
                              <div className="space-y-1">
                                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Raw Footage Received</div>
                                <div>
                                  {effectiveRawFootageLink && (effectiveRawFootageLink.startsWith('http://') || effectiveRawFootageLink.startsWith('https://')) ? (
                                    <a
                                      href={effectiveRawFootageLink.startsWith('http') ? effectiveRawFootageLink : `https://${effectiveRawFootageLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer w-full text-center"
                                      title={effectiveRawFootageLink}
                                    >
                                      <FileVideo className="w-3.5 h-3.5 shrink-0" />
                                      <span>View Raw Footage</span>
                                      <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                                    </a>
                                  ) : effectiveRawFootageLink && effectiveRawFootageLink.trim() !== '' && effectiveRawFootageLink !== 'Pending' && effectiveRawFootageLink !== 'N/A' ? (
                                    <a
                                      href={effectiveRawFootageLink.startsWith('http') ? effectiveRawFootageLink : `https://${effectiveRawFootageLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer w-full text-center"
                                      title={effectiveRawFootageLink}
                                    >
                                      <FileVideo className="w-3.5 h-3.5 shrink-0" />
                                      <span>View Raw Footage</span>
                                      <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-950 text-zinc-500 border border-zinc-800 text-[11px] font-mono">
                                      <Clock className="w-3 h-3 text-zinc-600" />
                                      <span>Pending</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Status & Edited Drive Link */}
                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Current Status</div>
                                  <div className="pt-0.5">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${delivBadge.color}`}>
                                      {delivBadge.label}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1 min-w-0">
                                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Edited Drive Link</div>
                                  <div className="pt-0.5 min-w-0">
                                    {delivItem.editedDriveLink && (delivItem.editedDriveLink.startsWith('http://') || delivItem.editedDriveLink.startsWith('https://')) ? (
                                      <a
                                        href={delivItem.editedDriveLink.startsWith('http') ? delivItem.editedDriveLink : `https://${delivItem.editedDriveLink}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        referrerPolicy="no-referrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer w-full justify-center text-center"
                                        title={delivItem.editedDriveLink}
                                      >
                                        <LinkIcon className="w-3 h-3 shrink-0" />
                                        <span className="truncate">View Link</span>
                                      </a>
                                    ) : (
                                      <span className="text-zinc-600 italic text-[10px] block py-1">Pending Upload</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Customer Confirmation Proof Row */}
                              <div className="space-y-1 pt-1">
                                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Customer Proof</div>
                                <div className="pt-0.5">
                                  {(() => {
                                    const proof = parseCustomerProof(delivItem.assignmentObj, delivItem.prodObj, delivItem.orderObj);

                                    if (!proof.hasProof) {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-500 border border-zinc-800 text-xs font-mono">
                                          <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                          <span>Pending</span>
                                        </span>
                                      );
                                    }

                                    // CASE 4: Both Image & Link
                                    if (proof.proofType === 'both' && proof.imageUrl && proof.linkUrl) {
                                      return (
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <button
                                            type="button"
                                            onClick={() => setPreviewProofModal({
                                              url: proof.imageUrl!,
                                              title: `Customer Confirmation Image - ${delivItem.customerName} (${delivItem.orderId})`
                                            })}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>View Image</span>
                                          </button>
                                          <a
                                            href={proof.linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            referrerPolicy="no-referrer"
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Open Link</span>
                                          </a>
                                        </div>
                                      );
                                    }

                                    // CASE 2: Image exists
                                    if (proof.proofType === 'image' && proof.imageUrl) {
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => setPreviewProofModal({
                                            url: proof.imageUrl!,
                                            title: `Customer Confirmation Image - ${delivItem.customerName} (${delivItem.orderId})`
                                          })}
                                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer w-full text-center"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>View Image</span>
                                        </button>
                                      );
                                    }

                                    // CASE 1: Link exists
                                    if (proof.proofType === 'link' && proof.linkUrl) {
                                      return (
                                        <a
                                          href={proof.linkUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          referrerPolicy="no-referrer"
                                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer w-full text-center"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                          <span>View Customer Proof</span>
                                        </a>
                                      );
                                    }

                                    // CASE 3: Button/proof
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (proof.imageUrl) {
                                            setPreviewProofModal({
                                              url: proof.imageUrl,
                                              title: `Customer Confirmation Proof - ${delivItem.customerName} (${delivItem.orderId})`
                                            });
                                          } else if (proof.linkUrl) {
                                            window.open(proof.linkUrl, '_blank', 'noopener,noreferrer');
                                          }
                                        }}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/25 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer w-full text-center"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>View Proof</span>
                                      </button>
                                    );
                                  })()}
                                  {Boolean(delivItem.serverUploadFolderName) && (
                                    <div className="text-[10px] font-mono text-zinc-300 bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800 flex items-center justify-between gap-2 mt-1">
                                      <span className="flex items-center gap-1.5 truncate">
                                        <span className="text-emerald-400">📁</span>
                                        <span className="truncate">{delivItem.serverUploadFolderName}</span>
                                      </span>
                                      {delivItem.serverUploadEventDate && (
                                        <span className="text-[9px] text-zinc-500 shrink-0 font-bold">({delivItem.serverUploadEventDate})</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action Button */}
                              <div className="pt-2 border-t border-zinc-800/80">
                                <ActionMenuDropdown
                                  dropdownId={`action_dropdown_menu_mobile_${delivItem.assignmentId}`}
                                  isOpen={activeDropdownId === delivItem.assignmentId}
                                  onToggle={() => setActiveDropdownId(activeDropdownId === delivItem.assignmentId ? null : delivItem.assignmentId)}
                                  onClose={() => setActiveDropdownId(null)}
                                  buttonClassName="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                                  buttonContent={
                                    <>
                                      <span>⚡ Action Menu</span>
                                      <ChevronDown className="w-4 h-4" />
                                    </>
                                  }
                                >
                                  {/* View Details */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      if (!expandedOrderIds.includes(grp.orderId)) {
                                        toggleOrderDetails(grp.orderId);
                                      }
                                      setSelectedProjectForDetail({ orderId: grp.orderId, eventId: grp.eventId });
                                    }}
                                    className="w-full text-left px-4 py-3 text-xs text-zinc-200 hover:bg-purple-600/20 hover:text-purple-300 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4 text-purple-400" /> View Details
                                  </button>

                                  {/* View Customer Confirmation Proof */}
                                  {(() => {
                                    const proof = parseCustomerProof(delivItem.assignmentObj, delivItem.prodObj, delivItem.orderObj);
                                    if (!proof.hasProof) return null;

                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          if (proof.proofType === 'link' && proof.linkUrl) {
                                            window.open(proof.linkUrl, '_blank', 'noopener,noreferrer');
                                          } else if (proof.imageUrl) {
                                            setPreviewProofModal({
                                              url: proof.imageUrl,
                                              title: `Customer Confirmation Proof - ${delivItem.customerName} (${delivItem.orderId})`
                                            });
                                          }
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs text-indigo-400 hover:bg-indigo-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-zinc-800/80"
                                      >
                                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                        <span>{proof.proofType === 'link' ? 'View Customer Proof Link' : 'View Customer Proof Image'}</span>
                                      </button>
                                    );
                                  })()}

                                  {/* Locked State Notification */}
                                  {isDelivLocked ? (
                                    <div className="px-4 py-3 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold flex items-center gap-2 border-t border-zinc-800/80">
                                      <Lock className="w-3.5 h-3.5" /> Editing Completed
                                    </div>
                                  ) : (
                                    <>
                                      {/* Workflow Step 1: Editing Started */}
                                      {(delivItem.status === 'Assigned Editor' || delivItem.status === 'Editor Assigned' || delivItem.status === 'Assigned' || delivItem.status === 'Raw Footage Received') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownId(null);
                                            setEditingStartedModal({ group: grp, actionItem: delivItem });
                                            setEditingStartedForm({
                                              expected_delivery_date: delivItem.targetFinishDate || new Date().toISOString().split('T')[0],
                                              estimated_completion_date: delivItem.targetFinishDate || new Date().toISOString().split('T')[0],
                                              estimated_completion_time: '18:00',
                                              selectedIds: [delivItem.assignmentId]
                                            });
                                          }}
                                          className="w-full text-left px-4 py-3 text-xs text-sky-400 hover:bg-sky-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
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
                                            setCustomerReviewModal({ group: grp, actionItem: delivItem });
                                            setCustomerReviewForm({ edited_drive_link: delivItem.editedDriveLink || '', selectedIds: [delivItem.assignmentId] });
                                          }}
                                          className="w-full text-left px-4 py-3 text-xs text-amber-400 hover:bg-amber-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <UserCheck className="w-4 h-4" /> Upload Review
                                        </button>
                                      )}

                                      {/* Workflow Step 3: Re-send Customer Review & Upload Confirmation Proof */}
                                      {delivItem.status === 'Customer Review' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              setCustomerReviewModal({ group: grp, actionItem: delivItem });
                                              setCustomerReviewForm({ edited_drive_link: delivItem.editedDriveLink || '', selectedIds: [delivItem.assignmentId] });
                                            }}
                                            className="w-full text-left px-4 py-3 text-xs text-amber-400 hover:bg-amber-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                          >
                                            <RefreshCw className="w-4 h-4" /> Re-send Review Link
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              openEditingCompletedModal(grp, delivItem);
                                            }}
                                            className="w-full text-left px-4 py-3 text-xs text-indigo-400 hover:bg-indigo-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                          >
                                            <CheckCircle2 className="w-4 h-4" /> Upload Confirmation Proof
                                          </button>
                                        </>
                                      )}

                                      {/* Workflow Step 4: Editing Completed */}
                                      {(delivItem.status === 'Editing Completed' || delivItem.status === 'Editing Complete' || delivItem.status === 'Completed') && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              openEditingCompletedModal(grp, delivItem);
                                            }}
                                            className="w-full text-left px-4 py-3 text-xs text-zinc-300 hover:bg-zinc-800 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                          >
                                            <Upload className="w-3.5 h-3.5 text-indigo-400" /> Update Proof
                                          </button>
                                          <div className="px-4 py-3 bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center gap-2 border-t border-zinc-800">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Editing Completed
                                          </div>
                                        </>
                                      )}
                                    </>
                                  )}
                                </ActionMenuDropdown>
                              </div>
                            </div>
                          );
                        })}
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
          <div id="editing_started_modal_card" className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
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

            <div className="overflow-y-auto pr-2 custom-scrollbar">
              {renderOrderHeader(editingStartedModal.group)}
              
              <p className="text-xs text-zinc-400 mb-4">
                Please review the expected delivery date and enter your estimated completion date & time.
              </p>

              <form id="editing-started-form" onSubmit={handleEditingStartedSubmit} className="space-y-4">
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

                {renderDeliverableChecklist(
                  editingStartedModal.group,
                  editingStartedForm.selectedIds,
                  (ids) => setEditingStartedForm({ ...editingStartedForm, selectedIds: ids }),
                  ['Assigned Editor', 'Editor Assigned', 'Assigned', 'Raw Footage Received']
                )}
              </form>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => setEditingStartedModal(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                form="editing-started-form"
                type="submit"
                disabled={isSubmitting || editingStartedForm.selectedIds.length === 0}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-sky-600/20"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Start Editing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CUSTOMER REVIEW MODAL POPUP */}
      {/* ========================================================= */}
      {customerReviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div id="customer_review_modal_card" className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
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

            <div className="overflow-y-auto pr-2 custom-scrollbar">
              {renderOrderHeader(customerReviewModal.group)}

              <p className="text-xs text-zinc-400 mb-4">
                Provide the Edited Drive Link containing the preview videos/photos for customer review.
              </p>

              <form id="customer-review-form" onSubmit={handleCustomerReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                    Edited Drive Link <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={customerReviewForm.edited_drive_link}
                    onChange={(e) => setCustomerReviewForm({ ...customerReviewForm, edited_drive_link: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {renderDeliverableChecklist(
                  customerReviewModal.group,
                  customerReviewForm.selectedIds,
                  (ids) => setCustomerReviewForm({ ...customerReviewForm, selectedIds: ids }),
                  ['Editing Started', 'Customer Review']
                )}
              </form>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => setCustomerReviewModal(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                form="customer-review-form"
                type="submit"
                disabled={isSubmitting || customerReviewForm.selectedIds.length === 0}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-amber-600/20"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Generate WhatsApp Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2B. WHATSAPP REVIEW MESSAGE POPUP (AUTOMATIC SECOND POPUP) */}
      {/* ========================================================= */}
      {whatsappModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div id="whatsapp_modal_card" className="bg-zinc-900 border border-emerald-500/40 rounded-2xl w-full w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
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
          <div id="editing_completed_modal_card" className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
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

            <div className="overflow-y-auto pr-2 custom-scrollbar">
              {renderOrderHeader(editingCompletedModal.group)}

              <p className="text-xs text-zinc-400 mb-4">
                Upload customer confirmation image or proof confirming edits/revisions are completed. This will update status to <strong className="text-indigo-400">Editing Completed</strong>.
              </p>

              <form id="editing-completed-form" onSubmit={handleEditingCompletedSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                    Customer Confirmation Image / Proof <span className="text-rose-400">*</span>
                  </label>

                  {/* File Upload Field */}
                  <div className="bg-zinc-950 border border-dashed border-indigo-500/30 hover:border-indigo-500/60 rounded-xl p-3 text-center transition-colors">
                    <input
                      type="file"
                      id="customer_confirmation_file_input"
                      accept="image/*"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const compressed = await compressImage(e.target.files[0]);
                          setEditingCompletedForm({ ...editingCompletedForm, confirmation_proof: compressed });
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="customer_confirmation_file_input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1"
                    >
                      <Upload className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-300">
                        {editingCompletedForm.confirmation_proof ? 'Change Customer Proof Image' : 'Select Customer Proof Image'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">PNG, JPG, JPEG, WEBP (auto-compressed & uploaded to Supabase)</span>
                    </label>
                  </div>

                  <div className="text-[10px] text-zinc-500 text-center uppercase font-mono my-2">- OR ENTER DIRECT IMAGE URL / DRIVE LINK -</div>

                  <input
                    type="text"
                    placeholder="https://..."
                    value={editingCompletedForm.confirmation_proof.startsWith('data:') ? 'Image attached from file upload' : editingCompletedForm.confirmation_proof}
                    onChange={(e) => setEditingCompletedForm({ ...editingCompletedForm, confirmation_proof: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  
                  {/* Selected Image Thumbnail Preview */}
                  {editingCompletedForm.confirmation_proof && (
                    <div className="mt-3 p-3 bg-zinc-950 border border-indigo-500/20 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-indigo-400 font-mono font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Proof Attached
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingCompletedForm({ ...editingCompletedForm, confirmation_proof: '' })}
                          className="text-zinc-500 hover:text-rose-400 text-[11px] font-normal cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="relative rounded-lg overflow-hidden border border-zinc-800 max-h-48 bg-zinc-900 flex items-center justify-center">
                        <img
                          src={resolveStorageUrl(editingCompletedForm.confirmation_proof) || editingCompletedForm.confirmation_proof}
                          alt="Customer Confirmation Proof Preview"
                          referrerPolicy="no-referrer"
                          className="max-h-48 max-w-full object-contain rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Server Upload Confirmation Section */}
                {Boolean(editingCompletedForm.confirmation_proof) && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                    <div className="text-[11px] font-mono font-bold text-zinc-300 uppercase flex items-center justify-between">
                      <span>Server Upload Confirmation</span>
                      <span className="text-[10px] text-rose-400 font-normal">* Required</span>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer select-none bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <input
                        type="checkbox"
                        id="server_upload_confirmed_checkbox"
                        checked={Boolean(editingCompletedForm.server_upload_confirmed)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditingCompletedForm(prev => ({
                            ...prev,
                            server_upload_confirmed: checked,
                            server_upload_event_date: prev.server_upload_event_date || (checked ? (editingCompletedModal.actionItem?.eventDate || editingCompletedModal.group?.eventDate || '') : prev.server_upload_event_date),
                            server_upload_folder_name: prev.server_upload_folder_name || (checked ? (editingCompletedModal.actionItem?.serverUploadFolderName || `${editingCompletedModal.group?.customerName || 'Client'} ${editingCompletedModal.group?.eventName || 'Event'} Edited`) : prev.server_upload_folder_name)
                          }));
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white block">
                          Edited Folder is uploaded in Server
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          Must manually tick to confirm that the edited folder has been uploaded to the server.
                        </span>
                      </div>
                    </label>

                    {editingCompletedForm.server_upload_confirmed && (
                      <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                        <div>
                          <label className="block text-[11px] font-mono font-bold text-zinc-300 uppercase mb-1">
                            Event Date <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            id="server_upload_event_date_input"
                            placeholder="e.g., 21 Aug 2026"
                            value={editingCompletedForm.server_upload_event_date || ''}
                            onChange={(e) => setEditingCompletedForm(prev => ({ ...prev, server_upload_event_date: e.target.value }))}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono font-bold text-zinc-300 uppercase mb-1">
                            Folder Name <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            id="server_upload_folder_name_input"
                            placeholder="e.g., Rahul Wedding Edited"
                            value={editingCompletedForm.server_upload_folder_name || ''}
                            onChange={(e) => setEditingCompletedForm(prev => ({ ...prev, server_upload_folder_name: e.target.value }))}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {renderDeliverableChecklist(
                  editingCompletedModal.group,
                  editingCompletedForm.selectedIds,
                  (ids) => setEditingCompletedForm({ ...editingCompletedForm, selectedIds: ids }),
                  ['Customer Review', 'Client Review', 'Client Review Sent', 'Revision Required', 'Revision In Progress']
                )}
              </form>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => setEditingCompletedModal(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                form="editing-completed-form"
                type="submit"
                disabled={
                  isSubmitting ||
                  !editingCompletedForm.confirmation_proof.trim() ||
                  !editingCompletedForm.server_upload_confirmed ||
                  !editingCompletedForm.server_upload_event_date?.trim() ||
                  !editingCompletedForm.server_upload_folder_name?.trim() ||
                  editingCompletedForm.selectedIds.length === 0
                }
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                {isSubmitting ? 'Uploading Proof & Saving...' : 'Submit & Mark Editing Completed 🎯'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CUSTOMER PROOF IMAGE ZOOM MODAL */}
      {/* ========================================================= */}
      {previewProofModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white truncate">{previewProofModal.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewProofModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full View</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewProofModal(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-black/40 min-h-[300px]">
              <img
                src={previewProofModal.url}
                alt="Customer Confirmation Proof"
                referrerPolicy="no-referrer"
                className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl border border-zinc-800"
              />
            </div>

            <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-mono text-[11px] truncate max-w-md">{previewProofModal.url}</span>
              <button
                type="button"
                onClick={() => setPreviewProofModal(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT DETAIL MODAL */}
      {selectedProjectForDetail && (
        <ProjectDetailModal
          isOpen={!!selectedProjectForDetail}
          onClose={() => setSelectedProjectForDetail(null)}
          orderId={typeof selectedProjectForDetail === 'string' ? selectedProjectForDetail : selectedProjectForDetail.orderId}
          eventId={typeof selectedProjectForDetail === 'object' && selectedProjectForDetail ? selectedProjectForDetail.eventId : undefined}
        />
      )}

      {/* Note Popup Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
              <h3 className="text-white font-bold text-sm">Note</h3>
              <button onClick={() => setSelectedNote(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-zinc-300 text-sm whitespace-pre-wrap">
              {selectedNote}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
