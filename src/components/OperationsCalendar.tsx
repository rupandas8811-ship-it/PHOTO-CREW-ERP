import React, { useState, useEffect, useMemo } from 'react';
import { useRole } from './RoleContext';
import { 
  ChevronLeft, ChevronRight, Calendar, Search, MapPin, Clock, 
  Users, CheckCircle2, Sliders, RefreshCw, Printer, AlertTriangle, 
  Tag, Compass, Focus, Camera, FileText
} from 'lucide-react';
import { Order } from '../types';

export const OperationsCalendar: React.FC = () => {
  const { 
    orders, 
    operations, 
    staff, 
    staffAssignments 
  } = useRole();

  // Selected calendar view focus months
  // Default to June 2026 to fit the simulated studio data
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June is index 5

  // Unified synchronized filters (synced with sessionStorage)
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('ops_search') || '');
  const [startDateInput, setStartDateInput] = useState(() => sessionStorage.getItem('ops_start_date') || '');
  const [endDateInput, setEndDateInput] = useState(() => sessionStorage.getItem('ops_end_date') || '');

  const [appliedSearch, setAppliedSearch] = useState(() => sessionStorage.getItem('ops_search') || '');
  const [appliedStartDate, setAppliedStartDate] = useState(() => sessionStorage.getItem('ops_start_date') || '');
  const [appliedEndDate, setAppliedEndDate] = useState(() => sessionStorage.getItem('ops_end_date') || '');

  // Keep state synced cross-tab
  useEffect(() => {
    const handleStorageSync = () => {
      setSearchQuery(sessionStorage.getItem('ops_search') || '');
      setStartDateInput(sessionStorage.getItem('ops_start_date') || '');
      setEndDateInput(sessionStorage.getItem('ops_end_date') || '');
      setAppliedSearch(sessionStorage.getItem('ops_search') || '');
      setAppliedStartDate(sessionStorage.getItem('ops_start_date') || '');
      setAppliedEndDate(sessionStorage.getItem('ops_end_date') || '');
    };
    window.addEventListener('storage_sync', handleStorageSync);
    return () => window.removeEventListener('storage_sync', handleStorageSync);
  }, []);

  // Today marker (2026-06-18 as simulation date)
  const todayStr = '2026-06-18';

  // Selected Day on Calendar (Defualts to today)
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-18');

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const jumpToToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(5); // June
    setSelectedDate('2026-06-18');
  };

  // Helper: Retrieve formatted crew assignments
  const getAssignedCrewString = (orderId: string) => {
    const op = operations.find(o => o.order_id === orderId);
    const names: string[] = [];
    if (op) {
      if (op.photographer_assigned) names.push(`${op.photographer_assigned} (Photo)`);
      if (op.videographer_assigned) names.push(`${op.videographer_assigned} (Video)`);
      if (op.drone_operator_assigned && op.drone_operator_assigned !== 'None') names.push(`${op.drone_operator_assigned} (Drone)`);
      if (op.assistant_assigned && op.assistant_assigned !== 'None') names.push(`${op.assistant_assigned} (Assistant)`);
    }

    const sa = staffAssignments?.filter(s => s.order_id === orderId && s.assignment_status !== 'Cancelled') || [];
    sa.forEach(item => {
      const label = `${item.staff_name} (${item.staff_role})`;
      if (!names.some(n => n.startsWith(item.staff_name))) {
        names.push(label);
      }
    });

    return names.length > 0 ? names.join(', ') : 'No staff assigned yet';
  };

  // Helper: Get Reporting Time of Event
  const getReportingTimeOfEvent = (orderId: string) => {
    const o = orders.find(ord => ord.order_id === orderId);
    const op = operations.find(o => o.order_id === orderId);
    return op?.reporting_time || o?.reporting_time || o?.event_time || 'N/A';
  };

  // Source of truth matching real event records in Supabase filtered by criteria
  const activeEventsList = useMemo(() => {
    return orders.filter(o => {
      // Must not be closed
      if (o.current_stage === 'Closed') return false;

      // Filter by Search Query
      const matchesSearch = appliedSearch === '' || 
        o.customer_name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        o.order_id.toLowerCase().includes(appliedSearch.toLowerCase()) || 
        o.event_type.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        o.event_location.toLowerCase().includes(appliedSearch.toLowerCase());

      // Filter by Date Inputs
      const matchesStart = appliedStartDate === '' || o.event_date >= appliedStartDate;
      const matchesEnd = appliedEndDate === '' || o.event_date <= appliedEndDate;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [orders, appliedSearch, appliedStartDate, appliedEndDate]);

  // Generate 42 Matrix Squares for Month grid view (completely immune to timezone offsets)
  const gridDays = useMemo(() => {
    // Number of days in the focus month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Week day index of first day of the month (0 = Sunday, 6 = Saturday)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    const days: { dayNumber: number; dateString: string; isCurrentMonth: boolean }[] = [];

    // Trailing days from previous month
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const mStr = String(prevM + 1).padStart(2, '0');
      const dStr = String(dNum).padStart(2, '0');
      days.push({
        dayNumber: dNum,
        dateString: `${prevY}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      days.push({
        dayNumber: i,
        dateString: `${currentYear}-${mStr}-${dStr}`,
        isCurrentMonth: true
      });
    }

    // Leading days of next month to complete exactly 42 slots
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const mStr = String(nextM + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      days.push({
        dayNumber: i,
        dateString: `${nextY}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Filters Events scheduled on the selected day
  const selectedDayEvents = useMemo(() => {
    return activeEventsList.filter(o => o.event_date === selectedDate);
  }, [activeEventsList, selectedDate]);

  // Apply inputs handler
  const handleApplyFilters = () => {
    sessionStorage.setItem('ops_search', searchQuery);
    sessionStorage.setItem('ops_start_date', startDateInput);
    sessionStorage.setItem('ops_end_date', endDateInput);

    setAppliedSearch(searchQuery);
    setAppliedStartDate(startDateInput);
    setAppliedEndDate(endDateInput);

    window.dispatchEvent(new Event('storage_sync'));
  };

  // Reset inputs handler
  const handleResetFilters = () => {
    sessionStorage.removeItem('ops_search');
    sessionStorage.removeItem('ops_start_date');
    sessionStorage.removeItem('ops_end_date');

    setSearchQuery('');
    setStartDateInput('');
    setEndDateInput('');
    setAppliedSearch('');
    setAppliedStartDate('');
    setAppliedEndDate('');

    window.dispatchEvent(new Event('storage_sync'));
  };

  // Get active month character name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Colors for Stage styling
  const getStageStyle = (stage: string) => {
    switch (stage) {
      case 'Order Confirmed':
        return 'border-l-4 border-blue-500 bg-blue-500/5 text-blue-400';
      case 'Event Scheduled':
        return 'border-l-4 border-violet-500 bg-violet-500/5 text-violet-400';
      case 'Staff Assigned':
        return 'border-l-4 border-cyan-500 bg-cyan-500/5 text-cyan-400';
      case 'Event Completed':
        return 'border-l-4 border-emerald-500 bg-emerald-500/5 text-emerald-400';
      case 'Raw Footage Received':
        return 'border-l-4 border-amber-500 bg-amber-500/5 text-amber-450';
      default:
        return 'border-l-4 border-zinc-650 bg-zinc-900/40 text-zinc-300';
    }
  };

  // Mini-Badge representation on calendar cell
  const getCellEventBorders = (evt: Order) => {
    if (evt.current_stage === 'Event Completed') return 'bg-emerald-500 text-emerald-900';
    if (evt.current_stage === 'Raw Footage Received') return 'bg-amber-500 text-amber-950';
    if (evt.current_stage === 'Event Scheduled') return 'bg-violet-500 text-violet-950';
    if (evt.current_stage === 'Staff Assigned') return 'bg-cyan-500 text-cyan-950';
    return 'bg-blue-500 text-blue-950';
  };

  return (
    <div className="space-y-6">

      {/* SEARCH AND FILTER WORKSPACE HEADER */}
      <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-850 shadow-2xl relative overflow-hidden">
        {/* Cinematic light glass beam */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-zinc-900 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center relative">
              <div className="absolute inset-1 rounded-full border border-dashed border-amber-500/30 animate-[spin_60s_linear_infinite]" />
              <Compass className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-black text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                <span>TIMETABLE QUERY MONITOR</span>
                <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded">CALENDAR CODES</span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">Control live event date highlighting and filter out schedules by customer keyword and start-to-end boundaries.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-zinc-500 uppercase font-black">LEGEND:</span>
            <div className="flex items-center gap-3 bg-zinc-900 px-3 py-1.5 border border-zinc-850 rounded-lg">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Confirmed</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> Scheduled</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Crew Assigned</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Raw Footage</span>
            </div>
          </div>
        </div>

        {/* Form elements for search filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-5 relative z-10">
          <div className="md:col-span-4">
            <label className="block text-[10px] uppercase font-mono font-black text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-500" />
              <span>Search Day / Name / shoot location</span>
            </label>
            <input
              type="text"
              placeholder="Search Customer, package Name, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-1.5 px-3 text-xs text-zinc-100 font-sans focus:outline-none focus:border-amber-500 transition-all placeholder-zinc-550"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] uppercase font-mono font-black text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Start Range Constraint</span>
            </label>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-1.5 px-3 text-xs text-zinc-100 font-mono focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] uppercase font-mono font-black text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>End Range Constraint</span>
            </label>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-1.5 px-3 text-xs text-zinc-100 font-mono focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="flex-1 flex items-center justify-center bg-amber-500 hover:bg-amber-450 text-zinc-950 py-1.5 text-xs font-mono font-black rounded-xl transition-all cursor-pointer select-none border border-transparent shadow"
            >
              FILTER
            </button>
            <button
              onClick={handleResetFilters}
              className="flex-1 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-1.5 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer border border-zinc-800 select-none"
            >
              CLEAR
            </button>
          </div>
        </div>
      </div>

      {/* CALENDAR MONTH CONTAINER */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEADING CALENDAR MATRIX GRID SECTION (XL:SPAN-8) */}
        <div className="xl:col-span-8 bg-zinc-950/60 p-5 rounded-2xl border border-zinc-850 shadow-2xl relative overflow-hidden backdrop-blur-md">
          
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-[pulse_2s_infinite]" />
              <h2 className="text-sm font-black text-zinc-100 font-mono uppercase tracking-wider">
                {monthNames[currentMonth]} {currentYear}
              </h2>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-1 px-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={jumpToToday}
                className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[10px] font-mono text-amber-550 font-bold transition-all cursor-pointer"
              >
                TODAY
              </button>

              <button
                onClick={nextMonth}
                className="p-1 px-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SKELETON DAYS OF WEEK HEADER */}
          <div className="grid grid-cols-7 text-center border-b border-zinc-900 pb-2 mb-2 font-mono text-[10px] uppercase font-black tracking-widest text-zinc-550">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* GRID OF 42 CELL SQUARES */}
          <div className="grid grid-cols-7 gap-1.5 min-h-[480px]">
            {gridDays.map((cell, idx) => {
              // Find events on this date
              const dayEvents = activeEventsList.filter(o => o.event_date === cell.dateString);
              const isSelected = selectedDate === cell.dateString;
              const isSimulationToday = cell.dateString === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(cell.dateString)}
                  className={`p-1.5 rounded-xl border relative flex flex-col justify-between transition-all duration-300 cursor-pointer min-h-[75px] group select-none text-left overflow-hidden ${
                    isSelected 
                      ? 'bg-zinc-950/95 border-amber-500 ring-2 ring-amber-500/20 shadow-amber-500/5' 
                      : isSimulationToday
                        ? 'bg-zinc-900/90 border-emerald-500/65 shadow-emerald-500/5'
                        : cell.isCurrentMonth 
                          ? 'bg-zinc-900/30 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/60' 
                          : 'bg-zinc-950/20 border-zinc-900/50 opacity-40 hover:opacity-75'
                  }`}
                >
                  {/* Concentric subtle DSLR ring overlay on clicked cell */}
                  {isSelected && (
                    <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full border border-dashed border-amber-500/10 pointer-events-none animate-[spin_30s_linear_infinite]" />
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-black ${
                      isSimulationToday 
                        ? 'text-emerald-400 font-black' 
                        : isSelected 
                          ? 'text-amber-400 font-black' 
                          : 'text-zinc-400'
                    }`}>
                      {cell.dayNumber}
                    </span>
                    
                    {dayEvents.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 relative flex">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      </span>
                    )}
                  </div>

                  {/* Micro list of day shoot events (Limit to 2 rows to fit preview cell cleanly) */}
                  <div className="mt-1 space-y-0.5 relative z-10">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div 
                        key={ev.order_id} 
                        className={`text-[8px] font-mono font-bold leading-tight truncate px-1 rounded border-l ${getCellEventBorders(ev)}`}
                        title={`${ev.customer_name} — ${ev.event_type}`}
                      >
                        {ev.customer_name}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[7px] font-mono text-zinc-500 pl-1 font-black">
                        + {dayEvents.length - 2} more shoots
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DAY INSPECTOR PANEL (XL:SPAN-4) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-850 rounded-2xl p-5 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500 rounded-l" />

            {/* DSLR Camera Crosshair corner decors */}
            <div className="absolute top-3 left-4 w-2 h-2 border-t border-l border-amber-500/40" />
            <div className="absolute top-3 right-4 w-2 h-2 border-t border-r border-amber-500/40" />
            
            <div className="border-b border-zinc-900 pb-3 mb-4 relative z-10 pl-2">
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-450 px-2.5 py-0.5 rounded font-mono font-bold">
                SHOOT LOG INSPECTOR
              </span>
              <h3 className="text-xs font-mono font-black text-zinc-100 uppercase tracking-widest mt-2">
                {selectedDate === todayStr ? 'TODAY (18-JUN-2026)' : formatDateString(selectedDate)}
              </h3>
              <p className="text-[11px] text-zinc-450 mt-1 font-sans">
                Found <b>{selectedDayEvents.length}</b> events registered on database registry.
              </p>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="p-10 text-center font-mono text-xs italic text-zinc-550 border border-dashed border-zinc-850 rounded-xl relative z-10">
                No events scheduled for this selected date in the studio system.
              </div>
            ) : (
              <div className="space-y-4 max-h-[480px] overflow-y-auto relative z-10 pl-1 pr-1">
                {selectedDayEvents.map((ev) => {
                  return (
                    <div 
                      key={ev.order_id} 
                      className={`rounded-xl border p-4 space-y-3 transition-all relative ${getStageStyle(ev.current_stage)}`}
                    >
                      {/* Shoot identification */}
                      <div className="flex items-center justify-between border-b border-zinc-900/30 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-zinc-950 border border-zinc-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold text-zinc-400">
                            {ev.order_id}
                          </span>
                          <span className="text-xs font-black text-zinc-200 truncate max-w-[120px] font-sans">
                            {ev.customer_name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase bg-zinc-950/50 px-1.5 py-0.5 rounded border border-zinc-900/10 font-bold text-white">
                          🏷️ {ev.event_type}
                        </span>
                      </div>

                      {/* Details lines */}
                      <div className="space-y-1.5 text-[11px] font-sans text-zinc-300">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          <span className="truncate" title={ev.event_location}>{ev.event_location}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          <div className="font-mono text-xs">
                            Start: <span className="text-zinc-200 font-bold">{ev.event_time || 'N/A'}</span>
                            <span className="mx-2 text-zinc-600">|</span>
                            Reporting: <span className="text-amber-450 font-bold">{getReportingTimeOfEvent(ev.order_id)}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 pt-1 border-t border-zinc-900/20">
                          <Users className="w-3.5 h-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Crew Assigned:</span>
                            <span className="text-[11px] text-zinc-200 leading-normal block font-sans">
                              {getAssignedCrewString(ev.order_id)}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-900/10 flex items-center justify-between">
                          <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold">Latest Status Badge</span>
                          <span className="text-[10px] font-mono font-black uppercase text-amber-500">
                            {ev.current_stage}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

// Helper: Format string dates for human viewing
function formatDateString(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const [y, m, d] = dateStr.split('-');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${d}-${months[parseInt(m, 10) - 1]}-${y}`;
  } catch {
    return dateStr;
  }
}
