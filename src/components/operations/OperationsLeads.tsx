import React, { useState, useMemo, useEffect } from 'react';
import { useRole } from '../RoleContext';
import { 
  X, Users, Briefcase, Camera, Video, Compass, Clock, Clipboard, FileCheck, CheckCircle, Eye, Search, Calendar, MapPin
} from 'lucide-react';
import { Order, CurrentStage, Staff, Equipment } from '../../types';
import { StatusText } from '../ui/StatusText';
import { ProjectDetailModal } from '../ProjectDetailModal';
import { CameraLensStatsCard, CameraLensTheme } from '../CameraLensStatsCard';
import { convertTimeToDbFormat, triggerAutoScrollAndFocus } from '../../utils';
import { supabaseClient } from '../../supabaseClient';

export const OperationsLeads: React.FC = () => {
  const { 
    currentRole, 
    currentUserName,
    orders, 
    operations, 
    staff, 
    equipment, 
    assignOperations, 
    markEventCompleted, 
    confirmRawFootageReceived,
    updateOrderStage,
    rawFootage,
    staffAssignments,
    saveStaffAssignments,
    payments,
    equipmentHandovers,
    addEquipmentHandovers,
    isDepartmentAllowedToEdit,
    leads,
    leadPackages,
    leadStaffAssignmentHistory,
    updateEquipment,
    refreshData,
    addLeadEquipmentHistory,
    getLeadCurrentStatus,
    packages,
    quotations
  } = useRole();

  useEffect(() => {
    refreshData();
  }, []);

  // Anchor date June 15, 2026
  const systemToday = new Date();
  
  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const todayStr = getLocalDateStr(systemToday);

  // Helper to parse date and time into a single comparable Date object
  const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr) return null;
    
    let hours = 0;
    let minutes = 0;
    const normalizedTime = (timeStr || '00:00').trim();
    
    const ampmMatch = normalizedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    const hourMinMatch = normalizedTime.match(/(\d+):(\d+)/);
    
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1], 10);
      minutes = parseInt(ampmMatch[2], 10);
      const ampm = ampmMatch[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else if (hourMinMatch) {
      hours = parseInt(hourMinMatch[1], 10);
      minutes = parseInt(hourMinMatch[2], 10);
    }
    
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) return null;
    
    parsedDate.setHours(hours, minutes, 0, 0);
    return parsedDate;
  };

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Track which order's action dropdown is open
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMenuOrderId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.actions-menu-container')) {
        setActiveMenuOrderId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeMenuOrderId]);

  // Multi-Select Searchable Equipment States
  const [selectedKits, setSelectedKits] = useState<string[]>([]);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
  const [equipmentSearchQueryByEvent, setEquipmentSearchQueryByEvent] = useState<Record<string, string>>({});
  const [isEquipmentDropdownOpenByEvent, setIsEquipmentDropdownOpenByEvent] = useState<Record<string, boolean>>({});

  // Equipment return handover state
  const [handoverStates, setHandoverStates] = useState<Record<string, {
    return_status: 'Returned' | 'Not Returned' | 'Damaged' | 'Missing';
    returned_by: string;
    return_date: string;
    notes: string;
  }>>({});

  // Sorting state
  const [sortBy, setSortBy] = useState<'event_date' | 'customer_name' | 'status' | 'assignment_date'>('event_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dual Dropdown and Multi-Staff Assign State
  const [activeAssignments, setActiveAssignments] = useState<{ staff_role: string; staff_id: string; staff_name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState('Lead Photographer');
  const [selectedStaffByEvent, setSelectedStaffByEvent] = useState<Record<string, string>>({});
  const [staffTypeByEvent, setStaffTypeByEvent] = useState<Record<string, 'In-House' | 'Freelancer'>>({});
  const [selectedStaff, setSelectedStaff] = useState('');
  
  const [assignForm, setAssignForm] = useState<any>({
    photographer_assigned: '',
    videographer_assigned: '',
    drone_operator_assigned: '',
    assistant_assigned: '',
    equipment_kit: '',
    reporting_time: '',
    remarks: '',
    event_date: '',
    event_time: ''
  });

  // Modals / Selection states
  const [activeModalOrderId, setActiveModalOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const canEdit = (currentRole === 'Operations Team' || currentRole === 'Business Owner');
  const [projectDossierId, setProjectDossierId] = useState<string | null>(null);
  
  // Inline edit state for assignment
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [eventAllocations, setEventAllocations] = useState<Record<string, {
    reporting_date: string;
    reporting_time: string;
    event_start_time: string;
    event_end_time: string;
    staff: { staff_role: string, staff_id: string, staff_name: string }[];
  }>>({});

  // Find order and lead for assigning modal
  const activeOrderInstance = useMemo(() => {
    return assigningOrderId ? orders.find((o) => o.order_id === assigningOrderId) : null;
  }, [assigningOrderId, orders]);

  const parentLeadInstance = useMemo(() => {
    return activeOrderInstance ? (leads || []).find((l) => l.lead_id === activeOrderInstance.lead_id) : null;
  }, [activeOrderInstance, leads]);

  const googleMapsLocationLink = useMemo(() => {
    if (parentLeadInstance?.google_maps_link) {
      return parentLeadInstance.google_maps_link;
    }
    if (parentLeadInstance?.events && parentLeadInstance.events.length > 0) {
      const eventWithLink = parentLeadInstance.events.find((ev: any) => ev.google_maps_link);
      if (eventWithLink) {
        return eventWithLink.google_maps_link;
      }
    }
    return null;
  }, [parentLeadInstance]);

  const selectedLeadPkgs = useMemo(() => {
    return activeOrderInstance && leadPackages 
      ? leadPackages.filter((lp) => lp.lead_id === (activeOrderInstance.lead_id || activeOrderInstance.order_id)) 
      : [];
  }, [activeOrderInstance, leadPackages]);

  const packageDetailsString = useMemo(() => {
    return selectedLeadPkgs.length > 0 
      ? selectedLeadPkgs.map((lp) => `${lp.package_name || 'Generic Package'} (Qty: ${lp.quantity || 1}, Cost: ₹${(lp.final_amount ?? lp.total_amount ?? 0).toLocaleString('en-IN')})`).join('\n')
      : 'No packages listed';
  }, [selectedLeadPkgs]);

  const teamMembersIncluded = useMemo(() => {
    const leadQuotations = quotations?.filter(q => q.lead_id === parentLeadInstance?.lead_id) || [];
    leadQuotations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestQuote = leadQuotations[0];
    
    let finalInclusions: string[] = [];

    if (latestQuote) {
      let metadata: any = null;
      if (latestQuote.editableInclusions) {
        metadata = { editableInclusions: latestQuote.editableInclusions };
      } else if (latestQuote.terms_conditions && latestQuote.terms_conditions.includes('METADATA:')) {
        try {
          const metaStr = latestQuote.terms_conditions.split('METADATA:')[1];
          metadata = JSON.parse(metaStr);
        } catch (e) {}
      }

      if (metadata && metadata.editableInclusions) {
         Object.values(metadata.editableInclusions).forEach((incList: any) => {
           if (Array.isArray(incList)) {
             incList.forEach(inc => {
               if (inc) finalInclusions.push(inc);
             });
           }
         });
      }
    }

    if (finalInclusions.length > 0) {
      return finalInclusions.join('\n');
    }

    return 'No team members finalized in quotation.';
  }, [quotations, parentLeadInstance]);

  // State for completing shoot
  const [closingOrderId, setClosingOrderId] = useState<string | null>(null);
  const [serverPath, setServerPath] = useState('');

  // Event Scheduling Modal State (Step 2)
  const [schedulingOrderId, setSchedulingOrderId] = useState<string | null>(null);
  const [scheduleEventForm, setScheduleEventForm] = useState({
    event_date: '',
    event_time: '',
    reporting_time: '',
    remarks: ''
  });

  // Raw Footage Modal State
  const [receivingFootageOrderId, setReceivingFootageOrderId] = useState<string | null>(null);
  const [footageForm, setFootageForm] = useState({
    footage_link: '',
    storage_type: 'Google Drive',
    upload_notes: ''
  });
  const [hardDiskReceived, setHardDiskReceived] = useState(false);
  const [memoryCardReceived, setMemoryCardReceived] = useState(false);
  const [footageHandoverStates, setFootageHandoverStates] = useState<Record<string, {
    return_status: 'Returned' | 'Not Returned' | 'Damaged' | 'Missing';
    returned_by: string;
    return_date: string;
    notes: string;
  }>>({});

  const [paymentCollectionStatus, setPaymentCollectionStatus] = useState<'Full Payment Received' | 'Partial Payment Received' | 'Payment Pending'>('Payment Pending');
  const [additionalReceived, setAdditionalReceived] = useState<number>(0);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    if (receivingFootageOrderId) {
      const existingPayment = payments.find((p) => p.order_id === receivingFootageOrderId);
      setTransactionId(existingPayment?.transaction_id || '');
    } else {
      setTransactionId('');
    }
  }, [receivingFootageOrderId, payments]);

  // Staff Assignment Success Popup State
  const [successModalData, setSuccessModalData] = useState<{
    orderId: string;
    customerName: string;
    order: Order;
    assignments: { staff_role: string; staff_name: string }[];
  } | null>(null);

  // Multi-Staff WhatsApp Share Modal State
  const [whatsappShareModalData, setWhatsappShareModalData] = useState<{
    orderId: string;
    order: Order;
    staffNames: string[];
  } | null>(null);

  const [viewingStaffOrderId, setViewingStaffOrderId] = useState<string | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (whatsappShareModalData) {
      const initialMsgs: Record<string, string> = {};
      whatsappShareModalData.staffNames.forEach(name => {
        initialMsgs[name] = generateWhatsAppMessageForStaff(whatsappShareModalData.order, name);
      });
      setEditedMessages(initialMsgs);
    } else {
      setEditedMessages({});
    }
  }, [whatsappShareModalData]);

  // Helper to get assigned staff names for an order
  const getAssignedStaffNamesForOrder = (ord: Order): string[] => {
    const lead = leads.find(l => l.lead_id === ord.lead_id);
    const fromEvents: string[] = [];
    if (lead?.events) {
      lead.events.forEach((ev) => {
        if (ev.assigned_staff_names) {
          ev.assigned_staff_names.split(',').forEach((n: string) => {
            const trimmed = n.trim();
            if (trimmed) {
              fromEvents.push(trimmed);
            }
          });
        }
      });
    }
    
    if (fromEvents.length > 0) {
      return Array.from(new Set(fromEvents));
    }
    
    // Fallback to order assignments
    const orderAssigns = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id) : [];
    const fromAssigns = orderAssigns.map(sa => sa.staff_name).filter(Boolean);
    return Array.from(new Set(fromAssigns));
  };

  interface AssignedStaffDetails {
    staff_name: string;
    staff_role: string;
    staff_type: 'In-House' | 'Freelancer';
    mobile: string;
    event_name: string;
    event_date: string;
    reporting_date: string;
    reporting_time: string;
    status: 'Available' | 'Busy';
    google_maps_link?: string;
    assigned_equipment?: string[];
    event_time?: string;
  }

  const isStaffBusyOnDate = (staffName: string, targetDate: string, currentOrderId?: string) => {
    if (!targetDate) return false;
    
    return leads?.some(otherLead => {
      if (otherLead.status === 'Lost Lead') return false;
      
      const otherOrder = orders.find(o => o.lead_id === otherLead.lead_id || o.order_id === otherLead.lead_id);
      if (otherOrder && isCompletedEvent(otherOrder)) return false;
      if (currentOrderId && otherOrder?.order_id === currentOrderId) return false;
      
      // Check events
      if (otherLead.events && otherLead.events.length > 0) {
        return otherLead.events.some(otherEv => {
          const otherEvDate = otherEv.event_date;
          if (otherEvDate === targetDate) {
            const assignedNames = otherEv.assigned_staff_names
              ? otherEv.assigned_staff_names.split(',').map((s: string) => s.trim())
              : [];
            return assignedNames.includes(staffName);
          }
          return false;
        });
      } else {
        // Check default event
        if (otherLead.event_date === targetDate) {
          // Check if assigned
          let assignmentsHistory = leadStaffAssignmentHistory ? leadStaffAssignmentHistory.filter(h => h.lead_id === otherLead.lead_id) : [];
          if (assignmentsHistory.length === 0 && otherOrder) {
            assignmentsHistory = leadStaffAssignmentHistory ? leadStaffAssignmentHistory.filter(h => h.order_id === otherOrder.order_id) : [];
          }
          return assignmentsHistory.some(h => h.assigned_staff?.trim() === staffName);
        }
      }
      return false;
    });
  };

  const getAssignedStaffDetailsForOrder = (ord: Order): AssignedStaffDetails[] => {
    const lead = leads.find(l => l.lead_id === ord.lead_id);
    const staffDetailsList: AssignedStaffDetails[] = [];
    
    // Find order level op details for default equipment / times
    const op = getOpDetails(ord.order_id);
    
    if (lead?.events && lead.events.length > 0) {
      lead.events.forEach(ev => {
        if (ev.assigned_staff_names) {
          const names = ev.assigned_staff_names.split(',').map((n: string) => n.trim()).filter(Boolean);
          
          let assignedEquipment: string[] = [];
          let mobilesRaw = ev.assigned_staff_mobiles || '';
          if (mobilesRaw.includes(' || EQUIPMENT: ')) {
            const parts = mobilesRaw.split(' || EQUIPMENT: ');
            assignedEquipment = parts[1] ? parts[1].split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          }
          
          names.forEach(name => {
            const st = staff?.find(s => s.name === name);
            
            // Determine their assigned role
            // Look up in staff_assignments
            const saMatch = staffAssignments?.find(sa => sa.order_id === ord.order_id && sa.staff_name === name);
            const assignedRole = saMatch?.staff_role || st?.role || 'Staff';
            
            staffDetailsList.push({
              staff_name: name,
              staff_role: assignedRole,
              staff_type: st?.staff_type || 'In-House',
              mobile: st?.mobile || '',
              event_name: ev.event_name || ord.event_type || 'Event',
              event_date: ev.event_date || ord.event_date || '',
              reporting_date: ev.reporting_date || lead.Reporting_date || ev.event_date || '',
              reporting_time: ev.reporting_time || ord.reporting_time || op?.reporting_time || '',
              status: isStaffBusyOnDate(name, ev.event_date || ord.event_date || '', ord.order_id) ? 'Busy' : 'Available',
              google_maps_link: ev.google_maps_link || lead.google_maps_link || '',
              assigned_equipment: assignedEquipment,
              event_time: ev.event_start_time || ord.event_time || ''
            });
          });
        }
      });
    } else {
      // Treat order/lead as a single event
      // Find all assigned staff from staffAssignments
      const orderAssignments = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id) : [];
      
      if (orderAssignments.length > 0) {
        orderAssignments.forEach(sa => {
          const name = sa.staff_name;
          const st = staff?.find(s => s.name === name);
          
          // Find assigned equipment from op
          const assignedEquipment = op?.equipment_kit ? op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          
          staffDetailsList.push({
            staff_name: name,
            staff_role: sa.staff_role || st?.role || 'Staff',
            staff_type: st?.staff_type || 'In-House',
            mobile: st?.mobile || '',
            event_name: ord.event_type || 'Main Event',
            event_date: ord.event_date || '',
            reporting_date: ord.Reporting_date || lead?.Reporting_date || ord.event_date || '',
            reporting_time: ord.reporting_time || op?.reporting_time || '',
            status: isStaffBusyOnDate(name, ord.event_date || '', ord.order_id) ? 'Busy' : 'Available',
            google_maps_link: lead?.google_maps_link || '',
            assigned_equipment: assignedEquipment,
            event_time: ord.event_time || ''
          });
        });
      }
    }
    
    return staffDetailsList;
  };

  // Helper to generate personalized WhatsApp message for a staff member
  const generateWhatsAppMessageForStaff = (ord: Order, staffName: string) => {
    const lead = leads.find(l => l.lead_id === ord.lead_id);
    const coordinatorStaff = staff?.find(s => s.name === currentUserName);
    const coordinatorContact = coordinatorStaff ? `${coordinatorStaff.name} (${coordinatorStaff.mobile || 'N/A'})` : `${currentUserName || 'Operations Team'}`;
    
    const clientName = ord.customer_name;
    const clientContact = ord.mobile || (lead ? lead.mobile : 'N/A');

    // Find all events for this lead where this staff member is assigned
    const assignedEvents = lead?.events?.filter(ev => {
      const names = ev.assigned_staff_names ? ev.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase()) : [];
      return names.includes(staffName.toLowerCase());
    }) || [];

    let text = `*STAFF WORK ASSIGNMENT*\n`;
    text += `Hello *${staffName}*, here are your shoot details:\n\n`;
    text += `*Client Name*: ${clientName}\n`;
    text += `*Client Contact Number*: ${clientContact}\n`;
    text += `*Coordinator / Operations Contact*: ${coordinatorContact}\n\n`;

    if (assignedEvents.length === 0) {
      // Fallback if events are empty or staff is assigned generally to the order
      const shootType = ord.shoot_type || (lead ? lead.shoot_type : 'N/A');
      const eventName = ord.event_type;
      const eventDate = ord.event_date;
      const eventTime = ord.event_time;
      const location = lead?.event_location || ord.event_location || 'N/A';
      const mapsLink = (lead as any)?.google_maps_link || 'N/A';
      const staffObj = staff?.find(s => s.name === staffName);
      const assignedRole = staffObj ? staffObj.role : 'Crew';
      
      text += `*EVENT DETAILS*\n`;
      text += `• *Event Name*: ${eventName}\n`;
      text += `• *Shoot Type*: ${shootType}\n`;
      text += `• *Event Date*: ${eventDate}\n`;
      text += `• *Event Time*: ${eventTime}\n`;
      text += `• *Reporting Date*: ${lead?.Reporting_date || eventDate || 'N/A'}\n`;
      text += `• *Reporting Time*: ${lead?.reporting_time || 'N/A'}\n`;
      text += `• *Reporting Location*: ${location}\n`;
      if (mapsLink && mapsLink !== 'N/A') {
        text += `• *Google Maps Link*: ${mapsLink}\n`;
      }
      text += `• *Assigned Role*: ${assignedRole}\n`;
      
      // Assigned Equipment
      const op = operations?.find(o => o.order_id === ord.order_id);
      const assignedEquipment = op?.equipment_kit || 'None';
      text += `• *Assigned Equipment*: ${assignedEquipment}\n`;
    } else {
      assignedEvents.forEach((ev, idx) => {
        const eventName = ev.event_type === 'Other' ? (ev.event_name || 'Other') : (ev.event_type || 'N/A');
        const shootType = ev.event_shoot_type || 'N/A';
        const eventDate = ev.event_date || 'N/A';
        const eventTime = (ev.event_start_time || ev.event_end_time) ? `${ev.event_start_time || ''} - ${ev.event_end_time || ''}` : 'N/A';
        const reportingDate = ev.reporting_date || ev.event_date || 'N/A';
        const reportingTime = ev.reporting_time || 'N/A';
        const location = ev.event_location || lead?.event_location || 'N/A';
        const mapsLink = ev.google_maps_link || 'N/A';
        const staffObj = staff?.find(s => s.name === staffName);
        const assignedRole = staffObj ? staffObj.role : 'Crew';
        
        // Parse event equipment
        let assignedEquipment = 'None';
        const mobilesRaw = ev.assigned_staff_mobiles || '';
        if (mobilesRaw.includes(' || EQUIPMENT: ')) {
          const parts = mobilesRaw.split(' || EQUIPMENT: ');
          assignedEquipment = parts[1] || 'None';
        }

        text += `*EVENT ${idx + 1}: ${eventName}*\n`;
        text += `• *Shoot Type*: ${shootType}\n`;
        text += `• *Event Date*: ${eventDate}\n`;
        text += `• *Event Time*: ${eventTime}\n`;
        text += `• *Reporting Date*: ${reportingDate}\n`;
        text += `• *Reporting Time*: ${reportingTime}\n`;
        text += `• *Reporting Location*: ${location}\n`;
        if (mapsLink && mapsLink !== 'N/A') {
          text += `• *Google Maps Link*: ${mapsLink}\n`;
        }
        text += `• *Assigned Role*: ${assignedRole}\n`;
        text += `• *Assigned Equipment*: ${assignedEquipment}\n\n`;
      });
    }

    // Get Team Name / Package Name
    const leadPkg = leadPackages?.find(lp => lp.lead_id === ord.lead_id);
    if (leadPkg?.package_name) {
      text += `*Team Name / Package*: ${leadPkg.package_name}\n`;
    }

    return text;
  };

  // Filter orders to show confirmed ones for Operations
  const allowedStages = ['Order Confirmed', 'New Order Received', 'Operations Assigned', 'Event Scheduled', 'Staff Assigned', 'Event Completed', 'Raw Footage Received', 'Event Cancelled'];
  const operationsOrders = orders.filter(o => {
    return allowedStages.includes(o.current_stage);
  });

  // Unique staff lists for individual filters
  const photographersList = useMemo(() => {
    return staff ? Array.from(new Set(staff.filter(s => s.role.toLowerCase().includes('photo')).map(s => s.name))) : [];
  }, [staff]);

  const videographersList = useMemo(() => {
    return staff ? Array.from(new Set(staff.filter(s => s.role.toLowerCase().includes('video')).map(s => s.name))) : [];
  }, [staff]);

  const droneOperatorsList = useMemo(() => {
    return staff ? Array.from(new Set(staff.filter(s => s.role.toLowerCase().includes('drone') || s.role.toLowerCase().includes('aerial')).map(s => s.name))) : [];
  }, [staff]);

  const assistantsList = useMemo(() => {
    return staff ? Array.from(new Set(staff.filter(s => s.role.toLowerCase().includes('assist') || s.role.toLowerCase().includes('production')).map(s => s.name))) : [];
  }, [staff]);

  // Search filtered orders
  const isWithinDateRange = (dateStr: string, filterType: string, customStart?: string, customEnd?: string) => {
    if (!dateStr) return false;
    
    // Normalise dateStr
    let normStr = dateStr;
    if (dateStr.includes('T')) {
      normStr = dateStr.split('T')[0];
    }
    const itemDate = new Date(normStr);
    itemDate.setHours(0, 0, 0, 0);

    const today = systemToday;
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (filterType === 'Today') {
      return itemDate.getTime() === today.getTime();
    }
    if (filterType === 'Tomorrow') {
      return itemDate.getTime() === tomorrow.getTime();
    }
    if (filterType === 'This Week') {
      // Calculate start and end of week (June 15 to June 21, 2026)
      const startOfWeek = new Date(today); // June 15
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 6); // June 21
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    }
    if (filterType === 'This Month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return itemDate >= startOfMonth && itemDate <= endOfMonth;
    }
    if (filterType === 'Custom') {
      if (!customStart && !customEnd) return true;
      const start = customStart ? new Date(customStart) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = customEnd ? new Date(customEnd) : null;
      if (end) end.setHours(23, 59, 59, 999);
      
      if (start && end) return itemDate >= start && itemDate <= end;
      if (start) return itemDate >= start;
      if (end) return itemDate <= end;
    }
    return true;
  };

  const getOpDetails = (orderId: string) => {
    return operations.find(o => o.order_id === orderId);
  };

  const filteredOrders = useMemo(() => {
    const baseSource = operationsOrders;

    return baseSource.filter(o => {
      // Search term validation (Search by Customer Name, Order ID, Mobile Number)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          o.order_id.toLowerCase().includes(term) ||
          o.customer_name.toLowerCase().includes(term) ||
          (o.mobile && o.mobile.toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }

      // 1. Status Dropdown filter
      if (statusFilter !== 'All') {
        const isStaffAssigned = staffAssignments ? staffAssignments.some(x => x.order_id === o.order_id) : false;
        
        if (statusFilter === 'Order Confirmed' && o.current_stage !== 'Order Confirmed') return false;
        if (statusFilter === 'Operations Assigned' && o.current_stage !== 'Operations Assigned') return false;
        if (statusFilter === 'Staff Assigned' && !isStaffAssigned) return false;
        if (statusFilter === 'Event Scheduled' && o.current_stage !== 'Event Scheduled') return false;
        if (statusFilter === 'Event Completed') {
          return isCompletedEvent(o);
        }
        if (statusFilter === 'Raw Footage Received' && o.current_stage !== 'Raw Footage Received') return false;

        // Custom stats click metrics
        if (statusFilter === 'New Orders') {
          if (o.current_stage !== 'Order Confirmed' && o.current_stage !== 'New Order Received') return false;
        }
        if (statusFilter === "Today's Events") {
          const todayStr = new Date().toISOString().split('T')[0];
          const hasTodayEvent = (!o.events || o.events.length === 0) 
            ? o.event_date === todayStr
            : o.events.some(e => e.event_date === todayStr);
          if (!hasTodayEvent) return false;
        }
        if (statusFilter === 'Scheduled Events' && o.current_stage !== 'Event Scheduled') return false;
        if (statusFilter === 'Pending Assignments') {
          if (o.current_stage !== 'Operations Assigned' && !(o.current_stage === 'Order Confirmed' && !isStaffAssigned)) return false;
        }
        if (statusFilter === 'Completed' && !isCompletedEvent(o)) return false;
        
        if (statusFilter === 'Pending' && (o.current_stage !== 'Order Confirmed' && o.current_stage !== 'Operations Assigned')) return false;
        if (statusFilter === 'Raw Footage Pending') {
          const rf = rawFootage ? rawFootage.find(f => f.order_id === o.order_id) : null;
          const isMatch = o.current_stage === 'Event Completed' && (!rf || !rf.raw_received || rf.ingest_status === 'Pending');
          if (!isMatch) return false;
        }
        if (statusFilter === 'Ready for Production') {
          const isMatch = ['Raw Footage Received', 'Editor Assigned', 'Editing Started'].includes(o.current_stage);
          if (!isMatch) return false;
        }
      }

      // 2. Date Filter based on Event Date
      if (dateFilter !== 'All') {
        if (!isWithinDateRange(o.event_date, dateFilter, customStartDate, customEndDate)) {
          return false;
        }
      }

      return true;
    });
  }, [
    orders,
    operationsOrders,
    searchTerm,
    statusFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    staffAssignments,
    rawFootage,
    operations
  ]);

  // Sorted list implementation
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortBy === 'customer_name') {
        valA = a.customer_name.toLowerCase();
        valB = b.customer_name.toLowerCase();
      } else if (sortBy === 'event_date') {
        valA = a.event_date;
        valB = b.event_date;
      } else if (sortBy === 'status') {
        valA = a.current_stage.toLowerCase();
        valB = b.current_stage.toLowerCase();
      } else if (sortBy === 'assignment_date') {
        const assignsA = staffAssignments ? staffAssignments.filter(x => x.order_id === a.order_id) : [];
        const assignsB = staffAssignments ? staffAssignments.filter(x => x.order_id === b.order_id) : [];
        valA = assignsA.length > 0 ? assignsA[0].assignment_date : 'ZZZZ-ZZ-ZZ'; // place unassigned last
        valB = assignsB.length > 0 ? assignsB[0].assignment_date : 'ZZZZ-ZZ-ZZ';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredOrders, sortBy, sortOrder, staffAssignments]);

  const startAssigning = (order: Order) => {
    const op = getOpDetails(order.order_id);
    const rf = rawFootage ? rawFootage.find(f => f.order_id === order.order_id) : null;
    
    // Check if this is a brand new assignment (Order Confirmed stage means it has not been assigned yet)
    const isNewAssignment = order.current_stage === 'Order Confirmed';

    // REQUIRED FIX: Do NOT pre-select any staff. Staff selection must always be blank.
    setActiveAssignments([]);

    const targetLead = leads?.find(l => l.lead_id === order.lead_id);
    const initialAllocations: Record<string, any> = {};
    if (targetLead?.events && targetLead.events.length > 0) {
      targetLead.events.forEach((ev, index) => {
        const evId = ev.id || `EV-N/A-${index}`;
        const staffList: any[] = [];
        if (ev.assigned_staff_names) {
          const names = ev.assigned_staff_names.split(',').map(n => n.trim()).filter(Boolean);
          names.forEach(name => {
            const st = staff?.find(s => s.name === name);
            if (st) {
               staffList.push({
                 staff_role: st.role,
                 staff_id: st.staff_id,
                 staff_name: st.name,
                 mobile: st.mobile
               });
            } else {
               staffList.push({
                 staff_role: 'Staff',
                 staff_id: 'MOCK-' + Math.random().toString(36).substr(2, 4),
                 staff_name: name,
                 mobile: ''
               });
            }
          });
        }

        let assignedEquipment: string[] = [];
        let mobilesRaw = ev.assigned_staff_mobiles || '';
        if (mobilesRaw.includes(' || EQUIPMENT: ')) {
          const parts = mobilesRaw.split(' || EQUIPMENT: ');
          mobilesRaw = parts[0];
          assignedEquipment = parts[1] ? parts[1].split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        }

        initialAllocations[evId] = {
           reporting_date: targetLead.Reporting_date || ev.event_date || '',
           reporting_time: ev.reporting_time || '',
           event_start_time: ev.event_start_time || '',
           event_end_time: ev.event_end_time || '',
           staff: staffList,
           equipment: assignedEquipment
        };
      });
    } else if (targetLead) {
       initialAllocations['default'] = {
           reporting_date: targetLead.Reporting_date || '',
           reporting_time: targetLead.reporting_time || '',
           event_start_time: '',
           event_end_time: '',
           staff: [],
           equipment: []
       };
     }
    setEventAllocations(initialAllocations);
    setEquipmentSearchQueryByEvent({});
    setIsEquipmentDropdownOpenByEvent({});
    setSelectedStaffByEvent({});

    setAssignForm({
      photographer_assigned: '',
      videographer_assigned: '',
      drone_operator_assigned: '',
      assistant_assigned: '',
      equipment_kit: isNewAssignment ? '' : (op?.equipment_kit || ''),
      reporting_time: order.reporting_time || op?.reporting_time || '08:00',
      remarks: isNewAssignment ? '' : (op?.remarks || ''),
      event_status: 'Event Scheduled',
      current_stage: order.current_stage || 'Event Scheduled',
      raw_footage_link: isNewAssignment ? '' : (rf?.server_path || ''),
      event_date: order.event_date || op?.event_date || '',
      event_time: order.event_time || op?.event_time || ''
    });
    setAssigningOrderId(order.order_id);
    
    // Initialize selectedKits
    const kits = isNewAssignment ? [] : (op?.equipment_kit ? op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    setSelectedKits(kits);
    setEquipmentSearchQuery('');
    setIsEquipmentDropdownOpen(false);
    
    // Default selected values
    setSelectedRole('Lead Photographer');
    setSelectedStaff('');
  };

  useEffect(() => {
    if (assigningOrderId) {
      triggerAutoScrollAndFocus('#assign_staff_modal', 150);
    }
  }, [assigningOrderId]);

  useEffect(() => {
    if (receivingFootageOrderId) {
      triggerAutoScrollAndFocus('#raw_footage_modal', 150);
    }
  }, [receivingFootageOrderId]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrderId || isSaving) return;
    
    // Validate required fields
    const hasAnyAllocations = Object.values(eventAllocations).some((alloc: any) => alloc.staff && alloc.staff.length > 0);
    if (activeAssignments.length === 0 && !hasAnyAllocations) {
      alert("Please assign at least one staff member.");
      return;
    }
    if (!assignForm.event_date) {
      alert("Please select an event date.");
      return;
    }
    if (!assignForm.reporting_time) {
      alert("Please select a reporting time.");
      return;
    }

    // NEW: Equipment Validation
    if (assignForm.equipment_kit) {
      const kitsToAssign = assignForm.equipment_kit.split(',').map(s => s.trim()).filter(Boolean);
      for (const kitName of kitsToAssign) {
        const found = equipment.find(eq => eq.equipment_name === kitName);
        if (!found) {
          alert(`Equipment "${kitName}" not found in inventory.`);
          return;
        }
        if (found.status !== 'Available' && found.status !== 'Active') {
          alert(`Equipment "${kitName}" is currently ${found.status} and cannot be assigned.`);
          return;
        }
      }
    }

    try {
      setIsSaving(true);

      // Collect ALL assigned staff across all events into activeAssignments so they are recorded correctly
      const allAssignedStaff: { staff_role: string; staff_id: string; staff_name: string }[] = [];
      Object.values(eventAllocations).forEach((alloc: any) => {
        if (alloc.staff && alloc.staff.length > 0) {
          alloc.staff.forEach((st: any) => {
            if (!allAssignedStaff.find(a => a.staff_name === st.staff_name)) {
               allAssignedStaff.push({
                 staff_role: st.staff_role,
                 staff_id: st.staff_id,
                 staff_name: st.staff_name
               });
            }
          });
        }
      });

      // Gather all selected equipment across all events
      const allAssignedEquipment = Array.from(
        new Set(
          Object.values(eventAllocations).flatMap((alloc: any) => alloc.equipment || [])
        )
      ) as string[];
      const consolidatedEquipKit = allAssignedEquipment.join(', ');
      
      // Update lead_events table with assigned staff AND event-specific equipment
      const baseMatchedOrder = orders.find(o => o.order_id === assigningOrderId);
      if (supabaseClient && baseMatchedOrder?.lead_id) {
         for (const evId of Object.keys(eventAllocations)) {
            const alloc = eventAllocations[evId];
            if (evId !== 'default' && alloc.staff) {
               const staffNames = alloc.staff.map((s: any) => s.staff_name).join(', ');
               const staffMobiles = alloc.staff.map((s: any) => s.mobile || '').join(', ');

               const eventEquipmentList = alloc.equipment || [];
               const equipStr = eventEquipmentList.join(', ');
               const finalStaffMobiles = staffMobiles + (equipStr ? ' || EQUIPMENT: ' + equipStr : '');

               await supabaseClient.from('lead_events')
                  .update({ assigned_staff_names: staffNames, assigned_staff_mobiles: finalStaffMobiles })
                  .eq('id', evId);
            }
         }
      }

      // Save the multi-staff role assignments to Supabase & Context state!
      await saveStaffAssignments(assigningOrderId, allAssignedStaff.length > 0 ? allAssignedStaff : activeAssignments);
      
      // Update data so that UI reflects new crew directly from lead_staff_assignment_history
      refreshData();

      // Update equipment status in real-time
      if (equipment && updateEquipment) {
        const op = getOpDetails(assigningOrderId);
        const previousKits = op?.equipment_kit ? op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const removedKits = previousKits.filter(pk => !allAssignedEquipment.includes(pk));
        
        for (const kitStr of removedKits) {
          const found = equipment.find(eq => eq.equipment_name === kitStr);
          if (found) {
            await updateEquipment(found.equipment_id, { status: 'Available' });
          }
        }

        for (const kitStr of allAssignedEquipment) {
          const found = equipment.find(eq => eq.equipment_name === kitStr);
          if (found) {
            await updateEquipment(found.equipment_id, { status: 'Assigned' });
            
            // NEW: Record History
            if (addLeadEquipmentHistory) {
              const matchedOrder = orders.find(o => o.order_id === assigningOrderId);
              await addLeadEquipmentHistory({
                lead_id: matchedOrder?.lead_id || 'UNKNOWN',
                order_id: assigningOrderId,
                equipment_name: found.equipment_name,
                equipment_status: 'Assigned',
                remarks: `Assigned to order ${assigningOrderId} by ${currentUserName}`
              });
            }
          }
        }
      }

      // Map some main ones to assignForm variables for legacy column compatibility
      const finalAssignments = allAssignedStaff.length > 0 ? allAssignedStaff : activeAssignments;
      const photographer = finalAssignments.find(a => a.staff_role.toLowerCase().includes('photographer'))?.staff_name || '';
      const videographer = finalAssignments.find(a => a.staff_role.toLowerCase().includes('videographer'))?.staff_name || '';
      const droneOp = finalAssignments.find(a => a.staff_role.toLowerCase().includes('drone') || a.staff_role.toLowerCase().includes('aerial'))?.staff_name || '';
      const assistant = finalAssignments.find(a => a.staff_role.toLowerCase().includes('assistant'))?.staff_name || '';
      
      const matchedOrder = orders.find(o => o.order_id === assigningOrderId);
      
      // Set status to Event Scheduled as requested
      const targetStage: CurrentStage = 'Event Scheduled';

      console.log("Saving assignment for order:", assigningOrderId, {
        photographer,
        videographer,
        droneOp,
        assistant,
        equipment: consolidatedEquipKit,
        reporting_time: convertTimeToDbFormat(assignForm.reporting_time),
        targetStage
      });

      // Assign operations includes event_status and raw footage link if updated
      await assignOperations(assigningOrderId, {
        photographer_assigned: photographer || assignForm.photographer_assigned || '',
        videographer_assigned: videographer || assignForm.videographer_assigned || '',
        drone_operator_assigned: droneOp || assignForm.drone_operator_assigned || '',
        assistant_assigned: assistant || assignForm.assistant_assigned || '',
        equipment_kit: consolidatedEquipKit,
        reporting_time: convertTimeToDbFormat(assignForm.reporting_time),
        remarks: assignForm.remarks,
        event_status: targetStage,
        current_stage: targetStage,
        event_date: assignForm.event_date,
        event_time: convertTimeToDbFormat(assignForm.event_time),
        assigned_staff: finalAssignments.map(a => a.staff_name).join(', '),
        assigned_roles: finalAssignments.map(a => a.staff_role).join(', ')
      } as any);

      if (matchedOrder) {
        setSuccessModalData({
          orderId: assigningOrderId,
          customerName: matchedOrder.customer_name,
          order: { ...matchedOrder, current_stage: targetStage },
          assignments: [...finalAssignments]
        });
      }

      setAssigningOrderId(null);
      alert("✅ Staff assigned successfully.");
    } catch (e: any) {
      console.error("Failed to save assignment:", e);
      if (e.message && (
        e.message.includes('Invalid event status being sent to database') ||
        e.message.includes('operations_event_status_check') ||
        e.message.includes('violates check constraint') ||
        e.message.includes('status_check')
      )) {
        alert("Invalid event status being sent to database.");
      } else {
        alert("Unable to save assignment. Error: " + (e.message || "Please try again."));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getStaffForRole = (role: string) => {
    const filtered = staff ? staff.filter(s => {
      const sRole = s.role.toLowerCase();
      const isActive = s.status === 'Active';
      if (!isActive) return false;
      
      if (role === 'Lead Photographer') return sRole.includes('lead') && sRole.includes('photo');
      if (role === 'Associate Photographer') return sRole.includes('associate') && sRole.includes('photo');
      if (role === 'Lead Videographer') return sRole.includes('lead') && sRole.includes('video');
      if (role === 'Drone & Aerial Operator') return sRole.includes('drone') || sRole.includes('aerial') || sRole.includes('operator');
      if (role === 'Production Assistant') return sRole.includes('assist') || sRole.includes('production');
      if (role === 'Post-Production Editor') return sRole.includes('editor') || sRole.includes('post');
      return false;
    }) : [];

    return filtered;
  };

  const triggerCompletionModal = (orderId: string) => {
    setServerPath(`s3://photocrew-vault-production/2026/${orderId}-shoot/raw/`);
    setClosingOrderId(orderId);

    // Initialize handoverStates for each assigned equipment item
    const op = getOpDetails(orderId);
    const kits = op?.equipment_kit ? op.equipment_kit.split(',').map((sName: string) => sName.trim()).filter(Boolean) : [];
    
    const initialHandovers: Record<string, {
      return_status: 'Returned' | 'Not Returned' | 'Damaged' | 'Missing';
      returned_by: string;
      return_date: string;
      notes: string;
    }> = {};
    
    kits.forEach((k: string) => {
      initialHandovers[k] = {
        return_status: 'Returned',
        returned_by: currentUserName || 'Operations Team',
        return_date: new Date().toISOString().split('T')[0],
        notes: ''
      };
    });
    setHandoverStates(initialHandovers);
  };

  const handleConfirmCompletion = () => {
    if (!closingOrderId) return;

    markEventCompleted(closingOrderId, serverPath);
    setClosingOrderId(null);
    alert(`Shoot marked completed for [${closingOrderId}]!`);
  };

  const isCompletedEvent = (o: Order) => {
    const completedStages = [
      'Event Completed',
      'Raw Footage Received',
      'Editor Assigned',
      'Editing Started',
      'Editing In Progress',
      'Internal QC Review',
      'Client Review Sent',
      'Revision Required',
      'Revision In Progress',
      'Final Approval',
      'Project Delivered',
      'Project Closed',
      'Customer Review',
      'Approved',
      'Delivered',
      'Payment Pending',
      'Closed'
    ];
    const op = operations.find(x => x.order_id === o.order_id);
    return completedStages.includes(o.current_stage) || op?.event_status === 'Completed';
  };

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const newOrders = operationsOrders.filter(o => 
      o.current_stage === 'Order Confirmed' || o.current_stage === 'New Order Received'
    ).length;
    
    const todaysEvents = operationsOrders.filter(o => {
      if (!o.events || o.events.length === 0) return o.event_date === todayStr;
      return o.events.some(e => e.event_date === todayStr);
    }).length;

    const scheduled = operationsOrders.filter(o => o.current_stage === 'Event Scheduled').length;
    
    const pendingAssignments = operationsOrders.filter(o => 
      o.current_stage === 'Operations Assigned' || 
      (o.current_stage === 'Order Confirmed' && !staffAssignments?.some(x => x.order_id === o.order_id))
    ).length;

    const completed = operationsOrders.filter(o => isCompletedEvent(o)).length;

    return {
      newOrders,
      todaysEvents,
      scheduled,
      pendingAssignments,
      completed
    };
  }, [operationsOrders, rawFootage, operations, staffAssignments]);

  const availableGearOptions = useMemo(() => {
    if (!equipment) return [];
    return equipment.map(eq => eq.equipment_name);
  }, [equipment]);

  const toggleSort = (field: 'event_date' | 'customer_name' | 'status' | 'assignment_date') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIndicator = (field: 'event_date' | 'customer_name' | 'status' | 'assignment_date') => {
    if (sortBy !== field) return <span className="text-zinc-500 ml-1 select-none">↕</span>;
    return sortOrder === 'asc' 
      ? <span className="text-amber-500 ml-1 select-none">▲</span> 
      : <span className="text-amber-500 ml-1 select-none">▼</span>;
  };

  const getCompletionDate = (o: Order) => {
    const rf = rawFootage ? rawFootage.find(f => f.order_id === o.order_id) : null;
    if (rf && rf.created_at) {
      return rf.created_at.split('T')[0];
    }
    return o.updated_at ? o.updated_at.split('T')[0] : o.event_date || '—';
  };

  return (
    <div className="space-y-6">
      {/* 1. Results Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {[
          { label: "New Orders Received", val: stats.newOrders, theme: 'purple' as CameraLensTheme, filterValue: 'New Orders', trendText: 'Fresh', chartPoints: [10, 18, 14, 25, 20, 31, 35] },
          { label: "Today's Events", val: stats.todaysEvents, theme: 'cyan' as CameraLensTheme, filterValue: "Today's Events", trendText: 'Live', chartPoints: [5, 9, 7, 14, 11, 16, 15] },
          { label: "Scheduled Events", val: stats.scheduled, theme: 'green' as CameraLensTheme, filterValue: 'Scheduled Events', trendText: 'Rostered', chartPoints: [8, 15, 12, 20, 16, 25, 24] },
          { label: "Pending Assignments", val: stats.pendingAssignments, theme: 'red' as CameraLensTheme, filterValue: 'Pending Assignments', trendText: 'Action Req', chartPoints: [2, 4, 1, 5, 3, 6, 2] },
          { label: "Completed", val: stats.completed, theme: 'purple' as CameraLensTheme, filterValue: 'Completed', trendText: 'Closed Out', chartPoints: [11, 14, 12, 18, 15, 20, 17] },
        ].map((card, idx) => (
          <CameraLensStatsCard
            key={idx}
            label={card.label}
            val={card.val}
            theme={card.theme}
            trendText={card.trendText}
            subText="OPS MONITOR"
            chartPoints={card.chartPoints}
            activeFilterValue={statusFilter}
            currentFilterValue={card.filterValue}
            onClick={() => setStatusFilter(statusFilter === card.filterValue ? 'All' : card.filterValue)}
            lensLabel={card.label.slice(0, 10).toUpperCase()}
          />
        ))}
      </div>

      {/* Search & Simplified Filters Bar */}
      <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-850 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="relative md:col-span-6 w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by Customer Name, Order ID, Mobile Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Date Filter Dropdown */}
          <div className="md:col-span-3 w-full">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 font-mono cursor-pointer"
            >
              <option value="All">All Dates (Event Date)</option>
              <option value="Today">Today</option>
              <option value="Tomorrow">Tomorrow</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Date Range</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3 w-full">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 font-mono cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Order Confirmed">Order Confirmed</option>
              <option value="Operations Assigned">Operations Assigned</option>
              <option value="Staff Assigned">Staff Assigned</option>
              <option value="Event Scheduled">Event Scheduled</option>
              <option value="Event Completed">Event Completed</option>
              <option value="Raw Footage Received">Raw Footage Received</option>
              <option value="Pending">Pending Events</option>
              <option value="Raw Footage Pending">Raw Footage Pending</option>
              <option value="Ready for Production">Ready for Production</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range pickers if custom is selected */}
        {dateFilter === 'Custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-900/30 text-xs animate-in slide-in-from-top-1 duration-150">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500">Custom Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 px-2.5 py-1.5 rounded-lg font-mono focus:outline-none focus:border-amber-500/40"
              />
              <span className="text-zinc-650">—</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 px-2.5 py-1.5 rounded-lg font-mono focus:outline-none focus:border-amber-500/40"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-rose-450 hover:text-rose-400 font-mono text-[10px] uppercase font-bold cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
            {/* Main Board Table */}
      <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse min-w-[1240px]">
          <thead>
            <tr className="border-b border-zinc-850 text-[10px] font-mono tracking-widest uppercase text-zinc-400 bg-zinc-950/70 select-none">
              <th className="p-4 font-bold">Order ID</th>
              <th 
                onClick={() => toggleSort('customer_name')}
                className="p-4 font-bold cursor-pointer hover:bg-zinc-800/40 hover:text-white transition-colors"
                title="Click to Sort by Customer Name"
              >
                Customer Name {renderSortIndicator('customer_name')}
              </th>
              <th className="p-4 font-bold">Event Date</th>
              <th className="p-4 font-bold">Event Time</th>
              <th className="p-4 font-bold">Reporting Time</th>
              <th className="p-4 font-bold">Assigned Team</th>
              <th className="p-4 font-bold">Current Stage</th>
              <th className="p-4 font-bold text-right text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850/60 text-xs">
            {(() => {
              const mainBoardList = sortedOrders;

              if (mainBoardList.length === 0) {
                return (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500 italic">
                      No matching operations leads found.
                    </td>
                  </tr>
                );
              }

              return mainBoardList.map((ord) => {
                const op = getOpDetails(ord.order_id);
                const orderAssignments = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id) : [];

                // 1. Get current lead_id or order_id
                let assignmentsHistory = leadStaffAssignmentHistory ? leadStaffAssignmentHistory.filter(h => h.lead_id === ord.lead_id) : [];
                if (assignmentsHistory.length === 0) {
                  assignmentsHistory = leadStaffAssignmentHistory ? leadStaffAssignmentHistory.filter(h => h.order_id === ord.order_id) : [];
                }

                // 2. Load all current assignments for each role
                // A staff is considered assigned to a role if their latest history entry for that role is an assignment (not "unassigned" or empty)
                // However, the user wants "Display all assigned staff names".
                // If the history has multiple people for the same role, we should show them.
                const roleStaffMap = new Map<string, Set<string>>();
                
                // Sort history by date to process in order
                const sortedAssignments = [...assignmentsHistory].sort((a, b) => new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime());
                
                sortedAssignments.forEach(h => {
                  const role = h.assigned_role;
                  const staffName = h.assigned_staff?.trim();
                  
                  if (!roleStaffMap.has(role)) {
                    roleStaffMap.set(role, new Set());
                  }
                  
                  const staffSet = roleStaffMap.get(role)!;
                  
                  if (staffName && staffName.toLowerCase() !== 'unassigned' && staffName.toLowerCase() !== 'none' && staffName !== '') {
                    // Check if it's a comma-separated list of names
                    if (staffName.includes(',')) {
                      staffName.split(',').forEach(name => {
                        const trimmedName = name.trim();
                        if (trimmedName) staffSet.add(trimmedName);
                      });
                    } else {
                      staffSet.add(staffName);
                    }
                  } else {
                    // If "unassigned" or empty, we clear the set for this role? 
                    // Usually "unassigned" means removing staff. 
                    // But if we want to "Display all", maybe we just want the latest set.
                    // Let's assume "unassigned" clears the role.
                    staffSet.clear();
                  }
                });

                const crewNames: string[] = [];
                roleStaffMap.forEach((staffSet, role) => {
                  staffSet.forEach(name => {
                    crewNames.push(`${name} (${role})`);
                  });
                });

                const lead = leads.find(l => l.lead_id === ord.lead_id);
                const currentStage = lead ? getLeadCurrentStatus(lead) : (ord.current_stage || 'Order Confirmed');
                const isLocked = currentStage === 'Raw Footage Received';

                return (
                  <tr key={ord.order_id} className={`hover:bg-zinc-900/20 transition-all ${isLocked ? 'opacity-85' : ''}`}>
                    <td className="p-4">
                      <span className="font-mono text-indigo-400 font-bold bg-slate-900/80 px-2 py-0.5 border border-slate-800 rounded">
                        {ord.order_id}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-zinc-100">
                      <div>{ord.customer_name}</div>
                      <div className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5">{ord.event_type}</div>
                      {op?.equipment_kit && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {op.equipment_kit.split(',').map((kit: string, idx: number) => (
                            <span key={idx} className="bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded text-[9.5px] font-mono border border-amber-400/10 " title="Assigned Gear">
                              ⚙️ {kit.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-zinc-300">
                      <div>{ord.event_date || <span className="text-zinc-600 italic">—</span>}</div>
                      {isCompletedEvent(ord) && (
                        <div className="text-[10px] text-emerald-400 mt-0.5 font-sans font-medium">
                          Done: {getCompletionDate(ord)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-zinc-300">
                      {ord.event_time || <span className="text-zinc-600 italic">—</span>}
                    </td>
                    <td className="p-4 font-mono text-zinc-300">
                      {op?.reporting_time || <span className="text-zinc-600 italic">—</span>}
                    </td>
                    <td className="p-4 text-xs font-mono text-zinc-300">
                      {(() => {
                        const assignedStaffNames = getAssignedStaffNamesForOrder(ord);
                        return assignedStaffNames.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setViewingStaffOrderId(ord.order_id)}
                            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/45 rounded-xl font-bold font-mono text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                          >
                            👥 {assignedStaffNames.length} Staff
                          </button>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[10.5px]">Unassigned</span>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      <StatusText status={currentStage} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {canEdit && !isLocked && (currentStage !== 'Order Confirmed' && currentStage !== 'New Order Received') && (
                          <select
                            value=""
                            disabled={isSaving}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              if (!newStatus) return;
                              if (newStatus === 'Event Completed') {
                                try {
                                  setIsSaving(true);
                                  await markEventCompleted(ord.order_id, '');
                                  alert("Status Updated Successfully");
                                } catch (error) {
                                  alert(`Failed to update status: ${error}`);
                                } finally {
                                  setIsSaving(false);
                                }
                              } else if (newStatus === 'Raw Footage Received') {
                                setReceivingFootageOrderId(ord.order_id);
                                const existingRf = rawFootage?.find(f => f.order_id === ord.order_id);
                                const op = getOpDetails(ord.order_id);
                                setFootageForm({
                                  footage_link: op?.Raw_Footage_Drive_Link || op?.raw_footage_drive_link || ((existingRf && (existingRf.raw_received || existingRf.status === 'Received')) ? (existingRf.server_path || '') : ''),
                                  storage_type: 'Google Drive',
                                  upload_notes: ''
                                });
                                // Initialize footageHandoverStates for each assigned equipment item
                                const kits = op?.equipment_kit ? op.equipment_kit.split(',').map((sName: string) => sName.trim()).filter(Boolean) : [];
                                const initialHandovers: any = {};
                                kits.forEach((k: string) => {
                                  initialHandovers[k] = {
                                    return_status: 'Returned',
                                    returned_by: currentUserName,
                                    return_date: new Date().toISOString().split('T')[0],
                                    notes: ''
                                  };
                                });
                                setFootageHandoverStates(initialHandovers);
                              } else {
                                try {
                                  setIsSaving(true);
                                  await updateOrderStage(ord.order_id, newStatus as any);
                                  alert("Status Updated Successfully");
                                } catch (error: any) {
                                  alert(`Failed to update status: ${error.message}`);
                                } finally {
                                  setIsSaving(false);
                                }
                              }
                            }}
                            className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-full text-[10px] font-mono font-bold cursor-pointer transition-all uppercase"
                          >
                            <option value="">▼ UPDATE STATUS</option>
                            <option value="Event Scheduled">Event Scheduled</option>
                            <option value="Event Completed">Event Completed</option>
                            <option value="Raw Footage Received">Raw Footage Received</option>
                            <option value="Event Cancelled">Event Cancelled</option>
                          </select>
                        )}

                        {(() => {
                          const actionItems: { label: string; onClick: () => void }[] = [];

                          // 1. View Details: Always visible except let's keep it based on business rules or always there
                          actionItems.push({
                            label: 'View Details',
                            onClick: () => {
                              setProjectDossierId(ord.order_id);
                              setActiveMenuOrderId(null);
                            }
                          });

                          // 2. Share WhatsApp: valid when staff is assigned
                          const assignedStaffNames = getAssignedStaffNamesForOrder(ord);
                          if (assignedStaffNames.length > 0) {
                            actionItems.push({
                              label: 'Share WhatsApp',
                              onClick: () => {
                                setWhatsappShareModalData({
                                  orderId: ord.order_id,
                                  order: ord,
                                  staffNames: assignedStaffNames
                                });
                                setActiveMenuOrderId(null);
                              }
                            });
                          }

                          // 3. Assign Staff (before assignments exist / Order Confirmed / New Order Received / Operations Assigned)
                          if (canEdit && !isLocked && (currentStage === 'Order Confirmed' || currentStage === 'New Order Received' || currentStage === 'Operations Assigned')) {
                            actionItems.push({
                              label: 'Assign Staff',
                              onClick: () => {
                                startAssigning(ord);
                                setActiveMenuOrderId(null);
                              }
                            });
                          }

                          // 4. View Roster (Staff Assigned / Event Scheduled)
                          if (canEdit && !isLocked && (currentStage === 'Staff Assigned' || currentStage === 'Event Scheduled')) {
                            actionItems.push({
                              label: 'View Roster',
                              onClick: () => {
                                startAssigning(ord);
                                setActiveMenuOrderId(null);
                              }
                            });
                          }

                          // 5. Receive Raw Footage (Event Completed)
                          if (canEdit && (currentStage === 'Event Completed')) {
                            actionItems.push({
                              label: 'Receive Raw Footage',
                              onClick: () => {
                                setReceivingFootageOrderId(ord.order_id);
                                const existingRf = rawFootage?.find(f => f.order_id === ord.order_id);
                                const op = getOpDetails(ord.order_id);
                                setFootageForm({
                                  footage_link: op?.Raw_Footage_Drive_Link || op?.raw_footage_drive_link || ((existingRf && (existingRf.raw_received || existingRf.status === 'Received')) ? (existingRf.server_path || '') : ''),
                                  storage_type: 'Google Drive',
                                  upload_notes: ''
                                });

                                const kits = op?.equipment_kit ? op.equipment_kit.split(',').map((sName: string) => sName.trim()).filter(Boolean) : [];
                                const initialHandovers: Record<string, {
                                  return_status: 'Returned' | 'Not Returned' | 'Damaged' | 'Missing';
                                  returned_by: string;
                                  return_date: string;
                                  notes: string;
                                }> = {};
                                kits.forEach((k: string) => {
                                  initialHandovers[k] = {
                                    return_status: 'Returned',
                                    returned_by: currentUserName || 'Operations Team',
                                    return_date: new Date().toISOString().split('T')[0],
                                    notes: ''
                                  };
                                });
                                setFootageHandoverStates(initialHandovers);
                                
                                setHardDiskReceived(false);
                                setMemoryCardReceived(false);
                                
                                const existingPay = payments?.find(p => p.order_id === ord.order_id);
                                if (existingPay) {
                                  if (existingPay.payment_collection_status) {
                                    setPaymentCollectionStatus(existingPay.payment_collection_status as any);
                                  } else {
                                    if (existingPay.payment_status === 'Fully Paid') {
                                      setPaymentCollectionStatus('Full Payment Received');
                                    } else if (existingPay.payment_status === 'Partially Paid') {
                                      setPaymentCollectionStatus('Partial Payment Received');
                                    } else {
                                      setPaymentCollectionStatus('Payment Pending');
                                    }
                                  }
                                  setAdditionalReceived(existingPay.additional_received || existingPay.final_payment_received || 0);
                                } else {
                                  setPaymentCollectionStatus('Payment Pending');
                                  setAdditionalReceived(0);
                                }
                                setActiveMenuOrderId(null);
                              }
                            });
                          }

                          // 6. View Link, Copy Link, Open Link (Raw Footage Received)
                          if (currentStage === 'Raw Footage Received') {
                            const rf = rawFootage ? rawFootage.find(f => f.order_id === ord.order_id) : null;
                            const path = rf?.server_path || '';
                            if (path) {
                              actionItems.push({
                                label: 'View Footage Link',
                                onClick: () => {
                                  alert(`Footage Link (via ${rf?.storage_type || 'Google Drive'}): \n\n${path}`);
                                  setActiveMenuOrderId(null);
                                }
                              });
                              actionItems.push({
                                label: 'Copy Footage Link',
                                onClick: () => {
                                  navigator.clipboard.writeText(path);
                                  alert('Copied raw footage drive link to clipboard!');
                                  setActiveMenuOrderId(null);
                                }
                              });
                              actionItems.push({
                                label: 'Open Footage Link',
                                onClick: () => {
                                  window.open(path, '_blank');
                                  setActiveMenuOrderId(null);
                                }
                              });
                            }
                          }

                          const isOpen = activeMenuOrderId === ord.order_id;

                          return (
                            <div className="relative inline-block text-left actions-menu-container">
                              <button
                                type="button"
                                onClick={() => setActiveMenuOrderId(isOpen ? null : ord.order_id)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-indigo-600 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-mono font-bold border border-zinc-750 hover:border-indigo-500 shadow-lg cursor-pointer transition-all inline-flex items-center gap-1.5"
                              >
                                Actions <span className={`text-[9px] text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}>▼</span>
                              </button>
                              {isOpen && (
                                <div className="absolute right-0 mt-2 w-52 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-2xl z-[150] py-1.5 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                                  <div className="px-3.5 py-1 border-b border-zinc-900/60 mb-1">
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Options</span>
                                  </div>
                                  {actionItems.map((act, aIdx) => (
                                    <button
                                      key={aIdx}
                                      onClick={act.onClick}
                                      className="w-full text-left px-3.5 py-2.5 text-xs text-zinc-300 hover:bg-indigo-600/10 hover:text-indigo-400 active:bg-indigo-600/20 transition-all cursor-pointer block font-mono border-b border-zinc-900/20 last:border-0"
                                    >
                                      ⚡ {act.label}
                                    </button>
                                  ))}
                                  {actionItems.length === 0 && (
                                    <div className="px-3.5 py-2 text-xs text-zinc-500 italic font-mono">
                                      No actions available
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                );
              })
            })()}
          </tbody>
        </table>
      </div>    </div>

      {/* Slide-over or Inline modal for Crew and Equipment Assignment */}
      {assigningOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div id="assign_staff_modal" className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl relative animate-in zoom-in duration-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-bold font-mono">Operations</span>
                <h3 className="text-sm font-sans font-black text-white">
                  Project Staffing & Handover Dossier ~ {assigningOrderId}
                </h3>
              </div>
              <button 
                onClick={() => setAssigningOrderId(null)}
                className="text-zinc-500 hover:text-white font-bold cursor-pointer transition-colors p-1"
                type="button"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="flex flex-col">
              <div className="p-5 overflow-y-auto max-h-[75vh] space-y-6">
                
                {/* 1. Customer Information */}
                <div className="bg-zinc-950/45 border border-zinc-850 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-[10px] text-zinc-655 select-none">
                    👤 CUSTOMER
                  </div>
                  <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-mono">Customer Name</span>
                      <span className="font-bold text-white font-sans text-xs block">
                        {activeOrderInstance?.customer_name || parentLeadInstance?.customer_name || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-mono">Mobile Number</span>
                      <span className="font-mono text-zinc-200 font-medium block">
                        {activeOrderInstance?.mobile || parentLeadInstance?.mobile || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-505 block uppercase font-mono">Alt / WhatsApp</span>
                      <span className="font-mono text-zinc-200 font-medium flex items-center gap-1">
                        {parentLeadInstance?.alternate_mobile || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-505 block uppercase font-mono">Email</span>
                      <span className="font-sans text-zinc-200 font-medium block">
                        {parentLeadInstance?.email || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-1 sm:col-span-2 md:col-span-4">
                      <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event Address</span>
                      <span className="text-zinc-200 font-sans text-[11px] block leading-tight">
                        {parentLeadInstance?.event_location || activeOrderInstance?.event_location || parentLeadInstance?.address || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-1 sm:col-span-2 md:col-span-4">
                      <span className="text-[10px] text-zinc-505 block uppercase font-mono">Google Maps Location Link</span>
                      {googleMapsLocationLink ? (
                        <a 
                          href={googleMapsLocationLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-sans text-[11px] break-all block underline mt-0.5"
                        >
                          {googleMapsLocationLink}
                        </a>
                      ) : (
                        <span className="text-zinc-500 font-sans text-[11px] block mt-0.5">
                          No Google Maps Location Available.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Multiple Events Iteration */}
                {(() => {
                  const targetLeadQuotations = quotations?.filter(q => q.lead_id === parentLeadInstance?.lead_id) || [];
                  targetLeadQuotations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const targetLatestQuote = targetLeadQuotations[0];
                  let targetEditableInclusions: Record<string, string[]> = {};
                  if (targetLatestQuote) {
                     if (targetLatestQuote.editableInclusions) {
                        targetEditableInclusions = targetLatestQuote.editableInclusions;
                     } else if (targetLatestQuote.terms_conditions && targetLatestQuote.terms_conditions.includes('METADATA:')) {
                        try {
                           const meta = JSON.parse(targetLatestQuote.terms_conditions.split('METADATA:')[1]);
                           if (meta.editableInclusions) targetEditableInclusions = meta.editableInclusions;
                        } catch (e) {}
                     }
                  }

                  return parentLeadInstance?.events && parentLeadInstance.events.map((ev, index) => {
                    const evId = ev.id || `EV-N/A-${index}`;
                    const allocation = eventAllocations[evId] || { staff: [] };
                    const allocStaff = allocation.staff || [];
                    
                    const matchingKey = Object.keys(targetEditableInclusions).find(k => k.includes(evId)) || index.toString();
                    const eventRoles = targetEditableInclusions[matchingKey] || targetEditableInclusions[evId] || targetEditableInclusions[index.toString()] || [];
                    const includedRoles = eventRoles.length > 0 ? eventRoles : ['Photographer', 'Videographer'];

                    return (
                      <div key={evId} className="bg-zinc-950/60 border border-zinc-850 p-5 rounded-2xl space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 text-[10px] text-zinc-655 select-none uppercase">
                          🎥 EVENT {index + 1}
                        </div>
                        
                        {/* 2. Event & Package Coordinates */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                          Event Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Event Name</span>
                            <span className="font-semibold text-white uppercase text-[11px] block">
                              {ev.event_type === 'Other' ? (ev.event_name || 'Other') : (ev.event_type || 'N/A')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Event Date</span>
                            <span className="text-zinc-200 text-[11px] font-mono block">
                              {ev.event_date || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Event Time</span>
                            <span className="text-zinc-200 text-[11px] font-mono block">
                              {ev.event_start_time || 'N/A'} {ev.event_end_time ? `- ${ev.event_end_time}` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Shoot Type</span>
                            <span className="text-zinc-350 font-medium uppercase text-[11px] block">
                              {ev.event_shoot_type || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Reporting Date</span>
                            <span className="text-zinc-200 text-[11px] font-mono block">{allocation.reporting_date || ev.reporting_date || ev.event_date || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Reporting Time</span>
                            <span className="text-zinc-200 text-[11px] font-mono block">{allocation.reporting_time || ev.reporting_time || 'N/A'}</span>
                          </div>
                          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Venue / Location</span>
                            <span className="text-zinc-200 text-[11px] font-sans block leading-tight">
                              {ev.event_location || parentLeadInstance?.event_location || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3. Team Members Included (Editable) & Staff Assignment */}
                      <div className="space-y-4 pt-2">
                        <h4 className="text-[11px] font-mono font-bold uppercase text-sky-400 tracking-wider">
                          Team Members Included (Editable)
                        </h4>
                        
                        <div className="space-y-4">
                          {includedRoles.map((roleStr, roleIdx) => {
                            const assignedToRole = allocStaff.filter((s: any) => s.staff_role === roleStr);
                            const selectKey = `${evId}_${roleIdx}`;

                            const firstAssignedStaff = assignedToRole[0];
                            const firstAssignedStaffFull = firstAssignedStaff ? staff?.find(s => s.staff_name === firstAssignedStaff.staff_name) : null;
                            const defaultStaffType = firstAssignedStaffFull?.staff_type || 'In-House';
                            const currentStaffType = staffTypeByEvent[selectKey] || defaultStaffType;

                            return (
                              <div key={roleIdx} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                  <span className="text-xs font-bold text-white uppercase">{roleStr}</span>
                                </div>
                                
                                {/* List currently assigned staff for this role */}
                                {assignedToRole.length > 0 && (
                                  <div className="space-y-2">
                                    {assignedToRole.map((st: any, stIdx: number) => {
                                      const stFull = staff?.find(s => s.staff_name === st.staff_name);
                                      return (
                                        <div key={stIdx} className="flex items-center justify-between bg-zinc-950 p-2 rounded border border-zinc-850">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-zinc-200">{st.staff_name}</span>
                                            {stFull?.staff_type && <span className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-mono uppercase">{stFull.staff_type}</span>}
                                            {st.mobile && <span className="text-[10px] text-zinc-500 font-mono">{st.mobile}</span>}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEventAllocations((prev: any) => {
                                                const existingAlloc = prev[evId] || { staff: [] };
                                                return {
                                                  ...prev,
                                                  [evId]: {
                                                    ...existingAlloc,
                                                    staff: existingAlloc.staff.filter((s: any) => !(s.staff_name === st.staff_name && s.staff_role === roleStr))
                                                  }
                                                };
                                              });
                                            }}
                                            className="text-red-400 hover:text-red-300 p-1"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Add Staff to this role */}
                                <div className="flex flex-col sm:flex-row gap-2 items-end">
                                   <div className="w-1/3">
                                     <select
                                       value={currentStaffType}
                                       onChange={(e) => {
                                         setStaffTypeByEvent(prev => ({ ...prev, [selectKey]: e.target.value as 'In-House' | 'Freelancer' }));
                                         setSelectedStaffByEvent(prev => ({ ...prev, [selectKey]: '' }));
                                       }}
                                       className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                                     >
                                       <option value="In-House">In-House</option>
                                       <option value="Freelancer">Freelancer</option>
                                     </select>
                                   </div>
                                   <div className="flex-1">
                                     <select
                                       value={selectedStaffByEvent[selectKey] || ''}
                                       onChange={(e) => setSelectedStaffByEvent(prev => ({ ...prev, [selectKey]: e.target.value }))}
                                       className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                                     >
                                       <option value="">-- Assign Staff --</option>
                                       {staff && staff.filter(s => s.status === 'Active' && (s.staff_type || 'In-House') === currentStaffType).map(st => (
                                         <option key={st.staff_id} value={st.name}>{st.name} - {st.role}</option>
                                       ))}
                                     </select>
                                   </div>
                                   <button
                                     type="button"
                                     onClick={() => {
                                       const selectedStaff = selectedStaffByEvent[selectKey];
                                       if (!selectedStaff) return;
                                       const memberInfo = staff?.find(st => st.name === selectedStaff);
                                       const staffId = memberInfo?.staff_id || 'MOCK-' + Math.random().toString(36).substr(2, 4);
                                         
                                       setEventAllocations((prev: any) => {
                                         const existingAlloc = prev[evId] || { staff: [] };
                                         if (existingAlloc.staff.some((s: any) => s.staff_name === selectedStaff && s.staff_role === roleStr)) return prev;
                                         return {
                                           ...prev,
                                           [evId]: {
                                             ...existingAlloc,
                                             staff: [...(existingAlloc.staff || []), { staff_role: roleStr, staff_id: staffId, staff_name: selectedStaff, mobile: memberInfo?.mobile || '' }]
                                           }
                                         };
                                       });
                                       setSelectedStaffByEvent(prev => ({ ...prev, [selectKey]: '' }));
                                     }}
                                     className="px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-mono font-bold rounded-lg border border-sky-500/30 transition-all uppercase w-full sm:w-auto"
                                   >
                                     + Add
                                   </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Assigned Equipment Section */}
                        {(() => {
                          const searchQuery = equipmentSearchQueryByEvent[evId] || '';
                          const isDropdownOpen = !!isEquipmentDropdownOpenByEvent[evId];
                          const selectedEquipmentNames = allocation.equipment || [];
                          
                          const filteredEquipment = (equipment || []).filter(eq => {
                            const q = searchQuery.toLowerCase();
                            return eq.equipment_name.toLowerCase().includes(q) ||
                                   (eq.category || '').toLowerCase().includes(q) ||
                                   (eq.serial_number || '').toLowerCase().includes(q);
                          });

                          return (
                            <div className="space-y-3 pt-5 border-t border-zinc-800/80">
                              <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                                📦 Assigned Equipment (Event-Wise)
                              </h4>
                              
                              {/* Selected equipment tags */}
                              <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-zinc-950 rounded-xl border border-zinc-900">
                                {selectedEquipmentNames.length > 0 ? (
                                  selectedEquipmentNames.map((eqName: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-mono font-medium rounded-lg border border-amber-500/20 transition-all">
                                      <span>⚙️ {eqName}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEventAllocations(prev => {
                                            const existing = prev[evId] || { equipment: [] };
                                            return {
                                              ...prev,
                                              [evId]: {
                                                ...existing,
                                                equipment: (existing.equipment || []).filter((name: string) => name !== eqName)
                                              }
                                            };
                                          });
                                        }}
                                        className="text-amber-500 hover:text-amber-400 font-bold ml-1 text-xs cursor-pointer focus:outline-none"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10.5px] text-zinc-500 italic px-1.5 py-1 self-center">
                                    No equipment assigned yet. Select gear from the inventory search list below.
                                  </span>
                                )}
                              </div>

                              {/* Search & Select input dropdown */}
                              <div className="relative">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="🔍 Search and add equipment (e.g. Sony A7IV, Drone DJI Mavic 3)..."
                                    value={searchQuery}
                                    onFocus={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [evId]: true }))}
                                    onChange={(e) => setEquipmentSearchQueryByEvent(prev => ({ ...prev, [evId]: e.target.value }))}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 focus:outline-none rounded-lg py-2 px-3 text-xs text-zinc-100 placeholder-zinc-500"
                                  />
                                  {isDropdownOpen ? (
                                    <button
                                      type="button"
                                      onClick={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [evId]: false }))}
                                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-mono font-bold rounded-lg border border-zinc-750 transition-colors cursor-pointer"
                                    >
                                      Close
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [evId]: true }))}
                                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-xs font-mono font-bold rounded-lg border border-zinc-800 transition-colors cursor-pointer"
                                    >
                                      Browse
                                    </button>
                                  )}
                                </div>

                                {isDropdownOpen && (
                                  <div className="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-850 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-40 scrollbar-thin divide-y divide-zinc-850/60">
                                    {filteredEquipment.length > 0 ? (
                                      filteredEquipment.map((eq) => {
                                        const isAlreadySelected = selectedEquipmentNames.includes(eq.equipment_name);
                                        return (
                                          <div
                                            key={eq.equipment_id}
                                            onClick={() => {
                                              if (isAlreadySelected) {
                                                // Deselect
                                                setEventAllocations(prev => {
                                                  const existing = prev[evId] || { equipment: [] };
                                                  return {
                                                    ...prev,
                                                    [evId]: {
                                                      ...existing,
                                                      equipment: (existing.equipment || []).filter((name: string) => name !== eq.equipment_name)
                                                    }
                                                  };
                                                });
                                              } else {
                                                // Select
                                                setEventAllocations(prev => {
                                                  const existing = prev[evId] || { equipment: [] };
                                                  return {
                                                    ...prev,
                                                    [evId]: {
                                                      ...existing,
                                                      equipment: [...(existing.equipment || []), eq.equipment_name]
                                                    }
                                                  };
                                                });
                                              }
                                            }}
                                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors text-xs text-left ${
                                              isAlreadySelected ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-zinc-855'
                                            }`}
                                          >
                                            <div className="space-y-0.5">
                                              <div className="font-bold text-white flex items-center gap-1.5">
                                                <span>⚙️ {eq.equipment_name}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase font-mono">
                                                  {eq.category}
                                                </span>
                                              </div>
                                              <div className="text-[10px] text-zinc-500 font-mono">
                                                SN: {eq.serial_number || 'N/A'}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              {eq.status === 'Available' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                                  Available
                                                </span>
                                              ) : eq.status === 'Assigned' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
                                                  Assigned
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/25">
                                                  {eq.status}
                                                </span>
                                              )}

                                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                                isAlreadySelected ? 'bg-amber-500 border-amber-500 text-black' : 'border-zinc-700'
                                              }`}>
                                                {isAlreadySelected ? '✓' : ''}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="p-4 text-center text-xs text-zinc-500 italic">
                                        No equipment found matching "{searchQuery}"
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Staff Schedule Card */}
                        {(() => {
                           const staffNamesToCheck: string[] = [];
                           
                           // Check all dropdowns for this event
                           Object.keys(selectedStaffByEvent).forEach(key => {
                             if (key.startsWith(`${evId}_`) && selectedStaffByEvent[key]) {
                               staffNamesToCheck.push(selectedStaffByEvent[key]);
                             }
                           });

                           allocStaff.forEach((s: any) => {
                             if (s.staff_name && !staffNamesToCheck.includes(s.staff_name)) {
                               staffNamesToCheck.push(s.staff_name);
                             }
                           });

                           if (staffNamesToCheck.length === 0) return null;

                           return (
                             <div className="space-y-4">
                               {staffNamesToCheck.map(staffName => {
                                 const memberInfo = staff?.find(st => st.name === staffName);
                                 if (!memberInfo) return null;

                                 // Find all active and upcoming events assigned to this staff member
                                 const staffEvents: any[] = [];
                                 leads?.forEach(otherLead => {
                                   otherLead.events?.forEach(otherEv => {
                                     // Skip current event we are scheduling
                                     if (otherEv.id === evId) return;

                                     const assignedNames = otherEv.assigned_staff_names
                                       ? otherEv.assigned_staff_names.split(',').map((s: string) => s.trim())
                                       : [];
                                     if (assignedNames.includes(staffName)) {
                                       const otherOrder = orders.find(o => o.lead_id === otherLead.lead_id || o.order_id === otherLead.lead_id);
                                       const isCompleted = otherOrder ? isCompletedEvent(otherOrder) : false;

                                       if (!isCompleted && otherLead.status !== 'Lost Lead') {
                                         staffEvents.push({
                                           lead: otherLead,
                                           event: otherEv,
                                           order: otherOrder,
                                           dateValue: otherEv.event_date || otherLead.Reporting_date || ''
                                         });
                                       }
                                     }
                                   });
                                 });

                                 // Sort chronologically by date
                                 staffEvents.sort((a, b) => {
                                   const dateA = new Date(a.dateValue).getTime();
                                   const dateB = new Date(b.dateValue).getTime();
                                   if (isNaN(dateA)) return 1;
                                   if (isNaN(dateB)) return -1;
                                   return dateA - dateB;
                                 });

                                 // Compare current scheduling event's time coordinates with existing assignments
                                 const currentEvDate = allocation.reporting_date || ev.event_date;
                                 const currentEvRepTime = allocation.reporting_time || ev.reporting_time;
                                 const currentEvStartTime = allocation.event_start_time || ev.event_start_time;
                                 const currentEvEndTime = allocation.event_end_time || ev.event_end_time;

                                 const evStart = parseDateTime(currentEvDate, currentEvRepTime || currentEvStartTime || '08:00');
                                 const evEnd = parseDateTime(currentEvDate, currentEvEndTime || currentEvStartTime || '17:00');

                                 const conflictingEvents: any[] = [];
                                 staffEvents.forEach(se => {
                                   const seRepDate = se.lead.Reporting_date || se.event.event_date;
                                   const seRepTime = se.event.reporting_time || se.lead.reporting_time || se.event.event_start_time || '08:00';
                                   const seEndTime = se.event.event_end_time || se.event.event_start_time || '17:00';

                                   const otherStart = parseDateTime(seRepDate, seRepTime);
                                   const otherEnd = parseDateTime(se.event.event_date || seRepDate, seEndTime);

                                   let isOverlap = false;
                                   if (evStart && evEnd && otherStart && otherEnd) {
                                     isOverlap = evStart < otherEnd && otherStart < evEnd;
                                   } else {
                                     if (currentEvDate && se.event.event_date && currentEvDate === se.event.event_date) {
                                       isOverlap = true;
                                     }
                                   }

                                   if (isOverlap) {
                                     conflictingEvents.push(se);
                                   }
                                 });

                                 const hasConflict = conflictingEvents.length > 0;

                                 return (
                                   <div key={staffName} className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 text-left shadow-md">
                                     {/* Header */}
                                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                                       <div>
                                         <span className="text-[10px] text-zinc-500 uppercase font-mono block">👤 Staff Name</span>
                                         <span className="text-sm font-bold text-white font-sans">{staffName}</span>
                                         <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">{memberInfo.role}</span>
                                       </div>
                                       <div className="flex flex-col items-start sm:items-end">
                                         <span className="text-[10px] text-zinc-500 uppercase font-mono block">Status</span>
                                         {hasConflict ? (
                                           <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                             🔴 Busy
                                           </span>
                                         ) : (
                                           <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                             🟢 Available
                                           </span>
                                         )}
                                       </div>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           );
                        })()}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {allocStaff.length > 0 ? allocStaff.map((st, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-750 px-2 py-1 rounded-md">
                              <div className="text-[10px] text-zinc-400 font-mono">{st.staff_role}</div>
                              <div className="text-xs font-bold text-white font-sans">{st.staff_name}</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEventAllocations(prev => {
                                    const existingAlloc = prev[evId];
                                    return {
                                      ...prev,
                                      [evId]: {
                                        ...existingAlloc,
                                        staff: existingAlloc.staff.filter((_, idx) => idx !== i)
                                      }
                                    };
                                  });
                                }}
                                className="text-red-400 hover:text-red-300 ml-1 font-bold text-[10px]"
                              >
                                ✕
                              </button>
                            </div>
                          )) : (
                            <span className="text-[10px] italic text-zinc-500 font-mono">No staff assigned to this event yet.</span>
                          )}
                        </div>
                      </div>
                      
                      {/* 4. WhatsApp Sharing */}
                      {allocStaff.length > 0 && (
                        <div className="pt-3 mt-4 border-t border-zinc-800">
                          <button
                            type="button"
                            onClick={() => {
                              if (activeOrderInstance) {
                                const assignedStaffNames = getAssignedStaffNamesForOrder(activeOrderInstance);
                                if (assignedStaffNames.length === 1) {
                                  const msgText = generateWhatsAppMessageForStaff(activeOrderInstance, assignedStaffNames[0]);
                                  const url = `https://wa.me/?text=${encodeURIComponent(msgText)}`;
                                  window.open(url, '_blank');
                                } else {
                                  setWhatsappShareModalData({
                                    orderId: activeOrderInstance.order_id,
                                    order: activeOrderInstance,
                                    staffNames: assignedStaffNames
                                  });
                                }
                              }
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-[10px] font-mono font-bold rounded cursor-pointer transition-all uppercase"
                          >
                            <span>📱</span> Share via WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
                })()}
                
              </div>
              
              <div className="p-4 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-3 bg-zinc-950/40">
                <button
                  type="button"
                  onClick={() => setAssigningOrderId(null)}
                  className="px-4 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                >
                  {isSaving ? 'Saving Assignments...' : 'Save All Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raw Footage Received Modal */}
      {receivingFootageOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div id="raw_footage_modal" className="bg-zinc-900 border border-zinc-805 rounded-2xl w-full max-w-lg shadow-2xl relative p-5 max-h-[90vh] overflow-y-auto space-y-4 scrollbar-thin">
            <h3 className="text-sm font-bold text-purple-400 font-mono uppercase flex items-center gap-1.5 border-b border-zinc-800 pb-2">
              <span>💿</span> Receive Raw Footage
            </h3>
            <div className="text-[11px] text-zinc-400 leading-relaxed">
              Upon confirmation, this order transitions to **Raw Footage Received** and escalates automatically to the Production Dashboard.
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (isSaving) return;

              try {
                setIsSaving(true);
                // Save equipment handovers/verifications to Supabase & state
                const handoversToSave = (Object.entries(footageHandoverStates) as [string, any][]).map(([equipName, details]) => ({
                  order_id: receivingFootageOrderId,
                  equipment_name: equipName,
                  return_status: details.return_status,
                  return_date: details.return_date,
                  returned_by: details.returned_by,
                  notes: details.notes
                }));
                
                if (handoversToSave.length > 0) {
                  await addEquipmentHandovers(handoversToSave);
                  if (equipment && updateEquipment) {
                    for (const ho of handoversToSave) {
                      const found = equipment.find(eq => 
                        eq.name === ho.equipment_name || 
                        `${eq.name} [${eq.brand} ${eq.model}]` === ho.equipment_name
                      );
                      if (found) {
                        await updateEquipment(found.equipment_id, { status: 'Available' });
                      }
                    }
                  }
                }

                await confirmRawFootageReceived(
                  receivingFootageOrderId,
                  footageForm.footage_link,
                  'Google Drive',
                  footageForm.upload_notes,
                  undefined,
                  undefined,
                  undefined
                );
                
                setReceivingFootageOrderId(null);
                setFootageForm({ footage_link: '', storage_type: 'Google Drive', upload_notes: '' });
                alert("Raw Footage Handover Complete");
              } catch (err: any) {
                console.error("Failed to receive raw footage:", err);
                alert("Failed to save and move raw footage. Error: " + (err.message || "Please try again."));
              } finally {
                setIsSaving(false);
              }
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono mb-1">
                  Raw Footage Drive Link (Google Drive / cloud)
                </label>
                <input
                  type="url"
                  value={footageForm.footage_link}
                  onChange={(e) => setFootageForm({ ...footageForm, footage_link: e.target.value })}
                  placeholder="e.g. https://drive.google.com/drive/folders/..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono placeholder:text-zinc-600"
                />
              </div>



              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono mb-1">
                  Upload Notes / Remarks
                </label>
                <textarea
                  value={footageForm.upload_notes}
                  onChange={(e) => setFootageForm({ ...footageForm, upload_notes: e.target.value })}
                  placeholder="e.g. Drone clips are in separate subfolder..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-sans"
                  rows={2}
                />
              </div>

              {/* Equipment Handover/Verification section matching exact user request */}
              {Object.keys(footageHandoverStates).length > 0 && (
                <div className="space-y-3 border-t border-zinc-800 pt-3">
                  <h4 className="text-[10px] font-mono font-bold uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                    ⚙️ Equipment Verification
                  </h4>
                  <p className="text-[10px] text-zinc-500">
                    Verify and select condition for all assigned equipment before saving raw footage.
                  </p>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {(Object.entries(footageHandoverStates) as [string, any][]).map(([kitName, details]) => (
                      <div key={kitName} className="bg-zinc-955 p-2.5 rounded-xl border border-zinc-900 space-y-2">
                        <div className="font-sans font-bold text-zinc-300 text-[11px] break-words flex items-center justify-between">
                          <span>🛠️ {kitName}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            details.return_status === 'Returned' ? 'bg-emerald-500/10 text-emerald-400' :
                            details.return_status === 'Damaged' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' :
                            details.return_status === 'Missing' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25' :
                            'bg-zinc-800 text-zinc-200'
                          }`}>
                            {details.return_status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {(['Returned', 'Missing', 'Damaged', 'Not Returned'] as const).map(statusOpt => (
                            <button
                              key={statusOpt}
                              type="button"
                              onClick={() => {
                                setFootageHandoverStates(prev => ({
                                  ...prev,
                                  [kitName]: { ...prev[kitName], return_status: statusOpt }
                                }));
                              }}
                              className={`py-1 text-[9px] rounded font-mono font-bold text-center border transition-all ${
                                details.return_status === statusOpt
                                  ? statusOpt === 'Returned' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black'
                                    : statusOpt === 'Damaged' ? 'bg-rose-500/10 border-rose-500/30 text-rose-450 font-black'
                                    : statusOpt === 'Missing' ? 'bg-amber-500/10 border-amber-500/35 text-amber-400 font-black'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-200 font-black'
                                  : 'bg-zinc-905 border-zinc-850 text-zinc-500 hover:text-zinc-350'
                              }`}
                            >
                              {statusOpt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setReceivingFootageOrderId(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer hover:bg-zinc-700 transition w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-purple-650 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl cursor-pointer flex justify-center items-center gap-1.5 w-full sm:w-auto"
                >
                  {isSaving ? 'Saving...' : 'Save & Move to Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Assignment Success Modal */}
      {successModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setSuccessModalData(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold cursor-pointer transition-colors p-1"
              type="button"
            >
              ✕
            </button>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-400 text-xl font-bold">
                ✓
              </div>
              <h3 className="text-base font-bold text-white">
                ✅ Staff assigned successfully.
              </h3>
              <p className="text-xs text-zinc-400">
                Roster updated for order <span className="font-mono text-indigo-400 font-bold">{successModalData.orderId}</span>.
              </p>

              {/* Share via WhatsApp section */}
              <div className="bg-zinc-950/50 border border-zinc-850 rounded-2xl p-4 text-left space-y-3">
                <h4 className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider">
                  📱 Share via WhatsApp
                </h4>
                
                {(() => {
                  const assignedStaffNames = getAssignedStaffNamesForOrder(successModalData.order);

                  if (assignedStaffNames.length === 0) {
                    return (
                      <div className="text-xs text-zinc-500 italic">No staff assigned yet.</div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {assignedStaffNames.map((name, idx) => {
                        const stObj = staff?.find(s => s.name === name);
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/60">
                            <div>
                              <div className="text-xs font-bold text-white">{name}</div>
                              {stObj?.role && <div className="text-[9.5px] text-zinc-500 font-mono">{stObj.role}</div>}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const msgText = generateWhatsAppMessageForStaff(successModalData.order, name);
                                const url = `https://wa.me/?text=${encodeURIComponent(msgText)}`;
                                window.open(url, '_blank');
                              }}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors"
                            >
                              Share
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSuccessModalData(null)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Staff WhatsApp Share picker */}
      {whatsappShareModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setWhatsappShareModalData(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold cursor-pointer transition-colors p-1"
              type="button"
            >
              ✕
            </button>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/25 rounded-full flex items-center justify-center mx-auto text-indigo-400 text-xl font-bold">
                📱
              </div>
              <h3 className="text-base font-bold text-white">
                Share WhatsApp Message
              </h3>
              <p className="text-xs text-zinc-400">
                Select an assigned staff member to generate their personalized message.
              </p>

              {/* Share via WhatsApp list */}
              <div className="bg-zinc-950/50 border border-zinc-850 rounded-2xl p-4 text-left space-y-3">
                <h4 className="text-[10px] font-mono font-bold uppercase text-indigo-400 tracking-wider">
                  Assigned Team Members
                </h4>
                
                {(() => {
                  if (whatsappShareModalData.staffNames.length === 0) {
                    return (
                      <div className="text-xs text-zinc-500 italic">No staff assigned yet.</div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {whatsappShareModalData.staffNames.map((name, idx) => {
                        const stObj = staff?.find(s => s.name === name);
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/60">
                            <div>
                              <div className="text-xs font-bold text-white">{name}</div>
                              {stObj?.role && <div className="text-[9.5px] text-zinc-500 font-mono">{stObj.role}</div>}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const msgText = generateWhatsAppMessageForStaff(whatsappShareModalData.order, name);
                                const url = `https://wa.me/?text=${encodeURIComponent(msgText)}`;
                                window.open(url, '_blank');
                              }}
                              className="px-2.5 py-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors"
                            >
                              Share Msg
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappShareModalData(null)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
