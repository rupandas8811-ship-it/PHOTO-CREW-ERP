import React, { useState, useMemo, useEffect } from 'react';
import { useRole } from '../RoleContext';
import { 
  Users, Briefcase, Camera, Video, Compass, Clock, Clipboard, FileCheck, CheckCircle, Eye, Search, Calendar, MapPin
} from 'lucide-react';
import { Order, CurrentStage, Staff, Equipment } from '../../types';
import { StatusText } from '../ui/StatusText';
import { ProjectDetailModal } from '../ProjectDetailModal';
import { CameraLensStatsCard, CameraLensTheme } from '../CameraLensStatsCard';
import { convertTimeToDbFormat, triggerAutoScrollAndFocus } from '../../utils';

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
    getLeadCurrentStatus
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

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Multi-Select Searchable Equipment States
  const [selectedKits, setSelectedKits] = useState<string[]>([]);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);

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
  const [selectedStaff, setSelectedStaff] = useState('');

  // Modals / Selection states
  const [activeModalOrderId, setActiveModalOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const canEdit = (currentRole === 'Operations Team' || currentRole === 'Business Owner');
  const [projectDossierId, setProjectDossierId] = useState<string | null>(null);
  
  // Inline edit state for assignment
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assignForm, setAssignForm] = useState({
    photographer_assigned: '',
    videographer_assigned: '',
    drone_operator_assigned: '',
    assistant_assigned: '',
    equipment_kit: '',
    reporting_time: '08:00',
    remarks: '',
    event_status: 'Assigned' as 'Assigned' | 'Completed' | 'Event Scheduled' | 'Event Completed' | 'Raw Footage Received' | string,
    current_stage: 'Order Confirmed' as CurrentStage,
    raw_footage_link: '',
    event_date: '',
    event_time: '10:00'
  });

  // Find order and lead for assigning modal
  const activeOrderInstance = useMemo(() => {
    return assigningOrderId ? orders.find((o) => o.order_id === assigningOrderId) : null;
  }, [assigningOrderId, orders]);

  const parentLeadInstance = useMemo(() => {
    return activeOrderInstance ? (leads || []).find((l) => l.lead_id === activeOrderInstance.lead_id) : null;
  }, [activeOrderInstance, leads]);

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

  const { financeTotal, financeAdvance, financePending } = useMemo(() => {
    if (!activeOrderInstance) return { financeTotal: 0, financeAdvance: 0, financePending: 0 };
    const totalPaidPayments = payments 
      ? payments.filter((p) => p.order_id === activeOrderInstance.order_id || p.lead_id === activeOrderInstance.lead_id).reduce((sum, p) => sum + (p.amount_paid || 0), 0)
      : 0;
    const authAdvance = activeOrderInstance.advance_received || totalPaidPayments || 0;
    const authTotal = activeOrderInstance.quotation_amount || (parentLeadInstance ? parentLeadInstance.budget : 0) || 0;
    const authPending = Math.max(0, authTotal - authAdvance);
    return {
      financeTotal: authTotal,
      financeAdvance: authAdvance,
      financePending: authPending
    };
  }, [activeOrderInstance, parentLeadInstance, payments]);

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

  // Filter orders to show confirmed ones for Operations
  const allowedStages = ['Order Confirmed', 'New Order Received', 'Operations Assigned', 'Event Scheduled', 'Staff Assigned', 'Event Completed', 'Raw Footage Received'];
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

    // Load existing staff assignments for this order EXCEPT if starting a fresh allocation
    const existing = isNewAssignment ? [] : (staffAssignments ? staffAssignments.filter(sa => sa.order_id === order.order_id) : []);
    setActiveAssignments(existing.map(e => ({
      staff_role: e.staff_role,
      staff_id: e.staff_id,
      staff_name: e.staff_name
    })));

    setAssignForm({
      photographer_assigned: isNewAssignment ? '' : (op?.photographer_assigned || ''),
      videographer_assigned: isNewAssignment ? '' : (op?.videographer_assigned || ''),
      drone_operator_assigned: isNewAssignment ? '' : (op?.drone_operator_assigned || ''),
      assistant_assigned: isNewAssignment ? '' : (op?.assistant_assigned || ''),
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
    if (activeAssignments.length === 0) {
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
    if (!assignForm.equipment_kit) {
      alert('Please select at least one equipment kit/item.');
      return;
    }
    
    const kitsToAssign = assignForm.equipment_kit.split(',').map(s => s.trim()).filter(Boolean);
    for (const kitName of kitsToAssign) {
      const found = equipment.find(eq => eq.equipment_name === kitName);
      if (!found) {
        alert(`Equipment "${kitName}" not found in inventory.`);
        return;
      }
      if (found.status !== 'Available') {
        alert(`Equipment "${kitName}" is currently ${found.status} and cannot be assigned.`);
        return;
      }
    }

    try {
      setIsSaving(true);
      // First save the multi-staff role assignments to Supabase & Context state!
      await saveStaffAssignments(assigningOrderId, activeAssignments);
      
      // Update data so that UI reflects new crew directly from lead_staff_assignment_history
      refreshData();

      // Update equipment status in real-time
      if (equipment && updateEquipment) {
        const op = getOpDetails(assigningOrderId);
        const previousKits = op?.equipment_kit ? op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const removedKits = previousKits.filter(pk => !selectedKits.includes(pk));
        
        for (const kitStr of removedKits) {
          const found = equipment.find(eq => eq.equipment_name === kitStr);
          if (found) {
            await updateEquipment(found.equipment_id, { status: 'Available' });
          }
        }

        for (const kitStr of selectedKits) {
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
      const photographer = activeAssignments.find(a => a.staff_role.toLowerCase().includes('photographer'))?.staff_name || '';
      const videographer = activeAssignments.find(a => a.staff_role.toLowerCase().includes('videographer'))?.staff_name || '';
      const droneOp = activeAssignments.find(a => a.staff_role.toLowerCase().includes('drone') || a.staff_role.toLowerCase().includes('aerial'))?.staff_name || '';
      const assistant = activeAssignments.find(a => a.staff_role.toLowerCase().includes('assistant'))?.staff_name || '';
      
      const matchedOrder = orders.find(o => o.order_id === assigningOrderId);
      
      // Set status to Staff Assigned as requested
      const targetStage: CurrentStage = 'Staff Assigned';

      console.log("Saving assignment for order:", assigningOrderId, {
        photographer,
        videographer,
        droneOp,
        assistant,
        equipment: assignForm.equipment_kit,
        reporting_time: convertTimeToDbFormat(assignForm.reporting_time),
        targetStage
      });

      // Assign operations includes event_status and raw footage link if updated
      await assignOperations(assigningOrderId, {
        photographer_assigned: photographer || assignForm.photographer_assigned || '',
        videographer_assigned: videographer || assignForm.videographer_assigned || '',
        drone_operator_assigned: droneOp || assignForm.drone_operator_assigned || '',
        assistant_assigned: assistant || assignForm.assistant_assigned || '',
        equipment_kit: assignForm.equipment_kit,
        reporting_time: convertTimeToDbFormat(assignForm.reporting_time),
        remarks: assignForm.remarks,
        event_status: targetStage,
        current_stage: targetStage,
        event_date: assignForm.event_date,
        event_time: convertTimeToDbFormat(assignForm.event_time),
        assigned_staff: activeAssignments.map(a => a.staff_name).join(', '),
        assigned_roles: activeAssignments.map(a => a.staff_role).join(', ')
      } as any);

      if (matchedOrder) {
        setSuccessModalData({
          orderId: assigningOrderId,
          customerName: matchedOrder.customer_name,
          order: { ...matchedOrder, current_stage: targetStage },
          assignments: [...activeAssignments]
        });
      }

      setAssigningOrderId(null);
      alert("Crew Assigned Successfully");
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
    const totalLeads = operationsOrders.length;
    
    const scheduled = operationsOrders.filter(o => o.current_stage === 'Event Scheduled').length;
    
    const completed = operationsOrders.filter(o => isCompletedEvent(o)).length;
    
    const pending = operationsOrders.filter(o => 
      o.current_stage === 'Order Confirmed' || 
      o.current_stage === 'Operations Assigned'
    ).length;

    const rawFootagePending = operationsOrders.filter(o => {
      const rf = rawFootage ? rawFootage.find(f => f.order_id === o.order_id) : null;
      return o.current_stage === 'Event Completed' && (!rf || !rf.raw_received || rf.ingest_status === 'Pending');
    }).length;

    const readyForProduction = operationsOrders.filter(o => 
      ['Raw Footage Received', 'Editor Assigned', 'Editing Started'].includes(o.current_stage)
    ).length;

    return {
      totalLeads,
      scheduled,
      completed,
      pending,
      rawFootagePending,
      readyForProduction
    };
  }, [orders, operationsOrders, rawFootage, operations]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label: "Total Operations Leads", val: stats.totalLeads, theme: 'purple' as CameraLensTheme, filterValue: 'All', trendText: 'Active', chartPoints: [10, 18, 14, 25, 20, 31, 35] },
          { label: "Scheduled Events", val: stats.scheduled, theme: 'cyan' as CameraLensTheme, filterValue: 'Event Scheduled', trendText: 'Rostered', chartPoints: [5, 9, 7, 14, 11, 16, 15] },
          { label: "Completed Events", val: stats.completed, theme: 'green' as CameraLensTheme, filterValue: 'Event Completed', trendText: 'Closed Out', chartPoints: [8, 15, 12, 20, 16, 25, 24] },
          { label: "Raw Footage Pending", val: stats.rawFootagePending, theme: 'red' as CameraLensTheme, filterValue: 'Raw Footage Pending', trendText: 'Ingest Lag', chartPoints: [2, 4, 1, 5, 3, 6, 2] },
          { label: "Ready for Production", val: stats.readyForProduction, theme: 'purple' as CameraLensTheme, filterValue: 'Ready for Production', trendText: 'In Suite', chartPoints: [11, 14, 12, 18, 15, 20, 17] },
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

      {/* ### New Orders Received */}
      <div id="new_orders_received_section" className="bg-zinc-950/80 border border-amber-500/25 p-5 rounded-2xl mb-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest font-mono">
              ### New Orders Received
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            {operationsOrders.filter(o => o.current_stage === 'Order Confirmed' || o.current_stage === 'New Order Received').length} Pending Action
          </span>
        </div>

        <div className="overflow-x-auto border border-zinc-900 rounded-xl">
          <table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-[1200px]">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/40 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="p-3 font-bold">Order ID</th>
                <th className="p-3 font-bold">Customer Name</th>
                <th className="p-3 font-bold">Event Type</th>
                <th className="p-3 font-bold">Event Date</th>
                <th className="p-3 font-bold">Event Time</th>
                <th className="p-3 font-bold">Reporting Time</th>
                <th className="p-3 font-bold">Package Name</th>
                <th className="p-3 font-bold">Order Confirmation Date</th>
                <th className="p-3 font-bold">Current Status</th>
                <th className="p-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {(() => {
                const newOrdersList = operationsOrders.filter(o => o.current_stage === 'Order Confirmed' || o.current_stage === 'New Order Received');
                if (newOrdersList.length === 0) {
                  return (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-zinc-500 italic">
                        No new confirmed orders waiting in receiving bay.
                      </td>
                    </tr>
                  );
                }
                return newOrdersList.map(ord => {
                  const op = operations.find(o => o.order_id === ord.order_id);
                  const confDate = ord.created_at ? ord.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
                  return (
                    <tr key={ord.order_id} className="hover:bg-zinc-900/40 transition-all font-mono">
                      <td className="p-3 text-amber-400 font-bold">{ord.order_id}</td>
                      <td className="p-3 font-sans font-bold text-white">{ord.customer_name}</td>
                      <td className="p-3 text-zinc-300 font-sans">{ord.event_type === 'Other' ? (ord.custom_event_name || ord.custom_event_type || 'Other') : ord.event_type}</td>
                      <td className="p-3 text-zinc-405">{ord.event_date || '—'}</td>
                      <td className="p-3 text-zinc-405">{ord.event_time || '—'}</td>
                      <td className="p-3 text-zinc-405">{op?.reporting_time || '—'}</td>
                      <td className="p-3 text-zinc-300 font-sans">{ord.package_name}</td>
                      <td className="p-3 text-zinc-405">{confDate}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                          ord.current_stage === 'Order Confirmed' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {ord.current_stage}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(ord.current_stage === 'Order Confirmed' || ord.current_stage === 'New Order Received') && (
                            <button
                              onClick={() => startAssigning(ord)}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded cursor-pointer transition-all uppercase"
                            >
                              Schedule / Assign
                            </button>
                          )}
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
              const mainBoardList = sortedOrders.filter(o => {
                if (statusFilter === 'All') {
                  return o.current_stage !== 'Order Confirmed' && o.current_stage !== 'New Order Received';
                }
                return true;
              });

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
                    <td className="p-4 text-[11px] text-zinc-350 min-w-[200px]">
                      {crewNames.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {crewNames.map((member, idx) => (
                            <span key={idx} className="bg-zinc-850 text-zinc-250 px-1.5 py-1 rounded border border-zinc-800 text-[10px] font-mono break-words whitespace-normal leading-tight">
                              {member}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-500 font-mono text-[10.5px]">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusText status={currentStage} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Always visible: View Details */}
                        <button
                          onClick={() => setProjectDossierId(ord.order_id)}
                          className="px-2 py-1 bg-zinc-805 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-mono font-bold border border-zinc-700 cursor-pointer transition-all uppercase flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" /> Details
                        </button>

                        {/* Update Status */}
                        {canEdit && !isLocked && (
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
                                setFootageForm({
                                  footage_link: (existingRf && (existingRf.raw_received || existingRf.status === 'Received')) ? (existingRf.server_path || '') : '',
                                  storage_type: 'Google Drive',
                                  upload_notes: ''
                                });
                                // Initialize footageHandoverStates for each assigned equipment item
                                const op = getOpDetails(ord.order_id);
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
                            <option value="Operations Assigned">Operations Assigned</option>
                            <option value="Staff Assigned">Staff Assigned</option>
                            <option value="Event Scheduled">Event Scheduled</option>
                            <option value="Event Completed">Event Completed</option>
                            <option value="Raw Footage Received">Raw Footage Received</option>
                          </select>
                        )}

                        {/* WhatsApp Staff: visible when assignment exists */}
                        {crewNames.length > 0 && (
                          <button
                            onClick={() => {
                              setSuccessModalData({
                                orderId: ord.order_id,
                                customerName: ord.customer_name,
                                order: ord,
                                assignments: orderAssignments.map(a => ({ staff_role: a.staff_role, staff_name: a.staff_name }))
                              });
                            }}
                            className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-mono font-bold cursor-pointer transition-all uppercase"
                            title="Share roster with team on WhatsApp"
                          >
                            WhatsApp
                          </button>
                        )}
                        {/* Before Event Actions: Assign Staff */}
                        {canEdit && !isLocked && (currentStage === 'Order Confirmed' || currentStage === 'New Order Received' || currentStage === 'Operations Assigned') && (
                          <button
                            onClick={() => startAssigning(ord)}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30 rounded cursor-pointer transition-all uppercase"
                          >
                            Assign Staff
                          </button>
                        )}

                        {/* Edit Assignment: visible in post-assignment stages if canEdit */}
                        {canEdit && !isLocked && (currentStage === 'Staff Assigned' || currentStage === 'Event Scheduled') && (
                          <button
                            onClick={() => startAssigning(ord)}
                            className="px-2 py-1 bg-sky-505/10 hover:bg-sky-505/20 text-zinc-400 hover:text-zinc-300 font-mono text-[9px] border border-zinc-750 rounded cursor-pointer transition-all uppercase"
                          >
                             Roster
                          </button>
                        )}

                        {/* Step 4 - Event Completed: Receive Raw Footage */}
                        {canEdit && (currentStage === 'Event Completed') && (
                          <button
                            onClick={() => {
                              setReceivingFootageOrderId(ord.order_id);
                              const existingRf = rawFootage?.find(f => f.order_id === ord.order_id);
                              setFootageForm({
                                footage_link: (existingRf && (existingRf.raw_received || existingRf.status === 'Received')) ? (existingRf.server_path || '') : '',
                                storage_type: 'Google Drive',
                                upload_notes: ''
                              });

                              // Initialize footageHandoverStates for each assigned equipment item
                              const op = getOpDetails(ord.order_id);
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
                            }}
                            className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-mono font-bold text-[10px] rounded cursor-pointer transition-all uppercase animate-pulse"
                          >
                            Receive Raw Footage
                          </button>
                        )}

                        {/* After Footage Uploaded View/Copy/Open Actions */}
                        {currentStage === 'Raw Footage Received' && (() => {
                          const rf = rawFootage ? rawFootage.find(f => f.order_id === ord.order_id) : null;
                          const path = rf?.server_path || '';
                          
                          if (!path) {
                            return (
                              <span className="text-zinc-550 italic font-mono text-[10px] bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800/50">
                                No Raw Footage Link Available
                              </span>
                            );
                          }

                          return (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => alert(`Footage Link (via ${rf?.storage_type || 'Google Drive'}): \n\n${path}`)}
                                className="px-1.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-450 font-mono text-[9px] font-bold rounded cursor-pointer"
                                title="View Footage Link"
                              >
                                View Link
                              </button>
                              <button
                                onClick={() => {
                                  if (path) {
                                    navigator.clipboard.writeText(path);
                                    alert('Copied raw footage drive link to clipboard!');
                                  }
                                }}
                                className="px-1.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-450 font-mono text-[9px] font-bold rounded cursor-pointer"
                                title="Copy Footage Link"
                              >
                                Copy Link
                              </button>
                              <a
                                href={path}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                className="px-1.5 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-505/20 text-indigo-400 font-mono text-[9px] font-bold rounded cursor-pointer inline-block"
                                title="Open Drive Link"
                              >
                                Open Link
                              </a>
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
          <div id="assign_staff_modal" className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-5xl shadow-2xl relative animate-in zoom-in duration-200 overflow-hidden">
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
              <div className="p-5 overflow-y-auto max-h-[75vh] grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT SIDE: Sales Handover Dossier (Locked / Read-Only) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-2">
                    <span className="text-amber-500 font-bold block">🔒</span>
                    <span>Sales Handover Dossier (Locked)</span>
                  </div>

                  {/* Customer Information Card */}
                  <div className="bg-zinc-950/45 border border-zinc-850 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-[10px] text-zinc-655 select-none">
                      👤 CUSTOMER
                    </div>
                    <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                      Customer Information
                    </h4>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-mono">Customer Name</span>
                        <span className="font-bold text-white font-sans text-xs block">
                          {activeOrderInstance?.customer_name || parentLeadInstance?.customer_name || 'N/A'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase font-mono">Mobile Number</span>
                          <span className="font-mono text-zinc-200 font-medium block">
                            {activeOrderInstance?.mobile || parentLeadInstance?.mobile || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-505 block uppercase font-mono">WhatsApp Number</span>
                          <span className="font-mono text-zinc-200 font-medium flex items-center gap-1">
                            {parentLeadInstance?.whatsapp_number || parentLeadInstance?.mobile || activeOrderInstance?.mobile || 'N/A'}
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-505 block uppercase font-mono">Email Coordinates</span>
                        <span className="text-zinc-300 font-mono text-[11px] break-all block">
                          {parentLeadInstance?.email || 'N/A'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <span className="text-[10px] text-zinc-505 block uppercase font-mono">Full Address</span>
                          <span className="text-zinc-200 font-sans text-[11px] block leading-tight">
                            {parentLeadInstance?.address || activeOrderInstance?.event_location || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-550 block uppercase font-mono">City</span>
                          <span className="text-zinc-200 font-bold uppercase font-mono text-[11px] block">
                            {parentLeadInstance?.city || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Event Information Card */}
                  <div className="bg-zinc-950/45 border border-zinc-850 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-[10px] text-zinc-655 select-none">
                      🎥 EVENT
                    </div>
                    <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                      Event & Package Coordinates
                    </h4>
                    <div className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event Type</span>
                          <span className="font-semibold text-white uppercase text-[11px] block">
                            {(() => {
                              const et = activeOrderInstance?.event_type || parentLeadInstance?.event_type;
                              if (et === 'Other') {
                                return activeOrderInstance?.custom_event_name || activeOrderInstance?.custom_event_type || parentLeadInstance?.custom_event_name || parentLeadInstance?.custom_event_type || 'Other';
                              }
                              return et || 'N/A';
                            })()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-505 block uppercase font-mono">Shoot Type</span>
                          <span className="text-zinc-350 font-medium uppercase text-[11px] block">
                            {activeOrderInstance?.shoot_type || parentLeadInstance?.shoot_type || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 border-t border-b border-zinc-900 py-2">
                        <div>
                          <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event Date</span>
                          <span className="font-mono text-white font-bold block">{activeOrderInstance?.event_date || parentLeadInstance?.event_date || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event Timing</span>
                          <span className="font-mono text-zinc-300 block">{activeOrderInstance?.event_time || parentLeadInstance?.event_time || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-505 block uppercase font-mono">Reporting</span>
                          <span className="font-mono text-amber-400 font-extrabold block">{activeOrderInstance?.reporting_time || parentLeadInstance?.reporting_time || '08:00 AM'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-505 block uppercase font-mono">Confirmed Package Name</span>
                        <span className="text-white font-medium block">
                          {activeOrderInstance?.package_name || 'Custom Shoot Package'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-505 block uppercase font-mono">Package Composition & Line Items</span>
                        <div className="text-zinc-300 bg-zinc-950/80 px-2.5 py-1.5 rounded-xl border border-zinc-900 font-mono text-[10.5px] whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                          {packageDetailsString}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-505 block uppercase font-mono">CRM Special Notes / Customer Request</span>
                        <div className="text-zinc-350 italic font-sans text-xs bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900 leading-relaxed max-h-24 overflow-y-auto">
                          {parentLeadInstance?.remarks || 'No remarks provided.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information Card */}
                  <div className="bg-zinc-950/45 border border-zinc-850 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-[10px] text-zinc-655 select-none">
                      💰 FINANCE
                    </div>
                    <h4 className="text-[11px] font-mono font-bold uppercase text-emerald-400 tracking-wider">
                      Financial Summary (View-Only)
                    </h4>
                    <div className="grid grid-cols-3 gap-2.5 text-center leading-normal">
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900">
                        <span className="text-[9px] text-zinc-505 block uppercase font-mono">Total Quote</span>
                        <span className="font-black text-white text-xs font-mono block mt-0.5">₹{financeTotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900">
                        <span className="text-[9px] text-zinc-550 block uppercase font-mono">Advance Paid</span>
                        <span className="font-black text-emerald-400 text-xs font-mono block mt-0.5">₹{financeAdvance.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900">
                        <span className="text-[9px] text-zinc-550 block uppercase font-mono">Pending Bal</span>
                        <span className="font-black text-amber-500 text-xs font-mono block mt-0.5">₹{financePending.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE: Operations Allocations (Active Input) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-2">
                    <span className="text-sky-400 font-bold block">🛠️</span>
                    <span>Staff Crew & Equipment Assignments</span>
                  </div>

                  {/* Crew Assignment Section */}
                  <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-850 space-y-3">
                    <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                      Crew Allocation (Multi-Role Assignment)
                    </h4>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-mono text-zinc-400 mb-1">Select Role</label>
                        <select
                          value={selectedRole}
                          onChange={(e) => {
                            const role = e.target.value;
                            setSelectedRole(role);
                            const available = getStaffForRole(role);
                            if (available.length > 0) {
                              setSelectedStaff(available[0].name);
                            } else {
                              setSelectedStaff('');
                            }
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                        >
                          <option value="Lead Photographer">Lead Photographer</option>
                          <option value="Associate Photographer">Associate Photographer</option>
                          <option value="Lead Videographer">Lead Videographer</option>
                          <option value="Drone & Aerial Operator">Drone & Aerial Operator</option>
                          <option value="Production Assistant">Production Assistant</option>
                          <option value="Post-Production Editor">Post-Production Editor</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-mono text-zinc-400 mb-1">Select Member</label>
                        <select
                          value={selectedStaff}
                          onChange={(e) => setSelectedStaff(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-805 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">-- Choose Staff member --</option>
                          {getStaffForRole(selectedRole).map(st => (
                            <option key={st.staff_id} value={st.name}>{st.name}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedStaff) {
                            alert('Please select a staff member first.');
                            return;
                          }
                          const memberInfo = getStaffForRole(selectedRole).find(st => st.name === selectedStaff);
                          const staffId = memberInfo?.staff_id || 'MOCK-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                          
                          const dupe = activeAssignments.some(a => a.staff_role === selectedRole && a.staff_name === selectedStaff);
                          if (dupe) {
                            alert('This member is already assigned to this role.');
                            return;
                          }
                          
                          setActiveAssignments([...activeAssignments, {
                            staff_role: selectedRole,
                            staff_id: staffId,
                            staff_name: selectedStaff
                          }]);
                        }}
                        className="sm:mt-5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 h-[36px]"
                      >
                        <span>+</span>
                        <span>Assign</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-850/60">
                      <label className="block text-[10px] font-mono text-zinc-400 font-bold uppercase">
                        Current Allocation Summary:
                      </label>
                      {activeAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeAssignments.map((a, idx) => (
                            <div 
                              key={idx} 
                              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] text-zinc-300 flex items-center gap-1.5"
                            >
                              <span className="font-mono text-[10px] text-zinc-500">{a.staff_role}:</span>
                              <span className="font-semibold text-amber-400">{a.staff_name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAssignments(activeAssignments.filter((_, i) => i !== idx));
                                }}
                                className="text-zinc-500 hover:text-rose-400 font-bold ml-1 text-[10px] cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-500 italic">No personnel assigned to this project yet. Please assign staff above.</div>
                      )}
                    </div>
                  </div>

                  {/* Equipment Allocation */}
                  <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-850 space-y-3 relative">
                    <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-400">
                      Assign Equipment Kits & Assemblies
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Type to search equipment (e.g. Drone, Camera...)"
                          value={equipmentSearchQuery}
                          onFocus={() => setIsEquipmentDropdownOpen(true)}
                          onChange={(e) => setEquipmentSearchQuery(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                        />
                        {equipmentSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setEquipmentSearchQuery('')}
                            className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEquipmentDropdownOpen(!isEquipmentDropdownOpen)}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold font-mono border border-zinc-750"
                      >
                        {isEquipmentDropdownOpen ? 'Close ▴' : 'Browse ▾'}
                      </button>
                    </div>

                     {isEquipmentDropdownOpen && (() => {
                      const filteredGearOptions = availableGearOptions.filter(opt =>
                        opt.toLowerCase().includes(equipmentSearchQuery.toLowerCase())
                      );
                      
                      return (
                        <div className="absolute left-4 right-4 z-50 mt-1 max-h-56 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl divide-y divide-zinc-900">
                          {filteredGearOptions.length > 0 ? (
                            filteredGearOptions.map((opt, i) => {
                              const eqItem = equipment ? equipment.find(eq => eq.equipment_name === opt) : null;
                              
                              const isSelected = selectedKits.includes(opt);
                              
                              const displayName = opt;
                              const category = eqItem ? eqItem.equipment_type : 'Kit Preset';
                              const status = eqItem ? eqItem.status : 'Available';
                              
                              const statusColor = 
                                status === 'Available' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                status === 'Assigned' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                'text-zinc-500 bg-zinc-800 border-zinc-700';

                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      const updated = selectedKits.filter(k => k !== opt);
                                      setSelectedKits(updated);
                                      setAssignForm(prev => ({ ...prev, equipment_kit: updated.join(', ') }));
                                    } else {
                                      const updated = [...selectedKits, opt];
                                      setSelectedKits(updated);
                                      setAssignForm(prev => ({ ...prev, equipment_kit: updated.join(', ') }));
                                    }
                                  }}
                                  className={`w-full text-left px-4 py-3 text-xs transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                                    isSelected 
                                      ? 'bg-amber-400/10 text-amber-300 font-bold' 
                                      : 'hover:bg-zinc-900 text-zinc-300'
                                  }`}
                                >
                                  <div className="flex flex-col gap-1">
                                    <span className="font-sans text-white text-xs font-semibold">{displayName}</span>
                                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Category: {category}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono border ${statusColor}`}>
                                      {status}
                                    </span>
                                    {isSelected ? (
                                      <span className="text-amber-500 text-[10px] font-mono">✓ Selected</span>
                                    ) : (
                                      <span className="text-zinc-600 text-[10px] font-mono">+ Add</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="p-4 text-xs italic text-center text-zinc-500">
                              No equipment matching "{equipmentSearchQuery}"
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedKits.length > 0 ? (
                        selectedKits.map((kit, index) => (
                          <span 
                            key={index} 
                            className="bg-amber-400/15 text-amber-300 px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-medium flex items-center gap-1.5 border border-amber-400/20"
                          >
                            <span>{kit}</span>
                            <button 
                              type="button" 
                              onClick={() => {
                                const updated = selectedKits.filter(k => k !== kit);
                                setSelectedKits(updated);
                                setAssignForm(prev => ({ ...prev, equipment_kit: updated.join(', ') }));
                              }} 
                              className="text-amber-500 hover:text-rose-400 font-bold text-xs"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-550 italic">No equipment kits or assemblies assigned. Please select.</span>
                      )}
                    </div>
                  </div>

                  {/* Read-Only Prefilled Timings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-850">
                    <div>
                      <label className="block text-[11px] font-mono font-extrabold uppercase mb-1 text-zinc-500 flex items-center gap-1 select-none">
                        <span>🔒</span> <span>Event Date</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={assignForm.event_date}
                        className="w-full bg-zinc-950/80 border border-zinc-900 text-zinc-400 rounded-xl px-3 py-2 text-xs font-mono cursor-not-allowed select-none animate-pulse"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono font-extrabold uppercase mb-1 text-zinc-500 flex items-center gap-1 select-none">
                        <span>🔒</span> <span>Event Time</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={assignForm.event_time}
                        className="w-full bg-zinc-950/80 border border-zinc-900 text-zinc-400 rounded-xl px-3 py-2 text-xs font-mono cursor-not-allowed select-none animate-pulse"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono font-extrabold uppercase mb-1 text-zinc-500 flex items-center gap-1 select-none">
                        <span>🔒</span> <span>Reporting Time</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={assignForm.reporting_time || '08:00'}
                        className="w-full bg-zinc-950/80 border border-zinc-900 text-zinc-400 rounded-xl px-3 py-2 text-xs font-mono cursor-not-allowed select-none animate-pulse"
                      />
                    </div>
                  </div>

                  {/* Operational Notes Remarks */}
                  <div>
                    <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-400 mb-1">
                      Operations Remarks & Staff Instructions (Safety/Site clearance notes)
                    </label>
                    <textarea
                      rows={2.5}
                      value={assignForm.remarks}
                      onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-550 focus:outline-none focus:border-amber-400"
                      placeholder="Enter specific team alerts, logistics, backup setup coordinates, or instructions for assigned staff..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Workflow Dashboard Status */}
                    <div>
                      <label className="block text-[11px] font-mono font-extrabold uppercase text-amber-500 mb-1">
                        Workflow Stage Selection
                      </label>
                      <select
                        value={assignForm.current_stage}
                        onChange={(e) => setAssignForm({ ...assignForm, current_stage: e.target.value as CurrentStage })}
                        className="w-full bg-zinc-950 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Order Confirmed">Order Confirmed</option>
                        <option value="Operations Assigned">Operations Assigned</option>
                        <option value="Event Scheduled">Event Scheduled</option>
                        <option value="Event Completed">Event Completed</option>
                        <option value="Raw Footage Received">Raw Footage Received</option>
                      </select>
                    </div>

                    {/* Operational Event In progress Status */}
                    <div>
                      <label className="block text-[11px] font-zinc-400 font-mono font-extrabold uppercase mb-1 text-sky-400">
                        Operational Status
                      </label>
                      <select
                        value={assignForm.event_status}
                        onChange={(e) => setAssignForm({ ...assignForm, event_status: e.target.value as 'Assigned' | 'Completed' })}
                        className="w-full bg-zinc-950 border border-sky-500/20 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                      >
                        <option value="Assigned">Assigned / In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* S3 or Drive folder link */}
                  <div>
                    <label className="block text-[11px] font-mono font-extrabold uppercase text-purple-400 mb-1">
                      Raw Footage Vault link (Optional)
                    </label>
                    <input
                      type="text"
                      value={assignForm.raw_footage_link}
                      onChange={(e) => setAssignForm({ ...assignForm, raw_footage_link: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none font-medium"
                      placeholder="s3://vault-studio-production/ORD-.../raw/"
                    />
                  </div>
                </div>

              </div>

              {/* Form Actions Footer */}
              <div className="flex justify-end gap-2 border-t border-zinc-800 p-4 bg-zinc-950/40">
                <button
                  type="button"
                  onClick={() => setAssigningOrderId(null)}
                  className="px-5 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs rounded-xl cursor-pointer duration-150 font-mono uppercase tracking-wider text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5 duration-150 font-mono uppercase tracking-wider text-[11px]"
                >
                  {isSaving ? 'Synchronizing...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Completed Modal */}
      {closingOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-2xl w-full max-w-lg shadow-2xl relative p-5 space-y-4">
            <h3 className="text-xs font-mono font-black uppercase text-amber-500 flex items-center gap-1.5">
              <span>🎬</span> Close event shoot ~ {closingOrderId}
            </h3>
            <p className="text-xs text-zinc-400">
              By confirming, this switches status to **Event Completed** and initializes raw footage ingest for editors.
            </p>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-450 uppercase font-mono">
                Ingest Storage directory bucket path:
              </label>
              <input
                type="text"
                value={serverPath}
                onChange={(e) => setServerPath(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setClosingOrderId(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCompletion}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Mark Shoot Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Scheduling Modal (Step 2) */}
      {schedulingOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-805 rounded-2xl w-full max-w-sm shadow-2xl relative p-5 space-y-4">
            <h3 className="text-sm font-bold text-sky-400 font-mono uppercase flex items-center gap-1.5 border-b border-zinc-800 pb-2">
              <span>📅</span> Schedule Event ~ {schedulingOrderId}
            </h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const op = getOpDetails(schedulingOrderId);
                await assignOperations(schedulingOrderId, {
                  photographer_assigned: op?.photographer_assigned || '',
                  videographer_assigned: op?.videographer_assigned || '',
                  drone_operator_assigned: op?.drone_operator_assigned || '',
                  assistant_assigned: op?.assistant_assigned || '',
                  equipment_kit: op?.equipment_kit || '',
                  reporting_time: scheduleEventForm.reporting_time,
                  remarks: scheduleEventForm.remarks || op?.remarks || '',
                  event_date: scheduleEventForm.event_date,
                  event_time: scheduleEventForm.event_time,
                  event_status: 'Event Scheduled',
                  current_stage: 'Event Scheduled'
                });
                setSchedulingOrderId(null);
                alert(`Event successfully scheduled and locked!`);
              } catch (err: any) {
                alert(`Error scheduling event: ${err.message}`);
              }
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono mb-1">
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  value={scheduleEventForm.event_date}
                  onChange={(e) => setScheduleEventForm({ ...scheduleEventForm, event_date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono mb-1">
                  Event Time *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10:00 AM - 6:00 PM"
                  value={scheduleEventForm.event_time}
                  onChange={(e) => setScheduleEventForm({ ...scheduleEventForm, event_time: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono mb-1">
                  Reporting Time *
                </label>
                <input
                  type="time"
                  required
                  value={scheduleEventForm.reporting_time}
                  onChange={(e) => setScheduleEventForm({ ...scheduleEventForm, reporting_time: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono mb-1">
                  Notes / Site Instructions
                </label>
                <textarea
                  value={scheduleEventForm.remarks}
                  onChange={(e) => setScheduleEventForm({ ...scheduleEventForm, remarks: e.target.value })}
                  placeholder="e.g. Traditional wedding wear, early arrival..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-sans"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSchedulingOrderId(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Dossier Modal */}
      <ProjectDetailModal 
        isOpen={projectDossierId !== null} 
        onClose={() => setProjectDossierId(null)} 
        orderId={projectDossierId} 
      />

      {/* 4. Staff Assignment Success Modal / WhatsApp Share Popup */}
      {successModalData && (() => {
        const getOpDetails = (orderId: string) => {
          return operations.find(o => o.order_id === orderId);
        };

        const generateWhatsAppLink = (role: string, name: string) => {
          const order = successModalData.order;
          const op = getOpDetails(order.order_id);
          const reportingTime = op?.reporting_time || '08:00';
          const specialNotes = op?.remarks || 'Please report on time with fully charged gears.';
          
          const kits = op?.equipment_kit ? op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          const equipmentLines = kits.map(kitName => {
            const eq = equipment?.find(e => e.equipment_name === kitName);
            if (eq) {
              const codeStr = eq.equipment_id ? ` [Code: ${eq.equipment_id}]` : '';
              const qtyStr = eq.quantity !== undefined && eq.quantity !== null && eq.quantity > 0 ? ` [Qty: ${eq.quantity}]` : '';
              return `* ${eq.equipment_name}${codeStr}${qtyStr}`;
            }
            return `* ${kitName}`;
          });
          const assignedEquipmentList = equipmentLines.length > 0 ? equipmentLines.join('\n') : '* None assigned';

          const textMessage = `Event Assignment Notification

Event ID / Order ID: ${order.order_id}
Customer Name: ${order.customer_name}
Event Type: ${order.event_type}
Event Date: ${order.event_date}
Event Time: ${order.event_time}
Event Location: ${order.event_location}
Reporting Time: ${reportingTime}
Assigned Staff Name: ${name}
Assigned Staff Role: ${role}

Assigned Equipment:
${assignedEquipmentList}

Contact Number: ${order.mobile || 'N/A'}
Special Instructions: ${specialNotes}

Please report on time and update status through the portal.`;

          return `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;
        };

        const generateGroupWhatsAppLink = () => {
          const order = successModalData.order;
          const op = getOpDetails(order.order_id);
          const reportingTime = op?.reporting_time || '08:00';
          const specialNotes = op?.remarks || 'Please check gear checklists.';
          
          const crewSummary = successModalData.assignments
            .map(a => `- ${a.staff_role}: ${a.staff_name}`)
            .join('\n');
            
          const kits = op?.equipment_kit ? op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          const equipmentLines = kits.map(kitName => {
            const eq = equipment?.find(e => e.equipment_name === kitName);
            if (eq) {
              const codeStr = eq.equipment_id ? ` [Code: ${eq.equipment_id}]` : '';
              const qtyStr = eq.quantity !== undefined && eq.quantity !== null && eq.quantity > 0 ? ` [Qty: ${eq.quantity}]` : '';
              return `* ${eq.equipment_name}${codeStr}${qtyStr}`;
            }
            return `* ${kitName}`;
          });
          const assignedEquipmentList = equipmentLines.length > 0 ? equipmentLines.join('\n') : '* None assigned';

          const textMessage = `Event Assignment Notification (Complete Crew)

Event ID / Order ID: ${order.order_id}
Customer Name: ${order.customer_name}
Event Type: ${order.event_type}
Event Date: ${order.event_date}
Event Time: ${order.event_time}
Event Location: ${order.event_location}
Reporting Time: ${reportingTime}
Crew Lineup:
${crewSummary}

Assigned Equipment:
${assignedEquipmentList}

Contact Number: ${order.mobile || 'N/A'}
Special Instructions: ${specialNotes}

Please report on time and update status through the portal.`;

          return `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;
        };

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-750 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
              {/* Tech accents */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Staff Assigned Successfully</h3>
                  <p className="text-xs text-zinc-400">Order Ref: {successModalData.orderId}</p>
                </div>
              </div>

              <div className="bg-zinc-950/60 rounded-xl p-3.5 border border-zinc-850 mb-5 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2 text-zinc-400">
                  <div><span className="text-zinc-550 font-mono">CUSTOMER:</span> <strong className="text-zinc-250 font-sans">{successModalData.customerName}</strong></div>
                  <div><span className="text-zinc-550 font-mono">EVENT:</span> <strong className="text-zinc-250 font-sans">{successModalData.order.event_type === 'Other' ? (successModalData.order.custom_event_name || successModalData.order.custom_event_type || 'Other') : successModalData.order.event_type}</strong></div>
                  <div><span className="text-zinc-550 font-mono">DATE:</span> <strong className="text-emerald-400 font-mono">{successModalData.order.event_date}</strong></div>
                  <div><span className="text-zinc-550 font-mono">TIME:</span> <strong className="text-zinc-300 font-mono">{successModalData.order.event_time}</strong></div>
                  <div className="col-span-2"><span className="text-zinc-550 font-mono">LOCATION:</span> <strong className="text-zinc-350">{successModalData.order.event_location}</strong></div>
                </div>
              </div>

              <h4 className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-2.5 font-bold">Crew Roster & WhatsApp Share Links</h4>
              <div className="space-y-2 mb-6 max-h-[180px] overflow-y-auto pr-1">
                {successModalData.assignments.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No custom staff assignments saved.</p>
                ) : (
                  successModalData.assignments.map((assignment, index) => {
                    const indLink = generateWhatsAppLink(assignment.staff_role, assignment.staff_name);
                    return (
                      <div key={index} className="flex items-center justify-between p-2.5 bg-zinc-950/40 rounded-xl border border-zinc-850 hover:bg-zinc-950/80 transition-colors">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] uppercase font-mono text-zinc-400 font-bold">{assignment.staff_role}</span>
                          <span className="text-xs text-white font-semibold">{assignment.staff_name}</span>
                        </div>
                        <a
                          href={indLink}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-505 text-white font-mono font-bold text-[10px] rounded-lg tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          💬 SHARE DETAILS
                        </a>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-850">
                <a
                  href={generateGroupWhatsAppLink()}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-550 text-white font-bold text-xs rounded-xl tracking-wide transition-all shadow-lg text-center cursor-pointer"
                >
                  💬 Share Complete Crew Lineup on WhatsApp
                </a>
                <button
                  onClick={() => setSuccessModalData(null)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-350 font-bold text-xs rounded-xl transition-all cursor-pointer border border-transparent"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

              const hasHardDisk = !!hardDiskReceived;
              const hasMemoryCard = !!memoryCardReceived;
              const hasCloudLink = !!(footageForm.footage_link && footageForm.footage_link.trim());

              if (!hasHardDisk && !hasMemoryCard && !hasCloudLink) {
                alert("Please provide at least one raw footage source: Hard Disk, Memory Card, or Cloud/Drive Link.");
                return;
              }

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

                // Combine physical storage states into the upload notes column
                const hardDiskStr = hardDiskReceived ? 'YES' : 'NO';
                const memoryCardStr = memoryCardReceived ? 'YES' : 'NO';
                const compositeNotes = [
                  `Hard Disk Received: ${hardDiskStr}`,
                  `Memory Card Received: ${memoryCardStr}`,
                  footageForm.upload_notes ? `Notes: ${footageForm.upload_notes}` : null
                ].filter(Boolean).join(' | ');

                await confirmRawFootageReceived(
                  receivingFootageOrderId,
                  footageForm.footage_link,
                  footageForm.storage_type,
                  compositeNotes,
                  paymentCollectionStatus,
                  additionalReceived,
                  transactionId
                );
                
                setReceivingFootageOrderId(null);
                setFootageForm({ footage_link: '', storage_type: 'Google Drive', upload_notes: '' });
                setHardDiskReceived(false);
                setMemoryCardReceived(false);
                alert("Raw Footage Handover Complete");
              } catch (err: any) {
                console.error("Failed to receive raw footage:", err);
                alert("Failed to save and move raw footage. Error: " + (err.message || "Please try again."));
              } finally {
                setIsSaving(false);
                // Reset state to ensure next is clean
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

              {/* Physical Storage media checkboxes requested by user */}
              <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hardDiskReceived}
                    onChange={(e) => setHardDiskReceived(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 text-purple-600 focus:ring-purple-500 bg-zinc-900"
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-300">Hard Disk Received</span>
                    <span className="text-[9px] text-zinc-500">Physical storage turned in</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={memoryCardReceived}
                    onChange={(e) => setMemoryCardReceived(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 text-purple-600 focus:ring-purple-500 bg-zinc-900"
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-300">Memory Card Received</span>
                    <span className="text-[9px] text-zinc-500">Camera SD/CFexpress card returned</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono mb-1">
                  Storage Type *
                </label>
                <select
                  required
                  value={footageForm.storage_type}
                  onChange={(e) => setFootageForm({ ...footageForm, storage_type: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                >
                  <option value="Google Drive">Google Drive</option>
                  <option value="Dropbox">Dropbox</option>
                  <option value="OneDrive">OneDrive</option>
                  <option value="Supabase Storage">Supabase Storage</option>
                  <option value="Other">Other</option>
                </select>
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
                        <div className="grid grid-cols-2 gap-1.5">
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

              {/* Popup Section: Payment Collection Status */}
              {(() => {
                const targetOrder = orders.find(o => o.order_id === receivingFootageOrderId);
                if (!targetOrder) return null;

                const totalAmount = targetOrder.quotation_amount || targetOrder.budget || 0;
                const advanceReceived = targetOrder.advance_received || 0;
                const calculatedRemaining = Math.max(0, totalAmount - advanceReceived - additionalReceived);

                return (
                  <div className="bg-zinc-950 p-4 rounded-xl border border-amber-500/10 space-y-3.5 my-3 text-xs">
                    <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Payment Collection Status
                    </h4>
                    
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-3 gap-2">
                        {(['Full Payment Received', 'Partial Payment Received', 'Payment Pending'] as const).map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setPaymentCollectionStatus(opt);
                              if (opt === 'Full Payment Received') {
                                setAdditionalReceived(totalAmount - advanceReceived);
                              } else if (opt === 'Payment Pending') {
                                setAdditionalReceived(0);
                              }
                            }}
                            className={`px-1 py-2 text-[9px] rounded font-black uppercase transition-all border text-center cursor-pointer ${
                              paymentCollectionStatus === opt
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-extrabold'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {opt === 'Full Payment Received' ? 'Full' : opt === 'Partial Payment Received' ? 'Partial' : 'Pending'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conditional inputs and displays based on chosen Option */}
                    {paymentCollectionStatus === 'Full Payment Received' && (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-900 font-mono text-zinc-300">
                        <div className="flex justify-between">
                          <span className="text-zinc-450 text-[10px]">Total Amount:</span>
                          <span className="font-bold text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-450 text-[10px]">Amount Received:</span>
                          <span className="font-bold text-emerald-450">₹{totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-zinc-900">
                          <span className="text-zinc-450 text-[10px]">Payment Status:</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold uppercase">Paid</span>
                        </div>
                      </div>
                    )}

                    {paymentCollectionStatus === 'Partial Payment Received' && (
                      <div className="space-y-2 pt-2 border-t border-zinc-900 font-mono text-zinc-300">
                        <div className="flex justify-between">
                          <span className="text-zinc-450 text-[10px]">Total Amount:</span>
                          <span className="font-bold text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-450 text-[10px]">Advance Amount:</span>
                          <span className="font-bold text-zinc-400">₹{advanceReceived.toLocaleString('en-IN')}</span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 pt-1">
                          <label className="text-[10px] text-zinc-400 uppercase font-sans font-bold">Additional Amount Received (₹)</label>
                          <input
                            type="number"
                            min={0}
                            max={totalAmount - advanceReceived}
                            value={additionalReceived || ''}
                            onChange={(e) => {
                              const val = Math.min(Number(e.target.value), totalAmount - advanceReceived);
                              setAdditionalReceived(val);
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                            placeholder="e.g. 10000"
                          />
                        </div>

                        <div className="flex justify-between pt-1 border-t border-zinc-900">
                          <span className="text-zinc-450 text-[10px]">Remaining Amount:</span>
                          <span className="font-bold text-amber-500">₹{calculatedRemaining.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-zinc-450 text-[10px]">Status:</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-300/15 text-[9px] font-extrabold uppercase">Partial Payment</span>
                        </div>
                      </div>
                    )}

                    {paymentCollectionStatus === 'Payment Pending' && (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-900 font-mono text-zinc-300">
                        <div className="flex justify-between">
                          <span className="text-zinc-450 text-[10px]">Total Amount:</span>
                          <span className="font-bold text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-450 text-[10px]">Advance Received:</span>
                          <span className="font-bold text-zinc-400">₹{advanceReceived.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-zinc-900 text-red-450">
                          <span className="text-zinc-450 text-[10px]">Remaining Amount Pending:</span>
                          <span className="font-bold text-red-400">₹{(totalAmount - advanceReceived).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-zinc-450 text-[10px]">Status:</span>
                          <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-extrabold uppercase font-mono">Payment Pending</span>
                        </div>
                      </div>
                    )}

                    {paymentCollectionStatus !== 'Payment Pending' && (
                      <div className="space-y-1.5 pt-3 border-t border-zinc-900">
                        <label className="text-[10px] text-zinc-400 uppercase font-sans font-bold">Transaction ID (Optional)</label>
                        <input
                          type="text"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="UPI ID, Bank Ref, IMPS, RTGS, Card Txn etc."
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setReceivingFootageOrderId(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-purple-650 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : 'Save & Move to Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
