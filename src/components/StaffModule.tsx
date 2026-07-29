import React, { useState, useEffect } from 'react';
import { useRole } from './RoleContext';
import { MapPin, Calendar, Clock, Briefcase, Camera, User, Phone, MessageSquare, Eye, CheckCircle, AlertCircle, Upload, X, Play, ShieldCheck, ChevronRight, ChevronLeft } from 'lucide-react';
import { Lead, Order, Operation, StaffAssignment, EquipmentHandover } from '../types';
import { supabaseClient } from '../supabaseClient';

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
  const { currentUser, staff, leads, orders, operations, staffAssignments, equipment, leadEquipmentHistory, addLeadEquipmentHistory, refreshData, updateLead } = useRole();

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

  // Photos attached in modal
  const [modalPhotos, setModalPhotos] = useState<Record<string, string>>({});
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
            const currentStaffStatus = staffStatuses[uniqueKey] || op?.event_status || 'Event Scheduled';

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
          const currentStaffStatus = staffStatuses[uniqueKey] || op?.event_status || 'Event Scheduled';

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
    if (stage === 'Equipment Received') {
      reqItems = [{ name: 'Equipment Received Photo', assetId: 'Verification' }];
    } else if (stage === 'Event Start') {
      reqItems = [{ name: 'Event Start Photo', assetId: 'Verification' }];
    } else if (stage === 'Equipment Handover') {
      reqItems = [{ name: 'Equipment Handover Photo', assetId: 'Verification' }];
    } else if (stage === 'Event Complete') {
      reqItems = []; // No photo needed
    }

    // Verify photos if required
    for (const item of reqItems) {
      if (!modalPhotos[item.name]) {
        showToast(`⚠️ Please capture/upload a photo for ${item.name}`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const timestamp = new Date().toISOString();
      const newProofs: EquipmentProofItem[] = reqItems.map(item => ({
        equipmentName: item.name,
        assetId: item.assetId,
        photoUrl: modalPhotos[item.name],
        capturedAt: timestamp
      }));

      // Update local proof storage
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

      // Update staff status
      // We only advance the status on Event Start and Event Complete
      let nextStatus = staffStatuses[booking.key] || 'Event Scheduled';
      if (stage === 'Event Start') {
        nextStatus = 'Event Started';
      } else if (stage === 'Event Complete') {
        nextStatus = 'Event Completed';
      }

      const nextStatuses = {
        ...staffStatuses,
        [booking.key]: nextStatus
      };

      setStaffStatuses(nextStatuses);
      localStorage.setItem('staff_event_statuses_v2', JSON.stringify(nextStatuses));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('staff_status_updated'));
      }

      // Save records into Supabase lead_equipment_history table for durability
      for (const p of newProofs) {
        try {
          await addLeadEquipmentHistory({
            lead_id: booking.leadId,
            order_id: booking.orderId,
            equipment_name: p.equipmentName,
            equipment_status: stage,
            returned_by: staffName,
            returned_at: timestamp,
            remarks: JSON.stringify({
              asset_id: p.assetId,
              proof_type: stage,
              staff_name: staffName,
              photo_url: p.photoUrl,
              event_id: booking.eventId,
              event_name: booking.eventName
            })
          });
        } catch (dbErr) {
          console.warn('Error saving to lead_equipment_history:', dbErr);
        }
      }

      // Sync status to operations table and staff_assignments table ONLY when status actually changes
      if (stage === 'Event Start' || stage === 'Event Complete') {
        try {
          if (supabaseClient && booking.orderId) {
            // 1. Update the individual staff assignment
            await supabaseClient
              .from('staff_assignments')
              .update({
                assignment_status: nextStatus,
                task_status: nextStatus,
                updated_by: staffName
              })
              .eq('order_id', booking.orderId)
              .ilike('staff_name', staffName);

            // 2. Fetch all current staff assignments for this order
            const { data: allStaffAssignments } = await supabaseClient
              .from('staff_assignments')
              .select('assignment_status')
              .eq('order_id', booking.orderId);

            if (allStaffAssignments && allStaffAssignments.length > 0) {
              const allReachedStarted = allStaffAssignments.every(a => ['Event Started', 'Event Completed'].includes(a.assignment_status));
              const allReachedCompleted = allStaffAssignments.every(a => a.assignment_status === 'Event Completed');
              
              let globalNextStatus = null;
              if (allReachedCompleted) {
                globalNextStatus = 'Event Completed';
              } else if (allReachedStarted) {
                globalNextStatus = 'Event Started';
              }
              
              if (globalNextStatus) {
                // Update operations status if unanimous
                await supabaseClient
                  .from('operations')
                  .update({ 
                    event_status: globalNextStatus,
                    remarks: `Updated by System: All staff reached ${globalNextStatus}`
                  })
                  .eq('order_id', booking.orderId);

                // Update lead status if unanimous
                if (booking.leadId) {
                  await updateLead(booking.leadId, { status: globalNextStatus as any });
                }
              }
            }
          }
        } catch (opErr) {
          console.warn('Syncing operation/staff status notice:', opErr);
        }
      }

      setPhotoModalData(null);
      setModalPhotos({});
      showToast(`✅ ${stage} saved successfully!`);
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('❌ Failed to update status. Please try again.');
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
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase">
                              <CheckCircle className="w-3.5 h-3.5" /> Event Complete
                            </span>
                          ) : isStarted ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase">
                              <Play className="w-3.5 h-3.5" /> Event Start
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase">
                              <Clock className="w-3.5 h-3.5" /> Event Scheduled
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedBookingDetails(b)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-zinc-700"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Details
                            </button>

                            {!hasEquipmentReceived && (
                              <button
                                onClick={() => openPhotoModal(b, 'Equipment Received')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Equipment Received
                              </button>
                            )}
                            {hasEquipmentReceived && !hasEventStart && (
                              <button
                                onClick={() => openPhotoModal(b, 'Event Start')}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                              >
                                <Play className="w-3.5 h-3.5" /> Event Start
                              </button>
                            )}
                            {hasEventStart && !hasEquipmentHandover && (
                              <button
                                onClick={() => openPhotoModal(b, 'Equipment Handover')}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-purple-600/10"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Equipment Handover
                              </button>
                            )}
                            {hasEquipmentHandover && !isCompleted && (
                              <button
                                onClick={() => openPhotoModal(b, 'Event Complete')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Event Complete
                              </button>
                            )}
                          </div>
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
      {selectedBookingDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-950/60">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  Order Details • {selectedBookingDetails.orderId}
                </span>
                <h3 className="text-2xl font-black text-white">{selectedBookingDetails.eventName}</h3>
                <p className="text-zinc-400 text-sm mt-0.5">Customer: <strong className="text-white">{selectedBookingDetails.customerName}</strong></p>
              </div>
              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Customer Contacts */}
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Customer Mobile</span>
                  <a
                    href={`tel:${selectedBookingDetails.customerMobile}`}
                    className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold"
                  >
                    <Phone className="w-4 h-4" />
                    {selectedBookingDetails.customerMobile}
                  </a>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">WhatsApp Contact</span>
                  <a
                    href={selectedBookingDetails.customerWhatsapp ? `https://wa.me/91${selectedBookingDetails.customerWhatsapp.replace(/\D/g, '')}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat on WhatsApp ↗
                  </a>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Customer Address</span>
                  <div className="text-zinc-300 text-sm">{selectedBookingDetails.customerAddress}</div>
                </div>
              </div>

              {/* Event Timing & Venue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-4">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Event Date & Time</span>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    {selectedBookingDetails.eventDate}
                  </div>
                  <div className="flex flex-col gap-1 text-zinc-300 text-xs mt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      Reporting: {selectedBookingDetails.reportingDate !== 'N/A' && selectedBookingDetails.reportingDate !== selectedBookingDetails.eventDate ? `${selectedBookingDetails.reportingDate} ` : ''}{selectedBookingDetails.reportingTime}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      Event: {selectedBookingDetails.eventStartTime} {selectedBookingDetails.eventEndTime !== 'N/A' ? `- ${selectedBookingDetails.eventEndTime}` : ''}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-4">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Location / Venue</span>
                  <div className="flex items-start gap-2 text-white font-medium text-xs">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{selectedBookingDetails.venue}</span>
                  </div>
                  {selectedBookingDetails.googleMapsLink && selectedBookingDetails.googleMapsLink !== 'N/A' && (
                    <a
                      href={selectedBookingDetails.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 mt-2"
                    >
                      Open in Google Maps ↗
                    </a>
                  )}
                  <div className="mt-3 pt-3 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] font-mono uppercase text-zinc-500 block">Event Type</span>
                      <span className="font-semibold text-zinc-300">{selectedBookingDetails.shootType}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase text-zinc-500 block">Guest Pax</span>
                      <span className="font-semibold text-zinc-300">{selectedBookingDetails.guestPax}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Task & Equipment */}
              <div className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Assigned Task / Role</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                      <Briefcase className="w-4 h-4" />
                      {selectedBookingDetails.assignedRole}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Current Staff Status</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                      <Clock className="w-4 h-4" />
                      {selectedBookingDetails.taskStatus}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Assigned Equipment (Your Gear)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(selectedBookingDetails.equipmentItems || []).map((item: any, idx: number) => (
                      <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white text-xs truncate">{item.name}</div>
                          <div className="text-[10px] font-mono text-zinc-400">ID: {item.assetId}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Equipment Photo Proofs History */}
              {(() => {
                const proofs = staffProofs[selectedBookingDetails.key] || {};
                return (
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> Equipment Photo Verification History
                    </h4>

                    {/* Event Start Photos */}
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-2">1. Event Start Photo Proofs</span>
                      {proofs.startProofs && proofs.startProofs.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {proofs.startProofs.map((p, idx) => (
                            <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 space-y-1.5">
                              <img src={p.photoUrl} alt={p.equipmentName} className="w-full h-24 object-cover rounded-lg border border-zinc-700" />
                              <div className="text-[10px] font-bold text-white truncate">{p.equipmentName}</div>
                              <div className="text-[9px] font-mono text-emerald-400">✅ Verified Start</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-xs italic">No Event Start photos submitted yet.</p>
                      )}
                    </div>

                    {/* Event Complete Photos */}
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-2">2. Event Complete Photo Proofs</span>
                      {proofs.completeProofs && proofs.completeProofs.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {proofs.completeProofs.map((p, idx) => (
                            <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 space-y-1.5">
                              <img src={p.photoUrl} alt={p.equipmentName} className="w-full h-24 object-cover rounded-lg border border-zinc-700" />
                              <div className="text-[10px] font-bold text-white truncate">{p.equipmentName}</div>
                              <div className="text-[9px] font-mono text-emerald-400">✅ Verified Return</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-xs italic">No Event Complete photos submitted yet.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 text-right">
              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

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
                      { name: 'Equipment Taken Image', assetId: 'Verification' },
                      { name: 'Event Start Image', assetId: 'Verification' }
                    ]
                  : [
                      { name: 'Equipment Handover Image', assetId: 'Verification' },
                      { name: 'Event End Image', assetId: 'Verification' }
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
                              capture="environment"
                              onChange={(e) => handlePhotoCapture(item.name, e)}
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
                            Capture or Upload Equipment Photo
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">Use phone camera or choose file</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handlePhotoCapture(item.name, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
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
