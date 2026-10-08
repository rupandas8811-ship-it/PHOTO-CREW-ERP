import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRole } from '../RoleContext';
import { 
  Users, 
  CheckCircle2, 
  PlayCircle, 
  Clock, 
  Calendar, 
  Search, 
  ArrowLeft, 
  Sparkles, 
  Phone, 
  User, 
  Briefcase, 
  ChevronRight, 
  ClipboardList, 
  Camera, 
  Eye, 
  X, 
  ExternalLink,
  Filter
} from 'lucide-react';
import { formatDateDDMMYY, formatTime12Hour, resolveStorageUrl } from '../../utils';
import { isOperationsAssignmentStarted } from '../../services/operationsAssignmentService';

export type DateFilterOption = 'This Month' | 'Last Month' | 'Last 3 Months' | 'Custom Date Range';

export interface DateFilterRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// Convert any date input into standard YYYY-MM-DD string
const toCalendarDateString = (dateVal?: string | null | Date): string | null => {
  if (!dateVal && (dateVal as any) !== 0) return null;
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  let str = String(dateVal).trim();
  if (!str || str === '—' || str === '-' || str === 'N/A' || str === 'null' || str === 'undefined') return null;

  str = str.replace(/^(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*[\s,]+/i, '');

  // 1. YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const n1 = parseInt(dmyMatch[1], 10);
    const n2 = parseInt(dmyMatch[2], 10);
    const y = dmyMatch[3];
    if (n2 > 12 && n1 <= 12) {
      return `${y}-${String(n1).padStart(2, '0')}-${String(n2).padStart(2, '0')}`;
    }
    return `${y}-${String(n2).padStart(2, '0')}-${String(n1).padStart(2, '0')}`;
  }

  // 3. DD/MM/YY or DD-MM-YY
  const dmyShortMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (dmyShortMatch) {
    let y = parseInt(dmyShortMatch[3], 10);
    y = y < 100 ? 2000 + y : y;
    return `${y}-${dmyShortMatch[2].padStart(2, '0')}-${dmyShortMatch[1].padStart(2, '0')}`;
  }

  // 4. DD MMM YYYY (e.g. "08 Oct 2026")
  const MONTHS_MAP: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const dMmmYMatch = str.match(/^(\d{1,2})[\s\-\/\.]*([a-zA-Z]{3,9})[\s\-\/\.,]*(\d{2,4})/);
  if (dMmmYMatch) {
    const d = dMmmYMatch[1].padStart(2, '0');
    const mStr = dMmmYMatch[2].slice(0, 3).toLowerCase();
    const m = MONTHS_MAP[mStr];
    let y = dMmmYMatch[3];
    if (y.length === 2) y = '20' + y;
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  // 5. Fallback Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
};

// Compute standard DateRange based on selected preset or custom inputs
const computeDateRange = (
  type: DateFilterOption | null,
  customStart?: string,
  customEnd?: string
): DateFilterRange | null => {
  if (!type) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (type === 'This Month') {
    return {
      start: formatYMD(new Date(year, month, 1)),
      end: formatYMD(new Date(year, month + 1, 0))
    };
  }

  if (type === 'Last Month') {
    return {
      start: formatYMD(new Date(year, month - 1, 1)),
      end: formatYMD(new Date(year, month, 0))
    };
  }

  if (type === 'Last 3 Months') {
    return {
      start: formatYMD(new Date(year, month - 2, 1)),
      end: formatYMD(new Date(year, month + 1, 0))
    };
  }

  if (type === 'Custom Date Range') {
    const s = customStart ? toCalendarDateString(customStart) : '';
    const e = customEnd ? toCalendarDateString(customEnd) : '';
    if (!s && !e) return null;
    return {
      start: s || '',
      end: e || ''
    };
  }

  return null;
};

// Check if an event date falls within the selected date range
const isEventWithinRange = (
  evDate: string | null | undefined,
  evEndDate: string | null | undefined,
  range: DateFilterRange | null
): boolean => {
  if (!range) return true;
  if (!range.start && !range.end) return true;
  if (!evDate) return false;

  const { start, end } = range;
  if (start && end) {
    const minD = start <= end ? start : end;
    const maxD = start <= end ? end : start;
    if (evEndDate && evEndDate >= evDate) {
      return evDate <= maxD && evEndDate >= minD;
    }
    return evDate >= minD && evDate <= maxD;
  }
  if (start) {
    if (evEndDate && evEndDate >= evDate) {
      return evEndDate >= start;
    }
    return evDate >= start;
  }
  if (end) {
    return evDate <= end;
  }
  return true;
};

export interface EventProofItem {
  id: string;
  stageName: string;
  stageKey: string;
  imageUrl: string;
  updatedDate: string;
  updatedTime: string;
  rawTimestamp?: string;
  itemTitle?: string;
}

export interface StaffRosterEventItem {
  key: string;
  orderId: string;
  customerName: string;
  customerMobile: string;
  eventCategory: string; // ONLY the Event Type
  reportingDate: string;
  reportingTime: string;
  currentStatus: string;
  isStarted: boolean;
  isCompleted: boolean;
  staffName?: string;
  staffId?: string;
  eventDateCal?: string | null;
  eventEndDateCal?: string | null;
  proofs: EventProofItem[];
}

export type DetailViewType = 'assigned' | 'started' | 'completed';

export const OperationsStaffRoster: React.FC = () => {
  const { 
    staff = [], 
    productionStaff = [], 
    users = [], 
    leads = [], 
    orders = [], 
    staffAssignments = [],
    leadEquipmentHistory = [] 
  } = useRole();

  // Selected staff and detail view filter state
  const [selectedStaff, setSelectedStaff] = useState<{
    staff_id: string;
    name: string;
    role?: string;
  } | null>(null);

  const [activeDetailType, setActiveDetailType] = useState<DetailViewType>('assigned');
  const [mainSearchQuery, setMainSearchQuery] = useState('');
  const [detailSearchQuery, setDetailSearchQuery] = useState('');

  // ONE Date Filter state for Staff Roster
  const [activeFilterType, setActiveFilterType] = useState<DateFilterOption | null>(null);
  const [selectedOption, setSelectedOption] = useState<DateFilterOption | null>(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Computed Date Range
  const activeDateRange = useMemo(() => {
    return computeDateRange(activeFilterType, customStartDate, customEndDate);
  }, [activeFilterType, customStartDate, customEndDate]);

  // Click outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  // Proof Modal state
  const [selectedProofEvent, setSelectedProofEvent] = useState<StaffRosterEventItem | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Close modals or filter on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else if (selectedProofEvent) {
          setSelectedProofEvent(null);
        } else if (isFilterOpen) {
          setIsFilterOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, selectedProofEvent, isFilterOpen]);

  // Clean Order ID helper: returns strictly clean Order ID (e.g. OR-1001), never UUIDs
  const getCleanOrderId = (rawOrderId?: string, leadId?: string): string => {
    const val = (rawOrderId || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const isEdr = /^EDR-/i.test(val);

    if (val && !isUuid && !isEdr && !/^LD-/i.test(val)) {
      return val;
    }

    if (val && (isUuid || isEdr || /^LD-/i.test(val))) {
      const matched = (orders || []).find(o => 
        o.order_id === val || 
        o.id === val || 
        (leadId && o.lead_id === leadId) || 
        (val.startsWith('LD-') && o.lead_id === val)
      );
      if (matched?.order_id && !/^[0-9a-f]{8}-/i.test(matched.order_id) && !/^EDR-/i.test(matched.order_id)) {
        return matched.order_id;
      }
      if (/^LD-/i.test(val)) {
        return `OR-${val.replace(/^LD-?/i, '')}`;
      }
    }

    if (leadId) {
      const matched = (orders || []).find(o => o.lead_id === leadId);
      if (matched?.order_id && !/^[0-9a-f]{8}-/i.test(matched.order_id) && !/^EDR-/i.test(matched.order_id)) {
        return matched.order_id;
      }
      return `OR-${leadId.replace(/^LD-?/i, '')}`;
    }

    return (val && !isUuid && !isEdr) ? val : 'OR-PENDING';
  };

  // Event Category helper: ONLY the Event Type
  const getEventCategory = (ev: any, lead: any): string => {
    if (ev) {
      if (ev.event_type === 'Other') {
        return (ev.custom_event_type || 'Other').trim();
      }
      if (ev.event_type && ev.event_type.trim()) {
        return ev.event_type.trim();
      }
      if (ev.event_name && ev.event_name.trim()) {
        return ev.event_name.trim();
      }
    }
    if (lead?.event_type === 'Other') {
      return (lead.custom_event_type || 'Other').trim();
    }
    if (lead?.event_type && lead.event_type.trim()) {
      return lead.event_type.trim();
    }
    return 'Event';
  };

  // List of all operations staff members
  const operationsCrew = useMemo(() => {
    const list = [...(staff || [])];
    
    // Supplement with any users recorded as Operation Staff
    (users || []).forEach(u => {
      if (u.role === 'Operation Staff' || (u.role as string) === 'Operations Staff') {
        const alreadyExists = list.some(s => 
          (s.staff_id && s.staff_id === u.id) ||
          (s.email && u.email && s.email.toLowerCase() === u.email.toLowerCase()) ||
          (s.mobile && u.mobile && s.mobile === u.mobile) ||
          (s.name && u.name && s.name.toLowerCase() === u.name.toLowerCase())
        );
        if (!alreadyExists) {
          list.push({
            staff_id: u.id,
            name: u.name,
            email: u.email || '',
            mobile: u.mobile || '',
            role: 'Lead Photographer',
            department: 'Operations',
            status: u.active ? 'Active' : 'Inactive'
          } as any);
        }
      }
    });

    return list;
  }, [staff, users]);

  // Extract all events strictly assigned to a specific Operations Staff member
  const getAssignedEventsForStaff = (stName: string, stId?: string): StaffRosterEventItem[] => {
    if (!stName && !stId) return [];

    const normStaff = (stName || '').trim().toLowerCase();
    const cleanStaffId = String(stId || '').trim();

    const isStaffAssigned = (checkName?: string | null, checkId?: string | null): boolean => {
      const n = (checkName || '').trim().toLowerCase();
      if (normStaff && n && n === normStaff) return true;
      if (cleanStaffId && checkId && String(checkId).trim() === cleanStaffId) return true;
      return false;
    };

    // Filter staff assignments specifically belonging to this staff member
    const myAssignments = (staffAssignments || []).filter(sa => {
      if (!sa) return false;
      if (sa.assignment_status === 'Cancelled' || sa.assignment_status === 'Rejected' || sa.task_status === 'Cancelled') {
        return false;
      }
      return isStaffAssigned(sa.staff_name, sa.staff_id);
    });

    const eventsList: StaffRosterEventItem[] = [];
    const processedEventKeys = new Set<string>();

    // Map order/lead contexts relevant to this staff member
    const orderMap = new Map<string, { order?: any; lead?: any }>();

    // 1. From active staff assignments
    myAssignments.forEach(sa => {
      const oId = getCleanOrderId(sa.order_id, sa.lead_id);
      if (!orderMap.has(oId)) {
        const matchedOrd = (orders || []).find(o => o.order_id === sa.order_id || (sa.lead_id && o.lead_id === sa.lead_id));
        const matchedLead = (leads || []).find(l => l.lead_id === (sa.lead_id || matchedOrd?.lead_id));
        orderMap.set(oId, { order: matchedOrd, lead: matchedLead });
      }
    });

    // 2. From leads with events specifically assigned to this staff member
    (leads || []).forEach(l => {
      const evs = (l.events && Array.isArray(l.events)) ? l.events : [];
      const hasMyEvent = evs.some((ev: any) => {
        const assignedNames = ev.assigned_staff_names
          ? ev.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase())
          : [];
        const assignedIds = ev.assigned_staff_ids
          ? ev.assigned_staff_ids.split(',').map((id: string) => id.trim())
          : [];
        return assignedNames.some((n: string) => isStaffAssigned(n, null)) ||
               assignedIds.some((id: string) => isStaffAssigned(null, id));
      });
      if (hasMyEvent) {
        const matchedOrd = (orders || []).find(o => o.lead_id === l.lead_id);
        const oId = getCleanOrderId(matchedOrd?.order_id, l.lead_id);
        if (!orderMap.has(oId)) {
          orderMap.set(oId, { order: matchedOrd, lead: l });
        }
      }
    });

    // 3. From orders with events specifically assigned to this staff member
    (orders || []).forEach(o => {
      const evs = (o.events && Array.isArray(o.events)) ? o.events : [];
      const hasMyEvent = evs.some((ev: any) => {
        const assignedNames = ev.assigned_staff_names
          ? ev.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase())
          : [];
        const assignedIds = ev.assigned_staff_ids
          ? ev.assigned_staff_ids.split(',').map((id: string) => id.trim())
          : [];
        return assignedNames.some((n: string) => isStaffAssigned(n, null)) ||
               assignedIds.some((id: string) => isStaffAssigned(null, id));
      });
      if (hasMyEvent) {
        const oId = getCleanOrderId(o.order_id, o.lead_id);
        if (!orderMap.has(oId)) {
          const matchedLead = (leads || []).find(l => l.lead_id === o.lead_id);
          orderMap.set(oId, { order: o, lead: matchedLead });
        }
      }
    });

    // Helper to check history proofs for this exact event and staff
    const checkProofHistory = (orderId: string, leadId: string, eventId: string, asgnId: string) => {
      let hasStartProof = false;
      let hasEndProof = false;

      (leadEquipmentHistory || []).forEach((h: any) => {
        const matchOrder = (orderId && h.order_id === orderId) || (leadId && h.lead_id === leadId);
        if (!matchOrder) return;

        let parsed: any = {};
        if (h.remarks) {
          try {
            parsed = typeof h.remarks === 'string' ? JSON.parse(h.remarks) : h.remarks;
          } catch (_) {}
        }

        const recordStaff = (h.returned_by || parsed.staff_name || parsed.uploaded_by || '').trim().toLowerCase();
        const recordStaffId = String(parsed.staff_id || '').trim();
        const matchesStaff = (recordStaff && normStaff && recordStaff === normStaff) ||
                             (recordStaffId && cleanStaffId && recordStaffId === cleanStaffId);
        if (!matchesStaff) return;

        const hAsgnId = String(h.assignment_id || parsed.assignment_id || '').trim();
        if (hAsgnId && asgnId && hAsgnId !== asgnId) return;

        const hEvId = String(h.event_id || parsed.event_id || '').trim();
        if (hEvId && eventId && hEvId !== 'ev' && hEvId !== 'gen' && hEvId !== eventId) return;

        const proofType = (parsed.proof_type || h.proof_type || '').toLowerCase();
        const eqName = (h.equipment_name || '').toLowerCase();
        const eqStatus = (h.equipment_status || '').toLowerCase();

        if (proofType.includes('event start') || eqName.includes('event start')) {
          hasStartProof = true;
        }
        if (proofType.includes('event end') || proofType.includes('event complete') || 
            eqName.includes('event complete') || eqName.includes('event end') || 
            eqStatus.includes('event ended') || eqStatus.includes('completed')) {
          hasEndProof = true;
        }
      });

      // Also check local storage staff proofs
      try {
        const saved = localStorage.getItem('staff_equipment_proofs_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          const staffKey = `${orderId}_${eventId || 'ev'}_${normStaff}`;
          const asgnKey = asgnId ? `${orderId}_${asgnId}_${normStaff}` : '';
          const exactKey = asgnId ? `${orderId}_${eventId || 'ev'}_${asgnId}_${normStaff}` : '';

          [exactKey, staffKey, asgnKey].filter(Boolean).forEach(k => {
            const obj = parsed[k];
            if (obj) {
              if (obj.eventStartProofs && obj.eventStartProofs.length > 0) hasStartProof = true;
              if (obj.completeProofs && obj.completeProofs.length > 0) hasEndProof = true;
            }
          });
        }
      } catch (_) {}

      return { hasStartProof, hasEndProof };
    };

    // Helper to extract all proof images strictly belonging to this exact event and staff member
    const getEventProofs = (
      orderId: string,
      rawOrderId: string,
      leadId: string,
      eventId: string,
      eventName: string,
      eventCategory: string,
      sa: any,
      asgnId: string,
      isMultiEvent: boolean
    ): EventProofItem[] => {
      const proofsList: EventProofItem[] = [];
      const seenKeys = new Set<string>();

      const addProof = (stageName: string, stageKey: string, rawUrl: any, timestamp?: any, itemTitle?: string) => {
        if (!rawUrl) return;
        const cleanUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
        if (!cleanUrl || cleanUrl === '—' || cleanUrl === 'N/A' || cleanUrl === 'null' || cleanUrl === 'undefined') return;

        const resolved = resolveStorageUrl(cleanUrl) || cleanUrl;
        const dedupKey = `${stageKey}:::${resolved}`;
        if (seenKeys.has(dedupKey)) return;
        seenKeys.add(dedupKey);

        let updatedDate = '—';
        let updatedTime = '—';
        if (timestamp && timestamp !== '—' && timestamp !== 'N/A') {
          try {
            const d = formatDateDDMMYY(timestamp);
            const t = formatTime12Hour(timestamp);
            if (d) updatedDate = d;
            if (t) updatedTime = t;
          } catch (_) {
            updatedDate = String(timestamp);
          }
        }

        proofsList.push({
          id: `proof_${proofsList.length}_${resolved.slice(-10)}`,
          stageName,
          stageKey,
          imageUrl: resolved,
          updatedDate,
          updatedTime,
          rawTimestamp: timestamp ? String(timestamp) : undefined,
          itemTitle: itemTitle || stageName
        });
      };

      // 1. Direct assignment photo fields strictly from this staff member's assignment
      if (sa) {
        if (sa.event_start_photo) {
          addProof('Event Start', 'event_start', sa.event_start_photo, sa.event_start_time);
        }
        if (sa.equipment_received_photo) {
          addProof('Equipment Received', 'equipment_received', sa.equipment_received_photo, sa.equipment_received_time);
        }
        if (sa.event_end_photo) {
          addProof('Event Complete', 'event_complete', sa.event_end_photo, sa.event_end_time);
        }

        if (sa.proofs) {
          let parsedSa: any = null;
          try {
            parsedSa = typeof sa.proofs === 'string' ? JSON.parse(sa.proofs) : sa.proofs;
          } catch (_) {}
          if (parsedSa) {
            if (parsedSa.event_start_photo) {
              addProof('Event Start', 'event_start', parsedSa.event_start_photo, parsedSa.event_start_time || sa.event_start_time);
            }
            if (parsedSa.equipment_received_photo) {
              addProof('Equipment Received', 'equipment_received', parsedSa.equipment_received_photo, parsedSa.equipment_received_time || sa.equipment_received_time);
            }
            if (parsedSa.event_end_photo) {
              addProof('Event Complete', 'event_complete', parsedSa.event_end_photo, parsedSa.event_end_time || sa.event_end_time);
            }
          }
        }

        if (sa.proof_photos && Array.isArray(sa.proof_photos)) {
          sa.proof_photos.forEach((p: any) => {
            const pUrl = p?.photoUrl || p?.url;
            if (!pUrl) return;
            const pName = (p?.equipmentName || p?.title || p?.stage || '').toLowerCase();
            let sName = 'Equipment Received';
            let sKey = 'equipment_received';
            if (pName.includes('start')) {
              sName = 'Event Start';
              sKey = 'event_start';
            } else if (pName.includes('complete') || pName.includes('end')) {
              sName = 'Event Complete';
              sKey = 'event_complete';
            } else if (pName.includes('handover') || pName.includes('footage')) {
              sName = 'Equipment / Footage Handover';
              sKey = 'footage_handover';
            }
            addProof(sName, sKey, pUrl, p?.capturedAt || p?.uploadedAt, p?.equipmentName || sName);
          });
        }
      }

      // 2. leadEquipmentHistory matching strictly by Order -> Event -> Staff -> Upload Section
      const curEvId = String(eventId || '').trim().toLowerCase();
      const curAsgnId = String(asgnId || '').trim();
      const curEvName = (eventName || '').trim().toLowerCase();
      const curEvCat = (eventCategory || '').trim().toLowerCase();
      const isGenericEv = !curEvId || curEvId === 'ev' || curEvId === 'gen';

      (leadEquipmentHistory || []).forEach((h: any) => {
        const matchOrder = (orderId && h.order_id === orderId) ||
                           (rawOrderId && h.order_id === rawOrderId) ||
                           (leadId && h.lead_id === leadId) ||
                           (leadId && h.order_id === leadId);
        if (!matchOrder) return;

        let parsed: any = {};
        if (h.remarks) {
          try {
            parsed = typeof h.remarks === 'string' ? JSON.parse(h.remarks) : h.remarks;
          } catch (_) {}
        }

        // Exact staff match (must strictly belong to this operations staff member)
        const recordStaff = (h.returned_by || parsed.staff_name || parsed.uploaded_by || '').trim().toLowerCase();
        const recordStaffId = String(parsed.staff_id || '').trim();
        const matchesStaff = (recordStaff && normStaff && recordStaff === normStaff) ||
                             (recordStaffId && cleanStaffId && recordStaffId === cleanStaffId);
        if (!matchesStaff) return;

        // Assignment match
        const hAsgnId = String(h.assignment_id || parsed.assignment_id || '').trim();
        if (hAsgnId && curAsgnId && hAsgnId !== curAsgnId) return;

        // Event ID match
        const hEvId = String(h.event_id || parsed.event_id || '').trim().toLowerCase();
        const isGenericHEv = !hEvId || hEvId === 'ev' || hEvId === 'gen';
        if (!isGenericEv && !isGenericHEv && curEvId && hEvId !== curEvId) return;

        // Event Name match
        const hEvName = (h.event_name || parsed.event_name || '').trim().toLowerCase();
        if (hEvName && curEvName && hEvName !== curEvName && hEvName !== curEvCat) return;

        if (isMultiEvent) {
          const hasSpecificMatch = (hAsgnId && curAsgnId && hAsgnId === curAsgnId) ||
                                   (!isGenericEv && !isGenericHEv && hEvId === curEvId) ||
                                   (hEvName && (hEvName === curEvName || hEvName === curEvCat));
          if (!hasSpecificMatch) return;
        }

        const photoUrl = parsed.photo_url || (h as any).photo_url || (h as any).proof_photo || '';
        if (!photoUrl) return;

        const recTime = parsed.uploaded_at || h.returned_at || h.created_at || (h as any).updated_at || null;
        const proofTypeStr = (parsed.proof_type || h.proof_type || '').toLowerCase();
        const eqNameStr = (h.equipment_name || '').toLowerCase();
        const eqStatusStr = (h.equipment_status || '').toLowerCase();
        const assetIdStr = (parsed.asset_id || h.asset_id || '').toLowerCase();

        if (proofTypeStr.includes('start') || eqNameStr.includes('start') || eqStatusStr.includes('start') || assetIdStr.includes('start')) {
          addProof('Event Start', 'event_start', photoUrl, recTime);
        } else if (proofTypeStr.includes('complete') || proofTypeStr.includes('end') || eqNameStr.includes('complete') || eqNameStr.includes('end') || eqStatusStr.includes('complete') || eqStatusStr.includes('ended')) {
          addProof('Event Complete', 'event_complete', photoUrl, recTime);
        } else if (proofTypeStr.includes('handover') || eqStatusStr.includes('handover') || proofTypeStr.includes('footage')) {
          addProof('Equipment / Footage Handover', 'footage_handover', photoUrl, recTime, h.equipment_name || 'Equipment Handover');
        } else {
          const itemTitle = h.equipment_name || parsed.proof_type || 'Equipment Received';
          addProof('Equipment Received', 'equipment_received', photoUrl, recTime, itemTitle);
        }
      });

      // 3. LocalStorage fallback
      try {
        const saved = localStorage.getItem('staff_equipment_proofs_v2');
        if (saved) {
          const parsedProofs = JSON.parse(saved);
          const exactKey = curAsgnId ? `${orderId}_${curEvId || 'ev'}_${curAsgnId}_${normStaff}` : '';
          const asgnKey = curAsgnId ? `${orderId}_${curAsgnId}_${normStaff}` : '';
          const evKey = `${orderId}_${curEvId || 'ev'}_${normStaff}`;
          const generalKey = !isMultiEvent ? `${orderId}_${normStaff}` : '';

          [exactKey, asgnKey, evKey, generalKey].filter(Boolean).forEach(k => {
            const localObj = parsedProofs[k];
            if (localObj) {
              (localObj.eventStartProofs || []).forEach((p: any) => {
                if (p?.photoUrl) {
                  const pName = (p.equipmentName || '').toLowerCase();
                  if (pName.includes('start')) {
                    addProof('Event Start', 'event_start', p.photoUrl, p.capturedAt, 'Event Start');
                  } else {
                    addProof('Equipment Received', 'equipment_received', p.photoUrl, p.capturedAt, p.equipmentName || 'Equipment Received');
                  }
                }
              });
              (localObj.equipmentReceivedProofs || []).forEach((p: any) => {
                if (p?.photoUrl) {
                  addProof('Equipment Received', 'equipment_received', p.photoUrl, p.capturedAt, p.equipmentName || 'Equipment Received');
                }
              });
              (localObj.completeProofs || []).forEach((p: any) => {
                if (p?.photoUrl) {
                  addProof('Event Complete', 'event_complete', p.photoUrl, p.capturedAt, 'Event Complete');
                }
              });
              (localObj.equipmentHandoverProofs || []).forEach((p: any) => {
                if (p?.photoUrl) {
                  addProof('Equipment / Footage Handover', 'footage_handover', p.photoUrl, p.capturedAt, p.equipmentName || 'Equipment Handover');
                }
              });
            }
          });
        }
      } catch (_) {}

      return proofsList;
    };

    // Iterate over each order to find exact assigned events
    orderMap.forEach(({ order, lead }, orderId) => {
      const leadId = lead?.lead_id || order?.lead_id || '';
      const orderEvents: any[] = (lead?.events && Array.isArray(lead.events) && lead.events.length > 0)
        ? lead.events
        : (order?.events && Array.isArray(order.events) && order.events.length > 0)
          ? order.events
          : [];

      if (orderEvents.length > 0) {
        orderEvents.forEach((ev: any, evIdx: number) => {
          const eventId = String(ev.id || ev.event_id || `evt_${evIdx}`);
          const evName = (ev.event_name || ev.custom_event_name || '').trim();
          const evType = (ev.event_type || ev.custom_event_type || '').trim();

          // 1. Check exact assignment in myAssignments
          const sa = myAssignments.find(s => {
            if (s.order_id !== orderId && s.lead_id !== leadId) return false;

            if (s.event_id) {
              return String(s.event_id).trim().toLowerCase() === eventId.toLowerCase();
            }

            if (orderEvents.length === 1) {
              return true;
            }

            if (s.event_name && (evName || evType)) {
              const sEv = s.event_name.trim().toLowerCase();
              return (evName && sEv === evName.toLowerCase()) || 
                     (ev.custom_event_name && sEv === ev.custom_event_name.trim().toLowerCase()) ||
                     (evType && sEv === evType.toLowerCase());
            }

            return false;
          });

          // 2. Check direct event assignment arrays
          const assignedNames = ev.assigned_staff_names
            ? ev.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase())
            : [];
          const assignedIds = ev.assigned_staff_ids
            ? ev.assigned_staff_ids.split(',').map((id: string) => id.trim())
            : [];
          const isDirectlyAssigned = assignedNames.some((n: string) => isStaffAssigned(n, null)) ||
                                     assignedIds.some((id: string) => isStaffAssigned(null, id));

          // Strict assignment check: must be assigned to this staff member
          if (!sa && !isDirectlyAssigned) {
            return;
          }

          const uniqueKey = `${orderId}_${eventId}_${sa?.assignment_id || evIdx}`;
          if (processedEventKeys.has(uniqueKey)) return;
          processedEventKeys.add(uniqueKey);

          const customerName = (lead?.customer_name || order?.customer_name || lead?.client_name || 'Client').trim();
          const customerMobile = (lead?.mobile || order?.mobile || '').trim() || '—';
          const eventCategory = getEventCategory(ev, lead);

          const rawReportingDate = (
            ev.Reporting_date || 
            ev.reporting_date || 
            (sa as any)?.Reporting_date || 
            (sa as any)?.reporting_date || 
            lead?.Reporting_date || 
            lead?.reporting_date || 
            ev.event_date || 
            sa?.event_date || 
            lead?.event_date || 
            ''
          ).trim();
          const reportingDate = rawReportingDate ? (formatDateDDMMYY(rawReportingDate) || rawReportingDate) : '—';

          const rawReportingTime = (
            ev.reporting_time || 
            ev.Reporting_time || 
            (sa as any)?.reporting_time || 
            (sa as any)?.Reporting_time || 
            lead?.reporting_time || 
            ev.event_start_time || 
            ev.event_time || 
            ''
          ).trim();
          const reportingTime = rawReportingTime ? (formatTime12Hour(rawReportingTime) || rawReportingTime) : '—';

          const asgnId = sa?.assignment_id || '';
          const { hasStartProof, hasEndProof } = checkProofHistory(orderId, leadId, eventId, asgnId);

          const rawStatus = (sa?.task_status || ev?.status || 'Assigned').trim();
          
          const isCompleted = Boolean(
            sa?.event_end_photo || 
            sa?.event_end_time || 
            hasEndProof ||
            ['completed', 'event complete', 'event completed', 'closed', 'order closed', 'order close'].includes(rawStatus.toLowerCase()) ||
            ['completed', 'event complete', 'event completed', 'closed', 'order closed', 'order close'].includes(String(ev?.status || '').toLowerCase())
          );

          const isStarted = !isCompleted && Boolean(
            sa?.event_start_photo || 
            sa?.event_start_time || 
            hasStartProof ||
            sa?.raw_footage_link ||
            isOperationsAssignmentStarted(sa) ||
            ['event started', 'in progress', 'raw footage received', 'footage handover'].includes(rawStatus.toLowerCase()) ||
            ['event started', 'in progress'].includes(String(ev?.status || '').toLowerCase())
          );

          let currentStatus = rawStatus;
          if (isCompleted) {
            currentStatus = 'Event Completed';
          } else if (isStarted) {
            currentStatus = 'Event Started';
          } else {
            currentStatus = 'Assigned';
          }

          const proofs = getEventProofs(
            orderId,
            order?.order_id || lead?.order_id || '',
            leadId,
            eventId,
            evName,
            eventCategory,
            sa,
            asgnId,
            orderEvents.length > 1
          );

          const eventDateCal = toCalendarDateString(rawReportingDate) || toCalendarDateString(reportingDate) || null;
          const eventEndDateCal = toCalendarDateString(ev.Event_End_Date || ev.event_end_date || (sa as any)?.Event_End_Date || (sa as any)?.event_end_date) || null;

          eventsList.push({
            key: uniqueKey,
            orderId,
            customerName,
            customerMobile,
            eventCategory,
            reportingDate,
            reportingTime,
            currentStatus,
            isStarted,
            isCompleted,
            staffName: stName,
            staffId: stId,
            eventDateCal,
            eventEndDateCal,
            proofs
          });
        });
      } else {
        // Single event order
        const sa = myAssignments.find(s => s.order_id === orderId || (leadId && s.lead_id === leadId));
        if (sa) {
          const eventId = sa.event_id || 'ev';
          const uniqueKey = `${orderId}_${eventId}_${sa.assignment_id || 'single'}`;
          if (processedEventKeys.has(uniqueKey)) return;
          processedEventKeys.add(uniqueKey);

          const customerName = (lead?.customer_name || order?.customer_name || lead?.client_name || 'Client').trim();
          const customerMobile = (lead?.mobile || order?.mobile || '').trim() || '—';
          const eventCategory = getEventCategory(null, lead);

          const rawReportingDate = (
            (sa as any)?.Reporting_date || 
            (sa as any)?.reporting_date || 
            lead?.Reporting_date || 
            lead?.reporting_date || 
            sa.event_date || 
            lead?.event_date || 
            ''
          ).trim();
          const reportingDate = rawReportingDate ? (formatDateDDMMYY(rawReportingDate) || rawReportingDate) : '—';

          const rawReportingTime = (
            (sa as any)?.reporting_time || 
            (sa as any)?.Reporting_time || 
            lead?.reporting_time || 
            lead?.event_time || 
            ''
          ).trim();
          const reportingTime = rawReportingTime ? (formatTime12Hour(rawReportingTime) || rawReportingTime) : '—';

          const asgnId = sa.assignment_id || '';
          const { hasStartProof, hasEndProof } = checkProofHistory(orderId, leadId, eventId, asgnId);

          const rawStatus = (sa.task_status || lead?.status || 'Assigned').trim();
          const isCompleted = Boolean(
            sa.event_end_photo || 
            sa.event_end_time || 
            hasEndProof ||
            ['completed', 'event complete', 'event completed', 'closed', 'order closed', 'order close'].includes(rawStatus.toLowerCase())
          );

          const isStarted = !isCompleted && Boolean(
            sa.event_start_photo || 
            sa.event_start_time || 
            hasStartProof ||
            sa.raw_footage_link ||
            isOperationsAssignmentStarted(sa) ||
            ['event started', 'in progress', 'raw footage received', 'footage handover'].includes(rawStatus.toLowerCase())
          );

          let currentStatus = rawStatus;
          if (isCompleted) {
            currentStatus = 'Event Completed';
          } else if (isStarted) {
            currentStatus = 'Event Started';
          } else {
            currentStatus = 'Assigned';
          }

          const proofs = getEventProofs(
            orderId,
            order?.order_id || lead?.order_id || '',
            leadId,
            eventId,
            lead?.event_type || order?.event_type || '',
            eventCategory,
            sa,
            asgnId,
            false
          );

          const eventDateCal = toCalendarDateString(rawReportingDate) || toCalendarDateString(reportingDate) || null;
          const eventEndDateCal = toCalendarDateString((sa as any)?.Event_End_Date || (sa as any)?.event_end_date || lead?.Event_End_Date || lead?.event_end_date) || null;

          eventsList.push({
            key: uniqueKey,
            orderId,
            customerName,
            customerMobile,
            eventCategory,
            reportingDate,
            reportingTime,
            currentStatus,
            isStarted,
            isCompleted,
            staffName: stName,
            staffId: stId,
            eventDateCal,
            eventEndDateCal,
            proofs
          });
        }
      }
    });

    // Capture standalone myAssignments not yet added
    myAssignments.forEach((sa, saIdx) => {
      const oId = getCleanOrderId(sa.order_id, sa.lead_id);
      const evId = sa.event_id || `asgn_${saIdx}`;
      const uniqueKey = `${oId}_${evId}_${sa.assignment_id || saIdx}`;
      if (processedEventKeys.has(uniqueKey)) return;
      if (Array.from(processedEventKeys).some(k => sa.assignment_id && k.includes(sa.assignment_id))) return;
      processedEventKeys.add(uniqueKey);

      const matchedOrd = (orders || []).find(o => o.order_id === sa.order_id || (sa.lead_id && o.lead_id === sa.lead_id));
      const matchedLead = (leads || []).find(l => l.lead_id === (sa.lead_id || matchedOrd?.lead_id));
      const leadId = matchedLead?.lead_id || matchedOrd?.lead_id || '';

      const customerName = (matchedLead?.customer_name || matchedOrd?.customer_name || matchedLead?.client_name || 'Client').trim();
      const customerMobile = (matchedLead?.mobile || matchedOrd?.mobile || '').trim() || '—';
      const eventCategory = (sa.event_name || matchedLead?.event_type || matchedOrd?.event_type || 'Event').trim();

      const rawReportingDate = (
        (sa as any)?.Reporting_date || 
        (sa as any)?.reporting_date || 
        matchedLead?.Reporting_date || 
        matchedLead?.reporting_date || 
        sa.event_date || 
        matchedLead?.event_date || 
        ''
      ).trim();
      const reportingDate = rawReportingDate ? (formatDateDDMMYY(rawReportingDate) || rawReportingDate) : '—';

      const rawReportingTime = (
        (sa as any)?.reporting_time || 
        (sa as any)?.Reporting_time || 
        matchedLead?.reporting_time || 
        matchedLead?.event_time || 
        ''
      ).trim();
      const reportingTime = rawReportingTime ? (formatTime12Hour(rawReportingTime) || rawReportingTime) : '—';

      const asgnId = sa.assignment_id || '';
      const { hasStartProof, hasEndProof } = checkProofHistory(oId, leadId, evId, asgnId);

      const rawStatus = (sa.task_status || 'Assigned').trim();
      const isCompleted = Boolean(
        sa.event_end_photo || 
        sa.event_end_time || 
        hasEndProof ||
        ['completed', 'event complete', 'event completed', 'closed', 'order closed', 'order close'].includes(rawStatus.toLowerCase())
      );

      const isStarted = !isCompleted && Boolean(
        sa.event_start_photo || 
        sa.event_start_time || 
        hasStartProof ||
        sa.raw_footage_link ||
        isOperationsAssignmentStarted(sa) ||
        ['event started', 'in progress', 'raw footage received', 'footage handover'].includes(rawStatus.toLowerCase())
      );

      let currentStatus = rawStatus;
      if (isCompleted) {
        currentStatus = 'Event Completed';
      } else if (isStarted) {
        currentStatus = 'Event Started';
      } else {
        currentStatus = 'Assigned';
      }

      const proofs = getEventProofs(
        oId,
        sa.order_id || '',
        leadId,
        evId,
        sa.event_name || '',
        eventCategory,
        sa,
        asgnId,
        false
      );

      const eventDateCal = toCalendarDateString(rawReportingDate) || toCalendarDateString(reportingDate) || null;
      const eventEndDateCal = toCalendarDateString((sa as any)?.Event_End_Date || (sa as any)?.event_end_date || matchedLead?.Event_End_Date || matchedLead?.event_end_date) || null;

      eventsList.push({
        key: uniqueKey,
        orderId: oId,
        customerName,
        customerMobile,
        eventCategory,
        reportingDate,
        reportingTime,
        currentStatus,
        isStarted,
        isCompleted,
        staffName: stName,
        staffId: stId,
        eventDateCal,
        eventEndDateCal,
        proofs
      });
    });

    return eventsList;
  };

  // Pre-calculate roster summary for each operations crew member (filtered by activeDateRange)
  const rosterData = useMemo(() => {
    return operationsCrew.map(st => {
      const assignedEvents = getAssignedEventsForStaff(st.name, st.staff_id);

      const filteredEvents = activeDateRange
        ? assignedEvents.filter(e => isEventWithinRange(e.eventDateCal, e.eventEndDateCal, activeDateRange))
        : assignedEvents;

      const totalAssigned = filteredEvents.length;
      const totalStarted = filteredEvents.filter(e => e.isStarted).length;
      const totalCompleted = filteredEvents.filter(e => e.isCompleted).length;

      return {
        staff: st,
        assignedEvents: filteredEvents,
        totalAssigned,
        totalStarted,
        totalCompleted
      };
    });
  }, [operationsCrew, staffAssignments, leads, orders, leadEquipmentHistory, activeDateRange]);

  // Filter main roster table based on search query
  const filteredRoster = useMemo(() => {
    if (!mainSearchQuery.trim()) return rosterData;
    const q = mainSearchQuery.toLowerCase();
    return rosterData.filter(item => 
      item.staff.name.toLowerCase().includes(q) ||
      (item.staff.staff_id && item.staff.staff_id.toLowerCase().includes(q)) ||
      (item.staff.role && item.staff.role.toLowerCase().includes(q))
    );
  }, [rosterData, mainSearchQuery]);

  // Overall totals across entire crew
  const overallTotals = useMemo(() => {
    return rosterData.reduce(
      (acc, curr) => ({
        crewCount: acc.crewCount + 1,
        totalAssigned: acc.totalAssigned + curr.totalAssigned,
        totalStarted: acc.totalStarted + curr.totalStarted,
        totalCompleted: acc.totalCompleted + curr.totalCompleted
      }),
      { crewCount: 0, totalAssigned: 0, totalStarted: 0, totalCompleted: 0 }
    );
  }, [rosterData]);

  // Events for the selected staff member in the detail table view
  const selectedStaffEvents = useMemo(() => {
    if (!selectedStaff) return [];
    const staffRow = rosterData.find(r => 
      (r.staff.staff_id && selectedStaff.staff_id && r.staff.staff_id === selectedStaff.staff_id) ||
      r.staff.name.toLowerCase() === selectedStaff.name.toLowerCase()
    );
    if (!staffRow) return [];

    let events = staffRow.assignedEvents;
    if (activeDetailType === 'started') {
      events = events.filter(e => e.isStarted);
    } else if (activeDetailType === 'completed') {
      events = events.filter(e => e.isCompleted);
    }

    if (detailSearchQuery.trim()) {
      const q = detailSearchQuery.toLowerCase();
      events = events.filter(e => 
        e.orderId.toLowerCase().includes(q) ||
        e.customerName.toLowerCase().includes(q) ||
        e.customerMobile.toLowerCase().includes(q) ||
        e.eventCategory.toLowerCase().includes(q) ||
        e.currentStatus.toLowerCase().includes(q) ||
        e.reportingDate.toLowerCase().includes(q)
      );
    }

    return events;
  }, [selectedStaff, rosterData, activeDetailType, detailSearchQuery]);

  const handleOpenDetail = (st: { staff_id: string; name: string; role?: string }, viewType: DetailViewType) => {
    setSelectedStaff(st);
    setActiveDetailType(viewType);
    setDetailSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Detail View Mode */}
      {selectedStaff ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Detail View Top Header & Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold rounded-lg border border-zinc-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Staff Roster</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white font-sans">{selectedStaff.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                    {selectedStaff.role || 'Operations Staff'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                  Showing event records strictly assigned to this staff member
                </p>
              </div>
            </div>

            {/* Quick Filter Switcher between Assigned / Started / Completed */}
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveDetailType('assigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeDetailType === 'assigned'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                Total Assigned
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailType('started')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeDetailType === 'started'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                Total Started
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailType('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeDetailType === 'completed'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                Total Completed
              </button>
            </div>
          </div>

          {/* Search Bar & Result Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/30 p-3 rounded-xl border border-zinc-850">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={detailSearchQuery}
                onChange={(e) => setDetailSearchQuery(e.target.value)}
                placeholder="Search by Order ID, Client, Event, Status..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2 flex-wrap">
              {activeFilterType && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                  Period: {activeFilterType}
                </span>
              )}
              <span className="font-bold text-zinc-200">{selectedStaffEvents.length}</span>
              <span>{activeDetailType === 'assigned' ? 'Assigned' : activeDetailType === 'started' ? 'Started' : 'Completed'} Events</span>
            </div>
          </div>

          {/* Detail Table */}
          <div className="overflow-x-auto text-xs bg-zinc-950/40 rounded-xl border border-zinc-850 shadow-xl">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="border-b border-zinc-850 text-[10px] font-mono uppercase text-zinc-400 bg-zinc-950/80">
                  <th className="p-3.5 font-bold font-mono text-[10px] uppercase text-zinc-400">Order ID</th>
                  <th className="p-3.5 font-bold">Customer Name</th>
                  <th className="p-3.5 font-bold">Customer Mobile Number</th>
                  <th className="p-3.5 font-bold">Event Category</th>
                  <th className="p-3.5 font-bold">Reporting Date</th>
                  <th className="p-3.5 font-bold">Reporting Time</th>
                  <th className="p-3.5 font-bold">Current Status</th>
                  <th className="p-3.5 font-bold text-center">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                {selectedStaffEvents.length > 0 ? (
                  selectedStaffEvents.map((evItem) => {
                    const isComp = evItem.isCompleted || evItem.currentStatus.toLowerCase().includes('complete');
                    const isStart = !isComp && (evItem.isStarted || evItem.currentStatus.toLowerCase().includes('start') || evItem.currentStatus.toLowerCase().includes('progress'));

                    return (
                      <tr key={evItem.key} className="hover:bg-zinc-900/20 transition-all">
                        {/* 1. Order ID (ONLY clean Order ID) */}
                        <td className="p-3.5 font-mono text-xs font-bold text-amber-400">
                          {evItem.orderId}
                        </td>

                        {/* 2. Customer Name */}
                        <td className="p-3.5 font-semibold text-zinc-100">
                          {evItem.customerName}
                        </td>

                        {/* 3. Customer Mobile Number */}
                        <td className="p-3.5 font-mono text-xs text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{evItem.customerMobile}</span>
                          </div>
                        </td>

                        {/* 4. Event Category (ONLY Event Type) */}
                        <td className="p-3.5 font-medium text-zinc-200">
                          <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[11px] font-mono text-zinc-200">
                            {evItem.eventCategory}
                          </span>
                        </td>

                        {/* 5. Reporting Date */}
                        <td className="p-3.5 font-mono text-xs text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{evItem.reportingDate}</span>
                          </div>
                        </td>

                        {/* 6. Reporting Time */}
                        <td className="p-3.5 font-mono text-xs text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{evItem.reportingTime}</span>
                          </div>
                        </td>

                        {/* 7. Current Status */}
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                            isComp
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isStart
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isComp ? 'bg-emerald-400' : isStart ? 'bg-blue-400' : 'bg-amber-400'
                            }`} />
                            <span>{evItem.currentStatus}</span>
                          </span>
                        </td>

                        {/* 8. Proof Column: compact View Proof button */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedProofEvent(evItem)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 border border-zinc-750 hover:border-amber-500/50 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                            title="Click to view all proof images uploaded for this event"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Proof</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500 font-mono text-xs">
                      <div className="max-w-xs mx-auto space-y-2">
                        <ClipboardList className="w-8 h-8 text-zinc-600 mx-auto" />
                        <p className="font-bold text-zinc-400">No events found for this selection</p>
                        <p className="text-[11px] text-zinc-600">
                          {activeDetailType === 'assigned'
                            ? 'No events have been assigned to this staff member yet.'
                            : activeDetailType === 'started'
                              ? 'No assigned events have been started by this staff member yet.'
                              : 'No assigned events have been marked as completed by this staff member yet.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Main Staff Roster Table Mode */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">TOTAL CREW</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-zinc-100">{overallTotals.crewCount}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Active field operatives</div>
            </div>

            <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">EVENTS ASSIGNED</span>
                <ClipboardList className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-amber-400">{overallTotals.totalAssigned}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Total across crew roster</div>
            </div>

            <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">EVENTS STARTED</span>
                <PlayCircle className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-blue-400">{overallTotals.totalStarted}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Currently in progress</div>
            </div>

            <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">EVENTS COMPLETED</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-emerald-400">{overallTotals.totalCompleted}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Shoots wrapped up & verified</div>
            </div>
          </div>

          {/* Section Header & Search / Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-850">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-black uppercase text-zinc-300">
                STAFF ROSTER OVERVIEW ({filteredRoster.length} STAFF MEMBERS)
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={mainSearchQuery}
                  onChange={(e) => setMainSearchQuery(e.target.value)}
                  placeholder="Search staff by name or code..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* ONE Filter Button in Staff Roster Section */}
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`inline-flex items-center justify-between sm:justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer whitespace-nowrap shadow-sm w-full sm:w-auto ${
                    activeFilterType
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                      : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                  title="Filter staff roster by date"
                >
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeFilterType ? `Filter: ${activeFilterType}` : 'Filter'}</span>
                  </div>
                  {activeFilterType && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilterType(null);
                        setSelectedOption(null);
                        setCustomStartDate('');
                        setCustomEndDate('');
                        setIsFilterOpen(false);
                      }}
                      className="p-0.5 rounded hover:bg-amber-500/30 text-amber-400 hover:text-amber-200 cursor-pointer ml-0.5"
                      title="Clear filter"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>

                {/* Filter Dropdown Popup (Compact & Mobile-Responsive) */}
                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl p-3 sm:p-3.5 z-40 text-xs font-mono space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex items-center gap-1.5 text-zinc-200 font-bold font-mono text-xs">
                        <Filter className="w-3.5 h-3.5 text-amber-400" />
                        <span>Filter Staff Roster</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(false)}
                        className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Close (Esc)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Filter Options (1. This Month, 2. Last Month, 3. Last 3 Months, 4. Custom Date Range) */}
                    <div className="space-y-1">
                      {(['This Month', 'Last Month', 'Last 3 Months', 'Custom Date Range'] as DateFilterOption[]).map((opt) => {
                        const isSelected = activeFilterType === opt || selectedOption === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setSelectedOption(opt);
                              if (opt !== 'Custom Date Range') {
                                setActiveFilterType(opt);
                                setIsFilterOpen(false);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold'
                                : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Date Range Fields */}
                    {selectedOption === 'Custom Date Range' && (
                      <div className="space-y-2.5 pt-2.5 border-t border-zinc-800">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Start Date</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold">End Date</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (customStartDate || customEndDate) {
                              setActiveFilterType('Custom Date Range');
                              setIsFilterOpen(false);
                            }
                          }}
                          disabled={!customStartDate && !customEndDate}
                          className="w-full py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                          Apply Custom Range
                        </button>
                      </div>
                    )}

                    {/* Reset / Clear Filter Option */}
                    {activeFilterType && (
                      <div className="pt-2 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFilterType(null);
                            setSelectedOption(null);
                            setCustomStartDate('');
                            setCustomEndDate('');
                            setIsFilterOpen(false);
                          }}
                          className="w-full py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Reset / Clear Filter
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Staff Roster Table (Exact 5 Columns) */}
          <div className="overflow-x-auto text-xs bg-zinc-950/40 rounded-xl border border-zinc-850 shadow-xl">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="border-b border-zinc-850 text-[10px] font-mono uppercase text-zinc-400 bg-zinc-950/80">
                  <th className="p-3 font-bold font-mono text-[10px] uppercase text-zinc-400 text-center w-16 min-w-[64px] whitespace-nowrap">
                    S.No
                  </th>
                  <th className="p-3.5 font-bold">Staff Name</th>
                  <th className="p-3.5 font-bold text-center">Total Events Assigned</th>
                  <th className="p-3.5 font-bold text-center">Total Events Started</th>
                  <th className="p-3.5 font-bold text-center">Total Events Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                {filteredRoster.length > 0 ? (
                  filteredRoster.map((item, idx) => {
                    const st = item.staff;
                    return (
                      <tr key={st.staff_id || idx} className="hover:bg-zinc-900/20 transition-all">
                        {/* 1. S.No */}
                        <td className="p-3 font-mono text-zinc-400 text-center text-xs font-bold w-16 min-w-[64px] whitespace-nowrap">
                          {idx + 1}
                        </td>

                        {/* 2. Staff Name */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-bold text-zinc-100 font-sans text-xs">
                                {st.name}
                              </div>
                              <div className="font-mono text-[10px] text-zinc-500">
                                {st.role || 'Operations Crew'} • {st.staff_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Total Events Assigned (Clickable) */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail({ staff_id: st.staff_id, name: st.name, role: st.role }, 'assigned')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer bg-zinc-900/90 hover:bg-amber-500/10 border-zinc-800 hover:border-amber-500/40 text-zinc-200 hover:text-amber-400 group"
                            title={`Click to view all ${item.totalAssigned} assigned events for ${st.name}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
                            <span>{item.totalAssigned}</span>
                            <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                          </button>
                        </td>

                        {/* 4. Total Events Started (Clickable) */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail({ staff_id: st.staff_id, name: st.name, role: st.role }, 'started')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer bg-zinc-900/90 hover:bg-blue-500/10 border-zinc-800 hover:border-blue-500/40 text-zinc-200 hover:text-blue-400 group"
                            title={`Click to view in-progress events (${item.totalStarted}) for ${st.name}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:scale-125 transition-transform" />
                            <span>{item.totalStarted}</span>
                            <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                          </button>
                        </td>

                        {/* 5. Total Events Completed (Clickable) */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail({ staff_id: st.staff_id, name: st.name, role: st.role }, 'completed')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer bg-zinc-900/90 hover:bg-emerald-500/10 border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-400 group"
                            title={`Click to view all ${item.totalCompleted} completed events for ${st.name}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
                            <span>{item.totalCompleted}</span>
                            <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-xs">
                      No staff members match your search query
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW PROOF POPUP MODAL FOR SELECTED EVENT */}
      {selectedProofEvent && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setSelectedProofEvent(null)}
        >
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/90">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      ORDER: <span className="text-amber-400 font-mono">{selectedProofEvent.orderId}</span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200 font-mono text-[11px] font-bold border border-zinc-700">
                      {selectedProofEvent.eventCategory}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-mono text-[11px] font-bold border border-blue-500/20">
                      {selectedProofEvent.proofs.length} {selectedProofEvent.proofs.length === 1 ? 'Proof Image' : 'Proof Images'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-400 mt-1 font-mono">
                    <span>Client: <strong className="text-zinc-200">{selectedProofEvent.customerName}</strong></span>
                    {selectedProofEvent.customerMobile && selectedProofEvent.customerMobile !== '—' && (
                      <span className="text-emerald-400">📞 {selectedProofEvent.customerMobile}</span>
                    )}
                    {selectedProofEvent.staffName && (
                      <span className="text-zinc-300">Staff: <strong className="text-amber-300">{selectedProofEvent.staffName}</strong></span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProofEvent(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 cursor-pointer transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-2.5 bg-zinc-950/60 border-b border-zinc-850 text-xs font-mono">
              <div className="flex items-center gap-2 text-zinc-300">
                <span>Event: <strong className="text-amber-400">{selectedProofEvent.eventCategory}</strong></span>
                <span>•</span>
                <span>📅 {selectedProofEvent.reportingDate} • ⏰ {selectedProofEvent.reportingTime}</span>
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 text-zinc-300">
                  Status: {selectedProofEvent.currentStatus}
                </span>
              </div>
            </div>

            {/* Scrollable Proof Images Container */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {selectedProofEvent.proofs.length === 0 ? (
                /* Empty state: No Proof Uploaded */
                <div className="py-16 px-6 text-center flex flex-col items-center justify-center space-y-3 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl my-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold font-mono text-zinc-200 uppercase tracking-wider">
                      No Proof Uploaded
                    </h4>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      No verification photos or proof documents have been uploaded for this specific event yet.
                    </p>
                  </div>
                </div>
              ) : (
                /* Grouped Proof Images by Section / Stage */
                (() => {
                  const stagePriority: Record<string, number> = {
                    'event_start': 1,
                    'equipment_received': 2,
                    'event_complete': 3,
                    'footage_handover': 4,
                  };

                  const groupsMap = new Map<string, { stageName: string; stageKey: string; items: EventProofItem[] }>();

                  selectedProofEvent.proofs.forEach(p => {
                    if (!groupsMap.has(p.stageKey)) {
                      groupsMap.set(p.stageKey, {
                        stageName: p.stageName,
                        stageKey: p.stageKey,
                        items: []
                      });
                    }
                    groupsMap.get(p.stageKey)!.items.push(p);
                  });

                  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
                    const prioA = stagePriority[a.stageKey] || 99;
                    const prioB = stagePriority[b.stageKey] || 99;
                    return prioA - prioB;
                  });

                  return (
                    <div className="space-y-6">
                      {sortedGroups.map((group) => (
                        <div key={group.stageKey} className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80 shadow-md">
                          {/* Section / Stage Header */}
                          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              <h4 className="text-sm font-mono font-bold text-zinc-100 uppercase tracking-wide">
                                {group.stageName}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-750">
                                {group.items.length} {group.items.length === 1 ? 'Image' : 'Images'}
                              </span>
                            </div>
                          </div>

                          {/* Grid of Proofs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
                            {group.items.map((proof, idx) => {
                              const updatedDisplay = proof.updatedDate !== '—' && proof.updatedTime !== '—'
                                ? `${proof.updatedDate}, ${proof.updatedTime}`
                                : proof.updatedDate !== '—'
                                  ? proof.updatedDate
                                  : proof.updatedTime !== '—'
                                    ? proof.updatedTime
                                    : '—';

                              return (
                                <div
                                  key={proof.id || idx}
                                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 hover:border-zinc-750 transition-colors shadow-sm"
                                >
                                  {/* Section / Stage Name */}
                                  <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-200">
                                    <span>{proof.stageName}</span>
                                    {proof.itemTitle && proof.itemTitle !== proof.stageName && (
                                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded truncate max-w-[130px]" title={proof.itemTitle}>
                                        {proof.itemTitle}
                                      </span>
                                    )}
                                  </div>

                                  {/* Proof Image */}
                                  <div
                                    onClick={() => setPreviewImage({ url: proof.imageUrl, title: `${proof.stageName} • ${selectedProofEvent.eventCategory} (${selectedProofEvent.orderId})` })}
                                    className="relative w-full h-44 rounded-lg overflow-hidden bg-black/60 border border-zinc-800 group cursor-pointer"
                                    title="Click to zoom preview"
                                  >
                                    <img
                                      src={proof.imageUrl}
                                      alt={proof.stageName}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="px-2.5 py-1 rounded-md bg-black/80 text-white text-xs font-mono font-bold flex items-center gap-1 shadow-md">
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>View Full</span>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Updated Date & Time */}
                                  <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                                    <span className="text-zinc-300 font-semibold">
                                      Updated: {updatedDisplay}
                                    </span>
                                  </div>

                                  {/* Quick Action buttons */}
                                  <div className="flex items-center justify-between pt-0.5 text-[11px] font-mono">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImage({ url: proof.imageUrl, title: `${proof.stageName} • ${selectedProofEvent.eventCategory} (${selectedProofEvent.orderId})` })}
                                      className="inline-flex items-center gap-1 font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Preview</span>
                                    </button>
                                    <a
                                      href={proof.imageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 font-bold text-sky-400 hover:text-sky-300 transition-colors"
                                    >
                                      <span>Open Link</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL IMAGE PREVIEW LIGHTBOX */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-zinc-800 bg-zinc-950">
              <h4 className="text-sm font-mono font-bold text-white truncate pr-2">
                {previewImage.title}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-black/80 min-h-[300px]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Proof Preview</span>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-sky-400 rounded-lg border border-zinc-700 font-bold transition-colors"
              >
                <span>Open Full Original</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
