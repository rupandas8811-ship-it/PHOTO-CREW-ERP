import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UnifiedEventDropdownCell } from '../UnifiedEventDropdownCell';
import { useRole } from '../RoleContext';
import { 
  X, Users, Briefcase, Camera, Video, Compass, Clock, Clipboard, FileCheck, CheckCircle, Eye, Search, Calendar, MapPin
} from 'lucide-react';
import { Order, CurrentStage, Staff, Equipment } from '../../types';
import { StatusText } from '../ui/StatusText';
import { SafeProofImage } from '../ui/SafeProofImage';
import { ProjectDetailModal } from '../ProjectDetailModal';
import { ViewDetailsModal } from './ViewDetailsModal';
import { CameraLensStatsCard, CameraLensTheme } from '../CameraLensStatsCard';
import { convertTimeToDbFormat, triggerAutoScrollAndFocus, convertTo12Hour, formatQtyItem, parseQtyAndText } from '../../utils';
import { supabaseClient } from '../../supabaseClient';
import { getCalculatedOrderStage, getStageRank } from '../../utils/orderStageCalculator';

const OperationsActionColumn = ({ ord, actionItems, isOpen, setActiveMenuOrderId, setMenuCoords, setActiveMenuItems }: any) => {
  return (
    <div className="flex items-center justify-end actions-menu-container">
      <div className="inline-block text-left">
        <button
          type="button"
          onClick={(e) => {
            if (isOpen) {
              setActiveMenuOrderId(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;

              const menuWidth = Math.min(220, viewportWidth - 24);
              const spaceBelow = viewportHeight - rect.bottom;
              const spaceAbove = rect.top;
              const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;

              const left = Math.min(
                Math.max(12, rect.right - menuWidth),
                viewportWidth - menuWidth - 12
              );
              const top = openUpward ? rect.top - 6 : rect.bottom + 6;
              const maxHeight = openUpward
                ? Math.min(280, rect.top - 16)
                : Math.min(280, viewportHeight - rect.bottom - 16);

              setMenuCoords({
                left,
                top,
                width: menuWidth,
                maxHeight,
                openUpward
              });
              setActiveMenuItems(actionItems);
              setActiveMenuOrderId(ord.order_id);
            }
          }}
          className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:ring-2 focus:ring-indigo-500/40 active:scale-95 text-white rounded-xl text-xs font-sans font-black border border-indigo-500/25 shadow-lg shadow-indigo-500/20 cursor-pointer transition-all inline-flex items-center gap-1.5 outline-none action-button-trigger"
        >
          🎯 Actions <span className={`text-[9px] text-indigo-200 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}>▼</span>
        </button>
      </div>
    </div>
  );
};

const extractTeamMembersConfig = (lead: any, leadPkgs: any[]): { event_id?: string; event_name?: string; team_members: any[] }[] => {
  if (!lead && (!leadPkgs || leadPkgs.length === 0)) return [];

  const parseRaw = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val.split(/,|\n/).map(s => s.trim()).filter(Boolean);
      }
    }
    return val;
  };

  const rawCandidates = [
    lead?.Team_member,
    lead?.Team_Members,
    (lead as any)?.team_members,
    lead?.Team_Members_Included,
    leadPkgs?.[0]?.Team_Members_Included,
    leadPkgs?.[0]?.editable_inclusions,
    leadPkgs?.[0]?.Team_Members
  ];

  let parsed: any = null;
  for (const candidate of rawCandidates) {
    if (candidate) {
      const p = parseRaw(candidate);
      if (p) {
        if (Array.isArray(p) && p.length > 0) {
          parsed = p;
          break;
        } else if (typeof p === 'object' && Object.keys(p).length > 0) {
          parsed = p;
          break;
        }
      }
    }
  }

  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null && ('team_members' in parsed[0] || 'deliverables' in parsed[0] || 'inclusions' in parsed[0] || 'name' in parsed[0])) {
      if ('team_members' in parsed[0] || 'inclusions' in parsed[0] || 'deliverables' in parsed[0]) {
        return parsed.map((item: any) => ({
          event_id: item.event_id || item.id || '',
          event_name: item.event_name || item.name || item.event_type || '',
          team_members: item.team_members || item.inclusions || item.deliverables || []
        }));
      }
    }
    return [{
      event_id: '',
      event_name: '',
      team_members: parsed
    }];
  }

  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed).map(([key, val]) => ({
      event_id: '',
      event_name: key,
      team_members: Array.isArray(val) ? val : [val]
    }));
  }

  if (lead?.events && Array.isArray(lead.events) && lead.events.length > 0) {
    const eventConfigs = lead.events.map((ev: any) => {
      const tm = ev.team_members || ev.inclusions || ev.Team_Members || [];
      return {
        event_id: ev.id || ev.event_id || '',
        event_name: ev.event_name || ev.event_type || '',
        team_members: Array.isArray(tm) ? tm : parseRaw(tm) || []
      };
    }).filter(c => c.team_members.length > 0);
    if (eventConfigs.length > 0) return eventConfigs;
  }

  return [];
};

const getEventRolesForEvent = (ev: any, index: number, configList: any[]): any[] => {
  if (!configList || configList.length === 0) return [];

  const evId = (ev.id || ev.event_id || '').toLowerCase().trim();
  const evName = (ev.event_name || ev.event_type || '').toLowerCase().trim();
  const evType = (ev.event_type || '').toLowerCase().trim();

  if (evId) {
    const matchById = configList.find(c => c.event_id && c.event_id.toLowerCase().trim() === evId);
    if (matchById && matchById.team_members?.length > 0) return matchById.team_members;
  }

  if (evName || evType) {
    const matchByName = configList.find(c => {
      const cName = (c.event_name || '').toLowerCase().trim();
      return cName && (cName === evName || cName === evType || evName.includes(cName) || cName.includes(evName));
    });
    if (matchByName && matchByName.team_members?.length > 0) return matchByName.team_members;
  }

  if (configList.length === 1 && configList[0].team_members?.length > 0) {
    return configList[0].team_members;
  }

  if (configList[index] && configList[index].team_members?.length > 0) {
    return configList[index].team_members;
  }

  return [];
};

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
    updateLead,
    payments,
    equipmentHandovers,
    addEquipmentHandovers,
    isDepartmentAllowedToEdit,
    leads,
    leadPackages,
    leadStaffAssignmentHistory,
    leadEquipmentHistory,
    updateEquipment,
    refreshData,
    addLeadEquipmentHistory,
    getLeadCurrentStatus,
    packages,
    quotations,
    pushUpdate
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
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showNewProjectsModal, setShowNewProjectsModal] = useState(false);

  // Track which order's action dropdown is open
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);
  const [selectedEquipmentStatus, setSelectedEquipmentStatus] = useState<{ staffName: string, eqReceived: any, eqHandover: any } | null>(null);
  const [selectedEventImages, setSelectedEventImages] = useState<{ staffName: string, assetCollection: any, evStart: any, evEnd: any } | null>(null);
  const [imagePreviewModal, setImagePreviewModal] = useState<{ url: string, date: string, time: string, staffName: string, stage: string } | null>(null);
  const [activeMenuItems, setActiveMenuItems] = useState<{ label: string; onClick: () => void }[]>([]);
  const [menuCoords, setMenuCoords] = useState<{ left: number, top: number, width: number, maxHeight: number, openUpward: boolean }>({ left: 0, top: 0, width: 220, maxHeight: 280, openUpward: false });

  useEffect(() => {
    const handleStaffUpdate = () => {
      refreshData();
    };
    window.addEventListener('staff_status_updated', handleStaffUpdate);
    return () => window.removeEventListener('staff_status_updated', handleStaffUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeMenuOrderId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.actions-menu-container') && !target.closest('.action-button-trigger')) {
        setActiveMenuOrderId(null);
      }
    };
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest('.actions-menu-container')) {
        return;
      }
      setActiveMenuOrderId(null);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('wheel', handleScroll, { passive: true, capture: true });
    window.addEventListener('touchmove', handleScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleScroll, { capture: true });
      window.removeEventListener('touchmove', handleScroll, { capture: true });
    };
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
  const [sortBy, setSortBy] = useState<'event_date' | 'customer_name' | 'status' | 'assignment_date' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
  const [collapsedAssignEvents, setCollapsedAssignEvents] = useState<Record<string, boolean>>({});
  const [collapsedCustomerDetails, setCollapsedCustomerDetails] = useState<boolean>(true);
  const [assignValidationError, setAssignValidationError] = useState<string | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [busyRosterStaff, setBusyRosterStaff] = useState<string | null>(null);

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
  const [consolidatedDriveLink, setConsolidatedDriveLink] = useState('');
  const [verifiedCrewMap, setVerifiedCrewMap] = useState<Record<string, boolean>>({});
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
    eventAllocations?: any;
    lead?: any;
    finalAssignments?: any[];
  } | null>(null);

  const [viewingStaffOrderId, setViewingStaffOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (viewingStaffOrderId) {
      refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingStaffOrderId]);

  const handleVerifyFootage = async (ord: Order, staffName: string, eventId: string | undefined, status: 'Verified' | 'Not Verified') => {
    try {
      if (!currentUserName || !ord) return;
      
      const res = await addLeadEquipmentHistory({
        lead_id: ord.lead_id || ord.order_id,
        order_id: ord.order_id,
        equipment_name: 'Raw Footage Verification',
        equipment_status: status,
        returned_by: staffName,
        returned_at: new Date().toISOString(),
        remarks: JSON.stringify({
          event_id: eventId,
          verified_by: currentUserName,
          verified_at: new Date().toISOString()
        })
      });

      refreshData();
    } catch (e) {
      console.error("Failed to update verification status:", e);
      alert("Failed to update verification status.");
    }
  };

  const getRecordMeta = (record: any) => {
    if (!record) return { url: null, date: '-', time: '-' };

    let url = record.photo_url || null;
    if (!url && record.remarks) {
      try {
        const parsed = JSON.parse(record.remarks);
        url = parsed.photo_url || parsed.url || null;
      } catch (e) {}
    }

    let date = '-';
    let time = '-';
    const timestamp = record.returned_at || record.created_at;
    if (timestamp) {
      const dt = new Date(timestamp);
      if (!isNaN(dt.getTime())) {
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const year = dt.getFullYear();
        date = `${day}-${month}-${year}`;

        time = dt.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        }).toUpperCase();
      }
    }

    return { url, date, time };
  };
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [selectedStaffForShare, setSelectedStaffForShare] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (whatsappShareModalData) {
      const initialMsgs: Record<string, string> = {};
      const initialSelected: Record<string, boolean> = {};
      whatsappShareModalData.staffNames.forEach(name => {
        initialMsgs[name] = generateWhatsAppMessageForStaff(
          whatsappShareModalData.order, 
          name,
          whatsappShareModalData.eventAllocations,
          whatsappShareModalData.lead,
          whatsappShareModalData.finalAssignments
        );
        initialSelected[name] = true;
      });
      setEditedMessages(initialMsgs);
      setSelectedStaffForShare(initialSelected);
    } else {
      setEditedMessages({});
      setSelectedStaffForShare({});
    }
  }, [whatsappShareModalData]);

  // Helper to get assigned staff names for an order
  const getAssignedStaffNamesForOrder = (ord: Order): string[] => {
    // The Assigned Team count must be generated ONLY from the actual assigned production/operations staff records.
    const orderAssigns = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id) : [];
    const fromAssigns = orderAssigns.map(sa => sa.staff_name).filter(n => n && n.toLowerCase() !== 'unassigned' && n.toLowerCase() !== 'none');
    return Array.from(new Set(fromAssigns));
  };

  interface AssignedStaffDetails {
    staff_name: string;
    staff_role: string;
    assigned_task: string;
    staff_type: 'In-House' | 'Freelancer';
    mobile: string;
    event_name: string;
    event_id?: string;
    event_date: string;
    reporting_date: string;
    reporting_time: string;
    status: 'Available' | 'Busy';
    staff_status: string;
    google_maps_link?: string;
    assigned_equipment?: string[];
    event_time?: string;
  }

  const getStaffTaskStatus = (orderId: string, eventId: string | undefined, eventIndex: number, staffName: string, ord: Order): string => {
    if (!staffName) return 'Pending';
    const nameLower = staffName.trim().toLowerCase();
    
    const sa = staffAssignments?.find(s => s.order_id === orderId && s.staff_name?.toLowerCase() === nameLower);
    if (sa && sa.task_status && sa.task_status !== 'Pending') {
      return sa.task_status;
    }
    if (sa && sa.assignment_status && !['Assigned', 'Unassigned'].includes(sa.assignment_status)) {
      return sa.assignment_status;
    }

    return 'Assigned Crew';
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

  const isStaffBusyOnDate = (staffName: string, targetDate: string, currentOrderId?: string) => {
    if (!targetDate || !staffName) return false;

    // A staff member is ONLY busy if there is a successfully saved assignment record in staffAssignments
    const activeAssignments = staffAssignments ? staffAssignments.filter(sa => {
      if (sa.staff_name.toLowerCase() !== staffName.toLowerCase()) return false;
      const assignmentStatus = (sa.assignment_status || '').toLowerCase();
      const taskStatus = ((sa as any).task_status || '').toLowerCase();
      
      const completedStatuses = [
        'cancelled', 'canceled', 'completed', 'event completed', 
        'project completed', 'closed', 'order closed', 'project closed', 'delivered'
      ];
      
      if (completedStatuses.includes(assignmentStatus) || completedStatuses.includes(taskStatus)) {
        return false;
      }
      return true;
    }) : [];

    if (activeAssignments.length === 0) return false;

    return activeAssignments.some(sa => {
      // Ignore the current order being edited so they show as available for re-assignment
      if (currentOrderId && sa.order_id === currentOrderId) return false;

      const relatedOrder = orders.find(o => o.order_id === sa.order_id);
      if (!relatedOrder) return false;

      if (isCompletedEvent(relatedOrder)) return false;

      const op = operations?.find(o => o.order_id === relatedOrder.order_id);
      const eventStatus = op?.event_status || 'Assigned';
      if (['completed', 'event completed', 'cancelled'].includes(eventStatus.toLowerCase())) return false;

      const relatedLead = leads.find(l => l.lead_id === relatedOrder.lead_id);
      if (!relatedLead || relatedLead.status === 'Lost Lead') return false;

      // Check dates in relatedLead events
      if (relatedLead.events && relatedLead.events.length > 0) {
        return relatedLead.events.some((ev: any) => {
          if (ev.event_date !== targetDate) return false;
          const assignedNames = ev.assigned_staff_names
            ? ev.assigned_staff_names.split(',').map((s: string) => s.trim().toLowerCase())
            : [];
          return assignedNames.includes(staffName.toLowerCase());
        });
      } else {
        // Check default event date
        return relatedLead.event_date === targetDate || relatedOrder.event_date === targetDate;
      }
    });
  };

  const getAssignedStaffDetailsForOrder = (ord: Order): AssignedStaffDetails[] => {
    const lead = leads.find(l => l.lead_id === ord.lead_id);
    const hasExistingAssignments = staffAssignments?.some(sa => sa.order_id === ord.order_id);
    const hasEventsAssignments = lead?.events?.some((ev: any) => ev.assigned_staff_names && ev.assigned_staff_names.trim());

    if (!hasExistingAssignments && !hasEventsAssignments) {
      return [];
    }

    const staffDetailsList: AssignedStaffDetails[] = [];
    const op = getOpDetails(ord.order_id);

    if (lead?.events && lead.events.length > 0) {
      lead.events.forEach((ev: any, evIdx: number) => {
        if (ev.assigned_staff_names && ev.assigned_staff_names.trim()) {
          const names = ev.assigned_staff_names.split(',').map((n: string) => n.trim()).filter(Boolean);
          
          let assignedEquipment: string[] = [];
          let staffEquipments: string[][] = [];
          let mobilesRaw = ev.assigned_staff_mobiles || '';
          if (mobilesRaw.includes(' || EQUIPMENT: JSON:')) {
            const parts = mobilesRaw.split(' || EQUIPMENT: JSON:');
            try {
              staffEquipments = JSON.parse(parts[1]);
            } catch(e) {}
            assignedEquipment = Array.from(new Set(staffEquipments.flat()));
          } else if (mobilesRaw.includes(' || EQUIPMENT: ')) {
            const parts = mobilesRaw.split(' || EQUIPMENT: ');
            assignedEquipment = parts[1] ? parts[1].split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          }

          const cleanMobilesRaw = mobilesRaw.split(' || EQUIPMENT:')[0] || '';
          const mobilesList = cleanMobilesRaw.split(',').map((m: string) => m.trim()).filter(Boolean);

          names.forEach((name, nameIdx) => {
            const st = staff?.find(s => s.name?.toLowerCase() === name.toLowerCase());
            const saMatch = staffAssignments?.find(sa => sa.order_id === ord.order_id && sa.staff_name?.toLowerCase() === name.toLowerCase());
            const historyMatch = leadStaffAssignmentHistory?.find(h => (h.order_id === ord.order_id || h.lead_id === ord.lead_id) && h.assigned_staff?.toLowerCase().includes(name.toLowerCase()));

            const assignedTask = saMatch?.staff_role || historyMatch?.assigned_role || st?.role || 'Staff';
            const mobileNum = mobilesList[nameIdx] || st?.mobile || '';
            const staffTaskStatus = getStaffTaskStatus(ord.order_id, ev.id, evIdx, name, ord);

            const memberEquipment = (staffEquipments[nameIdx] && Array.isArray(staffEquipments[nameIdx]))
              ? staffEquipments[nameIdx]
              : (mobilesRaw.includes(' || EQUIPMENT: ') && nameIdx === 0 ? assignedEquipment : []);

            staffDetailsList.push({
              staff_name: name,
              staff_role: assignedTask,
              assigned_task: assignedTask,
              staff_type: st?.staff_type || 'In-House',
              mobile: mobileNum,
              event_name: ev.event_name || ord.event_type || 'Event',
              event_id: ev.id,
              event_date: ev.event_date || ord.event_date || '',
              reporting_date: ev.reporting_date || lead.Reporting_date || ev.event_date || '',
              reporting_time: ev.reporting_time || ord.reporting_time || op?.reporting_time || '',
              status: isStaffBusyOnDate(name, ev.event_date || ord.event_date || '', ord.order_id) ? 'Busy' : 'Available',
              staff_status: staffTaskStatus,
              google_maps_link: ev.google_maps_link || lead.google_maps_link || '',
              assigned_equipment: memberEquipment,
              event_time: ev.event_start_time || ord.event_time || ''
            });
          });
        }
      });
    } else {
      const orderAssignments = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id) : [];
      if (orderAssignments.length > 0) {
        orderAssignments.forEach((sa, saIdx) => {
          const name = sa.staff_name;
          const st = staff?.find(s => s.name?.toLowerCase() === name.toLowerCase());
          const assignedEquipment = op?.equipment_kit ? op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          const assignedTask = sa.staff_role || st?.role || 'Staff';
          const staffTaskStatus = getStaffTaskStatus(ord.order_id, undefined, saIdx, name, ord);

          staffDetailsList.push({
            staff_name: name,
            staff_role: assignedTask,
            assigned_task: assignedTask,
            staff_type: st?.staff_type || 'In-House',
            mobile: st?.mobile || '',
            event_name: ord.event_type || 'Main Event',
            event_date: ord.event_date || '',
            reporting_date: ord.Reporting_date || lead?.Reporting_date || ord.event_date || '',
            reporting_time: ord.reporting_time || op?.reporting_time || '',
            status: isStaffBusyOnDate(name, ord.event_date || '', ord.order_id) ? 'Busy' : 'Available',
            staff_status: staffTaskStatus,
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
  const generateWhatsAppMessageForStaff = (ord: Order, staffName: string, modalEventAllocations?: any, modalLead?: any, finalAssignments?: any[]) => {
    const lead = modalLead || leads.find(l => l.lead_id === ord.lead_id);
    
    const clientName = ord.customer_name;
    const clientContact = ord.mobile || (lead ? lead.mobile : 'N/A');
    const customerAddress = lead?.client_residence_address || lead?.address || 'N/A';
    
    let text = `Customer Name: ${clientName}\n`;
    text += `Phone Number: ${clientContact}\n\n`;

    let assignedEvents: any[] = [];
    if (modalEventAllocations && lead?.events && lead.events.length > 0) {
       Object.keys(modalEventAllocations).forEach(evId => {
         const alloc = modalEventAllocations[evId];
         if (alloc.staff && alloc.staff.some((s: any) => s.staff_name === staffName)) {
            const matchedEv = lead.events.find((e: any) => e.id === evId);
            if (matchedEv) {
               const roles = alloc.staff.filter((s: any) => s.staff_name === staffName).map((s: any) => s.staff_role);
               assignedEvents.push({ ...matchedEv, alloc, roles });
            }
         }
       });
    } else if (lead?.events && lead.events.length > 0) {
       assignedEvents = lead.events.filter((ev: any) => {
         const names = ev.assigned_staff_names ? ev.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase()) : [];
         return names.includes(staffName.toLowerCase());
       }).map((ev: any) => {
         let fallbackRoles = ['Crew'];
         const myAssignments = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id && sa.staff_name === staffName) : [];
         if (myAssignments.length > 0) {
            fallbackRoles = Array.from(new Set(myAssignments.map(sa => sa.staff_role)));
         } else {
             const history = leadStaffAssignmentHistory?.filter((h: any) => h.order_id === ord.order_id && h.assigned_staff === staffName);
             if (history && history.length > 0) {
                 fallbackRoles = Array.from(new Set(history.map((h: any) => h.assigned_role || h.assigned_roles)));
             }
         }
         return { ...ev, roles: fallbackRoles };
        });
    }

    if (assignedEvents.length === 0) {
       const eventName = ord.custom_event_name || lead?.custom_event_name || ord.event_type || 'N/A';
       const eventType = ord.event_type || 'N/A';
       const reportingDate = ord.Reporting_date || lead?.Reporting_date || ord.event_date || 'N/A';
       const reportingTime = ord.reporting_time || lead?.reporting_time || '8:00 AM';
       
       const evLoc = lead?.google_maps_link || ord.event_location || 'N/A';

       let assignedRoles = ['Crew'];
       if (finalAssignments) {
          assignedRoles = Array.from(new Set(finalAssignments.filter(a => a.staff_name === staffName).map(a => a.staff_role)));
       } else {
          const myAssignments = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id && sa.staff_name === staffName) : [];
          if (myAssignments.length > 0) {
             assignedRoles = Array.from(new Set(myAssignments.map(sa => sa.staff_role)));
          } else {
             const history = leadStaffAssignmentHistory?.filter((h: any) => h.order_id === ord.order_id && h.assigned_staff === staffName);
             if (history && history.length > 0) {
                 assignedRoles = Array.from(new Set(history.map((h: any) => h.assigned_role || h.assigned_roles)));
             }
          }
       }

       text += `Event Name: ${eventName}\n`;
       text += `Event Type: ${eventType}\n`;
       text += `Location: ${evLoc}\n\n`;
       text += `Reporting Date: ${reportingDate}\n`;
       text += `Reporting Time: ${reportingTime}\n`;
       text += `Task: ${assignedRoles.join(', ')}\n`;
       
       // When no assignedEvents but finalAssignments exist
       if (finalAssignments) {
          const myAssignments = finalAssignments.filter(a => a.staff_name === staffName);
          const myEq = myAssignments.flatMap(a => a.equipment || []);
          const uniqueEq = Array.from(new Set(myEq));
          if (uniqueEq.length > 0) {
              text += `\nAssigned Equipment:\n`;
              uniqueEq.forEach(eq => {
                  text += `- ${eq}\n`;
              });
          }
       }
    } else {
       assignedEvents.forEach((ev, index) => {
          const eventName = ev.event_name || (ev.event_type === 'Other' ? (ev.event_name || 'Other') : (ev.event_type || 'N/A'));
          const eventType = ev.event_type || 'N/A';
          const reportingDate = ev.reporting_date || ev.alloc?.reporting_date || ord.Reporting_date || lead?.Reporting_date || ev.event_date || 'N/A';
          const reportingTime = ev.reporting_time || ev.alloc?.reporting_time || ord.reporting_time || lead?.reporting_time || '8:00 AM';
          
          const evLoc = ev.google_maps_link || ev.event_location || 'N/A';

          let assignedRoles = ev.roles || ['Crew'];
          assignedRoles = Array.from(new Set(assignedRoles));

          if (index > 0) text += `\n---\n\n`;
          
          text += `Event Name: ${eventName}\n`;
          text += `Event Type: ${eventType}\n`;
          text += `Location: ${evLoc}\n\n`;
          text += `Reporting Date: ${reportingDate}\n`;
          text += `Reporting Time: ${reportingTime}\n`;
          text += `Task: ${assignedRoles.join(', ')}\n`;

          // Handle equipment for multi-events if present in modalEventAllocations or finalAssignments
          // We will fetch it from finalAssignments if available for this specific event
          if (finalAssignments) {
              const myAssignments = finalAssignments.filter(a => a.staff_name === staffName && a.event_id === ev.id);
              const myEq = myAssignments.flatMap(a => a.equipment || []);
              const uniqueEq = Array.from(new Set(myEq));
              if (uniqueEq.length > 0) {
                  text += `\nAssigned Equipment:\n`;
                  uniqueEq.forEach(eq => {
                      text += `- ${eq}\n`;
                  });
              }
          } else if (ev.alloc && ev.alloc.staff) {
              const myAllocStaff = ev.alloc.staff.filter((s: any) => s.staff_name === staffName);
              const myEq = myAllocStaff.flatMap((s: any) => s.equipment || []);
              const uniqueEq = Array.from(new Set(myEq));
              if (uniqueEq.length > 0) {
                  text += `\nAssigned Equipment:\n`;
                  uniqueEq.forEach(eq => {
                      text += `- ${eq}\n`;
                  });
              }
          }
       });
    }

    return text.trim();
  };

  // Filter orders to show confirmed ones for Operations
  const allowedStages = [
    'Confirm Order', 'Order Confirmed', 'New Order Received', 'Operations Assigned',
    'Assigned Crew', 'Staff Assigned', 'Event Scheduled',
    'Event Started', 'Event Start',
    'Event Ended', 'Event End', 'Event Completed', 'Event Complete',
    'Footage Handover', 'Equipment Handover',
    'Verified Footage', 'Footage Handover Verified',
    'Event Cancelled'
  ];
  const operationsOrders = orders.filter(o => {
    if (!allowedStages.includes(o.current_stage)) return false;
    if (currentRole === 'Operation Staff') {
      const staffName = currentUserName || '';
      const orderAssigns = staffAssignments ? staffAssignments.filter(sa => sa.order_id === o.order_id && sa.assignment_status !== 'Cancelled') : [];
      const isAssigned = orderAssigns.some(sa => sa.staff_name?.toLowerCase() === staffName.toLowerCase());
      if (!isAssigned) return false;
    }
    return true;
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
        const assignedStaffDetails = getAssignedStaffDetailsForOrder(o);
        const staffStatuses = assignedStaffDetails.map(s => s.staff_status);
        const calculatedStage = getCalculatedOrderStage(o.current_stage, staffStatuses);
        const stageNorm = (calculatedStage || o.current_stage || '').trim();
        
        if (statusFilter === 'Order Confirmed' && !['Order Confirmed', 'Confirm Order', 'New Order Received'].includes(stageNorm)) return false;
        if (statusFilter === 'Operations Assigned' && stageNorm !== 'Operations Assigned') return false;
        if (statusFilter === 'Assigned Crew' && !['Assigned Crew', 'Staff Assigned', 'Event Scheduled', 'Operations Assigned'].includes(stageNorm) && !isStaffAssigned) return false;
        if (statusFilter === 'Staff Assigned' && !isStaffAssigned) return false;
        if (statusFilter === 'Event Scheduled' && stageNorm !== 'Event Scheduled') return false;
        if (statusFilter === 'Event Cancelled' && stageNorm !== 'Event Cancelled') return false;
        if (statusFilter === 'Event Started' && !['Event Started', 'Event Start'].includes(stageNorm)) return false;
        if (statusFilter === 'Event Ended' && !['Event Ended', 'Event End', 'Event Completed', 'Event Complete'].includes(stageNorm)) return false;
        if (statusFilter === 'Footage Handover' && !['Footage Handover', 'Equipment Handover'].includes(stageNorm)) return false;
        if (statusFilter === 'Verified Footage' && !['Verified Footage', 'Footage Handover Verified', 'Raw Footage Received'].includes(stageNorm)) return false;
        if (statusFilter === 'Event Completed' && !['Event Completed', 'Event Complete', 'Event Ended', 'Event End'].includes(stageNorm)) return false;
        if (statusFilter === 'Raw Footage Received' && !['Raw Footage Received', 'Verified Footage', 'Footage Handover Verified'].includes(stageNorm)) return false;

        // Custom stats click metrics
        if (statusFilter === 'New Orders') {
          if (o.current_stage !== 'Order Confirmed' && o.current_stage !== 'New Order Received') return false;
        }
        if (statusFilter === "Today's Events") {
          const todayStr = new Date().toISOString().split('T')[0];
          const lead = leads.find(l => l.lead_id === o.lead_id);
          const hasTodayEvent = (lead && lead.events && lead.events.length > 0) 
            ? lead.events.some((e: any) => e.event_date === todayStr)
            : o.event_date === todayStr;
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
      } else if (sortBy === 'created_at') {
        const leadA = leads ? leads.find(l => l.lead_id === a.lead_id) : null;
        const leadB = leads ? leads.find(l => l.lead_id === b.lead_id) : null;
        valA = leadA ? (leadA.created_at ? new Date(leadA.created_at).getTime() : new Date(leadA.created_date).getTime()) : (a.created_at ? new Date(a.created_at).getTime() : 0);
        valB = leadB ? (leadB.created_at ? new Date(leadB.created_at).getTime() : new Date(leadB.created_date).getTime()) : (b.created_at ? new Date(b.created_at).getTime() : 0);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredOrders, sortBy, sortOrder, staffAssignments, leads]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail.role === 'operations') {
        const order = orders.find(o => o.order_id === e.detail.orderId);
        if (order) {
          // Switch to list view if needed (assuming OperationsLeads is already the active subtab when this is called)
          startAssigning(order);
        }
      }
    };
    window.addEventListener('calendar-action-click-deferred', handler);
    return () => window.removeEventListener('calendar-action-click-deferred', handler);
  }, [orders]);
  
  const startAssigning = (order: Order) => {
    setAssignValidationError(null);
    const op = getOpDetails(order.order_id);
    const rf = rawFootage ? rawFootage.find(f => f.order_id === order.order_id) : null;
    
    // Check if this is a brand new assignment (Order Confirmed stage means it has not been assigned yet)
    const isNewAssignment = order.current_stage === 'Order Confirmed';

    // REQUIRED FIX: Do NOT pre-select any staff. Staff selection must always be blank.
    setActiveAssignments([]);

    const targetLead = leads?.find(l => l.lead_id === order.lead_id);
    const targetLeadPkgs = leadPackages?.filter(lp => lp.lead_id === order.lead_id) || [];
    
    // Calculate expected roles for loading
    const teamMembersConfig = extractTeamMembersConfig(targetLead, targetLeadPkgs);

    const initialAllocations: Record<string, any> = {};
    if (targetLead?.events && targetLead.events.length > 0) {
      targetLead.events.forEach((ev, index) => {
        const evId = ev.id || `EV-N/A-${index}`;
        const staffList: any[] = [];
        
        const includedRoles = getEventRolesForEvent(ev, index, teamMembersConfig);

        // Group roles into tasks
        const tasksMap = new Map<string, { roleName: string; targetQty: number }>();
        includedRoles.forEach((roleItem: any) => {
          const { qty, text } = parseQtyAndText(roleItem);
          const roleName = (text || (typeof roleItem === 'string' ? roleItem : '')).trim();
          if (!roleName) return;
          if (tasksMap.has(roleName)) {
            tasksMap.get(roleName)!.targetQty += (qty || 1);
          } else {
            tasksMap.set(roleName, { roleName, targetQty: qty || 1 });
          }
        });
        const taskGroups = Array.from(tasksMap.values());

        const orderStaffAssignments = staffAssignments?.filter(sa => 
          sa.order_id === order.order_id && 
          sa.assignment_status !== 'Cancelled' &&
          (!sa.event_id || sa.event_id === evId)
        ) || [];
        const existingNames = ev.assigned_staff_names ? ev.assigned_staff_names.split(',').map((n: string) => n.trim()).filter(Boolean) : [];

        let assignedEquipment: string[] = [];
        let mobilesRaw = ev.assigned_staff_mobiles || '';
        let staffEquipments: string[][] = [];
        if (mobilesRaw.includes(' || EQUIPMENT: JSON:')) {
           const parts = mobilesRaw.split(' || EQUIPMENT: JSON:');
           mobilesRaw = parts[0];
           try {
              staffEquipments = JSON.parse(parts[1]);
           } catch(e) {}
           assignedEquipment = Array.from(new Set(staffEquipments.flat()));
        } else if (mobilesRaw.includes(' || EQUIPMENT: ')) {
          const parts = mobilesRaw.split(' || EQUIPMENT: ');
          mobilesRaw = parts[0];
          assignedEquipment = parts[1] ? parts[1].split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        }
        
        const cleanMobilesRaw = mobilesRaw.split(' || EQUIPMENT:')[0] || '';
        const mobilesList = cleanMobilesRaw.split(',').map((m: string) => m.trim());

        if (orderStaffAssignments.length > 0) {
          orderStaffAssignments.forEach((sa, saIdx) => {
            const st = staff?.find(s => s.name?.toLowerCase() === sa.staff_name?.toLowerCase());
            const stType = sa.staff_type || st?.staff_type || (st as any)?.Staff_Type || 'In-House';
            const cleanType = (stType === 'Freelancer' || stType === 'freelancer') ? 'Freelancer' : 'In-House';

            staffList.push({
              id: sa.assignment_id || ('slot_' + Math.random().toString(36).substr(2, 6)),
              staff_role: sa.staff_role || taskGroups[0]?.roleName || 'General Staff',
              staff_id: sa.staff_id || st?.staff_id || ('MOCK-' + Math.random().toString(36).substr(2, 4)),
              staff_name: sa.staff_name,
              mobile: sa.mobile || st?.mobile || '',
              staff_type: cleanType,
              equipment: sa.equipment || staffEquipments[saIdx] || []
            });
          });
        } else if (existingNames.length > 0) {
          let namePointer = 0;
          if (taskGroups.length > 0) {
            taskGroups.forEach(task => {
              for (let i = 0; i < task.targetQty; i++) {
                const assignedName = existingNames[namePointer] || '';
                namePointer++;
                const st = staff?.find(s => s.name?.toLowerCase() === assignedName.toLowerCase());
                const stType = st?.staff_type || (st as any)?.Staff_Type || 'In-House';
                const cleanType = (stType === 'Freelancer' || stType === 'freelancer') ? 'Freelancer' : 'In-House';

                staffList.push({
                  id: 'slot_' + Math.random().toString(36).substr(2, 6),
                  staff_role: task.roleName,
                  staff_id: st?.staff_id || (assignedName ? 'MOCK-' + Math.random().toString(36).substr(2, 4) : ''),
                  staff_name: assignedName,
                  mobile: st?.mobile || mobilesList[namePointer - 1] || '',
                  staff_type: cleanType,
                  equipment: staffEquipments[namePointer - 1] || []
                });
              }
            });
          } else {
            existingNames.forEach((assignedName, idx) => {
              const st = staff?.find(s => s.name?.toLowerCase() === assignedName.toLowerCase());
              staffList.push({
                id: 'slot_' + Math.random().toString(36).substr(2, 6),
                staff_role: 'General Staff',
                staff_id: st?.staff_id || 'MOCK-' + Math.random().toString(36).substr(2, 4),
                staff_name: assignedName,
                mobile: st?.mobile || mobilesList[idx] || '',
                staff_type: 'In-House',
                equipment: staffEquipments[idx] || []
              });
            });
          }
        } else {
          if (taskGroups.length > 0) {
            taskGroups.forEach(task => {
              for (let i = 0; i < task.targetQty; i++) {
                staffList.push({
                  id: 'slot_' + Math.random().toString(36).substr(2, 6),
                  staff_role: task.roleName,
                  staff_id: '',
                  staff_name: '',
                  mobile: '',
                  staff_type: 'In-House',
                  equipment: []
                });
              }
            });
          } else {
            staffList.push({
              id: 'slot_' + Math.random().toString(36).substr(2, 6),
              staff_role: 'General Staff',
              staff_id: '',
              staff_name: '',
              mobile: '',
              staff_type: 'In-House',
              equipment: []
            });
          }
        }

        // Ensure every task group has at least targetQty slots in staffList
        taskGroups.forEach(task => {
          const currentSlots = staffList.filter(s => s.staff_role === task.roleName);
          const missingCount = task.targetQty - currentSlots.length;
          for (let m = 0; m < missingCount; m++) {
            staffList.push({
              id: 'slot_' + Math.random().toString(36).substr(2, 6),
              staff_role: task.roleName,
              staff_id: '',
              staff_name: '',
              mobile: '',
              staff_type: 'In-House',
              equipment: []
            });
          }
        });

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

    setAssignValidationError(null);
    setValidationAttempted(false);
    let overallMissingStaff = false;
    if (parentLeadInstance?.events) {
       const targetLeadPkgs = leadPackages?.filter(lp => lp.lead_id === parentLeadInstance?.lead_id) || [];
       const teamMembersConfig = extractTeamMembersConfig(parentLeadInstance, targetLeadPkgs);

       for (let index = 0; index < parentLeadInstance.events.length; index++) {
          const ev = parentLeadInstance.events[index];
          const evId = ev.id || '';
          if (!evId) continue;
          
          const includedRoles = getEventRolesForEvent(ev, index, teamMembersConfig);
          
          if (includedRoles.length > 0) {
            const allocStaff = eventAllocations[evId]?.staff || [];
            const validAllocStaff = allocStaff.filter((s: any) => s.staff_name && s.staff_name.trim() !== '');
            
            const tasksMap = new Map<string, { roleName: string; targetQty: number }>();
            includedRoles.forEach((roleStr: string) => {
              const { qty, text } = parseQtyAndText(roleStr);
              const roleName = (text || roleStr).trim();
              if (!roleName) return;
              if (tasksMap.has(roleName)) {
                tasksMap.get(roleName)!.targetQty += (qty || 1);
              } else {
                tasksMap.set(roleName, { roleName, targetQty: qty || 1 });
              }
            });

            let isMissingStaff = false;
            for (const task of Array.from(tasksMap.values())) {
              if (!validAllocStaff.some((s: any) => s.staff_role === task.roleName)) {
                isMissingStaff = true;
                break;
              }
            }

            if (isMissingStaff) {
                setValidationAttempted(true);
                setAssignValidationError(`Please complete all Staff Assignments before saving.\nAt least one Staff is required for every Team Member Included task.`);
                
                // Open the collapsed event and focus
                setCollapsedAssignEvents(prev => ({ ...prev, [evId]: false }));
                
                // Scroll to error
                setTimeout(() => {
                  const el = document.getElementById(`assign-event-${evId}`);
                  if (el) {
                     el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                     el.classList.add('ring-2', 'ring-red-500', 'ring-offset-2', 'ring-offset-zinc-950');
                     setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2', 'ring-offset-zinc-950'), 3000);
                  }
                }, 100);
                
                return; // Stop saving
            }
          }

          // NEW: Validate duplicate equipment per event
          const allocStaffForEq = eventAllocations[evId]?.staff || [];
          const equipmentCounts: Record<string, number> = {};
          allocStaffForEq.forEach((s: any) => {
             (s.equipment || []).forEach((eq: string) => {
                equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
             });
          });
          const duplicates = Object.keys(equipmentCounts).filter(eq => equipmentCounts[eq] > 1);
          if (duplicates.length > 0) {
              setValidationAttempted(true);
              setAssignValidationError(`This equipment is already assigned to another staff member for this event: ${duplicates.join(', ')}`);
              
              setCollapsedAssignEvents(prev => ({ ...prev, [evId]: false }));
              
              setTimeout(() => {
                const el = document.getElementById(`assign-event-${evId}`);
                if (el) {
                   el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                   el.classList.add('ring-2', 'ring-red-500', 'ring-offset-2', 'ring-offset-zinc-950');
                   setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2', 'ring-offset-zinc-950'), 3000);
                }
              }, 100);
              return;
          }
       }
    }

    try {

      // Collect ALL assigned staff across all events into activeAssignments so they are recorded correctly per event
      const allAssignedStaff: { staff_role: string; staff_id: string; staff_name: string; equipment?: string[]; event_id?: string; event_name?: string }[] = [];
      Object.entries(eventAllocations).forEach(([evId, alloc]: [string, any]) => {
        if (alloc.staff && alloc.staff.length > 0) {
          alloc.staff.forEach((st: any) => {
            if (st.staff_name && st.staff_name.trim() !== '') {
               allAssignedStaff.push({
                 staff_role: st.staff_role,
                 staff_id: st.staff_id,
                 staff_name: st.staff_name,
                 equipment: st.equipment || [],
                 event_id: evId,
                 event_name: st.event_name || ''
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
      
      // Update lead_events table with assigned staff AND event-specific equipment via updateLead API proxy
      const baseMatchedOrder = orders.find(o => o.order_id === assigningOrderId);
      if (baseMatchedOrder?.lead_id && parentLeadInstance) {
          const updatedEvents = (parentLeadInstance.events || []).map((ev: any) => {
             const evId = ev.id || '';
             const alloc = eventAllocations[evId];
             if (alloc && alloc.staff) {
                const validStaff = alloc.staff.filter((s: any) => s.staff_name && s.staff_name.trim() !== '');
                const staffNames = validStaff.map((s: any) => s.staff_name).join(', ');
                const staffMobiles = validStaff.map((s: any) => s.mobile || '').join(', ');

                const staffEquipments = validStaff.map((s: any) => s.equipment || []);
                const finalStaffMobiles = staffMobiles + ' || EQUIPMENT: JSON:' + JSON.stringify(staffEquipments);

                return {
                   ...ev,
                   assigned_staff_names: staffNames,
                   assigned_staff_mobiles: finalStaffMobiles
                };
             }
             return ev;
          });

         await updateLead(baseMatchedOrder.lead_id, { events: updatedEvents });
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
      
      // Set status to Assigned Crew as requested for Status 1 workflow
      const currentOrderStage = matchedOrder?.current_stage || 'Operations Assigned';
      const isStaffAssigned = finalAssignments.length > 0;
      const targetStage: CurrentStage = (isStaffAssigned && !overallMissingStaff) ? 'Assigned Crew' : (currentOrderStage as CurrentStage);

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

      refreshData();

      if (matchedOrder) {
        setWhatsappShareModalData({
          orderId: assigningOrderId,
          order: { ...matchedOrder, current_stage: targetStage },
          staffNames: Array.from(new Set(finalAssignments.map(a => a.staff_name))),
          eventAllocations: eventAllocations,
          lead: parentLeadInstance,
          finalAssignments: finalAssignments
        });
      }

      setAssigningOrderId(null);
      
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

  const newProjects = useMemo(() => {
    return operationsOrders.filter(o => {
      const assignedStaffDetails = getAssignedStaffDetailsForOrder(o);
      const staffStatuses = assignedStaffDetails.map(s => s.staff_status);
      const calculatedStage = getCalculatedOrderStage(o.current_stage, staffStatuses);
      return ['Order Confirmed', 'Confirm Order', 'New Order Received'].includes(calculatedStage);
    });
  }, [operationsOrders, staffAssignments, leads]);

  const stats = useMemo(() => {
    let newProjectArrived = 0;
    let assignedCrew = 0;
    let eventStarted = 0;
    let eventEnded = 0;
    let footageHandover = 0;
    let verifiedFootage = 0;

    operationsOrders.forEach(o => {
      const assignedStaffDetails = getAssignedStaffDetailsForOrder(o);
      const staffStatuses = assignedStaffDetails.map(s => s.staff_status);
      const calculatedStage = getCalculatedOrderStage(o.current_stage, staffStatuses);

      if (['Order Confirmed', 'Confirm Order', 'New Order Received'].includes(calculatedStage)) {
        newProjectArrived++;
      } else if (['Assigned Crew', 'Staff Assigned', 'Event Scheduled', 'Operations Assigned'].includes(calculatedStage)) {
        assignedCrew++;
      } else if (['Event Started', 'Event Start'].includes(calculatedStage)) {
        eventStarted++;
      } else if (['Event Ended', 'Event End', 'Event Completed', 'Event Complete'].includes(calculatedStage)) {
        eventEnded++;
      } else if (['Footage Handover', 'Equipment Handover'].includes(calculatedStage)) {
        footageHandover++;
      } else if (['Verified Footage', 'Footage Handover Verified', 'Raw Footage Received'].includes(calculatedStage)) {
        verifiedFootage++;
      }
    });

    return {
      newProjectArrived,
      assignedCrew,
      eventStarted,
      eventEnded,
      footageHandover,
      verifiedFootage
    };
  }, [operationsOrders, staffAssignments, leads]);

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
      {/* 1. Results Summary Row - 6 Operations Statuses */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "New Project Arrived", val: stats.newProjectArrived, theme: 'cyan' as CameraLensTheme, filterValue: 'Order Confirmed', trendText: 'New', chartPoints: [5, 12, 8, 15, 10, 20, 25] },
          { label: "Assigned Crew", val: stats.assignedCrew, theme: 'purple' as CameraLensTheme, filterValue: 'Assigned Crew', trendText: 'Rostered', chartPoints: [10, 18, 14, 25, 20, 31, 35] },
          { label: "Event Started", val: stats.eventStarted, theme: 'cyan' as CameraLensTheme, filterValue: "Event Started", trendText: 'Live On-Site', chartPoints: [5, 9, 7, 14, 11, 16, 15] },
          { label: "Event Ended", val: stats.eventEnded, theme: 'purple' as CameraLensTheme, filterValue: 'Event Ended', trendText: 'Wrapped', chartPoints: [8, 15, 12, 20, 16, 25, 24] },
          { label: "Footage Handover", val: stats.footageHandover, theme: 'red' as CameraLensTheme, filterValue: 'Footage Handover', trendText: 'Drive Upload', chartPoints: [2, 4, 1, 5, 3, 6, 2] },
          { label: "Verified Footage", val: stats.verifiedFootage, theme: 'green' as CameraLensTheme, filterValue: 'Verified Footage', trendText: 'Verified', chartPoints: [12, 19, 22, 28, 30, 35, 40] },
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
            onClick={() => {
              if (card.label === 'New Project Arrived') {
                setShowNewProjectsModal(true);
              } else {
                setStatusFilter(statusFilter === card.filterValue ? 'All' : card.filterValue);
              }
            }}
            lensLabel={card.label.slice(0, 10).toUpperCase()}
          />
        ))}
      </div>

      {/* Search & Simplified Filters Bar */}
      <div className="bg-zinc-950/40 rounded-2xl border border-zinc-850">
        {/* Mobile Toggle Button */}
        <div 
          className="md:hidden p-4 flex justify-between items-center cursor-pointer border-b border-zinc-800/50"
          onClick={() => setIsMobileFiltersExpanded(!isMobileFiltersExpanded)}
        >
          <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">📁 LEADS DIRECTORY</span>
          <button className="text-[10px] uppercase font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-colors">
            {isMobileFiltersExpanded ? '▲ Hide Filters' : '▼ Show Filters'}
          </button>
        </div>

        <div 
          className={`grid transition-all duration-300 ease-in-out ${
            isMobileFiltersExpanded 
              ? 'grid-rows-[1fr] opacity-100' 
              : 'grid-rows-[0fr] opacity-0 md:grid-rows-[1fr] md:opacity-100'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 pt-0 md:pt-4 space-y-3">
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
              <option value="Assigned Crew">Assigned Crew</option>
              <option value="Event Started">Event Started</option>
              <option value="Event Ended">Event Ended</option>
              <option value="Footage Handover">Footage Handover</option>
              <option value="Verified Footage">Verified Footage</option>
              <option value="Event Cancelled">Event Cancelled</option>
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
            </div>
          </div>
        </div>
            {/* Main Board Table */}
      <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse min-w-max">
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
              <th className="p-4 font-bold">Event Name</th>
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
                    <td colSpan={7} className="p-8 text-center text-zinc-500 italic">
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
                const assignedStaffDetails = getAssignedStaffDetailsForOrder(ord);
                const staffStatuses = assignedStaffDetails.map(s => s.staff_status);
                const baseStage = ord.current_stage || (lead ? getLeadCurrentStatus(lead) : 'Order Confirmed');
                const currentStage = getCalculatedOrderStage(baseStage, staffStatuses);
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
                    <td className="p-4 text-zinc-300 font-sans">
                      <UnifiedEventDropdownCell lead={lead || ord} />
                      {isCompletedEvent(ord) && (
                        <div className="text-[10px] text-emerald-400 mt-1 font-sans font-medium">
                          Done: {getCompletionDate(ord)}
                        </div>
                      )}
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
                            👥 {assignedStaffNames.length}
                          </button>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[10.5px]">✅ Unassigned</span>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      <StatusText status={currentStage} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {false && canEdit && !isLocked && (currentStage !== 'Order Confirmed' && currentStage !== 'New Order Received') && (
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
                              } else if (newStatus === 'Footage Handover Verified' || newStatus === 'Raw Footage Received') {
                                const staffAssignmentsForOrder = staffAssignments?.filter(sa => sa.order_id === ord.order_id && sa.assignment_status !== 'Cancelled') || [];
                                const allCompleted = staffAssignmentsForOrder.length > 0 && staffAssignmentsForOrder.every(sa => sa.assignment_status === 'Event Completed' || (sa as any).task_status === 'Event Completed');
                                if (!allCompleted) {
                                  alert('Operation staff have not completed the event yet.');
                                  e.target.value = '';
                                  return;
                                }
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
                            {/* Staff updates status automatically, but if admin needs override */}
                            <option value="Event Cancelled">Event Cancelled</option>
                            
                            {/* Footage Handover requires Event Completed stage first */}
                            {currentStage === 'Event Completed' && (
                              <option value="Footage Handover Verified">Verify Footage Handover</option>
                            )}
                          </select>
                        )}
                        {(() => {
                          const actionItems: { label: string; onClick: () => void }[] = [];
                          const assignedStaffNames = getAssignedStaffNamesForOrder(ord);

                          const hasWorkStarted = staffAssignments?.some(sa => sa.order_id === ord.order_id && sa.task_status && !['Assigned', 'Assigned Crew', 'Pending'].includes(sa.task_status)) || leadEquipmentHistory?.some(leh => leh.order_id === ord.order_id);

                          const stageNorm = (currentStage || '').toLowerCase().trim();

                          const isConfirmOrder = ['confirm order', 'order confirmed', 'new order received'].includes(stageNorm);
                          const isAssignedCrew = ['assigned crew', 'staff assigned', 'operations assigned', 'event scheduled'].includes(stageNorm);
                          const isEventStarted = ['event started', 'event start'].includes(stageNorm);
                          const isEventEnded = ['event ended', 'event end', 'event completed', 'event complete'].includes(stageNorm);
                          const isFootageHandover = ['footage handover', 'equipment handover'].includes(stageNorm);
                          const isVerifiedFootage = ['verified footage', 'footage handover verified', 'raw footage received', 'production handover', 'delivered', 'completed'].includes(stageNorm);

                          // Check if all assigned staff have uploaded raw footage links
                          const orderStaffAssignments = (staffAssignments || []).filter(sa => sa.order_id === ord.order_id && sa.assignment_status !== 'Cancelled');
                          let allStaffHaveFootage = false;
                          if (orderStaffAssignments.length > 0) {
                            allStaffHaveFootage = orderStaffAssignments.every(sa => {
                              let link = sa.raw_footage_link || '';
                              if (!link) {
                                const hist = (leadEquipmentHistory || []).find(h => 
                                  ((h.order_id && h.order_id === ord.order_id) || (ord.lead_id && h.lead_id === ord.lead_id)) &&
                                  h.returned_by?.toLowerCase() === sa.staff_name.toLowerCase() &&
                                  h.remarks
                                );
                                if (hist?.remarks) {
                                  try {
                                    const parsed = typeof hist.remarks === 'string' ? JSON.parse(hist.remarks) : hist.remarks;
                                    link = parsed.raw_footage_link || link;
                                  } catch (e) {}
                                }
                              }
                              return !!(link && link.trim());
                            });
                          }

                          // Common Handlers
                          const handleAssignCrew = () => {
                            startAssigning(ord);
                            setActiveMenuOrderId(null);
                          };

                          const handleViewDetails = () => {
                            setProjectDossierId(ord.order_id);
                            setActiveMenuOrderId(null);
                          };

                          const handleFootageModal = () => {
                            setReceivingFootageOrderId(ord.order_id);
                            const op = getOpDetails(ord.order_id);
                            const existingRf = rawFootage?.find(f => f.order_id === ord.order_id);
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
                          };

                          // 1. When Current Status = Confirm Order
                          if (isConfirmOrder || (assignedStaffNames.length === 0 && !isEventStarted && !isEventEnded && !isFootageHandover && !isVerifiedFootage)) {
                            actionItems.push({
                              label: 'Assign Crew',
                              onClick: handleAssignCrew
                            });
                          }
                          // 2. When Current Status = Assigned Crew
                          else if (isAssignedCrew) {
                            if (assignedStaffNames.length > 0 && !hasWorkStarted) {
                              actionItems.push({
                                label: 'Reassign Crew',
                                onClick: handleAssignCrew
                              });
                            }
                          }
                          // 3. When Current Status = Event Started
                          else if (isEventStarted) {
                            // View Details hidden from Operations action dropdown
                          }
                          // 4. When Current Status = Event Ended or Footage Handover
                          else if (isEventEnded || isFootageHandover) {
                            if (isFootageHandover) {
                              actionItems.push({
                                label: 'Upload Final Footage',
                                onClick: handleFootageModal
                              });
                            }
                          }
                          // 6. When Current Status = Verified Footage
                          else if (isVerifiedFootage) {
                            // View Details hidden from Operations action dropdown
                          }
                          // Fallback for any other status
                          else {
                            // View Details hidden from Operations action dropdown
                          }

                          // Extra utilities if applicable
                          if (assignedStaffNames.length > 0 && !actionItems.some(i => i.label === 'Share via WhatsApp')) {
                            actionItems.push({
                              label: 'Share via WhatsApp',
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

                          if (canEdit && !isLocked && currentStage !== 'Event Cancelled' && !actionItems.some(i => i.label === 'Cancel Event')) {
                            actionItems.push({
                              label: 'Cancel Event',
                              onClick: async () => {
                                if (confirm("Are you sure you want to cancel this event?")) {
                                  try {
                                    setIsSaving(true);
                                    await updateOrderStage(ord.order_id, 'Event Cancelled');
                                    alert("Event Cancelled successfully");
                                  } catch (error: any) {
                                    alert(`Failed to cancel event: ${error.message}`);
                                  } finally {
                                    setIsSaving(false);
                                    refreshData();
                                  }
                                }
                                setActiveMenuOrderId(null);
                              }
                            });
                          }

                          const isOpen = activeMenuOrderId === ord.order_id;
                          return (
                            <OperationsActionColumn
                              ord={ord}
                              actionItems={actionItems}
                              isOpen={isOpen}
                              setActiveMenuOrderId={setActiveMenuOrderId}
                              setMenuCoords={setMenuCoords}
                              setActiveMenuItems={setActiveMenuItems}
                            />
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
          <div id="assign_staff_modal" className="bg-zinc-900 border border-zinc-800 rounded-3xl w-[96vw] sm:w-full sm:max-w-4xl h-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl relative animate-in zoom-in duration-200 overflow-hidden">
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
            <form onSubmit={handleAssignSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-6">
                
                {/* 1. Customer Information */}
                <div className="bg-zinc-950/45 border border-zinc-850 rounded-2xl overflow-hidden transition-all duration-300">
                  <button
                    type="button"
                    onClick={() => setCollapsedCustomerDetails(!collapsedCustomerDetails)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-900/20 transition-colors focus:outline-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs">👤</span>
                      <h4 className="text-[11px] sm:text-xs font-mono font-bold uppercase text-amber-500 tracking-wider">
                        Customer Details
                      </h4>
                    </div>
                    <span className={`text-zinc-500 text-xs transition-transform duration-300 ${collapsedCustomerDetails ? '' : 'rotate-180'}`}>
                      ▼
                    </span>
                  </button>

                  {!collapsedCustomerDetails && (
                    <div className="p-4 pt-1 border-t border-zinc-900/50 space-y-3 relative overflow-hidden">
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
                            {parentLeadInstance?.whatsapp_number || 'N/A'}
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
                  )}
                </div>

                {/* Multiple Events Iteration */}
                {(() => {
                  const targetLeadPkgs = leadPackages?.filter(lp => lp.lead_id === parentLeadInstance?.lead_id) || [];
                  const teamMembersConfig = extractTeamMembersConfig(parentLeadInstance, targetLeadPkgs);

                  return parentLeadInstance?.events && parentLeadInstance.events.map((ev, index) => {
                    const evId = ev.id || `EV-N/A-${index}`;
                    const allocation = eventAllocations[evId] || { staff: [] };
                    const allocStaff = allocation.staff || [];
                    
                    const evName = ev.event_name || ev.event_type || 'Unnamed Event';
                    const includedRoles = getEventRolesForEvent(ev, index, teamMembersConfig);
                    
                    let loadError = null;
                    if (includedRoles.length === 0) {
                      loadError = `No Team Members specified for event "${evName}". You can manually add staff roles below.`;
                    }

                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                    const isCollapsed = collapsedAssignEvents[evId] === undefined ? (isMobile ? true : index !== 0) : collapsedAssignEvents[evId];
                    const eventNameDisplay = ev.event_type === 'Other' ? (ev.event_name || 'Other') : (ev.event_type || 'N/A');

                    return (
                      <div key={evId} id={`assign-event-${evId}`} className="bg-zinc-950/60 border border-zinc-850 rounded-2xl relative overflow-hidden transition-all duration-300">
                        {/* Collapsible Header */}
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 transition-colors"
                          onClick={() => setCollapsedAssignEvents(prev => ({ ...prev, [evId]: !isCollapsed }))}
                        >
                           <div className="flex items-center gap-3">
                              <span className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500 select-none uppercase font-bold font-mono">
                                🎥 EVENT {index + 1}
                              </span>
                              <h4 className="text-sm font-sans font-bold text-white uppercase tracking-wide">
                                {eventNameDisplay}
                              </h4>
                           </div>
                           <div className="flex items-center gap-4">
                              {allocStaff.length > 0 && (
                                <span className="text-[10px] font-mono px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                                  {allocStaff.length} Staff Assigned
                                </span>
                              )}
                              <span className={`text-zinc-500 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}>▼</span>
                           </div>
                        </div>

                        {/* Collapsible Content */}
                        {!isCollapsed && (
                           <div className="p-5 pt-4 border-t border-zinc-800/50 space-y-6">
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
                          {/* Shoot Type Hidden as requested */}
                          {false && (
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Shoot Type</span>
                            <span className="text-zinc-350 font-medium uppercase text-[11px] block">
                              {ev.event_shoot_type || 'N/A'}
                            </span>
                          </div>
                          )}
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Reporting Date</span>
                            <span className="text-zinc-200 text-[11px] font-mono block">{allocation.reporting_date || ev.reporting_date || ev.event_date || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Reporting Time</span>
                            <span className="text-zinc-200 text-[11px] font-mono block">{allocation.reporting_time || ev.reporting_time || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Guest Pax</span>
                            <span className="text-zinc-200 text-[11px] font-mono block">{ev.guest_pax || 'N/A'}</span>
                          </div>
                          {/* Staff Pax Hidden as requested */}
                          {false && (
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Staff Pax</span>
                            <span className="text-zinc-200 text-[11px] font-mono block">{ev.staff_pax || 'N/A'}</span>
                          </div>
                          )}
                          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono mb-1">Venue / Location</span>
                            <span className="text-zinc-200 text-[11px] font-sans block leading-tight">
                              {ev.event_location || parentLeadInstance?.event_location || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* 3. Team Members Included & Staff Assignment */}
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
                          <h4 className="text-[11px] font-mono font-bold uppercase text-sky-400 tracking-wider">
                            Team Members Included & Staff Allocation
                          </h4>
                          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800 shadow-inner">
                            {allocStaff.filter((s: any) => s.staff_name && s.staff_name.trim()).length} Staff Assigned
                          </span>
                        </div>

                        <div className="space-y-4">
                          {(() => {
                            // Group roles into tasks
                            const tasksMap = new Map<string, { roleName: string; targetQty: number }>();
                            includedRoles.forEach((roleStr: string) => {
                              const { qty, text } = parseQtyAndText(roleStr);
                              const roleName = (text || roleStr).trim();
                              if (!roleName) return;
                              if (tasksMap.has(roleName)) {
                                tasksMap.get(roleName)!.targetQty += (qty || 1);
                              } else {
                                tasksMap.set(roleName, { roleName, targetQty: qty || 1 });
                              }
                            });

                            // Ensure any staff_role existing in allocStaff is also in tasksMap
                            allocStaff.forEach((s: any) => {
                              if (s.staff_role && !tasksMap.has(s.staff_role)) {
                                tasksMap.set(s.staff_role, { roleName: s.staff_role, targetQty: 1 });
                              }
                            });

                            const taskGroups = Array.from(tasksMap.values());

                            if (taskGroups.length === 0 && includedRoles.length === 0) {
                              return (
                                <div className="text-center py-6 text-zinc-500 text-xs italic font-mono bg-zinc-900/10 border border-zinc-900 rounded-xl">
                                  {loadError ? (
                                    <div className="text-red-400 space-y-1 p-4">
                                      <div>❌ Failed to load Team Members Included.</div>
                                      <div className="text-[10px]">Reason: {loadError}</div>
                                    </div>
                                  ) : (
                                    "No Team Members Included found for this event."
                                  )}
                                </div>
                              );
                            }

                            return taskGroups.map((task, groupIdx) => {
                              const taskSlots = allocStaff.filter((s: any) => s.staff_role === task.roleName);
                              const slotsToRender = taskSlots.length > 0 ? taskSlots : [{
                                id: 'slot_' + Math.random().toString(36).substr(2, 6),
                                staff_role: task.roleName,
                                staff_id: '',
                                staff_name: '',
                                mobile: '',
                                staff_type: 'In-House',
                                equipment: []
                              }];

                              const assignedCount = taskSlots.filter((s: any) => s.staff_name && s.staff_name.trim() !== '').length;

                              return (
                                <div key={`task_${groupIdx}_${task.roleName}`} className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/80 shadow-md">
                                  {/* Task Header */}
                                  <div className="bg-zinc-900/80 px-3.5 py-2.5 border-b border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sky-400 text-xs">✔</span>
                                      <span className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wide">
                                        {task.roleName}
                                      </span>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                        Required: {task.targetQty}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                        assignedCount >= task.targetQty 
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      }`}>
                                        {assignedCount} / {task.targetQty} Assigned
                                      </span>
                                    </div>
                                  </div>

                                  {/* Staff Rows under Task */}
                                  <div className="p-3 space-y-3 divide-y divide-zinc-900/60">
                                    {slotsToRender.map((slot: any, slotIdx: number) => {
                                      const isEmpty = !slot.staff_name || slot.staff_name.trim() === '';
                                      const currentStaffType = slot.staff_type || 'In-House';
                                      const slotKey = slot.id || `slot_${groupIdx}_${slotIdx}`;

                                      return (
                                        <div key={slotKey} className={`pt-2.5 first:pt-0 space-y-2.5 ${validationAttempted && isEmpty ? 'bg-rose-950/10 p-2 rounded-lg' : ''}`}>
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            {/* Staff Type Select */}
                                            <div className="w-full sm:w-32 shrink-0">
                                              <select
                                                value={currentStaffType}
                                                onChange={(e) => {
                                                  const newType = e.target.value as 'In-House' | 'Freelancer';
                                                  setEventAllocations((prev: any) => {
                                                    const existingAlloc = prev[evId] || { staff: [] };
                                                    const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                      if (s.id === slot.id || s === slot) {
                                                        return { ...s, staff_type: newType, staff_name: '', staff_id: '', mobile: '' };
                                                      }
                                                      return s;
                                                    });
                                                    return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                  });
                                                }}
                                                className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:border-amber-500 cursor-pointer h-8"
                                              >
                                                <option value="In-House">In-House</option>
                                                <option value="Freelancer">Freelancer</option>
                                              </select>
                                            </div>

                                            {/* Staff Name Select */}
                                            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                                              <select
                                                value={slot.staff_name || ''}
                                                onChange={(e) => {
                                                  const selectedName = e.target.value;
                                                  const memberInfo = staff?.find(st => st.name === selectedName);
                                                  const staffId = memberInfo?.staff_id || '';

                                                  setEventAllocations((prev: any) => {
                                                    const existingAlloc = prev[evId] || { staff: [] };
                                                    const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                      if (s.id === slot.id || s === slot) {
                                                        return {
                                                          ...s,
                                                          staff_name: selectedName,
                                                          staff_id: staffId,
                                                          mobile: memberInfo?.mobile || ''
                                                        };
                                                      }
                                                      return s;
                                                    });
                                                    return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                  });
                                                }}
                                                className={`w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:border-amber-500 cursor-pointer h-8 ${
                                                  slot.staff_name ? 'text-emerald-400 font-bold' : 'text-zinc-400 font-normal'
                                                }`}
                                              >
                                                {(() => {
                                                  const normType = (type: string | undefined): string => {
                                                    const clean = (type || 'In-House').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                                                    return (clean === 'inhouse' || clean === 'in-house' || clean === 'in house') ? 'in-house' : 'freelancer';
                                                  };

                                                  const filteredStaff = (staff || []).filter(s => {
                                                    if (s.status !== 'Active') return false;
                                                    if (s.department !== 'Operations') return false;
                                                    const sType = s.staff_type || s.Staff_Type;
                                                    return normType(sType) === normType(currentStaffType);
                                                  });

                                                  const assignedInOtherSlots = (eventAllocations[evId]?.staff || []).filter((s: any) => {
                                                    return (s.id !== slot.id) && s.staff_name && s.staff_name.trim() !== '';
                                                  }).map((s: any) => s.staff_name.trim().toLowerCase());

                                                  const currentAssignedNameLower = (slot.staff_name || '').trim().toLowerCase();

                                                  const availableStaff = filteredStaff.filter(s => {
                                                    const nameLower = (s.name || '').trim().toLowerCase();
                                                    if (nameLower === currentAssignedNameLower) return true;
                                                    return !assignedInOtherSlots.includes(nameLower);
                                                  });

                                                  if (availableStaff.length === 0) {
                                                    return <option value="" disabled>No staff available.</option>;
                                                  }

                                                  return (
                                                    <>
                                                      <option value="">▼ Select Staff</option>
                                                      {availableStaff.map(st => {
                                                        const isBusy = isStaffBusyOnDate(st.name, ev.event_date || '', activeOrderInstance?.order_id || '');
                                                        return (
                                                          <option key={st.staff_id} value={st.name}>
                                                            {st.name} {isBusy ? '🔴 Busy' : '🟢 Available'} - {st.role}
                                                          </option>
                                                        );
                                                      })}
                                                    </>
                                                  );
                                                })()}
                                              </select>

                                              {/* Availability badge & Remove Row Button */}
                                              <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                                                {slot.staff_name && (
                                                  isStaffBusyOnDate(slot.staff_name, ev.event_date || '', activeOrderInstance?.order_id || '') ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => setBusyRosterStaff(slot.staff_name)}
                                                      className="text-[9px] px-2 py-1 rounded bg-red-500/10 text-red-400 font-mono uppercase border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors shrink-0"
                                                    >
                                                      🔴 Busy
                                                    </button>
                                                  ) : (
                                                    <span className="text-[9px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono uppercase border border-emerald-500/20 shrink-0">
                                                      🟢 Available
                                                    </span>
                                                  )
                                                )}

                                                {/* Remove Staff Slot Button */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEventAllocations((prev: any) => {
                                                      const existingAlloc = prev[evId] || { staff: [] };
                                                      const updatedStaff = existingAlloc.staff.filter((s: any) => s.id !== slot.id && s !== slot);
                                                      return {
                                                        ...prev,
                                                        [evId]: {
                                                          ...existingAlloc,
                                                          staff: updatedStaff
                                                        }
                                                      };
                                                    });
                                                  }}
                                                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded border border-rose-500/20 transition-colors cursor-pointer font-medium ml-auto sm:ml-0"
                                                  title="Remove this staff assignment slot"
                                                >
                                                  ✕ <span className="hidden sm:inline">Remove</span>
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Equipment Section per Staff */}
                                          {(() => {
                                            const eqKey = `${evId}-${slot.id}`;
                                            const searchQuery = equipmentSearchQueryByEvent[eqKey] || '';
                                            const isDropdownOpen = !!isEquipmentDropdownOpenByEvent[eqKey];
                                            const selectedEquipmentNames = slot.equipment || [];

                                            const allOtherSelectedEquipments = allocStaff
                                              .filter((s: any) => s.id !== slot.id && s !== slot)
                                              .flatMap((s: any) => s.equipment || []);

                                            const filteredEquipment = (equipment || []).filter(eq => {
                                              if (allOtherSelectedEquipments.includes(eq.equipment_name)) {
                                                return false;
                                              }
                                              const q = searchQuery.toLowerCase();
                                              return eq.equipment_name.toLowerCase().includes(q) ||
                                                     (eq.category || '').toLowerCase().includes(q) ||
                                                     (eq.serial_number || '').toLowerCase().includes(q);
                                            });

                                            return (
                                              <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-1.5 border-t border-zinc-900/50">
                                                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider pt-1 shrink-0 sm:w-32 hidden sm:block">
                                                  Equipment
                                                </div>

                                                <div className="flex flex-col flex-1 gap-2 min-w-0 w-full">
                                                  {selectedEquipmentNames.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                      {selectedEquipmentNames.map((eqName: string, eqIdx: number) => (
                                                        <span key={eqIdx} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-mono font-medium rounded border border-amber-500/20 transition-all">
                                                          <span className="truncate max-w-[150px] sm:max-w-[220px]">⚙️ {eqName}</span>
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              setEventAllocations((prev: any) => {
                                                                const existingAlloc = prev[evId] || { staff: [] };
                                                                const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                                  if (s.id === slot.id || s === slot) {
                                                                    return {
                                                                      ...s,
                                                                      equipment: (s.equipment || []).filter((name: string) => name !== eqName)
                                                                    };
                                                                  }
                                                                  return s;
                                                                });
                                                                return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                              });
                                                            }}
                                                            className="text-amber-500 hover:text-amber-300 font-bold ml-1 text-xs cursor-pointer focus:outline-none"
                                                          >
                                                            ✕
                                                          </button>
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}

                                                  <div className="relative">
                                                    <div className="flex gap-1.5">
                                                      <input
                                                        type="text"
                                                        placeholder={selectedEquipmentNames.length === 0 ? "Search to assign equipment..." : "Search equipment..."}
                                                        value={searchQuery}
                                                        onFocus={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [eqKey]: true }))}
                                                        onChange={(e) => setEquipmentSearchQueryByEvent(prev => ({ ...prev, [eqKey]: e.target.value }))}
                                                        className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:outline-none rounded-lg py-1 px-2.5 text-xs text-zinc-100 placeholder-zinc-500 h-8"
                                                      />
                                                      {isDropdownOpen ? (
                                                        <button
                                                          type="button"
                                                          onClick={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [eqKey]: false }))}
                                                          className="px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono rounded-lg border border-zinc-700 transition-colors cursor-pointer shrink-0 h-8"
                                                        >
                                                          Close
                                                        </button>
                                                      ) : (
                                                        <button
                                                          type="button"
                                                          onClick={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [eqKey]: true }))}
                                                          className="px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-mono rounded-lg border border-zinc-800 transition-colors cursor-pointer shrink-0 h-8"
                                                        >
                                                          Browse
                                                        </button>
                                                      )}
                                                    </div>
                                                    {isDropdownOpen && (
                                                      <div className="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto z-40 scrollbar-thin divide-y divide-zinc-800/60">
                                                        {filteredEquipment.length > 0 ? (
                                                          filteredEquipment.map((eq) => {
                                                            const isAlreadySelected = selectedEquipmentNames.includes(eq.equipment_name);
                                                            return (
                                                              <div
                                                                key={eq.equipment_id}
                                                                onClick={() => {
                                                                  setEventAllocations((prev: any) => {
                                                                    const existingAlloc = prev[evId] || { staff: [] };
                                                                    const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                                      if (s.id === slot.id || s === slot) {
                                                                        const currentEq = s.equipment || [];
                                                                        return {
                                                                          ...s,
                                                                          equipment: isAlreadySelected
                                                                            ? currentEq.filter((name: string) => name !== eq.equipment_name)
                                                                            : [...currentEq, eq.equipment_name]
                                                                        };
                                                                      }
                                                                      return s;
                                                                    });
                                                                    return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                                  });
                                                                }}
                                                                className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors text-xs text-left ${
                                                                  isAlreadySelected ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-zinc-800/80'
                                                                }`}
                                                              >
                                                                <div className="space-y-0.5">
                                                                  <div className="font-bold text-white flex items-center gap-1.5">
                                                                    <span>⚙️ {eq.equipment_name}</span>
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase font-mono">
                                                                      {eq.category}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
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
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      );
                                    })}

                                    {/* Add Staff Button under Task */}
                                    <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEventAllocations((prev: any) => {
                                            const existingAlloc = prev[evId] || { staff: [] };
                                            const newSlot = {
                                              id: 'slot_' + Math.random().toString(36).substr(2, 6),
                                              staff_role: task.roleName,
                                              staff_id: '',
                                              staff_name: '',
                                              mobile: '',
                                              staff_type: 'In-House',
                                              equipment: []
                                            };
                                            return {
                                              ...prev,
                                              [evId]: {
                                                ...existingAlloc,
                                                staff: [...existingAlloc.staff, newSlot]
                                              }
                                            };
                                          });
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg border border-sky-500/20 transition-all cursor-pointer"
                                      >
                                        + Add Staff
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                      {false && (
                        
                        <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950">
                          <div className="w-full text-left">
                            {/* Header row - only visible on desktop */}
                            <div className="hidden sm:grid grid-cols-12 bg-zinc-900/50 border-b border-zinc-900 font-mono text-[9px] text-zinc-500 uppercase tracking-wider py-2 px-3.5">
                              <div className="col-span-4 font-bold">Team Member</div>
                              <div className="col-span-8 font-bold">Assignments (Staff Type & Assigned Staff)</div>
                            </div>
                            <div className="divide-y divide-zinc-900">
                                 {includedRoles.length === 0 && (
                                   <div className="text-center py-6 text-zinc-500 text-xs italic font-mono bg-zinc-900/10">
                                     {loadError ? (
                                       <div className="text-red-400 space-y-1 p-4">
                                         <div>❌ Failed to load Team Members Included.</div>
                                         <div className="text-[10px]">Reason: {loadError}</div>
                                       </div>
                                     ) : (
                                       "No Team Members Included found for this event."
                                     )}
                                   </div>
                                 )}
                                 {includedRoles.map((roleStr, roleIdx) => {
                                   const assignedStaff = allocStaff.find((s: any) => s.role_index === roleIdx) || allocStaff[roleIdx] || { role_index: roleIdx, staff_role: roleStr, staff_name: '', staff_id: '', mobile: '', staff_type: 'In-House', equipment: [] };
                                   const isEmpty = !assignedStaff.staff_name || assignedStaff.staff_name.trim() === '';
                                   const currentStaffType = assignedStaff.staff_type || 'In-House';

                                   return (
                                     <div 
                                       key={`${evId}_${roleIdx}`}
                                       id={`role-row-${evId}-${roleIdx}`}
                                       className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-0 transition-colors p-3.5 sm:py-2.5 sm:px-3.5 items-start ${
                                         validationAttempted && isEmpty
                                           ? 'bg-rose-950/5 hover:bg-rose-950/10'
                                           : 'hover:bg-zinc-900/10'
                                       }`}
                                     >
                                       {/* Left Column: Team Member Name */}
                                       <div className="col-span-1 sm:col-span-4 font-sans sm:border-r sm:border-zinc-900/50 sm:pr-4 flex items-center h-full min-h-[1.5rem]">
                                         <div className="flex items-center justify-between gap-2 w-full">
                                           <div 
                                             className="text-xs font-bold text-zinc-200 truncate pr-2 select-none"
                                             title={roleStr as string}
                                           >
                                             ✔ {formatQtyItem(roleStr as string)}
                                           </div>
                                         </div>
                                       </div>

                                       {/* Right Column: Multi-staff assignments */}
                                       <div className="col-span-1 sm:col-span-8 sm:pl-4">
                                        <div className="space-y-2">
                                          <div className="flex flex-col gap-1.5 bg-zinc-950/40 p-2 rounded-lg border border-zinc-900">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                {/* Staff Type Select */}
                                                <div className="w-full sm:w-28 shrink-0">
                                                  <select
                                                    value={currentStaffType}
                                                    onChange={(e) => {
                                                      const newType = e.target.value as 'In-House' | 'Freelancer';
                                                      
                                                      setEventAllocations((prev: any) => {
                                                        const existingAlloc = prev[evId] || { staff: [] };
                                                        
                                                        const updatedStaff = existingAlloc.staff.map((s: any, idx: number) => {
                                                          const isTarget = s.role_index !== undefined ? s.role_index === roleIdx : idx === roleIdx;
                                                          if (isTarget) {
                                                            return {
                                                              ...s,
                                                              role_index: roleIdx,
                                                              staff_type: newType,
                                                              staff_name: '',
                                                              staff_id: '',
                                                              mobile: ''
                                                            };
                                                          }
                                                          return s;
                                                        });
                                                        
                                                        return {
                                                          ...prev,
                                                          [evId]: {
                                                            ...existingAlloc,
                                                            staff: updatedStaff
                                                          }
                                                        };
                                                      });
                                                    }}
                                                    className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-300 rounded-lg px-2 py-1 font-sans focus:outline-none focus:border-amber-500 cursor-pointer h-7"
                                                  >
                                                    <option value="In-House">In-House</option>
                                                    <option value="Freelancer">Freelancer</option>
                                                  </select>
                                                </div>

                                                {/* Staff Name Select */}
                                                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                                                  <select
                                                    value={assignedStaff.staff_name || ''}
                                                    onChange={(e) => {
                                                      const selectedName = e.target.value;
                                                      const memberInfo = staff?.find(st => st.name === selectedName);
                                                      const staffId = memberInfo?.staff_id || '';
                                                      
                                                      setEventAllocations((prev: any) => {
                                                        const existingAlloc = prev[evId] || { staff: [] };
                                                        
                                                        const updatedStaff = existingAlloc.staff.map((s: any, idx: number) => {
                                                          const isTarget = s.role_index !== undefined ? s.role_index === roleIdx : idx === roleIdx;
                                                          if (isTarget) {
                                                            return {
                                                              ...s,
                                                              role_index: roleIdx,
                                                              staff_name: selectedName,
                                                              staff_id: staffId,
                                                              mobile: memberInfo?.mobile || ''
                                                            };
                                                          }
                                                          return s;
                                                        });
                                                        
                                                        return {
                                                          ...prev,
                                                          [evId]: {
                                                            ...existingAlloc,
                                                            staff: updatedStaff
                                                          }
                                                        };
                                                      });
                                                    }}
                                                    className={`w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-[11px] rounded-lg px-2 py-1 font-sans focus:outline-none focus:border-amber-500 cursor-pointer h-7 ${
                                                      assignedStaff.staff_name ? 'text-emerald-400 font-bold' : 'text-zinc-400 font-normal'
                                                    }`}
                                                  >
                                                    {(() => {
                                                      const normType = (type: string | undefined): string => {
                                                        const clean = (type || 'In-House').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                                                        return (clean === 'inhouse' || clean === 'in-house' || clean === 'in house') ? 'in-house' : 'freelancer';
                                                      };
                                                      
                                                      const filteredStaff = (staff || []).filter(s => {
                                                        if (s.status !== 'Active') return false;
                                                        if (s.department !== 'Operations') return false;
                                                        const sType = s.staff_type || s.Staff_Type;
                                                        return normType(sType) === normType(currentStaffType);
                                                      });
                                                      
                                                      // Staff names assigned to ANY OTHER slot in THIS event
                                                      const assignedInOtherSlots = (eventAllocations[evId]?.staff || []).filter((s: any, idx: number) => {
                                                        const isOther = s.role_index !== undefined ? s.role_index !== roleIdx : idx !== roleIdx;
                                                        return isOther && s.staff_name && s.staff_name.trim() !== '';
                                                      }).map((s: any) => s.staff_name.trim().toLowerCase());

                                                      const currentAssignedNameLower = (assignedStaff.staff_name || '').trim().toLowerCase();

                                                      const availableStaff = filteredStaff.filter(s => {
                                                        const nameLower = (s.name || '').trim().toLowerCase();
                                                        if (nameLower === currentAssignedNameLower) return true;
                                                        return !assignedInOtherSlots.includes(nameLower);
                                                      });
                                                      
                                                      if (availableStaff.length === 0) {
                                                        return <option value="" disabled>No staff available.</option>;
                                                      }
                                                      
                                                      return (
                                                        <>
                                                          <option value="">▼ Select Staff</option>
                                                          {availableStaff.map(st => {
                                                            const isBusy = isStaffBusyOnDate(st.name, ev.event_date || '', activeOrderInstance?.order_id || '');
                                                            return (
                                                              <option key={st.staff_id} value={st.name}>
                                                                {st.name} {isBusy ? '🔴 Busy' : '🟢 Available'} - {st.role}
                                                              </option>
                                                            );
                                                          })}
                                                        </>
                                                      );
                                                    })()}
                                                  </select>
                                                  <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
                                                    {assignedStaff.staff_name && (
                                                      isStaffBusyOnDate(assignedStaff.staff_name, ev.event_date || '', activeOrderInstance?.order_id || '') ? (
                                                        <button
                                                           type="button"
                                                           onClick={() => setBusyRosterStaff(assignedStaff.staff_name)}
                                                           className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono uppercase border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors shrink-0"
                                                        >
                                                          🔴 Busy
                                                        </button>
                                                      ) : (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono uppercase border border-emerald-500/20 shrink-0">
                                                          🟢 Available
                                                        </span>
                                                      )
                                                    )}
                                                    {/* Remove Row Button */}
                                                    <button
                                                      type="button"
                                                    onClick={() => {
                                                      setEventAllocations((prev: any) => {
                                                        const existingAlloc = prev[evId] || { staff: [] };
                                                        
                                                        const updatedStaff = existingAlloc.staff.map((s: any, idx: number) => {
                                                          const isTarget = s.role_index !== undefined ? s.role_index === roleIdx : idx === roleIdx;
                                                          if (isTarget) {
                                                            return {
                                                              ...s,
                                                              role_index: roleIdx,
                                                              staff_name: '',
                                                              staff_id: '',
                                                              mobile: '',
                                                              equipment: []
                                                            };
                                                          }
                                                          return s;
                                                        });
                                                        
                                                        return {
                                                          ...prev,
                                                          [evId]: {
                                                            ...existingAlloc,
                                                            staff: updatedStaff
                                                          }
                                                        };
                                                      });
                                                    }}
                                                    className="text-zinc-600 hover:text-rose-400 transition-colors p-1 cursor-pointer text-xs font-bold shrink-0 ml-auto sm:ml-0"
                                                    title="Remove staff assignment row"
                                                  >
                                                    ✕
                                                  </button>
                                                  </div>
                                                </div>
                                              </div>
                                              {/* Assigned Equipment Section for Individual Staff */}
                                              {(() => {
                                                const eqKey = `${evId}-${roleIdx}`;
                                                const searchQuery = equipmentSearchQueryByEvent[eqKey] || '';
                                                const isDropdownOpen = !!isEquipmentDropdownOpenByEvent[eqKey];
                                                const selectedEquipmentNames = assignedStaff.equipment || [];
                                                
                                                const allOtherSelectedEquipments = allocStaff
                                                  .filter((s: any, idx: number) => {
                                                    return s.role_index !== undefined ? s.role_index !== roleIdx : idx !== roleIdx;
                                                  })
                                                  .flatMap((s: any) => s.equipment || []);

                                                const filteredEquipment = (equipment || []).filter(eq => {
                                                  if (allOtherSelectedEquipments.includes(eq.equipment_name)) {
                                                    return false;
                                                  }
                                                  const q = searchQuery.toLowerCase();
                                                  return eq.equipment_name.toLowerCase().includes(q) ||
                                                         (eq.category || '').toLowerCase().includes(q) ||
                                                         (eq.serial_number || '').toLowerCase().includes(q);
                                                });
                      
                                                return (
                                                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 mt-1 pt-2 border-t border-zinc-900/50">
                                                    
                                                    <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider pt-1 shrink-0 sm:w-28 hidden sm:block">Equipment</div>
                                                    
                                                    <div className="flex flex-col flex-1 gap-2 min-w-0 w-full">
                                                      {/* Selected equipment tags */}
                                                      {selectedEquipmentNames.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                          {selectedEquipmentNames.map((eqName: string, idx: number) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] sm:text-[11px] font-mono font-medium rounded border border-amber-500/20 transition-all">
                                                              <span className="truncate max-w-[120px] sm:max-w-[200px]">⚙️ {eqName}</span>
                                                              <button
                                                              type="button"
                                                              onClick={() => {
                                                                setEventAllocations((prev: any) => {
                                                                  const existingAlloc = prev[evId] || { staff: [] };
                                                                  const updatedStaff = existingAlloc.staff.map((s: any, idx: number) => {
                                                                    const isTarget = s.role_index !== undefined ? s.role_index === roleIdx : idx === roleIdx;
                                                                    if (isTarget) {
                                                                      return {
                                                                        ...s,
                                                                        equipment: (s.equipment || []).filter((name: string) => name !== eqName)
                                                                      };
                                                                    }
                                                                    return s;
                                                                  });
                                                                  return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                                });
                                                              }}
                                                              className="text-amber-500 hover:text-amber-400 font-bold ml-1 text-xs cursor-pointer focus:outline-none"
                                                            >
                                                              ✕
                                                            </button>
                                                          </span>
                                                        ))}
                                                        </div>
                                                      )}
                                                      
                                                      {/* Search & Select input dropdown */}
                                                      <div className="relative">
                                                        <div className="flex gap-1.5">
                                                          <input
                                                            type="text"
                                                            placeholder={selectedEquipmentNames.length === 0 ? "Search to assign equipment..." : "Search equipment..."}
                                                            value={searchQuery}
                                                            onFocus={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [eqKey]: true }))}
                                                            onChange={(e) => setEquipmentSearchQueryByEvent(prev => ({ ...prev, [eqKey]: e.target.value }))}
                                                            className="flex-1 min-w-0 bg-zinc-900/50 border border-zinc-800 focus:border-amber-500/50 focus:outline-none rounded py-1 px-2 text-[11px] sm:text-xs text-zinc-100 placeholder-zinc-500 h-7"
                                                          />
                                                          {isDropdownOpen ? (
                                                            <button
                                                              type="button"
                                                              onClick={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [eqKey]: false }))}
                                                              className="px-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[11px] sm:text-xs font-mono font-bold rounded border border-zinc-750 transition-colors cursor-pointer shrink-0 h-7"
                                                            >
                                                              Close
                                                            </button>
                                                          ) : (
                                                            <button
                                                              type="button"
                                                              onClick={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [eqKey]: true }))}
                                                              className="px-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-[11px] sm:text-xs font-mono font-bold rounded border border-zinc-800 transition-colors cursor-pointer shrink-0 h-7"
                                                            >
                                                              Browse
                                                            </button>
                                                          )}
                                                        </div>
                                                        {isDropdownOpen && (
                                                          <div className="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded shadow-xl max-h-48 overflow-y-auto z-40 scrollbar-thin divide-y divide-zinc-800/60">
                                                          {filteredEquipment.length > 0 ? (
                                                            filteredEquipment.map((eq) => {
                                                              const isAlreadySelected = selectedEquipmentNames.includes(eq.equipment_name);
                                                              return (
                                                                <div
                                                                  key={eq.equipment_id}
                                                                  onClick={() => {
                                                                    setEventAllocations((prev: any) => {
                                                                      const existingAlloc = prev[evId] || { staff: [] };
                                                                      const updatedStaff = existingAlloc.staff.map((s: any, idx: number) => {
                                                                        const isTarget = s.role_index !== undefined ? s.role_index === roleIdx : idx === roleIdx;
                                                                        if (isTarget) {
                                                                          const currentEq = s.equipment || [];
                                                                          return {
                                                                            ...s,
                                                                            equipment: isAlreadySelected 
                                                                              ? currentEq.filter((name: string) => name !== eq.equipment_name)
                                                                              : [...currentEq, eq.equipment_name]
                                                                          };
                                                                        }
                                                                        return s;
                                                                      });
                                                                      return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                                    });
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
                                                                  </div>
                                                                  <div className="flex items-center gap-2">
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
                                                  </div>
                                                );
                                              })()}
                                            </div>

                                              {/* Validation message if missing */}
                                              {validationAttempted && isEmpty && (
                                                <div className="pt-0.5">
                                                  <span className="text-[10px] text-rose-500 font-mono italic">
                                                    ⚠️ Required: Assign at least one staff
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                      </div>
                                    );
                                  })}
                            </div>
                          </div>
                        </div>
                      )}


                        {/* Staff Schedule Card (Hidden as requested) */}
                        {false && (() => {
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
                                     if (otherEv.id === evId) return;
                                     const otherOrder = orders.find(o => o.lead_id === otherLead.lead_id || o.order_id === otherLead.lead_id);
                                     const orderIdToCheck = otherOrder?.order_id || otherLead.lead_id;
                                     const hasSavedAssignment = staffAssignments?.some(sa => 
                                       sa.staff_name.toLowerCase() === staffName.toLowerCase() &&
                                       sa.assignment_status !== 'Cancelled' &&
                                       sa.order_id === orderIdToCheck
                                     );
                                     if (hasSavedAssignment) {
                                       const isCompleted = otherOrder ? isCompletedEvent(otherOrder) : false;
                                       const op = otherOrder ? operations?.find(o => o.order_id === otherOrder.order_id) : null;
                                       const eventStatus = op?.event_status || 'Assigned';
                                       const isEventActive = !['completed', 'event completed', 'cancelled'].includes(eventStatus.toLowerCase());
                                       if (!isCompleted && otherLead.status !== 'Lost Lead' && isEventActive) {
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
                        
                      {/* 4. WhatsApp Sharing (Hidden as requested) */}
                      {false && allocStaff.length > 0 && (
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
                        )}
                    </div>
                  );
                })
                })()}
                
              </div>
              
              {assignValidationError && (
                 <div className="p-4 mx-6 my-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <span className="text-red-400 font-bold text-lg leading-none mt-0.5">❌</span>
                    <div className="text-[13px] text-red-200 font-sans whitespace-pre-wrap flex-1 leading-relaxed">
                       {assignValidationError}
                    </div>
                 </div>
              )}
                            <div className="sticky bottom-0 z-50 p-4 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-3 bg-zinc-950/90 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setAssigningOrderId(null)}
                  className="px-4 py-3 sm:py-2 text-xs font-mono font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer w-full sm:w-auto bg-zinc-900 sm:bg-transparent rounded-xl sm:rounded-none border border-zinc-800 sm:border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 sm:py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold uppercase rounded-xl sm:rounded-lg transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  {isSaving ? 'Saving Assignments...' : 'Save All Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Equipment Status Modal */}
      {selectedEquipmentStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full w-full max-w-lg shadow-2xl relative p-5">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-indigo-400 font-mono uppercase">
                Equipment Verification • {selectedEquipmentStatus.staffName}
              </h3>
              <button
                onClick={() => setSelectedEquipmentStatus(null)}
                className="text-zinc-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60 mb-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 font-bold">Verification Stage</th>
                    <th className="py-2.5 px-3 font-bold text-center">Image</th>
                    <th className="py-2.5 px-3 font-bold text-center">Upload Date</th>
                    <th className="py-2.5 px-3 font-bold text-right">Upload Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {(() => {
                    const recMeta = getRecordMeta(selectedEquipmentStatus.eqReceived);
                    const handMeta = getRecordMeta(selectedEquipmentStatus.eqHandover);
                    return (
                      <>
                        <tr className="hover:bg-zinc-800/20">
                          <td className="py-3 px-3 text-white font-bold">Equipment Received</td>
                          <td className="py-3 px-3 text-center">
                            {recMeta.url ? (
                              <button
                                onClick={() => setImagePreviewModal({ url: recMeta.url, date: recMeta.date, time: recMeta.time, staffName: selectedEquipmentStatus.staffName, stage: 'Equipment Received' })}
                                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                View Image
                              </button>
                            ) : (
                              <span className="text-zinc-600 italic text-[11px]">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-zinc-300">{recMeta.date}</td>
                          <td className="py-3 px-3 text-right font-mono text-zinc-300">{recMeta.time}</td>
                        </tr>
                        <tr className="hover:bg-zinc-800/20">
                          <td className="py-3 px-3 text-white font-bold">Equipment Handover</td>
                          <td className="py-3 px-3 text-center">
                            {handMeta.url ? (
                              <button
                                onClick={() => setImagePreviewModal({ url: handMeta.url, date: handMeta.date, time: handMeta.time, staffName: selectedEquipmentStatus.staffName, stage: 'Equipment Handover' })}
                                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                View Image
                              </button>
                            ) : (
                              <span className="text-zinc-600 italic text-[11px]">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-zinc-300">{handMeta.date}</td>
                          <td className="py-3 px-3 text-right font-mono text-zinc-300">{handMeta.time}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setSelectedEquipmentStatus(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Images Modal */}
      {selectedEventImages && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full w-full max-w-lg shadow-2xl relative p-5">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-indigo-400 font-mono uppercase">
                Event Images • {selectedEventImages.staffName}
              </h3>
              <button
                onClick={() => setSelectedEventImages(null)}
                className="text-zinc-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60 mb-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 font-bold">Event Stage</th>
                    <th className="py-2.5 px-3 font-bold text-center">Image</th>
                    <th className="py-2.5 px-3 font-bold text-center">Upload Date</th>
                    <th className="py-2.5 px-3 font-bold text-right">Upload Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {(() => {
                    const startMeta = getRecordMeta(selectedEventImages.evStart);
                    const endMeta = getRecordMeta(selectedEventImages.evEnd);
                    return (
                      <>
                        <tr className="hover:bg-zinc-800/20">
                          <td className="py-3 px-3 text-white font-bold">Event Start</td>
                          <td className="py-3 px-3 text-center">
                            {startMeta.url ? (
                              <button
                                onClick={() => setImagePreviewModal({ url: startMeta.url, date: startMeta.date, time: startMeta.time, staffName: selectedEventImages.staffName, stage: 'Event Start' })}
                                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                View Image
                              </button>
                            ) : (
                              <span className="text-zinc-600 italic text-[11px]">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-zinc-300">{startMeta.date}</td>
                          <td className="py-3 px-3 text-right font-mono text-zinc-300">{startMeta.time}</td>
                        </tr>
                        <tr className="hover:bg-zinc-800/20">
                          <td className="py-3 px-3 text-white font-bold">Event Complete</td>
                          <td className="py-3 px-3 text-center">
                            {endMeta.url ? (
                              <button
                                onClick={() => setImagePreviewModal({ url: endMeta.url, date: endMeta.date, time: endMeta.time, staffName: selectedEventImages.staffName, stage: 'Event Complete' })}
                                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                View Image
                              </button>
                            ) : (
                              <span className="text-zinc-600 italic text-[11px]">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-zinc-300">{endMeta.date}</td>
                          <td className="py-3 px-3 text-right font-mono text-zinc-300">{endMeta.time}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setSelectedEventImages(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Raw Footage Modal */}
      {receivingFootageOrderId && (() => {
        const currentOp = operations?.find(o => o.order_id === receivingFootageOrderId);
        const currentOrder = orders?.find(o => o.order_id === receivingFootageOrderId);
        const currentLead = leads?.find(l => l.lead_id === currentOrder?.lead_id);

        // Filter history records for this order/lead
        const orderHistory = (leadEquipmentHistory || []).filter(h => 
          (h.order_id && h.order_id === receivingFootageOrderId) ||
          (currentOrder?.lead_id && h.lead_id === currentOrder.lead_id)
        );

        // Helper to extract photo & info from history items
        const parseProof = (item: any) => {
          let photoUrl = '';
          let rawLink = '';
          let proofType = item?.equipment_status || '';
          if (item?.remarks) {
            try {
              const parsed = typeof item.remarks === 'string' ? JSON.parse(item.remarks) : item.remarks;
              photoUrl = parsed.photo_url || photoUrl;
              rawLink = parsed.raw_footage_link || rawLink;
              proofType = parsed.proof_type || proofType;
            } catch (e) {}
          }
          return { photoUrl, rawLink, proofType, status: item?.equipment_status, returnedBy: item?.returned_by, returnedAt: item?.returned_at };
        };

        // Find proofs
        const assetCollectionRecord = orderHistory.find(h => h.equipment_name === 'Asset Collection Photo Proof' || h.equipment_name === 'Asset Collection');
        const assetCollectionProof = parseProof(assetCollectionRecord);

        const eventStartRecord = orderHistory.find(h => h.equipment_name === 'Event Start Photo Proof' || h.equipment_name === 'Event Start');
        const eventStartProof = parseProof(eventStartRecord);

        const eventCompletionRecord = orderHistory.find(h => h.equipment_name === 'Event Completion Photo Proof' || h.equipment_name === 'Event Completion' || h.equipment_name === 'Event Complete');
        const eventCompletionProof = parseProof(eventCompletionRecord);

        const equipmentHandoverRecord = orderHistory.find(h => h.equipment_name === 'Equipment Handover Photo Proof' || h.equipment_name === 'Asset Return Photo Proof' || h.equipment_status === 'Equipment Handover Completed');
        const equipmentHandoverProof = parseProof(equipmentHandoverRecord);

        const rawFootageLink = currentOp?.raw_footage_drive_link || footageForm.footage_link || assetCollectionProof.rawLink || eventStartProof.rawLink || eventCompletionProof.rawLink || equipmentHandoverProof.rawLink;

        // Construct assigned crew list
        const staffDetails = currentOrder ? getAssignedStaffDetailsForOrder(currentOrder) : [];
        let assignedCrewList: Array<{ staff_name: string; staff_role: string; raw_footage_link?: string; event_name?: string }> = [];

        if (staffDetails.length > 0) {
          assignedCrewList = staffDetails.map(member => {
            const normStaffName = (member.staff_name || '').trim().toLowerCase();
            const normEvName = (member.event_name || '').trim().toLowerCase();
            const memberEvId = member.event_id;
            
            let rawLink: string | null = null;

            // 1. Check rawFootage table
            if (rawFootage && rawFootage.length > 0) {
              const rfMatch = rawFootage.find(rf => {
                if (rf.order_id !== receivingFootageOrderId) return false;
                const upBy = (rf.uploaded_by || '').trim().toLowerCase();
                if (upBy && upBy !== normStaffName) return false;
                if (memberEvId && rf.event_id) {
                  if (rf.event_id !== memberEvId) return false;
                } else if (rf.event_name) {
                  if (rf.event_name.trim().toLowerCase() !== normEvName) return false;
                }
                return true;
              });
              if (rfMatch) {
                rawLink = rfMatch.server_path || rfMatch.drive_link || null;
              }
            }

            // 2. Check staffAssignments table
            if (!rawLink && staffAssignments && staffAssignments.length > 0) {
              const saMatch = staffAssignments.find(sa => {
                if (sa.order_id !== receivingFootageOrderId) return false;
                if ((sa.staff_name || '').trim().toLowerCase() !== normStaffName) return false;
                return true;
              });
              if (saMatch) {
                const saLink = saMatch.raw_footage_link || (saMatch as any).drive_link || (saMatch as any).raw_footage_location;
                if (saLink && saLink.trim() && saLink.trim() !== 'Pending') {
                  rawLink = saLink.trim();
                }
              }
            }

            // 3. Check leadEquipmentHistory
            if (!rawLink && leadEquipmentHistory && leadEquipmentHistory.length > 0) {
              const hMatch = leadEquipmentHistory.find(h => {
                if (h.order_id !== receivingFootageOrderId) return false;
                let parsed: any = {};
                if (h.remarks) {
                  try { parsed = JSON.parse(h.remarks); } catch(e) {}
                }
                const retBy = (h.returned_by || parsed.staff_name || '').trim().toLowerCase();
                if (retBy !== normStaffName) return false;
                return !!(parsed.raw_footage_link || parsed.drive_link);
              });
              if (hMatch && hMatch.remarks) {
                try {
                  const parsed = JSON.parse(hMatch.remarks);
                  rawLink = parsed.raw_footage_link || parsed.drive_link || null;
                } catch (e) {}
              }
            }

            return {
              staff_name: member.staff_name,
              staff_role: member.staff_role || 'Operations Staff',
              event_name: member.event_name,
              raw_footage_link: rawLink || ''
            };
          });
        }
        
        // Fallbacks if no staffDetails (should be rare)
        if (assignedCrewList.length === 0 && currentOp?.assigned_staff) {
          const names = currentOp.assigned_staff.split(',').map((s: string) => s.trim());
          names.forEach(name => {
            if (name && !assignedCrewList.some(c => c.staff_name.toLowerCase() === name.toLowerCase())) {
              assignedCrewList.push({
                staff_name: name,
                staff_role: 'Operations Staff',
                raw_footage_link: ''
              });
            }
          });
        }

        const allCrewVerified = assignedCrewList.length > 0 
          ? assignedCrewList.every(c => !!(c.raw_footage_link && c.raw_footage_link.trim())) 
          : true;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div id="raw_footage_modal" className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full w-full max-w-2xl shadow-2xl relative p-6 max-h-[90vh] overflow-y-auto space-y-5 scrollbar-thin">
              
              {/* Header */}
              <div className="border-b border-zinc-800 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-purple-400 font-mono uppercase flex items-center gap-2">
                    <span>🎬</span> Final Consolidated Raw Footage
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Order ID: <strong className="text-zinc-200">{receivingFootageOrderId}</strong> | Customer: <strong className="text-zinc-200">{currentOrder?.customer_name || currentLead?.customer_name || 'N/A'}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setReceivingFootageOrderId(null);
                    setConsolidatedDriveLink('');
                  }}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Review description banner - Hidden per UI requirement */}
              {false && (
                <div className="text-xs text-zinc-400 leading-relaxed bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                  Review each assigned crew member's Raw Footage link below. Enter the <strong>Final Consolidated Raw Footage Drive Link</strong> to complete verification and transfer the order to Production.
                </div>
              )}

              {/* ASSIGNED TEAM MEMBERS VERIFICATION SECTION */}
              <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👥</span> Assigned Team Members & Raw Footage Links
                  </h4>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Uploaded: {assignedCrewList.filter(c => c.raw_footage_link).length} / {assignedCrewList.length}
                  </span>
                </div>

                {assignedCrewList.length === 0 ? (
                  <div className="text-xs text-zinc-500 italic py-2">No assigned crew members found for this order.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-zinc-800 text-[10px] font-mono uppercase text-zinc-400">
                          <th className="py-2.5 px-3">Staff Name</th>
                          <th className="py-2.5 px-3">Assigned Role</th>
                          <th className="py-2.5 px-3">Raw Footage Link</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {assignedCrewList.map((c) => {
                          const hasLink = !!(c.raw_footage_link && c.raw_footage_link.trim());
                          return (
                            <tr key={c.staff_name} className="hover:bg-zinc-900/50">
                              <td className="py-2.5 px-3 font-bold text-white">{c.staff_name}</td>
                              <td className="py-2.5 px-3 text-zinc-300 font-mono text-[11px]">{c.staff_role}</td>
                              <td className="py-2.5 px-3">
                                {hasLink ? (
                                  <a
                                    href={c.raw_footage_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 underline font-mono text-[11px]"
                                  >
                                    Open Drive Link ↗
                                  </a>
                                ) : (
                                  <span className="text-amber-500/80 italic text-[11px]">Not Uploaded Yet</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {hasLink ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                    ✅ Uploaded
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                                    ❌ Missing
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* PROOF REVIEWS SECTION - Hidden per UI requirement */}
              {false && (
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1">
                    📷 Staff Uploaded Proofs & Link Review
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* 1. Asset Collection Photo Proof */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                      <div className="text-[11px] font-bold text-zinc-300 flex justify-between items-center">
                        <span>Asset Collection Photo Proof</span>
                        {assetCollectionProof.photoUrl ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">Uploaded</span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">Not Uploaded</span>
                        )}
                      </div>
                      {assetCollectionProof.photoUrl ? (
                        <SafeProofImage url={assetCollectionProof.photoUrl} alt="Asset Collection" label="View Full Photo ↗" />
                      ) : (
                        <div className="h-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-[11px] text-zinc-500 italic">
                          No proof photo found
                        </div>
                      )}
                    </div>

                    {/* 2. Event Start Photo Proof */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                      <div className="text-[11px] font-bold text-zinc-300 flex justify-between items-center">
                        <span>Event Start Photo Proof</span>
                        {eventStartProof.photoUrl ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">Uploaded</span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">Not Uploaded</span>
                        )}
                      </div>
                      {eventStartProof.photoUrl ? (
                        <SafeProofImage url={eventStartProof.photoUrl} alt="Event Start" label="View Full Photo ↗" />
                      ) : (
                        <div className="h-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-[11px] text-zinc-500 italic">
                          No proof photo found
                        </div>
                      )}
                    </div>

                    {/* 3. Event Completion Photo Proof */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                      <div className="text-[11px] font-bold text-zinc-300 flex justify-between items-center">
                        <span>Event Completion Photo Proof</span>
                        {eventCompletionProof.photoUrl ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">Uploaded</span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">Not Uploaded</span>
                        )}
                      </div>
                      {eventCompletionProof.photoUrl ? (
                        <SafeProofImage url={eventCompletionProof.photoUrl} alt="Event Completion" label="View Full Photo ↗" />
                      ) : (
                        <div className="h-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-[11px] text-zinc-500 italic">
                          No proof photo found
                        </div>
                      )}
                    </div>

                    {/* 4. Equipment Handover Photo Proof (Optional) */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                      <div className="text-[11px] font-bold text-zinc-300 flex justify-between items-center">
                        <span>Equipment Handover Photo <span className="text-zinc-500 font-normal">(Optional)</span></span>
                        {equipmentHandoverProof.photoUrl ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">Handover Completed</span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">Equipment Not Handover</span>
                        )}
                      </div>
                      {equipmentHandoverProof.photoUrl ? (
                        <SafeProofImage url={equipmentHandoverProof.photoUrl} alt="Equipment Handover" label="View Full Photo ↗" />
                      ) : (
                        <div className="h-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center text-[11px] text-zinc-500 p-2 text-center">
                          <span>Equipment Not Handover</span>
                          <span className="text-[9px] text-zinc-600 mt-0.5">(Optional for verification)</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* UPLOAD FINAL CONSOLIDATED RAW FOOTAGE STEP */}
              {!allCrewVerified ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-300 text-xs flex items-center gap-2">
                  <span>⚠️</span> Please verify each assigned crew member's Raw Footage link before uploading the final raw footage.
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (isSaving) return;

                  if (!consolidatedDriveLink || !consolidatedDriveLink.trim()) {
                    alert("Please provide the Consolidated Drive Link before verifying.");
                    return;
                  }

                  try {
                    setIsSaving(true);
                    const timestamp = new Date().toISOString();

                    // Save Consolidated Link & update operation status
                    await pushUpdate('operations', 'order_id', receivingFootageOrderId, {
                      consolidated_drive_link: consolidatedDriveLink,
                      raw_footage_drive_link: rawFootageLink || consolidatedDriveLink,
                      event_status: 'Verified Footage',
                      remarks: `Verified by ${currentUserName || 'Operations Manager'} on ${new Date().toLocaleDateString()}`,
                      updated_by: currentUserName || 'Operations Manager'
                    });

                    // Call confirmRawFootageReceived to move to Verified Footage and Production
                    await confirmRawFootageReceived(
                      receivingFootageOrderId,
                      rawFootageLink || consolidatedDriveLink,
                      'Google Drive',
                      `Verified Footage with Consolidated Link: ${consolidatedDriveLink}`,
                      undefined,
                      undefined,
                      undefined
                    );

                    // Also explicitly update orders and leads
                    await pushUpdate('orders', 'order_id', receivingFootageOrderId, {
                      current_stage: 'Verified Footage',
                      updated_by: currentUserName || 'Operations Manager',
                      updated_at: timestamp
                    });

                    if (currentOrder?.lead_id) {
                      await updateLead(currentOrder.lead_id, {
                        status: 'Verified Footage' as any,
                        current_status: 'Verified Footage' as any,
                        updated_by: currentUserName || 'Operations Manager'
                      });
                    }

                    setReceivingFootageOrderId(null);
                    setConsolidatedDriveLink('');
                    setFootageForm({ footage_link: '', storage_type: 'Google Drive', upload_notes: '' });
                    
                    await refreshData();
                    alert("✅ Raw Footage Verified Successfully! Order transferred to Production Dashboard.");
                  } catch (err: any) {
                    console.error("Failed to verify raw footage:", err);
                    alert("Failed to verify raw footage: " + (err.message || "Please try again."));
                  } finally {
                    setIsSaving(false);
                  }
                }} className="space-y-4 pt-3 border-t border-zinc-800">

                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                      <span>🎬</span> Upload Final Consolidated Raw Footage
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase font-mono mb-1.5 flex items-center justify-between">
                        <span>Final Consolidated Drive Link <span className="text-rose-400">*</span></span>
                        <span className="text-[10px] text-zinc-500 font-sans font-normal">Required for Production Team</span>
                      </label>
                      <input
                        type="url"
                        required
                        value={consolidatedDriveLink}
                        onChange={(e) => setConsolidatedDriveLink(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setReceivingFootageOrderId(null);
                          setConsolidatedDriveLink('');
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving || !consolidatedDriveLink.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer shadow-lg shadow-purple-600/20 flex items-center gap-2"
                      >
                        {isSaving ? 'Saving & Transferring...' : 'Upload Final Raw Footage & Move to Production 🚀'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

            </div>
          </div>
        );
      })()}

      {/* Staff Assignment Success Modal */}
      {successModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in duration-200">
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full w-full max-w-2xl shadow-2xl p-6 relative animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setWhatsappShareModalData(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold cursor-pointer transition-colors p-1"
              type="button"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800 pb-3">
              <span className="text-xl">📱</span>
              <div className="text-left">
                <h3 className="text-base font-bold text-white">
                  Personalized WhatsApp Share
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Review and share work assignments for Order <span className="font-mono text-indigo-400 font-bold">{whatsappShareModalData.orderId}</span>
                </p>
              </div>
            </div>

            <div className="overflow-y-auto space-y-5 flex-1 pr-1 text-left">
              {whatsappShareModalData.staffNames.filter(name => {
                const st = staff?.find(s => s.name === name);
                return st?.department === 'Operations';
              }).length === 0 ? (
                <div className="text-center py-8 text-zinc-500 italic text-xs font-mono">
                  No staff assigned yet.
                </div>
              ) : (
                whatsappShareModalData.staffNames.filter(name => {
                  const st = staff?.find(s => s.name === name);
                  return st?.department === 'Operations';
                }).map((name, idx) => {
                  const stObj = staff?.find(s => s.name === name);
                  const isSelected = !!selectedStaffForShare[name];
                  const msgText = editedMessages[name] || '';

                  return (
                    <div 
                      key={idx} 
                      className={`border rounded-2xl p-4 transition-all duration-200 ${
                        isSelected 
                          ? 'bg-zinc-950/65 border-zinc-800/80 shadow-md' 
                          : 'bg-zinc-900/30 border-zinc-850/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaffForShare(prev => ({
                                ...prev,
                                [name]: !prev[name]
                              }));
                            }}
                            className="text-lg text-indigo-400 hover:text-indigo-300 transition-all active:scale-90 cursor-pointer pt-0.5"
                          >
                            {isSelected ? '☑️' : '⬛'}
                          </button>
                          
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">{name}</span>
                              {stObj?.role && (
                                <span className="text-[9.5px] font-mono text-zinc-400 bg-zinc-850 px-1.5 py-0.5 rounded border border-zinc-800">
                                  {stObj.role}
                                </span>
                              )}
                            </div>
                            {stObj?.mobile && (
                              <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                                📱 {stObj.mobile}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => {
                              const cleanPhone = stObj?.mobile ? stObj.mobile.replace(/\D/g, '') : '';
                              const shareUrl = cleanPhone 
                                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}`
                                : `https://wa.me/?text=${encodeURIComponent(msgText)}`;
                              window.open(shareUrl, '_blank');
                            }}
                            className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 text-black font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 shadow-md shadow-[#25D366]/10 hover:shadow-[#25D366]/25 transition-all cursor-pointer"
                          >
                            <span className="text-xs">📲</span> Share on WhatsApp
                          </button>
                        )}
                      </div>

                      {isSelected && (
                        <div className="space-y-1.5">
                          <label className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
                            📝 Edit Message Preview:
                          </label>
                          <textarea
                            value={msgText}
                            onChange={(e) => {
                              setEditedMessages(prev => ({
                                ...prev,
                                [name]: e.target.value
                              }));
                            }}
                            rows={6}
                            className="w-full bg-zinc-950 border border-zinc-850 text-zinc-300 text-xs font-mono p-3 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800 mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setWhatsappShareModalData(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-300 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Staff Popup (Triggered by Team Count click) */}
      {viewingStaffOrderId && (() => {
        const ord = orders.find(o => o.order_id === viewingStaffOrderId);
        if (!ord) return null;
        const staffDetails = getAssignedStaffDetailsForOrder(ord);

        // Group by event name
        const groupedByEvent: Record<string, typeof staffDetails> = {};
        staffDetails.forEach(sd => {
          const evName = sd.event_name || ord.event_type || 'Main Event';
          if (!groupedByEvent[evName]) {
            groupedByEvent[evName] = [];
          }
          groupedByEvent[evName].push(sd);
        });

        const eventNames = Object.keys(groupedByEvent);

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full w-full max-w-4xl shadow-2xl p-6 relative animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
              <button 
                onClick={() => setViewingStaffOrderId(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold cursor-pointer transition-colors p-1"
                type="button"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
                <span className="text-xl">👥</span>
                <div className="text-left">
                  <h3 className="text-base font-bold text-white font-sans">
                    Assigned Team Members
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Order <span className="font-mono text-indigo-400 font-bold">{ord.order_id}</span> • {ord.customer_name}
                  </p>
                </div>
              </div>

              <div className="overflow-y-auto space-y-4 flex-1 pr-1 text-left">
                {eventNames.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 italic text-xs font-mono">
                    No staff assigned yet.
                  </div>
                ) : (
                  eventNames.map((evName, evIdx) => {
                    const members = groupedByEvent[evName];
                    return (
                      <div key={evIdx} className="bg-zinc-950/40 border border-zinc-850/60 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                          <h4 className="text-xs font-bold text-indigo-400 font-sans flex items-center gap-1.5">
                            🎬 {evName}
                          </h4>
                          {members[0] && (
                            <span className="text-[10px] font-mono text-zinc-500">
                              {members[0].event_date}
                            </span>
                          )}
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/60 mt-2">
                          <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                              <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                                <th className="py-2.5 px-3.5 font-bold whitespace-nowrap">Staff Name</th>
                                <th className="py-2.5 px-3.5 font-bold whitespace-nowrap">Assigned Task</th>
                                <th className="py-2.5 px-3.5 font-bold text-center whitespace-nowrap">Equipment Status</th>
                                <th className="py-2.5 px-3.5 font-bold text-center whitespace-nowrap">Event Images</th>
                                <th className="py-2.5 px-3.5 font-bold text-center whitespace-nowrap">Raw Footage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-xs">
                              {members.map((member, mIdx) => {
                                const normStaffName = (member.staff_name || '').trim().toLowerCase();
                                const normEvName = (evName || '').trim().toLowerCase();
                                const memberEvId = member.event_id;

                                const getRecordForStage = (stages: string[], equipName?: string) => {
                                  if (!leadEquipmentHistory || leadEquipmentHistory.length === 0) return null;
                                  return leadEquipmentHistory.find(h => {
                                    if (h.order_id && h.order_id !== ord.order_id) return false;
                                    
                                    let parsed: any = {};
                                    if (h.remarks) {
                                      try { parsed = JSON.parse(h.remarks); } catch(e) {}
                                    }

                                    const retBy = (h.returned_by || parsed.staff_name || '').trim().toLowerCase();
                                    if (retBy && retBy !== normStaffName) return false;

                                    const hEventId = parsed.event_id;
                                    const hEventName = parsed.event_name;
                                    const hProofType = parsed.proof_type;
                                    const hPhotoUrl = parsed.photo_url || h.photo_url;
                                    
                                    // Match event Id strictly if both exist and neither is 'gen'
                                    if (memberEvId && hEventId && memberEvId !== 'gen' && hEventId !== 'gen' && hEventId !== memberEvId) return false;
                                    
                                    // If we don't have matching event IDs, we can try matching by name
                                    if (!memberEvId || !hEventId || hEventId === 'gen' || memberEvId === 'gen') {
                                      if (normEvName && hEventName && hEventName.trim().toLowerCase() !== normEvName && normEvName !== 'general event' && hEventName.trim().toLowerCase() !== 'general event') return false;
                                    }
                                    
                                    if (equipName && h.equipment_name && h.equipment_name === equipName) {
                                      return true; 
                                    }

                                    const eqStatus = (h.equipment_status || hProofType || '').trim();
                                    const stageMatch = stages.some(s => s.toLowerCase() === eqStatus.toLowerCase());
                                    if (!stageMatch) return false;

                                    return true;
                                  });
                                };

                                const assetCollection = getRecordForStage(['Equipment Received', 'Asset Collection Photo Proof'], 'Asset Collection Photo Proof');
                                const evStart = getRecordForStage(['Event Start', 'Event Started', 'Event Start Photo Proof'], 'Event Start Photo Proof');
                                const evEnd = getRecordForStage(['Event Complete', 'Event Completed', 'Event End', 'Event Ended', 'Event Completion Photo Proof'], 'Event Completion Photo Proof');
                                const eqHandover = getRecordForStage(['Equipment Handover', 'Equipment Handover Photo Proof'], 'Equipment Handover Photo Proof');

                                // 1. Real-time individual staff status for this event (Event Workflow)
                                const rawTaskStatus = getStaffTaskStatus(ord.order_id, memberEvId, evIdx, member.staff_name, ord);
                                const staffStatusText = rawTaskStatus && rawTaskStatus !== 'Pending' ? rawTaskStatus : 'Assigned Crew';

                                let statusBadge = (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[11px]">
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                    {staffStatusText}
                                  </span>
                                );
                                if (staffStatusText.toLowerCase().includes('complete') || staffStatusText.toLowerCase().includes('ended')) {
                                  statusBadge = (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                      {staffStatusText}
                                    </span>
                                  );
                                } else if (staffStatusText.toLowerCase().includes('start') || staffStatusText.toLowerCase().includes('progress')) {
                                  statusBadge = (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[11px]">
                                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                                      {staffStatusText}
                                    </span>
                                  );
                                } else if (staffStatusText.toLowerCase().includes('handover') || staffStatusText.toLowerCase().includes('verified')) {
                                  statusBadge = (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold text-[11px]">
                                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                                      {staffStatusText}
                                    </span>
                                  );
                                }

                                // 2. Equipment Status Text
                                const hasEqAssigned = member.assigned_equipment && member.assigned_equipment.length > 0;
                                let equipmentStatusText = hasEqAssigned ? '❌ Pending' : 'Not Assigned';
                                if (hasEqAssigned) {
                                  if (eqHandover && getRecordMeta(eqHandover).url) equipmentStatusText = '✅ Handed Over';
                                  else if (assetCollection && getRecordMeta(assetCollection).url) equipmentStatusText = '✅ Received';
                                }

                                // 3. Event Image Status Text
                                let eventImageStatusText = '❌ Pending';
                                if (evEnd && getRecordMeta(evEnd).url) eventImageStatusText = '✅ Event End';
                                else if (evStart && getRecordMeta(evStart).url) eventImageStatusText = '✅ Event Start';

                                // 4. Raw Footage Link
                                let rawFootageLink: string | null = null;
                                if (rawFootage && rawFootage.length > 0) {
                                  const rfMatch = rawFootage.find(rf => {
                                    if (rf.order_id !== ord.order_id) return false;
                                    const upBy = (rf.uploaded_by || '').trim().toLowerCase();
                                    if (upBy && upBy !== normStaffName) return false;
                                    if (memberEvId && rf.event_id) {
                                      if (rf.event_id !== memberEvId) return false;
                                    } else if (rf.event_name) {
                                      if (rf.event_name.trim().toLowerCase() !== normEvName) return false;
                                    }
                                    return true;
                                  });
                                  if (rfMatch) {
                                    rawFootageLink = rfMatch.server_path || rfMatch.drive_link || null;
                                  }
                                }

                                if (!rawFootageLink && staffAssignments && staffAssignments.length > 0) {
                                  const saMatch = staffAssignments.find(sa => {
                                    if (sa.order_id !== ord.order_id) return false;
                                    if ((sa.staff_name || '').trim().toLowerCase() !== normStaffName) return false;
                                    return true;
                                  });
                                  if (saMatch) {
                                    const saLink = saMatch.raw_footage_link || (saMatch as any).drive_link || (saMatch as any).raw_footage_location;
                                    if (saLink && saLink.trim() && saLink.trim() !== 'Pending') {
                                      rawFootageLink = saLink.trim();
                                    }
                                  }
                                }

                                if (!rawFootageLink && leadEquipmentHistory && leadEquipmentHistory.length > 0) {
                                  const hMatch = leadEquipmentHistory.find(h => {
                                    if (h.order_id !== ord.order_id) return false;
                                    let parsed: any = {};
                                    if (h.remarks) {
                                      try { parsed = JSON.parse(h.remarks); } catch(e) {}
                                    }
                                    const retBy = (h.returned_by || parsed.staff_name || '').trim().toLowerCase();
                                    if (retBy !== normStaffName) return false;
                                    
                                    return !!(parsed.raw_footage_link || parsed.drive_link);
                                  });
                                  if (hMatch && hMatch.remarks) {
                                    try {
                                      const parsed = JSON.parse(hMatch.remarks);
                                      rawFootageLink = parsed.raw_footage_link || parsed.drive_link || null;
                                    } catch (e) {}
                                  }
                                }

                                const rfVerification = leadEquipmentHistory?.find(h => 
                                  h.order_id === ord.order_id && 
                                  h.equipment_name === 'Raw Footage Verification' && 
                                  (h.returned_by || '').trim().toLowerCase() === normStaffName &&
                                  (!memberEvId || (() => { try { return JSON.parse(h.remarks || '{}').event_id === memberEvId; } catch(e) { return false; } })())
                                );
                                const verificationStatus = rfVerification?.equipment_status || 'Pending Verification';

                                return (
                                  <tr key={mIdx} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="py-3 px-3.5 font-bold text-white font-sans whitespace-nowrap">
                                      {member.staff_name}
                                    </td>
                                    <td className="py-3 px-3.5 font-sans whitespace-nowrap">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-xs">
                                        {formatQtyItem(member.assigned_task || member.staff_role)}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                      {hasEqAssigned ? (
                                        <span 
                                          onClick={() => setSelectedEquipmentStatus({ staffName: member.staff_name, eqReceived: assetCollection, eqHandover })}
                                          className="cursor-pointer text-indigo-400 hover:text-indigo-300 underline font-bold text-xs"
                                        >
                                          {equipmentStatusText}
                                        </span>
                                      ) : (
                                        <span className="text-zinc-500 font-semibold text-xs font-mono">
                                          Not Assigned
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                      <span 
                                        onClick={() => setSelectedEventImages({ staffName: member.staff_name, assetCollection, evStart, evEnd })}
                                        className="cursor-pointer text-indigo-400 hover:text-indigo-300 underline font-bold text-xs"
                                      >
                                        {eventImageStatusText}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                      {rawFootageLink ? (
                                        <div className="flex flex-col items-center gap-1.5">
                                          <a
                                            href={rawFootageLink.startsWith('http') ? rawFootageLink : `https://${rawFootageLink}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-bold text-xs font-mono"
                                          >
                                            ✅ Uploaded ↗
                                          </a>
                                          <div className="flex items-center gap-2">
                                            {verificationStatus === 'Verified' ? (
                                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">✅ Verified</span>
                                            ) : (
                                              <button type="button" onClick={() => handleVerifyFootage(ord, member.staff_name, memberEvId, 'Verified')} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-1.5 rounded bg-emerald-500/10 cursor-pointer transition-colors">✔ Verify</button>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-zinc-600 font-bold text-[11px]">❌ Pending</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800 mt-4">
                <button
                  type="button"
                  onClick={() => setViewingStaffOrderId(null)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-350 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Busy Staff Roster Popup */}
      {busyRosterStaff && (() => {
        // Collect all assignments for this staff member (using same logic as Staff Directory)
        const roster: Array<{ orderId: string; eventName: string; date: string; time: string; }> = [];
        
        const staffSavedAssignments = (staffAssignments || []).filter(sa => 
          sa.staff_name.toLowerCase() === busyRosterStaff.toLowerCase() &&
          sa.assignment_status !== 'Cancelled'
        );
        
        staffSavedAssignments.forEach(sa => {
          const order = (orders || []).find(o => o.order_id === sa.order_id);
          const lead = (leads || []).find(l => l.lead_id === (order?.lead_id || sa.order_id));
          
          if (!order && !lead) return;
          
          const op = operations?.find(o => o.order_id === sa.order_id);
          const bookingStage = order?.current_stage || lead?.status || '';
          const eventStatus = op?.event_status || 'Assigned';
          
          const isCompletedOrCancelled = [
            'completed', 'event completed', 'raw footage received', 'event cancelled', 'closed', 'delivered', 'cancelled', 'lost lead'
          ].includes(bookingStage.toLowerCase()) || [
            'completed', 'event completed', 'cancelled'
          ].includes(eventStatus.toLowerCase());
          
          if (isCompletedOrCancelled) return;
          
          if (lead?.events && lead.events.length > 0) {
            lead.events.forEach((ev: any) => {
              roster.push({
                orderId: order?.order_id || lead.lead_id,
                eventName: ev.event_type === 'Other' ? (ev.event_name || 'Other Event') : (ev.event_type || 'N/A'),
                date: ev.event_date || 'N/A',
                time: ev.reporting_time || ev.event_start_time || 'N/A'
              });
            });
          } else {
            roster.push({
              orderId: order?.order_id || lead?.lead_id || sa.order_id,
              eventName: lead?.custom_event_name || order?.event_type || lead?.event_type || 'N/A',
              date: lead?.event_date || order?.event_date || 'N/A',
              time: lead?.reporting_time || op?.reporting_time || 'N/A'
            });
          }
        });
        
        // Deduplicate
        const uniqueRosterStr = Array.from(new Set(roster.map(r => JSON.stringify(r))));
        roster.length = 0; uniqueRosterStr.map(s => roster.push(JSON.parse(s)));
        return createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                    {busyRosterStaff.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-0.5">Staff Member Assignments</span>
                    <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                      {busyRosterStaff}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBusyRosterStaff(null)}
                  className="text-zinc-500 hover:text-white font-bold cursor-pointer transition-colors p-1"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                {roster.length === 0 ? (
                  <div className="text-xs text-zinc-500 italic text-center py-4">No assignments found for {busyRosterStaff}.</div>
                ) : (
                  roster.map((r, idx) => (
                    <div key={idx} className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700/80 transition-colors">
                      <div className="space-y-1">
                        <div className="text-[10px] text-zinc-500 font-mono tracking-wider">ORDER: <span className="text-zinc-300 font-bold">{r.orderId}</span></div>
                        <div className="text-xs text-zinc-100 font-bold">{r.eventName}</div>
                      </div>
                      <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-lg border border-zinc-800/80">
                        <div className="flex flex-col">
                           <span className="text-[9px] text-zinc-500 font-mono">DATE</span>
                           <span className="text-[11px] text-zinc-300 font-mono font-bold">{r.date}</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-800" />
                        <div className="flex flex-col">
                           <span className="text-[9px] text-zinc-500 font-mono">TIME</span>
                           <span className="text-[11px] text-zinc-300 font-mono font-bold">{r.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* View Details Modal */}
      <ViewDetailsModal
        isOpen={!!projectDossierId}
        onClose={() => setProjectDossierId(null)}
        orderId={projectDossierId}
      />

      {/* Floating Action Menu */}
      {activeMenuOrderId && createPortal(
        <div 
          className="fixed z-[9999] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-2 text-left animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden actions-menu-container"
          style={{
            left: `${menuCoords.left}px`,
            top: `${menuCoords.top}px`,
            width: `${menuCoords.width}px`,
            maxHeight: `${menuCoords.maxHeight}px`,
            transform: menuCoords.openUpward ? 'translateY(-100%)' : 'none',
          }}
        >
          <div className="px-3 py-1.5 border-b border-zinc-800/60 mb-1.5 flex justify-between items-center flex-shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-extrabold flex items-center gap-1.5">
              <span>🎯</span> Available Actions
            </span>
            <button
              onClick={() => setActiveMenuOrderId(null)}
              className="text-zinc-500 hover:text-white text-xs p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto space-y-1 pr-0.5" style={{ maxHeight: `${(menuCoords.maxHeight || 280) - 40}px` }}>
            {activeMenuItems.map((act, aIdx) => (
              <button
                key={aIdx}
                type="button"
                onClick={act.onClick}
                className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-zinc-200 hover:bg-indigo-600/20 hover:text-indigo-300 active:bg-indigo-600/30 border border-transparent hover:border-indigo-500/30 transition-all cursor-pointer block whitespace-nowrap rounded-xl shadow-sm"
              >
                {act.label}
              </button>
            ))}
            {activeMenuItems.length === 0 && (
              <div className="px-3 py-2 text-xs text-zinc-500 italic font-mono text-center">
                No actions available
              </div>
            )}
          </div>
        </div>
      , document.body)}

      {/* Image Preview Modal */}
      {imagePreviewModal && createPortal(
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">{imagePreviewModal.stage}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Uploaded by <strong className="text-indigo-400">{imagePreviewModal.staffName}</strong> • {imagePreviewModal.date} {imagePreviewModal.time}
                </p>
              </div>
              <button 
                onClick={() => setImagePreviewModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-zinc-950 overflow-hidden relative min-h-[300px] flex items-center justify-center">
              {imagePreviewModal.url ? (
                <img 
                  src={imagePreviewModal.url} 
                  alt={imagePreviewModal.stage} 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                    const errDiv = document.createElement('div');
                    errDiv.className = 'text-center p-8';
                    errDiv.innerHTML = '<span class="text-3xl mb-2 block">⚠️</span><p class="text-zinc-400 font-mono text-sm">Image not found. Please verify the uploaded image URL.</p>';
                    target.parentElement?.appendChild(errDiv);
                  }}
                />
              ) : (
                <div className="text-center p-8">
                  <span className="text-3xl mb-2 block">⚠️</span>
                  <p className="text-zinc-400 font-mono text-sm">Image not found. Please verify the uploaded image URL.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* New Project Arrived Modal */}
      {showNewProjectsModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-[95vw] h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <span className="text-xl">📋</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">New Project Arrived</h2>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{newProjects.length} Pending Assignment</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNewProjectsModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 shrink-0">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden w-full">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                        <th className="p-3 font-semibold">Order ID</th>
                        <th className="p-3 font-semibold">Lead ID</th>
                        <th className="p-3 font-semibold">Customer</th>
                        <th className="p-3 font-semibold">Mobile</th>
                        <th className="p-3 font-semibold">Event Name</th>
                        <th className="p-3 font-semibold">Event Date</th>
                        <th className="p-3 font-semibold">Start Time</th>
                        <th className="p-3 font-semibold">End Time</th>
                        <th className="p-3 font-semibold">Event Type</th>
                        <th className="p-3 font-semibold">Current Status</th>
                        <th className="p-3 font-semibold">Assigned Staff</th>
                        <th className="p-3 font-semibold">Target Delivery Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {newProjects.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-zinc-500 font-mono">
                            No new projects arrived.
                          </td>
                        </tr>
                      ) : (
                        newProjects.map(proj => {
                          const assignedStaff = getAssignedStaffDetailsForOrder(proj);
                          const staffNames = assignedStaff.length > 0 ? assignedStaff.map(s => s.staff_name).join(', ') : 'Unassigned';
                          const projLead = leads.find(l => l.lead_id === proj.lead_id);
                          return (
                            <tr key={proj.order_id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="p-3 font-mono text-cyan-400 font-bold">{proj.order_id}</td>
                              <td className="p-3 font-mono text-zinc-300">{proj.lead_id}</td>
                              <td className="p-3 text-slate-200">{proj.customer_name || 'N/A'}</td>
                              <td className="p-3 font-mono text-zinc-400">{proj.mobile || projLead?.mobile || 'N/A'}</td>
                              <td className="p-3 text-slate-300">{proj.custom_event_name || proj.event_type || 'N/A'}</td>
                              <td className="p-3 font-mono text-zinc-300">{proj.event_date || 'N/A'}</td>
                              <td className="p-3 font-mono text-zinc-400">{proj.event_time || proj.event_start_time || projLead?.event_time || projLead?.event_start_time || 'N/A'}</td>
                              <td className="p-3 font-mono text-zinc-400">{proj.event_end_time || projLead?.event_end_time || 'N/A'}</td>
                              <td className="p-3 text-slate-300">{proj.event_type || 'N/A'}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono tracking-wider bg-zinc-800 text-zinc-300">
                                  {proj.current_stage || proj.order_status || 'Order Confirmed'}
                                </span>
                              </td>
                              <td className="p-3 text-zinc-400 max-w-[200px] truncate" title={staffNames}>{staffNames}</td>
                              <td className="p-3 font-mono text-zinc-400">{projLead?.delivery_target_date || 'Not Set'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};
