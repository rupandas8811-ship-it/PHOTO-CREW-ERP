import React, { useState, useEffect, useMemo } from 'react';
import { useRole } from '../RoleContext';
import { 
  Camera, Package, PlusCircle, Wrench, Edit3, Trash2, Calendar, 
  ClipboardList, Search, Filter, X, ChevronLeft, ChevronRight, 
  Eye, CheckCircle2, AlertTriangle, Info, User, HelpCircle, MapPin, Tag
} from 'lucide-react';
import { Equipment } from '../../types';
import { supabaseClient } from '../../supabaseClient';

import { formatTime12Hour } from "../../utils";
// Helper to parse equipment notes containing structured metadata
interface EquipmentMetadata {
  condition: string;
  assignedStaff: string;
  notes: string;
}

export interface ActiveEquipmentTask {
  id: string;
  orderId: string;
  leadId?: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  assignedStaff: string;
  taskStatus: string;
  source: string;
}

const parseEquipmentNotes = (rawNotes: string | undefined): EquipmentMetadata => {
  if (!rawNotes) {
    return { condition: 'Excellent', assignedStaff: '', notes: '' };
  }
  
  if (rawNotes.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawNotes);
      return {
        condition: parsed.condition || 'Excellent',
        assignedStaff: parsed.assignedStaff || '',
        notes: parsed.notes || ''
      };
    } catch (e) {
      // Fallback if JSON parsing fails
    }
  }

  // Fallback for simple plain text notes
  return {
    condition: 'Excellent',
    assignedStaff: '',
    notes: rawNotes
  };
};

const serializeEquipmentNotes = (metadata: EquipmentMetadata): string => {
  return JSON.stringify({
    condition: metadata.condition,
    assignedStaff: metadata.assignedStaff,
    notes: metadata.notes
  });
};

export const EquipmentManagement: React.FC = () => {
  const { 
    currentRole, 
    currentUserName, 
    equipment, 
    staff, 
    addEquipment, 
    updateEquipment, 
    deleteEquipment, 
    refreshData,
    leadEquipmentHistory,
    equipmentHandovers,
    staffAssignments,
    operations,
    orders,
    leads
  } = useRole();
  const canEdit = currentRole === 'Operations Team' || currentRole === 'Business Owner';

  // Core management states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [busyEquipment, setBusyEquipment] = useState<{ equipment: Equipment; tasks: ActiveEquipmentTask[] } | null>(null);
  
  // Search, filter, and sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: 'All',
    status: 'All',
    brand: 'All',
    condition: 'All'
  });
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Custom Toast notifications state to avoid browser alerts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Form states
  const [showGearForm, setShowGearForm] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    equipment_name: '',
    brand: '',
    equipment_type: 'Camera',
    status: 'Active' as string
  });

  // Handle selecting an item for editing
  const handleSelectEdit = (eq: Equipment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(eq.equipment_id);
    const mappedStatus = ['Active', 'Available', 'Assigned', 'In Use'].includes(eq.status) ? 'Active' : 'Inactive';
    setForm({
      equipment_name: eq.equipment_name,
      brand: eq.brand || '',
      equipment_type: eq.equipment_type || 'Camera',
      status: mappedStatus
    });
    setShowGearForm(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setShowGearForm(false);
    setForm({
      equipment_name: '',
      brand: '',
      equipment_type: 'Camera',
      status: 'Active'
    });
  };

  // Automatically scroll to the form when editing starts (no longer needed since it's a modal, but keeping structure safe)
  useEffect(() => {
    if (editingId && showGearForm) {
      const formEl = document.getElementById('equipment_registry_form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [editingId, showGearForm]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showToast('error', 'Unauthorized! Operations Team or Business Owner privileges required.');
      return;
    }

    const errors: string[] = [];
    if (!form.equipment_name) errors.push('equipment_name');
    if (!form.brand) errors.push('brand');
    if (!form.equipment_type) errors.push('equipment_type');
    if (!form.status) errors.push('status');

    setFormErrors(errors);

    if (errors.length > 0) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.border-rose-500');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    // Check for duplicate equipment
    const isDuplicate = equipment.some(eq => 
      eq.equipment_name.toLowerCase() === form.equipment_name.toLowerCase() && 
      eq.brand.toLowerCase() === form.brand.toLowerCase() &&
      eq.equipment_id !== editingId
    );

    if (isDuplicate) {
      showToast('error', 'Equipment with this name and brand already exists.');
      return;
    }

    try {
      if (editingId) {
        // Editing: Only allow updating the 4 fields!
        const payload = {
          equipment_name: form.equipment_name,
          brand: form.brand,
          equipment_type: form.equipment_type,
          status: form.status,
        };
        await updateEquipment(editingId, payload);
        showToast('success', 'Equipment details updated successfully.');
        handleCancelEdit();
      } else {
        // Registering new
        const now = new Date().toISOString();
        const { error } = await supabaseClient.from('equipment').insert([
          {
            equipment_name: form.equipment_name,
            brand: form.brand,
            Equipment_Category: form.equipment_type,
            Equipment_Status: form.status,
            equipment_type: form.equipment_type,
            status: form.status,
            model: '',
            serial_number: null,
            quantity: 1,
            available_quantity: 1,
            purchase_date: null,
            purchase_price: null,
            storage_location: null,
            notes: null,
            created_by: currentUserName || 'Operations Team',
            updated_by: currentUserName || 'Operations Team',
            created_at: now,
            updated_at: now
          }
        ]);

        if (error) {
          console.error('Failed to add equipment:', error);
          showToast('error', ' Failed to add equipment.');
          return;
        }

        showToast('success', ' Equipment added successfully.');
        refreshData();
        handleCancelEdit();
      }
    } catch (err: any) {
      showToast('error', err.message || 'An error occurred while saving equipment.');
    }
  };

  // Item deletion
  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (confirm(`Are you sure you want to securely de-register "${name}"?`)) {
      try {
        await deleteEquipment(id);
        showToast('success', 'Equipment dropped from active registry.');
        if (selectedEq?.equipment_id === id) {
          setSelectedEq(null);
        }
      } catch (err: any) {
        showToast('error', err.message || 'Failed to delete equipment.');
      }
    }
  };

  // Get active distinct lists for filters
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(equipment.map(e => e.brand).filter(Boolean)));
  }, [equipment]);

  // Helper to accurately resolve active tasks for a specific equipment record
  const getActiveTasksForEquipment = (eq: Equipment): ActiveEquipmentTask[] => {
    if (!eq) return [];
    const eqId = (eq.equipment_id || '').trim().toLowerCase();
    const eqName = (eq.equipment_name || '').trim().toLowerCase();
    const brand = (eq.brand || '').trim().toLowerCase();
    const model = (eq.model || '').trim().toLowerCase();
    const fullName = `${brand} ${model}`.trim().toLowerCase();

    // Matching helper
    const matchesEquipment = (raw: string): boolean => {
      if (!raw) return false;
      const clean = raw.trim().toLowerCase();
      if (eqId && clean === eqId) return true;
      if (eqName && (clean === eqName || clean.includes(eqName) || eqName.includes(clean))) return true;
      if (fullName && clean === fullName) return true;
      if (model && model.length > 2 && clean.includes(model)) return true;
      return false;
    };

    const completedStages = [
      'cancelled', 'canceled', 'completed', 'event completed', 'event ended',
      'project completed', 'closed', 'order closed', 'project closed', 'delivered', 'project delivered',
      'footage handover', 'equipment handover completed', 'returned', 'lost lead', 'lost', 'rejected'
    ];

    // Helper to check if equipment was returned for an order / lead
    const isReturnedForOrder = (ordId?: string, ldId?: string): boolean => {
      if (!ordId && !ldId) return false;
      
      // 1. Check in leadEquipmentHistory
      const hasHistoryReturn = (leadEquipmentHistory || []).some(h => {
        const orderMatch = (ordId && h.order_id === ordId) || (ldId && h.lead_id === ldId);
        if (!orderMatch) return false;
        const nameMatch = matchesEquipment(h.equipment_name) || 
                          h.equipment_name === 'Equipment Handover Photo Proof' ||
                          h.equipment_name === 'Asset Return Photo Proof' ||
                          h.equipment_status === 'Equipment Handover Completed';
        const isRet = h.equipment_status === 'Equipment Handover Completed' || 
                      h.equipment_status === 'Returned' || 
                      Boolean(h.returned_at && (h.equipment_status?.toLowerCase().includes('handover') || h.equipment_status?.toLowerCase().includes('return')));
        return nameMatch && isRet;
      });
      if (hasHistoryReturn) return true;

      // 2. Check in equipmentHandovers
      const hasHandoverReturn = (equipmentHandovers || []).some(eh => {
        const orderMatch = (ordId && eh.order_id === ordId) || (ldId && eh.order_id === ldId);
        return orderMatch && eh.return_status === 'Returned' && matchesEquipment(eh.equipment_name);
      });
      if (hasHandoverReturn) return true;

      // 3. Check in operations
      const matchingOp = (operations || []).find(o => (ordId && o.order_id === ordId) || (ldId && o.order_id === ldId));
      if (matchingOp && ['equipment handover completed', 'returned', 'equipment returned'].includes((matchingOp.equipment_status || '').toLowerCase())) {
        return true;
      }

      return false;
    };

    const tasks: ActiveEquipmentTask[] = [];
    const seenOrderKeys = new Set<string>();

    // 1. Check staffAssignments
    (staffAssignments || []).forEach(sa => {
      const assignStatus = (sa.assignment_status || '').toLowerCase();
      const taskStatus = ((sa as any).task_status || '').toLowerCase();
      if (completedStages.includes(assignStatus) || completedStages.includes(taskStatus)) return;

      const relatedOrder = orders?.find(o => o.order_id === sa.order_id);
      const relatedLead = leads?.find(l => l.lead_id === (relatedOrder?.lead_id || sa.order_id) || l.lead_id === (sa as any).lead_id);
      
      // If order or lead is completed / closed / cancelled / lost
      if (relatedOrder && completedStages.includes((relatedOrder.current_stage || '').toLowerCase())) return;
      if (relatedLead && completedStages.includes((relatedLead.status || relatedLead.current_status || '').toLowerCase())) return;

      const op = operations?.find(o => o.order_id === (sa.order_id || relatedOrder?.order_id));
      if (op && completedStages.includes((op.event_status || '').toLowerCase())) return;

      // Check if equipment was returned
      if (isReturnedForOrder(sa.order_id, relatedOrder?.lead_id || relatedLead?.lead_id)) return;

      // Check if equipment is in this assignment
      let saEqList: string[] = [];
      if (Array.isArray(sa.equipment)) {
        saEqList = sa.equipment;
      } else if (typeof sa.equipment === 'string') {
        try {
          const parsed = JSON.parse(sa.equipment);
          saEqList = Array.isArray(parsed) ? parsed : [sa.equipment];
        } catch {
          saEqList = (sa.equipment as string).split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const isAssigned = saEqList.some(item => matchesEquipment(item));
      if (!isAssigned) return;

      const taskKey = `${sa.order_id}_${sa.event_name || sa.event_id || 'ev'}_${sa.staff_name}`;
      if (seenOrderKeys.has(taskKey)) return;
      seenOrderKeys.add(taskKey);

      tasks.push({
        id: sa.assignment_id || taskKey,
        orderId: sa.order_id,
        leadId: relatedOrder?.lead_id || relatedLead?.lead_id,
        eventName: sa.event_name || relatedOrder?.custom_event_name || relatedOrder?.event_type || relatedLead?.custom_event_name || relatedLead?.event_type || 'Event Shoot',
        eventDate: relatedOrder?.event_date || relatedLead?.event_date || 'N/A',
        eventTime: relatedOrder?.event_time || relatedLead?.event_time || 'N/A',
        assignedStaff: sa.staff_name || 'Staff Member',
        taskStatus: (sa as any).task_status || sa.assignment_status || 'In Progress',
        source: 'Staff Assignment'
      });
    });

    // 2. Check operations equipment_kit
    (operations || []).forEach(op => {
      if (!op.equipment_kit || !op.equipment_kit.trim()) return;
      if (completedStages.includes((op.event_status || '').toLowerCase())) return;
      if (['equipment handover completed', 'returned', 'equipment returned'].includes((op.equipment_status || '').toLowerCase())) return;

      const relatedOrder = orders?.find(o => o.order_id === op.order_id);
      const relatedLead = leads?.find(l => l.lead_id === (relatedOrder?.lead_id || op.order_id));

      if (relatedOrder && completedStages.includes((relatedOrder.current_stage || '').toLowerCase())) return;
      if (relatedLead && completedStages.includes((relatedLead.status || relatedLead.current_status || '').toLowerCase())) return;

      if (isReturnedForOrder(op.order_id, relatedOrder?.lead_id || relatedLead?.lead_id)) return;

      const opKits = op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean);
      const match = opKits.some(item => matchesEquipment(item));
      if (!match) return;

      const taskKey = `${op.order_id}_op_${op.operations_id || 'op'}`;
      // If we already counted staff assignments for this order, don't duplicate
      const alreadyHasOrderTask = tasks.some(t => t.orderId === op.order_id);
      if (alreadyHasOrderTask || seenOrderKeys.has(taskKey)) return;
      seenOrderKeys.add(taskKey);

      tasks.push({
        id: op.operations_id || taskKey,
        orderId: op.order_id,
        leadId: relatedOrder?.lead_id || relatedLead?.lead_id,
        eventName: relatedOrder?.custom_event_name || relatedOrder?.event_type || relatedLead?.custom_event_name || relatedLead?.event_type || 'Production Shoot',
        eventDate: relatedOrder?.event_date || relatedLead?.event_date || 'N/A',
        eventTime: relatedOrder?.event_time || relatedLead?.event_time || 'N/A',
        assignedStaff: op.photographer_assigned || op.videographer_assigned || op.drone_operator_assigned || 'Production Crew',
        taskStatus: op.event_status || 'Operations Assigned',
        source: 'Operations Kit'
      });
    });

    // 3. Check leadEquipmentHistory (for active unreturned checkouts)
    (leadEquipmentHistory || []).forEach(h => {
      if (h.returned_at || h.equipment_status === 'Returned' || h.equipment_status === 'Equipment Handover Completed') return;
      if (!matchesEquipment(h.equipment_name)) return;

      const relatedOrder = orders?.find(o => o.order_id === h.order_id || o.lead_id === h.lead_id);
      const relatedLead = leads?.find(l => l.lead_id === (h.lead_id || relatedOrder?.lead_id || h.order_id));

      if (relatedOrder && completedStages.includes((relatedOrder.current_stage || '').toLowerCase())) return;
      if (relatedLead && completedStages.includes((relatedLead.status || relatedLead.current_status || '').toLowerCase())) return;

      const ordId = h.order_id || relatedOrder?.order_id || h.lead_id;
      if (!ordId) return;

      const alreadyHasOrderTask = tasks.some(t => t.orderId === ordId);
      if (alreadyHasOrderTask) return;

      const taskKey = `${ordId}_hist_${h.id || h.equipment_name}`;
      if (seenOrderKeys.has(taskKey)) return;
      seenOrderKeys.add(taskKey);

      tasks.push({
        id: h.id || taskKey,
        orderId: ordId,
        leadId: h.lead_id || relatedOrder?.lead_id,
        eventName: relatedOrder?.custom_event_name || relatedOrder?.event_type || relatedLead?.custom_event_name || relatedLead?.event_type || 'Event Assignment',
        eventDate: relatedOrder?.event_date || relatedLead?.event_date || 'N/A',
        eventTime: relatedOrder?.event_time || relatedLead?.event_time || 'N/A',
        assignedStaff: h.returned_by || 'Assigned Crew',
        taskStatus: h.equipment_status || 'In Use',
        source: 'Equipment History'
      });
    });

    return tasks;
  };

  // Combined search, filtering, and sorting logic with dynamic Task Count and Status
  const filteredAndSortedEquipment = useMemo(() => {
    let result = equipment.map(item => {
      const meta = parseEquipmentNotes(item.notes);
      const activeTasks = getActiveTasksForEquipment(item);
      const activeTaskCount = activeTasks.length;
      
      // Calculate dynamic status purely based on real active tasks
      let dynamicStatus = 'Available';
      if (['Under Maintenance', 'Maintenance', 'Damaged', 'Inactive'].includes(item.status)) {
        dynamicStatus = item.status;
      } else if (activeTaskCount > 0) {
        dynamicStatus = 'Busy';
      } else {
        dynamicStatus = 'Available';
      }

      return {
        ...item,
        parsedMeta: meta,
        activeTasks,
        activeTaskCount,
        dynamicStatus,
        assigned_quantity: item.quantity - (item.available_quantity ?? item.quantity)
      };
    });

    // 1. Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(eq => {
        return (
          eq.equipment_id.toLowerCase().includes(query) ||
          eq.equipment_name.toLowerCase().includes(query) ||
          eq.equipment_type.toLowerCase().includes(query) ||
          eq.brand.toLowerCase().includes(query) ||
          eq.model.toLowerCase().includes(query) ||
          (eq.serial_number && eq.serial_number.toLowerCase().includes(query)) ||
          eq.dynamicStatus.toLowerCase().includes(query) ||
          eq.status.toLowerCase().includes(query) ||
          (eq.storage_location && eq.storage_location.toLowerCase().includes(query)) ||
          eq.parsedMeta.condition.toLowerCase().includes(query) ||
          eq.parsedMeta.assignedStaff.toLowerCase().includes(query) ||
          eq.parsedMeta.notes.toLowerCase().includes(query)
        );
      });
    }

    // 2. Attribute filters
    if (filters.type !== 'All') {
      result = result.filter(eq => eq.equipment_type === filters.type || (eq as any).Equipment_Category === filters.type);
    }
    if (filters.status !== 'All') {
      result = result.filter(eq => {
        if (filters.status === 'Available') return eq.dynamicStatus === 'Available';
        if (filters.status === 'Busy' || filters.status === 'Assigned' || filters.status === 'In Use') return eq.dynamicStatus === 'Busy';
        if (filters.status === 'Under Maintenance' || filters.status === 'Maintenance') return eq.dynamicStatus === 'Under Maintenance' || eq.dynamicStatus === 'Maintenance';
        if (filters.status === 'Inactive') return eq.dynamicStatus === 'Inactive';
        return eq.dynamicStatus === filters.status || eq.status === filters.status;
      });
    }
    if (filters.brand !== 'All') {
      result = result.filter(eq => eq.brand === filters.brand);
    }
    if (filters.condition !== 'All') {
      result = result.filter(eq => eq.parsedMeta.condition === filters.condition);
    }

    // 3. Sorting logic
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.equipment_name.localeCompare(b.equipment_name);
        case 'name-desc':
          return b.equipment_name.localeCompare(a.equipment_name);
        case 'task-desc':
          return b.activeTaskCount - a.activeTaskCount;
        case 'task-asc':
          return a.activeTaskCount - b.activeTaskCount;
        case 'qty-desc':
          return b.quantity - a.quantity;
        case 'qty-asc':
          return a.quantity - b.quantity;
        case 'avail-desc':
          return (a.dynamicStatus === 'Available' ? 1 : 0) - (b.dynamicStatus === 'Available' ? 1 : 0);
        case 'condition-desc':
          return a.parsedMeta.condition.localeCompare(b.parsedMeta.condition);
        default:
          return 0;
      }
    });

    return result;
  }, [equipment, searchQuery, filters, sortBy, staffAssignments, operations, leadEquipmentHistory, equipmentHandovers, orders, leads]);

  // Overall metrics calculated from real equipment state
  const metrics = useMemo(() => {
    let totalUnits = 0;
    let availableCount = 0;
    let busyCount = 0;
    let maintenanceCount = 0;

    equipment.forEach(item => {
      totalUnits += item.quantity || 1;
      const tasks = getActiveTasksForEquipment(item);
      if (['Under Maintenance', 'Maintenance', 'Damaged'].includes(item.status)) {
        maintenanceCount += 1;
      } else if (tasks.length > 0) {
        busyCount += 1;
      } else {
        availableCount += 1;
      }
    });

    return { totalUnits, availableCount, busyCount, maintenanceCount };
  }, [equipment, staffAssignments, operations, leadEquipmentHistory, equipmentHandovers, orders, leads]);

  // Reset pagination to page 1 on search or filter updates
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortBy]);

  // Paginated chunk calculation
  const paginatedEquipment = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedEquipment.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedEquipment, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedEquipment.length / pageSize) || 1;

  return (
    <div className="space-y-6 font-sans relative">
      
      {/* Dynamic Toast Notice */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/35 text-emerald-400' 
            : 'bg-rose-950/90 border-rose-500/35 text-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />}
          <span className="text-xs font-mono font-bold tracking-wide">{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dashboard Metrics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            title: 'TOTAL UNITS', 
            val: metrics.totalUnits, 
            color: 'text-zinc-200', 
            bg: 'bg-zinc-900/40 border-zinc-850' 
          },
          { 
            title: 'AVAILABLE NOW', 
            val: metrics.availableCount, 
            color: 'text-emerald-400', 
            bg: 'bg-emerald-500/5 border-emerald-500/10' 
          },
          { 
            title: 'BUSY / IN FIELD', 
            val: metrics.busyCount, 
            color: 'text-sky-400', 
            bg: 'bg-sky-500/5 border-sky-500/10' 
          },
          { 
            title: 'IN MAINTENANCE', 
            val: metrics.maintenanceCount, 
            color: 'text-amber-400', 
            bg: 'bg-amber-500/5 border-amber-500/10' 
          }
        ].map((m, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border ${m.bg} flex flex-col justify-between`}>
            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-zinc-500">{m.title}</span>
            <span className={`text-xl font-bold mt-2 font-mono ${m.color}`}>{m.val}</span>
          </div>
        ))}
      </div>

      {/* Search & Global Filters Bar */}
      <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search equipment by name, category, brand, condition, serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-800 rounded-full text-zinc-400 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => { setEditingId(null); setShowGearForm(true); }}
              className="px-3.5 py-2.5 rounded-xl border text-[10px] sm:text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer bg-amber-500 hover:bg-amber-600 text-black shrink-0 w-full sm:w-auto"
            >
              + Register New Studio Gear
            </button>
            <button
              type="button"
              id="btn_equipment_filter_toggle"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3.5 py-2.5 rounded-xl border text-[10px] sm:text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 w-full sm:w-auto ${
                showFilters 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                  : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>FILTER</span>
              {(filters.type !== 'All' || filters.status !== 'All' || filters.condition !== 'All' || filters.brand !== 'All') && (
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="pt-3 border-t border-zinc-850/80 space-y-3 animate-fade-in">
            <div className="flex flex-wrap gap-2 w-full">
              <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 rounded-xl px-2.5 py-1.5">
                <Filter className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] text-zinc-400 font-mono">Filters:</span>
              </div>

              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-[10px] font-mono text-zinc-300 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {['Camera', 'Lens', 'Drone', 'Gimbal', 'Tripod', 'Light', 'Audio Equipment', 'Memory Cards', 'Batteries', 'Other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-[10px] font-mono text-zinc-300 focus:outline-none"
              >
                <option value="All">All Status</option>
                {['Available', 'Assigned', 'In Use', 'Under Maintenance', 'Damaged', 'Lost', 'Retired'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={filters.condition}
                onChange={(e) => setFilters({...filters, condition: e.target.value})}
                className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-[10px] font-mono text-zinc-300 focus:outline-none"
              >
                <option value="All">All Conditions</option>
                {['Excellent', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Retired'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={filters.brand}
                onChange={(e) => setFilters({...filters, brand: e.target.value})}
                className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-[10px] font-mono text-zinc-300 focus:outline-none"
              >
                <option value="All">All Brands</option>
                {uniqueBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Sorting Controller Row */}
        <div className="flex justify-between items-center border-t border-zinc-850/60 pt-3 text-[11px]">
          <span className="text-zinc-500 font-mono">Found {filteredAndSortedEquipment.length} items matching criteria</span>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-mono">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1 font-mono text-zinc-300 focus:outline-none"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="qty-desc">Quantity (High-Low)</option>
              <option value="qty-asc">Quantity (Low-High)</option>
              <option value="avail-desc">Available (High-Low)</option>
              <option value="assigned-desc">Assigned (High-Low)</option>
              <option value="condition-desc">Condition (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 items-start">
        {/* Gear Form Modal */}
        {showGearForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div id="equipment_registry_form" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl w-full max-w-lg relative my-auto max-h-full overflow-y-auto">
              <button onClick={() => { setEditingId(null); setShowGearForm(false); }} className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full bg-zinc-800/50 hover:bg-zinc-800 transition-colors z-10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-xs font-mono font-black uppercase text-zinc-300 flex items-center gap-1.5 border-b border-zinc-850 pb-2.5 pr-8">
                <PlusCircle className="w-4 h-4 text-amber-500" />
                <span>{editingId ? 'Edit Register Details' : 'Register New Studio Gear'}</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs mt-4">
            <fieldset disabled={!canEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-extrabold uppercase text-zinc-500 mb-1 font-semibold">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sony FX3 Full Cinema body"
                  value={form.equipment_name}
                  onChange={(e) => {
                    setForm({ ...form, equipment_name: e.target.value });
                    if (e.target.value) setFormErrors(prev => prev.filter(err => err !== 'equipment_name'));
                  }}
                  className={`w-full bg-zinc-955 border ${formErrors.includes('equipment_name') ? 'border-rose-500' : 'border-zinc-850'} rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50 font-mono`}
                />
                {formErrors.includes('equipment_name') && (
                  <p className="text-rose-500 text-[10px] mt-1 font-mono"> Please fill all required fields.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold uppercase text-zinc-500 mb-1 font-semibold">
                  Brand *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sony"
                  value={form.brand}
                  onChange={(e) => {
                    setForm({ ...form, brand: e.target.value });
                    if (e.target.value) setFormErrors(prev => prev.filter(err => err !== 'brand'));
                  }}
                  className={`w-full bg-zinc-955 border ${formErrors.includes('brand') ? 'border-rose-500' : 'border-zinc-850'} rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50 font-mono`}
                />
                {formErrors.includes('brand') && (
                  <p className="text-rose-500 text-[10px] mt-1 font-mono"> Please fill all required fields.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold uppercase text-zinc-500 mb-1 font-semibold">
                  Equipment Category *
                </label>
                <select
                  value={form.equipment_type}
                  onChange={(e) => {
                    setForm({ ...form, equipment_type: e.target.value });
                    if (e.target.value) setFormErrors(prev => prev.filter(err => err !== 'equipment_type'));
                  }}
                  className={`w-full bg-zinc-955 border ${formErrors.includes('equipment_type') ? 'border-rose-500' : 'border-zinc-850'} rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50 font-mono`}
                >
                  <option value="" disabled>Select Category</option>
                  {['Camera', 'Lens', 'Drone', 'Gimbal', 'Tripod', 'Light', 'Audio Equipment', 'Memory Cards', 'Batteries', 'Other'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {formErrors.includes('equipment_type') && (
                  <p className="text-rose-500 text-[10px] mt-1 font-mono"> Please fill all required fields.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold uppercase text-zinc-500 mb-1 font-semibold">
                  Equipment Status *
                </label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    setForm({ ...form, status: e.target.value });
                    if (e.target.value) setFormErrors(prev => prev.filter(err => err !== 'status'));
                  }}
                  className={`w-full bg-zinc-955 border ${formErrors.includes('status') ? 'border-rose-500' : 'border-zinc-850'} rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50 font-mono`}
                >
                  <option value="" disabled>Select Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {formErrors.includes('status') && (
                  <p className="text-rose-500 text-[10px] mt-1 font-mono"> Please fill all required fields.</p>
                )}
              </div>
            </fieldset>

            {canEdit ? (
              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-850 mt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl cursor-pointer flex items-center gap-1"
                >
                  <span>{editingId ? 'Update Gear' : 'Add to Inventory'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-lg text-[10px] text-zinc-500 font-mono mt-4">
                 Read-only mode access.
              </div>
            )}
          </form>
            </div>
          </div>
        )}

        {/* Inventory View */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-850 bg-zinc-950/70 flex items-center justify-between">
            <h3 className="text-[10px] font-mono font-black text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <span>ACTIVE CORE INVENTORY REGISTRY ({filteredAndSortedEquipment.length} items)</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="border-b border-zinc-850 text-[10px] font-mono uppercase text-zinc-400 bg-zinc-950/40">
                  <th className="p-3.5">Equipment</th>
                  <th className="p-3.5">Brand</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-center">Task</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60 text-xs text-zinc-300">
                {paginatedEquipment.length > 0 ? (
                  paginatedEquipment.map((eq) => {
                    return (
                      <tr 
                        key={eq.equipment_id} 
                        onClick={() => setSelectedEq(eq)}
                        className="hover:bg-zinc-950/30 transition-all cursor-pointer group"
                      >
                        {/* Equipment Name & Serial */}
                        <td className="p-3.5">
                          <div className="font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">{eq.equipment_name}</div>
                          {eq.model && <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Model: <span className="text-zinc-300">{eq.model}</span></div>}
                          {eq.serial_number && <div className="text-[9px] text-zinc-500 font-bold uppercase font-mono">S/N: {eq.serial_number}</div>}
                        </td>

                        {/* Brand */}
                        <td className="p-3.5 font-mono text-zinc-300 font-medium">
                          {eq.brand || '-'}
                        </td>

                        {/* Category */}
                        <td className="p-3.5 font-mono text-zinc-400 text-[11px]">
                          {eq.equipment_type || (eq as any).Equipment_Category || '-'}
                        </td>

                        {/* Status */}
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          {eq.dynamicStatus === 'Busy' ? (
                            <button
                              type="button"
                              onClick={() => setBusyEquipment({ equipment: eq, tasks: eq.activeTasks })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/25 hover:text-sky-300 transition-all cursor-pointer"
                              title="Click to view active task assignments"
                            >
                              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse" />
                              Busy
                            </button>
                          ) : eq.dynamicStatus === 'Available' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                              Available
                            </span>
                          ) : eq.dynamicStatus === 'Under Maintenance' || eq.dynamicStatus === 'Maintenance' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border bg-amber-500/10 text-amber-400 border-amber-500/20">
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                              {eq.dynamicStatus}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border bg-rose-500/10 text-rose-400 border-rose-500/20">
                              <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                              {eq.dynamicStatus}
                            </span>
                          )}
                        </td>

                        {/* Task Count Column */}
                        <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setBusyEquipment({ equipment: eq, tasks: eq.activeTasks })}
                            className={`inline-flex items-center justify-center min-w-[28px] px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                              eq.activeTaskCount > 0
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25 hover:scale-105 shadow-sm'
                                : 'bg-zinc-850/60 text-zinc-400 border-zinc-750 hover:bg-zinc-800 hover:text-zinc-300'
                            }`}
                            title={eq.activeTaskCount > 0 ? `Click to view ${eq.activeTaskCount} active task(s)` : 'No active tasks (Click to inspect)'}
                          >
                            {eq.activeTaskCount}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEq(eq);
                              }}
                              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-all border border-transparent hover:border-zinc-800 cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canEdit && (
                              <>
                                <button
                                  onClick={(e) => handleSelectEdit(eq, e)}
                                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-all border border-transparent hover:border-zinc-800 cursor-pointer"
                                  title="Edit Item Details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDelete(eq.equipment_id, eq.equipment_name, e)}
                                  className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded transition-all cursor-pointer"
                                  title="De-register Equipment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-zinc-500 italic font-mono">
                      No equipment matching your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Interactive Pagination footer */}
          <div className="p-4 border-t border-zinc-850/60 bg-zinc-950/30 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-4">
              <span className="text-zinc-500">
                Showing {filteredAndSortedEquipment.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredAndSortedEquipment.length)} of {filteredAndSortedEquipment.length} items
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-600">Per Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-zinc-950 border border-zinc-850 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 focus:outline-none"
                >
                  {[5, 10, 20, 50].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
                      currentPage === page 
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                        : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Equipment Details Slide-over Panel or Modal */}
      {selectedEq && (() => {
        const meta = parseEquipmentNotes(selectedEq.notes);
        const assigned_quantity = selectedEq.quantity - (selectedEq.available_quantity ?? selectedEq.quantity);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              
              {/* Header block */}
              <div className="p-6 border-b border-zinc-850 bg-zinc-950/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded uppercase font-extrabold tracking-widest">
                      {selectedEq.equipment_id}
                    </span>
                    <span className="text-zinc-500 font-mono text-xs">/ {selectedEq.equipment_type}</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mt-1.5">{selectedEq.equipment_name}</h4>
                </div>
                <button 
                  onClick={() => setSelectedEq(null)} 
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body content (Bento-style layout) */}
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-xs text-zinc-300">
                
                {/* Visual statistics grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-2xl">
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase font-bold tracking-wider">Total Stock</span>
                    <span className="text-lg font-bold text-white font-mono block mt-1">{selectedEq.quantity}</span>
                  </div>
                  <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-2xl">
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase font-bold tracking-wider">Available</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono block mt-1">{selectedEq.available_quantity}</span>
                  </div>
                  <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-2xl">
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase font-bold tracking-wider">Assigned Out</span>
                    <span className="text-lg font-bold text-sky-400 font-mono block mt-1">{assigned_quantity}</span>
                  </div>
                </div>

                {/* Details list inside card */}
                <div className="bg-[#09090b]/40 border border-zinc-850 rounded-2xl p-4.5 space-y-4">
                  <h5 className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-850 pb-2 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span>SYSTEM IDENTIFICATION & SPECIFICATIONS</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-zinc-500 font-mono text-[10px] block uppercase">Manufacturer Brand</span>
                      <span className="text-white font-bold">{selectedEq.brand || 'N/A'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-500 font-mono text-[10px] block uppercase">Model Name</span>
                      <span className="text-white font-bold">{selectedEq.model || 'N/A'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-500 font-mono text-[10px] block uppercase">Serial Number (S/N)</span>
                      <span className="text-zinc-200 font-mono font-semibold">{selectedEq.serial_number || 'N/A'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-500 font-mono text-[10px] block uppercase">Operational Condition</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        meta.condition === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        meta.condition === 'Good' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        meta.condition === 'Fair' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-rose-500/10 text-rose-450 border-rose-500/20'
                      }`}>
                        {meta.condition}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-500 font-mono text-[10px] block uppercase">Current Dispatch Status</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        selectedEq.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        selectedEq.status === 'Assigned' || selectedEq.status === 'In Use' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                        selectedEq.status === 'Under Maintenance' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-rose-500/10 text-rose-450 border-rose-500/20'
                      }`}>
                        {selectedEq.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-500 font-mono text-[10px] block uppercase">Storage & Placement</span>
                      <div className="flex items-center gap-1 text-zinc-200">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{selectedEq.storage_location || 'Not Specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logistics & Purchase info card */}
                <div className="bg-[#09090b]/40 border border-zinc-850 rounded-2xl p-4.5 space-y-4">
                  <h5 className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-850 pb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>FINANCIALS & DISPATCH ASSIGNMENTS</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-zinc-500 font-mono text-[10px] block uppercase">Purchase Price</span>
                      <span className="text-white font-bold font-mono">
                        {selectedEq.purchase_price ? `Rs. ${selectedEq.purchase_price.toLocaleString('en-IN')}` : 'N/A'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-500 font-mono text-[10px] block uppercase">Purchase Date</span>
                      <span className="text-zinc-200 font-mono">{selectedEq.purchase_date || 'N/A'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-500 font-mono text-[10px] block uppercase">Assigned Custodian / Operator</span>
                      {meta.assignedStaff ? (
                        <div className="flex items-center gap-1.5 text-zinc-100 font-bold">
                          <User className="w-4 h-4 text-amber-500" />
                          <span>{meta.assignedStaff}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic">Unassigned (Stored in Locker)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Field report notes */}
                {meta.notes && (
                  <div className="bg-amber-500/[0.02] border border-amber-500/10 p-4.5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block">NOTES & FIELD REPORTS</span>
                    <p className="text-zinc-350 leading-relaxed font-mono text-[11px] bg-zinc-950 p-3 rounded-xl border border-zinc-850 whitespace-pre-wrap">
                      {meta.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer controls */}
              <div className="p-4 bg-zinc-950/80 border-t border-zinc-850 flex justify-between gap-2.5">
                {canEdit ? (
                  <button
                    onClick={() => {
                      handleSelectEdit(selectedEq);
                      setSelectedEq(null);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Details</span>
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => setSelectedEq(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl cursor-pointer"
                >
                  Close Details
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Equipment Active Task Count & Assignment Popup */}
      {busyEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Header block */}
            <div className="p-6 border-b border-zinc-850 bg-zinc-950/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded uppercase font-extrabold tracking-widest">
                    {busyEquipment.equipment.equipment_id}
                  </span>
                  <span className="text-zinc-500 font-mono text-xs">/ {busyEquipment.equipment.equipment_type || 'Gear'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                    busyEquipment.tasks.length > 0
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {busyEquipment.tasks.length > 0 ? `${busyEquipment.tasks.length} ACTIVE TASK${busyEquipment.tasks.length > 1 ? 'S' : ''}` : '0 ACTIVE TASKS'}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white mt-1.5">{busyEquipment.equipment.equipment_name}</h4>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                  Brand: <span className="text-zinc-300 font-medium">{busyEquipment.equipment.brand || '-'}</span>
                  {busyEquipment.equipment.model && <span> | Model: <span className="text-zinc-300 font-medium">{busyEquipment.equipment.model}</span></span>}
                  {busyEquipment.equipment.serial_number && <span> | S/N: <span className="text-zinc-300 font-mono font-medium">{busyEquipment.equipment.serial_number}</span></span>}
                </p>
              </div>
              <button 
                onClick={() => setBusyEquipment(null)} 
                className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {busyEquipment.tasks.length > 0 ? (
                <div className="overflow-x-auto border border-zinc-850 rounded-2xl bg-zinc-950/40">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                      <tr className="border-b border-zinc-850 text-[10px] font-mono uppercase text-zinc-400 bg-zinc-950/80">
                        <th className="p-3.5">Event Name</th>
                        <th className="p-3.5">Event Date</th>
                        <th className="p-3.5">Event Time</th>
                        <th className="p-3.5">Assigned Staff</th>
                        <th className="p-3.5">Order / Lead ID</th>
                        <th className="p-3.5 text-right">Task Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850/50 text-xs text-zinc-300">
                      {busyEquipment.tasks.map((task, idx) => (
                        <tr key={task.id || idx} className="hover:bg-zinc-900/40 transition-all">
                          <td className="p-3.5 font-bold text-zinc-100 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span>{task.eventName}</span>
                          </td>
                          <td className="p-3.5 font-mono text-zinc-300 font-medium">{task.eventDate}</td>
                          <td className="p-3.5 font-mono text-zinc-400">{formatTime12Hour(task.eventTime)}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                              <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span>{task.assignedStaff}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-zinc-400">
                            {task.orderId || task.leadId || '-'}
                          </td>
                          <td className="p-3.5 text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-amber-500/10 text-amber-400 border-amber-500/20">
                              {task.taskStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center border border-zinc-850 rounded-2xl bg-zinc-950/25 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-zinc-200 font-bold text-sm">No Active Tasks Assigned</p>
                  <p className="text-zinc-500 font-mono text-xs">
                    This equipment is not currently engaged in any active event assignments or shoots. It is fully Available in inventory.
                  </p>
                </div>
              )}
            </div>

            {/* Footer block */}
            <div className="p-4 border-t border-zinc-850 bg-zinc-950/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500">
                {busyEquipment.tasks.length} active assignment{busyEquipment.tasks.length === 1 ? '' : 's'} resolved
              </span>
              <button
                onClick={() => setBusyEquipment(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
