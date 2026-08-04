import React, { useState, useEffect } from 'react';
import { useRole } from './RoleContext';
import { MapPin, Calendar, Clock, Briefcase, Camera, User, Phone, MessageSquare, Eye, CheckCircle, AlertCircle, Upload, X, Play, ShieldCheck, ChevronRight, ChevronLeft, Video } from 'lucide-react';
import { Lead, Order, Operation, StaffAssignment, EquipmentHandover } from '../types';
import { supabaseClient } from '../supabaseClient';
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

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.staff-action-dropdown-${booking.orderId || booking.key}`)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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

  // 3. Event Ended (show only when current status is Event Started)
  if (currentStatus === 'Event Started') {
    actionOptions.push({
      label: 'Event Ended',
      onClick: () => {
        onOpenPhotoModal('Event Complete');
        setIsOpen(false);
      }
    });
  }

  // 4. Footage Handover (show only when current status is Event Ended)
  if (currentStatus === 'Event Ended') {
    actionOptions.push({
      label: 'Footage Handover',
      onClick: () => {
        onOpenPhotoModal('Equipment Handover');
        setIsOpen(false);
      }
    });
  }

  return (
    <div className={`relative inline-block text-left staff-action-dropdown-${booking.orderId || booking.key}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold border border-indigo-500/30 shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5 outline-none"
      >
        <span>🎯 Action</span>
        <span className={`text-[9px] text-indigo-200 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl z-[9999] p-1.5 space-y-1 text-left animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1 border-b border-zinc-900 mb-0.5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Select Action</span>
          </div>
          {actionOptions.map((opt, idx) => (
            <button
              key={idx}
              onClick={opt.onClick}
              className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-lg transition-all cursor-pointer font-sans font-semibold flex items-center justify-start gap-2"
            >
              <span className="text-indigo-400 text-xs shrink-0">⚡</span>
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
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

    // 1. Restore staff task status from staffAssignments
    if (staffAssignments && staffAssignments.length > 0) {
      setStaffStatuses(prev => {
        const restored = { ...prev };
        staffAssignments.forEach(sa => {
          if (sa.staff_name && sa.staff_name.toLowerCase() === staffName.toLowerCase()) {
            const statusVal = (sa as any).task_status || sa.assignment_status;
            if (statusVal && statusVal !== 'Assigned') {
              const key = `${sa.order_id}_gen_${staffName.toLowerCase()}`;
              restored[key] = statusVal;
            }
          }
        });
        return restored;
      });
    }

        // 2. Restore equipment verification photo proofs from leadEquipmentHistory
    if (leadEquipmentHistory && leadEquipmentHistory.length > 0) {
      setStaffProofs(prev => {
        const restored = { ...prev };
        leadEquipmentHistory.forEach(leh => {
          if (
            leh.returned_by &&
            leh.returned_by.toLowerCase() === staffName.toLowerCase()
          ) {
            let eventId = 'gen';
            let photoUrl = (leh as any).photo_url || '';
            let assetId = (leh as any).asset_id || '';
            
            if (leh.remarks) {
              try {
                const parsed = JSON.parse(leh.remarks);
                photoUrl = parsed.photo_url || photoUrl;
                assetId = parsed.asset_id || assetId;
                if (parsed.event_id) {
                  eventId = parsed.event_id;
                }
              } catch (e) {}
            }
            
            const key = `${leh.order_id}_${eventId}_${staffName.toLowerCase()}`;

            if (photoUrl) {
              const stage = leh.equipment_status;
              const proofField = stage === 'Equipment Received' ? 'equipmentReceivedProofs' :
                                 stage === 'Event Start' ? 'eventStartProofs' :
                                 stage === 'Equipment Handover' ? 'equipmentHandoverProofs' :
                                 stage === 'Event Complete' ? 'completeProofs' : 'startProofs';
              
              const existing = restored[key] || {};
              const proofArr = existing[proofField] ? [...existing[proofField]!] : [];
              const proofItem: EquipmentProofItem = {
                equipmentName: leh.equipment_name,
                assetId: assetId || `EQ-${leh.equipment_name}`,
                photoUrl: photoUrl,
                capturedAt: leh.returned_at || new Date().toISOString()
              };

              if (!proofArr.some(p => p.equipmentName === proofItem.equipmentName)) {
                proofArr.push(proofItem);
              }

              restored[key] = {
                ...existing,
                [proofField]: proofArr
              };
            }
          }
        });
        return restored;
      });
    }
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

    (leads || []).forEach((lead) => {
      const order = (orders || []).find(o => o.lead_id === lead.lead_id);
      const op = operations.find(o => o.order_id === (order?.order_id || lead.lead_id));

      const orderId = order?.order_id || `ORD-${lead.lead_id}`;

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
            const currentStaffStatus = staffStatuses[uniqueKey] || op?.event_status || 'Assigned Crew';

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
              coordinator: op?.operations_coordinator || 'Unassigned'
            });
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
          const currentStaffStatus = staffStatuses[uniqueKey] || op?.event_status || 'Assigned Crew';

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
            coordinator: op?.operations_coordinator || 'Unassigned'
          });
        }
      }
    });

    setActiveBookings(bookings);
  }, [leads, orders, operations, staffAssignments, staffName, staff, equipment, staffStatuses]);

  // Open Equipment Photo Verification Modal
  const openPhotoModal = (booking: any, stage: 'Equipment Received' | 'Event Start' | 'Equipment Handover' | 'Event Complete') => {
    setModalPhotos({});
    setModalRawFootageLink(booking?.rawFootageLink || '');
    setPhotoModalData({ booking, stage });
  };

  // File Upload / Camera capture handler
  const handlePhotoCapture = async (eqName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
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
    
    let reqItems: { name: string; assetId: string }[] = [];
    if (stage === 'Event Start') {
      reqItems = [
        { name: 'Asset Collection Photo Proof', assetId: 'Asset Collection' },
        { name: 'Event Start Photo Proof', assetId: 'Event Start' }
      ];
    } else if (stage === 'Event Complete') {
      reqItems = [
        { name: 'Event Completion Photo Proof', assetId: 'Event Completion' }
      ];
    } else if (stage === 'Equipment Handover') {
      reqItems = [
        { name: 'Asset Return Photo Proof', assetId: 'Asset Return' }
      ];
    } else if (stage === 'Equipment Received') {
      reqItems = [
        { name: 'Asset Collection Photo Proof', assetId: 'Asset Collection' }
      ];
    }

    // 1. Validate required photos exist
    for (const item of reqItems) {
      if (!modalPhotos[item.name]) {
        showToast(`⚠️ Please capture/upload a photo for ${item.name}`);
        return;
      }
    }

    // Validate Raw Footage Drive Link if Footage Handover
    if (stage === 'Equipment Handover') {
      if (!modalRawFootageLink || !modalRawFootageLink.trim()) {
        showToast('⚠️ Please enter the Raw Footage Drive Link');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const timestamp = new Date().toISOString();
      console.log("[StatusUpdate] START - Confirm clicked for stage:", stage);
      const uploadedProofs: EquipmentProofItem[] = [];

      // 2. Upload images to /api/upload-proof (Supabase Storage bucket)
      for (const item of reqItems) {
        let finalUrl = modalPhotos[item.name];
        
        if (finalUrl && finalUrl.startsWith('data:image')) {
          const fileName = `proofs/${booking.orderId || booking.leadId}_${stage.replace(/\s+/g, '_')}_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
          
          console.log("[StatusUpdate] uploading image to /api/upload-proof:", fileName);
          const uploadRes = await fetch('/api/upload-proof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: finalUrl, fileName, contentType: 'image/jpeg' })
          });
          const uploadData = await uploadRes.json();
          
          if (!uploadRes.ok || !uploadData.success || !uploadData.publicUrl) {
            console.error("Storage upload error:", uploadData.error || uploadData);
            throw new Error(uploadData.error || `Failed to upload ${item.name} to storage`);
          }
          
          finalUrl = uploadData.publicUrl;
        }
        
        uploadedProofs.push({
          equipmentName: item.name,
          assetId: item.assetId,
          photoUrl: finalUrl,
          capturedAt: timestamp
        });
      }

      const newProofs: EquipmentProofItem[] = uploadedProofs;

      // 3. Save to database lead_equipment_history table
      const effectiveEquipmentStatus = 
        stage === 'Event Start' ? 'Event Started' :
        stage === 'Event Complete' ? 'Event Ended' :
        stage === 'Equipment Handover' ? 'Footage Handover' : stage;

      let nextStatus = staffStatuses[booking.key] || 'Assigned Crew';
      if (stage === 'Event Start') {
        nextStatus = 'Event Started';
      } else if (stage === 'Event Complete') {
        nextStatus = 'Event Ended';
      } else if (stage === 'Equipment Handover') {
        nextStatus = 'Footage Handover';
      } else {
        nextStatus = stage;
      }

      for (const p of newProofs) {
        console.log("[StatusUpdate] saving record to lead_equipment_history via pushInsert");
        const historyRecord = {
          lead_id: booking.leadId || null,
          order_id: booking.orderId || null,
          equipment_name: p.equipmentName,
          equipment_status: effectiveEquipmentStatus,
          returned_by: staffName,
          returned_at: timestamp,
          remarks: JSON.stringify({
            asset_id: p.assetId,
            proof_type: stage,
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

        const resHist = await pushInsert('lead_equipment_history', historyRecord);
        if (!resHist?.success) {
          console.error('[StatusUpdate] lead_equipment_history ERROR:', resHist?.error);
          throw new Error(`Database save failed for ${p.equipmentName}: ${resHist?.error || 'Insert failed'}`);
        }
      }

      // 4. Save Raw Footage Link to raw_footage table if present
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

      // 5. Update local statuses & local storage
      const nextStatuses = {
        ...staffStatuses,
        [booking.key]: nextStatus
      };
      setStaffStatuses(nextStatuses);
      localStorage.setItem('staff_event_statuses_v2', JSON.stringify(nextStatuses));

      const existingProofs = staffProofs[booking.key] || {};
      const proofField = stage === 'Equipment Received' ? 'equipmentReceivedProofs' :
                         stage === 'Event Start' ? 'eventStartProofs' :
                         stage === 'Equipment Handover' ? 'equipmentHandoverProofs' :
                         'completeProofs';
      const updatedEventProofs = {
        ...existingProofs,
        [proofField]: newProofs
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

      // 6. Update staff_assignments, operations, orders, leads
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

        let globalNextStatus: string | null = null;
        if (stage === 'Event Start') {
          globalNextStatus = 'Event Started';
        } else if (stage === 'Event Complete') {
          globalNextStatus = 'Event Ended';
        } else if (stage === 'Equipment Handover') {
          globalNextStatus = 'Footage Handover';
        }

        if (globalNextStatus) {
          const opsPayload: any = {
            event_status: globalNextStatus,
            remarks: `Updated by ${staffName}: Stage updated to ${globalNextStatus}`
          };
          if (modalRawFootageLink) {
            opsPayload.raw_footage_drive_link = modalRawFootageLink;
          }

          await pushUpdate('operations', 'order_id', booking.orderId, opsPayload);

          await pushUpdate('orders', 'order_id', booking.orderId, { 
            current_stage: globalNextStatus,
            updated_by: staffName,
            updated_at: timestamp
          });

          if (booking.leadId) {
            await updateLead(booking.leadId, { 
              status: globalNextStatus as any,
              current_status: globalNextStatus as any,
              updated_by: staffName
            });
          }
        }
      }

      // 7. Refresh global app state so all dashboards sync!
      await refreshData();

      // 8. Close modal & notify
      setPhotoModalData(null);
      setModalPhotos({});
      setModalRawFootageLink('');
      alert(`✅ ${stage} confirmed and saved successfully!`);
      showToast(`✅ ${stage} proof uploaded & saved successfully!`);

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
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold uppercase tracking-widest mb-2">
            <User className="w-3.5 h-3.5" /> Operative Portal
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Operation Staff Dashboard</h2>
          <p className="text-zinc-400 font-mono text-xs mt-1">Logged in as: <span className="text-amber-400 font-bold">{staffName}</span> {staffMobile && `(${staffMobile})`}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-2xl px-4 py-2 text-right">
            <span className="text-[10px] font-mono text-zinc-400 uppercase block">Assigned Tasks</span>
            <span className="text-xl font-black text-white">{activeBookings.length} Active</span>
          </div>
        </div>
      </div>

      {/* Navigation View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-2 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'calendar'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            My Event Calendar
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'tasks'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Assigned Orders List ({activeBookings.length})
          </button>
        </div>

        <div className="text-xs font-mono text-zinc-400 px-3 py-1 bg-zinc-800/60 rounded-xl border border-zinc-700/50">
          Personalized for: <strong className="text-amber-400">{staffName}</strong>
        </div>
      </div>

      {/* PERSONAL EVENT CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6">
          {/* Calendar Header with Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-zinc-800 pb-5">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Personal Event Calendar
              </h3>
              <p className="text-zinc-400 text-xs mt-0.5">
                Showing assigned events specifically for <strong className="text-amber-400">{staffName}</strong> • Click any date/event to view full details
              </p>
            </div>

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
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-bold uppercase text-zinc-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Month Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarGrid.map((cell, idx) => {
              const hasEvents = cell.events.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setCalendarModalDate(cell.dateStr);
                    setCalendarModalEvents(cell.events);
                  }}
                  className={`min-h-[110px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    !cell.isCurrentMonth
                      ? 'bg-zinc-950/20 border-zinc-900 text-zinc-600 opacity-40'
                      : cell.isToday
                      ? 'bg-amber-500/10 border-amber-500/60 text-white shadow-lg shadow-amber-500/5'
                      : hasEvents
                      ? 'bg-zinc-900/90 border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  {/* Date number header */}
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-mono font-bold rounded-lg px-2 py-0.5 ${
                        cell.isToday
                          ? 'bg-amber-500 text-zinc-950 font-black'
                          : cell.isCurrentMonth
                          ? 'text-zinc-200'
                          : 'text-zinc-600'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {hasEvents && (
                      <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 shadow-sm">
                        {cell.events.length} {cell.events.length === 1 ? 'Event' : 'Events'}
                      </span>
                    )}
                  </div>

                  {/* Event Badges inside Cell */}
                  <div className="mt-1 space-y-1">
                    {cell.events.slice(0, 2).map((ev, eIdx) => (
                      <div
                        key={eIdx}
                        className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-1 text-[10px] text-amber-300 font-medium truncate group-hover:bg-amber-500/30 transition-colors"
                      >
                        <div className="font-bold truncate text-white">{ev.eventName}</div>
                        <div className="text-[9px] font-mono text-amber-400 opacity-90 truncate">
                          {ev.eventStartTime} • {ev.assignedRole}
                        </div>
                      </div>
                    ))}

                    {cell.events.length > 2 && (
                      <div className="text-[9px] font-mono font-bold text-amber-400 text-center">
                        +{cell.events.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
              <table className="w-full text-left border-collapse">
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
                        <td className="py-4 px-6">
                          {b.taskStatus === 'Footage Handover' || b.taskStatus === 'Verified Footage' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase">
                              <CheckCircle className="w-3.5 h-3.5" /> Footage Handover
                            </span>
                          ) : isCompleted || b.taskStatus === 'Event Ended' || b.taskStatus === 'Event Completed' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold uppercase">
                              <CheckCircle className="w-3.5 h-3.5" /> Event Ended
                            </span>
                          ) : isStarted || b.taskStatus === 'Event Started' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase">
                              <Play className="w-3.5 h-3.5" /> Event Started
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase">
                              <User className="w-3.5 h-3.5" /> Assigned Crew
                            </span>
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/60 flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  Equipment Verification • {photoModalData.stage}
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
                  <strong>Equipment Inspection Required:</strong> Please capture or upload a clear photo of each assigned equipment item to verify condition at <span className="font-bold underline">{photoModalData.stage}</span>.
                </div>
              </div>

              {/* Equipment Items list with photo inputs */}
              <div className="space-y-4">
                {(photoModalData.stage === 'Event Start'
                  ? [
                      { name: 'Asset Collection Photo Proof', assetId: 'Asset Collection' },
                      { name: 'Event Start Photo Proof', assetId: 'Event Start' }
                    ]
                  : photoModalData.stage === 'Event Complete'
                  ? [
                      { name: 'Event Completion Photo Proof', assetId: 'Event Completion' }
                    ]
                  : photoModalData.stage === 'Equipment Handover'
                  ? [
                      { name: 'Asset Return Photo Proof', assetId: 'Asset Return' }
                    ]
                  : [
                      { name: 'Asset Collection Photo Proof', assetId: 'Asset Collection' }
                    ]
                ).map((item: any, idx: number) => {
                  const currentPhoto = modalPhotos[item.name];

                  return (
                    <div key={idx} className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <Camera className="w-4 h-4 text-amber-500" />
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">Asset ID: {item.assetId}</div>
                        </div>
                        {currentPhoto ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" /> Photo Attached
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
                          Raw Footage Drive Link
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

      {/* PERSONAL CALENDAR EVENT POPUP MODAL */}
      {calendarModalDate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/60 flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  Assigned Event Details • {calendarModalDate}
                </span>
                <h3 className="text-2xl font-black text-white">
                  Events for {staffName}
                </h3>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Showing {calendarModalEvents.length} event(s) assigned to you on this date
                </p>
              </div>
              <button
                onClick={() => setCalendarModalDate(null)}
                className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {calendarModalEvents.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white mb-1">No Events Assigned</h4>
                  <p className="text-zinc-400 text-xs">
                    You have no events or shoots assigned to you on {calendarModalDate}.
                  </p>
                </div>
              ) : (
                calendarModalEvents.map((ev, idx) => (
                  <div
                    key={ev.key || idx}
                    className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-lg hover:border-zinc-700 transition-colors"
                  >
                    {/* Header badge row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                          Order ID: {ev.orderId}
                        </span>
                        <h4 className="text-xl font-black text-white">{ev.eventName}</h4>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase">
                        <Briefcase className="w-3.5 h-3.5" />
                        Task: {ev.assignedRole}
                      </span>
                    </div>

                    {/* All required event details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Customer Name</span>
                        <div className="font-bold text-white text-sm">{ev.customerName}</div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Customer Mobile Number</span>
                        <a
                          href={`tel:${ev.customerMobile}`}
                          className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {ev.customerMobile}
                        </a>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Event Date</span>
                        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          {ev.eventDate}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Event Start & End Time</span>
                        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          Start: {ev.eventStartTime} | End: {ev.eventEndTime || 'N/A'}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Event Location / Google Maps</span>
                        <div className="flex items-start gap-1.5 text-zinc-300 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{ev.venue}</span>
                        </div>
                        {ev.googleMapsLink && ev.googleMapsLink !== 'N/A' && (
                          <a
                            href={ev.googleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold mt-1 text-[11px]"
                          >
                            Open in Google Maps ↗
                          </a>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Assigned Task</span>
                        <div className="font-bold text-indigo-400">{ev.assignedRole}</div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Current Status</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase text-[10px]">
                          <Clock className="w-3 h-3" />
                          {ev.taskStatus}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setCalendarModalDate(null);
                          setSelectedBookingDetails(ev);
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Full Order Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 text-right">
              <button
                onClick={() => setCalendarModalDate(null)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
