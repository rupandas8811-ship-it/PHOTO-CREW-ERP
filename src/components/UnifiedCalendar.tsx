import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from './RoleContext';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  X, 
  Search, 
  Filter, 
  Briefcase, 
  CheckCircle2, 
  Camera, 
  Video, 
  ExternalLink,
  Sparkles,
  Layers,
  UserPlus
} from 'lucide-react';
import { formatINR, formatTime12Hour, formatDateDDMMYY } from '../utils';

interface UnifiedCalendarProps {
  role: 'sales' | 'operations' | 'production' | 'production_staff' | 'owner' | 'worker';
  staffMemberId?: string;
  staffMemberName?: string;
  onSelectLead?: (lead: any) => void;
  onOpenAssignEditor?: (targetOrderId: string, targetLeadId?: string) => void;
}

interface CalendarEventItem {
  id: string;
  orderId: string;
  leadId?: string;
  customerName: string;
  customerMobile?: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  eventTime?: string;
  reportingDate?: string;
  reportingTime?: string;
  location?: string;
  assignedRole?: string;
  assignedStaff?: string;
  assignedCrew?: {
    photographer?: string;
    videographer?: string;
    drone?: string;
    assistant?: string;
  };
  editorAssigned?: string;
  deliverables?: string | string[];
  equipmentKit?: string;
  targetDeliveryDate?: string;
  rawFootageLink?: string;
  budget?: number;
  salesPerson?: string;
  status: string;
  desk?: string;
  sourceRecord?: any;
}

const normalizeDateStr = (dateVal?: string | null | Date): string => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    return `${dateVal.getFullYear()}-${String(dateVal.getMonth() + 1).padStart(2, '0')}-${String(dateVal.getDate()).padStart(2, '0')}`;
  }
  const s = String(dateVal).trim();
  if (!s) return '';
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }
  return s;
};

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({ 
  role, 
  staffMemberId, 
  staffMemberName, 
  onSelectLead, 
  onOpenAssignEditor 
}) => {
  const { 
    currentUser, 
    currentUserName,
    leads = [], 
    orders = [], 
    operations = [], 
    production = [], 
    staffAssignments = [], 
    editorAssignments = [], 
    rawFootage = [] 
  } = useRole();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [calendarModalDate, setCalendarModalDate] = useState<string | null>(null);
  const [calendarModalEvents, setCalendarModalEvents] = useState<CalendarEventItem[]>([]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  // Compile calendar events according to the active role
  const allEvents = useMemo<CalendarEventItem[]>(() => {
    const items: CalendarEventItem[] = [];

    // Helper to safely extract deliverables list
    const extractDeliverablesString = (orderItem: any, prodItem: any): string => {
      if (prodItem?.deliverables_summary) return prodItem.deliverables_summary;
      if (prodItem?.assigned_deliverables) {
        if (Array.isArray(prodItem.assigned_deliverables)) return prodItem.assigned_deliverables.join(', ');
        return String(prodItem.assigned_deliverables);
      }
      if (orderItem?.package_details) {
        try {
          const pkg = typeof orderItem.package_details === 'string' ? JSON.parse(orderItem.package_details) : orderItem.package_details;
          if (pkg?.deliverables) {
            if (Array.isArray(pkg.deliverables)) return pkg.deliverables.map((d: any) => d.name || d.deliverable_name || d).join(', ');
            return String(pkg.deliverables);
          }
        } catch (_) {}
      }
      return orderItem?.package_name || 'Deliverables Pending';
    };

    // 1. PRODUCTION & PRODUCTION STAFF CALENDARS
    if (role === 'production' || role === 'production_staff') {
      const targetStaffName = (staffMemberName || currentUserName || currentUser?.name || '').trim().toLowerCase();
      const targetStaffId = staffMemberId || currentUser?.id;

      // Group by order/production
      const prodKeys = new Set<string>();

      // A. Process from orders in Production stages or with production artifacts
      const validProdStages = [
        'verified footage', 'footage handover verified', 'raw footage received', 'raw footage uploaded',
        'assigned editor', 'editor assigned', 'assigned', 'editing started', 'editing in progress',
        'internal qc review', 'customer review', 'client review sent', 'revision required',
        'revision in progress', 'editing completed', 'final approval', 'client acceptance',
        'approved', 'project delivered', 'completed', 'order closed', 'closed'
      ];

      (orders || []).forEach(ord => {
        const stage = (ord.current_stage || '').trim().toLowerCase();
        const matchedProd = (production || []).find(p => p.order_id === ord.order_id || p.tracking_id === ord.order_id || p.lead_id === ord.lead_id);
        const matchedAssignments = (editorAssignments || []).filter(ea => ea.order_id === ord.order_id || ea.production_id === ord.order_id);
        const matchedRf = (rawFootage || []).find(rf => rf.order_id === ord.order_id || rf.tracking_id === ord.order_id);

        const isProdCandidate = validProdStages.includes(stage) || !!matchedProd || matchedAssignments.length > 0 || !!matchedRf;
        if (!isProdCandidate) return;

        // If Production Staff view, strictly filter for this staff member's assignments
        if (role === 'production_staff') {
          const isAssigned = matchedAssignments.some(ea => {
            const nameMatch = ea.staff_name && ea.staff_name.trim().toLowerCase() === targetStaffName;
            const idMatch = targetStaffId && ea.staff_id && ea.staff_id === targetStaffId;
            return nameMatch || idMatch;
          }) || (matchedProd?.editor_assigned && matchedProd.editor_assigned.toLowerCase().includes(targetStaffName));
          if (!isAssigned) return;
        }

        const matchedLead = (leads || []).find(l => l.lead_id === ord.lead_id || l.order_id === ord.order_id);
        
        // Resolve Target Delivery Date as primary date for Production Calendar
        const explicitTargetDate = matchedAssignments.find(a => a.target_finish_date || a.target_delivery_date)?.target_finish_date ||
                                   matchedAssignments.find(a => a.target_finish_date || a.target_delivery_date)?.target_delivery_date ||
                                   matchedProd?.target_delivery_date || 
                                   matchedProd?.expected_delivery_date || 
                                   (ord as any)?.target_delivery_date ||
                                   (ord as any)?.delivery_target_date ||
                                   (matchedLead as any)?.delivery_target_date || '';
        
        const fallbackDate = ord.event_date || matchedLead?.event_date || '';
        const primaryTargetDate = explicitTargetDate || fallbackDate;
        const normDate = normalizeDateStr(primaryTargetDate);
        if (!normDate) return;

        const assignedEditorName = matchedAssignments.map(ea => ea.staff_name).filter(Boolean).join(', ') || 
                                   matchedProd?.editor_assigned || 
                                   'Unassigned';

        const delivs = extractDeliverablesString(ord, matchedProd);

        const rawLink = matchedProd?.raw_footage_location || 
                        matchedRf?.server_path || 
                        ord.raw_footage_link || 
                        '';

        items.push({
          id: `PROD-${ord.order_id}`,
          orderId: ord.order_id,
          leadId: ord.lead_id,
          customerName: ord.customer_name || matchedLead?.customer_name || 'Client',
          customerMobile: ord.customer_phone || ord.mobile || matchedLead?.mobile || '',
          eventName: ord.custom_event_name || ord.event_type || matchedLead?.event_type || 'Production Project',
          eventType: ord.event_type || matchedLead?.event_type || 'Video Editing',
          eventDate: normDate, // Placed on Calendar strictly by Target Delivery Date
          targetDeliveryDate: normalizeDateStr(explicitTargetDate || fallbackDate),
          editorAssigned: assignedEditorName,
          deliverables: delivs,
          rawFootageLink: rawLink,
          status: matchedProd?.editing_status || ord.current_stage || 'Verified Footage',
          desk: 'Production',
          sourceRecord: { order: ord, prod: matchedProd, assignments: matchedAssignments, lead: matchedLead }
        });

        prodKeys.add(ord.order_id);
      });

      // B. Process production records that might not have orders
      (production || []).forEach(p => {
        const ordId = p.order_id || p.tracking_id || p.production_id;
        if (ordId && prodKeys.has(ordId)) return;

        if (role === 'production_staff') {
          const isAssigned = (p.editor_assigned && p.editor_assigned.toLowerCase().includes(targetStaffName)) ||
                             (p.assigned_staff && p.assigned_staff.toLowerCase().includes(targetStaffName));
          if (!isAssigned) return;
        }

        const dateVal = p.target_delivery_date || p.expected_delivery_date || p.event_date || p.created_at;
        const normDate = normalizeDateStr(dateVal);
        if (!normDate) return;

        items.push({
          id: p.production_id || `PRD-${p.tracking_id}`,
          orderId: p.order_id || p.tracking_id || '—',
          leadId: p.lead_id,
          customerName: p.customer_name || 'Client',
          customerMobile: p.customer_mobile || '',
          eventName: p.custom_event_name || 'Production Item',
          eventType: 'Editing',
          eventDate: normDate, // Placed on Calendar strictly by Target Delivery Date
          targetDeliveryDate: normalizeDateStr(dateVal),
          editorAssigned: p.editor_assigned || p.assigned_staff || 'Unassigned',
          deliverables: p.deliverables_summary || 'Deliverables',
          rawFootageLink: p.raw_footage_location || '',
          status: p.editing_status || 'Verified Footage',
          desk: 'Production',
          sourceRecord: { prod: p }
        });
      });
    }

    // 2. OPERATIONS CALENDAR
    else if (role === 'operations') {
      (orders || []).forEach(ord => {
        const matchedOp = (operations || []).find(op => op.order_id === ord.order_id);
        const matchedLead = (leads || []).find(l => l.lead_id === ord.lead_id || l.order_id === ord.order_id);
        const matchedSa = (staffAssignments || []).filter(sa => sa.order_id === ord.order_id);

        const eventDateStr = ord.event_date || matchedOp?.event_date || matchedLead?.event_date;
        const normDate = normalizeDateStr(eventDateStr);
        if (!normDate) return;

        // Resolve assigned crew
        const photographer = matchedOp?.photographer_assigned || matchedSa.find(s => (s.staff_role || '').toLowerCase().includes('photo'))?.staff_name || 'Unassigned';
        const videographer = matchedOp?.videographer_assigned || matchedSa.find(s => (s.staff_role || '').toLowerCase().includes('video'))?.staff_name || 'Unassigned';
        const drone = matchedOp?.drone_operator_assigned || matchedSa.find(s => (s.staff_role || '').toLowerCase().includes('drone'))?.staff_name || 'Unassigned';
        const assistant = matchedOp?.assistant_assigned || matchedSa.find(s => (s.staff_role || '').toLowerCase().includes('assist'))?.staff_name || 'Unassigned';

        items.push({
          id: `OPS-${ord.order_id}`,
          orderId: ord.order_id,
          leadId: ord.lead_id,
          customerName: ord.customer_name || matchedLead?.customer_name || 'Client',
          customerMobile: ord.customer_phone || ord.mobile || matchedLead?.mobile || '',
          eventName: ord.custom_event_name || ord.event_type || matchedLead?.event_type || 'Event',
          eventType: ord.event_type || matchedLead?.event_type || 'Photography',
          eventDate: normDate,
          reportingDate: matchedOp?.reporting_date || normDate,
          reportingTime: matchedOp?.reporting_time || ord.event_time || '08:00 AM',
          location: ord.address || matchedLead?.city || matchedLead?.address || 'Studio / On Site',
          assignedCrew: { photographer, videographer, drone, assistant },
          equipmentKit: matchedOp?.equipment_kit || 'Standard Kit',
          status: matchedOp?.event_status || ord.current_stage || 'Assigned Crew',
          desk: 'Operations',
          sourceRecord: { order: ord, op: matchedOp, lead: matchedLead, staffAssignments: matchedSa }
        });
      });
    }

    // 3. SALES CALENDAR
    else if (role === 'sales') {
      (leads || []).forEach(lead => {
        const normDate = normalizeDateStr(lead.event_date);
        if (!normDate) return;

        const matchedOrder = (orders || []).find(o => o.lead_id === lead.lead_id || o.order_id === lead.order_id);

        items.push({
          id: `LEAD-${lead.lead_id}`,
          orderId: matchedOrder?.order_id || lead.order_id || lead.lead_id,
          leadId: lead.lead_id,
          customerName: lead.customer_name || 'Client',
          customerMobile: lead.mobile || lead.whatsapp_number || '',
          eventName: lead.custom_event_name || lead.event_type || 'Shoot',
          eventType: lead.event_type || 'Photography & Videography',
          eventDate: normDate,
          eventTime: lead.event_time || '',
          location: lead.city || lead.address || '—',
          budget: lead.budget || matchedOrder?.quotation_amount || 0,
          salesPerson: lead.sales_person || matchedOrder?.sales_person || 'Sales Team',
          status: lead.status || lead.current_status || matchedOrder?.current_stage || 'New Lead',
          desk: 'Sales',
          sourceRecord: { lead, order: matchedOrder }
        });
      });
    }

    // 4. BUSINESS OWNER CALENDAR (Consolidated Studio Milestones)
    else if (role === 'owner') {
      // Collect across sales, operations, and production
      (orders || []).forEach(ord => {
        const normDate = normalizeDateStr(ord.event_date);
        if (!normDate) return;
        const matchedOp = (operations || []).find(op => op.order_id === ord.order_id);
        const matchedProd = (production || []).find(p => p.order_id === ord.order_id);
        const matchedLead = (leads || []).find(l => l.lead_id === ord.lead_id);

        items.push({
          id: `OWNER-${ord.order_id}`,
          orderId: ord.order_id,
          leadId: ord.lead_id,
          customerName: ord.customer_name || 'Client',
          customerMobile: ord.customer_phone || ord.mobile || '',
          eventName: ord.custom_event_name || ord.event_type || 'Event',
          eventType: ord.event_type || 'Milestone',
          eventDate: normDate,
          reportingTime: matchedOp?.reporting_time || ord.event_time || '',
          location: ord.address || matchedLead?.city || '—',
          budget: ord.quotation_amount || matchedLead?.budget || 0,
          editorAssigned: matchedProd?.editor_assigned || '—',
          status: ord.current_stage || 'In Progress',
          desk: matchedProd ? 'Production' : (matchedOp ? 'Operations' : 'Sales'),
          sourceRecord: { order: ord, op: matchedOp, prod: matchedProd, lead: matchedLead }
        });
      });
    }

    return items;
  }, [role, staffMemberId, staffMemberName, currentUserName, currentUser, orders, leads, operations, production, editorAssignments, staffAssignments, rawFootage]);

  // Filter items by search term and status
  const filteredEvents = useMemo(() => {
    const list = allEvents.filter(ev => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchId = ev.orderId.toLowerCase().includes(q) || (ev.leadId && ev.leadId.toLowerCase().includes(q));
        const matchName = ev.customerName.toLowerCase().includes(q);
        const matchEvent = ev.eventName.toLowerCase().includes(q) || ev.eventType.toLowerCase().includes(q);
        const matchStaff = (ev.editorAssigned && ev.editorAssigned.toLowerCase().includes(q)) ||
                           (ev.assignedStaff && ev.assignedStaff.toLowerCase().includes(q));
        if (!matchId && !matchName && !matchEvent && !matchStaff) return false;
      }

      if (selectedStatusFilter !== 'All') {
        if (ev.status.toLowerCase() !== selectedStatusFilter.toLowerCase()) return false;
      }

      return true;
    });

    // For production & production staff, strictly order by Target Delivery Date
    if (role === 'production' || role === 'production_staff') {
      list.sort((a, b) => {
        const timeA = a.targetDeliveryDate || a.eventDate ? new Date(a.targetDeliveryDate || a.eventDate).getTime() : 0;
        const timeB = b.targetDeliveryDate || b.eventDate ? new Date(b.targetDeliveryDate || b.eventDate).getTime() : 0;
        if (timeA > 0 && timeB > 0 && timeA !== timeB) return timeA - timeB;
        if (timeA > 0 && timeB === 0) return -1;
        if (timeB > 0 && timeA === 0) return 1;
        return a.orderId.localeCompare(b.orderId, undefined, { numeric: true });
      });
    }

    return list;
  }, [allEvents, searchTerm, selectedStatusFilter, role]);

  // Calendar Grid Calculation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString('default', { month: 'long' });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const todayStr = normalizeDateStr(new Date());

  const calendarGrid: {
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: CalendarEventItem[];
  }[] = [];

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = daysInPreviousMonth - i;
    const pDate = new Date(year, month - 1, dNum);
    const dateStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    const evs = filteredEvents.filter(e => e.eventDate === dateStr);
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
    const evs = filteredEvents.filter(e => e.eventDate === dateStr);
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
    const evs = filteredEvents.filter(e => e.eventDate === dateStr);
    calendarGrid.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: evs
    });
  }

  // Get distinct statuses for filter
  const distinctStatuses = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach(e => {
      if (e.status) set.add(e.status);
    });
    return Array.from(set);
  }, [allEvents]);

  // Calendar Theme Colors based on Role
  const theme = useMemo(() => {
    switch (role) {
      case 'production':
      case 'production_staff':
        return {
          primary: 'purple',
          border: 'border-purple-500/30',
          bgHighlight: 'bg-purple-500/10',
          textHighlight: 'text-purple-400',
          buttonBg: 'bg-purple-600 hover:bg-purple-500 text-white'
        };
      case 'operations':
        return {
          primary: 'amber',
          border: 'border-amber-500/30',
          bgHighlight: 'bg-amber-500/10',
          textHighlight: 'text-amber-400',
          buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white'
        };
      case 'sales':
        return {
          primary: 'blue',
          border: 'border-blue-500/30',
          bgHighlight: 'bg-blue-500/10',
          textHighlight: 'text-blue-400',
          buttonBg: 'bg-blue-600 hover:bg-blue-500 text-white'
        };
      case 'owner':
      default:
        return {
          primary: 'emerald',
          border: 'border-emerald-500/30',
          bgHighlight: 'bg-emerald-500/10',
          textHighlight: 'text-emerald-400',
          buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-white'
        };
    }
  }, [role]);

  return (
    <div className="space-y-4">
      {/* Calendar Header Card */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-6 shadow-2xl space-y-4 md:space-y-6">
        
        {/* Navigation & Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 shadow-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition cursor-pointer active:scale-90 shrink-0"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <h2 className="text-sm sm:text-base font-mono font-bold tracking-wider text-center px-3 whitespace-nowrap">
              <span className={`${theme.textHighlight} font-extrabold`}>{monthName}</span>
              <span className="text-zinc-200 font-medium ml-1.5">{year}</span>
            </h2>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition cursor-pointer active:scale-90 shrink-0"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="ml-2 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg text-xs font-mono font-bold text-zinc-300 hover:text-white transition cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search orders, clients, events..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>

            {distinctStatuses.length > 0 && (
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-600 transition cursor-pointer"
              >
                <option value="All">All Statuses ({allEvents.length})</option>
                {distinctStatuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            )}

            <div className="px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-400">
              Total: <span className={`${theme.textHighlight} font-black`}>{filteredEvents.length}</span>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-mono font-bold uppercase text-zinc-500">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="py-2 bg-zinc-950/70 rounded-xl border border-zinc-850">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Month Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full max-w-full">
          {calendarGrid.map((cell, idx) => {
            const hasEvents = cell.events.length > 0;
            const isSelected = cell.dateStr === calendarModalDate;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (hasEvents) {
                    setCalendarModalDate(cell.dateStr);
                    setCalendarModalEvents(cell.events);
                  }
                }}
                className={`aspect-square min-h-[52px] sm:min-h-[80px] p-1 sm:p-2 rounded-xl border flex flex-col items-center justify-between select-none touch-manipulation relative transition-all duration-150 ${
                  hasEvents ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'
                } ${
                  isSelected
                    ? `bg-zinc-900 ${theme.border} ring-1 ring-purple-500/30 shadow-lg`
                    : cell.isToday
                    ? `${theme.bgHighlight} ${theme.border} text-white shadow-md`
                    : cell.isCurrentMonth
                    ? 'bg-zinc-950/80 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40 text-zinc-200'
                    : 'bg-zinc-950/20 border-transparent text-zinc-800 opacity-20 pointer-events-none'
                }`}
              >
                {/* Date Number Display */}
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-[11px] sm:text-xs font-mono font-extrabold shrink-0 ${
                      cell.isToday
                        ? `${theme.textHighlight} font-black`
                        : cell.isCurrentMonth
                        ? 'text-zinc-200'
                        : 'text-zinc-700'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {/* Badge count if multiple */}
                  {hasEvents && cell.events.length > 1 && (
                    <span className={`text-[8px] sm:text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${theme.bgHighlight} ${theme.textHighlight} border ${theme.border}`}>
                      {cell.events.length}
                    </span>
                  )}
                </div>

                {/* Event Names inside the Date Cell */}
                {cell.isCurrentMonth && hasEvents && (
                  <div className="w-full flex-1 flex flex-col justify-start gap-0.5 overflow-hidden mt-0.5 min-h-0">
                    {cell.events.slice(0, 2).map((ev, eIdx) => {
                      const displayName = ev.customerName || ev.orderId;
                      return (
                        <div
                          key={`${ev.id}_${eIdx}`}
                          className="w-full truncate text-[9px] sm:text-[10px] leading-tight px-1 py-0.5 rounded bg-zinc-900/90 text-zinc-300 border border-zinc-800 font-medium text-left hover:text-white"
                          title={`${ev.orderId}: ${ev.customerName} (${ev.status})`}
                        >
                          <span className={`${theme.textHighlight} font-bold mr-0.5`}>•</span>
                          {displayName}
                        </div>
                      );
                    })}
                    {cell.events.length > 2 && (
                      <span className="text-[8px] text-zinc-500 font-mono text-left pl-0.5">
                        +{cell.events.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal for Clicked Date: Real Horizontal Table */}
        {calendarModalDate && createPortal(
          <div 
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setCalendarModalDate(null)}
          >
            <div 
              className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-2xl md:rounded-3xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden" 
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800/80 shrink-0">
                <div>
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${theme.textHighlight} block font-extrabold`}>
                    {role.toUpperCase().replace('_', ' ')} CALENDAR // EVENT DETAILS
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-white font-mono mt-0.5 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-zinc-400" />
                    <span>{formatDateDDMMYY(calendarModalDate) || calendarModalDate}</span>
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 ${theme.bgHighlight} ${theme.textHighlight} border ${theme.border} rounded-lg`}>
                    {calendarModalEvents.length} {calendarModalEvents.length === 1 ? 'RECORD' : 'RECORDS'}
                  </span>
                  <button
                    onClick={() => setCalendarModalDate(null)}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Modal Body: Responsive Genuine Horizontal Table */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {calendarModalEvents.length === 0 ? (
                  <div className="p-8 text-center bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs font-mono">
                    No events scheduled for this date.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full border border-zinc-800 rounded-2xl bg-zinc-950/80 shadow-inner">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-950/90 text-zinc-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-bold">
                          <th className="p-3 pl-4 min-w-[120px]">Order / Lead ID</th>
                          <th className="p-3 min-w-[150px]">Customer Name</th>
                          <th className="p-3 min-w-[150px]">Event Name & Type</th>
                          
                          {/* Role-Specific Column Headers */}
                          {(role === 'production' || role === 'production_staff') && (
                            <>
                              <th className="p-3 min-w-[150px]">Deliverables</th>
                              <th className="p-3 min-w-[120px]">Target Delivery</th>
                              <th className="p-3 min-w-[120px]">Assigned Editor</th>
                              <th className="p-3 min-w-[120px]">Raw Footage Link</th>
                            </>
                          )}

                          {role === 'operations' && (
                            <>
                              <th className="p-3 min-w-[120px]">Reporting Time</th>
                              <th className="p-3 min-w-[150px]">Location</th>
                              <th className="p-3 min-w-[150px]">Assigned Crew</th>
                              <th className="p-3 min-w-[120px]">Equipment</th>
                            </>
                          )}

                          {role === 'sales' && (
                            <>
                              <th className="p-3 min-w-[150px]">Location</th>
                              <th className="p-3 min-w-[120px]">Package / Budget</th>
                              <th className="p-3 min-w-[120px]">Sales Rep</th>
                            </>
                          )}

                          {role === 'owner' && (
                            <>
                              <th className="p-3 min-w-[100px]">Desk / Stage</th>
                              <th className="p-3 min-w-[150px]">Location</th>
                              <th className="p-3 min-w-[100px]">Value</th>
                            </>
                          )}

                          <th className="p-3 min-w-[100px]">Status</th>
                          
                          {role === 'production' && onOpenAssignEditor && (
                            <th className="p-3 pr-4 text-center min-w-[100px]">Action</th>
                          )}
                          {role === 'sales' && onSelectLead && (
                            <th className="p-3 pr-4 text-center min-w-[100px]">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850 text-xs font-sans">
                        {calendarModalEvents.map((ev, idx) => (
                          <tr key={`${ev.id}_${idx}`} className="hover:bg-zinc-900/50 transition font-mono">
                            <td className="p-3 pl-4 text-zinc-200 font-bold whitespace-nowrap">
                              <span className={`${theme.textHighlight}`}>{ev.orderId}</span>
                              {ev.leadId && ev.leadId !== ev.orderId && (
                                <span className="block text-[10px] text-zinc-500 font-normal">
                                  Lead: {ev.leadId}
                                </span>
                              )}
                            </td>
                            
                            <td className="p-3 font-sans font-bold text-white whitespace-nowrap">
                              <div>{ev.customerName}</div>
                              {ev.customerMobile && (
                                <div className="text-[10px] font-mono text-zinc-400 font-normal">
                                  {ev.customerMobile}
                                </div>
                              )}
                            </td>

                            <td className="p-3 whitespace-nowrap text-zinc-300">
                              <div className="font-semibold text-zinc-100">{ev.eventName}</div>
                              <div className="text-[10px] text-zinc-500">{ev.eventType}</div>
                            </td>

                            {/* Production & Production Staff specific cells */}
                            {(role === 'production' || role === 'production_staff') && (
                              <>
                                <td className="p-3 max-w-[200px] truncate text-zinc-300 font-sans" title={String(ev.deliverables)}>
                                  {String(ev.deliverables || 'Deliverables')}
                                </td>
                                <td className="p-3 whitespace-nowrap text-zinc-300">
                                  {ev.targetDeliveryDate ? formatDateDDMMYY(ev.targetDeliveryDate) || ev.targetDeliveryDate : '—'}
                                </td>
                                <td className="p-3 whitespace-nowrap text-purple-300 font-semibold">
                                  {ev.editorAssigned || 'Unassigned'}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  {ev.rawFootageLink ? (
                                    <a
                                      href={ev.rawFootageLink.startsWith('http') ? ev.rawFootageLink : `https://${ev.rawFootageLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg"
                                    >
                                      <span>Drive Link</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-zinc-600 text-[10px]">No Link</span>
                                  )}
                                </td>
                              </>
                            )}

                            {/* Operations specific cells */}
                            {role === 'operations' && (
                              <>
                                <td className="p-3 whitespace-nowrap text-zinc-300">
                                  {ev.reportingTime || '08:00 AM'}
                                </td>
                                <td className="p-3 max-w-[180px] truncate text-zinc-300" title={ev.location}>
                                  {ev.location || '—'}
                                </td>
                                <td className="p-3 whitespace-nowrap text-[10px] text-zinc-300">
                                  {ev.assignedCrew ? (
                                    <div className="space-y-0.5">
                                      {ev.assignedCrew.photographer && ev.assignedCrew.photographer !== 'Unassigned' && (
                                        <div><span className="text-zinc-500">P:</span> {ev.assignedCrew.photographer}</div>
                                      )}
                                      {ev.assignedCrew.videographer && ev.assignedCrew.videographer !== 'Unassigned' && (
                                        <div><span className="text-zinc-500">V:</span> {ev.assignedCrew.videographer}</div>
                                      )}
                                      {ev.assignedCrew.drone && ev.assignedCrew.drone !== 'Unassigned' && (
                                        <div><span className="text-zinc-500">D:</span> {ev.assignedCrew.drone}</div>
                                      )}
                                      {(!ev.assignedCrew.photographer || ev.assignedCrew.photographer === 'Unassigned') &&
                                       (!ev.assignedCrew.videographer || ev.assignedCrew.videographer === 'Unassigned') && (
                                        <span className="text-zinc-600">Unassigned</span>
                                      )}
                                    </div>
                                  ) : '—'}
                                </td>
                                <td className="p-3 whitespace-nowrap text-zinc-400 text-[11px]">
                                  {ev.equipmentKit || '—'}
                                </td>
                              </>
                            )}

                            {/* Sales specific cells */}
                            {role === 'sales' && (
                              <>
                                <td className="p-3 whitespace-nowrap text-zinc-300">
                                  {ev.location || '—'}
                                </td>
                                <td className="p-3 whitespace-nowrap text-emerald-400 font-bold">
                                  {ev.budget ? formatINR(ev.budget) : '—'}
                                </td>
                                <td className="p-3 whitespace-nowrap text-zinc-300">
                                  {ev.salesPerson || 'Sales'}
                                </td>
                              </>
                            )}

                            {/* Owner specific cells */}
                            {role === 'owner' && (
                              <>
                                <td className="p-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                                    {ev.desk || 'Studio'}
                                  </span>
                                </td>
                                <td className="p-3 whitespace-nowrap text-zinc-300">
                                  {ev.location || '—'}
                                </td>
                                <td className="p-3 whitespace-nowrap text-emerald-400 font-bold">
                                  {ev.budget ? formatINR(ev.budget) : '—'}
                                </td>
                              </>
                            )}

                            {/* Status Badge */}
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${theme.bgHighlight} ${theme.textHighlight} ${theme.border}`}>
                                {ev.status}
                              </span>
                            </td>

                            {/* Optional Action Buttons */}
                            {role === 'production' && onOpenAssignEditor && (
                              <td className="p-3 pr-4 text-center whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setCalendarModalDate(null);
                                    onOpenAssignEditor(ev.orderId, ev.leadId);
                                  }}
                                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-mono font-bold transition cursor-pointer shadow flex items-center gap-1 mx-auto"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Assign Editor</span>
                                </button>
                              </td>
                            )}

                            {role === 'sales' && onSelectLead && (
                              <td className="p-3 pr-4 text-center whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setCalendarModalDate(null);
                                    if (ev.sourceRecord?.lead) onSelectLead(ev.sourceRecord.lead);
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold transition cursor-pointer shadow mx-auto"
                                >
                                  Open Lead
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
