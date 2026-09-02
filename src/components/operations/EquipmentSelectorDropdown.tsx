import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, ChevronDown, AlertCircle, Wrench } from 'lucide-react';
import { Equipment } from '../../types';

interface OtherStaffEquipment {
  staffName?: string;
  equipmentNames: string[];
}

export interface EquipmentConflictDetails {
  staffName: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
}

export interface EquipmentAvailability {
  isBusy: boolean;
  statusText?: string;
  conflicts: EquipmentConflictDetails[];
  schedule: EquipmentConflictDetails[];
}

interface EquipmentSelectorDropdownProps {
  equipment: Equipment[];
  selectedEquipmentNames: string[];
  otherStaffEquipments?: { staffName: string; equipmentNames: string[] }[];
  onToggleEquipment: (eqName: string) => void;
  onRemoveEquipment: (eqName: string) => void;
  checkEquipmentAvailability: (eqName: string, orderId?: string, date?: string, start?: string, end?: string) => any;
  currentOrderId?: string;
  targetEventDate?: string;
  targetStartTime?: string;
  targetEndTime?: string;
  targetStaffName?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const EquipmentSelectorDropdown: React.FC<EquipmentSelectorDropdownProps> = ({
  equipment,
  selectedEquipmentNames,
  otherStaffEquipments = [],
  onToggleEquipment,
  onRemoveEquipment,
  checkEquipmentAvailability,
  currentOrderId,
  targetEventDate,
  targetStartTime,
  targetEndTime,
  targetStaffName,
  disabled = false,
  placeholder = "Select equipment..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy' | 'selected'>('all');
  
  // Conflict modal state
  const [conflictModalState, setConflictModalState] = useState<{
    isOpen: boolean;
    equipment: any;
  } | null>(null);

  
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Position state for portal
  const [popoverCoords, setPopoverCoords] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
  }>({
    left: 0,
    top: 0,
    width: 380,
    maxHeight: 380,
    openUpward: false
  });

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Minimum width for good readability, but within viewport bounds
    const idealWidth = Math.max(rect.width, Math.min(420, viewportWidth - 24));
    const width = Math.min(idealWidth, viewportWidth - 24);

    // Calculate left bounded inside viewport
    let left = rect.left;
    if (left + width > viewportWidth - 12) {
      left = viewportWidth - width - 12;
    }
    if (left < 12) {
      left = 12;
    }

    // Determine vertical orientation
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;

    // If space below is tight (<260px) and space above is bigger, open upward
    const openUpward = spaceBelow < 260 && spaceAbove > spaceBelow;
    const maxHeight = openUpward
      ? Math.min(440, Math.max(200, spaceAbove))
      : Math.min(440, Math.max(200, spaceBelow));

    const top = openUpward ? rect.top - 8 : rect.bottom + 8;

    setPopoverCoords({
      left,
      top,
      width,
      maxHeight,
      openUpward
    });
  }, []);

  // Update position on open, window resize, or scroll
  useEffect(() => {
    if (!isOpen) return;

    updatePopoverPosition();

    const handleScrollOrResize = () => {
      updatePopoverPosition();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true } as any);
    };
  }, [isOpen, updatePopoverPosition]);

  // Click outside to close (handles clicks outside trigger and popover portal)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        triggerRef.current.contains(target)
      ) {
        return;
      }
      if (
        popoverRef.current &&
        popoverRef.current.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Compute availability for each equipment item ONLY when opened or inspecting modal
  const equipmentWithAvailability = useMemo(() => {
    if (!isOpen && !conflictModalState?.isOpen) {
      return [];
    }

    return (equipment || []).map((eq) => {
      const isSelected = selectedEquipmentNames.includes(eq.equipment_name);

      // Check if assigned to another staff member in the same event
      const assignedToOtherStaff = otherStaffEquipments.find(
        (other) => other.equipmentNames && other.equipmentNames.includes(eq.equipment_name)
      );

      // Check maintenance or damaged status in inventory
      const isMaintenance =
        eq.status === 'Under Maintenance' || eq.status === 'Maintenance';
      const isDamagedOrInactive =
        eq.status === 'Damaged' ||
        eq.status === 'Lost' ||
        eq.status === 'Inactive' ||
        eq.status === 'Retired';

      // Check if busy on another order/event using exact Date + Start Time + End Time overlap logic
      const availability = checkEquipmentAvailability(eq.equipment_name, currentOrderId, targetEventDate, targetStartTime, targetEndTime);
      const isBusyElsewhere = !isSelected && availability.isBusy;

      let statusType: 'selected' | 'available' | 'busy' | 'maintenance' | 'damaged' = 'available';
      let statusLabel = 'Available';
      let canAssign = true;
      let reason = '';

      if (isSelected) {
        statusType = 'selected';
        statusLabel = 'Selected';
        canAssign = true;
      } else if (assignedToOtherStaff) {
        statusType = 'busy';
        statusLabel = assignedToOtherStaff.staffName
          ? `Assigned to ${assignedToOtherStaff.staffName}`
          : 'Assigned to Crew';
        canAssign = false;
        reason = `Already assigned to ${assignedToOtherStaff.staffName || 'another crew member'} for this shoot.`;
      } else if (isMaintenance) {
        statusType = 'maintenance';
        statusLabel = 'Maintenance';
        canAssign = false;
        reason = `Equipment is currently under maintenance.`;
      } else if (isDamagedOrInactive) {
        statusType = 'damaged';
        statusLabel = eq.status || 'Unavailable';
        canAssign = false;
        reason = `Equipment status is ${eq.status}.`;
      } else if (isBusyElsewhere) {
        statusType = 'busy';
        statusLabel = 'Busy / In Use';
        canAssign = false;
        reason = `Assigned to another active event with overlapping time.`;
      }

      return {
        ...eq,
        statusType,
        statusLabel,
        canAssign,
        reason,
        conflicts: availability?.conflicts || [],
        schedule: availability?.schedule || [],
        isSelected
      };
    });
  }, [isOpen, conflictModalState?.isOpen, equipment, selectedEquipmentNames, otherStaffEquipments, checkEquipmentAvailability, currentOrderId, targetEventDate, targetStartTime, targetEndTime]);

  // Counts for filter pills
  const counts = useMemo(() => {
    if (!isOpen && !conflictModalState?.isOpen) {
      return {
        all: equipment?.length || 0,
        available: 0,
        busy: 0,
        selected: selectedEquipmentNames.length
      };
    }

    let available = 0;
    let busy = 0;
    let selected = 0;

    equipmentWithAvailability.forEach((eq) => {
      if (eq.isSelected) selected++;
      else if (eq.canAssign) available++;
      else busy++;
    });

    return {
      all: equipmentWithAvailability.length,
      available,
      busy,
      selected
    };
  }, [equipmentWithAvailability, isOpen, conflictModalState?.isOpen, equipment?.length, selectedEquipmentNames.length]);

  // Filtered equipment list based on search and status filter
  const filteredEquipment = useMemo(() => {
    return equipmentWithAvailability.filter((eq) => {
      // 1. Status Filter
      if (statusFilter === 'available' && (!eq.canAssign || eq.isSelected)) return false;
      if (statusFilter === 'busy' && (eq.canAssign || eq.isSelected)) return false;
      if (statusFilter === 'selected' && !eq.isSelected) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (eq.equipment_name || '').toLowerCase().includes(q);
        const typeMatch = (eq.equipment_type || '').toLowerCase().includes(q);
        const brandMatch = (eq.brand || '').toLowerCase().includes(q);
        const modelMatch = (eq.model || '').toLowerCase().includes(q);
        const serialMatch = (eq.serial_number || '').toLowerCase().includes(q);
        const locationMatch = (eq.storage_location || '').toLowerCase().includes(q);
        return nameMatch || typeMatch || brandMatch || modelMatch || serialMatch || locationMatch;
      }

      return true;
    });
  }, [equipmentWithAvailability, statusFilter, searchQuery]);

  const handleItemClick = (eq: typeof equipmentWithAvailability[0]) => {
    if (eq.isSelected) {
      // Unselect
      onToggleEquipment(eq.equipment_name);
      return;
    }

    if (!eq.canAssign) {
      setConflictModalState({ isOpen: true, equipment: eq });
      return;
    }

    // Assign
    onToggleEquipment(eq.equipment_name);
  };

  return (
    <div className="relative w-full">
      {/* Selected Equipment Badges List */}
      {selectedEquipmentNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {selectedEquipmentNames.map((eqName, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono font-medium rounded-lg border border-amber-500/30 transition-all shadow-sm group"
            >
              <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[220px]" title={eqName}>
                {eqName}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveEquipment(eqName);
                }}
                disabled={disabled}
                className="text-amber-500 hover:text-amber-200 hover:bg-amber-500/30 p-0.5 rounded transition-colors font-bold text-xs cursor-pointer focus:outline-none"
                title={`Remove ${eqName}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Main Trigger Bar */}
      <div
        ref={triggerRef}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => {
              const next = !prev;
              if (next) {
                // Ensure fresh bounds on open
                requestAnimationFrame(updatePopoverPosition);
              }
              return next;
            });
          }
        }}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 bg-zinc-900/90 hover:bg-zinc-850/90 border rounded-xl cursor-pointer transition-all duration-150 select-none shadow-sm ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-zinc-900 shadow-amber-500/5'
            : selectedEquipmentNames.length > 0
            ? 'border-zinc-700 hover:border-zinc-600'
            : 'border-zinc-800 hover:border-zinc-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Wrench className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-amber-400' : 'text-zinc-500'}`} />
          <span className="text-xs text-zinc-300 truncate">
            {selectedEquipmentNames.length > 0
              ? `${selectedEquipmentNames.length} item(s) selected • Click to edit`
              : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/60 hidden sm:inline-block">
            {counts.all} Total
          </span>
          <button
            type="button"
            className={`p-1 rounded-md text-zinc-400 hover:text-zinc-200 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-amber-400' : ''
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating React Portal Popover (Escapes any parent container clipping, overflow, or modal bounds) */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              left: `${popoverCoords.left}px`,
              top: `${popoverCoords.top}px`,
              width: `${popoverCoords.width}px`,
              maxHeight: `${popoverCoords.maxHeight}px`,
              transform: popoverCoords.openUpward ? 'translateY(-100%)' : 'none',
              zIndex: 99999
            }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 ring-2 ring-black/80 backdrop-blur-md"
          >
            {/* Header with Search Box */}
            <div className="p-2.5 sm:p-3 border-b border-zinc-800 bg-zinc-950/95 space-y-2 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search equipment by name, category, model..."
                  className="w-full bg-zinc-900 border border-zinc-750 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 focus:outline-none rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 font-sans"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 text-zinc-400 hover:text-zinc-200 p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px] font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-1 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  All ({counts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('available')}
                  className={`px-2 py-1 rounded-lg border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                    statusFilter === 'available'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/15 hover:bg-emerald-500/10'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Available ({counts.available})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('busy')}
                  className={`px-2 py-1 rounded-lg border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                    statusFilter === 'busy'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                      : 'bg-rose-500/5 text-rose-400 border-rose-500/15 hover:bg-rose-500/10'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Busy ({counts.busy})
                </button>
                {counts.selected > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('selected')}
                    className={`px-2 py-1 rounded-lg border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                      statusFilter === 'selected'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                        : 'bg-amber-500/5 text-amber-400 border-amber-500/15 hover:bg-amber-500/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Selected ({counts.selected})
                  </button>
                )}
              </div>
            </div>

            {/* Internally Scrollable Equipment List */}
            <div className="overflow-y-auto divide-y divide-zinc-800/60 flex-1 p-1 scrollbar-thin max-h-[320px]">
              {filteredEquipment.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <AlertCircle className="w-6 h-6 text-zinc-500 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-mono text-zinc-400 font-semibold">
                    {equipment.length === 0
                      ? 'No equipment registered in Equipment Inventory'
                      : `No equipment found matching "${searchQuery}"`}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-[11px] text-amber-400 hover:underline font-mono cursor-pointer"
                    >
                      Clear Search Query
                    </button>
                  )}
                </div>
              ) : (
                filteredEquipment.map((eq) => {
                  return (
                    <div
                      key={eq.equipment_id || eq.equipment_name}
                      onClick={() => handleItemClick(eq)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150 gap-2.5 select-none ${
                        eq.isSelected
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 shadow-sm'
                          : eq.canAssign
                          ? 'hover:bg-zinc-800/80 border border-transparent'
                          : 'opacity-65 hover:bg-zinc-850/60 border border-transparent cursor-not-allowed'
                      }`}
                    >
                      {/* Equipment Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-[260px]">
                              {eq.equipment_name}
                            </span>
                          </span>

                          {eq.equipment_type && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono uppercase">
                              {eq.equipment_type}
                            </span>
                          )}

                          {eq.model && eq.model !== eq.equipment_name && (
                            <span className="text-[9px] text-zinc-400 font-mono hidden sm:inline">
                              • {eq.model}
                            </span>
                          )}
                        </div>

                        {/* Sub-info: Serial number or location if available */}
                        <div className="flex flex-col gap-1 mt-1 text-[10px] text-zinc-500 font-mono">
                          <div className="flex items-center gap-2">
                            {eq.serial_number && <span>SN: {eq.serial_number}</span>}
                            {eq.storage_location && <span>Loc: {eq.storage_location}</span>}
                          </div>
                          
                          {eq.reason && !eq.canAssign && eq.conflicts.length === 0 && (
                            <span className="text-rose-400/90 font-sans italic truncate max-w-[220px]">
                              • {eq.reason}
                            </span>
                          )}

                          {eq.conflicts && eq.conflicts.length > 0 && (
                            <div className="mt-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-rose-300">
                              <div className="font-bold font-sans text-[11px] mb-1.5 flex items-center gap-1.5 text-rose-400">
                                <AlertCircle size={13} className="shrink-0" />
                                <span>Equipment Locked / Busy (Time Overlap)</span>
                              </div>
                              <div className="text-[10px] space-y-1.5">
                                {eq.conflicts.map((c: any, i: number) => (
                                  <div key={i} className="pl-2.5 border-l-2 border-rose-500/40 text-rose-200">
                                    <div><strong className="text-zinc-300">Staff:</strong> {c.staffName}</div>
                                    <div><strong className="text-zinc-300">Event:</strong> {c.eventName} ({c.eventDate})</div>
                                    <div><strong className="text-zinc-300">Time:</strong> <span className="font-mono text-rose-300 font-bold">{c.startTime || '?'} – {c.endTime || '?'}</span></div>
                                  </div>
                                ))}
                                <div className="mt-1.5 pt-1.5 border-t border-rose-500/20 text-zinc-400 text-[10px]">
                                  <span className="font-semibold text-zinc-300">Current Event:</span> {targetEventDate || 'Selected Date'} {targetStartTime ? `(${targetStartTime} – ${targetEndTime || '?'})` : ''}
                                </div>
                              </div>
                            </div>
                          )}

                          {eq.schedule && eq.schedule.length > 0 && eq.conflicts.length === 0 && (
                            <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-emerald-300">
                              <div className="font-bold font-sans text-[11px] mb-1 flex items-center gap-1.5 text-emerald-400">
                                <Check size={13} className="shrink-0" />
                                <span>Equipment Available (Working on another event)</span>
                              </div>
                              <div className="text-[10px] text-emerald-300/90 mb-1.5">
                                No time conflict with current event: <strong>{targetEventDate}</strong> {targetStartTime ? `(${targetStartTime} – ${targetEndTime || '?'})` : ''}
                              </div>
                              <div className="mt-1 pt-1.5 border-t border-emerald-500/20">
                                <div className="text-[9px] uppercase tracking-wider mb-1 text-zinc-400 font-mono font-semibold">Other Event Schedule on {targetEventDate}:</div>
                                {eq.schedule.map((s: any, i: number) => (
                                  <div key={i} className="pl-2.5 border-l-2 border-emerald-500/40 text-[10px] text-emerald-200 mb-1">
                                    <div><strong className="text-zinc-300">Event:</strong> {s.eventName} • <strong className="text-zinc-300">Staff:</strong> {s.staffName}</div>
                                    <div><strong className="text-zinc-300">Time:</strong> <span className="font-mono text-emerald-300 font-bold">{s.startTime || '?'} – {s.endTime || '?'}</span></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>

                      {/* Status Badge & Checkbox Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Availability Badge */}
                        {eq.isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Check className="w-3 h-3 text-amber-400" /> Selected
                          </span>
                        ) : eq.canAssign ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> {eq.statusLabel}
                          </span>
                        )}

                        {/* Selection Box */}
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                            eq.isSelected
                              ? 'bg-amber-500 border-amber-500 text-black shadow-sm shadow-amber-500/30 font-black'
                              : eq.canAssign
                              ? 'border-zinc-700 hover:border-zinc-500 text-transparent'
                              : 'border-zinc-800 bg-zinc-850/60 text-transparent opacity-50'
                          }`}
                        >
                          {eq.isSelected && <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Bar */}
            <div className="p-2.5 px-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0">
              <span className="text-[10px] text-zinc-500">
                Showing {filteredEquipment.length} of {equipment.length} equipment items
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>,
          document.body

        )}

      {/* Conflict Modal Portal */}
      {conflictModalState?.isOpen && conflictModalState.equipment &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
               style={{ touchAction: 'none' }}>
            <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl w-full max-w-md max-h-[100dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex items-start justify-between bg-zinc-950/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Equipment Busy
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {conflictModalState.equipment.equipment_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConflictModalState(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 overflow-y-auto scrollbar-thin">
                {conflictModalState.equipment.conflicts && conflictModalState.equipment.conflicts.length > 0 ? (
                  <div className="space-y-4">
                    {/* Existing Assignments */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-semibold px-1">
                        Currently Assigned
                      </h4>
                      {conflictModalState.equipment.conflicts.map((c: any, i: number) => (
                        <div key={i} className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                          <div className="grid grid-cols-[60px_1fr] gap-y-1.5 text-xs">
                            <span className="text-zinc-500 font-medium">Staff:</span>
                            <span className="text-zinc-200 font-bold">{c.staffName}</span>
                            
                            <span className="text-zinc-500 font-medium">Event:</span>
                            <span className="text-zinc-200">{c.eventName}</span>
                            
                            <span className="text-zinc-500 font-medium">Date:</span>
                            <span className="text-zinc-200">{c.eventDate}</span>
                            
                            <span className="text-zinc-500 font-medium">Time:</span>
                            <span className="text-rose-300 font-mono font-medium">{c.startTime || '?'} – {c.endTime || '?'}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Requested Assignment */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-semibold px-1">
                        Requested
                      </h4>
                      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                        <div className="grid grid-cols-[60px_1fr] gap-y-1.5 text-xs">
                          <span className="text-zinc-500 font-medium">Staff:</span>
                          <span className="text-zinc-200 font-bold">{targetStaffName || 'Current Staff'}</span>
                          
                          <span className="text-zinc-500 font-medium">Event:</span>
                          <span className="text-zinc-200">Current Assignment</span>
                          
                          <span className="text-zinc-500 font-medium">Date:</span>
                          <span className="text-zinc-200">{targetEventDate || '?'}</span>
                          
                          <span className="text-zinc-500 font-medium">Time:</span>
                          <span className="text-emerald-300 font-mono font-medium">{targetStartTime || '?'} – {targetEndTime || '?'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-300 block mb-1 text-xs">Reason:</strong>
                      The requested time overlaps with the existing equipment assignment.
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                    </div>
                    <p className="text-rose-400 font-semibold mb-1">
                      Status: BUSY — NOT AVAILABLE
                    </p>
                    <p className="text-sm text-zinc-400 px-4">
                      {conflictModalState.equipment.reason || 'This equipment is currently unavailable due to maintenance, damage, or another assignment.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setConflictModalState(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition-colors w-full sm:w-auto"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>

  );
};
