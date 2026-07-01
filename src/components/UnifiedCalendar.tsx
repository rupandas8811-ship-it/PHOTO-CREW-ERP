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
  HelpCircle
} from 'lucide-react';
import { formatINR, formatTime12Hour } from '../utils';
import { EVENT_TYPES } from '../types';

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
    | 'Delivery Due' 
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
    logs,
    staffAssignments
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
  
  // Tab states
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  
  // Memo form overlay state
  const [showAddMemo, setShowAddMemo] = useState(false);
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newMemoMessage, setNewMemoMessage] = useState('');
  
  const todayStr = systemTodayStr; // Anchor date for relative analysis

  const tomorrowDate = new Date(systemToday);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrowDate);

  // Highlight Mapper to map status/class to custom color themes
  const getEventHighlights = (ev: CalendarEvent) => {
    const isCompleted = ['Event Completed', 'Raw Footage Received', 'Delivered', 'Paid', 'Closed'].includes(ev.currentStage);
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
  const parseFollowUpDate = (remarks: string | undefined): string | null => {
    if (!remarks) return null;
    const match = remarks.match(/Next follow-up:\s*(\d{4}-\d{2}-\d{2})/i);
    return match && match[1] ? match[1] : null;
  };

  // Convert raw records into a standardized structure
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Helper for determining Overdue status
    const isDateOverdue = (dateStr: string) => {
      return dateStr < todayStr;
    };

    // 1. Parse Leads (Relevant for Sales, Owners)
    leads.forEach(l => {
      // Event Date Event
      let eventClass: CalendarEvent['eventClass'] = 'New Lead';
      if (l.status === 'Follow Up') eventClass = 'Follow-up';
      else if (l.status === 'Quotation Sent') eventClass = 'Quotation Sent';
      else if (l.status === 'New Lead') eventClass = 'New Lead';
      else if (l.status === 'Negotiation') eventClass = 'Quotation Sent';

      events.push({
        id: `lead-shoot-${l.lead_id}`,
        sourceType: 'lead',
        eventClass,
        date: l.event_date,
        customerName: l.customer_name,
        mobile: l.mobile,
        eventType: l.event_type || 'Shoot Event',
        eventTime: l.event_time || '10:00 AM',
        eventLocation: l.event_location || 'Unknown',
        currentStage: l.status,
        notes: l.remarks || 'No notes defined.',
        packageName: 'Custom Estimate',
        totalAmount: l.budget || 0,
        raw: l
      });

      // Follow-up Target Date Event
      const fDate = parseFollowUpDate(l.remarks);
      if (fDate) {
        events.push({
          id: `lead-follow-${l.lead_id}`,
          sourceType: 'lead',
          eventClass: isDateOverdue(fDate) && l.status !== 'Closed' ? 'Overdue' : 'Follow-up',
          date: fDate,
          customerName: l.customer_name,
          mobile: l.mobile,
          eventType: 'Follow-up Call',
          eventTime: '11:00 AM',
          eventLocation: 'Phone Call Sessions',
          currentStage: l.status,
          notes: `Call notes: ${l.remarks}`,
          packageName: 'N/A',
          totalAmount: l.budget || 0,
          raw: l
        });
      }
    });

    // 2. Parse Confirmed Orders (Relevant for Sales, Operations, Production, Owners)
    orders.forEach(o => {
      const op = operations.find(x => x.order_id === o.order_id);
      
      const assigns = staffAssignments ? staffAssignments.filter(x => x.order_id === o.order_id) : [];
      const assignedPhotographers = assigns.filter(a => a.staff_role.toLowerCase().includes('photographer')).map(a => a.staff_name).join(', ');
      const assignedVideographers = assigns.filter(a => a.staff_role.toLowerCase().includes('videographer')).map(a => a.staff_name).join(', ');
      const assignedDrones = assigns.filter(a => a.staff_role.toLowerCase().includes('drone') || a.staff_role.toLowerCase().includes('aerial')).map(a => a.staff_name).join(', ');
      const assignedAssistants = assigns.filter(a => a.staff_role.toLowerCase().includes('assistant')).map(a => a.staff_name).join(', ');

      let eventClass: CalendarEvent['eventClass'] = 'Booking Confirmed';
      if (o.current_stage === 'Event Scheduled' || o.current_stage === 'Operations Assigned') {
        eventClass = 'Event Scheduled';
      } else if (o.current_stage === 'Event Completed') {
        eventClass = 'Event Completed';
      } else if (o.current_stage === 'Order Confirmed') {
        eventClass = 'Booking Confirmed';
      } else if (o.current_stage === 'Raw Footage Received') {
        eventClass = 'Raw Footage Pending';
      }

      events.push({
        id: `order-shoot-${o.order_id}`,
        sourceType: 'order',
        eventClass,
        date: o.event_date,
        customerName: o.customer_name,
        mobile: o.mobile,
        eventType: o.event_type,
        eventTime: o.event_time || '10:00 AM',
        eventLocation: o.event_location,
        currentStage: o.current_stage,
        notes: op?.remarks || 'Awaiting dispatch confirmation.',
        packageName: o.package_name || 'Standard Bundle',
        totalAmount: o.quotation_amount || 0,
        
        // Crew assigned details
        photographer: assignedPhotographers || op?.photographer_assigned,
        videographer: assignedVideographers || op?.videographer_assigned,
        drone: assignedDrones || op?.drone_operator_assigned,
        assistant: assignedAssistants || op?.assistant_assigned,
        kit: op?.equipment_kit,
        reportingTime: op?.reporting_time,
        raw: o
      });
    });

    // 3. Parse Production/Editing Tracks (Relevant for Production, Owners)
    production.forEach(p => {
      const rf = rawFootage.find(x => x.tracking_id === p.tracking_id);
      const o = rf ? orders.find(x => x.order_id === rf.order_id) : null;
      if (!o) return;

      const editDue = p.expected_delivery_date || p.target_delivery_date;

      // Editing start date
      if (p.editing_start_date) {
        events.push({
          id: `prod-start-${p.production_id}`,
          sourceType: 'production',
          eventClass: 'Editing In Progress',
          date: p.editing_start_date,
          customerName: o.customer_name,
          mobile: o.mobile,
          eventType: `Post Production: ${o.event_type}`,
          eventTime: '09:00 AM',
          eventLocation: 'Production Cloud Center',
          currentStage: p.editing_status,
          notes: p.remarks || 'No editor details log.',
          editor: p.editor_assigned,
          editingStatus: p.editing_status,
          expectedDeliveryDate: editDue,
          targetDeliveryDate: editDue,
          orderId: o.order_id,
          raw: p
        });
      }

      // Final delivery target date
      if (editDue) {
        const isOverdue = isDateOverdue(editDue) && !['Delivered', 'Closed', 'Approved'].includes(p.editing_status);
        events.push({
          id: `prod-due-${p.production_id}`,
          sourceType: 'production',
          eventClass: isOverdue ? 'Overdue' : 'Delivery Due',
          date: editDue,
          customerName: o.customer_name,
          mobile: o.mobile,
          eventType: `Delivery Target: ${o.event_type}`,
          eventTime: '06:00 PM',
          eventLocation: 'Digital Delivery Desk',
          currentStage: p.editing_status,
          notes: p.remarks || 'Verify asset export criteria.',
          editor: p.editor_assigned,
          editingStatus: p.editing_status,
          expectedDeliveryDate: editDue,
          targetDeliveryDate: editDue,
          orderId: o.order_id,
          raw: p
        });
      }
    });

    // 4. Parse Memos/Notifications of Calendar type
    notifications
      .filter(n => n.notification_type === 'Calendar Memo')
      .forEach(m => {
        // We can segment memos based on recipient or author role
        const dateVal = m.project_id; // stores "YYYY-MM-DD"
        if (!dateVal) return;

        // Skip other role-specific memos unless owner view
        if (role === 'sales' && m.recipient_role === 'Operations Team') return;
        if (role === 'sales' && m.recipient_role === 'Production Team') return;
        if (role === 'operations' && m.recipient_role === 'Sales Team') return;
        if (role === 'operations' && m.recipient_role === 'Production Team') return;
        if (role === 'production' && m.recipient_role === 'Sales Team') return;
        if (role === 'production' && m.recipient_role === 'Operations Team') return;

        events.push({
          id: m.notification_id,
          sourceType: 'memo',
          eventClass: 'Calendar Memo',
          date: dateVal,
          customerName: 'Workspace Memo',
          mobile: 'N/A',
          eventType: m.task_id || 'Note',
          eventTime: 'All Day',
          eventLocation: m.recipient_role || 'General',
          currentStage: 'Active',
          notes: m.message,
          raw: m
        });
      });

    return events;
  }, [leads, orders, operations, production, rawFootage, notifications, role]);

  // Filters Event list by role first
  const roleFilteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      if (role === 'sales') {
        // Sales focuses on Scheduled events
        if (ev.sourceType === 'order' && ev.currentStage === 'Event Scheduled') return true;
        return false;
      }
      if (role === 'operations') {
        // Operations calendar strictly shows ONLY events with 'Event Scheduled' status
        return ev.sourceType === 'order' && ev.currentStage === 'Event Scheduled';
      }
      if (role === 'production') {
        // Production focuses strictly on Target Delivery Date events
        return ev.sourceType === 'production' && (ev.eventClass === 'Delivery Due' || ev.eventClass === 'Overdue');
      }
      if (role === 'worker') {
        // Worker only sees order and operations
        return ev.sourceType === 'order' && ev.currentStage === 'Event Scheduled';
      }
      if (role === 'owner') {
        // Owner only sees Scheduled Events
        return ev.sourceType === 'order' && ev.currentStage === 'Event Scheduled';
      }
      return true;
    });
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

  // Unique Event Type tags for filtering dropdown
  const uniqueEventTypes = useMemo(() => {
    const list = new Set<string>(EVENT_TYPES);
    roleFilteredEvents.forEach(e => {
      if (e.eventType) list.add(e.eventType);
    });
    return ['All', ...Array.from(list)];
  }, [roleFilteredEvents]);

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
    'Delivery Due',
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
      case 'Delivery Due':
        return {
          dotBg: 'bg-amber-600',
          badge: 'bg-amber-600/10 text-amber-400 border-amber-605/20 hover:bg-amber-600/20',
          card: 'border-l-4 border-l-amber-600 bg-amber-950/10 hover:bg-amber-950/20 border border-zinc-800'
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
      const isPostEvent = e.sourceType === 'production' && e.eventClass === 'Delivery Due';
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
      let recipientRole = 'All';
      if (role === 'sales') recipientRole = 'Sales Team';
      else if (role === 'operations') recipientRole = 'Operations Team';
      else if (role === 'production') recipientRole = 'Production Team';

      await addNotification({
         title: newMemoTitle,
         message: newMemoMessage,
         project_id: selectedDate, // Store date string here
         task_id: 'Calendar Memo',
         notification_type: 'Calendar Memo',
         recipient_role: recipientRole
      });

      setNewMemoTitle('');
      setNewMemoMessage('');
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
      
      {/* 1. Header and Layout Cockpit */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/40 border border-zinc-900 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-yellow-500 shadow-md">
            <CalendarIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20">
                {role.toUpperCase()} COMPASS
              </span>
              <span className="text-xs text-zinc-400">• Dynamic Studio Slate</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mt-0.5">
              {role === 'owner' ? 'Studio Master Calendar' : `${role.slice(0,1).toUpperCase() + role.slice(1)} Logistics Slate`}
            </h1>
          </div>
        </div>

        {/* View selection controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            {(['month', 'week', 'day', 'agenda'] as const).map(view => (
              <button
                key={view}
                id={`btn_cal_view_${view}`}
                onClick={() => setCalendarView(view)}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all capitalize ${
                  calendarView === view
                    ? 'bg-zinc-800 text-white font-black shadow-inner border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

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
              onClick={() => setShowAddMemo(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-450 border border-yellow-600 rounded-xl text-xs text-zinc-950 font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              Assign Memo
            </button>
          )}
        </div>
      </div>

      {/* Today's Sticky Master Tracker */}
      {widgets.todayEvents.length > 0 && (
        <div id="sticky_today_tracker" className="bg-gradient-to-r from-emerald-950/70 via-zinc-950/80 to-zinc-950/60 border border-emerald-500/40 p-4 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 animate-pulse"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/30 font-black animate-pulse">
                  TODAY
                </span>
                <span className="text-[11px] font-mono text-zinc-400 font-bold">MONDAY, 15 JUNE 2026</span>
              </div>
              <h2 className="text-sm font-bold text-white mt-1">
                Active Live Operations: <span className="text-emerald-400 font-mono font-extrabold">{widgets.todayEvents.length}</span> {widgets.todayEvents.length === 1 ? 'event' : 'events'} scheduled today
              </h2>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {widgets.todayEvents.map(ev => {
              const h = getEventHighlights(ev);
              return (
                <button
                  key={ev.id}
                  onClick={() => {
                    setSelectedEvent(ev);
                  }}
                  className={`px-3 py-1.5 bg-zinc-900/60 hover:bg-zinc-850/80 border border-zinc-805 hover:border-zinc-700 text-[11px] text-zinc-200 rounded-lg flex items-center gap-2 transition cursor-pointer font-medium max-w-[170px] break-words`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="break-words">{ev.customerName} ({ev.eventType})</span>
                </button>
              );
            })}
            <button
              onClick={() => {
                setSelectedDate(todayStr);
                setCalendarView('day');
              }}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-[11px] rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Inspect Day
            </button>
          </div>
        </div>
      )}

      {/* 2. Top-Level Activity Dashboard Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Events Today */}
        <div 
          onClick={() => {
            setSelectedDate(todayStr);
            setCalendarView('day');
          }}
          className="bg-zinc-950/30 border border-zinc-900 p-3.5 rounded-xl flex flex-col justify-between hover:border-emerald-500/30 hover:bg-emerald-950/5 transition-all group cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-450 font-bold">Events Today</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mt-1 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <span>{widgets.todayEvents.length}</span>
              <span className="text-[9px] font-mono font-bold uppercase text-emerald-500/80 bg-emerald-500/10 px-1 py-0.5 rounded scale-90">LIVE</span>
            </div>
            <div className="text-[10px] text-zinc-450 block mt-0.5 break-words">
              {widgets.todayEvents.length > 0 ? `${widgets.todayEvents[0].customerName}` : 'No shoots rostered'}
            </div>
          </div>
        </div>

        {/* Events Tomorrow */}
        <div 
          onClick={() => {
            setSelectedDate(tomorrowStr);
            setCalendarView('day');
          }}
          className="bg-zinc-950/30 border border-zinc-900 p-3.5 rounded-xl flex flex-col justify-between hover:border-orange-500/30 hover:bg-orange-950/5 transition-all group cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-450 font-bold">Events Tomorrow</span>
            <span className="w-2 h-2 rounded-full bg-orange-400 mt-1 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white group-hover:text-orange-400 transition-colors flex items-center gap-1.5">
              <span>{widgets.tomorrowEvents.length}</span>
              <span className="text-[9px] font-mono font-bold uppercase text-orange-500/80 bg-orange-500/10 px-1 py-0.5 rounded scale-90">READY</span>
            </div>
            <div className="text-[10px] text-zinc-450 block mt-0.5 break-words">
              {widgets.tomorrowEvents.length > 0 ? `${widgets.tomorrowEvents[0].customerName}` : 'No sessions locked'}
            </div>
          </div>
        </div>

        {/* Upcoming This Week */}
        <div className="bg-zinc-950/30 border border-zinc-900 p-3.5 rounded-xl flex flex-col justify-between hover:border-zinc-800 hover:bg-zinc-900/10 transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-450 font-bold">Upcoming This Week</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white group-hover:text-blue-400 transition-colors">
              {widgets.upcomingEvents.length}
            </div>
            <div className="text-[10px] text-zinc-450 block mt-0.5 break-words">
              Shoots & Pipeline dates
            </div>
          </div>
        </div>

        {/* Overdue Events */}
        <div className={`border p-3.5 rounded-xl flex flex-col justify-between hover:bg-zinc-900/10 transition-all group ${
          widgets.overdueTasks.length > 0 
            ? 'bg-red-950/15 border-red-500/40 text-red-100 ring-1 ring-red-500/10' 
            : 'bg-zinc-950/30 border-zinc-900'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-450 font-bold">Overdue Events</span>
            {widgets.overdueTasks.length > 0 ? (
              <AlertCircle className="w-4 h-4 text-red-500 animate-bounce" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-zinc-650 mt-1" />
            )}
          </div>
          <div className="mt-2.5">
            <div className={`text-xl font-black transition-colors ${
              widgets.overdueTasks.length > 0 ? 'text-red-400' : 'text-white'
            }`}>
              {widgets.overdueTasks.length}
            </div>
            <div className="text-[10px] text-zinc-450 block mt-0.5 break-words">
              {widgets.overdueTasks.length > 0 ? 'Outstanding schedules' : 'SLA Target stable'}
            </div>
          </div>
        </div>

        {/* Deliveries Due */}
        <div className="bg-zinc-950/30 border border-zinc-900 p-3.5 rounded-xl flex flex-col justify-between hover:border-zinc-800 hover:bg-zinc-900/10 transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-450 font-bold">Edit Deliveries</span>
            <span className="w-2 h-2 rounded-full bg-purple-500 mt-1" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white group-hover:text-purple-400 transition-colors">
              {widgets.deliveriesDue.length}
            </div>
            <div className="text-[10px] text-zinc-450 block mt-0.5 break-words">
              Due in post-proc
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filtering and Custom Parameters Console */}
      <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full lg:max-w-md">
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

        {/* Filters dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Status</span>
            <select
              id="cal_status_filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 h-9 px-3 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-yellow-500 cursor-pointer w-full sm:w-auto"
            >
              {uniqueEventClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
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
              {uniqueEventTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Secondary Row: Main Screen Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* LEFT COLUMN: Main viewport calendar area */}
        <div className="xl:col-span-3 bg-zinc-950/45 border border-zinc-905 p-6 rounded-2xl shadow-xl space-y-6">
          
          {/* Calendar Controller Month Toggle Banner */}
          <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
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
                className="p-2 hover:bg-zinc-900 rounded-xl border border-zinc-850 hover:border-zinc-700 transition"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-350" />
              </button>
              <button
                id="btn_cal_next_month"
                onClick={handleNextMonth}
                className="p-2 hover:bg-zinc-900 rounded-xl border border-zinc-850 hover:border-zinc-700 transition"
              >
                <ChevronRight className="w-4 h-4 text-zinc-350" />
              </button>
            </div>
          </div>

          {/* RENDERING VIEWS */}
          {calendarView === 'month' && (
            <div className="animate-fade-in space-y-2">
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
                          // "Clicking the date should open all events scheduled for that day"
                          setCalendarView('day');
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
                      <div className="space-y-1.5 mt-1.5 hidden md:block overflow-hidden max-h-[84px]">
                        {evs.slice(0, 3).map((ev) => {
                          const h = getEventHighlights(ev);
                          return (
                            <div
                              key={ev.id}
                              id={`micro_evt_${ev.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(ev);
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

                      {/* Compact dot indicators on mobile */}
                      <div className="flex gap-1.5 mt-1.5 justify-center md:hidden">
                        {evs.slice(0, 4).map((ev) => {
                          const h = getEventHighlights(ev);
                          return (
                            <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
                      onClick={() => setSelectedDate(day.dateStr)}
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
                                  setSelectedEvent(ev);
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
                        onClick={() => setSelectedEvent(ev)}
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
                          onClick={() => setSelectedEvent(ev)}
                          className={`p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition cursor-pointer ${col.card}`}
                        >
                          <div className="flex items-start gap-3 w-full sm:w-auto">
                            <div className="flex flex-col items-center bg-zinc-950 px-3 py-2 rounded-xl text-center min-w-[70px] border border-zinc-900">
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

        {/* RIGHT COLUMN: Studio Ledger & Details focus */}
        <div className="space-y-6">
          
          {/* Calendar day summary panel */}
          <div className="bg-zinc-950/45 border border-zinc-900 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="border-b border-zinc-900 pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">Day Summary</span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {selectedDate ? parseLocalDate(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : 'No day selected'}
              </h3>
            </div>

            {/* List mini cards of active day */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {(() => {
                const dayEvs = filteredEvents.filter(ev => ev.date === selectedDate);
                if (dayEvs.length === 0) {
                  return (
                    <div className="py-10 text-center text-zinc-600 font-mono text-xs italic">
                      No events listed
                    </div>
                  );
                }

                return dayEvs.map(ev => {
                  const col = getColorClasses(ev.eventClass);
                  return (
                    <div
                      key={ev.id}
                      id={`day_summary_card_${ev.id}`}
                      onClick={() => setSelectedEvent(ev)}
                      className={`p-3 rounded-xl transition cursor-pointer text-xs flex flex-col gap-2 ${col.card}`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-extrabold text-zinc-200 line-clamp-1">{ev.customerName}</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 border rounded-md  shrink-0 ${col.badge}`}>
                          {ev.eventClass}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-[10px] text-zinc-450 font-mono break-words">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-600" />
                          <span>{ev.eventTime}</span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 text-zinc-600" />
                          <span className="break-words">{ev.eventLocation.split(',')[0]}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Quick Studio Legend panel */}
          <div className="bg-zinc-950/45 border border-zinc-900 p-5 rounded-2xl shadow-xl space-y-3.5">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-yellow-500" />
              <span>Studio Colors SLA</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5 text-[11px] font-mono">
              {[
                { label: 'Event Today', dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' },
                { label: 'Event Tomorrow', dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' },
                { label: 'Event Scheduled', dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' },
                { label: 'Event In Progress', dot: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' },
                { label: 'Event Completed', dot: 'bg-green-700' },
                { label: 'Overdue Event', dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' },
                { label: 'Calendar Memo', dot: 'bg-purple-600' }
              ].map((item, id) => {
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full border border-zinc-850 ${item.dot}`} />
                    <span className="text-zinc-300 font-medium">{item.label}</span>
                  </div>
                );
              })}
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
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg p-6 rounded-2xl space-y-4 shadow-2xl relative">
            <button
              id="close_dialog_add_memo"
              onClick={() => setShowAddMemo(false)}
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
                  onClick={() => setShowAddMemo(false)}
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


      {/* 6. LARGE EVENT DETAILS POPUP PANEL OVERLAY */}
      {selectedEvent && (
        <div 
          id="dialog_event_detail"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto"
        >
          <div className="bg-zinc-900 border border-zinc-805 w-full max-w-2xl p-6 rounded-2xl shadow-2xl relative space-y-6 my-8">
            <button
              id="close_dialog_event_detail"
              onClick={() => setSelectedEvent(null)}
              className="absolute right-4 top-4 p-1.5 hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Heading Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 bg-zinc-950 text-yellow-500 rounded border border-zinc-800">
                    {selectedEvent.eventType}
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 border rounded border-opacity-30 rounded-md font-mono font-bold shadow ${getColorClasses(selectedEvent.eventClass).badge}`}>
                    {selectedEvent.eventClass}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white mt-1">
                  {selectedEvent.customerName}
                </h3>
              </div>

              <div className="text-right sm:text-right text-xs text-zinc-450 font-mono">
                <div>LOGISTICS DOSSIER</div>
                <div className="text-yellow-500 mt-0.5">ID: {selectedEvent.id.toUpperCase().slice(0, 15)}</div>
              </div>
            </div>

            {/* Core details layout grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* Left Details block */}
              <div className="space-y-3.5 bg-zinc-950/20 border border-zinc-850 p-4 rounded-xl">
                <h4 className="text-[10px] font-mono uppercase text-zinc-450 tracking-wider border-b border-zinc-850 pb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Contact & Event Parameters</span>
                </h4>

                <div className="grid grid-cols-3 gap-y-2 text-zinc-300">
                  {selectedEvent.sourceType === 'production' ? (
                    <>
                      <span className="text-zinc-500 font-mono">Customer</span>
                      <span className="col-span-2 font-bold text-white">
                        {selectedEvent.customerName}
                      </span>

                      {selectedEvent.orderId && (
                        <>
                          <span className="text-zinc-500 font-mono">Order ID</span>
                          <span className="col-span-2 font-bold text-yellow-500">{selectedEvent.orderId}</span>
                        </>
                      )}

                      <span className="text-zinc-500 font-mono">Event Type</span>
                      <span className="col-span-2 text-zinc-200 font-mono">
                        {selectedEvent.eventType}
                      </span>

                      {selectedEvent.targetDeliveryDate && (
                        <>
                          <span className="text-zinc-500 font-mono">Target Delivery</span>
                          <span className="col-span-2 font-bold text-pink-400">{selectedEvent.targetDeliveryDate}</span>
                        </>
                      )}

                      <span className="text-zinc-500 font-mono">Prod Status</span>
                      <span className="col-span-2 px-2 py-0.5 bg-zinc-950 rounded border border-zinc-800 text-zinc-300 self-start font-mono font-bold">
                        {selectedEvent.currentStage || selectedEvent.editingStatus || 'Pending'}
                      </span>

                      <span className="text-zinc-500 font-mono">Contact </span>
                      <span className="col-span-2 font-semibold">
                        {selectedEvent.mobile !== 'N/A' ? (
                          <a href={`tel:${selectedEvent.mobile}`} className="hover:text-yellow-500 flex items-center gap-1.5 font-bold">
                            <Phone className="w-3.5 h-3.5 text-zinc-500 inline" />
                            {selectedEvent.mobile}
                          </a>
                        ) : 'N/A'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-zinc-500 font-mono">Contact </span>
                      <span className="col-span-2 font-semibold">
                        {selectedEvent.mobile !== 'N/A' ? (
                          <a href={`tel:${selectedEvent.mobile}`} className="hover:text-yellow-500 flex items-center gap-1.5 font-bold">
                            <Phone className="w-3.5 h-3.5 text-zinc-500 inline" />
                            {selectedEvent.mobile}
                          </a>
                        ) : 'N/A'}
                      </span>

                      <span className="text-zinc-500 font-mono">Date</span>
                      <span className="col-span-2 font-mono font-bold text-yellow-405">
                        {selectedEvent.date}
                      </span>

                      <span className="text-zinc-500 font-mono">Session time</span>
                      <span className="col-span-2 font-mono">
                        {selectedEvent.eventTime}
                      </span>

                      <span className="text-zinc-500 font-mono">Venue Address</span>
                      <span className="col-span-2 text-zinc-350 leading-relaxed font-mono text-[11px]">
                        {selectedEvent.eventLocation}
                      </span>

                      {selectedEvent.packageName && (
                        <>
                          <span className="text-zinc-500 font-mono">Kit Package</span>
                          <span className="col-span-2 font-semibold break-words text-[11px]">
                            {selectedEvent.packageName}
                          </span>
                        </>
                      )}

                      {selectedEvent.totalAmount !== undefined && selectedEvent.totalAmount > 0 && (
                        <>
                          <span className="text-zinc-500 font-mono">Budget</span>
                          <span className="col-span-2 font-bold text-emerald-450">
                            {formatINR(selectedEvent.totalAmount)}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right Details Block - Operations & Production allocation parameters */}
              {role !== 'sales' && (
              <div className="space-y-3.5 bg-zinc-950/20 border border-zinc-850 p-4 rounded-xl">
                <h4 className="text-[10px] font-mono uppercase text-zinc-450 tracking-wider border-b border-zinc-850 pb-1.5 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Squad Allocation & Workflow</span>
                </h4>

                <div className="grid grid-cols-3 gap-y-2.5 text-zinc-300 font-mono text-[11px]">
                  {/* Photo & Video Staff Assignments (Operations Track) */}
                  {selectedEvent.photographer && (
                    <>
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Camera className="w-3 h-3 text-zinc-600" />
                        <span>Photo</span>
                      </span>
                      <span className="col-span-2 text-zinc-200 font-bold">{selectedEvent.photographer}</span>
                    </>
                  )}

                  {selectedEvent.videographer && (
                    <>
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Video className="w-3 h-3 text-zinc-600" />
                        <span>Video</span>
                      </span>
                      <span className="col-span-2 text-zinc-200 font-bold">{selectedEvent.videographer}</span>
                    </>
                  )}

                  {selectedEvent.drone && (
                    <>
                      <span className="text-zinc-500">Drone Op</span>
                      <span className="col-span-2 text-zinc-300">{selectedEvent.drone}</span>
                    </>
                  )}

                  {selectedEvent.kit && (
                    <>
                      <span className="text-zinc-500">Gears Block</span>
                      <span className="col-span-2 text-zinc-350 break-words">{selectedEvent.kit}</span>
                    </>
                  )}

                  {selectedEvent.reportingTime && (
                    <>
                      <span className="text-zinc-500">Report Hr</span>
                      <span className="col-span-2 text-yellow-500 font-bold">{selectedEvent.reportingTime}</span>
                    </>
                  )}

                  {/* Editors Assignments (Post Production Track) */}
                  {role !== 'worker' && selectedEvent.editor && (
                    <>
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Video className="w-3 h-3 text-zinc-650" />
                        <span>Lead Editor</span>
                      </span>
                      <span className="col-span-2 text-zinc-100 font-bold">{selectedEvent.editor}</span>
                    </>
                  )}

                  {role !== 'worker' && selectedEvent.editingStatus && (
                    <>
                      <span className="text-zinc-500">VFX Status</span>
                      <span className="col-span-2 px-2 py-0.5 bg-zinc-950 rounded border border-zinc-800 text-zinc-300 self-start">
                        {selectedEvent.editingStatus}
                      </span>
                    </>
                  )}

                  {role !== 'worker' && selectedEvent.expectedDeliveryDate && (
                    <>
                      <span className="text-zinc-500">Target ETA</span>
                      <span className="col-span-2 text-pink-400 font-bold">{selectedEvent.expectedDeliveryDate}</span>
                    </>
                  )}

                  {/* Default fallback if nothing allocated */}
                  {!selectedEvent.photographer && (!selectedEvent.editor || role === 'worker') && (
                    <div className="col-span-3 text-center py-6 text-zinc-650 italic">
                      Awaiting squad dispatch roster values
                    </div>
                  )}
                </div>
              </div>
              )}

            </div>

            {/* Notes log and comments */}
            {selectedEvent.notes && (
              <div className="bg-zinc-950/20 border border-zinc-850 p-4 rounded-xl text-xs space-y-2">
                <h4 className="text-[10px] font-mono uppercase text-zinc-450 tracking-wider">
                  Remarks & Internal Notes Log
                </h4>
                <p className="text-zinc-300 italic leading-relaxed whitespace-pre-wrap">
                  "{selectedEvent.notes}"
                </p>
              </div>
            )}

            {/* Workflow Activity status / audit logs */}
            <div className="bg-zinc-950/25 border border-zinc-850 p-4 rounded-xl text-xs space-y-3">
              <h4 className="text-[10px] font-mono uppercase text-zinc-450 tracking-wider">
                Workflow Activity Timeline
              </h4>

              <div className="space-y-4 max-h-[160px] overflow-y-auto pr-1 no-scrollbar pt-1">
                {eventTimeline.length === 0 ? (
                  <div className="text-center py-4 text-zinc-650 italic font-mono">
                    Awaiting state transition logs
                  </div>
                ) : (
                  <div className="relative border-l border-zinc-800 ml-2 pl-4 space-y-4">
                    {eventTimeline.map((l, id) => (
                      <div key={id} id={`timeline_log_${id}`} className="relative">
                        <div className="absolute -left-[21px] top-0.5 bg-zinc-900 w-2.5 h-2.5 rounded-full ring-2 ring-yellow-500/20 border border-yellow-500" />
                        <div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                            <span className="text-zinc-300 font-bold">{l.user_name}</span>
                            <span>•</span>
                            <span>{l.role}</span>
                            <span>•</span>
                            <span>{formatTime12Hour(l.timestamp)} ({l.timestamp.slice(0, 10)})</span>
                          </div>
                          <p className="text-zinc-300 text-[11px] mt-0.5 leading-relaxed font-sans">
                            {l.action}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                id="btn_dismiss_detail"
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Dismiss Closed
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
