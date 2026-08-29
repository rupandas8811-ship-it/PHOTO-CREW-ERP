import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from './RoleContext';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Phone, 
  Tag, 
  User, 
  X, 
  Plus, 
  Search, 
  Filter, 
  AlertCircle, 
  Briefcase, 
  CheckCircle2, 
  Camera, 
  Video, 
  FileText, 
  Check, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2
} from 'lucide-react';
import { formatINR, formatTime12Hour, formatDateDDMMYY } from '../utils';
import { EVENT_TYPES, ACTIVE_STAGE_GROUPS } from '../types';

interface UnifiedCalendarProps {
  role: 'sales' | 'operations' | 'production' | 'owner' | 'worker';
  onSelectLead?: (lead: any) => void;
}

export interface CalendarEvent {
  id: string;
  sourceType: 'lead' | 'order' | 'operation' | 'production' | 'memo';
    eventClass: 
    | 'New Lead' 
    | 'Follow-up' 
    | 'Quotation Sent' 
    | 'Booking Confirmed' 
    | 'Event Scheduled' 
    | 'Event Completed' 
    | 'Raw Footage Pending' 
    | 'Editing In Progress' 
    | 'Target Delivery'
    | 'Delivery Overdue'
    | 'Overdue' 
    | 'Calendar Memo';
  date: string; // "YYYY-MM-DD"
  customerName: string;
  eventName?: string;
  mobile: string;
  eventType: string;
  eventTime: string;
  eventLocation: string;
  currentStage: string;
  notes?: string;
  packageName?: string;
  totalAmount?: number;
  
  // Operations specific
  photographer?: string;
  videographer?: string;
  drone?: string;
  assistant?: string;
  kit?: string;
  reportingTime?: string;
  
  // Production specific
  editor?: string;
  editingStatus?: string;
  expectedDeliveryDate?: string;
  targetDeliveryDate?: string;
  orderId?: string;
  
  raw: any;
}

export const normalizeToYYYYMMDD = (dateStr: string | null | undefined): string => {
  if (!dateStr || dateStr === '—' || dateStr === 'N/A' || dateStr === 'undefined' || dateStr === 'null') return '';
  const clean = String(dateStr).includes('T') ? String(dateStr).split('T')[0] : String(dateStr).trim();
  if (!clean) return '';
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD or YYYY/MM/DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY or DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return clean;
};

const parseLocalDate = (dateStr: string | Date | null | undefined): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
  const ymd = normalizeToYYYYMMDD(String(dateStr));
  if (ymd) {
    const parts = ymd.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

const parseEventTimes = (timeStr: string) => {
  if (!timeStr) return { start: '10:00 AM', end: '--' };
  // Check if it contains a range delimiter ' - ', '-', or ' to '
  const delimiter = timeStr.includes(' - ') ? ' - ' : timeStr.includes('-') ? '-' : timeStr.includes(' to ') ? ' to ' : null;
  if (delimiter) {
    const parts = timeStr.split(delimiter);
    return {
      start: parts[0]?.trim() || timeStr,
      end: parts[1]?.trim() || '--'
    };
  }
  return {
    start: timeStr,
    end: '--'
  };
};

const formatDateDMY = (dateStr: string | null | undefined): string => {
  if (!dateStr || dateStr === '—' || dateStr === 'N/A') return '—';
  return formatDateDDMMYY(dateStr) || '—';
};

const getProductionAssignedDate = (
  orderId?: string,
  leadId?: string,
  prodRecord?: any,
  editorAssignments?: any[]
): string => {
  if (editorAssignments && editorAssignments.length > 0) {
    const match = editorAssignments.find(a => 
      (orderId && a.order_id === orderId) ||
      (leadId && (a.lead_id === leadId || a.order_id === leadId)) ||
      (prodRecord?.production_id && a.production_id === prodRecord.production_id)
    );
    if (match) {
      const rawDate = match.assigned_date || match.assignment_date || match.created_at;
      if (rawDate) return formatDateDMY(rawDate);
    }
  }

  if (prodRecord?.editing_start_date) return formatDateDMY(prodRecord.editing_start_date);
  if (prodRecord?.created_at) return formatDateDMY(prodRecord.created_at);

  return '—';
};

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({ role, onSelectLead }) => {
  const { 
    currentUser,
    currentUserName,
    leads, 
    orders, 
    operations, 
    production, 
    rawFootage, 
    notifications, 
    addNotification,
    calendarMemos,
    addCalendarMemo,
    updateCalendarMemo,
    deleteCalendarMemo,
    logs,
    staffAssignments,
    editorAssignments,
    payments,
    isDataLoading
  } = useRole();

  const systemToday = new Date();
  
  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const systemTodayStr = getLocalDateStr(systemToday);

  // Anchor and navigate state
  const [currentDate, setCurrentDate] = useState<Date>(systemToday);
  const [selectedDate, setSelectedDate] = useState<string | null>(systemTodayStr);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  
  // Tab states
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  
  // Search and Filter states
  const [searchInputValue, setSearchInputValue] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [isSearchExecuted, setIsSearchExecuted] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  
  // Memo form overlay state
  const [showAddMemo, setShowAddMemo] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newMemoMessage, setNewMemoMessage] = useState('');
  
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const [popupLeadId, setPopupLeadId] = useState<string | null>(null);
  const [showSelectedDateModal, setShowSelectedDateModal] = useState<boolean>(false);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  const handleEventAction = (ev: CalendarEvent | any) => {
    if (ev?.sourceType === 'memo') {
      setNewMemoTitle(ev.customerName || '');
      setNewMemoMessage(ev.notes || '');
      setEditingMemoId(ev.id);
      setSelectedDate(ev.date);
      setShowAddMemo(true);
      return;
    }

    const targetLeadId = ev?.raw?.lead_id || ev?.orderId || ev?.lead_id || ev?.id;
    const orderDisplayId = ev?.orderId || ev?.raw?.order_id || ev?.raw?.tracking_id || ev?.raw?.lead_id;

    const targetLead = leads.find(
      (l) =>
        (targetLeadId && (l.lead_id === targetLeadId || l.order_id === targetLeadId)) ||
        (orderDisplayId && (l.lead_id === orderDisplayId || l.order_id === orderDisplayId)) ||
        (ev?.customerName && l.customer_name && l.customer_name.trim().toLowerCase() === ev.customerName.trim().toLowerCase()) ||
        (l.events && l.events.some((e) => e.id === ev?.id || (ev?.raw && e.id === ev.raw.id)))
    ) || (ev?.raw?.lead_id ? ev.raw : (targetLeadId ? { lead_id: targetLeadId, customer_name: ev?.customerName, mobile: ev?.mobile } : null));

    setShowSelectedDateModal(false);
    setPopupDate(null);
    setPopupLeadId(null);

    if (role === 'sales' || role === 'owner' || onSelectLead) {
      if (onSelectLead && targetLead) {
        onSelectLead(targetLead);
      }
      window.dispatchEvent(
        new CustomEvent("calendar-action-click", {
          detail: {
            leadId: targetLead?.lead_id || targetLeadId,
            role,
            orderId: orderDisplayId || targetLead?.order_id || targetLead?.lead_id || targetLeadId
          }
        })
      );
      window.dispatchEvent(
        new CustomEvent("calendar-action-click-deferred", {
          detail: {
            leadId: targetLead?.lead_id || targetLeadId,
            role,
            orderId: orderDisplayId || targetLead?.order_id || targetLead?.lead_id || targetLeadId
          }
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("calendar-action-click", {
          detail: {
            leadId: targetLead?.lead_id || targetLeadId,
            role,
            orderId: orderDisplayId || targetLead?.order_id || targetLead?.lead_id || targetLeadId
          }
        })
      );
      window.dispatchEvent(
        new CustomEvent("calendar-action-click-deferred", {
          detail: {
            leadId: targetLead?.lead_id || targetLeadId,
            role,
            orderId: orderDisplayId || targetLead?.order_id || targetLead?.lead_id || targetLeadId
          }
        })
      );
    }
  };

  const toggleLeadExpand = (leadId: string) => {
    const newSet = new Set(expandedLeads);
    if (newSet.has(leadId)) newSet.delete(leadId);
    else newSet.add(leadId);
    setExpandedLeads(newSet);
  };
  const [teamPopupEvent, setTeamPopupEvent] = useState<any>(null);
  
  const todayStr = systemTodayStr; // Anchor date for relative analysis

  const tomorrowDate = new Date(systemToday);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrowDate);

  const getEventHighlights = (ev: CalendarEvent) => {
    const isCompleted = ['Verified Footage', 'Footage Handover Verified', 'Raw Footage Received', 'Event Ended', 'Event Completed', 'Delivered', 'Paid', 'Closed'].includes(ev.currentStage);
    const dateStr = ev.date;

    // Overdue Event = Red
    const isOverdue = dateStr < todayStr && !isCompleted;
    if (isOverdue || ev.eventClass === 'Overdue') {
      return {
        name: 'Overdue Event',
        bg: 'bg-red-500/10 border-red-500/30 text-red-400',
        dot: 'bg-red-500',
        badge: 'text-red-400 border-red-500/20 bg-red-950/20',
        glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
        cellBg: 'bg-red-950/25 border-red-900/30'
      };
    }

    // Event Today = Green
    if (dateStr === todayStr) {
      return {
        name: 'Event Today',
        bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
        dot: 'bg-emerald-500 animate-pulse',
        badge: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/30',
        cellBg: 'bg-green-950/25 border-green-500/35'
      };
    }

    // Event Tomorrow = Orange
    if (dateStr === tomorrowStr) {
      return {
        name: 'Event Tomorrow',
        bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
        dot: 'bg-orange-500',
        badge: 'text-orange-400 border-orange-500/20 bg-orange-950/20',
        glow: 'shadow-[0_0_12px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/20',
        cellBg: 'bg-orange-950/15 border-orange-550/30'
      };
    }

    // Event In Progress = Cyan
    const isInProgress = ['Editing In Progress', 'Operations Assigned'].includes(ev.eventClass) || ['In Progress', 'Editing', 'Operations Assigned'].includes(ev.currentStage);
    if (isInProgress) {
      return {
        name: 'Event In Progress',
        bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
        dot: 'bg-cyan-400',
        badge: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20',
        glow: 'shadow-[0_0_10px_rgba(6,182,212,0.1)]',
        cellBg: 'bg-cyan-950/15 border-cyan-900/35'
      };
    }

    // Event Completed = Dark Green
    if (isCompleted || ev.eventClass === 'Event Completed') {
      return {
        name: 'Event Completed',
        bg: 'bg-green-950/35 border-green-900/30 text-green-500',
        dot: 'bg-green-700',
        badge: 'text-green-500 border-green-900/20 bg-green-950/35',
        glow: '',
        cellBg: 'bg-emerald-950/10 border-emerald-900/20'
      };
    }

    // Event Scheduled = Bright Blue (Default)
    return {
      name: 'Event Scheduled',
      bg: 'bg-blue-500/15 border-blue-500/35 text-blue-400',
      dot: 'bg-blue-400',
      badge: 'text-blue-400 border-blue-500/20 bg-blue-950/20',
      glow: 'shadow-[0_0_10px_rgba(59,130,246,0.1)]',
      cellBg: 'bg-blue-950/15 border-blue-900/35'
    };
  };

  // Cell Urgency Sorter to find primary cell color highlight candidate
  const getCellUrgencyHighlight = (evs: CalendarEvent[]) => {
    if (evs.length === 0) return null;
    const urgencies = evs.map(ev => {
      const h = getEventHighlights(ev);
      let score = 0;
      if (h.name === 'Overdue Event') score = 6;
      else if (h.name === 'Event Today') score = 5;
      else if (h.name === 'Event Tomorrow') score = 4;
      else if (h.name === 'Event In Progress') score = 3;
      else if (h.name === 'Event Scheduled') score = 2;
      else if (h.name === 'Event Completed') score = 1;
      return { event: ev, highlights: h, score };
    });
    urgencies.sort((a, b) => b.score - a.score);
    return urgencies[0].highlights;
  };



  
  // Helper to extract follow-up dates from remarks
  const parseFollowUpDate = (remarks) => {
    if (!remarks) return null;
    const match = remarks.match(/Next follow-up:\s*(\d{4}-\d{2}-\d{2})/i);
    return match && match[1] ? match[1] : null;
  };

  // Convert raw records into a standardized structure
  const allEvents = useMemo(() => {
    try {
      const events: CalendarEvent[] = [];

      const salesStages = [
        'Quotation Sent', 'Quote Sent', 'Created Quotation', 'Quote Follow-up', 'Create Quote',
        'Confirm Order', 'Order Confirmed', 'Booking Confirmed', 'Advance Received', 'Payment Received',
        'Event Scheduled', 'Operations Assigned', 'Assigned Crew', 'Staff Assigned',
        'Event Started', 'Event Start', 'Event Ended', 'Event End', 'Event Completed', 'Event Complete',
        'Footage Handover', 'Footage Handover Verified', 'Verified Footage', 'Raw Footage Received',
        'Assigned Editor', 'Editor Assigned', 'Editing Started', 'Editing In Progress', 'Internal QC Review',
        'Customer Review', 'Client Review', 'Client Review Sent', 'Revision Required', 'Revision In Progress',
        'Editing Completed', 'Editing Complete', 'Client Acceptance', 'Final Approval', 'Approved',
        'Delivered', 'Project Delivered', 'Business Owner Review',
        'Closed', 'Order Closed', 'Project Closed', 'Project Completed', 'Completed'
      ];

      const operationsStages = [
        'Confirm Order', 'Order Confirmed', 'Booking Confirmed',
        'Event Scheduled', 'Operations Assigned', 'Assigned Crew', 'Staff Assigned',
        'Event Started', 'Event Start', 'Event Ended', 'Event End', 'Event Completed', 'Event Complete',
        'Footage Handover', 'Footage Handover Verified', 'Verified Footage', 'Raw Footage Received'
      ];

      const productionStages = [
        'Verified Footage', 'Footage Handover Verified', 'Raw Footage Received',
        'Assigned Editor', 'Editor Assigned', 'Editing Started', 'Editing In Progress',
        'Internal QC Review', 'Customer Review', 'Client Review', 'Client Review Sent',
        'Revision Required', 'Revision In Progress', 'Editing Completed', 'Editing Complete',
        'Client Acceptance'
      ];

      const ownerStages = [
        'Confirm Order', 'Order Confirmed', 'Booking Confirmed',
        'Event Scheduled', 'Operations Assigned', 'Assigned Crew', 'Staff Assigned',
        'Event Started', 'Event Start', 'Event Ended', 'Event End', 'Event Completed', 'Event Complete',
        'Footage Handover', 'Footage Handover Verified', 'Verified Footage', 'Raw Footage Received',
        'Assigned Editor', 'Editor Assigned', 'Editing Started', 'Editing In Progress', 'Internal QC Review',
        'Customer Review', 'Client Review', 'Client Review Sent', 'Revision Required', 'Revision In Progress',
        'Editing Completed', 'Editing Complete', 'Client Acceptance', 'Final Approval', 'Approved',
        'Delivered', 'Project Delivered', 'Business Owner Review',
        'Closed', 'Order Closed', 'Project Closed', 'Project Completed', 'Completed'
      ];

      leads.forEach(ld => {
        if (!ld) return;

        const ord = orders?.find(o => o.lead_id === ld.lead_id);
        const orderId = ord?.order_id || ld.lead_id;
        const prodRecord = production?.find(p => p.tracking_id === ld.lead_id || p.order_id === ld.lead_id || p.tracking_id === orderId || (p as any).order_id === orderId);
        const opsRecord = operations?.find(o => o.order_id === orderId || o.order_id === ld.lead_id);

        const statusClean = (ord?.current_stage || prodRecord?.editing_status || ld.status || ld.current_status || '').trim();

        let isVisible = false;

        if (role === 'sales') {
          isVisible = salesStages.some(st => st.toLowerCase() === statusClean.toLowerCase());
        } else if (role === 'operations') {
          isVisible = operationsStages.some(st => st.toLowerCase() === statusClean.toLowerCase());
        } else if (role === 'worker') {
          isVisible = operationsStages.some(st => st.toLowerCase() === statusClean.toLowerCase());
        } else if (role === 'production') {
          isVisible = productionStages.some(st => st.toLowerCase() === statusClean.toLowerCase());
        } else if (role === 'owner') {
          isVisible = ownerStages.some(st => st.toLowerCase() === statusClean.toLowerCase());
        } else {
          isVisible = true;
        }

        if (!isVisible) return;

        // Find staff assignments
        const assigns = staffAssignments ? staffAssignments.filter(x => 
          x.order_id === ld.lead_id || 
          x.order_id === orderId || 
          (x as any).lead_id === ld.lead_id
        ) : [];

        // Operations Staff restriction: show ONLY events assigned to this staff member
        if (role === 'worker') {
          const activeStaffName = (currentUserName || currentUser?.name || '').toLowerCase().trim();
          const activeStaffEmail = (currentUser?.email || '').toLowerCase().trim();
          const activeStaffMobile = (currentUser?.mobile || '').trim();

          const isAssigned = (activeStaffName || activeStaffEmail || activeStaffMobile) && (
            assigns.some(a => 
              (a.staff_name && activeStaffName && a.staff_name.toLowerCase().trim() === activeStaffName) ||
              (a.staff_email && activeStaffEmail && a.staff_email.toLowerCase().trim() === activeStaffEmail) ||
              (a.staff_mobile && activeStaffMobile && a.staff_mobile === activeStaffMobile)
            ) ||
            (ld.events && ld.events.some((e: any) => {
              const assignedNames = e.assigned_staff_names ? e.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase()) : [];
              return activeStaffName && assignedNames.includes(activeStaffName);
            })) ||
            (opsRecord && (
              (opsRecord.photographer_assigned && activeStaffName && opsRecord.photographer_assigned.toLowerCase().includes(activeStaffName)) ||
              (opsRecord.videographer_assigned && activeStaffName && opsRecord.videographer_assigned.toLowerCase().includes(activeStaffName)) ||
              (opsRecord.drone_operator_assigned && activeStaffName && opsRecord.drone_operator_assigned.toLowerCase().includes(activeStaffName)) ||
              (opsRecord.assistant_assigned && activeStaffName && opsRecord.assistant_assigned.toLowerCase().includes(activeStaffName))
            ))
          );

          if (!isAssigned) return;
        }

        // Fetch events from ld.events or fall back to lead-level event if no events are saved
        const eventsList = (ld.events && ld.events.length > 0) ? ld.events : [
          {
            id: `fallback-${ld.lead_id}`,
            event_date: ld.event_date,
            event_start_time: ld.event_time,
            event_name: ld.custom_event_name || ld.event_type || 'Event Shoot',
            event_type: ld.event_type,
            event_location: ld.event_location || 'Studio'
          }
        ];

        const targetDeliveryDate = prodRecord?.expected_delivery_date || prodRecord?.target_delivery_date || ld.delivery_target_date || '';
        const uniqueStaff = new Set(assigns.map(a => a.staff_name));
        const assignedTeamCount = uniqueStaff.size;

        eventsList.forEach((ev, index) => {
          if (!ev) return;

          let dateToUse = '';
          if (role === 'production') {
            // Production calendar MUST show target delivery date ONLY
            dateToUse = ev.target_delivery_date || targetDeliveryDate;
          } else {
            // Sales/Ops/Ops Staff/Owner calendars show actual event date
            dateToUse = ev.event_date || ld.event_date || '';
          }

          // If dateToUse is missing/empty, do not render on calendar
          if (!dateToUse) return;

          const evStartTime = ev.event_start_time || ev.event_time || ld.event_time || '10:00 AM';
          const evName = ev.event_name || ld.custom_event_name || ev.event_type || ld.event_type || 'Event Shoot';
          const evType = ev.event_type || ld.event_type || 'Shoot';
          const evLoc = ev.event_location || ld.event_location || 'Studio';

          events.push({
            id: `lead-event-${ld.lead_id}-${index}-${ev.id || 'idx'}`,
            sourceType: 'order',
            eventClass: role === 'production' ? 'Target Delivery' : 'Event Scheduled',
            date: dateToUse,
            customerName: ld.customer_name,
            mobile: ld.mobile,
            eventName: evName, eventType: evType,
            eventTime: evStartTime,
            eventLocation: evLoc,
            currentStage: statusClean || ld.status,
            notes: 'On Track',
            packageName: ld.Select_Package_Option || 'Custom Package',
            totalAmount: ld.package_price || ld.budget || 0,
            orderId: orderId,
            targetDeliveryDate: targetDeliveryDate,
            raw: {
              ...ld,
              ...ev,
              lead_id: ld.lead_id,
              order_id: orderId,
              event_name: evName,
              event_type: evType,
              event_date: ev.event_date || ld.event_date || '',
              event_start_time: evStartTime,
              event_end_time: ev.event_end_time || '',
              reporting_date: ev.reporting_date || '',
              reporting_time: ev.reporting_time || '',
              assignedTeamCount,
              assigns,
              targetDeliveryDate: targetDeliveryDate,
              sales_person: ld.sales_person || ld.created_by || 'Sales Team'
            }
          });
        });
      });

      return events;
    } catch (err: any) {
      console.error("Error computing calendar events:", err);
      if (!calendarError) {
        setCalendarError(err.message || "Unknown error occurred while parsing database events.");
      }
      return [];
    }
  }, [leads, orders, production, operations, staffAssignments, calendarMemos, role, currentUser, currentUserName]);

  // Filters Event list by role first
  const roleFilteredEvents = useMemo(() => {
    return allEvents;
  }, [allEvents, role]);

  // Search execution handlers
  const handleExecuteSearch = () => {
    const q = searchInputValue.trim();
    setAppliedSearchQuery(q);
    setIsSearchExecuted(true);
  };

  const handleClearSearch = () => {
    setSearchInputValue('');
    setAppliedSearchQuery('');
    setIsSearchExecuted(false);
  };

  // Compute matching search results for search table display
  const searchResultsEvents = useMemo(() => {
    if (!isSearchExecuted) return [];
    const q = appliedSearchQuery.toLowerCase().trim();
    return roleFilteredEvents.filter(ev => {
      if (ev.sourceType === 'memo') return false;
      if (!q) return true; // If empty search submitted, match all non-memo events
      const matchesName = (ev.customerName || '').toLowerCase().includes(q);
      const matchesLoc = (ev.eventLocation || '').toLowerCase().includes(q);
      const matchesType = (ev.eventType || '').toLowerCase().includes(q);
      const matchesNotes = (ev.notes || '').toLowerCase().includes(q);
      const matchesOrder = String(ev.orderId || '').toLowerCase().includes(q);
      const matchesEventName = (ev.raw?.event_name || '').toLowerCase().includes(q);
      const matchesDate = (ev.date || '').toLowerCase().includes(q);
      const matchesStage = (ev.currentStage || '').toLowerCase().includes(q);
      const matchesClass = (ev.eventClass || '').toLowerCase().includes(q);
      return matchesName || matchesLoc || matchesType || matchesNotes || matchesOrder || matchesEventName || matchesDate || matchesStage || matchesClass;
    });
  }, [roleFilteredEvents, isSearchExecuted, appliedSearchQuery]);

  // Inline filter by type and classes for calendar display
  const filteredEvents = useMemo(() => {
    return roleFilteredEvents.filter(ev => {
      // Exclude memos from calendar UI
      if (ev.sourceType === 'memo') return false;

      // Event Status (Class) filter
      if (statusFilter !== 'All') {
        if (ev.eventClass !== statusFilter) return false;
      }

      // Event Type filter
      if (eventTypeFilter !== 'All') {
        if (ev.eventType !== eventTypeFilter) return false;
      }

      return true;
    });
  }, [roleFilteredEvents, statusFilter, eventTypeFilter]);



  // Unique Event Class states for filters
  const uniqueEventClasses = [
    'All',
    'New Lead',
    'Follow-up',
    'Quotation Sent',
    'Booking Confirmed',
    'Event Scheduled',
    'Event Completed',
    'Raw Footage Pending',
    'Editing In Progress',
    
    'Overdue',
    'Calendar Memo'
  ];

  // Month navigation helpers
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 15));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 15));
  };

  const handleSetToday = () => {
    setCurrentDate(systemToday);
    setSelectedDate(systemTodayStr);
  };

  // Month Grid Days
  const gridDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    
    const days: { dayNumber: number | null; dateString: string | null; isCurrentMonth: boolean }[] = [];
    
    // Previous month's trailing cells
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const mStr = (prevM + 1) < 10 ? `0${prevM + 1}` : `${prevM + 1}`;
      const dStr = dNum < 10 ? `0${dNum}` : `${dNum}`;
      days.push({
        dayNumber: dNum,
        dateString: `${prevY}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    // Current month cells
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = (currentMonth + 1) < 10 ? `0${currentMonth + 1}` : `${currentMonth + 1}`;
      const dStr = d < 10 ? `0${d}` : `${d}`;
      days.push({
        dayNumber: d,
        dateString: `${currentYear}-${mStr}-${dStr}`,
        isCurrentMonth: true
      });
    }

    // Next month's trailing cells to make a full 42-day calendar square
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const mStr = (nextM + 1) < 10 ? `0${nextM + 1}` : `${nextM + 1}`;
      const dStr = d < 10 ? `0${d}` : `${d}`;
      days.push({
        dayNumber: d,
        dateString: `${nextY}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Week Grid Days (for selectedDate week)
  const weekDays = useMemo(() => {
    const baseDate = selectedDate ? parseLocalDate(selectedDate) : parseLocalDate(currentDate);
    const dayOfWeek = baseDate.getDay();
    const list: { name: string; dateStr: string; dateObj: Date }[] = [];
    
    const weekdaysNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const offset = i - dayOfWeek;
      const tempDate = new Date(baseDate);
      tempDate.setDate(baseDate.getDate() + offset);
      const y = tempDate.getFullYear();
      const m = tempDate.getMonth() + 1;
      const d = tempDate.getDate();
      const mStr = m < 10 ? `0${m}` : `${m}`;
      const dStr = d < 10 ? `0${d}` : `${d}`;
      
      list.push({
        name: weekdaysNames[i],
        dateStr: `${y}-${mStr}-${dStr}`,
        dateObj: tempDate
      });
    }
    return list;
  }, [selectedDate, currentDate]);

  // Color Class mapper
  const getColorClasses = (cls: CalendarEvent['eventClass']) => {
    switch (cls) {
      case 'New Lead':
        return {
          dotBg: 'bg-blue-500',
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
          card: 'border-l-4 border-l-blue-500 bg-blue-950/10 hover:bg-blue-950/20 border border-zinc-800'
        };
      case 'Follow-up':
        return {
          dotBg: 'bg-orange-500',
          badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20',
          card: 'border-l-4 border-l-orange-500 bg-orange-950/10 hover:bg-orange-950/20 border border-zinc-800'
        };
      case 'Quotation Sent':
        return {
          dotBg: 'bg-purple-500',
          badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
          card: 'border-l-4 border-l-purple-500 bg-purple-950/10 hover:bg-purple-950/20 border border-zinc-800'
        };
      case 'Booking Confirmed':
        return {
          dotBg: 'bg-emerald-500',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
          card: 'border-l-4 border-l-emerald-500 bg-emerald-950/15 hover:bg-emerald-950/25 border border-zinc-800'
        };
      
      case 'Event Scheduled':
        return {
          dotBg: 'bg-cyan-500',
          badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20',
          card: 'border-l-4 border-l-cyan-500 bg-cyan-950/10 hover:bg-cyan-950/20 border border-zinc-800'
        };
      case 'Target Delivery':
        return {
          dotBg: 'bg-indigo-500',
          badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20',
          card: 'border-l-4 border-l-indigo-500 bg-indigo-950/10 hover:bg-indigo-950/20 border border-zinc-800'
        };
      case 'Delivery Overdue':
        return {
          dotBg: 'bg-red-500',
          badge: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
          card: 'border-l-4 border-l-red-500 bg-red-950/10 hover:bg-red-950/20 border border-red-900/50'
        };
      case 'Event Completed':
        return {
          dotBg: 'bg-green-600',
          badge: 'bg-green-600/10 text-green-400 border-green-600/20 hover:bg-green-600/20',
          card: 'border-l-4 border-l-green-600 bg-green-950/15 hover:bg-green-950/25 border border-zinc-800'
        };
      case 'Raw Footage Pending':
        return {
          dotBg: 'bg-yellow-500',
          badge: 'bg-yellow-500/10 text-yellow-450 border-yellow-500/20 hover:bg-yellow-500/20',
          card: 'border-l-4 border-l-yellow-500 bg-yellow-950/10 hover:bg-yellow-950/20 border border-zinc-800'
        };
      case 'Editing In Progress':
        return {
          dotBg: 'bg-violet-500',
          badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20',
          card: 'border-l-4 border-l-violet-500 bg-violet-950/10 hover:bg-violet-950/20 border border-zinc-800'
        };
      
      case 'Overdue':
        return {
          dotBg: 'bg-red-500',
          badge: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
          card: 'border-l-4 border-l-red-500 bg-red-950/10 hover:bg-red-950/20 border border-zinc-800'
        };
      case 'Calendar Memo':
        return {
          dotBg: 'bg-fuchsia-500',
          badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 hover:bg-fuchsia-400/20',
          card: 'border-l-4 border-l-fuchsia-500 bg-fuchsia-950/10 hover:bg-fuchsia-950/20 border border-zinc-800'
        };
      default:
        return {
          dotBg: 'bg-zinc-500',
          badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20',
          card: 'border-l-4 border-l-zinc-500 bg-zinc-950/10 hover:bg-zinc-950/20 border border-zinc-800'
        };
    }
  };

  // WIDGET DATA ENGINE
  const widgets = useMemo(() => {
    // 1. Today's Events
    const todayEvents = roleFilteredEvents.filter(e => e.date === todayStr);

    // 2. Tomorrow's Events
    const tomorrowEvents = roleFilteredEvents.filter(e => e.date === tomorrowStr);

    // 3. Upcoming Events (7 days window)
    const sevenDaysDate = new Date(systemToday);
    sevenDaysDate.setDate(sevenDaysDate.getDate() + 7);
    const sevenDaysLater = getLocalDateStr(sevenDaysDate);
    const upcomingEvents = roleFilteredEvents.filter(e => e.date >= todayStr && e.date <= sevenDaysLater);

    // 4. Overdue Tasks
    // - Lead follow up dates or event dates in past and stage is incomplete
    // - Production expected delivery in past and not delivered
    const overdueTasks = roleFilteredEvents.filter(e => {
      if (e.date >= todayStr) return false;
      
      if (e.sourceType === 'lead') {
        return !['Order Confirmed', 'Closed'].includes(e.currentStage);
      }
      if (e.sourceType === 'production') {
        return !['Delivered', 'Closed', 'Approved'].includes(e.currentStage);
      }
      if (e.sourceType === 'order') {
        return !['Event Completed', 'Delivered', 'Paid', 'Closed'].includes(e.currentStage);
      }
      return false;
    });

    // 5. Deliveries Due (Expected dates in the next 7 days in Post Production)
    const deliveriesDue = roleFilteredEvents.filter(e => {
      const isPostEvent = e.sourceType === 'order' && (e.eventClass === 'Target Delivery' || e.eventClass === 'Delivery Overdue');
      if (!isPostEvent) return false;
      return e.date >= todayStr && e.date <= sevenDaysLater;
    });

    return {
      todayEvents,
      tomorrowEvents,
      upcomingEvents,
      overdueTasks,
      deliveriesDue
    };
  }, [roleFilteredEvents]);


  // Add Memo submit handler
  const handleSaveMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoTitle.trim() || !newMemoMessage.trim() || !selectedDate) return;

    try {
      if (editingMemoId && updateCalendarMemo) {
        await updateCalendarMemo(editingMemoId, {
          title: newMemoTitle,
          message: newMemoMessage
        });
      } else if (addCalendarMemo) {
        await addCalendarMemo({
          memo_date: selectedDate,
          title: newMemoTitle,
          message: newMemoMessage
        });
      }

      setNewMemoTitle('');
      setNewMemoMessage('');
      setEditingMemoId(null);
      setShowAddMemo(false);
    } catch (err) {
      console.error("Failed storing calendar memo:", err);
    }
  };


  // Selected Event metadata log pipeline (for details popup activity feed)
  const eventTimeline = useMemo(() => {
    if (!selectedEvent) return [];
    
    // Attempt to match logs on order ID or lead ID
    const matches: string[] = [];
    if (selectedEvent.sourceType === 'lead' && selectedEvent.raw?.lead_id) {
       matches.push(selectedEvent.raw.lead_id);
    } else if (selectedEvent.sourceType === 'order' && selectedEvent.raw?.order_id) {
       matches.push(selectedEvent.raw.order_id);
       if (selectedEvent.raw.lead_id) matches.push(selectedEvent.raw.lead_id);
    } else if (selectedEvent.sourceType === 'production' && selectedEvent.raw?.tracking_id) {
       matches.push(selectedEvent.raw.tracking_id);
    }

    if (matches.length === 0) return [];

    return logs.filter(log => {
      return matches.includes(log.record_id);
    }).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  }, [selectedEvent, logs]);


  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];


  return (
    <div id="unified_calendar_container" className="space-y-6 text-zinc-100 pb-10">
      
      {calendarError && (
        <div className="p-3 bg-red-950/60 border border-red-500/35 rounded-xl text-xs text-red-200 flex items-center justify-between gap-2 shadow-lg">
          <span>{calendarError}</span>
          <button 
            onClick={() => setCalendarError(null)}
            className="text-red-400 hover:text-white font-bold px-2 py-1 rounded hover:bg-red-900/40 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* 3. Filtering and Custom Parameters Console */}
      <div className="bg-zinc-900/20 border border-zinc-900 p-3 sm:p-4 rounded-2xl flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          {/* Search Input Box + Search/OK Button */}
          <div className="flex items-center gap-2 w-full sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                id="cal_search_input"
                type="text"
                placeholder="Search client name, order ID, event type..."
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteSearch();
                  }
                }}
                className="w-full bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-850 focus:border-yellow-500 h-9 pl-9 pr-8 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-all"
              />
              {searchInputValue && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              id="btn_cal_search_submit"
              onClick={handleExecuteSearch}
              className="px-3.5 h-9 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>

          {/* Filter toggle button */}
          <button
            id="btn_cal_filter_toggle"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 h-9 bg-zinc-900 hover:bg-zinc-850 border rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              showFilters ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/5' : 'border-zinc-800 text-zinc-400'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </div>

        {/* Collapsible filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 w-full pt-3 border-t border-zinc-850 animate-fade-in">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Status</span>
              <select
                id="cal_status_filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-850 h-9 px-3 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-yellow-500 cursor-pointer w-full sm:w-auto"
              >
                <option value="All">All Stages</option>
                {ACTIVE_STAGE_GROUPS.map((group, idx) => (
                  <optgroup key={idx} label={group.label} className={`bg-zinc-950 ${group.colorClass} font-bold`}>
                    {group.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="text-white font-normal">{opt.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Event</span>
              <select
                id="cal_event_filter"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-850 h-9 px-3 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-yellow-500 cursor-pointer w-full sm:w-auto"
              >
                <option value="All">All Event Types</option>
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Search Results Table View */}
      {isSearchExecuted && (
        <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-yellow-500" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Search Results {appliedSearchQuery ? <><span className="text-zinc-400">for</span> <span className="text-yellow-400">"{appliedSearchQuery}"</span></> : null}
              </h3>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono font-bold border border-zinc-700">
                {searchResultsEvents.length} {searchResultsEvents.length === 1 ? 'result' : 'results'}
              </span>
            </div>
            <button
              onClick={handleClearSearch}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Search</span>
            </button>
          </div>

          {searchResultsEvents.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs font-mono italic">
              No results found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-max">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-400 text-[10px] font-mono uppercase tracking-wider border-b border-zinc-800">
                    {role === 'production' ? (
                      <>
                        <th className="p-3 text-amber-400">ORDER ID</th>
                        <th className="p-3">CUSTOMER NAME</th>
                        <th className="p-3">ASSIGNED DATE</th>
                        <th className="p-3 text-pink-400">TARGET DELIVERY DATE</th>
                        <th className="p-3">CURRENT STATUS</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3">Event Date</th>
                        <th className="p-3">Event Name</th>
                        <th className="p-3">Event Type</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Event Time</th>
                        <th className="p-3">Current Status</th>
                        <th className="p-3 text-right min-w-[100px] whitespace-nowrap">Action</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {searchResultsEvents.map((ev, idx) => {
                    if (role === 'production') {
                      const leadId = ev.raw?.lead_id || ev.orderId;
                      const leadObj = leads.find(l => l.lead_id === leadId);
                      const linkedOrder = orders.find(o => o.lead_id === leadId || o.order_id === ev.orderId);
                      const prodRecord = production?.find(p => p.tracking_id === leadId || p.order_id === leadId || p.tracking_id === ev.orderId || (p as any).order_id === ev.orderId);
                      
                      const oId = linkedOrder?.order_id || prodRecord?.order_id || ev.orderId || leadId || '—';
                      const cName = leadObj?.customer_name || linkedOrder?.client_name || ev.customerName || '—';
                      const aDate = getProductionAssignedDate(oId, leadId, prodRecord, editorAssignments);
                      const tDate = formatDateDMY(prodRecord?.target_delivery_date || prodRecord?.expected_delivery_date || leadObj?.delivery_target_date || ev.targetDeliveryDate);
                      const cStatus = prodRecord?.production_status || prodRecord?.editing_status || linkedOrder?.current_stage || leadObj?.status || ev.currentStage || 'Active';

                      return (
                        <tr 
                          key={ev.id || idx} 
                          onClick={() => setPopupLeadId(leadId)}
                          className="hover:bg-zinc-900/50 text-zinc-300 transition-colors cursor-pointer"
                        >
                          <td className="p-3 font-mono text-amber-400 font-bold">{oId}</td>
                          <td className="p-3 font-bold text-white">{cName}</td>
                          <td className="p-3 font-mono text-zinc-300">{aDate}</td>
                          <td className="p-3 font-mono text-pink-400 font-bold">{tDate}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-zinc-800 text-amber-300 border border-zinc-700 inline-block">
                              {cStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={ev.id || idx} className="hover:bg-zinc-900/50 text-zinc-300 transition-colors">
                        <td className="p-3 font-mono text-yellow-400 font-bold">{ev.date || 'N/A'}</td>
                        <td className="p-3 font-bold text-white">{ev.raw?.event_name || ev.eventName || ev.eventType || 'Event Shoot'}</td>
                        <td className="p-3 text-zinc-300">{ev.eventType || 'N/A'}</td>
                        <td className="p-3 font-semibold text-zinc-200">{ev.customerName || 'N/A'}</td>
                        <td className="p-3 font-mono text-indigo-400 font-bold">{ev.orderId || 'N/A'}</td>
                        <td className="p-3 font-mono text-zinc-400">{ev.eventTime ? formatTime12Hour(ev.eventTime) : 'N/A'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-zinc-800 text-zinc-300 border border-zinc-700 inline-block">
                            {ev.currentStage || ev.eventClass || 'N/A'}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap min-w-[100px]">
                          <button
                            onClick={() => handleEventAction(ev)}
                            className="inline-block px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] rounded-md transition-all shadow-sm cursor-pointer whitespace-nowrap min-w-max"
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            Details
                          </button>
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

      {/* 4. Secondary Row: Main Screen Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Main viewport calendar area */}
        <div className="lg:col-span-3 bg-zinc-950/45 border border-zinc-905 p-3 sm:p-4 md:p-6 rounded-2xl shadow-xl space-y-4 md:space-y-6 relative">
          {isDataLoading && (
            <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-50">
              <div className="flex flex-col items-center gap-3 bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-2xl animate-fade-in">
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-zinc-300 font-mono">Loading calendar events...</span>
              </div>
            </div>
          )}
          
          {/* Calendar Section Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-yellow-500 shrink-0" />
              <h3 className="text-xs sm:text-sm font-mono font-extrabold tracking-widest text-zinc-100 uppercase">
                {role === 'operations' ? 'OPERATIONS CALENDAR' : role === 'production' ? 'PRODUCTION CALENDAR' : 'UNIFIED CALENDAR'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">LIVE SYNC</span>
            </div>
          </div>

          {/* Unified Premium Calendar Toolbar */}
          <div id="unified_calendar_toolbar" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900/60 pb-5">
            {/* Left Column: Month Navigation & Today Button */}
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2 w-full sm:w-auto select-none">
                <button
                  id="btn_cal_prev_month"
                  onClick={handlePrevMonth}
                  className="px-2 py-1 text-zinc-500 hover:text-white transition duration-150 cursor-pointer active:scale-90 font-mono font-bold text-xs"
                  aria-label="Previous Month"
                >
                  [ &lt; ]
                </button>
                
                <h2 id="calendar_current_period" className="text-xs sm:text-sm font-mono font-bold tracking-wider text-center flex items-center justify-center flex-1 sm:flex-none sm:min-w-[140px]">
                  <span className="text-yellow-500 font-extrabold mr-1.5">{monthNames[currentMonth]}</span>
                  <span className="text-zinc-500 font-light">{currentYear}</span>
                </h2>

                <button
                  id="btn_cal_next_month"
                  onClick={handleNextMonth}
                  className="px-2 py-1 text-zinc-500 hover:text-white transition duration-150 cursor-pointer active:scale-90 font-mono font-bold text-xs"
                  aria-label="Next Month"
                >
                  [ &gt; ]
                </button>
              </div>

              <button
                id="btn_cal_today"
                onClick={handleSetToday}
                className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-300 hover:text-white transition-all duration-150 cursor-pointer active:scale-95 shadow-md shrink-0"
              >
                [ Today ]
              </button>
            </div>

            {/* Right Column: Month/Week/Day/Agenda Segmented Control */}
            <div id="calendar_view_selectors" className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 select-none w-full sm:w-auto justify-between sm:justify-start gap-1 sm:min-w-[320px]">
              {(['month', 'week', 'day', 'agenda'] as const).map((view) => {
                const isSelected = calendarView === view;
                return (
                  <button
                    key={view}
                    id={`btn_view_${view}`}
                    onClick={() => setCalendarView(view)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-mono font-bold capitalize transition-all duration-150 cursor-pointer text-center ${
                      isSelected
                        ? 'border border-yellow-500 text-yellow-500 bg-transparent shadow-md font-black'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent'
                    }`}
                  >
                    {view}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RENDERING VIEWS */}
          {calendarView === 'month' && (
            <div className="animate-fade-in space-y-4">
              {/* COMPACT UNIFIED MONTH VIEW (Fully responsive Google Calendar layout) */}
              <div className="space-y-3">
                {/* SUN / MON / TUE / WED / THU / FRI / SAT headers */}
                <div className="grid grid-cols-7 text-center font-mono text-[10px] sm:text-xs font-bold uppercase text-zinc-500 py-2 border-b border-zinc-900/40">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                    <span key={d} className="tracking-widest">{d}</span>
                  ))}
                </div>

                {/* 7-Column Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full max-w-full">
                  {gridDays.map((cell, idx) => {
                    const evs = filteredEvents.filter(ev => ev.date === cell.dateString);
                    const isSelected = selectedDate === cell.dateString;
                    const isTodayStr = cell.dateString === todayStr;

                    return (
                      <div
                        key={cell.dateString || idx}
                        id={`cell_day_${cell.dateString || idx}`}
                        onClick={() => {
                          if (cell.dateString) {
                            setSelectedDate(cell.dateString);
                            setShowSelectedDateModal(true);
                          }
                        }}
                        className={`flex flex-col items-start justify-start p-1 sm:p-1.5 rounded-xl aspect-square border transition-all duration-150 cursor-pointer select-none touch-manipulation relative overflow-hidden ${
                          isSelected
                            ? "bg-zinc-900 border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.18)]"
                            : isTodayStr
                            ? "bg-[#0d0d0e] border-emerald-500/40"
                            : cell.isCurrentMonth
                            ? "bg-[#0d0d0e] border-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900/50"
                            : "bg-[#040405] border-transparent opacity-25 text-zinc-700 hover:border-zinc-800"
                        }`}
                      >
                        {/* Date Number Display */}
                        <div className="w-full flex items-center justify-between shrink-0 pointer-events-none">
                          <span
                            className={`text-xs sm:text-sm font-mono font-extrabold ${
                              isSelected
                                ? "text-yellow-500 font-black"
                                : isTodayStr
                                ? "text-emerald-400 font-bold"
                                : cell.isCurrentMonth
                                ? "text-zinc-200"
                                : "text-zinc-700"
                            }`}
                          >
                            {cell.dayNumber}
                          </span>
                          {evs.length > 0 && (
                            <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-yellow-500/20 text-yellow-400 font-bold border border-yellow-500/30">
                              {evs.length}
                            </span>
                          )}
                        </div>

                        {/* Event names list inside the existing date box */}
                        {evs.length > 0 && (
                          <div className="w-full flex-1 flex flex-col justify-start gap-0.5 overflow-hidden mt-0.5 min-h-0 pointer-events-none">
                            {evs.slice(0, 3).map((ev, eIdx) => {
                              const displayName = ev.eventName || ev.raw?.event_name || ev.eventType || ev.customerName || 'Event';
                              return (
                                <div
                                  key={ev.id || eIdx}
                                  className="w-full truncate text-[8px] sm:text-[10px] leading-tight px-1 py-0.5 rounded bg-zinc-900/90 text-zinc-300 border border-zinc-800/80 font-medium text-left"
                                  title={displayName}
                                >
                                  {displayName}
                                </div>
                              );
                            })}
                            {evs.length > 3 && (
                              <div className="text-[8px] font-mono text-zinc-400 px-1 font-bold">
                                +{evs.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>


              </div>
            </div>
          )}

          {calendarView === 'week' && (
            <div className="animate-fade-in space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map((day, dIdx) => {
                  const evs = filteredEvents.filter(ev => ev.date === day.dateStr);
                  const isSelected = selectedDate === day.dateStr;
                  const isTodayStr = day.dateStr === todayStr;

                  return (
                    <div
                      key={day.dateStr || dIdx}
                      onClick={() => {
                        if (day.dateStr) {
                          setSelectedDate(day.dateStr);
                          setShowSelectedDateModal(true);
                        }
                      }}
                      className={`min-h-[250px] bg-zinc-950/20 border rounded-2xl p-3 flex flex-col transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-yellow-500 bg-zinc-900/40 ring-1 ring-yellow-500/10' 
                          : 'border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/20'
                      }`}
                    >
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5">
                        <span className="text-[10px] font-mono uppercase text-zinc-450">{day.name}</span>
                        <span className={`text-xs ml-2 px-1.5 py-0.5 rounded-md font-mono ${
                          isTodayStr ? 'bg-yellow-500 text-zinc-950 font-bold' : 'text-zinc-300'
                        }`}>
                          {day.dateStr.split('-')[2]}
                        </span>
                      </div>

                      {/* Week Events items stack */}
                      <div className="mt-3 flex-1 space-y-2 overflow-y-auto no-scrollbar max-h-[300px]">
                        {evs.length === 0 ? (
                          <span className="text-[10px] text-zinc-650 font-mono italic block py-4 text-center">
                            Empty
                          </span>
                        ) : (
                          evs.map(ev => {
                            const col = getColorClasses(ev.eventClass);
                            return (
                              <div
                                key={ev.id}
                                id={`week_card_${ev.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventAction(ev);
                                }}
                                className={`p-2 rounded-xl text-xs flex flex-col gap-1 transition cursor-pointer w-full hover:brightness-110 active:scale-95 ${col.card}`}
                              >
                                <span className="font-bold text-zinc-100 line-clamp-1">{ev.customerName}</span>
                                {role === 'production' ? (
                                  <>
                                    {ev.orderId && (
                                      <span className="text-[9px] font-mono text-zinc-400">Order ID: {ev.orderId}</span>
                                    )}
                                    <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>{ev.eventName || ev.eventType}</span>
                                    </div>
                                    <div className="text-[9px] font-mono text-pink-400 font-bold">Due: {ev.targetDeliveryDate || ev.date}</div>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{formatTime12Hour(ev.eventTime)}</span>
                                  </div>
                                )}
                                <span className={`${col.badge} text-[9px] font-semibold px-1.5 py-0.5 rounded-md self-start font-mono border text-center  overflow-hidden text-ellipsis break-words max-w-full`}>
                                  {ev.currentStage || ev.eventClass}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {calendarView === 'day' && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-zinc-950/20 border border-zinc-900 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-450">Day Perspective</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    Viewing events for: <span className="text-yellow-500 font-mono">{selectedDate || todayStr}</span>
                  </h3>
                </div>
                {selectedDate === todayStr && (
                  <span className="text-xs px-2.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full font-mono animate-pulse">
                    Today
                  </span>
                )}
              </div>

              {/* Day Time Schedule list */}
              <div className="space-y-3">
                {(() => {
                  const dayEvents = filteredEvents.filter(ev => ev.date === (selectedDate || todayStr));
                  if (dayEvents.length === 0) {
                    return (
                      <div className="py-20 text-center bg-zinc-950/10 border border-dashed border-zinc-900 rounded-3xl">
                        <CalendarIcon className="w-8 h-8 text-zinc-700 mx-auto mb-2 animate-bounce" />
                        <h4 className="text-sm font-bold text-zinc-200">No events locked</h4>
                        <p className="text-xs text-zinc-500 mt-1">Schedule assignments or memos for this calendar square.</p>
                      </div>
                    );
                  }

                  return dayEvents.map(ev => {
                    const col = getColorClasses(ev.eventClass);
                    return (
                      <div
                        key={ev.id}
                        id={`day_card_${ev.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventAction(ev);
                        }}
                        className={`p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer w-full hover:brightness-110 active:scale-[0.99] ${col.card}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded-md border border-zinc-800">
                              {ev.eventName || ev.eventType}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 border rounded-md font-mono font-bold shadow ${col.badge}`}>
                              {ev.currentStage || ev.eventClass}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-white">
                            {ev.customerName}
                          </h3>

                          {role === 'production' ? (
                            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 flex-wrap">
                              {ev.orderId && (
                                <div className="flex items-center gap-1 text-yellow-500">
                                  <span>Order ID:</span>
                                  <span>{ev.orderId}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-pink-400 font-bold">
                                <span>Target Delivery:</span>
                                <span>{ev.targetDeliveryDate || ev.date}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                <span>{formatTime12Hour(ev.eventTime)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="break-words max-w-[200px]">{ev.eventLocation}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Extra details indicator */}
                        <div className="flex items-center gap-2 self-start md:self-center">
                          <button
                            id={`btn_day_evt_view_${ev.id}`}
                            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl border border-zinc-850 hover:border-zinc-700 transition"
                          >
                            Inspection Desk
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {calendarView === 'agenda' && (
            <div className="animate-fade-in space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                  Chronological Studio Feed
                </h3>
                <span className="text-xs text-zinc-500 font-mono">{filteredEvents.length} schedules load</span>
              </div>

              {/* Feed items */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredEvents.length === 0 ? (
                  <div className="py-20 text-center border border-zinc-900 rounded-2xl block text-zinc-500">
                    No matching schedulers found. Refine your filters.
                  </div>
                ) : (
                  filteredEvents
                    .sort((a,b) => a.date.localeCompare(b.date))
                    .map(ev => {
                      const col = getColorClasses(ev.eventClass);
                      return (
                        <div
                          key={ev.id}
                          id={`agenda_row_${ev.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventAction(ev);
                          }}
                          className={`p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition cursor-pointer w-full hover:brightness-110 active:scale-[0.99] ${col.card}`}
                        >
                          <div className="flex items-start gap-3 w-full sm:w-auto">
                            <div className="flex flex-col items-center bg-zinc-950 px-3 py-2 rounded-xl text-center min-w-max border border-zinc-900">
                              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">
                                {parseLocalDate(ev.date).toLocaleDateString('en-US', { month: 'short' })}
                              </span>
                              <span className="text-base font-black text-yellow-500 font-mono">
                                {ev.date.split('-')[2]}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] px-1.5 py-0.5 border rounded-md font-mono font-bold ${col.badge}`}>
                                  {ev.eventClass}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-550 border-l border-zinc-800 pl-2">
                                  {ev.eventName || ev.eventType}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white">
                                {ev.customerName}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-450 font-mono">
                                <Clock className="w-3 h-3 text-zinc-650" />
                                <span>{formatTime12Hour(ev.eventTime)}</span>
                                <span className="text-zinc-700">•</span>
                                <MapPin className="w-3 h-3 text-zinc-650" />
                                <span className="break-words max-w-[200px]">{ev.eventLocation}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-zinc-500 font-mono self-end sm:self-center">
                            ID: {ev.id.slice(0, 12)}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Workspace Memos Board (Hidden per user request) */}
        <div className="hidden" style={{ display: 'none' }}>
          <div className="bg-zinc-950/45 border border-zinc-905 p-4 md:p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-yellow-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono">
                  Workspace Memos
                </h3>
              </div>
              <button
                id="btn_add_memo_sidebar"
                onClick={() => {
                  setEditingMemoId(null);
                  setNewMemoTitle('');
                  setNewMemoMessage('');
                  setShowAddMemo(true);
                }}
                className="flex items-center gap-1 px-2 py-1 bg-yellow-500 hover:bg-yellow-450 border border-yellow-600 rounded-lg text-[10px] text-zinc-950 font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Add Memo</span>
              </button>
            </div>

            <p className="text-[11px] text-zinc-500 font-sans">
              Displaying role-specific bulletins and action items synchronized on this calendar board.
            </p>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {calendarMemos && calendarMemos.length > 0 ? (
                calendarMemos.map((memo) => (
                  <div key={memo.id} className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-2 relative group hover:border-zinc-800 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded">
                          {memo.memo_date}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1.5">{memo.title}</h4>
                      </div>
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingMemoId(memo.id);
                            setNewMemoTitle(memo.title);
                            setNewMemoMessage(memo.message);
                            setShowAddMemo(true);
                          }}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
                          title="Edit Memo"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this memo?")) {
                              deleteCalendarMemo(memo.id);
                            }
                          }}
                          className="p-1 hover:bg-zinc-800 rounded text-red-450 hover:text-red-400 transition"
                          title="Delete Memo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed">{memo.message}</p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-zinc-900/20 border border-dashed border-zinc-850 rounded-xl text-zinc-500 text-xs font-mono">
                  No memos recorded for {role}.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 5. ADD memo DIALOG POPUP PORTAL OVERLAY */}
      {showAddMemo && selectedDate && createPortal(
        <div 
          id="dialog_add_memo"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-zinc-900 border border-zinc-800 w-full w-full max-w-lg p-6 rounded-2xl space-y-4 shadow-2xl relative">
            <button
              id="close_dialog_add_memo"
              onClick={() => {
                setShowAddMemo(false);
                setEditingMemoId(null);
                setNewMemoTitle('');
                setNewMemoMessage('');
              }}
              className="absolute right-4 top-4 p-1 hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-mono uppercase text-yellow-500">Office Bulletin board</span>
              <h3 className="text-base font-bold text-white mt-1">
                Record Workspace Memo on <span className="text-yellow-500 font-mono">{selectedDate}</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                This item displays exclusively for the active role ({role}) on the calendar timeline.
              </p>
            </div>

            <form onSubmit={handleSaveMemo} className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase block text-zinc-400">Memo Headline Title</label>
                <input
                  id="memo_input_title"
                  type="text"
                  required
                  placeholder="e.g., Drone battery checkup required"
                  value={newMemoTitle}
                  onChange={(e) => setNewMemoTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-500 h-10 px-3 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase block text-zinc-400">Memo Instructions Context</label>
                <textarea
                  id="memo_input_message"
                  required
                  rows={3}
                  placeholder="Insert staff notifications, specific coordinate shifts, client package upgrades, or delivery notes..."
                  value={newMemoMessage}
                  onChange={(e) => setNewMemoMessage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-500 p-3 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-0 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  id="btn_cancel_memo"
                  type="button"
                  onClick={() => {
                    setShowAddMemo(false);
                    setEditingMemoId(null);
                    setNewMemoTitle('');
                    setNewMemoMessage('');
                  }}
                  className="px-4 py-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn_save_memo"
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-450 border border-yellow-600 text-zinc-950 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Commit Memo
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      
      {/* EVENTS SCHEDULED MODAL FOR A SPECIFIC DATE OR LEAD */}
      {(popupDate || popupLeadId) && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto"
        >
          <div className="bg-zinc-900 border border-zinc-805 w-full w-full max-w-6xl p-6 rounded-2xl shadow-2xl relative space-y-6 my-8">
            <button
              onClick={() => { setPopupDate(null); setPopupLeadId(null); }}
              className="absolute right-4 top-4 p-1.5 hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-black text-white">
                {popupLeadId ? `Event Details` : `Events Scheduled - ${popupDate}`}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-max">
                <thead>
                  <tr className="bg-zinc-950/70 text-zinc-405 font-bold border-b border-zinc-850 text-[10px] uppercase font-mono tracking-wider">
                    {role === 'production' ? (
                      <>
                        <th className="p-3.5 pl-5 text-amber-400">ORDER ID</th>
                        <th className="p-3.5">CUSTOMER NAME</th>
                        <th className="p-3.5">ASSIGNED DATE</th>
                        <th className="p-3.5 text-pink-400">TARGET DELIVERY DATE</th>
                        <th className="p-3.5 pr-5">CURRENT STATUS</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3.5 pl-5">Order ID</th>
                        <th className="p-3.5">Customer Name</th>
                        <th className="p-3.5">Event Name</th>
                        <th className="p-3.5">Current Status</th>
                        {role === 'operations' ? (
                          <th className="p-3.5">Assigned Team</th>
                        ) : (
                          <>
                            <th className="p-3.5">Payment Status</th>
                            <th className="p-3.5 text-right">Outstanding Balance</th>
                          </>
                        )}
                        <th className="p-3.5 text-right pr-5 min-w-[100px] whitespace-nowrap">Action</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {(() => {
                    let leadsToShow = [];
                    if (popupLeadId) {
                      const found = leads.find(l => l.lead_id === popupLeadId);
                      if (found) leadsToShow = [found];
                    } else if (popupDate) {
                      const popupEvs = filteredEvents.filter(e => e.date === popupDate && e.sourceType !== "memo");
                      const leadIds = Array.from(new Set(popupEvs.map(e => e.raw?.lead_id || e.orderId).filter(Boolean)));
                      leadsToShow = leads.filter(l => leadIds.includes(l.lead_id));
                    }

                    if (leadsToShow.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono">No specific event data found.</td>
                        </tr>
                      );
                    }

                    return leadsToShow.map(lead => {
                      const linkedOrder = orders.find((o) => o.lead_id === lead.lead_id);
                      const orderIdDisplay = linkedOrder?.order_id || lead.lead_id;
                      const prodRecord = production?.find(p => p.tracking_id === lead.lead_id || p.order_id === lead.lead_id || p.tracking_id === orderIdDisplay || (p as any).order_id === orderIdDisplay);

                      if (role === 'production') {
                        const customerName = lead.customer_name || linkedOrder?.client_name || '—';
                        const assignedDate = getProductionAssignedDate(orderIdDisplay, lead.lead_id, prodRecord, editorAssignments);
                        const targetDeliveryDate = formatDateDMY(prodRecord?.target_delivery_date || prodRecord?.expected_delivery_date || lead.delivery_target_date || popupDate);
                        const currentStatus = prodRecord?.production_status || prodRecord?.editing_status || linkedOrder?.current_stage || lead.status || 'Active';

                        return (
                          <tr 
                            key={lead.lead_id} 
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent("calendar-action-click", { detail: { leadId: lead.lead_id, role, orderId: orderIdDisplay } }));
                              window.dispatchEvent(new CustomEvent("calendar-action-click-deferred", { detail: { leadId: lead.lead_id, role, orderId: orderIdDisplay } }));
                              setPopupDate(null);
                              setPopupLeadId(null);
                            }}
                            className="hover:bg-zinc-900/30 text-zinc-300 transition-all cursor-pointer"
                          >
                            <td className="p-3.5 pl-5 font-mono text-[11px] font-bold text-amber-400">
                              {orderIdDisplay}
                            </td>
                            <td className="p-3.5 font-bold text-white">
                              {customerName}
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-zinc-300">
                              {assignedDate}
                            </td>
                            <td className="p-3.5 font-mono text-[11px] font-bold text-pink-400">
                              {targetDeliveryDate}
                            </td>
                            <td className="p-3.5 pr-5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-zinc-800 text-amber-300 border border-zinc-700">
                                {currentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      const paymentRecord = payments?.find(p => p.order_id === orderIdDisplay || p.lead_id === lead.lead_id);
                      const assigns = staffAssignments ? staffAssignments.filter(x => x.order_id === lead.lead_id || x.order_id === orderIdDisplay) : [];

                      const currentStatus = linkedOrder?.current_stage || prodRecord?.editing_status || lead.status || "Active";
                      const staffNames = assigns.filter(a => a.speciality !== "Lead Editor" && a.speciality !== "Editor").map(a => `${a.staff_name} (${a.speciality || "Staff"})`).join(", ") || "Unassigned";
                      const editorName = prodRecord?.editor_assigned || prodRecord?.editor_name || assigns.find(a => a.speciality === "Lead Editor" || a.speciality === "Editor" || a.role === "Production")?.staff_name || "Unassigned";
                      
                      const paymentStatus = paymentRecord?.payment_status || (paymentRecord && paymentRecord.balance_due === 0 ? "Fully Paid" : "Pending");
                      const balanceDue = paymentRecord?.balance_due ?? linkedOrder?.balance_amount ?? 0;

                      return (
                        <tr key={lead.lead_id} className="hover:bg-zinc-900/30 text-zinc-300 transition-all">
                          <td className="p-3.5 pl-5 font-mono text-[11px] font-bold text-amber-400">
                            {orderIdDisplay}
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {lead.customer_name}
                          </td>
                          <td className="p-3.5 text-zinc-300 font-sans">
                            {lead.custom_event_name || lead.event_type || (lead.events && lead.events[0]?.event_name) || "Shoot Event"}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-zinc-800 text-amber-300 border border-zinc-700">
                              {currentStatus}
                            </span>
                          </td>
                          {role === 'operations' ? (
                            <td className="p-3.5 font-mono text-[11px] text-indigo-300">
                              {staffNames}
                            </td>
                          ) : (
                            <>
                              <td className="p-3.5 font-mono text-[11px]">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  paymentStatus === "Fully Paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}>
                                  {paymentStatus}
                                </span>
                              </td>
                              <td className="p-3.5 text-right font-mono text-[11px] font-bold text-zinc-200">
                                ₹{Number(balanceDue).toLocaleString("en-IN")}
                              </td>
                            </>
                          )}
                          <td className="p-3.5 text-right pr-5 whitespace-nowrap min-w-[100px]">
                            <button 
                              onClick={() => {
                                handleEventAction({ raw: lead, lead_id: lead.lead_id, orderId: orderIdDisplay });
                              }}
                              className="inline-block px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] rounded-md transition-all shadow-sm cursor-pointer whitespace-nowrap min-w-max"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* TEAM POPUP */}
      {teamPopupEvent && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-in zoom-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full w-full max-w-5xl p-6 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setTeamPopupEvent(null)}
              className="absolute right-4 top-4 p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-white mb-4">Assigned Team: {teamPopupEvent.orderId}</h3>
            
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-mono text-zinc-455 uppercase text-left whitespace-nowrap">
                    <th className="p-3">Role</th>
                    <th className="p-3">Staff Name</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {teamPopupEvent?.raw?.assigns?.map((a: any, idx: number) => (
                    <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="p-3 text-zinc-350">{a.speciality || 'Staff'}</td>
                      <td className="p-3 text-white">{a.staff_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>,
        document.body
      )}
    
      {/* RESPONSIVE SELECTED DATE EVENT POPUP (READ-ONLY TABLE) */}
      {showSelectedDateModal && selectedDate && createPortal(
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { e.stopPropagation(); setShowSelectedDateModal(false); }}
        >
          <div 
            className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-800/80 shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block font-bold">
                  EVENT DETAILS
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-200 font-mono mt-0.5 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-yellow-500" />
                  {parseLocalDate(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg select-none">
                  {filteredEvents.filter(ev => ev.date === selectedDate).length} EVENTS
                </span>
                <button
                  onClick={() => setShowSelectedDateModal(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body with Responsive Read-Only Table */}
            <div className="p-4 md:p-6 overflow-y-auto">
              {(() => {
                const selectedEvs = filteredEvents.filter(ev => ev.date === selectedDate);
                if (selectedEvs.length === 0) {
                  return (
                    <div className="p-8 text-center bg-zinc-950/40 border border-dashed border-zinc-800/80 rounded-2xl text-zinc-500 text-xs font-mono">
                      No events scheduled for this date.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto w-full border border-zinc-800 rounded-xl bg-zinc-950/60 shadow-inner">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-zinc-850 bg-zinc-950/90 text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-bold">
                          <th className="p-3.5 pl-4">Order ID</th>
                          <th className="p-3.5">Event Name</th>
                          <th className="p-3.5">Customer</th>
                          <th className="p-3.5">Event Date</th>
                          <th className="p-3.5">Event Time</th>
                          <th className="p-3.5">Location</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Target Delivery Date</th>
                          <th className="p-3.5 pr-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850/60 text-xs font-sans">
                        {selectedEvs.map((ev, idx) => {
                          const orderDisplayId = ev.orderId || ev.raw?.order_id || ev.raw?.tracking_id || ev.raw?.lead_id || '—';
                          const evName = ev.eventName || ev.raw?.event_name || ev.eventType || 'Event';
                          const evDate = formatDateDMY(ev.raw?.event_date || ev.date);
                          const evTime = ev.eventTime || ev.raw?.event_start_time || '10:00 AM';
                          const custName = ev.customerName || ev.raw?.customer_name || '—';
                          const location = ev.eventLocation || ev.raw?.event_location || '—';
                          const status = ev.currentStage || ev.eventClass || ev.raw?.status || 'Active';
                          const targetDelDate = formatDateDMY(ev.targetDeliveryDate || ev.raw?.targetDeliveryDate || ev.raw?.delivery_target_date || ev.raw?.expected_delivery_date || '—');

                          return (
                            <tr 
                              key={ev.id || idx}
                              className="bg-zinc-950/30 hover:bg-zinc-900/40 transition-colors select-text"
                            >
                              <td className="p-3.5 pl-4 font-mono font-bold text-yellow-400">
                                {orderDisplayId}
                              </td>
                              <td className="p-3.5 font-bold text-zinc-100">
                                {evName}
                              </td>
                              <td className="p-3.5 text-zinc-200 font-medium">
                                <div>{custName}</div>
                                {ev.mobile && (
                                  <div className="text-[10px] font-mono text-zinc-500">{ev.mobile}</div>
                                )}
                              </td>
                              <td className="p-3.5 font-mono text-zinc-300 whitespace-nowrap">
                                {evDate}
                              </td>
                              <td className="p-3.5 font-mono text-zinc-300 whitespace-nowrap">
                                {formatTime12Hour(evTime)}
                              </td>
                              <td className="p-3.5 text-zinc-300 max-w-[150px] truncate" title={location}>
                                {location}
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-zinc-800 text-amber-300 border border-zinc-700">
                                  {status}
                                </span>
                              </td>
                              <td className="p-3.5 font-mono font-bold text-pink-400 whitespace-nowrap">
                                {targetDelDate}
                              </td>
                              <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleEventAction(ev);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-mono text-[11px] font-bold border border-zinc-700 transition cursor-pointer"
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
