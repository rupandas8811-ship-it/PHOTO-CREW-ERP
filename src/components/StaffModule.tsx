import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from './RoleContext';
import { MapPin, Calendar, Clock, Briefcase, Camera, User, Phone, MessageSquare, Eye, CheckCircle, AlertCircle, Upload, X, Play, ShieldCheck, ChevronRight, ChevronLeft, Video } from 'lucide-react';
import { Lead, Order, Operation, StaffAssignment, EquipmentHandover } from '../types';
import { supabaseClient } from '../supabaseClient';
import { getCalculatedOrderStage, getStageRank, getAllStaffStatusesForOrder } from '../utils/orderStageCalculator';
import { ViewDetailsModal } from './operations/ViewDetailsModal';

const StaffActionDropdown: React.FC<{
  booking: any;
  hasEquipmentReceived: boolean;
  hasEventStart: boolean;
  hasEquipmentHandover: boolean;
  isCompleted: boolean;
  onViewDetails: () => void;
  onOpenPhotoModal: (step: 'Equipment Received' | 'Event Start' | 'Equipment Handover' | 'Event Complete') => void;
}> = ({
  booking,
  hasEquipmentReceived,
  hasEventStart,
  hasEquipmentHandover,
  isCompleted,
  onViewDetails,
  onOpenPhotoModal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    openUpward: boolean;
    maxHeight: number;
    width: number;
  } | null>(null);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const dropdownWidth = Math.min(220, viewportWidth - 24);
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

      const calculatedLeft = Math.min(
        Math.max(12, rect.right - dropdownWidth),
        viewportWidth - dropdownWidth - 12
      );

      const calculatedTop = openUpward ? rect.top - 6 : rect.bottom + 6;
      const maxHeight = openUpward
        ? Math.min(280, rect.top - 16)
        : Math.min(280, viewportHeight - rect.bottom - 16);

      setMenuPosition({
        top: calculatedTop,
        left: calculatedLeft,
        openUpward,
        maxHeight,
        width: dropdownWidth,
      });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !target.closest(`.staff-action-dropdown-menu-${booking.orderId || booking.key}`)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest(`.staff-action-dropdown-menu-${booking.orderId || booking.key}`)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, booking]);

  // Determine current status string
  let currentStatus = 'Assigned Crew';
  if (booking.taskStatus === 'Footage Handover' || booking.taskStatus === 'Verified Footage') {
    currentStatus = 'Footage Handover';
  } else if (booking.taskStatus === 'Event Ended' || booking.taskStatus === 'Event Completed' || isCompleted) {
    currentStatus = 'Event Ended';
  } else if (booking.taskStatus === 'Event Started' || hasEventStart) {
    currentStatus = 'Event Started';
  } else {
    currentStatus = 'Assigned Crew';
  }

  const actionOptions: { label: string; onClick: () => void }[] = [];

  // 1. View Details (always visible)
  actionOptions.push({
    label: 'View Details',
    onClick: () => {
      onViewDetails();
      setIsOpen(false);
    }
  });

  // 2. Event Started (show only when current status is Assigned Crew)
  if (currentStatus === 'Assigned Crew') {
    actionOptions.push({
      label: 'Event Started',
      onClick: () => {
        onOpenPhotoModal('Event Start');
        setIsOpen(false);
      }
    });
  }

  // 3. Event End (show only when current status is Event Started)
  if (currentStatus === 'Event Started') {
    actionOptions.push({
      label: 'Event End',
      onClick: () => {
        onOpenPhotoModal('Event Complete');
        setIsOpen(false);
      }
    });
  }

  // 4. Footage Handover (show only when current status is Event Ended)
  if (currentStatus === 'Event Ended') {
    const hasEquipment = booking.equipmentItems && booking.equipmentItems.length > 0;
    actionOptions.push({
      label: hasEquipment ? 'Footage Handover' : 'Raw Footage Upload',
      onClick: () => {
        onOpenPhotoModal('Equipment Handover');
        setIsOpen(false);
      }
    });
  }

  return (
    <div className="inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold border border-indigo-500/30 shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5 outline-none"
      >
        <span>🎯 Action</span>
        <span className={`text-[9px] text-indigo-200 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}>▼</span>
      </button>

      {isOpen && menuPosition && createPortal(
        <div 
          className={`fixed z-[9999] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-2xl rounded-2xl p-2 text-left animate-in fade-in zoom-in-95 duration-100 flex flex-col overflow-hidden staff-action-dropdown-menu-${booking.orderId || booking.key}`}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
            maxHeight: `${menuPosition.maxHeight}px`,
            transform: menuPosition.openUpward ? 'translateY(-100%)' : 'none',
          }}
        >
          <div className="px-2.5 py-1.5 border-b border-zinc-800 mb-1 flex items-center justify-between shrink-0">
            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-extrabold flex items-center gap-1">
              <span>🎯</span> Available Actions
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white text-xs p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto space-y-1 pr-0.5" style={{ maxHeight: `${menuPosition.maxHeight - 40}px` }}>
            {actionOptions.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={opt.onClick}
                className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-lg transition-all cursor-pointer font-sans font-semibold flex items-center justify-start gap-2"
              >
                <span className="text-indigo-400 text-xs shrink-0">⚡</span>
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
            {actionOptions.length === 0 && (
              <div className="px-3 py-2 text-xs text-zinc-500 italic font-mono text-center">
                No actions available
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Helper to normalize various date string formats to YYYY-MM-DD
const normalizeDateStr = (rawDateStr: string): string => {
  if (!rawDateStr || rawDateStr === 'N/A') return '';
  const trimmed = rawDateStr.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return trimmed.replace(/\//g, '-');
  }

  const dmYMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmYMatch) {
    const day = dmYMatch[1].padStart(2, '0');
    const month = dmYMatch[2].padStart(2, '0');
    const year = dmYMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
};

// Utility for image compression before storage
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
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
          resolve(canvas.toDataURL('image/jpeg', 0.7));
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

interface EquipmentProofItem {
  equipmentName: string;
  assetId: string;
  photoUrl: string;
  capturedAt: string;
}

interface EventProofData {
  startProofs?: EquipmentProofItem[];
  completeProofs?: EquipmentProofItem[];
}

export const StaffModule: React.FC = () => {
  const { currentUser, staff, leads, orders, operations, staffAssignments, equipment, leadEquipmentHistory, addLeadEquipmentHistory, refreshData, updateLead, pushInsert, pushUpdate } = useRole();

  // Resolve staff member
  const staffMember = staff.find(s => 
    (s.mobile && s.mobile === currentUser?.mobile) || 
    (s.email && s.email.toLowerCase() === currentUser?.email?.toLowerCase())
  );
  const staffName = staffMember?.name || currentUser?.name || 'Staff';
  const staffMobile = staffMember?.mobile || currentUser?.mobile || '';

  // Local state for assignments
  const [activeBookings, setActiveBookings] = useState<any[]>([]);

  // Local storage cache for individual staff task statuses & photo proofs
  const [staffStatuses, setStaffStatuses] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('staff_event_statuses_v2');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [staffProofs, setStaffProofs] = useState<Record<string, EventProofData>>(() => {
    try {
      const saved = localStorage.getItem('staff_equipment_proofs_v2');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Load saved statuses & verification photo proofs from Supabase (leadEquipmentHistory & staffAssignments)
  useEffect(() => {
    if (!staffName) return;

    const newStatuses: Record<string, string> = {};
    const newProofs: Record<string, EventProofData> = {};

    // 1. Restore staff task status from staffAssignments
    if (staffAssignments && staffAssignments.length > 0) {
      staffAssignments.forEach(sa => {
        if (sa.staff_name && sa.staff_name.toLowerCase() === staffName.toLowerCase()) {
          const statusVal = (sa as any).task_status || sa.assignment_status;
          if (statusVal && statusVal !== 'Assigned') {
            const key = `${sa.order_id}_gen_${staffName.toLowerCase()}`;
            newStatuses[key] = statusVal;
          }
        }
      });
    }

    // 2. Restore equipment verification photo proofs and precise task statuses from leadEquipmentHistory
    if (leadEquipmentHistory && leadEquipmentHistory.length > 0) {
      // Sort history to process older ones first, then newer ones can override status
      const sortedHistory = [...leadEquipmentHistory].sort((a, b) => 
        new Date(a.returned_at || 0).getTime() - new Date(b.returned_at || 0).getTime()
      );
      
      sortedHistory.forEach(leh => {
        let parsed: any = {};
        if (leh.remarks) {
          try {
            parsed = typeof leh.remarks === 'string' ? JSON.parse(leh.remarks) : leh.remarks;
          } catch (e) {}
        }

        const recordStaff = (leh.returned_by || parsed.staff_name || parsed.uploaded_by || '').trim().toLowerCase();
        const currentStaffNorm = staffName.trim().toLowerCase();
        const recordStaffId = parsed.staff_id || '';
        const currentStaffId = staffMember?.id || currentUser?.id || '';

        const isForCurrentStaff = (recordStaff && currentStaffNorm && recordStaff === currentStaffNorm) ||
                                  (recordStaffId && currentStaffId && recordStaffId === currentStaffId);

        if (isForCurrentStaff) {
          let eventId = 'gen';
          let photoUrl = (leh as any).photo_url || '';
          let assetId = (leh as any).asset_id || '';
          let parsedStatus = '';
          
          if (parsed.photo_url) photoUrl = parsed.photo_url;
          if (parsed.asset_id) assetId = parsed.asset_id;
          if (parsed.event_id) eventId = parsed.event_id;
          if (parsed.current_status) parsedStatus = parsed.current_status;
          
          const key = `${leh.order_id}_${eventId}_${staffName.trim().toLowerCase()}`;

          // Status restoration: If parsedStatus exists, override the status for this specific event key
          if (parsedStatus && parsedStatus !== 'Assigned Crew') {
             newStatuses[key] = parsedStatus;
          } else if (leh.equipment_status === 'Event Started') {
             newStatuses[key] = 'Event Started';
          } else if (leh.equipment_status === 'Event Complete') {
             newStatuses[key] = 'Event Ended';
          } else if (leh.equipment_status === 'Equipment Handover') {
             newStatuses[key] = 'Footage Handover';
          }

          if (photoUrl) {
            const stage = leh.equipment_status;
            const proofField = stage === 'Equipment Received' ? 'equipmentReceivedProofs' :
                               stage === 'Event Start' || stage === 'Event Started' ? 'eventStartProofs' :
                               stage === 'Equipment Handover' ? 'equipmentHandoverProofs' :
                               stage === 'Event Complete' || stage === 'Event Ended' ? 'completeProofs' : 'startProofs';
            
            const existing = newProofs[key] || {};
            const proofArr = existing[proofField] ? [...existing[proofField]!] : [];
            const proofItem: EquipmentProofItem = {
              equipmentName: leh.equipment_name,
              assetId: assetId || `EQ-${leh.equipment_name}`,
              photoUrl: photoUrl,
              capturedAt: leh.returned_at || new Date().toISOString()
            };

            // Only add if not already present (using equipmentName to dedup)
            if (!proofArr.some(p => p.equipmentName === proofItem.equipmentName)) {
              proofArr.push(proofItem);
            }

            newProofs[key] = {
              ...existing,
              [proofField]: proofArr
            };
          }
        }
      });
    }

    // Merge with local storage state to preserve anything that hasn't been synced (or override with DB state)
    setStaffStatuses(prev => {
       const merged = { ...prev, ...newStatuses };
       localStorage.setItem('staff_event_statuses_v2', JSON.stringify(merged));
       return merged;
    });
    setStaffProofs(prev => {
       const freshForStaff: Record<string, EventProofData> = {};
       // Strictly filter previous local state so proofs from other staff members never bleed into this session
       const suffix = `_${staffName.trim().toLowerCase()}`;
       for (const [k, v] of Object.entries(prev)) {
          if (k.toLowerCase().endsWith(suffix)) {
             freshForStaff[k] = v;
          }
       }

       for (const key of Object.keys(newProofs)) {
          freshForStaff[key] = {
             ...(freshForStaff[key] || {}),
             ...newProofs[key]
          };
       }
       localStorage.setItem('staff_equipment_proofs_v2', JSON.stringify(freshForStaff));
       return freshForStaff;
    });

  }, [leadEquipmentHistory, staffAssignments, staffName]);

  // Modal states
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any | null>(null);
  const [photoModalData, setPhotoModalData] = useState<{
    booking: any;
    stage: 'Equipment Received' | 'Event Start' | 'Equipment Handover' | 'Event Complete';
  } | null>(null);

  // Photos attached in modal & raw footage link
  const [modalPhotos, setModalPhotos] = useState<Record<string, string>>({});
  const [modalRawFootageLink, setModalRawFootageLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Build assigned bookings list for logged in staff
  useEffect(() => {
    if (!staffName) return;

    const bookings: any[] = [];

    const finishedStatuses = [
      'footage handover', 'verified footage', 'footage handover verified',
      'raw footage received', 'editor assigned', 'assigned editor',
      'editing started', 'editing in progress', 'internal qc review',
      'client review sent', 'internal review', 'client review',
      'revision required', 'revision in progress', 'revision',
      'final approval', 'project delivered', 'project closed',
      'completed', 'closed', 'order closed', 'delivered'
    ];

    const getVerificationStatus = (orderId: string, eventId: string) => {
      const rfVerification = leadEquipmentHistory?.find(h => 
        h.order_id === orderId && 
        h.equipment_name === 'Raw Footage Verification' && 
        (h.returned_by || '').trim().toLowerCase() === staffName.toLowerCase() &&
        (!eventId || eventId === 'gen' || (() => { try { return JSON.parse(h.remarks || '{}').event_id === eventId; } catch(e) { return false; } })())
      );
      return rfVerification?.equipment_status || 'Pending Verification';
    };

    (leads || []).forEach((lead) => {
      const order = (orders || []).find(o => o.lead_id === lead.lead_id);
      const op = operations.find(o => o.order_id === (order?.order_id || lead.lead_id));

      const orderId = order?.order_id || `OR-${lead.lead_id.replace(/^LD-?/, '')}`;

      let hasEventAssignment = false;

      if (lead.events && lead.events.length > 0) {
        lead.events.forEach((ev: any) => {
          const assignedNames = ev.assigned_staff_names 
            ? ev.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase()) 
            : [];
            
          if (assignedNames.includes(staffName.toLowerCase())) {
            hasEventAssignment = true;

            const staffIdx = assignedNames.indexOf(staffName.toLowerCase());

            // Extract ONLY equipment assigned to this staff member
            let assignedEqItems: { name: string; assetId: string }[] = [];
            const mobilesRaw = ev.assigned_staff_mobiles || '';

            if (mobilesRaw.includes(' || EQUIPMENT: JSON:')) {
              try {
                const parts = mobilesRaw.split(' || EQUIPMENT: JSON:');
                const staffEqs = JSON.parse(parts[1]);
                if (staffEqs[staffIdx] && Array.isArray(staffEqs[staffIdx]) && staffEqs[staffIdx].length > 0) {
                  assignedEqItems = staffEqs[staffIdx].map((eqStr: string) => {
                    const match = equipment.find(e => 
                      e.equipment_name.toLowerCase() === eqStr.toLowerCase() || 
                      e.model.toLowerCase() === eqStr.toLowerCase()
                    );
                    return {
                      name: eqStr,
                      assetId: match?.equipment_id || match?.serial_number || `EQ-ASSET-${Math.floor(1000 + Math.random() * 9000)}`
                    };
                  });
                }
              } catch(e) {}
            } else if (mobilesRaw.includes(' || EQUIPMENT: ')) {
              const parts = mobilesRaw.split(' || EQUIPMENT: ');
              const eqList = parts[1] ? parts[1].split(',').map((s: string) => s.trim()) : [];
              assignedEqItems = eqList.map(eqStr => {
                const match = equipment.find(e => 
                  e.equipment_name.toLowerCase() === eqStr.toLowerCase() || 
                  e.model.toLowerCase() === eqStr.toLowerCase()
                );
                return {
                  name: eqStr,
                  assetId: match?.equipment_id || match?.serial_number || `EQ-ASSET-${Math.floor(1000 + Math.random() * 9000)}`
                };
              });
            } else if (op?.equipment_kit) {
              const eqList = op.equipment_kit.split(',').map((s: string) => s.trim());
              assignedEqItems = eqList.map(eqStr => {
                const match = equipment.find(e => 
                  e.equipment_name.toLowerCase() === eqStr.toLowerCase() || 
                  e.model.toLowerCase() === eqStr.toLowerCase()
                );
                return {
                  name: eqStr,
                  assetId: match?.equipment_id || match?.serial_number || `EQ-ASSET-${Math.floor(1000 + Math.random() * 9000)}`
                };
              });
            }

            if (assignedEqItems.length === 0) {
              assignedEqItems = [{ name: 'Standard Event Camera Kit', assetId: 'EQ-KIT-STD' }];
            }

            // Role
            const staffObj = staff?.find(s => s.name.toLowerCase() === staffName.toLowerCase());
            let assignedRole = staffObj ? staffObj.role : 'Crew Member';
            const sa = staffAssignments?.find(s => s.order_id === orderId && s.staff_name.toLowerCase() === staffName.toLowerCase());
            if (sa?.staff_role) {
              assignedRole = sa.staff_role;
            }

            const uniqueKey = `${orderId}_${ev.id || 'ev'}_${staffName.toLowerCase()}`;
            // Only use global or order-level status if it hasn't progressed to an active state.
            // If it has progressed globally but this staff member has no specific event history, they should start at Assigned Crew.
            const fallbackStatus = op?.event_status || 'Assigned Crew';
            const isGlobalAdvanced = ['event started', 'event start', 'event ended', 'event complete', 'footage handover', 'verified footage'].includes(fallbackStatus.toLowerCase());
            let currentStaffStatus = staffStatuses[uniqueKey];
            if (!currentStaffStatus) {
                const saStatus = (sa as any)?.task_status;
                const isSaAdvanced = saStatus && ['event started', 'event start', 'event ended', 'event complete', 'footage handover', 'verified footage'].includes(saStatus.toLowerCase());
                currentStaffStatus = (!isSaAdvanced && saStatus) ? saStatus : (isGlobalAdvanced ? 'Assigned Crew' : fallbackStatus);
            }

            // Only remove from staff active bookings AFTER Footage Handover has been submitted
            if (!finishedStatuses.includes((currentStaffStatus || '').trim().toLowerCase())) {
              bookings.push({
                key: uniqueKey,
                orderId: orderId,
                leadId: lead.lead_id,
                eventId: ev.id || 'ev',
                eventName: ev.event_type === 'Other' ? (ev.event_name || 'Other Event') : (ev.event_type || 'N/A'),
                customerName: lead.customer_name || order?.customer_name || 'N/A',
                customerMobile: lead.mobile || order?.mobile || 'N/A',
                customerWhatsapp: lead.whatsapp_number || lead.mobile || order?.whatsapp_number || order?.mobile || 'N/A',
                customerAddress: lead.address || lead.client_residence_address || lead.city || 'N/A',
                shootType: ev.event_shoot_type || lead.shoot_type || 'N/A',
                assignedRole: assignedRole,
                eventDate: ev.event_date || lead.event_date || 'N/A',
                eventStartTime: ev.event_start_time || lead.event_time || 'N/A',
                eventEndTime: ev.event_end_time || 'N/A',
                reportingDate: ev.reporting_date || ev.event_date || lead.Reporting_date || lead.event_date || 'N/A',
                reportingTime: ev.reporting_time || lead.reporting_time || 'N/A',
                venue: ev.event_location || lead.event_location || 'N/A',
                googleMapsLink: ev.google_maps_link || lead.google_maps_link || 'N/A',
                guestPax: ev.guest_pax || (lead as any).guest_pax || 'N/A',
                equipmentItems: assignedEqItems,
                taskStatus: currentStaffStatus,
                rawFootageVerificationStatus: getVerificationStatus(orderId, ev.id || 'ev'),
                rawFootageLink: (sa as any)?.raw_footage_link || '',
                coordinator: op?.operations_coordinator || 'Unassigned'
              });
            }
          }
        });
      }

      if (!hasEventAssignment) {
        const isAssignedInOp = op && (
          op.photographer_assigned?.toLowerCase() === staffName.toLowerCase() ||
          op.videographer_assigned?.toLowerCase() === staffName.toLowerCase() ||
          op.drone_operator_assigned?.toLowerCase() === staffName.toLowerCase() ||
          op.assistant_assigned?.toLowerCase() === staffName.toLowerCase()
        );
        const hasStaffAssignment = staffAssignments?.some(sa => 
          sa.order_id === orderId && 
          sa.staff_name.toLowerCase() === staffName.toLowerCase() &&
          sa.assignment_status !== 'Cancelled'
        );

        if (isAssignedInOp || hasStaffAssignment) {
          let assignedRole = 'Crew Member';
          if (op) {
            if (op.photographer_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Photographer';
            else if (op.videographer_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Videographer';
            else if (op.drone_operator_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Drone Operator';
            else if (op.assistant_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Assistant';
          }
          const sa = staffAssignments?.find(s => s.order_id === orderId && s.staff_name.toLowerCase() === staffName.toLowerCase());
          if (sa?.staff_role) {
            assignedRole = sa.staff_role;
          }

          let assignedEqItems: { name: string; assetId: string }[] = [];
          if (op?.equipment_kit) {
            const eqList = op.equipment_kit.split(',').map((s: string) => s.trim());
            assignedEqItems = eqList.map(eqStr => {
              const match = equipment.find(e => 
                e.equipment_name.toLowerCase() === eqStr.toLowerCase() || 
                e.model.toLowerCase() === eqStr.toLowerCase()
              );
              return {
                name: eqStr,
                assetId: match?.equipment_id || match?.serial_number || `EQ-ASSET-${Math.floor(1000 + Math.random() * 9000)}`
              };
            });
          }
          if (assignedEqItems.length === 0) {
            assignedEqItems = [{ name: 'Standard Event Camera Kit', assetId: 'EQ-KIT-STD' }];
          }

          const uniqueKey = `${orderId}_gen_${staffName.toLowerCase()}`;
          const fallbackStatus = op?.event_status || 'Assigned Crew';
          const isGlobalAdvanced = ['event started', 'event start', 'event ended', 'event complete', 'footage handover', 'verified footage'].includes(fallbackStatus.toLowerCase());
          let currentStaffStatus = staffStatuses[uniqueKey];
          if (!currentStaffStatus) {
              const saStatus = (sa as any)?.task_status;
              const isSaAdvanced = saStatus && ['event started', 'event start', 'event ended', 'event complete', 'footage handover', 'verified footage'].includes(saStatus.toLowerCase());
              currentStaffStatus = (!isSaAdvanced && saStatus) ? saStatus : (isGlobalAdvanced ? 'Assigned Crew' : fallbackStatus);
          }

          // Only remove from staff active bookings AFTER Footage Handover has been submitted
          if (!finishedStatuses.includes((currentStaffStatus || '').trim().toLowerCase())) {
            bookings.push({
              key: uniqueKey,
              orderId: orderId,
              leadId: lead.lead_id,
              eventId: 'gen',
              eventName: lead.event_name || lead.shoot_type || 'General Event',
              customerName: lead.customer_name || order?.customer_name || 'N/A',
              customerMobile: lead.mobile || order?.mobile || 'N/A',
              customerWhatsapp: lead.whatsapp_number || lead.mobile || order?.whatsapp_number || order?.mobile || 'N/A',
              customerAddress: lead.address || lead.client_residence_address || lead.city || 'N/A',
              shootType: lead.shoot_type || 'N/A',
              assignedRole: assignedRole,
              eventDate: lead.event_date || 'N/A',
              eventStartTime: lead.event_time || 'N/A',
              eventEndTime: 'N/A',
              reportingDate: lead.Reporting_date || lead.event_date || 'N/A',
              reportingTime: lead.reporting_time || 'N/A',
              venue: lead.event_location || 'N/A',
              googleMapsLink: lead.google_maps_link || 'N/A',
              guestPax: (lead as any).guest_pax || 'N/A',
              equipmentItems: assignedEqItems,
              taskStatus: currentStaffStatus,
              rawFootageVerificationStatus: getVerificationStatus(orderId, 'gen'),
              rawFootageLink: (sa as any)?.raw_footage_link || '',
              coordinator: op?.operations_coordinator || 'Unassigned'
            });
          }
        }
      }
    });

    setActiveBookings(bookings);
  }, [leads, orders, operations, staffAssignments, staffName, staff, equipment, staffStatuses]);

  // Helper to safely upload base64 images without throwing SyntaxError on HTML server error responses
  const safeUploadImage = async (base64Url: string, fileName: string): Promise<string> => {
    if (!base64Url || !base64Url.startsWith('data:image')) {
      return base64Url;
    }
    
    try {
      // 1. Try server API first (useful for bypassing CORS/RLS if configured)
      try {
        const uploadRes = await fetch('/api/upload-proof', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: base64Url, fileName, contentType: 'image/jpeg' })
        });
        
        if (uploadRes.ok) {
          const text = await uploadRes.text();
          try {
            const uploadData = JSON.parse(text);
            if (uploadData && uploadData.success && uploadData.publicUrl) {
              return uploadData.publicUrl;
            }
          } catch (e) {
            console.warn("[UploadProof] Server returned non-JSON response, falling back to client-side upload.");
          }
        } else {
          console.warn(`[UploadProof] Server returned ${uploadRes.status}, falling back to client-side upload.`);
        }
      } catch (proxyErr) {
        console.warn("[UploadProof] Proxy failed, falling back to client-side Supabase upload", proxyErr);
      }
      
      // 2. Fallback to client-side direct upload
      console.log("[UploadProof] Using client-side Supabase upload as fallback...");
      
      // Convert base64 to Blob
      const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: 'image/jpeg' });

      // Upload directly to Supabase storage
      if (!supabaseClient) throw new Error("Supabase client is not initialized.");
      
      const { data, error } = await supabaseClient.storage
        .from('img')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        throw new Error("Supabase Storage Error: " + (error.message || JSON.stringify(error)));
      }

      // Get public URL
      const { data: publicData } = supabaseClient.storage
        .from('img')
        .getPublicUrl(fileName);

      if (!publicData || !publicData.publicUrl) {
        throw new Error("Failed to generate public URL for uploaded proof.");
      }

      return publicData.publicUrl;

    } catch (err: any) {
      console.error("[UploadProof] Upload exception:", err);
      throw new Error(err.message || String(err));
    }
  };

  // Open Equipment Photo Verification Modal
  const openPhotoModal = (booking: any, stage: 'Equipment Received' | 'Event Start' | 'Equipment Handover' | 'Event Complete') => {
    const existingPhotos: Record<string, string> = {};

    const relevantHistory = (leadEquipmentHistory || []).filter(h => {
      // 1. Order ID / Lead ID match
      const matchOrder = (booking.orderId && h.order_id === booking.orderId) ||
                         (booking.leadId && h.lead_id === booking.leadId);
      if (!matchOrder) return false;

      // 2. Parse remarks JSON
      let parsed: any = {};
      if (h.remarks && typeof h.remarks === 'string') {
        try { parsed = JSON.parse(h.remarks); } catch (e) {}
      } else if (h.remarks && typeof h.remarks === 'object') {
        parsed = h.remarks;
      }

      // 3. Match Assigned Staff ID / Staff Name (MUST belong to logged-in staff)
      const recordStaff = (h.returned_by || parsed.staff_name || parsed.uploaded_by || '').trim().toLowerCase();
      const currentStaffNorm = (staffName || '').trim().toLowerCase();
      const recordStaffId = parsed.staff_id || '';
      const currentStaffId = staffMember?.id || currentUser?.id || '';

      const staffMatches = (recordStaff && currentStaffNorm && recordStaff === currentStaffNorm) ||
                           (recordStaffId && currentStaffId && recordStaffId === currentStaffId);

      if (!staffMatches) return false;

      // 4. Match Event ID if present and not 'gen'
      const bookingEventId = booking.eventId;
      const historyEventId = parsed.event_id;
      if (bookingEventId && historyEventId && bookingEventId !== 'gen' && historyEventId !== 'gen' && bookingEventId !== historyEventId) {
        return false;
      }

      return true;
    });

    for (const h of relevantHistory) {
      let photoUrl = '';
      try {
        if (h.remarks && typeof h.remarks === 'string' && h.remarks.startsWith('{')) {
          const parsed = JSON.parse(h.remarks);
          photoUrl = parsed.photo_url || '';
        } else if ((h as any).photo_url) {
          photoUrl = (h as any).photo_url;
        }
      } catch (e) {
        photoUrl = '';
      }

      if (h.equipment_name === 'Asset Collection Photo Proof' || h.equipment_name === 'Asset Collection') {
        if (photoUrl) existingPhotos['Asset Collection Photo Proof'] = photoUrl;
      }
      if (h.equipment_name === 'Event Start Photo Proof' || h.equipment_name === 'Event Start') {
        if (photoUrl) existingPhotos['Event Start Photo Proof'] = photoUrl;
      }
      if (h.equipment_name === 'Event Completion Photo Proof' || h.equipment_name === 'Event Completion') {
        if (photoUrl) existingPhotos['Event Completion Photo Proof'] = photoUrl;
      }
      if (h.equipment_name === 'Equipment Handover Photo Proof' || h.equipment_name === 'Equipment Handover' || h.equipment_name === 'Asset Return Photo Proof') {
        if (photoUrl) existingPhotos['Equipment Handover Photo Proof'] = photoUrl;
      }
    }

    // Check local staffProofs fallback (strictly for this staff member's key)
    const staffKey = `${booking.orderId}_${booking.eventId || 'ev'}_${staffName.trim().toLowerCase()}`;
    const localProofObj = staffProofs[booking.key] || staffProofs[staffKey];
    if (localProofObj) {
      const proofList = stage === 'Event Start' ? localProofObj.eventStartProofs :
                        stage === 'Equipment Received' ? localProofObj.equipmentReceivedProofs :
                        stage === 'Equipment Handover' ? localProofObj.equipmentHandoverProofs :
                        stage === 'Event Complete' ? localProofObj.completeProofs : localProofObj.eventStartProofs;
      if (proofList) {
        for (const p of proofList) {
          if (p.equipmentName && p.photoUrl && !existingPhotos[p.equipmentName]) {
            existingPhotos[p.equipmentName] = p.photoUrl;
          }
        }
      }
    }

    setModalPhotos(existingPhotos);
    setModalRawFootageLink(booking?.rawFootageLink || '');
    setPhotoModalData({ booking, stage });
  };

  // File Upload / Camera capture handler
  const handlePhotoCapture = async (eqName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Enforce Event Start ordering rule
    if (photoModalData?.stage === 'Event Start' && eqName === 'Event Start Photo Proof') {
      const hasAssetColl = !!modalPhotos['Asset Collection Photo Proof'];
      if (!hasAssetColl) {
        e.target.value = '';
        alert("Please upload the Asset Collection Photo Proof before uploading the Event Start Photo Proof.");
        showToast("⚠️ Please upload the Asset Collection Photo Proof before uploading the Event Start Photo Proof.");
        return;
      }
    }

    try {
      const compressedBase64 = await compressImage(file);
      setModalPhotos(prev => ({
        ...prev,
        [eqName]: compressedBase64
      }));
    } catch (err) {
      console.error('Error processing photo:', err);
      showToast('❌ Failed to process photo. Please try again.');
    }
  };

  // Submit Equipment Photos & Update Task Status
  const handleConfirmStatusUpdate = async () => {
    if (!photoModalData) return;
    const { booking, stage } = photoModalData;

    // --- EVENT START WORKFLOW ---
    if (stage === 'Event Start') {
      const hasEquipment = booking.equipmentItems && booking.equipmentItems.length > 0;
      const hasAssetColl = !!modalPhotos['Asset Collection Photo Proof'];
      const hasEventStart = !!modalPhotos['Event Start Photo Proof'];

      if (hasEquipment) {
        if (!hasAssetColl && hasEventStart) {
          alert("Please upload the Asset Collection Photo Proof before uploading the Event Start Photo Proof.");
          showToast("⚠️ Please upload the Asset Collection Photo Proof before uploading the Event Start Photo Proof.");
          return;
        }

        if (!hasAssetColl && !hasEventStart) {
          alert("Please upload the Asset Collection Photo Proof.");
          showToast("⚠️ Please upload the Asset Collection Photo Proof.");
          return;
        }
      } else {
        if (!hasEventStart) {
          alert("Please upload the Event Start Photo Proof.");
          showToast("⚠️ Please upload the Event Start Photo Proof.");
          return;
        }
      }

      try {
        setIsSubmitting(true);
        const timestamp = new Date().toISOString();

        // 1. DRAFT SAVED MODE: Only Asset Collection Photo is provided
        if (hasAssetColl && !hasEventStart) {
          const rawUrl = modalPhotos['Asset Collection Photo Proof'];
          const fileName = `proofs/${booking.orderId || booking.leadId}_AssetCollection_Draft_${Date.now()}.jpg`;
          const finalUrl = await safeUploadImage(rawUrl, fileName);

          const historyRecord = {
            lead_id: booking.leadId || null,
            order_id: booking.orderId || null,
            equipment_name: 'Asset Collection Photo Proof',
            equipment_status: 'Asset Collected (Draft)',
            returned_by: staffName,
            returned_at: timestamp,
            remarks: JSON.stringify({
              asset_id: 'Asset Collection',
              proof_type: 'Event Start Draft',
              staff_name: staffName,
              photo_url: finalUrl,
              event_id: booking.eventId,
              event_name: booking.eventName,
              order_id: booking.orderId,
              lead_id: booking.leadId,
              uploaded_at: timestamp,
              uploaded_by: staffName,
              current_status: 'Assigned Crew'
            })
          };

          await pushInsert('lead_equipment_history', historyRecord);

          // Update local proofs state
          const localProofArr: EquipmentProofItem[] = [{
            equipmentName: 'Asset Collection Photo Proof',
            assetId: 'Asset Collection',
            photoUrl: finalUrl,
            capturedAt: timestamp
          }];
          const existingProofs = staffProofs[booking.key] || {};
          const updatedEventProofs = {
            ...existingProofs,
            eventStartProofs: localProofArr
          };
          const nextProofs = {
            ...staffProofs,
            [booking.key]: updatedEventProofs
          };
          setStaffProofs(nextProofs);
          localStorage.setItem('staff_equipment_proofs_v2', JSON.stringify(nextProofs));

          await refreshData();

          setPhotoModalData(null);
          setModalPhotos({});
          alert("✅ Asset Collection Photo Proof saved as draft! Event status remains 'Assigned Crew' until Event Start Photo Proof is uploaded.");
          showToast("✅ Asset Collection Photo Proof saved as draft!");
          return;
        }

        // 2. FULL EVENT STARTED MODE
        const reqItems = hasEquipment ? [
          { name: 'Asset Collection Photo Proof', assetId: 'Asset Collection' },
          { name: 'Event Start Photo Proof', assetId: 'Event Start' }
        ] : [
          { name: 'Event Start Photo Proof', assetId: 'Event Start' }
        ];

        const uploadedProofs: EquipmentProofItem[] = [];

        for (const item of reqItems) {
          const rawUrl = modalPhotos[item.name];
          const fileName = `proofs/${booking.orderId || booking.leadId}_${item.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
          const finalUrl = await safeUploadImage(rawUrl, fileName);

          uploadedProofs.push({
            equipmentName: item.name,
            assetId: item.assetId,
            photoUrl: finalUrl,
            capturedAt: timestamp
          });

          const historyRecord = {
            lead_id: booking.leadId || null,
            order_id: booking.orderId || null,
            equipment_name: item.name,
            equipment_status: 'Event Started',
            returned_by: staffName,
            returned_at: timestamp,
            remarks: JSON.stringify({
              asset_id: item.assetId,
              proof_type: 'Event Start',
              staff_name: staffName,
              photo_url: finalUrl,
              event_id: booking.eventId,
              event_name: booking.eventName,
              order_id: booking.orderId,
              lead_id: booking.leadId,
              uploaded_at: timestamp,
              uploaded_by: staffName,
              current_status: 'Event Started'
            })
          };

          await pushInsert('lead_equipment_history', historyRecord);
        }

        // Update local statuses & localStorage
        const nextStatuses = {
          ...staffStatuses,
          [booking.key]: 'Event Started'
        };
        setStaffStatuses(nextStatuses);
        localStorage.setItem('staff_event_statuses_v2', JSON.stringify(nextStatuses));

        const existingProofs = staffProofs[booking.key] || {};
        const updatedEventProofs = {
          ...existingProofs,
          eventStartProofs: uploadedProofs
        };
        const nextProofs = {
          ...staffProofs,
          [booking.key]: updatedEventProofs
        };
        setStaffProofs(nextProofs);
        localStorage.setItem('staff_equipment_proofs_v2', JSON.stringify(nextProofs));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('staff_status_updated'));
        }

        // Update database tables: staff_assignments, operations, orders, leads
        if (booking.orderId) {
          const matchingSA = staffAssignments?.find(sa => 
            sa.order_id === booking.orderId && 
            sa.staff_name.toLowerCase() === staffName.toLowerCase()
          );

          if (matchingSA?.assignment_id) {
            await pushUpdate('staff_assignments', 'assignment_id', matchingSA.assignment_id, {
              task_status: 'Event Started',
              assignment_status: 'Assigned',
              updated_at: timestamp
            });
          } else {
            await pushUpdate('staff_assignments', 'order_id', booking.orderId, {
              task_status: 'Event Started',
              updated_at: timestamp
            });
          }

          // Calculate overall stage across ALL assigned staff members
          const allStaffStatuses = getAllStaffStatusesForOrder(booking.orderId, staffName, 'Event Started', nextStatuses, orders, leads, staffAssignments);
          const currentOrd = orders?.find(o => o.order_id === booking.orderId);
          const currentLead = leads?.find(l => l.lead_id === (currentOrd?.lead_id || booking.leadId || booking.orderId));
          const calculatedOverallStage = getCalculatedOrderStage(
            currentOrd?.current_stage || currentLead?.current_status || currentLead?.status || 'Assigned Crew',
            allStaffStatuses
          );

          const currentStage = currentOrd?.current_stage || currentLead?.current_status || currentLead?.status || 'Assigned Crew';
          const payload: any = {
            remarks: `Event Started by ${staffName} on ${timestamp}`
          };
          if (calculatedOverallStage !== currentStage) {
             payload.event_status = calculatedOverallStage;
             payload.remarks += ` (Parent status updated to ${calculatedOverallStage})`;
          } else {
             payload.remarks += ` (Waiting for remaining assigned crew to start)`;
          }

          await pushUpdate('operations', 'order_id', booking.orderId, payload);

          if (calculatedOverallStage !== currentStage) {
            await pushUpdate('orders', 'order_id', booking.orderId, {
              current_stage: calculatedOverallStage,
              updated_by: staffName,
              updated_at: timestamp
            });

            if (booking.leadId) {
              await updateLead(booking.leadId, {
                status: calculatedOverallStage as any,
                current_status: calculatedOverallStage as any,
                updated_by: staffName
              });
            }
          }
        }

        await refreshData();

        setPhotoModalData(null);
        setModalPhotos({});
        alert("✅ Event Started confirmed and saved successfully!");
        showToast("✅ Event Started confirmed and saved successfully!");

      } catch (error: any) {
        console.error('Error updating Event Start status:', error);
        alert(`❌ Failed to submit Event Start: ${error.message || 'Unknown error'}`);
        showToast(`❌ ${error.message || 'Failed to update status.'}`);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // --- OTHER STAGES (Event Complete, Equipment Handover, Equipment Received) ---
    let reqItems: { name: string; assetId: string; optional?: boolean }[] = [];
    if (stage === 'Event Complete') {
      reqItems = [{ name: 'Event Completion Photo Proof', assetId: 'Event Completion' }];
    } else if (stage === 'Equipment Handover') {
      reqItems = [{ name: 'Equipment Handover Photo Proof', assetId: 'Equipment Handover', optional: true }];
    } else if (stage === 'Equipment Received') {
      reqItems = [{ name: 'Asset Collection Photo Proof', assetId: 'Asset Collection' }];
    }

    // Validate mandatory photo proofs
    for (const item of reqItems) {
      if (!item.optional && !modalPhotos[item.name]) {
        showToast(`⚠️ Please capture/upload a photo for ${item.name}`);
        return;
      }
    }

    // Validate mandatory Raw Footage Link for Footage Handover
    if (stage === 'Equipment Handover' && (!modalRawFootageLink || !modalRawFootageLink.trim())) {
      showToast('⚠️ Please enter the Raw Footage Drive Link (Required)');
      alert('Please provide the Raw Footage Drive Link.');
      return;
    }

    try {
      setIsSubmitting(true);
      const timestamp = new Date().toISOString();
      const uploadedProofs: EquipmentProofItem[] = [];

      const hasHandoverPhoto = stage === 'Equipment Handover' && (
        !!modalPhotos['Equipment Handover Photo Proof'] || !!modalPhotos['Asset Return Photo Proof']
      );

      for (const item of reqItems) {
        const rawUrl = modalPhotos[item.name] || (item.name === 'Equipment Handover Photo Proof' ? modalPhotos['Asset Return Photo Proof'] : undefined);
        if (rawUrl) {
          const fileName = `proofs/${booking.orderId || booking.leadId}_${stage.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
          const finalUrl = await safeUploadImage(rawUrl, fileName);

          uploadedProofs.push({
            equipmentName: item.name,
            assetId: item.assetId,
            photoUrl: finalUrl,
            capturedAt: timestamp
          });
        }
      }

      const effectiveEquipmentStatus = 
        stage === 'Event Complete' ? 'Event Ended' :
        stage === 'Equipment Handover' ? (hasHandoverPhoto ? 'Equipment Handover Completed' : 'Equipment Not Handover') : stage;

      let nextStatus = staffStatuses[booking.key] || 'Assigned Crew';
      if (stage === 'Event Complete') {
        nextStatus = 'Event Ended';
      } else if (stage === 'Equipment Handover') {
        nextStatus = 'Footage Handover';
      } else {
        nextStatus = stage;
      }

      // Record lead equipment history
      if (uploadedProofs.length > 0) {
        for (const p of uploadedProofs) {
          const historyRecord = {
            lead_id: booking.leadId || null,
            order_id: booking.orderId || null,
            equipment_name: p.equipmentName,
            equipment_status: effectiveEquipmentStatus,
            returned_by: staffName,
            returned_at: timestamp,
            remarks: JSON.stringify({
              asset_id: p.assetId,
              proof_type: stage === 'Event Complete' ? 'Event End' : stage,
              staff_name: staffName,
              photo_url: p.photoUrl,
              event_id: booking.eventId,
              event_name: booking.eventName,
              order_id: booking.orderId,
              lead_id: booking.leadId,
              raw_footage_link: modalRawFootageLink || null,
              uploaded_at: timestamp,
              uploaded_by: staffName,
              current_status: nextStatus
            })
          };

          await pushInsert('lead_equipment_history', historyRecord);
        }
      } else if (stage === 'Equipment Handover') {
        // Record Equipment Not Handover when photo was not uploaded
        const historyRecord = {
          lead_id: booking.leadId || null,
          order_id: booking.orderId || null,
          equipment_name: 'Equipment Handover Photo Proof',
          equipment_status: 'Equipment Not Handover',
          returned_by: staffName,
          returned_at: timestamp,
          remarks: JSON.stringify({
            asset_id: 'Equipment Handover',
            proof_type: 'Equipment Handover',
            staff_name: staffName,
            photo_url: null,
            event_id: booking.eventId,
            event_name: booking.eventName,
            order_id: booking.orderId,
            lead_id: booking.leadId,
            raw_footage_link: modalRawFootageLink || null,
            uploaded_at: timestamp,
            uploaded_by: staffName,
            current_status: nextStatus
          })
        };

        await pushInsert('lead_equipment_history', historyRecord);
      }

      if (modalRawFootageLink && booking.orderId) {
        try {
          await pushInsert('raw_footage', {
            order_id: booking.orderId,
            server_path: modalRawFootageLink,
            uploaded_by: staffName,
            uploaded_date: timestamp,
            raw_received: true,
            status: 'Received'
          });
        } catch (rfErr) {
          console.warn('[StatusUpdate] raw_footage insert warning:', rfErr);
        }
      }

      const nextStatuses = {
        ...staffStatuses,
        [booking.key]: nextStatus
      };
      setStaffStatuses(nextStatuses);
      localStorage.setItem('staff_event_statuses_v2', JSON.stringify(nextStatuses));

      const existingProofs = staffProofs[booking.key] || {};
      const proofField = stage === 'Equipment Received' ? 'equipmentReceivedProofs' :
                         stage === 'Equipment Handover' ? 'equipmentHandoverProofs' :
                         'completeProofs';
      const updatedEventProofs = {
        ...existingProofs,
        [proofField]: uploadedProofs
      };
      const nextProofs = {
        ...staffProofs,
        [booking.key]: updatedEventProofs
      };
      setStaffProofs(nextProofs);
      localStorage.setItem('staff_equipment_proofs_v2', JSON.stringify(nextProofs));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('staff_status_updated'));
      }

      if (booking.orderId) {
        const updateAssignmentPayload: any = {
          task_status: nextStatus,
          updated_at: timestamp
        };
        if (modalRawFootageLink) {
          updateAssignmentPayload.raw_footage_link = modalRawFootageLink;
        }

        const matchingSA = staffAssignments?.find(sa => 
          sa.order_id === booking.orderId && 
          sa.staff_name.toLowerCase() === staffName.toLowerCase()
        );

        if (matchingSA?.assignment_id) {
          await pushUpdate('staff_assignments', 'assignment_id', matchingSA.assignment_id, {
            ...updateAssignmentPayload,
            assignment_status: 'Assigned'
          });
        } else {
          await pushUpdate('staff_assignments', 'order_id', booking.orderId, updateAssignmentPayload);
        }

        const allStaffStatuses = getAllStaffStatusesForOrder(booking.orderId, staffName, nextStatus, nextStatuses, orders, leads, staffAssignments);
        const currentOrd = orders?.find(o => o.order_id === booking.orderId);
        const currentLead = leads?.find(l => l.lead_id === (currentOrd?.lead_id || booking.leadId || booking.orderId));
        const calculatedOverallStage = getCalculatedOrderStage(
          currentOrd?.current_stage || currentLead?.current_status || currentLead?.status || 'Assigned Crew',
          allStaffStatuses
        );

        const opsPayload: any = {
          equipment_status: effectiveEquipmentStatus,
          remarks: `Updated by ${staffName}: Stage updated to ${nextStatus}`
        };
        if (modalRawFootageLink) {
          opsPayload.raw_footage_drive_link = modalRawFootageLink;
        }

        const currentStage = currentOrd?.current_stage || currentLead?.current_status || currentLead?.status || 'Assigned Crew';
        if (calculatedOverallStage !== currentStage) {
          opsPayload.event_status = calculatedOverallStage;
          opsPayload.remarks += ` (Parent status updated to ${calculatedOverallStage})`;

          await pushUpdate('operations', 'order_id', booking.orderId, opsPayload);

          await pushUpdate('orders', 'order_id', booking.orderId, { 
            current_stage: calculatedOverallStage,
            updated_by: staffName,
            updated_at: timestamp
          });

          if (booking.leadId) {
            await updateLead(booking.leadId, { 
              status: calculatedOverallStage as any,
              current_status: calculatedOverallStage as any,
              updated_by: staffName
            });
          }
        } else {
          opsPayload.remarks += ' (Waiting for remaining assigned crew)';
          await pushUpdate('operations', 'order_id', booking.orderId, opsPayload);
        }
      }

      await refreshData();

      setPhotoModalData(null);
      setModalPhotos({});
      setModalRawFootageLink('');
      const stageLabel = stage === 'Event Complete' ? 'Event End' : stage;
      alert(`✅ ${stageLabel} confirmed and saved successfully!`);
      showToast(`✅ ${stageLabel} submitted & saved successfully!`);

    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(`❌ Failed to submit ${stage}: ${error.message || 'Unknown error'}`);
      showToast(`❌ ${error.message || 'Failed to update status.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  // Calendar View & Navigation state
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks'>('calendar');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarModalDate, setCalendarModalDate] = useState<string | null>(null);
  const [calendarModalEvents, setCalendarModalEvents] = useState<any[]>([]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  // Calendar Month Grid Calculation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString('default', { month: 'long' });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();

  const todayStr = normalizeDateStr(new Date().toISOString().split('T')[0]);

  const calendarGrid: {
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: any[];
  }[] = [];

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = daysInPreviousMonth - i;
    const pDate = new Date(year, month - 1, dNum);
    const dateStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    const evs = activeBookings.filter(b => normalizeDateStr(b.eventDate) === dateStr);
    calendarGrid.push({
      dateStr,
      dayNum: dNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: evs
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const evs = activeBookings.filter(b => normalizeDateStr(b.eventDate) === dateStr);
    calendarGrid.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      events: evs
    });
  }

  // Next month padding to fill row
  const remaining = calendarGrid.length % 7 === 0 ? 0 : 7 - (calendarGrid.length % 7);
  for (let d = 1; d <= remaining; d++) {
    const nDate = new Date(year, month + 1, d);
    const dateStr = `${nDate.getFullYear()}-${String(nDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const evs = activeBookings.filter(b => normalizeDateStr(b.eventDate) === dateStr);
    calendarGrid.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: evs
    });
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-zinc-900 border border-amber-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 font-sans text-sm font-bold flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-2xl md:rounded-3xl p-3.5 sm:p-5 md:p-6 flex flex-row justify-between items-center gap-2 md:gap-4 shadow-xl">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider mb-1 sm:mb-2">
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> Operative Portal
          </div>
          <h2 className="text-base sm:text-xl md:text-3xl font-black text-white uppercase tracking-tight leading-tight">Operation Staff Dashboard</h2>
          <p className="text-zinc-400 font-mono text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">Logged in as: <span className="text-amber-400 font-bold">{staffName}</span> {staffMobile && `(${staffMobile})`}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-xl md:rounded-2xl px-2.5 py-1 sm:px-4 sm:py-2 text-right">
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 uppercase block leading-none">Assigned Tasks</span>
            <span className="text-xs sm:text-base md:text-xl font-black text-white leading-tight block mt-0.5">{activeBookings.length} Active</span>
          </div>
        </div>
      </div>

      {/* Navigation View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 md:gap-4 bg-zinc-900/90 border border-zinc-800 p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-lg">
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-2.5 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-extrabold text-[10px] sm:text-xs md:text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'bg-amber-500 text-zinc-950 shadow-md md:shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="truncate">My Event Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-2.5 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-extrabold text-[10px] sm:text-xs md:text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'bg-amber-500 text-zinc-950 shadow-md md:shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="truncate">Assigned Orders List ({activeBookings.length})</span>
          </button>
        </div>

        <div className="text-[10px] sm:text-xs font-mono text-zinc-400 px-2.5 py-1 sm:px-3 sm:py-1 bg-zinc-800/60 rounded-lg md:rounded-xl border border-zinc-700/50 self-end sm:self-auto text-right">
          Personalized for: <strong className="text-amber-400">{staffName}</strong>
        </div>
      </div>

      {/* PERSONAL EVENT CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl p-3.5 sm:p-5 md:p-6 space-y-4 md:space-y-6">
          {/* Calendar Header Navigation */}
          <div className="flex justify-end items-center gap-2.5 md:gap-4 border-b border-zinc-800 pb-3 md:pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToday}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold font-mono rounded-xl border border-zinc-700 transition-colors"
              >
                Today
              </button>
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-extrabold text-white font-mono px-3">
                  {monthName} {year}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-mono font-bold uppercase text-zinc-500 py-1">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="py-2 bg-zinc-950/60 rounded-xl border border-zinc-850">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Month Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full max-w-full">
            {calendarGrid.map((cell, idx) => {
              const hasEvents = cell.events.length > 0;
              const isSelected = cell.dateStr === calendarModalDate;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setCalendarModalDate(cell.dateStr);
                    setCalendarModalEvents(cell.events);
                  }}
                  className={`aspect-square p-1.5 sm:p-2.5 rounded-xl border flex flex-col items-center justify-between cursor-pointer select-none touch-manipulation relative transition-all duration-150 ${
                    isSelected
                      ? 'bg-zinc-900 border-amber-500 ring-1 ring-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : cell.isToday
                      ? 'bg-amber-500/10 border-amber-500/60 text-white shadow-lg shadow-amber-500/5'
                      : cell.isCurrentMonth
                      ? 'bg-zinc-950/80 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40 text-zinc-200'
                      : 'bg-zinc-950/20 border-transparent text-zinc-800 opacity-20 pointer-events-none'
                  }`}
                >
                  {/* Date Number Display */}
                  <span
                    className={`text-xs sm:text-sm font-mono font-extrabold ${
                      isSelected
                        ? 'text-amber-400 font-black'
                        : cell.isToday
                        ? 'text-amber-500 font-extrabold'
                        : cell.isCurrentMonth
                        ? 'text-zinc-200'
                        : 'text-zinc-700'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {/* Event Dots ONLY (No event names, badges, times, or crew text) */}
                  {cell.isCurrentMonth && hasEvents && (
                    <div className="flex items-center justify-center gap-1 mt-0.5 max-w-full overflow-hidden">
                      {cell.events.slice(0, 4).map((ev, eIdx) => (
                        <span
                          key={ev.key || eIdx}
                          className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                        />
                      ))}
                      {cell.events.length > 4 && (
                        <span className="w-1 h-1 rounded-full bg-zinc-500 shrink-0" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Date Events Section below Calendar Grid */}
          <div className="mt-6 pt-5 border-t border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 block font-extrabold">
                  SELECTED DATE
                </span>
                <h4 className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
                  {calendarModalDate || 'Select a date'}
                </h4>
              </div>
              {calendarModalDate && (
                <span className="text-xs font-mono text-zinc-400">
                  {calendarModalEvents.length} Event(s) Scheduled
                </span>
              )}
            </div>

            {!calendarModalDate ? (
              <div className="p-6 text-center bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs font-mono">
                Click or tap any date on the calendar above to view scheduled events.
              </div>
            ) : calendarModalEvents.length === 0 ? (
              <div className="p-6 text-center bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs font-mono">
                No events assigned on {calendarModalDate}.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto w-full border border-zinc-800 rounded-2xl bg-zinc-950/60">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/90 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                        <th className="p-4">ORDER & EVENT</th>
                        <th className="p-4">CUSTOMER</th>
                        <th className="p-4">DATE & TIME</th>
                        <th className="p-4">ASSIGNED TASK</th>
                        <th className="p-4">STATUS</th>
                        <th className="p-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-xs font-sans">
                      {calendarModalEvents.map((ev, idx) => (
                        <tr key={ev.key || idx} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="p-4">
                            <span className="text-[10px] font-mono font-bold text-amber-400 block">
                              ORDER: {ev.orderId}
                            </span>
                            <span className="text-sm font-bold text-white block mt-0.5">{ev.eventName}</span>
                            {ev.venue && <span className="text-[11px] text-zinc-400 block mt-0.5">{ev.venue}</span>}
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-zinc-200 block">{ev.customerName}</span>
                            <a href={`tel:${ev.customerMobile}`} className="text-[11px] font-mono text-amber-400 hover:underline">
                              {ev.customerMobile}
                            </a>
                          </td>
                          <td className="p-4 font-mono text-zinc-300">
                            <div>Start: {ev.eventStartTime}</div>
                            <div className="text-zinc-500 text-[10px]">End: {ev.eventEndTime || 'N/A'}</div>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase text-[10px]">
                              {ev.assignedRole}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase text-[10px]">
                              {ev.taskStatus}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedBookingDetails(ev)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden space-y-3">
                  {calendarModalEvents.map((ev, idx) => (
                    <div
                      key={ev.key || idx}
                      className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block">
                            ORDER: {ev.orderId}
                          </span>
                          <h5 className="text-base font-bold text-white mt-0.5">{ev.eventName}</h5>
                          <p className="text-xs text-zinc-300 font-semibold mt-0.5">{ev.customerName}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase text-[9px] shrink-0">
                          {ev.assignedRole}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-zinc-850 text-zinc-400">
                        <div>
                          <span className="text-[9px] text-zinc-500 block uppercase">TIME</span>
                          <span className="text-zinc-200">{ev.eventStartTime}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 block uppercase">STATUS</span>
                          <span className="text-amber-400 font-bold">{ev.taskStatus}</span>
                        </div>
                      </div>

                      {ev.venue && (
                        <div className="text-xs text-zinc-400 font-mono pt-2 border-t border-zinc-850">
                          <span className="text-[9px] text-zinc-500 block uppercase">VENUE</span>
                          <span>{ev.venue}</span>
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setSelectedBookingDetails(ev)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assigned Orders & Tasks Table/Cards */}
      {activeTab === 'tasks' && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-500" />
                Assigned Orders & Tasks
              </h3>
              <p className="text-zinc-400 text-xs mt-0.5">Showing orders & equipment assigned specifically to you</p>
            </div>
          </div>

          {activeBookings.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700/60">
                <Calendar className="w-8 h-8 text-zinc-500" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">No Assigned Tasks Found</h4>
              <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                You currently have no active event or equipment assignments. New shoots assigned to you by Operations will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-zinc-950/60 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    <th className="py-4 px-6">Order ID</th>
                    <th className="py-4 px-6">Customer Name</th>
                    <th className="py-4 px-6">Event Name & Shoot</th>
                    <th className="py-4 px-6">Event Date & Time</th>
                    <th className="py-4 px-6">Assigned Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm">
                  {activeBookings.map((b) => {
                    const proofData = staffProofs[b.key] || {};
                    const isStarted = b.taskStatus === 'Event Started' || b.taskStatus === 'Event Completed' || b.taskStatus === 'Event Start' || b.taskStatus === 'Event Complete';
                    const isCompleted = b.taskStatus === 'Event Completed' || b.taskStatus === 'Event Complete';
                    
                    const hasEquipmentReceived = proofData.equipmentReceivedProofs && proofData.equipmentReceivedProofs.length > 0;
                    const hasEventStart = proofData.eventStartProofs && proofData.eventStartProofs.length > 0;
                    const hasEquipmentHandover = proofData.equipmentHandoverProofs && proofData.equipmentHandoverProofs.length > 0;

                    return (
                      <tr key={b.key} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-amber-400">{b.orderId}</td>
                        <td className="py-4 px-6 font-bold text-white">{b.customerName}</td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-zinc-200">{b.eventName}</div>
                          <span className="text-[10px] font-mono uppercase text-zinc-500">{b.shootType}</span>
                        </td>
                        <td className="py-4 px-6 text-zinc-300">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            {b.eventDate}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {b.eventStartTime}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                            {b.assignedRole}
                          </span>
                        </td>
                        <td className="py-4 px-6 flex flex-col gap-2 items-start">
                          {b.taskStatus === 'Footage Handover' || b.taskStatus === 'Verified Footage' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase whitespace-nowrap">
                              <CheckCircle className="w-3.5 h-3.5" /> Footage Handover
                            </span>
                          ) : isCompleted || b.taskStatus === 'Event Ended' || b.taskStatus === 'Event Completed' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold uppercase whitespace-nowrap">
                              <CheckCircle className="w-3.5 h-3.5" /> Event Ended
                            </span>
                          ) : isStarted || b.taskStatus === 'Event Started' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase whitespace-nowrap">
                              <Play className="w-3.5 h-3.5" /> Event Started
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase whitespace-nowrap">
                              <User className="w-3.5 h-3.5" /> Assigned Crew
                            </span>
                          )}
                          {(b.taskStatus === 'Footage Handover' || b.taskStatus === 'Verified Footage' || b.rawFootageVerificationStatus === 'Verified' || b.rawFootageVerificationStatus === 'Not Verified') && (
                            <div className="text-[10px] font-bold">
                              {b.rawFootageVerificationStatus === 'Verified' ? (
                                <span className="text-emerald-400">✅ Verified by Ops</span>
                              ) : b.rawFootageVerificationStatus === 'Not Verified' ? (
                                <span className="text-rose-400">❌ Footage Rejected</span>
                              ) : (
                                <span className="text-zinc-500 italic">Verification Pending</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <StaffActionDropdown
                            booking={b}
                            hasEquipmentReceived={hasEquipmentReceived}
                            hasEventStart={hasEventStart}
                            hasEquipmentHandover={hasEquipmentHandover}
                            isCompleted={isCompleted}
                            onViewDetails={() => setSelectedBookingDetails(b)}
                            onOpenPhotoModal={(step) => openPhotoModal(b, step)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      <ViewDetailsModal
        isOpen={!!selectedBookingDetails}
        onClose={() => setSelectedBookingDetails(null)}
        orderId={selectedBookingDetails?.orderId || selectedBookingDetails?.key}
        booking={selectedBookingDetails}
        isStaffView={true}
      />

      {/* EQUIPMENT PHOTO PROOF VERIFICATION MODAL (EVENT START / EVENT COMPLETE) */}
      {photoModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/60 flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  {photoModalData.stage === 'Event Complete' ? 'Event End Workflow' : photoModalData.stage === 'Equipment Handover' ? 'Footage Handover Workflow' : `Verification • ${photoModalData.stage}`}
                </span>
                <h3 className="text-xl font-black text-white">{photoModalData.booking.eventName}</h3>
                <p className="text-zinc-400 text-xs mt-0.5">Order ID: {photoModalData.booking.orderId} | Staff: <strong className="text-white">{staffName}</strong></p>
              </div>
              <button
                onClick={() => setPhotoModalData(null)}
                className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  {photoModalData.stage === 'Event Complete' ? (
                    <span><strong>Event Completion Proof Required:</strong> Please upload or capture the <strong>Event Completion Photo Proof</strong> to complete the Event End stage.</span>
                  ) : photoModalData.stage === 'Equipment Handover' ? (
                    <span><strong>Footage Handover:</strong> Provide the <strong>Raw Footage Drive Link (Required)</strong>. Equipment Handover Photo Proof is optional.</span>
                  ) : (
                    <span><strong>Equipment Inspection Required:</strong> Please capture or upload a clear photo of each assigned equipment item to verify condition at <span className="font-bold underline">{photoModalData.stage}</span>.</span>
                  )}
                </div>
              </div>

              {/* Equipment / Proof Items list with photo inputs */}
              <div className="space-y-4">
                {(photoModalData.stage === 'Event Start'
                  ? (photoModalData.booking.equipmentItems && photoModalData.booking.equipmentItems.length > 0 
                      ? [
                          { name: 'Asset Collection Photo Proof', assetId: 'Asset Collection', optional: false },
                          { name: 'Event Start Photo Proof', assetId: 'Event Start', optional: false }
                        ]
                      : [
                          { name: 'Event Start Photo Proof', assetId: 'Event Start', optional: false }
                        ])
                  : photoModalData.stage === 'Event Complete'
                  ? [
                      { name: 'Event Completion Photo Proof', assetId: 'Event Completion', optional: false }
                    ]
                  : photoModalData.stage === 'Equipment Handover'
                  ? [
                      { name: 'Equipment Handover Photo Proof', assetId: 'Equipment Handover', optional: true }
                    ]
                  : [
                      { name: 'Asset Collection Photo Proof', assetId: 'Asset Collection', optional: false }
                    ]
                ).map((item: any, idx: number) => {
                  const currentPhoto = modalPhotos[item.name] || (item.name === 'Equipment Handover Photo Proof' ? modalPhotos['Asset Return Photo Proof'] : undefined);

                  return (
                    <div key={idx} className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <Camera className="w-4 h-4 text-amber-500" />
                            {item.name} {item.optional ? <span className="text-zinc-500 text-xs font-normal">(Optional)</span> : <span className="text-rose-400 text-xs font-normal">(Required)</span>}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">Asset ID: {item.assetId}</div>
                        </div>
                        {currentPhoto ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" /> Photo Attached
                          </span>
                        ) : item.optional ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-full border border-zinc-700">
                            Photo Optional
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                            <AlertCircle className="w-3.5 h-3.5" /> Photo Required
                          </span>
                        )}
                      </div>

                      {currentPhoto ? (
                        <div className="relative group rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
                          <img src={currentPhoto} alt={item.name} className="w-full h-40 object-cover" />
                          <label className="absolute bottom-2 right-2 bg-zinc-900/90 hover:bg-zinc-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-700 cursor-pointer flex items-center gap-1.5 shadow-lg">
                            <Upload className="w-3.5 h-3.5" /> Change Photo
                            <input
                              type="file"
                              accept="image/*"
                              
                              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} onChange={(e) => handlePhotoCapture(item.name, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-900/50 hover:bg-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-amber-500/20 text-zinc-400 group-hover:text-amber-400 flex items-center justify-center transition-colors">
                            <Camera className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-zinc-300 group-hover:text-amber-400 transition-colors">
                            Capture or Upload {item.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">Use phone camera or choose file</span>
                          <input
                            type="file"
                            accept="image/*"
                            
                            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} onChange={(e) => handlePhotoCapture(item.name, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}

                {/* Raw Footage Link Input for Footage Handover stage */}
                {photoModalData.stage === 'Equipment Handover' && (
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <Video className="w-4 h-4 text-indigo-400" />
                          Raw Footage Drive Link <span className="text-rose-400 text-xs font-normal">(Required)</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">Google Drive / Cloud folder URL for raw footage handover</div>
                      </div>
                      {modalRawFootageLink.trim() ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" /> Link Provided
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" /> Link Required
                        </span>
                      )}
                    </div>
                    <input
                      type="url"
                      value={modalRawFootageLink}
                      onChange={(e) => setModalRawFootageLink(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex justify-between items-center">
              <button
                onClick={() => setPhotoModalData(null)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmStatusUpdate}
                disabled={isSubmitting}
                className={`px-6 py-2.5 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg ${
                  photoModalData.stage === 'Event Start'
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : photoModalData.stage === 'Event Complete' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit Event End
                  </>
                ) : photoModalData.stage === 'Equipment Handover' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit Footage Handover
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm {photoModalData.stage}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Selected Date Event Details are rendered directly below calendar grid */}
    </div>
  );
};
