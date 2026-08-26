import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, ChevronDown, AlertCircle, Wrench } from 'lucide-react';
import { Equipment } from '../../types';

interface OtherStaffEquipment {
  staffName?: string;
  equipmentNames: string[];
}

interface EquipmentSelectorDropdownProps {
  equipment: Equipment[];
  selectedEquipmentNames: string[];
  onToggleEquipment: (equipmentName: string) => void;
  onRemoveEquipment: (equipmentName: string) => void;
  otherStaffEquipments?: OtherStaffEquipment[];
  isEquipmentBusy: (equipmentName: string, currentOrderId?: string, targetDate?: string) => boolean;
  currentOrderId?: string;
  targetEventDate?: string;
  placeholder?: string;
  disabled?: boolean;
  onShowRoster?: (eq: Equipment) => void;
}

export const EquipmentSelectorDropdown: React.FC<EquipmentSelectorDropdownProps> = ({
  equipment = [],
  selectedEquipmentNames = [],
  onToggleEquipment,
  onRemoveEquipment,
  otherStaffEquipments = [],
  isEquipmentBusy,
  currentOrderId,
  targetEventDate,
  placeholder = 'Search to assign equipment...',
  disabled = false,
  onShowRoster
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy' | 'selected'>('all');
  
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

  // Compute availability for each equipment item
  const equipmentWithAvailability = useMemo(() => {
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

      // Check if busy on another order/event
      const isBusyElsewhere =
        !isSelected && isEquipmentBusy(eq.equipment_name, currentOrderId, targetEventDate);

      let statusType: 'selected' | 'available' | 'busy' | 'maintenance' | 'damaged' = 'available';
      let statusLabel = 'Available';
      let canAssign = true;
      let reason = '';

      let requiresWarning = false;

      if (isSelected) {
        statusType = 'selected';
        statusLabel = 'Selected';
        canAssign = true;
      } else if (assignedToOtherStaff) {
        statusType = 'busy';
        statusLabel = assignedToOtherStaff.staffName
          ? `Assigned to ${assignedToOtherStaff.staffName}`
          : 'Assigned to Crew';
        canAssign = true; // REMOVED HARD LOCK
        requiresWarning = true;
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
        canAssign = true; // REMOVED HARD LOCK
        requiresWarning = true;
        reason = `Assigned to another active event on this date.`;
      }

      return {
        ...eq,
        statusType,
        statusLabel,
        canAssign,
        requiresWarning,
        reason,
        isSelected
      };
    });
  }, [equipment, selectedEquipmentNames, otherStaffEquipments, isEquipmentBusy, currentOrderId, targetEventDate]);

  // Counts for filter pills
  const counts = useMemo(() => {
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
  }, [equipmentWithAvailability]);

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
      alert(`⚠️ Cannot Assign "${eq.equipment_name}":\n${eq.reason || 'This equipment is currently unavailable/busy.'}`);
      return;
    }
    
    if (eq.requiresWarning) {
      if (!window.confirm(`This equipment is already assigned. Please check the Equipment Roster before assigning it again.\n\nDo you want to continue assigning "${eq.equipment_name}"?`)) {
        return;
      }
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
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 font-mono">
                          {eq.serial_number && <span>SN: {eq.serial_number}</span>}
                          {eq.storage_location && <span>Loc: {eq.storage_location}</span>}
                          {eq.reason && !eq.canAssign && (
                            <span className="text-rose-400/90 font-sans italic truncate max-w-[220px]">
                              • {eq.reason}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge & Checkbox Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        {onShowRoster && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShowRoster(eq);
                            }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 hover:bg-amber-500/20 hover:text-amber-400 border border-zinc-700 transition-colors"
                          >
                            Equipment Roster
                          </button>
                        )}
                        {/* Availability Badge */}
                        {eq.isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Check className="w-3 h-3 text-amber-400" /> Selected
                          </span>
                        ) : eq.statusType === 'available' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Available
                          </span>
                        ) : eq.statusType === 'busy' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> {eq.statusLabel}
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
    </div>
  );
};
