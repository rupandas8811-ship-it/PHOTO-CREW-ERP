import React, { useState, useMemo, useEffect } from 'react';
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
import { formatINR, formatTime12Hour } from '../utils';
import { EVENT_TYPES, ACTIVE_STAGE_GROUPS } from '../types';

interface UnifiedCalendarProps {
  role: 'sales' | 'operations' | 'production' | 'owner' | 'worker';
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

const parseLocalDate = (dateStr: string | Date | null | undefined): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
};

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({ role }) => {
  const { 
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
  const [searchQuery, setSearchQuery] = useState('');
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
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

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

      leads.forEach(ld => {
        if (!ld) return;
        // Display only leads where:
        const statusClean = (ld.status || ld.current_status || '').trim();
        
        // Define stages
        const opsStages = ['Order Confirmed', 'Event Scheduled', 'Operations Assigned', 'Event Started', 'Event Ended', 'Event Completed'];
        const prodStages = ['Verified Footage', 'Footage Handover Verified', 'Raw Footage Received', 'Assigned Editor', 'Editing Started', 'Editing In Progress', 'Customer Review', 'Editing Completed'];
        const postProdStages = ['Delivered', 'Client Acceptance', 'Business Owner Review', 'Closed', 'Project Closed', 'Order Closed', 'Project Completed', 'Completed', 'Approved', 'Project Delivered'];
        
        let isVisible = false;

        if (role === 'sales' || role === 'owner') {
          // Visible from Order Confirmed through Closed
          isVisible = opsStages.includes(statusClean) || prodStages.includes(statusClean) || postProdStages.includes(statusClean);
        } else if (role === 'operations') {
          // Operations (and operations staff): Order Confirmed to Event Completed
          isVisible = opsStages.includes(statusClean);
        } else if (role === 'production') {
          // Production (and production staff): Verified Footage to Editing Completed
          isVisible = prodStages.includes(statusClean);
        } else {
          // Fallback
          isVisible = opsStages.includes(statusClean) || prodStages.includes(statusClean);
        }

        if (!isVisible) return;

        // 2. Fetch events from ld.events or fall back to lead-level event if no events are saved
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

        // Find production record for Target Delivery Date (if any)
        const ord = orders?.find(o => o.lead_id === ld.lead_id);
        const orderId = ord?.order_id || ld.lead_id;
        const prodRecord = production?.find(p => p.tracking_id === ld.lead_id || p.order_id === ld.lead_id || p.tracking_id === orderId || (p as any).order_id === orderId);
        const targetDeliveryDate = prodRecord?.expected_delivery_date || prodRecord?.target_delivery_date || ld.delivery_target_date || '';

        // Find staff assignments
        const assigns = staffAssignments ? staffAssignments.filter(x => 
          x.order_id === ld.lead_id || 
          x.order_id === orderId || 
          (x as any).lead_id === ld.lead_id
        ) : [];
        const uniqueStaff = new Set(assigns.map(a => a.staff_name));
        const assignedTeamCount = uniqueStaff.size;

        eventsList.forEach((ev, index) => {
          if (!ev) return;
          const evDate = ev.event_date || ld.event_date || '';
          if (!evDate) return; // skip if no date at all

          const evStartTime = ev.event_start_time || ev.event_time || ld.event_time || '10:00 AM';
          const evName = ev.event_name || ld.custom_event_name || ld.event_type || 'Event Shoot';
          const evType = ev.event_type || ld.event_type || 'Shoot';
          const evLoc = ev.event_location || ld.event_location || 'Studio';

          events.push({
            id: `lead-event-${ld.lead_id}-${index}-${ev.id || 'idx'}`,
            sourceType: 'order',
            eventClass: 'Event Scheduled',
            date: evDate,
            customerName: ld.customer_name,
            mobile: ld.mobile,
            eventType: evType,
            eventTime: evStartTime,
            eventLocation: evLoc,
            currentStage: ld.status,
            notes: 'On Track',
            packageName: ld.Select_Package_Option || 'Custom Package',
            totalAmount: ld.package_price || ld.budget || 0,
            orderId: ld.lead_id, // Map lead_id to orderId for compatibility
            targetDeliveryDate: targetDeliveryDate,
            raw: {
              ...ld,
              ...ev,
              lead_id: ld.lead_id,
              order_id: ld.lead_id,
              event_name: evName,
              event_type: evType,
              event_date: evDate,
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

      if (calendarMemos) {
        calendarMemos.forEach((memo) => {
          events.push({
            id: memo.id,
            sourceType: 'memo',
            eventClass: 'Calendar Memo',
            date: memo.memo_date,
            customerName: memo.title,
            mobile: '',
            eventType: 'Memo',
            eventTime: '',
            eventLocation: '',
            currentStage: 'Active',
            notes: memo.message,
            packageName: '',
            totalAmount: 0,
            orderId: memo.id,
            targetDeliveryDate: '',
            raw: { ...memo }
          });
        });
      }

      return events;
    } catch (err: any) {
      console.error("Error computing calendar events:", err);
      // Fail-safe error state
      if (!calendarError) {
        setCalendarError(err.message || "Unknown error occurred while parsing database events.");
      }
      return [];
    }
  }, [leads, orders, production, staffAssignments, calendarMemos]);

  // Filters Event list by role first
  const roleFilteredEvents = useMemo(() => {
    return allEvents;
  }, [allEvents, role]);

  // Inline filter by search, type, and classes
  const filteredEvents = useMemo(() => {
    return roleFilteredEvents.filter(ev => {
      // Search text query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = ev.customerName.toLowerCase().includes(query);
        const matchesLoc = ev.eventLocation.toLowerCase().includes(query);
        const matchesType = ev.eventType.toLowerCase().includes(query);
        const matchesNotes = ev.notes?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesLoc && !matchesType && !matchesNotes) return false;
      }

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
  }, [roleFilteredEvents, searchQuery, statusFilter, eventTypeFilter]);



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
      
      {/* 1. Header Navigation Bar (Controls only) */}
      {role !== 'operations' && (
      <div hidden={role === 'sales'} className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl shadow-xl">
        {calendarError && (
          <div className="w-full p-2.5 bg-red-950/60 border border-red-500/30 rounded-lg text-xs text-red-200 flex items-center justify-between gap-2">
            <span>{calendarError}</span>
            <button 
              onClick={() => setCalendarError(null)}
              className="text-red-400 hover:text-white font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View selection controls replaced with title */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-black font-mono tracking-tight text-white uppercase">Calendar Timeline</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn_cal_today"
            onClick={handleSetToday}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 transition-all cursor-pointer"
          >
            Today
          </button>

          {selectedDate && (
            <button
              id="btn_add_memo"
              onClick={() => {
                setEditingMemoId(null);
                setNewMemoTitle('');
                setNewMemoMessage('');
                setShowAddMemo(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-450 border border-yellow-600 rounded-xl text-xs text-zinc-950 font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              Assign Memo
            </button>
          )}
        </div>
      </div>

      )}
      {/* 3. Filtering and Custom Parameters Console */}
      <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              id="cal_search_input"
              type="text"
              placeholder="Search client name, venue coordinates, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-850 focus:border-yellow-500 h-9 pl-9 pr-4 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-all"
            />
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

      {/* 4. Secondary Row: Main Screen Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Main viewport calendar area */}
        <div className="lg:col-span-2 bg-zinc-950/45 border border-zinc-905 p-3 sm:p-4 md:p-6 rounded-2xl shadow-xl space-y-4 md:space-y-6 relative">
          {isDataLoading && (
            <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-50">
              <div className="flex flex-col items-center gap-3 bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-2xl animate-fade-in">
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-zinc-300 font-mono">Loading calendar events...</span>
              </div>
            </div>
          )}
          
          {/* Calendar Controller Month Toggle Banner (Desktop) */}
          <div className="hidden md:flex justify-between items-center border-b border-zinc-900 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <span className="text-yellow-500 font-mono tracking-tight text-lg">
                {monthNames[currentMonth]}
              </span>
              <span className="text-zinc-500 text-lg font-light">{currentYear}</span>
            </h2>

            <div className="flex items-center gap-1">
              <button
                id="btn_cal_prev_month"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-zinc-900 rounded-xl border border-zinc-850 hover:border-zinc-700 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-350" />
              </button>
              <button
                id="btn_cal_next_month"
                onClick={handleNextMonth}
                className="p-2 hover:bg-zinc-900 rounded-xl border border-zinc-850 hover:border-zinc-700 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-zinc-350" />
              </button>
            </div>
          </div>

          {/* RENDERING VIEWS */}
          {calendarView === 'month' && (
            <div className="animate-fade-in space-y-4">
              {/* DESKTOP MONTH VIEW (hidden md:block) */}
              <div className="hidden md:block space-y-2">
                {/* Days header row */}
                <div className="grid grid-cols-7 text-center border-b border-zinc-900 pb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                    <span key={i} className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Month Boxes Matrix Grid - 42 Squares */}
                <div className="grid grid-cols-7 gap-1 md:gap-1.5 h-[500px]">
                  {gridDays.map((cell, idx) => {
                    const evs = filteredEvents.filter(ev => ev.date === cell.dateString);
                    const isSelected = selectedDate === cell.dateString;
                    const isTodayStr = cell.dateString === todayStr;
                    const isTomorrowStr = cell.dateString === tomorrowStr;

                    // Check if there are events on this date
                    const hasEvents = evs.length > 0;
                    // Get highest urgency highlight status
                    const dayHighlight = hasEvents ? getCellUrgencyHighlight(evs) : null;

                    // Define background & styling classes
                    let cellClasses = "relative flex flex-col justify-between p-1.5 md:p-2 rounded-xl border transition-all cursor-pointer select-none overflow-hidden h-full group";
                    
                    if (hasEvents && dayHighlight) {
                      cellClasses += ` ${dayHighlight.cellBg} ${dayHighlight.glow}`;
                    } else {
                      cellClasses += cell.isCurrentMonth ? ' bg-zinc-950/40' : ' bg-zinc-950/5 text-zinc-650 opacity-40';
                    }

                    // Border styling hierarchy
                    if (isSelected) {
                      cellClasses += ' border-yellow-500 ring-2 ring-yellow-500/20';
                    } else if (isTomorrowStr && hasEvents) {
                      // Tomorrow has orange border
                      cellClasses += ' border-orange-500 border-2 shadow-[0_0_12px_rgba(249,115,22,0.2)] bg-orange-950/10';
                    } else if (isTodayStr && hasEvents) {
                      // Today glows
                      cellClasses += ' border-emerald-500 border shadow-[0_0_18px_rgba(34,197,94,0.35)] ring-1 ring-emerald-500/30';
                    } else if (hasEvents && dayHighlight) {
                      if (dayHighlight.name === 'Overdue Event') {
                        cellClasses += ' border-red-500/40';
                      } else if (dayHighlight.name === 'Event Tomorrow') {
                        cellClasses += ' border-orange-500/30';
                      } else if (dayHighlight.name === 'Event Today') {
                        cellClasses += ' border-emerald-500/30';
                      } else if (dayHighlight.name === 'Event In Progress') {
                        cellClasses += ' border-cyan-500/35';
                      } else if (dayHighlight.name === 'Event Completed') {
                        cellClasses += ' border-green-950';
                      } else {
                        cellClasses += ' border-blue-500/35';
                      }
                    } else {
                      cellClasses += ' border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/30';
                    }

                    return (
                      <div
                        key={idx}
                        id={`cell_day_${cell.dateString || idx}`}
                        onClick={() => {
                          if (cell.dateString) {
                            setSelectedDate(cell.dateString);
                            const evsForDate = filteredEvents.filter(e => e.date === cell.dateString);
                            if (evsForDate.length > 0) {
                              setPopupDate(cell.dateString);
                            }
                          }
                        }}
                        className={cellClasses}
                      >
                        {/* Day number cell badge */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-mono font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                              isTodayStr 
                                ? 'bg-yellow-500 text-zinc-950 font-black shadow-[0_0_10px_rgba(234,179,8,0.4)]' 
                                : isSelected ? 'text-yellow-500' : 'text-zinc-400 group-hover:text-zinc-100'
                            }`}>
                              {cell.dayNumber}
                            </span>

                            {isTodayStr && (
                              <span className="text-[7px] font-mono font-bold leading-none uppercase bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded border border-emerald-500/30 animate-pulse shrink-0">
                                TODAY
                              </span>
                            )}

                            {isTomorrowStr && (
                              <span className="text-[7px] font-mono font-bold leading-none uppercase bg-orange-500/20 text-orange-400 px-1 py-0.5 rounded border border-orange-500/30 shrink-0">
                                TOMORROW
                              </span>
                            )}
                          </div>

                          {evs.length > 0 && (
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-md border font-extrabold ${
                              isTodayStr 
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800/40' 
                                : isTomorrowStr 
                                  ? 'bg-orange-950 text-orange-400 border-orange-850/40'
                                  : 'bg-zinc-900 text-zinc-350 border-zinc-800'
                            }`}>
                              {evs.length} {evs.length === 1 ? 'Ev' : 'Evs'}
                            </span>
                          )}
                        </div>

                        {/* Display Customer/Event Name immediately without clicking (visible on desktop) */}
                        <div className="space-y-1.5 mt-1.5 overflow-hidden max-h-[84px]">
                          {evs.slice(0, 3).map((ev) => {
                            const h = getEventHighlights(ev);
                            return (
                              <div
                                key={ev.id}
                                id={`micro_evt_${ev.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (ev.sourceType === 'memo') {
                                    setNewMemoTitle(ev.customerName);
                                    setNewMemoMessage(ev.notes || '');
                                    setEditingMemoId(ev.id);
                                    setSelectedDate(ev.date);
                                    setShowAddMemo(true);
                                  } else {
                                    setPopupLeadId(ev.raw?.lead_id || ev.orderId);
                                  }
                                }}
                                className={`${h.bg} ${h.glow} text-[9px] p-1.5 rounded-lg border transition-all duration-150 hover:scale-[1.03] flex flex-col gap-0.5 cursor-pointer`}
                              >
                                <div className="flex justify-between items-center gap-1">
                                  <span className="font-extrabold text-zinc-100 break-words max-w-[65%]">
                                    {ev.customerName}
                                  </span>
                                  <span className="text-[7px] font-mono leading-none font-bold uppercase py-0.5 px-1 bg-zinc-950/80 rounded border border-zinc-850 text-yellow-500 shrink-0 break-words max-w-[35%]">
                                    {ev.currentStage || ev.eventClass}
                                  </span>
                                </div>
                                {role === 'production' ? (
                                  <>
                                    {ev.orderId && (
                                      <div className="text-[7px] font-mono text-zinc-400">Order ID: {ev.orderId}</div>
                                    )}
                                    <div className="text-[7.5px] opacity-75 font-mono flex items-center justify-between gap-1">
                                      <span className="break-words max-w-[60%]">{ev.eventType}</span>
                                      <span className="text-pink-400 font-bold shrink-0">{ev.targetDeliveryDate || ev.date}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-[7.5px] opacity-75 font-mono flex items-center justify-between gap-1">
                                    <span className="break-words max-w-[60%]">{ev.eventType}</span>
                                    <span className="text-zinc-400 font-bold shrink-0">{ev.eventTime}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {evs.length > 3 && (
                            <div className="text-[8px] font-mono text-zinc-400 pl-1 font-bold animate-pulse">
                              ● +{evs.length - 3} more scheduled
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MOBILE MONTH VIEW (md:hidden) */}
              <div className="md:hidden space-y-4">
                {/* 1. Mobile Month Header */}
                <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl">
                  <button
                    id="btn_mobile_cal_prev"
                    onClick={handlePrevMonth}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white active:bg-zinc-800 shrink-0 cursor-pointer"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-white tracking-wide font-mono">
                      {monthNames[currentMonth]} {currentYear}
                    </span>
                    <button
                      id="btn_mobile_cal_today"
                      onClick={handleSetToday}
                      className="text-[10px] font-mono font-bold uppercase text-yellow-500 hover:text-yellow-400 mt-0.5 px-2.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 active:scale-95 transition cursor-pointer"
                    >
                      TODAY
                    </button>
                  </div>

                  <button
                    id="btn_mobile_cal_next"
                    onClick={handleNextMonth}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white active:bg-zinc-800 shrink-0 cursor-pointer"
                    aria-label="Next Month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* 2. Mobile Weekday Header */}
                <div className="grid grid-cols-7 text-center font-mono text-[10px] sm:text-[11px] font-extrabold uppercase text-zinc-400 py-1">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                {/* 3. Mobile 7-Column Grid */}
                <div className="grid grid-cols-7 gap-1 w-full max-w-full">
                  {gridDays.map((cell, idx) => {
                    const evs = filteredEvents.filter(ev => ev.date === cell.dateString);
                    const isSelected = selectedDate === cell.dateString;
                    const isTodayStr = cell.dateString === todayStr;

                    let cellStyle = "flex flex-col items-center justify-start py-1.5 px-0.5 rounded-xl border min-h-[46px] transition-all cursor-pointer select-none touch-manipulation relative";

                    if (isSelected) {
                      cellStyle += " bg-zinc-900 border-yellow-500 ring-2 ring-yellow-500/30";
                    } else if (isTodayStr) {
                      cellStyle += " bg-emerald-950/20 border-emerald-500/50";
                    } else if (cell.isCurrentMonth) {
                      cellStyle += " bg-zinc-950/50 border-zinc-900 active:bg-zinc-850";
                    } else {
                      cellStyle += " bg-zinc-950/20 border-zinc-900/50 opacity-30 text-zinc-600";
                    }

                    return (
                      <div
                        key={idx}
                        id={`mobile_cell_${cell.dateString || idx}`}
                        onClick={() => {
                          if (cell.dateString) {
                            setSelectedDate(cell.dateString);
                          }
                        }}
                        className={cellStyle}
                      >
                        {/* Date Number Badge */}
                        <span
                          className={`text-xs font-mono font-extrabold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                            isTodayStr
                              ? "bg-yellow-500 text-zinc-950 font-black shadow-[0_0_8px_rgba(234,179,8,0.5)]"
                              : isSelected
                              ? "text-yellow-500 font-black"
                              : cell.isCurrentMonth
                              ? "text-zinc-200"
                              : "text-zinc-600"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Event Dots/Indicators */}
                        {evs.length > 0 && (
                          <div className="flex items-center justify-center gap-1 mt-1 flex-wrap max-w-full">
                            {evs.slice(0, 3).map((ev) => {
                              const h = getEventHighlights(ev);
                              return (
                                <span
                                  key={ev.id}
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.dot}`}
                                />
                              );
                            })}
                            {evs.length > 3 && (
                              <span className="text-[8px] font-mono font-bold text-yellow-500 leading-none">
                                +{evs.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 4. Selected Date Events Section below Calendar */}
                <div className="mt-4 pt-4 border-t border-zinc-850 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">
                        SELECTED DATE
                      </span>
                      <h3 className="text-sm font-extrabold text-white font-mono mt-0.5">
                        {selectedDate
                          ? parseLocalDate(selectedDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'No date selected'}
                      </h3>
                    </div>
                    {selectedDate && (
                      <span className="text-xs font-mono font-bold px-2.5 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg">
                        {filteredEvents.filter(ev => ev.date === selectedDate).length} EVENTS
                      </span>
                    )}
                  </div>

                  {/* Event Agenda Cards for Selected Date */}
                  <div className="space-y-2.5">
                    {(() => {
                      const selectedEvs = filteredEvents.filter(ev => ev.date === selectedDate);
                      if (selectedEvs.length === 0) {
                        return (
                          <div className="p-4 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-mono">
                            No events scheduled for this date.
                          </div>
                        );
                      }

                      return selectedEvs.map((ev) => {
                        const col = getColorClasses(ev.eventClass);
                        return (
                          <div
                            key={ev.id}
                            id={`mobile_ev_card_${ev.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (ev.sourceType === 'memo') {
                                setNewMemoTitle(ev.customerName);
                                setNewMemoMessage(ev.notes || '');
                                setEditingMemoId(ev.id);
                                setSelectedDate(ev.date);
                                setShowAddMemo(true);
                              } else {
                                setPopupLeadId(ev.raw?.lead_id || ev.orderId);
                              }
                            }}
                            className={`p-3.5 rounded-xl border flex flex-col gap-2 transition active:scale-[0.98] cursor-pointer ${col.card}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-mono font-extrabold text-yellow-400">
                                <Clock className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                                <span>{ev.eventTime || (ev.targetDeliveryDate ? `Due: ${ev.targetDeliveryDate}` : '10:00 AM')}</span>
                              </div>
                              <span className={`text-[9px] font-mono px-2 py-0.5 border rounded-md font-bold uppercase ${col.badge}`}>
                                {ev.currentStage || ev.eventClass}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-white tracking-wide">
                                {ev.customerName}
                              </h4>
                              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                {ev.eventType} {ev.packageName ? `• ${ev.packageName}` : ''}
                              </p>
                            </div>

                            {ev.eventLocation && (
                              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                <span className="truncate">{ev.eventLocation}</span>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
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
                      key={dIdx}
                      onClick={() => {
                        if (day.dateStr) {
                          const evsForDate = filteredEvents.filter(e => e.date === day.dateStr);
                          if (evsForDate.length > 0) {
                            setPopupDate(day.dateStr);
                          } else {
                            setSelectedDate(day.dateStr);
                          }
                        }
                      }}
                      className={`min-h-[250px] bg-zinc-950/20 border rounded-2xl p-3 flex flex-col transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-yellow-500 bg-zinc-900/40 ring-1 ring-yellow-500/10' 
                          : 'border-zinc-900 hover:border-zinc-805 hover:bg-zinc-900/10'
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
  if (ev.sourceType === 'memo') {
    setNewMemoTitle(ev.customerName);
    setNewMemoMessage(ev.notes || '');
    setEditingMemoId(ev.id);
    setSelectedDate(ev.date);
    setShowAddMemo(true);
  } else {
    setPopupLeadId(ev.raw?.lead_id || ev.orderId);
  }
}}
                                className={`p-2 rounded-xl text-xs flex flex-col gap-1 transition ${col.card}`}
                              >
                                <span className="font-bold text-zinc-100 line-clamp-1">{ev.customerName}</span>
                                {role === 'production' ? (
                                  <>
                                    {ev.orderId && (
                                      <span className="text-[9px] font-mono text-zinc-400">Order ID: {ev.orderId}</span>
                                    )}
                                    <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>{ev.eventType}</span>
                                    </div>
                                    <div className="text-[9px] font-mono text-pink-400 font-bold">Due: {ev.targetDeliveryDate || ev.date}</div>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{ev.eventTime}</span>
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
  if (ev.sourceType === 'memo') {
    setNewMemoTitle(ev.customerName);
    setNewMemoMessage(ev.notes || '');
    setEditingMemoId(ev.id);
    setSelectedDate(ev.date);
    setShowAddMemo(true);
  } else {
    setPopupLeadId(ev.raw?.lead_id || ev.orderId);
  }
}}
                        className={`p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer ${col.card}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded-md border border-zinc-800">
                              {ev.eventType}
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
                                <span>{ev.eventTime}</span>
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
  if (ev.sourceType === 'memo') {
    setNewMemoTitle(ev.customerName);
    setNewMemoMessage(ev.notes || '');
    setEditingMemoId(ev.id);
    setSelectedDate(ev.date);
    setShowAddMemo(true);
  } else {
    setPopupLeadId(ev.raw?.lead_id || ev.orderId);
  }
}}
                          className={`p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition cursor-pointer ${col.card}`}
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
                                  {ev.eventType}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white">
                                {ev.customerName}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-450 font-mono">
                                <Clock className="w-3 h-3 text-zinc-650" />
                                <span>{ev.eventTime}</span>
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

        {/* RIGHT COLUMN: Workspace Memos Board */}
        <div className="lg:col-span-1 space-y-6">
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
      {showAddMemo && selectedDate && (
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
        </div>
      )}


      
      {/* EVENTS SCHEDULED MODAL FOR A SPECIFIC DATE OR LEAD */}
      {(popupDate || popupLeadId) && (
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
                    <th className="p-3.5 pl-5">Order ID</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Event Name</th>
                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Assigned Staff</th>
                    <th className="p-3.5">Assigned Editor</th>
                    <th className="p-3.5">Payment Status</th>
                    <th className="p-3.5 text-right">Outstanding Balance</th>
                    <th className="p-3.5 text-right pr-5 w-[100px]">Action</th>
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
                          <td colSpan={9} className="p-8 text-center text-zinc-500 font-mono">No specific event data found.</td>
                        </tr>
                      );
                    }

                    return leadsToShow.map(lead => {
                      const linkedOrder = orders.find((o) => o.lead_id === lead.lead_id);
                      const orderIdDisplay = linkedOrder?.order_id || lead.lead_id;
                      const prodRecord = production?.find(p => p.tracking_id === lead.lead_id || p.order_id === lead.lead_id || p.tracking_id === orderIdDisplay || (p as any).order_id === orderIdDisplay);
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
                          <td className="p-3.5 text-zinc-300 text-[11px]">
                            {staffNames}
                          </td>
                          <td className="p-3.5 text-amber-300 font-medium text-[11px]">
                            {editorName}
                          </td>
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
                          <td className="p-3.5 text-right pr-5">
                            <button 
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent("calendar-action-click", { detail: { leadId: lead.lead_id, role, orderId: orderIdDisplay } }));
                                window.dispatchEvent(new CustomEvent("calendar-action-click-deferred", { detail: { leadId: lead.lead_id, role, orderId: orderIdDisplay } }));
                                setPopupDate(null);
                                setPopupLeadId(null);
                              }}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded transition shadow whitespace-nowrap"
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
        </div>
      )}

      {/* TEAM POPUP */}
      {teamPopupEvent && (
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
        </div>
      )}
    </div>
  );
};
