import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from './RoleContext';
import { motion, AnimatePresence } from 'motion/react';
import { supabaseClient } from '../supabaseClient';
import { 
  Play, CheckCircle2, UserCheck, Eye, EyeOff, Calendar, Lock, Layers, AlertCircle, Ban, RefreshCw, Clock,
  PlusSquare, ArrowRight, CheckSquare, AlertTriangle, Truck, Users, BarChart3, TrendingUp, Sparkles, UserPlus, ChevronRight,
  Aperture, Camera, Sliders, ShieldCheck, Image, Download, Printer, FileSpreadsheet, FileText, Search,
  Trash2, X, Mail, MessageSquare, Edit3, MapPin, Plus, Phone, ExternalLink, FileVideo, Upload
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Production, EditingStatus, Staff } from '../types';
import { performBusinessOwnerReview } from '../utils/businessOwnerReview';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ProjectDetailModal } from './ProjectDetailModal';
import { formatINR, triggerAutoScrollAndFocus, convertTo12Hour, formatQtyItem, parseQtyAndText, parseDeliverablesWithQty, uploadProofToStorage, resolveStorageUrl, parseCustomerProof, ParsedCustomerProof, formatDateDDMMYY } from '../utils';
import { AppLogo } from './AppLogo';
import { AddNoteModal } from './AddNoteModal';
import { StatusText } from './ui/StatusText';
import { EventDropdownCell } from './EventDropdownCell';
import { UnifiedEventDropdownCell } from './UnifiedEventDropdownCell';
import { ProductionCalendar } from './ProductionCalendar';
import { StaffManagementModule } from './StaffManagementModule';
import { NotificationsModule } from './NotificationsModule';
import { Bell } from 'lucide-react';
import { CameraLensStatsCard, CameraLensTheme } from './CameraLensStatsCard';
import { ProductionStaffDirectoryModule } from './ProductionStaffDirectoryModule';
import { ProductionRoleSpecialitiesModule } from './ProductionRoleSpecialitiesModule';
import { ListSortFilter, SortOrder, compareRecordsByDate } from './ui/ListSortFilter';

function getIndividualDeliverables(description: string): string[] {
  if (!description) return [];
  // Split by newline first
  let lines = description.split(/\r?\n/);
  // If there's only 1 line and it has commas, split by comma, but only if they don't look like they are inside parentheses
  if (lines.length === 1 && description.includes(',')) {
    lines = description.split(/,(?![^(]*\))/);
  }
  
  return lines
    .map(line => {
      // Remove leading numbers like "1.", "1 )", "- ", "* "
      let cleaned = line.replace(/^\s*([0-9]+\.?\s*\)?|-|\*)\s*/, '').trim();
      return formatQtyItem(cleaned);
    })
    .filter(line => line.length > 0);
}

function toInputDateFormat(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    let cleanStr = dateStr;
    if (cleanStr.includes('T')) {
      cleanStr = cleanStr.split('T')[0];
    }
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
}

function parseExactDeliverables(description: string, targetEventName?: string, targetEventId?: string): string[] {
  const list = parseDeliverablesWithQty(description, targetEventName, targetEventId);
  return list.map(item => `${item.qty} × ${item.name}`);
}

function formatWhatsAppNumber(phone: string) {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

function generatePersonalizedWhatsAppMessage(params: {
  staffName: string;
  role: string;
  event: string;
  client: string;
  mobile: string;
  deliverables: Array<{ name: string; deadline: string }>;
  deadline: string;
  notes: string;
  coordinatorName: string;
  coordinatorMobile: string;
}) {
  const deliverablesText = params.deliverables
    .map((d, i) => `${i + 1}. ${d.name} (Deadline: ${d.deadline || params.deadline})`)
    .join('\n');

  return `*PHOTOCREW STUDIO TASK ASSIGNMENT*

*Staff Name:* ${params.staffName}
*Role:* ${params.role}
*Event:* ${params.event}
*Client:* ${params.client}
*Client Mobile:* ${params.mobile}

*Your Assigned Deliverables:*
${deliverablesText}

*Deadline:* ${params.deadline}

*Coordinator Details:* ${params.coordinatorName} ${params.coordinatorMobile ? `(${params.coordinatorMobile})` : ''}

*Project Notes:* ${params.notes}

_Please access the PhotoCrew ERP Dashboard to synchronize progress and start work._`;
}



export const CameraLensGraphic: React.FC<{
  type: 'total_leads' | 'new_projects' | 'in_editing' | 'in_review' | 'approved' | 'delivered' | 'overdue';
  active?: boolean;
}> = ({ type, active = true }) => {
  const spec = {
    total_leads: { label: 'V-NEON 50mm f/1.2', color: 'text-violet-400', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]', innerGlow: 'from-violet-950/80 via-zinc-950 to-indigo-900/30' },
    new_projects: { label: 'E-BLUE 85mm f/1.4', color: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.35)]', innerGlow: 'from-blue-950/80 via-zinc-950 to-cyan-900/30' },
    in_editing: { label: 'V-EDIT 35mm f/1.4', color: 'text-indigo-400', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.35)]', innerGlow: 'from-indigo-950/80 via-zinc-950 to-violet-900/30' },
    in_review: { label: 'QC-GOLD 24mm f/1.2', color: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.35)]', innerGlow: 'from-amber-950/80 via-zinc-950 to-yellow-950/30' },
    approved: { label: 'M-GREEN 105mm f/2.8', color: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]', innerGlow: 'from-teal-950/80 via-zinc-950 to-emerald-900/30' },
    delivered: { label: 'C-GLASS 70-200mm f/2.8', color: 'text-cyan-400', glow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]', innerGlow: 'from-cyan-950/80 via-zinc-950 to-teal-900/30' },
    overdue: { label: 'Ø 77mm WARNING', color: 'text-rose-400', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.45)]', innerGlow: 'from-rose-950/80 via-zinc-950 to-red-900/30' },
  }[type];

  return (
    <div className="relative w-18 h-18 flex items-center justify-center select-none group/lens">
      {/* 3D Camera Lens Outer Barrel */}
      <div className={`absolute inset-0 rounded-full border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 flex items-center justify-center p-0.5 shadow-xl ring-1 ring-white/5 transition-all duration-700 group-hover/card:scale-105 group-hover/card:border-zinc-700 ${spec.glow}`}>
        
        {/* Physical outer focus notched ring elements */}
        <div className="absolute inset-0.5 rounded-full border border-zinc-800/80 border-dashed animate-[spin_50s_linear_infinite] group-hover/card:rotate-90 group-hover/card:duration-1000 transition-all duration-700" />
        
        {/* Core focusing notch ticks */}
        <div className="absolute inset-1 rounded-full border border-zinc-900/70 opacity-60 flex items-center justify-center">
          <div className="absolute top-0 w-0.5 h-1 bg-zinc-650" />
          <div className="absolute bottom-0 w-0.5 h-1 bg-zinc-650" />
          <div className="absolute left-0 h-0.5 w-1 bg-zinc-650" />
          <div className="absolute right-0 h-0.5 w-1 bg-zinc-650" />
        </div>

        {/* Outer Rim Text label scale */}
        <div className="absolute inset-1 rounded-full overflow-hidden flex items-center justify-center pointer-events-none opacity-0 group-hover/lens:opacity-100 transition-opacity duration-300">
          <span className="text-[5px] font-mono font-semibold tracking-widest text-zinc-500 scale-95 uppercase">{type === 'overdue' ? 'Ø 58mm' : 'AF CORE'}</span>
        </div>

        {/* Inner lens element barrel */}
        <div className="absolute inset-2 rounded-full border border-zinc-900/90 bg-zinc-950/90 flex items-center justify-center overflow-hidden">
          
          {/* Aperture Blades */}
          <div className="absolute inset-0 opacity-[0.22] group-hover/card:opacity-[0.38] transition-all duration-700">
            <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-650 group-hover/card:rotate-45 group-hover/card:scale-95 transition-all duration-700">
              <polygon points="50,0 75,25 35,50 15,25" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <polygon points="75,25 100,50 60,65 50,25" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <polygon points="100,50 75,100 40,75 50,55" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <polygon points="75,100 25,100 35,60 50,75" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <polygon points="25,100 0,50 40,35 50,75" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <polygon points="0,50 25,0 60,35 50,25" fill="none" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Sensor / Glass curvature element with neon gradient themes */}
          <div className={`absolute inset-2.5 rounded-full bg-gradient-to-br transition-all duration-500 flex items-center justify-center ${spec.innerGlow}`}>
            
            {/* Camera Viewfinder Crosshairs */}
            {type === 'in_review' && (
              <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-amber-400/50" />
                <div className="absolute left-1/2 top-0 h-full w-[0.5px] bg-amber-400/50" />
                <div className="absolute inset-2 border border-dashed border-amber-600/20 rounded-full" />
              </div>
            )}

            {/* Premium realistic lens reflection overlays */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/15 opacity-80 mix-blend-overlay pointer-events-none group-hover/card:scale-110 group-hover/card:-rotate-12 transition-all duration-1000 ease-out" />
            
            {/* Dynamic Flare reflection hot spots */}
            <div className="absolute top-0.5 left-1.5 w-5 h-2 bg-white/25 blur-[1px] rounded-full rotate-[-25deg] pointer-events-none group-hover/card:translate-x-1 group-hover/card:scale-110 transition-all duration-700" />
            <div className="absolute bottom-1 right-2 w-3 h-1 bg-white/10 blur-[0.5px] rounded-full rotate-[15deg] pointer-events-none opacity-60" />

            {/* Realistic lens flare horizontal line */}
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
              <div className="absolute left-[-50%] top-[45%] w-[200%] h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-[-35deg] blur-[0.5px] group-hover/card:translate-y-1 transition-transform duration-1000" />
            </div>

            {/* Floating focal details spec labels on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/lens:opacity-90 bg-zinc-950/80 transition-opacity duration-350 rounded-full pointer-events-none overflow-hidden p-0.5">
              <span className="text-[5.5px] font-mono leading-tight font-bold text-center text-zinc-400 uppercase tracking-widest">{spec.label}</span>
            </div>

            {/* Core Action Icons */}
            <span className="relative flex items-center justify-center transition-transform duration-500 group-hover/card:scale-110">
              {type === 'total_leads' && (
                <div className="flex flex-col items-center">
                  <Aperture className="w-5 h-5 text-violet-400 animate-[spin_10s_linear_infinite]" />
                  <span className="absolute w-6 h-6 rounded-full border border-violet-500/20 scale-75 animate-ping opacity-60 pointer-events-none" />
                </div>
              )}

              {type === 'new_projects' && (
                <div className="flex flex-col items-center relative">
                  <Camera className="w-5 h-5 text-blue-400" />
                  <div className="absolute -inset-1.5 bg-white/30 rounded-full opacity-0 group-hover/card:opacity-100 group-hover/card:animate-ping pointer-events-none duration-1000" />
                </div>
              )}

              {type === 'in_editing' && (
                <div className="flex flex-col items-center">
                  <Sliders className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <span className="absolute w-5 h-5 rounded-full border-2 border-indigo-400/10 border-t-indigo-400 animate-[spin_2.5s_linear_infinite] pointer-events-none" />
                </div>
              )}

              {type === 'in_review' && (
                <div className="relative flex flex-col items-center justify-center w-5 h-5">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <div className="absolute left-[-2px] right-[-2px] h-[1.2px] bg-amber-400 shadow-[0_0_6px_#f59e0b] opacity-80 animate-[bounce_2s_infinite_ease-in-out]" />
                </div>
              )}

              {type === 'approved' && (
                <div className="relative flex flex-col items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
              )}

              {type === 'delivered' && (
                <div className="flex flex-col items-center">
                  <Image className="w-5 h-5 text-cyan-400" />
                  <Sparkles className="absolute -top-1 -right-1 w-2.5 h-2.5 text-cyan-300 animate-bounce" />
                </div>
              )}

              {type === 'overdue' && (
                <div className="relative flex flex-col items-center justify-center">
                  <Clock className="w-4 h-4 text-rose-400 animate-pulse" />
                  <div className="absolute inset-[-4px] rounded-full border border-rose-500/25 border-t-rose-500 animate-[spin_3s_linear_infinite]" />
                </div>
              )}
            </span>

          </div>
        </div>
      </div>
    </div>
  );
};

interface StaffSelectDropdownProps {
  deliverable: string;
  rowId: string;
  staffType: 'In-House' | 'Freelancer';
  selectedStaffId: string;
  onSelect: (staffId: string) => void;
  productionStaff: any[];
  editorAssignments: any[];
  onOpenRoster: (staffName: string) => void;
  allRowsForDeliverable: Array<{ id: string; staffType: string; staffId: string }>;
}

const StaffSelectDropdown = React.memo(({
  deliverable,
  rowId,
  staffType,
  selectedStaffId,
  onSelect,
  productionStaff,
  editorAssignments,
  onOpenRoster,
  allRowsForDeliverable
}: StaffSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isDataLoading, refreshData, production } = useRole();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredStaff = useMemo(() => {
    const map = new Map<string, any>();
    productionStaff.forEach(s => {
      if (s.status !== 'Active') return;
      const type = s.staff_type || (s as any).Staff_Type || 'In-House';
      const cleanType = type.replace(/[\s-]/g, '').toLowerCase();
      const cleanFilter = staffType.replace(/[\s-]/g, '').toLowerCase();
      if (cleanType === cleanFilter) {
         if (!map.has(s.name)) {
            map.set(s.name, s);
         }
      }
    });
    return Array.from(map.values());
  }, [productionStaff, staffType]);

  // If the Staff Type changes, clear any previously selected staff member that no longer matches the selected type or is not active
  useEffect(() => {
    if (selectedStaffId && productionStaff.length > 0) {
      const match = (productionStaff || []).find(s => s.staff_id === selectedStaffId);
      if (match) {
        const type = match.staff_type || (match as any).Staff_Type || 'In-House';
        const cleanType = type.replace(/[\s-]/g, '').toLowerCase();
        const cleanFilter = staffType.replace(/[\s-]/g, '').toLowerCase();
        
        if (cleanType !== cleanFilter || match.status !== 'Active') {
          onSelect('');
        }
      } else {
        onSelect('');
      }
    }
  }, [staffType, selectedStaffId, productionStaff, onSelect]);

  const currentStaff = useMemo(() => {
    // Note: look in the entire active productionStaff list first, but only allow showing it if it matches the active status and current staffType filter
    const staffMember = (productionStaff || []).find(s => s.staff_id === selectedStaffId);
    if (!staffMember || staffMember.status !== 'Active') return null;
    const type = staffMember.staff_type || (staffMember as any).Staff_Type || 'In-House';
    const cleanType = type.replace(/[\s-]/g, '').toLowerCase();
    const cleanFilter = staffType.replace(/[\s-]/g, '').toLowerCase();
    if (cleanType !== cleanFilter) return null;
    return staffMember;
  }, [productionStaff, selectedStaffId, staffType]);

  const currentStaffIsBusy = useMemo(() => {
    if (!currentStaff) return false;
    return editorAssignments.some(a => a.staff_id === currentStaff.staff_id && isAssignmentActive(a, production || []));
  }, [currentStaff, editorAssignments, production]);

  return (
    <div ref={dropdownRef} className="relative w-full text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-xs text-zinc-300 rounded-xl px-2.5 py-1.5 font-sans focus:outline-none focus:border-purple-500 cursor-pointer min-h-[34px] flex items-center justify-between gap-1.5"
      >
        <span className="truncate">
          {isDataLoading && productionStaff.length === 0 ? (
            <span className="flex items-center gap-1.5 text-zinc-500 italic">
              <span className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Fetching staff...</span>
            </span>
          ) : currentStaff ? (
            <span className="flex items-center gap-1.5">
              <span className="text-xs shrink-0">{currentStaffIsBusy ? '🔴' : '🟢'}</span>
              <span className="truncate">{currentStaff.name}</span>
            </span>
          ) : (
            <span className="text-zinc-500">Select Staff</span>
          )}
        </span>
        <span className="text-[10px] text-zinc-500 shrink-0 select-none">▼</span>
      </button>

      {currentStaff && currentStaffIsBusy && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenRoster(currentStaff.name);
          }}
          className="absolute right-7 top-1/2 -translate-y-1/2 text-[9px] bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-900/30 px-1.5 py-0.5 rounded font-mono transition-colors"
          title="View Roster"
        >
          Roster
        </button>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto divide-y divide-zinc-900">
          <div
            onClick={() => {
              onSelect('');
              setIsOpen(false);
            }}
            className="px-3 py-2 text-xs text-zinc-505 hover:bg-zinc-900 cursor-pointer transition-colors font-mono"
          >
            Clear Selection
          </div>
          {isDataLoading && productionStaff.length === 0 ? (
            <div className="px-3 py-4 text-xs text-zinc-400 font-mono text-center flex flex-col items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Loading staff roster...</span>
            </div>
          ) : (
            <>
              {(filteredStaff || []).map(s => {
                  const isBusy = editorAssignments.some(a => a.staff_id === s.staff_id && isAssignmentActive(a, production || []));
                  const isAlreadyAssigned = allRowsForDeliverable.some(r => r.staffId === s.staff_id && r.id !== rowId);
                  return (
                    <div
                      key={s.staff_id}
                      onClick={() => {
                        if (isAlreadyAssigned) return;
                        onSelect(s.staff_id);
                        setIsOpen(false);
                      }}
                      className={`px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                        isAlreadyAssigned 
                          ? 'opacity-50 cursor-not-allowed bg-zinc-950 text-zinc-650' 
                          : 'hover:bg-zinc-900 cursor-pointer text-zinc-350 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="text-xs shrink-0">{isBusy ? '🔴' : '🟢'}</span>
                        <span className="font-medium truncate">{s.name}</span>
                        <span className="text-[10px] text-zinc-550 font-mono truncate">({s.role || 'Staff'})</span>
                        {isAlreadyAssigned && <span className="text-[9px] text-zinc-600 font-mono italic">(Already assigned)</span>}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isBusy ? 'bg-rose-950/30 text-rose-400 border border-rose-900/30' : 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                        }`}>
                          {isBusy ? 'Busy' : 'Available'}
                        </span>
                        
                        {isBusy && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRoster(s.name);
                            }}
                            className="text-[9px] font-mono text-[#a78bfa] hover:text-[#c084fc] hover:underline px-1 py-0.5"
                          >
                            Roster
                          </button>
                        )}
                      </div>
                    </div>
                  );
              })}
              {filteredStaff.length === 0 && (
                <div className="px-3 py-4 text-xs text-rose-400 italic font-mono text-center">
                  No staff available for the selected Staff Type.
                </div>
              )}
            </>
          )}
          {productionStaff.length === 0 && !isDataLoading && (
            <div className="px-3 py-4 text-xs text-zinc-400 italic font-mono text-center flex flex-col items-center gap-2">
              <span>Database Connection Error or No Staff Registered.</span>
              <button
                type="button"
                onClick={() => {
                  if (typeof refreshData === 'function') {
                    refreshData();
                  }
                }}
                className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 text-[10px] rounded transition-all font-sans font-bold"
              >
                Retry Fetch
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export interface ProductionModuleProps {
  activeSubTab: 'pipeline' | 'production_leads' | 'project_queue' | 'assignments' | 'tracker' | 'delivery' | 'resources' | 'analytics' | 'staff_performance' | 'overall_performance' | 'deliveries_desk' | 'staff_management' | 'notifications' | 'crew_roster' | 'staff_roster' | 'production_staff_directory' | 'production_role_specialities';
  setActiveSubTab: (tab: any) => void;
}


export const isProjectLocked = (status: string | undefined | null) => {
  if (!status) return false;
  return ['Project Delivered', 'Completed', 'Client Review Sent'].includes(status);
};

export const isAssignmentActive = (assignment: any, productions: any[]) => {
  if (assignment.status === 'Completed') return false;
  const prod = productions.find(p => p.production_id === assignment.production_id);
  if (prod && isProjectLocked(prod.editing_status)) return false;
  return true;
};

export const ProductionModule: React.FC<ProductionModuleProps> = ({ activeSubTab, setActiveSubTab }) => {

  const { 
    currentRole, 
    currentUser,
    currentUserName,
    refreshData,
    production, 
    updateProduction, 
    updateOrderStage,
    markDelivered, 
    acceptRawFootage, 
    orders, 
    rawFootage, 
    staff,
    productionStaff,
    payments,
    operations,
    staffAssignments,
    specialities = [],
    editorAssignments = [],
    assignEditorToProject,
    updateEditorAssignmentStatus,
    deleteEditorAssignment,
    leads: leadsData,
    quotations,
    getLeadCurrentStatus,
    logs,
    addStaff,
    updateStaff,
    deleteStaff,
    addProductionStaff,
    updateProductionStaff,
    deleteProductionStaff,
    addSpeciality,
    isDepartmentAllowedToEdit,
    deleteRawFootage,
    deleteProduction,
    pushUpdate,
    clientAcceptanceVerifications = [],
    saveClientAcceptanceVerification
  } = useRole();

  // Role permissions gate
  const canEdit = (currentRole === 'Production Team' || currentRole === 'Business Owner') && 
                  isDepartmentAllowedToEdit(currentRole, 'Raw Footage Received'); // Need to map correctly per project later

  // Local Helper for Singapore WhatsApp Formatting
  const formatSingaporeWhatsAppNumber = (phone: string) => {
    let cleaned = (phone || '').replace(/[^0-9]/g, '');
    if (!cleaned) return '';
    if (cleaned.length === 8 && (cleaned.startsWith('8') || cleaned.startsWith('9'))) {
      return '65' + cleaned;
    }
    if (cleaned.startsWith('65') && cleaned.length === 10) {
      return cleaned;
    }
    return cleaned;
  };

  // Robustly resolve Order and Lead for any given Production item
  const resolveOrderAndLead = (prodItem: any) => {
    if (!prodItem) return { order: undefined, lead: undefined };
    
    // 1. Try to find via raw footage matching tracking_id or order_id
    const rf = (rawFootage || []).find(f => f.tracking_id === prodItem.tracking_id || f.order_id === prodItem.tracking_id || f.order_id === prodItem.order_id);
    
    // 2. Find order by order_id or lead_id matching tracking_id
    let order = (orders || []).find(o => o.order_id === prodItem.tracking_id || o.lead_id === prodItem.tracking_id || o.order_id === prodItem.order_id || o.lead_id === prodItem.lead_id);
    if (!order && rf) {
      order = (orders || []).find(o => o.order_id === rf.order_id);
    }
    
    // 3. Find lead by lead_id matching tracking_id or order's lead_id
    const lead = leadsData?.find(l => l.lead_id === prodItem.tracking_id || l.lead_id === order?.lead_id || l.lead_id === prodItem.lead_id);
    
    return { order, lead };
  };

  // Robustly extract Raw Footage Drive Link matching the exact Final Consolidated link from Assign Editor notes / Operations verification
  const getRawFootageDriveLink = (prodItem: any): string => {
    if (!prodItem) return '';

    const { order, lead } = resolveOrderAndLead(prodItem);
    const orderId = prodItem.order_id || order?.order_id || prodItem.tracking_id;
    const leadId = prodItem.lead_id || lead?.lead_id || order?.lead_id;
    const eventId = prodItem.event_id;

    // Helper to extract URL from notes string, prioritizing "Verified Footage with Consolidated Link:"
    const extractFromNotes = (text?: string | null): string => {
      if (!text || typeof text !== 'string') return '';
      const vMatch = text.match(/Verified\s+Footage\s+with\s+Consolidated\s+Link:\s*(https?:\/\/[^\s\n\r"']+)/i);
      if (vMatch && vMatch[1]) return vMatch[1].trim();

      const cMatch = text.match(/Consolidated\s+(?:Drive\s+)?Link:\s*(https?:\/\/[^\s\n\r"']+)/i);
      if (cMatch && cMatch[1]) return cMatch[1].trim();

      return '';
    };

    // Helper to extract any valid http link from notes
    const extractAnyUrl = (text?: string | null): string => {
      if (!text || typeof text !== 'string') return '';
      const m = text.match(/(https?:\/\/[^\s\n\r"']+)/i);
      return m ? m[1].trim() : '';
    };

    // 1. Check Notes & Remarks first for the Verified Consolidated Link (SAME AS ASSIGN EDITOR POPUP NOTES)
    const noteCandidates = [
      prodItem.project_notes,
      prodItem.remarks,
      prodItem.upload_notes,
      order?.notes,
      lead?.notes
    ];

    for (const n of noteCandidates) {
      const verified = extractFromNotes(n);
      if (verified) return verified;
    }

    // Match candidate operations records (scoped to exact event_id if present to prevent multi-event mixing)
    const candidateOps = (operations || []).filter(o => {
      if (eventId && eventId !== 'MULTIPLE' && o.event_id && o.event_id === eventId) {
        return !orderId || o.order_id === orderId;
      }
      return (orderId && (o.order_id === orderId || o.lead_id === orderId)) ||
             (leadId && (o.lead_id === leadId || o.order_id === leadId)) ||
             (prodItem.tracking_id && (o.order_id === prodItem.tracking_id || o.lead_id === prodItem.tracking_id));
    });

    for (const op of candidateOps) {
      const fromOpNotes = extractFromNotes(op.remarks) || extractFromNotes(op.upload_notes_remarks) || extractFromNotes((op as any).Upload_Notes_Remarks);
      if (fromOpNotes) return fromOpNotes;
    }

    // Check Raw Footage table upload notes
    const rf = (rawFootage || []).find(f => 
      (orderId && (f.order_id === orderId || f.tracking_id === orderId)) ||
      (prodItem.tracking_id && (f.tracking_id === prodItem.tracking_id || f.order_id === prodItem.tracking_id))
    );
    if (rf?.upload_notes) {
      const fromRfNotes = extractFromNotes(rf.upload_notes);
      if (fromRfNotes) return fromRfNotes;
    }

    // 2. Check explicit final consolidated link columns (Operations & Production)
    for (const op of candidateOps) {
      const consLink = op.consolidated_drive_link || op.Consolidated_Drive_Link;
      if (consLink && typeof consLink === 'string' && consLink.trim() !== '') {
        return consLink.trim();
      }
    }

    const prodConsLink = (prodItem as any).final_consolidated_drive_link || 
                         prodItem.consolidated_drive_link || 
                         prodItem.Consolidated_Drive_Link;
    if (prodConsLink && typeof prodConsLink === 'string' && prodConsLink.trim() !== '') {
      return prodConsLink.trim();
    }

    if (order?.consolidated_drive_link && typeof order.consolidated_drive_link === 'string' && order.consolidated_drive_link.trim() !== '') {
      return order.consolidated_drive_link.trim();
    }
    if (lead?.consolidated_drive_link && typeof lead.consolidated_drive_link === 'string' && lead.consolidated_drive_link.trim() !== '') {
      return lead.consolidated_drive_link.trim();
    }

    // 3. Check general URLs from notes / remarks
    for (const n of noteCandidates) {
      const anyUrl = extractAnyUrl(n);
      if (anyUrl) return anyUrl;
    }
    for (const op of candidateOps) {
      const anyUrl = extractAnyUrl(op.remarks) || extractAnyUrl(op.upload_notes_remarks) || extractAnyUrl((op as any).Upload_Notes_Remarks);
      if (anyUrl) return anyUrl;
    }

    // 4. Fallback only if no consolidated link exists anywhere
    if (prodItem.raw_footage_location && typeof prodItem.raw_footage_location === 'string' && prodItem.raw_footage_location.trim() !== '') {
      return prodItem.raw_footage_location.trim();
    }
    for (const op of candidateOps) {
      const rawLink = op.raw_footage_drive_link || op.Raw_Footage_Drive_Link;
      if (rawLink && typeof rawLink === 'string' && rawLink.trim() !== '') {
        return rawLink.trim();
      }
    }
    if (rf?.server_path && typeof rf.server_path === 'string' && rf.server_path.trim() !== '') {
      return rf.server_path.trim();
    }
    if (order?.raw_footage_link && typeof order.raw_footage_link === 'string' && order.raw_footage_link.trim() !== '') {
      return order.raw_footage_link.trim();
    }
    if (lead?.raw_footage_link && typeof lead.raw_footage_link === 'string' && lead.raw_footage_link.trim() !== '') {
      return lead.raw_footage_link.trim();
    }

    return '';
  };

  const getPersonalizedMessage = (staff: any, deliverables: any[]) => {
    const coordinatorName = whatsappShareData?.coordinator_name || currentUserName || 'Operations Coordinator';
    const coordinatorContact = whatsappShareData?.coordinator_contact || (currentUser?.mobile || currentUser?.phone || '—');
    const eventName = whatsappShareData?.event_name || 'Event';
    const clientName = whatsappShareData?.customer_name || '—';
    const clientMobile = whatsappShareData?.mobile || '—';
    const notes = whatsappShareData?.notes || 'No special notes.';
    const globalDeadline = whatsappShareData?.global_deadline || '—';
    const reportingDate = whatsappShareData?.reporting_date && whatsappShareData.reporting_date !== '—' ? whatsappShareData.reporting_date : null;
    const reportingTime = whatsappShareData?.reporting_time && whatsappShareData.reporting_time !== '—' ? whatsappShareData.reporting_time : null;
    const assignedEquipment = whatsappShareData?.assigned_equipment && whatsappShareData.assigned_equipment !== '—' ? whatsappShareData.assigned_equipment : null;

    const deliverableLines = (Array.isArray(deliverables) ? deliverables : []).map((d: any, index: number) => {
      return `${index + 1}. ${d.name} (Deadline: ${d.deadline || globalDeadline})`;
    }).join('\n');

    let msg = `Hi ${staff.name},

You have been assigned as *${staff.role || 'Crew'}* for the project *${eventName}*.

*Client Details:*
- Client Name: ${clientName}
- Client Mobile: ${clientMobile}

*Your Assigned Deliverable(s):*
${deliverableLines}

*Global Project Deadline:* ${globalDeadline}`;

    if (reportingDate || reportingTime) {
      msg += `\n\n*Reporting Details:*`;
      if (reportingDate) msg += `\n- Reporting Date: ${reportingDate}`;
      if (reportingTime) msg += `\n- Reporting Time: ${reportingTime}`;
    }

    if (assignedEquipment) {
      msg += `\n\n*Assigned Equipment:* \n${assignedEquipment}`;
    }

    msg += `\n\n*Coordinator Details:*
- Coordinator Name: ${coordinatorName}
- Coordinator Contact: ${coordinatorContact}`;

    if (notes && notes !== 'No special notes.' && notes.trim() !== '') {
      msg += `\n\n*Special Instructions / Notes:* \n${notes}`;
    }

    msg += `\n\nPlease acknowledge receipt of this assignment.

Thanks,
${coordinatorName}`;
    return msg;
  };

  const handleSendToWhatsApp = (staff: any, deliverables: any[]) => {
    const currentNum = editedStaffMobiles[staff.staff_id] !== undefined ? editedStaffMobiles[staff.staff_id] : (staff.mobile || '');
    if (!currentNum.trim()) {
      alert("Please enter a valid phone number for " + staff.name);
      return;
    }
    const formattedPhone = formatSingaporeWhatsAppNumber(currentNum);
    const msg = getPersonalizedMessage(staff, deliverables);
    const encodedMsg = encodeURIComponent(msg);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  // Dynamically compile active production projects/leads from all available sources
  const leads = useMemo(() => {
    const validProductionStages = [
      'Verified Footage', 'Footage Handover Verified', 'Raw Footage Received', 'Raw Footage Uploaded',
      'Assigned Editor', 'Editor Assigned', 'Assigned',
      'Editing Started', 'Editing In Progress', 'Editing', 'Internal QC Review',
      'Customer Review', 'Client Review Sent', 'Ready For Review', 'Revision Required', 'Revision In Progress',
      'Editing Completed', 'Editing Complete', 'Final Approval',
      'Client Acceptance', 'Order Closed', 'Closed', 'Completed', 'Project Closed', 'Approved', 'Payment Pending'
    ];

    const preProductionStages = [
      'New Lead', 'Follow Up', 'Follow-Up', 'Quotation Sent', 'Booking Requested',
      'Order Confirmed', 'Confirm Order', 'New Order', 'Order Created',
      'Operations Assigned', 'Assigned Crew', 'Staff Assigned', 'Crew Assigned',
      'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended',
      'Footage Handover'
    ];

    // Build map of candidates keyed by primary order_id/lead_id/tracking_id
    const candidatesMap = new Map<string, {
      key: string;
      lead?: any;
      order?: any;
      prod?: any;
      rawFootage?: any;
      assignments?: any[];
    }>();

    const getOrCreateCandidate = (key: string) => {
      if (!key) return null;
      let existing = candidatesMap.get(key);
      if (!existing) {
        for (const [k, c] of candidatesMap.entries()) {
          if ((c.order && (c.order?.order_id === key || c.order?.lead_id === key)) ||
              (c.lead && c.lead.lead_id === key) ||
              (c.prod && (c.prod.production_id === key || c.prod.tracking_id === key || c.prod.order_id === key || c.prod.lead_id === key))) {
            return c;
          }
        }
        existing = { key };
        candidatesMap.set(key, existing);
      }
      return existing;
    };

    // 1. Process orders
    (orders || []).forEach(order => {
      const key = order?.order_id || order?.lead_id;
      if (!key) return;
      const cand = getOrCreateCandidate(key);
      if (cand) cand.order = order;
    });

    // 2. Process production records
    (production || []).forEach(p => {
      const key = p.order_id || p.tracking_id || p.production_id || p.lead_id;
      if (!key) return;
      const cand = getOrCreateCandidate(key);
      if (cand) cand.prod = p;
    });

    // 3. Process editorAssignments
    (editorAssignments || []).forEach(ea => {
      const key = ea.order_id || ea.production_id;
      if (!key) return;
      const cand = getOrCreateCandidate(key);
      if (cand) {
        if (!cand.assignments) cand.assignments = [];
        cand.assignments.push(ea);
      }
    });

    // 4. Process rawFootage
    (rawFootage || []).forEach(rf => {
      const key = rf.order_id || rf.tracking_id;
      if (!key) return;
      const cand = getOrCreateCandidate(key);
      if (cand) cand.rawFootage = rf;
    });

    // 5. Process CRM leads
    (leadsData || []).forEach(l => {
      const key = l.lead_id;
      if (!key) return;
      const cand = getOrCreateCandidate(key);
      if (cand) cand.lead = l;
    });

    const candidatesList: any[] = [];

    for (const cand of candidatesMap.values()) {
      // Cross-link lead, order, prod, rawFootage if not set
      if (!cand.order) {
        cand.order = (orders || []).find(o => 
          (cand.lead && o.lead_id === cand.lead.lead_id) ||
          (cand.prod && (o.order_id === cand.prod.order_id || o.order_id === cand.prod.tracking_id || o.lead_id === cand.prod.lead_id)) ||
          (cand.rawFootage && o.order_id === cand.rawFootage.order_id)
        );
      }
      if (!cand.lead) {
        cand.lead = (leadsData || []).find(l => 
          (cand.order && l.lead_id === cand.order?.lead_id) ||
          (cand.prod && (l.lead_id === cand.prod.lead_id || l.lead_id === cand.prod.tracking_id))
        );
      }
      if (!cand.prod) {
        cand.prod = (production || []).find(p => 
          (cand.order && (p.order_id === cand.order?.order_id || p.tracking_id === cand.order?.order_id || p.production_id === cand.order?.order_id || p.lead_id === cand.order?.lead_id || p.production_id === `PRD-${cand.order?.order_id}`)) ||
          (cand.lead && (p.tracking_id === cand.lead.lead_id || p.lead_id === cand.lead.lead_id || p.production_id === `PRD-${cand.lead.lead_id}`))
        );
      }
      if (!cand.rawFootage) {
        cand.rawFootage = (rawFootage || []).find(rf => 
          (cand.order && (rf.order_id === cand.order?.order_id || rf.tracking_id === cand.order?.order_id)) ||
          (cand.prod && (rf.order_id === cand.prod.order_id || rf.tracking_id === cand.prod.tracking_id))
        );
      }
      if (!cand.assignments || cand.assignments.length === 0) {
        const orderId = cand.order?.order_id || cand.prod?.order_id || cand.prod?.tracking_id;
        const prodId = cand.prod?.production_id;
        cand.assignments = (editorAssignments || []).filter(ea => 
          (orderId && (ea.order_id === orderId || ea.production_id === orderId)) ||
          (prodId && (ea.production_id === prodId || ea.order_id === prodId))
        );
      }

      // Check whether this candidate has entered Production workflow
      const orderStage = cand.order?.current_stage;
      const prodStatus = cand.prod?.editing_status || cand.prod?.production_status;
      const leadStatus = cand.lead?.status || (cand.lead as any)?.current_status;

      const hasProductionRecord = !!cand.prod;
      const hasAssignments = cand.assignments && cand.assignments.length > 0;
      const hasRawFootage = !!cand.rawFootage;
      const isProdStage = validProductionStages.includes(prodStatus) || validProductionStages.includes(orderStage) || validProductionStages.includes(leadStatus);

      // STRICT PRODUCTION ENTRY GATE
      // Projects MUST NOT enter Production until they reach "Verified Footage".
      // Even if a production record exists accidentally, we hide it if the primary workflow is still pre-production.
      const currentPrimaryStage = (orderStage || leadStatus || '').trim();
      if (preProductionStages.includes(currentPrimaryStage)) {
        continue;
      }

      // Also ensure it actually IS in a valid production stage or has production artifacts
      if (!isProdStage && !hasProductionRecord && !hasAssignments && !hasRawFootage) {
        continue;
      }

      // Filter for Production Staff role
      if (currentRole === 'Production Staff') {
        if (orderStage === 'Client Acceptance' || prodStatus === 'Client Acceptance' || orderStage === 'Order Closed' || prodStatus === 'Order Closed' || orderStage === 'Closed' || prodStatus === 'Closed') {
          continue;
        }

        const myName = (currentUserName || '').trim().toLowerCase();
        const myId = currentUser?.id;
        const assignedInAssignments = cand.assignments?.some(ea => 
          ((ea.staff_name && ea.staff_name.trim().toLowerCase() === myName) || (ea.staff_id && ea.staff_id === myId))
        );
        const assignedInProd = cand.prod ? (
          (cand.prod.editor_assigned && cand.prod.editor_assigned.toLowerCase().includes(myName)) || 
          (cand.prod.assigned_staff && cand.prod.assigned_staff.toLowerCase().includes(myName))
        ) : false;
        if (!assignedInAssignments && !assignedInProd) continue;
      }

      const l = cand.lead;
      const order = cand.order;
      const prod = cand.prod;
      const rf = cand.rawFootage;

      const trackingId = order?.order_id || rf?.tracking_id || prod?.tracking_id || l?.lead_id || cand.key;
      const prodId = prod?.production_id || `PRD-${trackingId}`;

      const computedStatus = prod?.editing_status || prod?.production_status || order?.current_stage || (l as any)?.current_status || l?.status || 'Verified Footage';

      const eventsList = (l?.events && Array.isArray(l.events) && l.events.length > 0)
        ? l.events
        : (order?.events && Array.isArray(order.events) && order.events.length > 0)
          ? order.events
          : [];

      const hasMultipleEvents = eventsList.length > 1;

      const primaryEvent = eventsList[0] || null;
      const evtId = primaryEvent ? (primaryEvent.id || primaryEvent.event_id || 'EVT-01') : (prod?.event_id || order?.event_type || l?.event_type || 'EVT-01');
      const evtName = hasMultipleEvents ? 'Multiple Events' : (primaryEvent ? (primaryEvent.event_name || primaryEvent.event_type || '') : (prod?.custom_event_name || order?.custom_event_name || l?.custom_event_name || order?.event_type || l?.event_type || 'Event'));
      const evtDate = hasMultipleEvents ? (eventsList.map((e: any) => e.event_date).filter(Boolean).join(', ') || 'Multiple Dates') : (primaryEvent ? primaryEvent.event_date : (order?.event_date || l?.event_date || ''));
      const evtTime = hasMultipleEvents ? 'Multiple Times' : (primaryEvent ? (primaryEvent.event_time || primaryEvent.event_start_time || '') : (order?.event_time || l?.event_time || ''));

      const defaultTargetDate = '';

      let computedTargetDate = '';
      if (cand.assignments && cand.assignments.length > 0 && cand.assignments[0].target_finish_date) {
        computedTargetDate = cand.assignments[0].target_finish_date;
      } else if (prod?.target_delivery_date) {
        computedTargetDate = prod.target_delivery_date;
      } else if (prod?.expected_delivery_date) {
        computedTargetDate = prod.expected_delivery_date;
      } else if ((l as any)?.delivery_target_date) {
        computedTargetDate = (l as any)?.delivery_target_date;
      }

      const candidateObj = {
        ...(prod || {}),
        production_id: prodId,
        tracking_id: trackingId,
        order_id: order?.order_id || prod?.order_id || trackingId,
        lead_id: l?.lead_id || order?.lead_id || trackingId,
        event_id: hasMultipleEvents ? 'MULTIPLE' : evtId,
        custom_event_name: evtName,
        events: eventsList,
        customer_name: order?.customer_name || l?.customer_name || prod?.customer_name || 'Client',
        customer_mobile: order?.customer_phone || order?.mobile || l?.mobile || prod?.customer_mobile || '',
        editor_assigned: prod?.editor_assigned || (l as any)?.assigned_editor || 'Unassigned',
        assigned_staff: prod?.assigned_staff || (l as any)?.assigned_editors || '',
        raw_footage_location: prod?.raw_footage_location || rf?.server_path || order?.raw_footage_link || '',
        editing_status: computedStatus,
        remarks: prod?.remarks || l?.remarks || order?.remarks || '',
        project_priority: prod?.project_priority || 'Medium',
        target_delivery_date: computedTargetDate,
        expected_delivery_date: prod?.expected_delivery_date || computedTargetDate,
        event_date: evtDate,
        event_time: evtTime,
      };

      candidatesList.push(candidateObj);
    }

    candidatesList.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return candidatesList;
  }, [leadsData, orders, rawFootage, production, editorAssignments, operations, currentRole, currentUserName, currentUser]);

  // Staff Performance Filter State
  const [staffRoleFilter, setStaffRoleFilter] = useState<'All' | 'Editor' | 'Album Designer' | 'Retoucher' | 'Motion Graphics Designer'>('All');

  // Enhanced Staff and Role states for Editor Performance and Staff Directory
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<Staff | null>(null);
  const [viewingStaffMember, setViewingStaffMember] = useState<Staff | null>(null);
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<{ type: string; memberName: string; list: any[] } | null>(null);
  const [selectedStaffForTasks, setSelectedStaffForTasks] = useState<string | null>(null);

  // Form states for Staff
  const [staffFormName, setStaffFormName] = useState('');
  const [staffFormEmployeeId, setStaffFormEmployeeId] = useState('');
  const [staffFormMobile, setStaffFormMobile] = useState('');
  const [staffFormWhatsapp, setStaffFormWhatsapp] = useState('');
  const [staffFormEmail, setStaffFormEmail] = useState('');
  const [staffFormAddress, setStaffFormAddress] = useState('');
  const [staffFormJoiningDate, setStaffFormJoiningDate] = useState('');
  const [staffFormStatus, setStaffFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [staffFormRole, setStaffFormRole] = useState('');
  const [customRoleSpecialty, setCustomRoleSpecialty] = useState('');

  // Filtering states inside Editor Performance tab
  const [searchStaffName, setSearchStaffName] = useState('');
  const [searchStaffWhatsapp, setSearchStaffWhatsapp] = useState('');
  const [perfRoleFilter, setPerfRoleFilter] = useState('All');
  const [perfStatusFilter, setPerfStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive'

  // Custom role state
  const [isCustomRoleModalOpen, setIsCustomRoleModalOpen] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');

  // List of all default role specialties
  const DEFAULT_PRODUCTION_ROLES = useMemo(() => [
    'Video Editor',
    'Wedding Editor',
    'Senior Wedding Editor',
    'Reels Editor',
    'Album Designer',
    'Cinematic Editor',
    'Color Grading Editor',
    'Motion Graphics Editor',
    'QC Reviewer',
    'Delivery Coordinator'
  ], []);

  const allRoles = useMemo(() => {
    const rolesSet = new Set(DEFAULT_PRODUCTION_ROLES);
    specialities.forEach(s => {
      if (s.name && s.active) {
        rolesSet.add(s.name);
      }
    });
    return Array.from(rolesSet);
  }, [specialities, DEFAULT_PRODUCTION_ROLES]);

  const getStaffRosterStats = (memberName: string) => {
    const assigned = (production || []).filter(prod => 
      prod.editor_assigned === memberName || 
      (prod.assigned_staff && prod.assigned_staff.includes(memberName))
    );
    const completedList = assigned.filter(prod => 
      prod.editing_status === 'Delivered' || 
      prod.editing_status === 'Project Delivered' || 
      prod.editing_status === 'Closed' || 
      prod.editing_status === 'Project Closed' ||
      prod.editing_status === 'Completed' ||
      prod.editing_status === 'Approved' ||
      prod.production_status === 'Closed'
    );
    const completedCount = completedList.length;

    const pendingList = assigned.filter(prod => 
      prod.editing_status !== 'Delivered' && 
      prod.editing_status !== 'Project Delivered' && 
      prod.editing_status !== 'Closed' && 
      prod.editing_status !== 'Project Closed' &&
      prod.editing_status !== 'Completed' &&
      prod.editing_status !== 'Approved' &&
      prod.production_status !== 'Closed'
    );
    const pendingCount = pendingList.length;

    const approvedList = assigned.filter(prod => 
      prod.editing_status === 'Approved' || 
      prod.editing_status === 'Final Approval'
    );
    const approvedCount = approvedList.length;

    const revisionList = assigned.filter(prod => 
      prod.editing_status === 'Revision Required' || 
      prod.editing_status === 'Revision In Progress' ||
      prod.correction_needed ||
      prod.editing_status === 'Correction Needed'
    );
    const revisionCount = revisionList.length;

    const inProgressList = assigned.filter(prod => 
      prod.editing_status === 'Editing In Progress' || 
      prod.editing_status === 'Editing Started' ||
      prod.editing_status === 'Revision In Progress' ||
      prod.production_status === 'In Progress' ||
      prod.production_status === 'Editing Started'
    );
    const inProgressCount = inProgressList.length;

    // Calculate Average Delivery Time (in days)
    let totalDays = 0;
    let completedWithDatesCount = 0;
    completedList.forEach(prod => {
      const startStr = prod.editing_start_date;
      const endStr = prod.actual_delivery_date || prod.delivery_date;
      if (startStr && endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const diffMs = end.getTime() - start.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays >= 0) {
            totalDays += diffDays;
            completedWithDatesCount++;
          }
        }
      }
    });
    const avgDeliveryTimeDays = completedWithDatesCount > 0 
      ? Math.round((totalDays / completedWithDatesCount) * 10) / 10 
      : null;

    return {
      assigned,
      completedList,
      completedCount,
      pendingList,
      pendingCount,
      approvedList,
      approvedCount,
      revisionList,
      revisionCount,
      inProgressList,
      inProgressCount,
      avgDeliveryTimeDays
    };
  };

  const filteredStaff = useMemo(() => {
    return (productionStaff || []).filter(s => {
      const matchesName = s.name.toLowerCase().includes(searchStaffName.toLowerCase());
      const whatsappToMatch = s.whatsapp_number || s.mobile || '';
      const matchesWhatsapp = whatsappToMatch.toLowerCase().includes(searchStaffWhatsapp.toLowerCase());
      const matchesRole = perfRoleFilter === 'All' || s.production_role_speciality === perfRoleFilter || s.role === perfRoleFilter;
      const matchesStatus = perfStatusFilter === 'All' || s.status === perfStatusFilter;
      return matchesName && matchesWhatsapp && matchesRole && matchesStatus;
    });
  }, [productionStaff, searchStaffName, searchStaffWhatsapp, perfRoleFilter, perfStatusFilter]);

  // Reports Exporters
  const handleDownloadCSV = () => {
    if (filteredStaff.length === 0) {
      alert('No staff data available to export.');
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Employee ID,Staff Name,Production Role,Mobile,WhatsApp,Email,Assigned Jobs,Completed Jobs,Pending Jobs,Client Approved,Revision,Status\n";
    filteredStaff.forEach(s => {
      const stats = getStaffRosterStats(s.name);
      csvContent += `"${s.employee_id || s.staff_id}","${s.name}","${s.production_role_speciality || s.role || 'Production Editor'}","${s.mobile}","${s.whatsapp_number || s.mobile}","${s.email}",${stats.assigned.length},${stats.completedCount},${stats.pendingCount},${stats.approvedCount},${stats.revisionCount},"${s.status}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Post_Production_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcel = () => {
    if (filteredStaff.length === 0) {
      alert('No staff data available to export.');
      return;
    }
    const dataForSheet = (filteredStaff || []).map(s => {
      const stats = getStaffRosterStats(s.name);
      return {
        "Employee ID": s.employee_id || s.staff_id,
        "Staff Name": s.name,
        "Production Role": s.production_role_speciality || s.role || 'Production Editor',
        "Mobile Number": s.mobile,
        "WhatsApp Number": s.whatsapp_number || s.mobile,
        "Email Address": s.email,
        "Assigned Projects": stats.assigned.length,
        "Completed Projects": stats.completedCount,
        "Pending Projects": stats.pendingCount,
        "Client Approved Projects": stats.approvedCount,
        "Revision Projects": stats.revisionCount,
        "Status": s.status
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Performance Report");
    XLSX.writeFile(workbook, `Post_Production_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadPDF = () => {
    if (filteredStaff.length === 0) {
      alert('No staff data available to export.');
      return;
    }
    const doc = new jsPDF();
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PHOTO CREW ENTERPRISE ERP", 14, 20);
    doc.setFontSize(11);
    doc.text("Editor Performance & Staff Directory Report", 14, 28);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

    let y = 44;
    doc.setFillColor(30, 30, 36);
    doc.rect(14, y, 182, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Name", 16, y + 6);
    doc.text("Role", 55, y + 6);
    doc.text("Assign", 115, y + 6);
    doc.text("Complete", 132, y + 6);
    doc.text("Approved", 152, y + 6);
    doc.text("Status", 172, y + 6);

    y += 8;
    doc.setTextColor(50, 50, 50);
    doc.setFont("Helvetica", "normal");

    filteredStaff.forEach((s) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const stats = getStaffRosterStats(s.name);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(s.name.substring(0, 18), 16, y + 6);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text((s.production_role_speciality || s.role || 'Production Editor').substring(0, 25), 55, y + 6);
      doc.text(String(stats.assigned.length), 115, y + 6);
      doc.text(String(stats.completedCount), 132, y + 6);
      doc.text(String(stats.approvedCount), 152, y + 6);
      doc.text(s.status, 172, y + 6);
      
      y += 8;
    });

    doc.save(`Post_Production_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormName.trim()) {
      alert("Staff Name is required.");
      return;
    }

    const isCustom = staffFormRole === 'Other / Custom Role Specialty';
    const chosenSpeciality = isCustom ? customRoleSpecialty.trim() : (staffFormRole || 'Video Editor');
    const chosenRoleName = isCustom ? customRoleSpecialty.trim() : (staffFormRole || 'Production Editor');

    const payload = {
      name: staffFormName.trim(),
      employee_id: staffFormEmployeeId.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      mobile: staffFormMobile.trim(),
      whatsapp_number: staffFormWhatsapp.trim() || staffFormMobile.trim(),
      email: staffFormEmail.trim(),
      address: staffFormAddress.trim(),
      city: staffFormAddress.trim().split(',')[0] || 'N/A',
      joining_date: staffFormJoiningDate || new Date().toISOString().split('T')[0],
      status: staffFormStatus,
      production_role_speciality: chosenSpeciality,
      custom_role_specialty: isCustom ? customRoleSpecialty.trim() : '',
      role: chosenRoleName,
      department: 'Post-Production'
    };

    try {
      if (editingStaffMember) {
        const { mobile: _m, email: _e, ...safePayload } = payload;
        await updateStaff(editingStaffMember.staff_id, safePayload);
      } else {
        await addStaff(payload);
      }
      setIsStaffModalOpen(false);
      setEditingStaffMember(null);
    } catch (err) {
      console.error("Error submitting staff form:", err);
      alert("Failed to save staff member.");
    }
  };

  const handleSubmitCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleName.trim()) {
      alert("Role Name is required.");
      return;
    }
    try {
      await addSpeciality(customRoleName.trim());
      setIsCustomRoleModalOpen(false);
      setCustomRoleName('');
    } catch (err) {
      console.error("Error adding speciality:", err);
      alert("Failed to save custom role.");
    }
  };

  // State to manage active entry selection
  const [selectedProdId, setSelectedProdId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [masterOrderIdForDetail, setMasterOrderIdForDetail] = useState<string | null>(null);

  // Production Leads UI Search/Filter States
  const [leadSearch, setLeadSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');

  // Dedicated filter states for customer name, order ID search and date ranges
  const [searchCustName, setSearchCustName] = useState('');
  const [searchOrdId, setSearchOrdId] = useState('');
  const [dtStart, setDtStart] = useState('');
  const [dtEnd, setDtEnd] = useState('');

  // Applied filter states that trigger on click "Apply Filter"
  const [appliedCustName, setAppliedCustName] = useState('');
  const [appliedOrdId, setAppliedOrdId] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  // Active Analytics card click filter (All | Card types)
  const [activeCardFilter, setActiveCardFilter] = useState<'All' | 'new_projects_received' | 'in_progress_edit' | 'client_approved' | 'client_not_approved' | 'total_projects_completed'>('All');

  // Dynamic Editor assignment selection mode: Single vs Multiple
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'multiple'>('single');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Action Dropdown state for Production Leads table
  const [openActionDropdown, setOpenActionDropdown] = useState<any>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalLeadId, setNoteModalLeadId] = useState('');
  const [noteModalOrderId, setNoteModalOrderId] = useState('');
  const [noteModalCustomerName, setNoteModalCustomerName] = useState('');
  const [dummyVar, setDummyVar] = useState<{
    id: string;
    buttonEl: HTMLElement | null;
    rect: DOMRect;
    prod: Production;
    order: any;
    displayStatus: string;
    isEditorAssigned: boolean;
    hasSavedAssignments: boolean;
    isStatusActive: boolean;
  } | null>(null);

  useEffect(() => {
    if (!openActionDropdown || !openActionDropdown.buttonEl) return;

    const updatePosition = () => {
      setOpenActionDropdown(prev => {
        if (!prev || !prev.buttonEl) return null;
        const newRect = prev.buttonEl.getBoundingClientRect();
        // If button is completely off visible screen or hidden
        if (
          newRect.bottom < 0 ||
          newRect.top > window.innerHeight ||
          newRect.right < 0 ||
          newRect.left > window.innerWidth ||
          (newRect.width === 0 && newRect.height === 0)
        ) {
          return null;
        }
        return {
          ...prev,
          rect: newRect
        };
      });
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [openActionDropdown?.id, openActionDropdown?.buttonEl]);

  const getProductionStatus = (prod: Production): string => {
    const status = (prod.editing_status || 'Verified Footage') as string;
    if (['Pending', 'Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Uploaded', 'Footage Handover', 'Assigned Crew', 'Staff Assigned', 'Crew Assigned', 'Operations Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'New Project', 'New Project Arrived', 'Order Created', 'New Order', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Booking Requested', 'Follow Up', 'Follow-Up', 'New Lead'].includes(status)) {
      const assignments = (editorAssignments || []).filter(a => 
        a.production_id === prod.production_id ||
        a.production_id === (prod as any).order_id ||
        a.production_id === prod.tracking_id ||
        a.order_id === (prod as any).order_id ||
        a.order_id === prod.tracking_id
      );
      if (assignments && assignments.length > 0) return 'Assigned Editor';
      return 'Verified Footage';
    }
    if (['Editor Assigned', 'Assigned Editor', 'Assigned'].includes(status)) return 'Assigned Editor';
    if (['Editing Started', 'Editing', 'Editing In Progress'].includes(status)) return 'Editing Started';
    if (['Internal QC Review'].includes(status)) return 'Internal QC Review';
    if (['Ready For Review', 'Client Review Sent', 'Customer Review'].includes(status)) return 'Customer Review';
    if (['Editing Completed', 'Editing Complete'].includes(status)) return 'Editing Completed';
    if (['Client Acceptance'].includes(status)) return 'Client Acceptance';
    if (['Revision Required'].includes(status)) return 'Revision Required';
    if (['Revision In Progress'].includes(status)) return 'Revision In Progress';
    if (['Approved', 'Final Approval'].includes(status)) return 'Final Approval';
    if (['Delivered', 'Project Delivered', 'Payment Pending'].includes(status)) return 'Project Delivered';
    if (['Order Closed'].includes(status)) return 'Order Closed';
    if (['Closed', 'Project Closed', 'Completed', 'Project Completed'].includes(status)) return 'Completed';
    if (['Project Cancelled', 'Cancelled', 'Canceled'].includes(status)) return 'Project Cancelled';
    return status;
  };

  const isProductionStaffAssignment = (a: any) => {
    if (!a) return false;
    const sName = (a.staff_name || a.name || '').trim();
    const sId = (a.staff_id || '').trim();

    // Look up in productionStaff
    const prodStaffRec = (productionStaff || []).find(s => 
      (sId && s.staff_id === sId) ||
      (sName && s.name && s.name.toLowerCase() === sName.toLowerCase())
    );

    // Look up in general staff
    const genStaffRec = (staff || []).find(s => 
      (sId && s.staff_id === sId) ||
      (sName && s.name && s.name.toLowerCase() === sName.toLowerCase())
    );

    const dept = (prodStaffRec?.department || genStaffRec?.department || a.department || '').trim().toLowerCase();
    const role = (prodStaffRec?.role || prodStaffRec?.production_role_speciality || genStaffRec?.role || a.staff_role || a.speciality || '').trim().toLowerCase();

    // Explicit Non-Production Roles & Departments
    const nonProdRoles = [
      'photographer', 'cinematographer', 'drone operator', 'dop', 'camera', 'camera operator',
      'operation staff', 'operations executive', 'operation manager', 'venue manager', 'operations',
      'sales', 'sales executive', 'sales staff', 'sales manager', 'accountant'
    ];

    if (dept === 'operations' || dept === 'operation' || dept === 'sales' || dept === 'accounts' || dept === 'hr') {
      return false;
    }

    if (nonProdRoles.some(r => role.includes(r))) {
      return false;
    }

    if (prodStaffRec) return true;
    if (dept.includes('production') || dept.includes('editing') || dept.includes('post')) return true;

    const prodRoles = [
      'editor', 'editing', 'album', 'teaser', 'colorist', 'audio', 'sound', 'designer',
      'quality', 'qa', 'promo', 'trailer', 'post production', 'production', 'retoucher'
    ];
    if (prodRoles.some(r => role.includes(r))) return true;

    if (genStaffRec) {
      const gDept = (genStaffRec.department || '').toLowerCase();
      const gRole = (genStaffRec.role || '').toLowerCase();
      if (gDept.includes('operation') || gDept.includes('sales') || nonProdRoles.some(r => gRole.includes(r))) {
        return false;
      }
      if (gDept.includes('production') || prodRoles.some(r => gRole.includes(r))) {
        return true;
      }
    }

    return true;
  };

  const getAssignedEditorsList = (prod: Production) => {
    const fromAssignments = (editorAssignments || []).filter(a => 
      (a.production_id === prod.production_id ||
       a.production_id === (prod as any).order_id ||
       a.production_id === prod.tracking_id ||
       a.order_id === (prod as any).order_id ||
       a.order_id === prod.tracking_id) &&
      isProductionStaffAssignment(a)
    );
    if (fromAssignments.length > 0) {
      const grouped = new Map<string, any>();
      fromAssignments.forEach(a => {
        const staffName = a.staff_name;
        if (!grouped.has(staffName)) {
          const staffRec = (productionStaff || []).find(s => s.staff_id === a.staff_id || s.name === staffName);
          grouped.set(staffName, {
            name: staffName,
            deliverables: [],
            role: staffRec?.role || staffRec?.production_role_speciality || 'Editor',
            mobile: staffRec?.mobile || 'N/A',
            type: staffRec?.staff_type || (staffRec as any)?.Staff_Type || 'In-House',
            status: a.status || 'Editor Assigned'
          });
        }
        if (a.speciality) {
          grouped.get(staffName).deliverables.push(a.speciality);
        }
      });
      return Array.from(grouped.values()).map(g => ({
        ...g,
        deliverable: g.deliverables.join(', ') || 'Assigned'
      }));
    }
    const staffStr = prod.assigned_staff || prod.editor_assigned;
    if (staffStr && staffStr !== 'Unassigned') {
      return staffStr.split(',').map(s => {
        const name = s.trim();
        const staffRec = (productionStaff || []).find(st => st.name === name);
        return {
          name,
          deliverable: 'Assigned',
          role: staffRec?.role || staffRec?.production_role_speciality || 'Editor',
          mobile: staffRec?.mobile || 'N/A',
          type: staffRec?.staff_type || (staffRec as any)?.Staff_Type || 'In-House',
          status: staffRec?.status || 'Active',
          deliverables: ['Assigned']
        };
      });
    }
    return [];
  };

  const getAssignedDeliverablesForProd = (prod: Production, targetEventOnly: boolean = false): { name: string; qty: number }[] => {
    if (!prod) return [];
    const { order, lead } = resolveOrderAndLead(prod);
    const orderId = order?.order_id || (prod as any).order_id || prod.tracking_id;
    const prodId = prod.production_id;

    // First priority: check editorAssignments for assigned deliverables
    const assignedForThis = (editorAssignments || []).filter(a =>
      (prodId && (a.production_id === prodId || a.order_id === prodId)) ||
      (orderId && (a.order_id === orderId || a.production_id === orderId)) ||
      (prod.tracking_id && (a.order_id === prod.tracking_id || a.production_id === prod.tracking_id))
    );

    if (assignedForThis.length > 0) {
      const filteredByEvent = targetEventOnly && prod.event_id 
        ? assignedForThis.filter(a => !a.event_id || a.event_id === prod.event_id)
        : assignedForThis;

      const map = new Map<string, number>();
      filteredByEvent.forEach(a => {
        const spec = a.speciality || a.deliverable_id;
        if (spec) {
          const { qty: parsedQty, text: parsedText } = parseQtyAndText(spec);
          const name = parsedText || spec;
          const assignedQty = (a as any).qty || (a as any).quantity || parsedQty || 1;
          map.set(name, Math.max(map.get(name) || 0, assignedQty));
        }
      });

      if (map.size > 0) {
        const list: { name: string; qty: number }[] = [];
        map.forEach((qty, name) => {
          list.push({ name, qty });
        });
        return list;
      }
    }

    // Fallback to order deliverables description if no editorAssignments
    let deliverablesText = order?.deliverables_description || lead?.deliverables_description || '';
    if (!deliverablesText && lead) {
      const targetLeadQuotations = quotations?.filter((q: any) => q.lead_id === lead.lead_id) || [];
      targetLeadQuotations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const targetLatestQuote = targetLeadQuotations[0];
      if (targetLatestQuote) {
        deliverablesText = targetLatestQuote.deliverables_description || '';
      }
    }

    const targetEvent = targetEventOnly ? ((prod as any).custom_event_name || (prod as any).event_type || order?.custom_event_name || order?.event_type) : undefined;
    return parseDeliverablesWithQty(deliverablesText, targetEvent);
  };

  const getAssignedEditorsTableData = (prod: Production): { staff_name: string; deliverable: string; qty: number; status: string }[] => {
    const assignedDeliverables = getAssignedDeliverablesForProd(prod, true);
    const orderId = (prod as any).order_id || prod.tracking_id;
    const assignedForThis = (editorAssignments || []).filter(a =>
      (a.production_id === prod.production_id || (orderId && a.order_id === orderId)) &&
      (!prod.event_id || !a.event_id || a.event_id === prod.event_id)
    );
    
    const results: { staff_name: string; deliverable: string; qty: number; status: string }[] = [];
    const usedAssignments = new Set<string>();
    
    assignedDeliverables.forEach(item => {
      const matchingAssignments = assignedForThis.filter(a => (a.speciality === item.name || a.deliverable_id === item.name) && !usedAssignments.has(a.assignment_id));
      if (matchingAssignments.length > 0) {
        matchingAssignments.forEach(a => {
          results.push({
            staff_name: a.staff_name || 'Unassigned',
            deliverable: item.name,
            qty: item.qty,
            status: a.status || 'Assigned Editor'
          });
          usedAssignments.add(a.assignment_id);
        });
      } else {
        results.push({
          staff_name: 'Unassigned',
          deliverable: item.name,
          qty: item.qty,
          status: 'Pending Assignment'
        });
      }
    });
    
    // Add remaining unmatched assignments
    assignedForThis.forEach(a => {
      if (!usedAssignments.has(a.assignment_id)) {
        const { qty, text } = parseQtyAndText(a.speciality || a.deliverable_id || '');
        results.push({
          staff_name: a.staff_name || 'Unassigned',
          deliverable: text || a.speciality || a.deliverable_id || 'Deliverable',
          qty: (a as any).qty || (a as any).quantity || qty || 1,
          status: a.status || 'Assigned Editor'
        });
      }
    });
    
    return results;
  };

  // Helper to validate whether an editor assignment or production has a saved server upload in the database
  const isServerUploadSaved = (a: any, prod?: any): {
    isUploaded: boolean;
    folderName: string;
    eventDate: string;
    uploadLink: string;
    confirmedAt: string;
    confirmedBy: string;
    isValidated: boolean;
  } => {
    if (!a && !prod) {
      return { isUploaded: false, folderName: '', eventDate: '', uploadLink: '', confirmedAt: '', confirmedBy: '', isValidated: false };
    }

    const orderId = a?.order_id || prod?.order_id || prod?.tracking_id || '';
    const eventId = a?.event_id || prod?.event_id || '';
    const cleanOrd = String(orderId || '').trim().toLowerCase();
    const cleanEvt = String(eventId || 'default').trim().toLowerCase();

    const savedVerif = (clientAcceptanceVerifications || []).find(v => {
      const vOrd = String(v.order_id || '').trim().toLowerCase();
      const vEvt = String(v.event_id || 'default').trim().toLowerCase();
      if (cleanOrd && vOrd === cleanOrd) {
        if (!eventId || cleanEvt === 'default' || vEvt === 'default' || vEvt === cleanEvt) {
          return true;
        }
      }
      return false;
    });

    const uploadLink = (
      savedVerif?.upload_link_path ||
      a?.Edited_Drive_Link ||
      a?.edited_drive_link ||
      a?.upload_link ||
      a?.drive_link ||
      a?.edited_link ||
      prod?.edited_drive_link ||
      prod?.delivery_link ||
      ''
    ).trim();

    const folderName = (
      savedVerif?.folder_name ||
      a?.server_upload_folder_name ||
      a?.server_path ||
      prod?.server_upload_folder_name ||
      prod?.server_path ||
      ''
    ).trim();

    const eventDate = (
      a?.server_upload_event_date ||
      prod?.server_upload_event_date ||
      a?.event_date ||
      prod?.event_date ||
      ''
    ).trim();

    const confirmedAt = (savedVerif?.updated_at || a?.server_upload_confirmed_at || prod?.server_upload_confirmed_at || '').trim();
    const confirmedBy = (a?.server_upload_confirmed_by || a?.staff_name || prod?.server_upload_confirmed_by || '').trim();

    // Persisted validation: true if server_upload_confirmed, folder name, server path, or edited drive link exists
    const isUploaded = Boolean(
      savedVerif?.consent_proof_verified === true ||
      (typeof savedVerif?.folder_name === 'string' && savedVerif.folder_name.trim().length > 0) ||
      a?.server_upload_confirmed === true ||
      a?.edited_folder_uploaded_to_server === true ||
      (typeof a?.server_upload_folder_name === 'string' && a.server_upload_folder_name.trim().length > 0) ||
      (typeof a?.server_path === 'string' && a.server_path.trim().length > 0) ||
      (typeof a?.Edited_Drive_Link === 'string' && a.Edited_Drive_Link.trim().length > 0) ||
      (typeof a?.edited_drive_link === 'string' && a.edited_drive_link.trim().length > 0) ||
      prod?.server_upload_confirmed === true ||
      (typeof prod?.server_upload_folder_name === 'string' && prod.server_upload_folder_name.trim().length > 0) ||
      (typeof prod?.server_path === 'string' && prod.server_path.trim().length > 0) ||
      (typeof prod?.edited_drive_link === 'string' && prod.edited_drive_link.trim().length > 0)
    );

    const isValidated = Boolean(
      a?.server_upload_validated === true ||
      prod?.checklist_edited_files_uploaded === true ||
      prod?.server_upload_validated === true ||
      (a?.event_id && prod?.validated_server_uploads?.[a.event_id]) ||
      (a?.assignment_id && prod?.validated_server_uploads?.[a.assignment_id])
    );

    return {
      isUploaded,
      folderName,
      eventDate,
      uploadLink,
      confirmedAt,
      confirmedBy,
      isValidated
    };
  };

  const getClientAcceptanceDeliverables = (prod: Production) => {
    if (!prod) return [];
    const { order, lead } = resolveOrderAndLead(prod);
    const orderId = order?.order_id || (prod as any).order_id || prod.tracking_id;
    const prodId = prod.production_id;

    // 1. Get all assignment records matching this order / production
    const assignments = (editorAssignments || []).filter(a =>
      (prodId && (a.production_id === prodId || a.order_id === prodId)) ||
      (orderId && (a.order_id === orderId || a.production_id === orderId)) ||
      (prod.tracking_id && (a.order_id === prod.tracking_id || a.production_id === prod.tracking_id))
    );

    // 2. Resolve events list
    const eventsList = (lead?.events && Array.isArray(lead.events) && lead.events.length > 0)
      ? lead.events
      : (order?.events && Array.isArray(order.events) && order.events.length > 0)
        ? order.events
        : [];

    const eventGroupMap = new Map<string, {
      eventName: string;
      eventId: string;
      items: Array<{
        key: string;
        assignmentId: string;
        deliverable: string;
        qty: number;
        staffName: string;
        status: string;
        isUploaded: boolean;
        isValidated: boolean;
        folderName: string;
        eventDate: string;
        uploadLink: string;
        confirmedAt: string;
        confirmedBy: string;
      }>;
    }>();

    if (assignments.length > 0) {
      assignments.forEach((a, idx) => {
        let matchedEventName = '';
        if (eventsList.length > 0) {
          const matchedEv = eventsList.find((ev: any) =>
            (ev.id && ev.id === a.event_id) ||
            (ev.event_id && ev.event_id === a.event_id) ||
            (ev.event_name && ev.event_name === a.event_id) ||
            (ev.event_type && ev.event_type === a.event_id)
          );
          if (matchedEv) {
            matchedEventName = matchedEv.event_name || matchedEv.event_type || matchedEv.custom_event_name || `Event ${a.event_id}`;
          }
        }
        if (!matchedEventName) {
          matchedEventName = a.event_id || prod.custom_event_name || order?.custom_event_name || lead?.custom_event_name || order?.event_type || lead?.event_type || 'Event 1';
        }

        const groupKey = a.event_id || matchedEventName;

        if (!eventGroupMap.has(groupKey)) {
          eventGroupMap.set(groupKey, {
            eventName: matchedEventName,
            eventId: groupKey,
            items: []
          });
        }

        const rawSpec = a.speciality || a.deliverable_id || 'Deliverable';
        const { qty: parsedQty, text: parsedText } = parseQtyAndText(rawSpec);
        const qty = (a as any).qty || (a as any).quantity || parsedQty || 1;
        const deliverableName = parsedText || rawSpec;

        const itemKey = a.assignment_id || `item_${groupKey}_${idx}`;
        const uploadStatus = isServerUploadSaved(a, prod);

        eventGroupMap.get(groupKey)!.items.push({
          key: itemKey,
          assignmentId: a.assignment_id,
          deliverable: deliverableName,
          qty: qty,
          staffName: a.staff_name || 'Unassigned',
          status: a.status || 'Assigned',
          isUploaded: uploadStatus.isUploaded,
          isValidated: uploadStatus.isValidated,
          folderName: uploadStatus.folderName,
          eventDate: uploadStatus.eventDate,
          uploadLink: uploadStatus.uploadLink,
          confirmedAt: uploadStatus.confirmedAt,
          confirmedBy: uploadStatus.confirmedBy
        });
      });
    }

    return Array.from(eventGroupMap.values());
  };

  const getTargetDeliveryDateFromAssignments = (prod: Production): string | null => {
    if (!prod) return null;

    if (editorAssignments && editorAssignments.length > 0) {
      const prodOrderId = (prod as any).order_id || prod.tracking_id || prod.production_id;

      const matching = editorAssignments.filter(a =>
        a.production_id === prod.production_id ||
        a.production_id === prod.tracking_id ||
        a.production_id === prodOrderId ||
        a.order_id === prodOrderId ||
        a.order_id === prod.tracking_id ||
        a.order_id === prod.production_id
      );

      if (matching && matching.length > 0) {
        let refined = matching;
        if (prod.event_id && prod.event_id !== 'MULTIPLE') {
          const eventSpecific = matching.filter(a => a.event_id === prod.event_id);
          if (eventSpecific.length > 0) {
            refined = eventSpecific;
          }
        }

        const validDates = refined
          .map(a => a.target_finish_date)
          .filter((d): d is string => !!d && typeof d === 'string' && d.trim() !== '' && d.trim() !== 'N/A' && d.trim() !== '—' && d.trim() !== 'Pending' && d.trim() !== 'Not Set');

        if (validDates.length > 0) return validDates[0];

        const anyValidDates = matching
          .map(a => a.target_finish_date)
          .filter((d): d is string => !!d && typeof d === 'string' && d.trim() !== '' && d.trim() !== 'N/A' && d.trim() !== '—' && d.trim() !== 'Pending' && d.trim() !== 'Not Set');

        if (anyValidDates.length > 0) return anyValidDates[0];
      }
    }

    if (prod.target_delivery_date && typeof prod.target_delivery_date === 'string' && prod.target_delivery_date.trim() !== '' && prod.target_delivery_date.trim() !== 'N/A' && prod.target_delivery_date.trim() !== '—' && prod.target_delivery_date.trim() !== 'Pending' && prod.target_delivery_date.trim() !== 'Not Set') {
      return prod.target_delivery_date;
    }

    if (prod.expected_delivery_date && typeof prod.expected_delivery_date === 'string' && prod.expected_delivery_date.trim() !== '' && prod.expected_delivery_date.trim() !== 'N/A' && prod.expected_delivery_date.trim() !== '—' && prod.expected_delivery_date.trim() !== 'Pending' && prod.expected_delivery_date.trim() !== 'Not Set') {
      return prod.expected_delivery_date;
    }

    return null;
  };

  const formatDisplayDate = (dateStr?: string | null): string => {
    if (!dateStr || dateStr.trim() === '' || dateStr.trim() === 'N/A' || dateStr.trim() === '—' || dateStr.trim() === 'Pending' || dateStr.trim() === 'Not Set') return 'Pending';
    const cleanStr = dateStr.trim().split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (parts[2].length === 4) {
        return cleanStr;
      }
    }
    return cleanStr;
  };

  const getAutomatedProductionStatus = (prod: Production): string => {
    const baseStatus = (prod.editing_status || 'Pending') as string;
    
    // 1. Order Closed (After Business Owner final approval)
    if (['Order Closed', 'Closed', 'Completed', 'Project Closed'].includes(baseStatus)) {
      return 'Order Closed';
    }
    
    // 2. Client Acceptance (After Client Acceptance popup submitted)
    if (baseStatus === 'Client Acceptance' || (prod as any).production_status === 'Client Acceptance' || (prod as any).current_status === 'Client Acceptance') {
      return 'Client Acceptance';
    }

    const assignments = (editorAssignments || []).filter(a => 
      a.production_id === prod.production_id ||
      a.production_id === (prod as any).order_id ||
      a.production_id === prod.tracking_id ||
      a.order_id === (prod as any).order_id ||
      a.order_id === prod.tracking_id
    );
    
    if (assignments.length > 0) {
      const getTaskStageRank = (st: string, driveLink?: string) => {
        const status = st || '';
        if (['Client Acceptance'].includes(status)) return 5;
        if (['Completed', 'Editing Completed', 'Editing Complete'].includes(status)) return 4;
        if (['Customer Review', 'Client Review', 'Client Review Sent'].includes(status) || (driveLink && driveLink.trim() !== '')) return 3;
        if (['Editing Started', 'In Progress', 'Editing In Progress'].includes(status)) return 2;
        if (['Assigned Editor', 'Editor Assigned', 'Assigned'].includes(status)) return 1;
        return 0;
      };

      const ranks = assignments.map(a => getTaskStageRank(a.status, (a as any).edited_drive_link));
      const minRank = Math.min(...ranks);

      if (minRank >= 5) return 'Client Acceptance';
      if (minRank >= 4) return 'Editing Completed';
      if (minRank >= 3) return 'Customer Review';
      if (minRank >= 2) return 'Editing Started';
      if (minRank >= 1) return 'Assigned Editor';
    }

    // Pre-assignment statuses (e.g. Verified Footage, Footage Handover Verified, Raw Footage Received, Pending)
    if (['Pending', 'Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Uploaded', 'Footage Handover', 'Assigned Crew', 'Staff Assigned', 'Crew Assigned', 'Operations Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'New Project', 'New Project Arrived', 'Order Created', 'New Order', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Booking Requested', 'Follow Up', 'Follow-Up', 'New Lead'].includes(baseStatus)) {
      return 'Verified Footage';
    }

    return baseStatus;
  };

  const generateCustomerReviewMessage = (prod: Production): { message: string; phone: string } => {
    const { order, lead } = resolveOrderAndLead(prod);
    const customerName = order?.customer_name || lead?.customer_name || 'Customer';
    const eventType = order?.event_type || lead?.event_type || 'Event';
    const eventDate = order?.event_date || lead?.event_date || 'the event';
    const phone = order?.mobile || lead?.mobile || '';

    const tableData = getAssignedEditorsTableData(prod);
    const deliverablesList = tableData.map(row => {
      const assignment = (editorAssignments || []).find(
        a => a.production_id === prod.production_id && a.speciality === row.deliverable
      );
      const link = assignment?.raw_footage_link || assignment?.edited_drive_link || '';
      return `• ${row.deliverable}: ${link || '(Link Pending)'}`;
    }).join('\n');

    const msg = `Hello ${customerName},
Your edited files for ${eventType} on ${eventDate} are ready for review!

Please review the deliverables below:

${deliverablesList}

Best regards,
Production Team`;

    return { message: msg, phone };
  };

  const handleOpenResendReviewPopup = (prod: Production) => {
    if (prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed') return;
    const { message, phone } = generateCustomerReviewMessage(prod);
    setCustomerReviewResendProd(prod);
    setCustomerReviewMessage(message);
    setCustomerReviewPhone(phone);
  };

  const handleOpenClientAcceptance = (prod: Production) => {
    if (prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed') return;
    setClientAcceptanceProd(prod);

    const orderId = prod.tracking_id || (prod as any).order_id || prod.production_id;
    const cleanOrd = String(orderId || '').trim().toLowerCase();
    const matchingVerifs = (clientAcceptanceVerifications || []).filter(
      v => String(v.order_id || '').trim().toLowerCase() === cleanOrd
    );
    const primaryVerif = matchingVerifs[0];

    const existingProof = prod.client_communication_proof || 
      (prod as any).customer_communication_proof || 
      (prod as any).proof_url || 
      primaryVerif?.client_communication_consent_proof || 
      '';
    setCaCommunicationProof(existingProof);
    
    const existingUploadName = prod.upload_name || 
      prod.proof_name || 
      (prod as any).client_communication_proof_name || 
      primaryVerif?.proof_file_name || 
      (existingProof && !existingProof.startsWith('data:') ? existingProof.split('/').pop()?.split('?')[0] : '') || 
      '';
    setCaUploadName(existingUploadName);

    setCaConsentProofChecked(Boolean((prod as any).checklist_client_communication_proof ?? (existingProof ? true : false)));
    setCaUploadConfirmations({});
    setCaChecklistCompleted(Boolean(prod.checklist_customer_acceptance ?? true));
    setCaInternalValidation(Boolean(prod.server_upload_validated || prod.checklist_edited_files_uploaded));

    // Load persisted 5-item checklist states
    setCaVerifyCustomerAcceptance(prod.checklist_customer_acceptance ?? true);
    setCaContentUsageConfirmation(prod.checklist_content_usage ?? false);
    setCaFootageDeleted7Days(prod.checklist_footage_deleted_7_days ?? false);
    setCaVerifyPaymentSales(prod.checklist_payment_from_sales ?? false);

    const eventGroups = getClientAcceptanceDeliverables(prod);
    const initialChecklist: Record<string, boolean> = {};
    const initialValidationMap: Record<string, boolean> = {};
    const savedValidations = prod.validated_server_uploads || {};

    eventGroups.forEach(g => {
      let groupValidated = false;
      if (savedValidations[g.eventId] !== undefined) {
        groupValidated = Boolean(savedValidations[g.eventId]);
      } else if (prod.checklist_edited_files_uploaded) {
        groupValidated = true;
      }

      g.items.forEach(item => {
        initialChecklist[item.key] = item.isUploaded;
        const itemVal = Boolean(
          savedValidations[item.key] ||
          (item.assignmentId && savedValidations[item.assignmentId]) ||
          item.isValidated ||
          groupValidated
        );
        initialValidationMap[item.key] = itemVal;
        if (item.assignmentId) {
          initialValidationMap[item.assignmentId] = itemVal;
        }
      });
      initialValidationMap[g.eventId] = groupValidated || g.items.every(i => initialValidationMap[i.key]);
    });

    setCaChecklist(initialChecklist);
    setCaValidatedServerUploads(initialValidationMap);

    const overallValidated = Boolean(
      prod.checklist_edited_files_uploaded ||
      prod.server_upload_validated ||
      (eventGroups.length > 0 && eventGroups.every(g => initialValidationMap[g.eventId]))
    );
    setCaValidateEditedFiles(overallValidated);
  };

  const getAssignedEditorsText = (prod: Production): string => {
    const assigned_editors = getAssignedEditorsList(prod);
    return assigned_editors.length > 0
      ? assigned_editors.map(editor => editor.name).join(', ')
      : 'Unassigned';
  };

  const getNextStatuses = (prod: Production): string[] => {
    const current = getProductionStatus(prod);
    const valid: string[] = [current]; // Keep current so the select lists it
    
    if (current === 'Raw Footage Received') {
      valid.push('Editor Assigned');
    } else if (current === 'Editor Assigned') {
      valid.push('Editing Started', 'Editing In Progress');
    } else if (current === 'Editing Started') {
      valid.push('Editing In Progress');
    } else if (current === 'Editing In Progress') {
      valid.push('Client Review Sent');
    } else if (current === 'Client Review Sent') {
      valid.push('Revision Required', 'Final Approval');
    } else if (current === 'Revision Required') {
      valid.push('Revision In Progress', 'Final Approval');
    } else if (current === 'Revision In Progress') {
      valid.push('Client Review Sent', 'Final Approval');
    } else if (current === 'Final Approval') {
      valid.push('Project Delivered');
    } else if (current === 'Project Delivered') {
      valid.push('Completed');
    }
    
    return Array.from(new Set(valid));
  };

  const getDropdownOptions = (currentStatus: string): string[] => {
    if (currentStatus === 'Editor Assigned') {
      return ['Editing Started', 'Editing In Progress'];
    }
    if (currentStatus === 'Editing Started') {
      return ['Editing In Progress', 'Client Review Sent'];
    }
    if (currentStatus === 'Editing In Progress') {
      return ['Client Review Sent'];
    }
    if (currentStatus === 'Client Review Sent') {
      return ['Revision Required', 'Final Approval'];
    }
    if (currentStatus === 'Revision Required') {
      return ['Revision In Progress', 'Final Approval'];
    }
    if (currentStatus === 'Revision In Progress') {
      return ['Client Review Sent', 'Final Approval'];
    }
    if (currentStatus === 'Final Approval') {
      return ['Project Delivered'];
    }
    if (currentStatus === 'Project Delivered') {
      return ['Completed'];
    }
    return [];
  };

  const getStatusDisplayName = (status: string): string => {
    if (status === 'Client Review Sent' || status === 'Customer Review') return 'Client Review';
    if (status === 'Completed' || status === 'Project Closed' || status === 'Closed') return 'Project Closed';
    return status;
  };

  // Matching helper functions for custom analytics card groupings (matching raw & standardized)
  const isNewProject = (prod: Production) => {
    const s = getProductionStatus(prod);
    const autoS = getAutomatedProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Raw Footage Received' || s === 'Verified Footage' || s === 'Assigned Editor' || s === 'Editor Assigned' ||
           autoS === 'Raw Footage Received' || autoS === 'Assigned Editor' || autoS === 'Editor Assigned' || autoS === 'Verified Footage' ||
           ['Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Editor Assigned', 'Assigned Editor', 'Pending', 'Footage Handover'].includes(raw);
  };

  const isInProgressEdit = (prod: Production) => {
    const s = getProductionStatus(prod);
    const autoS = getAutomatedProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Editing Started' || s === 'Editing In Progress' || s === 'Internal QC Review' || s === 'Assigned Editor' || s === 'Editor Assigned' ||
           autoS === 'Editing Started' || autoS === 'Customer Review' || autoS === 'Editing Completed' || autoS === 'Assigned Editor' ||
           ['Editing Started', 'Editing', 'Editing In Progress', 'Internal QC Review', 'Assigned Editor', 'Editor Assigned'].includes(raw);
  };

  const isClientApproved = (prod: Production) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Final Approval' || s === 'Project Delivered' || s === 'Completed' || raw === 'Approved' || raw === 'Final Approval' || raw === 'Delivered' || raw === 'Project Delivered' || raw === 'Closed' || raw === 'Project Closed' || raw === 'Completed' || raw === 'Payment Pending' || raw === 'Client Acceptance' || raw === 'Order Closed' || s === 'Order Closed';
  };

  const isClientNotApproved = (prod: Production) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Client Review Sent' || s === 'Revision Required' || s === 'Revision In Progress' || raw === 'Ready For Review' || raw === 'Client Review Sent' || raw === 'Customer Review' || raw === 'Revision Required' || raw === 'Revision In Progress';
  };

  const isTotalProjectsCompleted = (prod: Production) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Project Delivered' || s === 'Completed' || raw === 'Delivered' || raw === 'Project Delivered' || raw === 'Closed' || raw === 'Project Closed' || raw === 'Completed' || raw === 'Project Completed' || s === 'Project Completed' || raw === 'Project Cancelled' || s === 'Project Cancelled' || raw === 'Order Closed' || s === 'Order Closed';
  };

  // Base list filtered by applied date range, customer name, and order ID
  const filteredLeadsList = useMemo(() => {
    return (leads || []).filter(prod => {
      const { order: foundOrder, lead } = resolveOrderAndLead(prod);
      const order = { ...foundOrder, mobile: foundOrder?.mobile || lead?.mobile || 'No contact phone',
        order_id: foundOrder?.order_id || prod.order_id || prod.tracking_id || prod.production_id,
        customer_name: prod.customer_name || lead?.customer_name || 'Client',
        event_type: lead?.event_type || 'Event',
        event_date: prod.event_date || lead?.event_date || '',
        current_stage: prod.editing_status || 'Verified Footage'
      };

      // Event date matching (format is YYYY-MM-DD)
      const eventDate = order?.event_date || '';
      if (appliedStartDate && eventDate && eventDate < appliedStartDate) return false;
      if (appliedEndDate && eventDate && eventDate > appliedEndDate) return false;

      // Search matching
      if (appliedCustName) {
        const cName = order?.customer_name || '';
        if (!cName.toLowerCase().includes(appliedCustName.toLowerCase())) return false;
      }
      if (appliedOrdId) {
        if (!order?.order_id.toLowerCase().includes(appliedOrdId.toLowerCase())) return false;
      }

      return true;
    });
  }, [leads, orders, rawFootage, leadsData, appliedStartDate, appliedEndDate, appliedCustName, appliedOrdId]);

  // Computed counts for the five distinct analytics cards
  const countNewProjects = useMemo(() => filteredLeadsList.filter(isNewProject).length, [filteredLeadsList]);
  const countInProgressEdit = useMemo(() => filteredLeadsList.filter(isInProgressEdit).length, [filteredLeadsList]);
  const countClientApproved = useMemo(() => filteredLeadsList.filter(isClientApproved).length, [filteredLeadsList]);
  const countClientNotApproved = useMemo(() => filteredLeadsList.filter(isClientNotApproved).length, [filteredLeadsList]);
  const countTotalCompleted = useMemo(() => filteredLeadsList.filter(isTotalProjectsCompleted).length, [filteredLeadsList]);

  // Report download utilities
  const downloadCSVReport = () => {
    const data = (filteredLeadsList || []).map(prod => {
      const { order } = resolveOrderAndLead(prod);
      return {
        'ORDER_ID': order?.order_id || '',
        'CUSTOMER_NAME': order?.customer_name || '',
        'EVENT_TYPE': order?.event_type || '',
        'EVENT_DATE': order?.event_date || '',
        'ASSIGNED_EDITOR': prod.editor_assigned || 'Unassigned',
        'CURRENT_STATUS': getProductionStatus(prod),
        'EXPECTED_DEL_DATE': prod.expected_delivery_date || '',
        'PRIORITY': prod.project_priority || 'Medium'
      };
    });

    const headers = ['ORDER_ID', 'CUSTOMER_NAME', 'EVENT_TYPE', 'EVENT_DATE', 'ASSIGNED_EDITOR', 'CURRENT_STATUS', 'EXPECTED_DEL_DATE', 'PRIORITY'];
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h as keyof typeof row];
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Photocrew_Production_Leads_Report_${appliedStartDate || 'all'}_to_${appliedEndDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcelReport = () => {
    try {
      const data = (filteredLeadsList || []).map(prod => {
        const { order } = resolveOrderAndLead(prod);
        return {
          'ORDER ID': order?.order_id || '',
          'CUSTOMER NAME': order?.customer_name || '',
          'EVENT TYPE': order?.event_type || '',
          'EVENT DATE': order?.event_date || '',
          'ASSIGNED TEAM': getAssignedEditorsText(prod),
          'CURRENT STATUS': getProductionStatus(prod),
          'EXPECTED DELIVERY DATE': prod.expected_delivery_date || '',
          'PRIORITY': prod.project_priority || 'Medium'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Production Leads");
      
      const keys = ['ORDER ID', 'CUSTOMER NAME', 'EVENT TYPE', 'EVENT DATE', 'ASSIGNED TEAM', 'CURRENT STATUS', 'EXPECTED DELIVERY DATE', 'PRIORITY'];
      const maxColLengths = keys.map(k => {
        const kLen = k.length;
        const vals = data.map(item => String(item[k as keyof typeof item] ?? '').length);
        return Math.max(kLen, ...vals, 10);
      });
      worksheet['!cols'] = maxColLengths.map(l => ({ wch: l + 2 }));

      XLSX.writeFile(workbook, `Photocrew_Production_Leads_Report_${appliedStartDate || 'all'}_to_${appliedEndDate || 'all'}.xlsx`);
    } catch (err) {
      console.error("XLSX export error", err);
    }
  };

  const downloadPDFReport = () => {
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setTextColor(245, 158, 11);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PHOTOCREW PICTURES", 14, 18);
    
    doc.setTextColor(156, 163, 175);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text("PRODUCTION LEADS MODULE REPORT", 14, 25);
    doc.text(`FILTER DATE RANGE: ${appliedStartDate || 'ALL'} TO ${appliedEndDate || 'ALL'}`, 14, 30);
    doc.text(`GENERATED: ${new Date().toLocaleDateString()}`, 14, 35);
    
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 42, 210, 2, 'F');

    doc.setTextColor(55, 65, 81);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    
    const colX = [14, 45, 90, 115, 150, 185];
    doc.text("Order ID", colX[0], 55);
    doc.text("Customer Name", colX[1], 55);
    doc.text("Event Date", colX[2], 55);
    doc.text("Assigned Team", colX[3], 55);
    doc.text("Current Status", colX[4], 55);
    doc.text("Priority", colX[5], 55);
    
    doc.setDrawColor(209, 213, 219);
    doc.line(14, 57, 196, 57);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);

    let y = 64;
    filteredLeadsList.forEach((prod) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        doc.text("Order ID", colX[0], y);
        doc.text("Customer Name", colX[1], y);
        doc.text("Event Date", colX[2], y);
        doc.text("Assigned Team", colX[3], y);
        doc.text("Current Status", colX[4], y);
        doc.text("Priority", colX[5], y);
        doc.line(14, y + 2, 196, y + 2);
        y += 8;
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(31, 41, 55);
      }
      
      const { order } = resolveOrderAndLead(prod);
      
      const ordId = order?.order_id || 'N/A';
      const custName = order?.customer_name || 'N/A';
      const evDate = order?.event_date || 'N/A';
      const edName = getAssignedEditorsText(prod);
      const pStatus = getProductionStatus(prod);
      const pPriority = prod.project_priority || 'Medium';
      
      doc.text(ordId, colX[0], y);
      const truncatedName = custName.length > 25 ? custName.substring(0, 23) + "..." : custName;
      doc.text(truncatedName, colX[1], y);
      doc.text(evDate, colX[2], y);
      doc.text(edName, colX[3], y);
      doc.text(pStatus, colX[4], y);
      doc.text(pPriority, colX[5], y);
      
      doc.setDrawColor(243, 244, 246);
      doc.line(14, y + 2, 196, y + 2);
      
      y += 7;
    });

    doc.save(`Photocrew_Production_Leads_Report_${appliedStartDate || 'all'}_to_${appliedEndDate || 'all'}.pdf`);
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rowsHtml = (filteredLeadsList || []).map(prod => {
      const { order } = resolveOrderAndLead(prod);
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-family: monospace;">${order?.order_id || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order?.customer_name || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order?.event_type || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order?.event_date || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${getAssignedEditorsText(prod)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${getProductionStatus(prod)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${prod.expected_delivery_date || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${prod.project_priority || 'Medium'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>PhotoCrew Pictures - Production Leads Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h2 { color: #f59e0b; margin-bottom: 5px; }
            .header { border-bottom: 2px solid #f59e0b; padding-bottom: 15px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
            th { background-color: #f3f4f6; padding: 10px; border-bottom: 2px solid #ddd; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .footer { margin-top: 30px; font-size: 10px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>PHOTOCREW PICTURES</h2>
            <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #555;">Production Leads Module Report</div>
            <div style="font-size: 10px; color: #777; margin-top: 5px;">
              Filter Date Range: ${appliedStartDate || 'ALL'} To ${appliedEndDate || 'ALL'}<br/>
              Report Generated On: ${new Date().toLocaleString()}
            </div>
          </div>
          <div className="overflow-x-auto w-full max-w-full">
<table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Event Type</th>
                <th>Event Date</th>
                <th>Assigned Team</th>
                <th>Current Status</th>
                <th>Target Delivery</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="padding: 20px; text-align: center;">No records found.</td></tr>'}
            </tbody>
          </table>
</div>
          <div class="footer">
            CINEMATIC PRODUCTION & OPERATIONS ERP SYSTEM ~ PHOTOCREW VAULT © 2026
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Selected Lead for Custom Detailed Popup
  const [selectedLeadProd, setSelectedLeadProd] = useState<Production | null>(null);

  // Step-by-step action popup modal states
  const [activeWorkflowProd, setActiveWorkflowProd] = useState<Production | null>(null);
  useEffect(() => {
    if (activeWorkflowProd) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [activeWorkflowProd]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail.role === 'production') {
        const p = (production || []).find(prod => {
          const rf = (rawFootage || []).find(x => x.tracking_id === prod.tracking_id);
          return rf?.order_id === e.detail.orderId;
        });
        if (p) {
          setActiveSubTab('production_workflow');
          setSelectedLeadProd(p);
        }
      }
    };
    window.addEventListener('calendar-action-click-deferred', handler);
    return () => window.removeEventListener('calendar-action-click-deferred', handler);
  }, [production, rawFootage]);
  
  const [workflowActionType, setWorkflowActionType] = useState<'assign_editor' | 'reassign_staff' | 'delivery_checklist' | 'send_review' | 'request_revision' | 'deliver_project' | 'manage_payment_close' | 'manage_status' | 'close_project' | null>(null);

  // Form states for each step popup
  // Step 1: Assign Editor Form
  const [wfEditor, setWfEditor] = useState('Unassigned');
  const [wfTargetDeliveryDate, setWfTargetDeliveryDate] = useState('');
  const [wfTargetDeliveryTime, setWfTargetDeliveryTime] = useState('');
  const [wfPriority, setWfPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [wfProjectNotes, setWfProjectNotes] = useState('');
  const [wfInternalComments, setWfInternalComments] = useState('');
  const [assignmentRows, setAssignmentRows] = useState<{ speciality: string; staffId: string; staffName: string }[]>([
    { speciality: '', staffId: '', staffName: '' }
  ]);
  interface EventSectionItem {
    qty: number;
    text: string;
    editor: string;
    assignment_id?: string;
    status?: string;
  }

  interface EventSection {
    eventId: string;
    eventName: string;
    items: EventSectionItem[];
  }

  const [wfEventSections, setWfEventSections] = useState<EventSection[]>([]);
  const [wfError, setWfError] = useState('');
  const [wfSuccess, setWfSuccess] = useState('');

  const handleOpenAssignEditor = (prod: Production) => {
    if (prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed') return;
    setActiveWorkflowProd(prod);
    setWfError('');
    
    // Parse target delivery date
    const existingDate = getTargetDeliveryDateFromAssignments(prod) || prod.target_delivery_date || '';
    setWfTargetDeliveryDate(existingDate);
    
    const { order, lead } = resolveOrderAndLead(prod);
    const eventsList = ((prod as any).events && Array.isArray((prod as any).events) && (prod as any).events.length > 0)
      ? (prod as any).events
      : (lead?.events && Array.isArray(lead.events) && lead.events.length > 0)
        ? lead.events
        : (order?.events && Array.isArray(order.events) && order.events.length > 0)
          ? order.events
          : [];

    let deliverablesText = order?.deliverables_description || lead?.deliverables_description || '';
    if (!deliverablesText && lead) {
      const targetLeadQuotations = quotations?.filter((q: any) => q.lead_id === lead.lead_id) || [];
      targetLeadQuotations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const targetLatestQuote = targetLeadQuotations[0];
      if (targetLatestQuote) {
        deliverablesText = targetLatestQuote.deliverables_description || '';
      }
    }

    const orderId = order?.order_id || (prod as any).order_id || prod.tracking_id;
    const listToProcess = eventsList.length > 0 ? eventsList : [null];
    const sections: EventSection[] = [];

    for (let idx = 0; idx < listToProcess.length; idx++) {
      const currentEvent = listToProcess[idx];
      const currentEventName = currentEvent ? (currentEvent.event_name || currentEvent.event_type || `Event ${idx + 1}`) : (prod.custom_event_name || `Event ${idx + 1}`);
      const currentEventId = currentEvent ? (currentEvent.id || currentEvent.event_id) : prod.event_id;

      let parsedDeliverablesList: { name: string; qty: number }[] = [];
      if (currentEvent && currentEvent.deliverables) {
        if (Array.isArray(currentEvent.deliverables)) {
          parsedDeliverablesList = parseDeliverablesWithQty(JSON.stringify(currentEvent.deliverables));
        } else if (typeof currentEvent.deliverables === 'string') {
          parsedDeliverablesList = parseDeliverablesWithQty(currentEvent.deliverables);
        }
      }

      if (parsedDeliverablesList.length === 0) {
        parsedDeliverablesList = parseDeliverablesWithQty(deliverablesText, currentEventName, currentEventId);
      }

      const assignedForThis = (editorAssignments || []).filter(a => 
        (a.production_id === prod.production_id || a.order_id === orderId) && 
        (!currentEventId || !a.event_id || a.event_id === currentEventId)
      );

      const tempMap = new Map<string, { qty: number; text: string; editor: string; assignment_id?: string; status?: string }>();
      const usedAssignments = new Set<string>();

      for (const d of parsedDeliverablesList) {
        const qty = d.qty || 1;
        const text = d.name;
        if (text) {
          const existing = tempMap.get(text);
          if (existing) {
            existing.qty += qty;
          } else {
            const existingAssignment = assignedForThis.find(a => (a.speciality === text || a.deliverable_id === text) && !usedAssignments.has(a.assignment_id));
            const editor = existingAssignment ? (existingAssignment.staff_name || 'Unassigned') : 'Unassigned';
            if (existingAssignment) {
              usedAssignments.add(existingAssignment.assignment_id);
            }
            tempMap.set(text, {
              qty,
              text,
              editor,
              assignment_id: existingAssignment?.assignment_id,
              status: existingAssignment?.status
            });
          }
        }
      }

      sections.push({
        eventId: currentEventId || `EVT-0${idx + 1}`,
        eventName: currentEventName,
        items: Array.from(tempMap.values())
      });
    }

    setWfEventSections(sections);
    setWfProjectNotes(prod.project_notes || prod.remarks || '');
    setWorkflowActionType('assign_editor');
  };

  const handleSectionEditorChange = (sectionIndex: number, itemIndex: number, editorName: string) => {
    setWfEventSections(prev => {
      const updated = [...prev];
      const section = { ...updated[sectionIndex] };
      const items = [...section.items];
      items[itemIndex] = { ...items[itemIndex], editor: editorName };
      section.items = items;
      updated[sectionIndex] = section;
      return updated;
    });
  };


  // Step 4: Send For Review Form
  const [wfReviewLink, setWfReviewLink] = useState('');
  const [wfPreviewLink, setWfPreviewLink] = useState('');
  const [wfReviewNotes, setWfReviewNotes] = useState('');

  // Step 5: Request Revision Form
  const [wfRevisionNotes, setWfRevisionNotes] = useState('');
  const [wfRevisionDeadline, setWfRevisionDeadline] = useState('');

  // Step 8: Deliver Project Form
  const [wfDeliveryLink, setWfDeliveryLink] = useState('');
  const [wfGoogleDriveLink, setWfGoogleDriveLink] = useState('');
  const [wfDownloadLink, setWfDownloadLink] = useState('');
  const [wfDeliveryNotes, setWfDeliveryNotes] = useState('');

  // CRM Status Management Popup States
  const [selectedStage, setSelectedStage] = useState<EditingStatus>('Editing In Progress');
  const [qcNotes, setQcNotes] = useState('');
  const [reviewLink, setReviewLink] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionDeadline, setRevisionDeadline] = useState('');
  const [revisionComments, setRevisionComments] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Workloads selector edit fields
  const [leadEditor, setLeadEditor] = useState('');
  const [leadStaff, setLeadStaff] = useState<string[]>([]);
  const [assignRoleFilter, setAssignRoleFilter] = useState('');
  const [leadPriority, setLeadPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [leadFootageStatus, setLeadFootageStatus] = useState('Footage Received');
  const [leadProdStatus, setLeadProdStatus] = useState<any>('New Project');
  const [leadProgressPercent, setLeadProgressPercent] = useState<number>(0);
  const [leadRemarks, setLeadRemarks] = useState('');

  // Crew Roster Filter state
  const [crewSearch, setCrewSearch] = useState('');
  const [crewSpecialityFilter, setCrewSpecialityFilter] = useState('All');
  const [crewStatusFilter, setCrewStatusFilter] = useState('All');

  // Staff Roster Filter state
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterStatusFilter, setRosterStatusFilter] = useState('All');

  // Assign Editor Popup states
  const [selectedEditors, setSelectedEditors] = useState<Staff[]>([]);
  const [editorSearchQuery, setEditorSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lastModalProdId, setLastModalProdId] = useState<string | null>(null);
  const [selectedWfEditor, setSelectedWfEditor] = useState<any | null>(null);

  // New Deliverable-wise assignment states
  const [deliverablesTargetDates, setDeliverablesTargetDates] = useState<Record<string, string>>({});
  const [selectedWfStaffByDeliverable, setSelectedWfStaffByDeliverable] = useState<Record<string, string[]>>({});
  const [wfStaffTypeByDeliverable, setWfStaffTypeByDeliverable] = useState<Record<string, 'In-House' | 'Freelancer'>>({});
  const [deliverableStaffRows, setDeliverableStaffRows] = useState<Record<string, Array<{ id: string; staffType: 'In-House' | 'Freelancer'; staffId: string }>>>({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [whatsappShareModalOpen, setWhatsappShareModalOpen] = useState(false);
  const [whatsappShareData, setWhatsappShareData] = useState<any | null>(null);
  const [previewStaffMessage, setPreviewStaffMessage] = useState<{ staffName: string; message: string } | null>(null);
  const [editedStaffMobiles, setEditedStaffMobiles] = useState<Record<string, string>>({});
  const [customDeliverables, setCustomDeliverables] = useState<string[]>([]);
  const [newDeliverableInput, setNewDeliverableInput] = useState('');
  const [openDropdownDeliverable, setOpenDropdownDeliverable] = useState<string | null>(null);
  const [assignedEditorsModalProd, setAssignedEditorsModalProd] = useState<Production | null>(null);
  const [previewProofModal, setPreviewProofModal] = useState<{
    imageUrl: string;
    staffName: string;
    deliverableName: string;
    eventName: string;
    orderId: string;
  } | null>(null);
  const [rosterStaffName, setRosterStaffName] = useState<string | null>(null);

  // Client Acceptance states
  const [clientAcceptanceProd, setClientAcceptanceProd] = useState<Production | null>(null);
  const [caCommunicationProof, setCaCommunicationProof] = useState<string>('');
  const [caUploadName, setCaUploadName] = useState<string>('');
  const [caConsentProofChecked, setCaConsentProofChecked] = useState<boolean>(false);
  const [caInternalValidation, setCaInternalValidation] = useState<boolean>(false);
  const [caChecklistCompleted, setCaChecklistCompleted] = useState<boolean>(false);
  const [caVerifyCustomerAcceptance, setCaVerifyCustomerAcceptance] = useState<boolean>(true);
  const [caContentUsageConfirmation, setCaContentUsageConfirmation] = useState<boolean>(false);
  const [caFootageDeleted7Days, setCaFootageDeleted7Days] = useState<boolean>(false);
  const [caVerifyPaymentSales, setCaVerifyPaymentSales] = useState<boolean>(false);
  const [caValidateEditedFiles, setCaValidateEditedFiles] = useState<boolean>(false);
  const [caValidatedServerUploads, setCaValidatedServerUploads] = useState<Record<string, boolean>>({});
  const [caUploadingProof, setCaUploadingProof] = useState<boolean>(false);
  const [caChecklist, setCaChecklist] = useState<Record<string, boolean>>({});
  const [caUploadConfirmations, setCaUploadConfirmations] = useState<Record<string, { confirmed: boolean; eventDate: string; folderName: string }>>({});
  const [caValidation, setCaValidation] = useState<Record<string, boolean>>({});
  const [caProofs, setCaProofs] = useState<Record<string, string>>({});

  // Re-send Review / Customer Review Popup states
  const [customerReviewResendProd, setCustomerReviewResendProd] = useState<Production | null>(null);
  const [customerReviewMessage, setCustomerReviewMessage] = useState<string>('');
  const [customerReviewPhone, setCustomerReviewPhone] = useState<string>('');

  // New States for Editor WhatsApp Share Feature
  const [editorWhatsappModalOpen, setEditorWhatsappModalOpen] = useState(false);
  const [editorWhatsappProdId, setEditorWhatsappProdId] = useState<string | null>(null);
  const [editorWhatsappData, setEditorWhatsappData] = useState<{
    prod: any;
    order: any;
    lead: any;
    assignments: any[];
    rf: any;
    editors: { name: string; phone: string; message: string; }[];
    selectedEventIndex: number;
  } | null>(null);
  const [isGeneratingEditorWhatsapp, setIsGeneratingEditorWhatsapp] = useState(false);
  const [editorWhatsappError, setEditorWhatsappError] = useState<string | null>(null);

  const prepareEditorWhatsappData = async (productionId: string, eventIndex: number = 0) => {
    setEditorWhatsappProdId(productionId);
    setIsGeneratingEditorWhatsapp(true);
    setEditorWhatsappError(null);
    setEditorWhatsappModalOpen(true);
    try {
      // 1. Fetch latest data from database
      const { data: prodData, error: prodErr } = await supabaseClient
        .from('production')
        .select('*')
        .eq('production_id', productionId)
        .single();
      if (prodErr) throw prodErr;

      const { data: assignmentsData, error: assignmentsErr } = await supabaseClient
        .from('editor_assignments')
        .select('*')
        .eq('production_id', productionId);
      if (assignmentsErr) throw assignmentsErr;

      // Find resolved order & lead
      const trackingId = prodData.tracking_id;
      const rfItem = (rawFootage || []).find(f => f.tracking_id === trackingId || f.order_id === trackingId);
      let orderData = (orders || []).find(o => o.order_id === trackingId || o.lead_id === trackingId);
      if (!orderData && rfItem) {
        orderData = (orders || []).find(o => o.order_id === rfItem.order_id);
      }

      const leadId = orderData?.lead_id || trackingId;
      const leadData = leadsData?.find(l => l.lead_id === leadId);

      const activeStaffList = productionStaff || [];

      // Events list
      const eventsList = leadData?.events || [];
      const selectedEvent = eventsList[eventIndex] || null;

      // Build fields for WhatsApp prefilled message
      const customerName = orderData?.customer_name || leadData?.customer_name || '—';
      const customerMobile = orderData?.customer_mobile || leadData?.mobile || '—';
      const customerWhatsapp = orderData?.whatsapp_number || leadData?.whatsapp_number || '—';
      const eventName = selectedEvent?.event_name || orderData?.event_type || 'Event';
      const eventType = selectedEvent?.event_type || selectedEvent?.event_shoot_type || orderData?.event_type || 'Shoot Type';

      // Raw footage drive link
      const driveLink = getRawFootageDriveLink(prodData) || '—';

      // Target Delivery date
      const targetDate = formatDisplayDate(getTargetDeliveryDateFromAssignments(prodData));

      // Get unique editors assigned to this project
      const assignedEditors = Array.from(new Set((assignmentsData || []).map((a: any) => a.staff_name).filter(Boolean)));
      
      const editors = assignedEditors.map((editorName: any) => {
        const staff = activeStaffList.find(s => s.name === editorName);
        const editorPhone = staff ? (staff.whatsapp_number || staff.mobile || '') : '';
        
        const displayDeliverables = (assignmentsData || [])
          .filter((a: any) => a.staff_name && a.staff_name.trim().toLowerCase() === editorName.trim().toLowerCase())
          .map((a: any) => a.speciality)
          .filter(Boolean);

        const deliverableListText = displayDeliverables.length > 0
          ? displayDeliverables.map((d: any) => `• ${d}`).join('\n')
          : 'None Assigned';

        const msg = `*PHOTOCREW STUDIO TASK ASSIGNMENT*

*Customer Details:*
• Name: ${customerName}
• Mobile: ${customerMobile}
• WhatsApp: ${customerWhatsapp}

*Project Details:*
• Event Type: ${eventType}
• Event Name: ${eventName}
• Raw Footage Drive Link: ${driveLink}
• Target Delivery Date: ${targetDate}

*Assignment Details:*
${deliverableListText}

_Please acknowledge receipt of this task assignment._`;

        return { name: editorName, phone: editorPhone, message: msg };
      });

      setEditorWhatsappData({
        prod: prodData,
        order: orderData,
        lead: leadData,
        assignments: assignmentsData || [],
        rf: rfItem,
        editors: editors,
        selectedEventIndex: eventIndex,
      });
    } catch (err: any) {
      console.error("Error preparing Editor WhatsApp data:", err);
      setEditorWhatsappError(err.message || "Failed to load database values.");
    } finally {
      setIsGeneratingEditorWhatsapp(false);
    }
  };

  const staffActiveAssignments = useMemo(() => {
    if (!rosterStaffName) return [];
    const memberNameLower = rosterStaffName.toLowerCase();
    
    const staffProjects = (production || []).filter(p => {
      const isPrimary = p.editor_assigned?.toLowerCase() === memberNameLower;
      const isAssignedCrew = editorAssignments.some(a => 
        a.production_id === p.production_id && a.staff_name?.toLowerCase() === memberNameLower
      );
      return isPrimary || isAssignedCrew;
    });

    const activeProjects = staffProjects.filter(p => 
      !['Approved', 'Delivered', 'Final Approval', 'Project Delivered', 'Project Closed', 'Closed'].includes(p.editing_status)
    );

    return (activeProjects || []).map(p => {
      const trackingIdClean = p.tracking_id?.replace('PRD-', '');
      const linkedOrder = (orders || []).find(o => o.order_id === p.tracking_id || o.lead_id === trackingIdClean);
      const linkedLead = (leads || []).find(l => l.lead_id === p.tracking_id || l.lead_id === trackingIdClean);
      const orderId = linkedOrder?.order_id || p.tracking_id || 'N/A';
      
      const assignmentRecord = (editorAssignments || []).find(a => 
        a.production_id === p.production_id && a.staff_name?.toLowerCase() === memberNameLower
      );
      
      return {
        staffName: rosterStaffName,
        orderId: orderId,
        assignedDate: assignmentRecord?.assigned_date || p.created_at?.split('T')[0] || '—',
        targetDeliveryDate: p.target_delivery_date || '—',
      };
    }).sort((a, b) => {
      if (a.assignedDate === '—') return 1;
      if (b.assignedDate === '—') return -1;
      return new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime();
    });
  }, [rosterStaffName, editorAssignments, production, orders, leads]);

  // Simplified Add Staff Form states
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffType, setNewStaffType] = useState('');
  const [newStaffMobile, setNewStaffMobile] = useState('');
  const [newStaffWhatsapp, setNewStaffWhatsapp] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newStaffSkills, setNewStaffSkills] = useState<string[]>([]);
  const [newSkillText, setNewSkillText] = useState('');
  const [addStaffError, setAddStaffError] = useState('');
  const [addStaffSuccess, setAddStaffSuccess] = useState('');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [showSmartFilter, setShowSmartFilter] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Editing timeline dates inside detailed modal
  const [dateFootageReceived, setDateFootageReceived] = useState('');
  const [dateEditingStarted, setDateEditingStarted] = useState('');
  const [dateReview, setDateReview] = useState('');
  const [dateApproval, setDateApproval] = useState('');
  const [dateDelivery, setDateDelivery] = useState('');

  const [leadStartDate, setLeadStartDate] = useState('');
  const [leadTargetDeliveryDate, setLeadTargetDeliveryDate] = useState('');
  const [leadExpectedDeliveryDate, setLeadExpectedDeliveryDate] = useState('');
  const [leadActualDeliveryDate, setLeadActualDeliveryDate] = useState('');
  const [leadRawFootageDate, setLeadRawFootageDate] = useState('');
  const [leadClientReviewDate, setLeadClientReviewDate] = useState('');
  const [leadClientApprovalDate, setLeadClientApprovalDate] = useState('');
  const [isSavingDossier, setIsSavingDossier] = useState(false);
  const [dossierSuccessMessage, setDossierSuccessMessage] = useState('');
  const [dossierError, setDossierError] = useState('');

  // Helper calculations for Production Leads workflows
  const calculateDaysRemaining = (dueDateStr?: string) => {
    if (!dueDateStr) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0,0,0,0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateOverdueDays = (dueDateStr?: string) => {
    if (!dueDateStr) return 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0,0,0,0);
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getProductionPriority = (prod: Production) => {
    return prod.project_priority || 'Medium';
  };

  const autoSaveAssignments = async (
    currentRowsMap: Record<string, Array<{ id: string; staffType: 'In-House' | 'Freelancer'; staffId: string }>>,
    targetDate: string
  ) => {
    if (!activeWorkflowProd) return;
    try {
      // 1. Delete all existing assignments for this production + event
      let deleteQuery = supabaseClient
        .from('editor_assignments')
        .delete()
        .eq('production_id', activeWorkflowProd.production_id);
      
      if (activeWorkflowProd.event_id) {
        deleteQuery = deleteQuery.eq('event_id', activeWorkflowProd.event_id);
      }
      
      const { error: deleteError } = await deleteQuery;

      if (deleteError) throw deleteError;

      // 2. Prepare and insert new assignments
      const newAssignments = [];
      const activeStaffList = (productionStaff || []).filter(s => s.status === 'Active');
      const currentDeliverablesList = Object.keys(currentRowsMap);
      const { order, lead } = resolveOrderAndLead(activeWorkflowProd);
      const orderId = order?.order_id || activeWorkflowProd?.tracking_id || activeWorkflowProd?.production_id;
      const eventId = activeWorkflowProd?.event_id || lead?.events?.[0]?.id || 'EVT-01';

      for (const d of currentDeliverablesList) {
        const rows = currentRowsMap[d] || [];
        
        // Prevent duplicate assignments of same staff to same deliverable
        const seenStaffIds = new Set<string>();

        for (const row of rows) {
          if (!row.staffId) continue;
          if (seenStaffIds.has(row.staffId)) continue;
          seenStaffIds.add(row.staffId);
          
          const staffMem = activeStaffList.find(s => s.staff_id === row.staffId);
          if (staffMem) {
            const id = `EDR-${Math.floor(100000 + Math.random() * 900000)}`;
            newAssignments.push({
              assignment_id: id,
              production_id: activeWorkflowProd.production_id,
              order_id: orderId,
              event_id: eventId,
              staff_id: staffMem.staff_id,
              staff_name: staffMem.name,
              speciality: d, // Deliverable Name
              assigned_date: new Date().toISOString().split('T')[0],
              target_finish_date: targetDate || '', 
              status: 'Assigned',
              created_at: new Date().toISOString()
            });
          }
        }
      }

      if (newAssignments.length > 0) {
        // Do not strip order_id and event_id
        const dbPayload = newAssignments;
        const { error: insertError } = await supabaseClient
          .from('editor_assignments')
          .insert(dbPayload);

        if (insertError) throw insertError;
      }

      // 3. Update production table with primary assigned editors details and target delivery date
      const uniqueStaffNames = Array.from(new Set(newAssignments.map(a => a.staff_name)));
      const primaryEditor = uniqueStaffNames[0] || 'Unassigned';
      const assignedStaffJoined = uniqueStaffNames.join(', ');
      
      const assignedRoles = Array.from(new Set(newAssignments.map(a => {
        const staffMem = activeStaffList.find(s => s.staff_name === a.staff_name);
        return staffMem?.role || 'Editor';
      })));
      const rolesJoined = assignedRoles.join(', ');

      // Check if ANY required deliverable is missing a staff assignment
      const isMissingAssignments = currentDeliverablesList.some(d => {
        const rows = currentRowsMap[d] || [];
        return !rows.some(r => r.staffId && r.staffId.trim() !== '');
      });

      const nextStatus = isMissingAssignments ? activeWorkflowProd.editing_status : 'Editor Assigned';

      await updateProduction(activeWorkflowProd.production_id, {
        editor_assigned: primaryEditor,
        assigned_staff: assignedStaffJoined,
        editing_status: nextStatus,
        production_status: nextStatus,
        production_role: rolesJoined,
        assigned_role: rolesJoined,
        target_delivery_date: targetDate
      } as any);

      // Refresh page data
      if (typeof refreshData === 'function') {
        refreshData();
      }
    } catch (err) {
      console.error("Failed to auto-save assignments:", err);
    }
  };

  useEffect(() => {
    if (workflowActionType !== 'assign_editor') {
      setLastModalProdId(null);
    }
  }, [workflowActionType]);

  useEffect(() => {
    if (workflowActionType) {
      if (workflowActionType === 'manage_status') {
        setQcNotes('');
        setReviewLink('');
        setReviewNotes('');
        setRevisionNotes('');
        setRevisionDeadline('');
        setRevisionComments('');
        setApprovalNotes('');
        setDeliveryLink('');
        setDeliveryDate('');
        setClosingNotes('');
      } else if (workflowActionType === 'deliver_project') {
        setWfDeliveryLink('');
        setWfGoogleDriveLink('');
        setWfDownloadLink('');
        setWfDeliveryNotes('');
      } else if (workflowActionType === 'send_review') {
        setWfReviewLink('');
        setWfPreviewLink('');
        setWfReviewNotes('');
      } else if (workflowActionType === 'request_revision') {
        setWfRevisionNotes('');
        setWfRevisionDeadline('');
      } else if (workflowActionType === 'close_project') {
        setDeliveryDate('');
        setClosingNotes('');
      } else if (workflowActionType === 'reassign_staff') {
        const currentProdId = activeWorkflowProd?.production_id || null;
        if (currentProdId && currentProdId !== lastModalProdId) {
          setLastModalProdId(currentProdId);
          
          const loadExistingAssignments = async () => {
            try {
              // Refresh staff from the database on modal open
              if (typeof refreshData === 'function') {
                refreshData();
              }
              // 1. Fetch current assignments from Supabase
              let query = supabaseClient
                .from('editor_assignments')
                .select('*')
                .eq('production_id', currentProdId);
              
              if (activeWorkflowProd?.event_id) {
                query = query.eq('event_id', activeWorkflowProd.event_id);
              }

              const { data: dbAssignments, error } = await query;

              if (error) throw error;
              const loadedAssignments = dbAssignments || [];

              // 2. Set target delivery date from existing saved date if available
              const savedDate = loadedAssignments.map(a => a.target_finish_date).find(d => d && d.trim() !== '' && d !== 'Pending' && d !== 'Not Set') || activeWorkflowProd?.target_delivery_date || '';
              setWfTargetDeliveryDate(savedDate);

              // 3. Find deliverables from confirmed quotation or order
              let parsedDeliverables: string[] = [];
              const { order, lead } = resolveOrderAndLead(activeWorkflowProd);
              let deliverablesText = order?.deliverables_description || lead?.deliverables_description || '';

              if (!deliverablesText && lead) {
                const targetLeadQuotations = quotations?.filter((q: any) => q.lead_id === lead.lead_id) || [];
                targetLeadQuotations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const targetLatestQuote = targetLeadQuotations[0];
                if (targetLatestQuote) {
                  deliverablesText = targetLatestQuote.deliverables_description || '';
                }
              }

              parsedDeliverables = parseExactDeliverables(deliverablesText, activeWorkflowProd.custom_event_name, activeWorkflowProd.event_id);

              const assignedDeliverables = Array.from(new Set(loadedAssignments.map(a => a.speciality))) as string[];
              const allDeliverables: string[] = Array.from(new Set([...parsedDeliverables, ...assignedDeliverables]));

              setCustomDeliverables(allDeliverables);

              // 4. Map loaded assignments to staff rows
              const initialStaffMap: Record<string, string[]> = {};
              const initialDatesMap: Record<string, string> = {};
              const initialStaffTypeMap: Record<string, 'In-House' | 'Freelancer'> = {};
              const initialRowsMap: Record<string, Array<{ id: string; staffType: 'In-House' | 'Freelancer'; staffId: string }>> = {};

              loadedAssignments.forEach(a => {
                const deliverable = a.speciality;
                if (deliverable) {
                  if (!initialStaffMap[deliverable]) {
                    initialStaffMap[deliverable] = [];
                  }
                  if (!initialStaffMap[deliverable].includes(a.staff_id)) {
                    initialStaffMap[deliverable].push(a.staff_id);
                  }
                  initialDatesMap[deliverable] = a.target_finish_date || '';

                  const st = (productionStaff || []).find(s => s.staff_id === a.staff_id);
                  if (st && (st.staff_type || (st as any).Staff_Type)) {
                    initialStaffTypeMap[deliverable] = (st.staff_type || (st as any).Staff_Type) as 'In-House' | 'Freelancer';
                  }
                }
              });

              allDeliverables.forEach(deliverable => {
                const existingForDeliverable = loadedAssignments.filter(a => a.speciality === deliverable);
                if (existingForDeliverable.length > 0) {
                  initialRowsMap[deliverable] = existingForDeliverable.map(a => {
                    const staffMem = (productionStaff || []).find(s => s.staff_id === a.staff_id);
                    const type = staffMem?.staff_type || (staffMem as any)?.Staff_Type || 'In-House';
                    return {
                      id: a.assignment_id || `row-${Math.random()}`,
                      staffType: type as 'In-House' | 'Freelancer',
                      staffId: a.staff_id
                    };
                  });
                } else {
                  initialRowsMap[deliverable] = [{
                    id: `row-${Math.random()}`,
                    staffType: 'In-House',
                    staffId: ''
                  }];
                }
              });

              setDeliverableStaffRows(initialRowsMap);
              setValidationAttempted(false);

              setSelectedWfStaffByDeliverable(initialStaffMap);
              setDeliverablesTargetDates(initialDatesMap);
              setWfStaffTypeByDeliverable(initialStaffTypeMap);
              setWfProjectNotes(activeWorkflowProd?.project_notes || activeWorkflowProd?.remarks || '');

              if (loadedAssignments.length === 0) {
                setWfEditor('');
                setWfPriority('Medium');
                setWfInternalComments('');
                setAssignmentRows([{ speciality: '', staffId: '', staffName: '' }]);
                setSelectedEditors([]);
              } else {
                const assignedStaffList = loadedAssignments.map(a => staff.find(s => s.staff_id === a.staff_id)).filter((s): s is Staff => !!s);
                setSelectedEditors(assignedStaffList);
                setAssignmentRows(loadedAssignments.map(a => ({
                  speciality: a.speciality,
                  staffId: a.staff_id,
                  staffName: a.staff_name
                })));
              }
            } catch (err) {
              console.error("Failed to load existing assignments directly from Supabase:", err);
            }
          };

          loadExistingAssignments();
        }
      }

      triggerAutoScrollAndFocus('#production_workflow_modal', 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowActionType]);

  useEffect(() => {
    if (isStaffModalOpen && !editingStaffMember) {
      setStaffFormName('');
      setStaffFormEmployeeId('');
      setStaffFormMobile('');
      setStaffFormWhatsapp('');
      setStaffFormEmail('');
      setStaffFormAddress('');
      setStaffFormJoiningDate('');
      setStaffFormStatus('Active');
      setStaffFormRole('');
      setCustomRoleSpecialty('');
    }
  }, [isStaffModalOpen, editingStaffMember]);

  useEffect(() => {
    if (isStaffModalOpen) {
      triggerAutoScrollAndFocus('#production_staff_modal', 150);
    }
  }, [isStaffModalOpen]);

  useEffect(() => {
    if (isCustomRoleModalOpen) {
      setCustomRoleName('');
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="e.g. Drone Video Specialist"]') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 150);
    }
  }, [isCustomRoleModalOpen]);

  useEffect(() => {
    const handleClose = () => {
      setIsStaffModalOpen(false);
      setIsCustomRoleModalOpen(false);
      setIsDetailModalOpen(false);
      setSelectedLeadProd(null);
      setActiveWorkflowProd(null);
      setWorkflowActionType(null);
      setWhatsappShareModalOpen(false);
      setAssignedEditorsModalProd(null);
    };
    window.addEventListener('close-all-popups', handleClose);
    return () => window.removeEventListener('close-all-popups', handleClose);
  }, []);

  useEffect(() => {
    if (workflowActionType === 'assign_editor'
                && activeWorkflowProd) {
      setSelectedWfEditor(null);
      setWfTargetDeliveryDate('');
    }
  }, [workflowActionType, activeWorkflowProd]);

  const getRawFootageStatus = (prod: Production) => {
    if (prod.raw_footage_status) return prod.raw_footage_status;
    const rf = (rawFootage || []).find(r => r.tracking_id === prod.tracking_id);
    if (rf && rf.status === 'Received') return 'Footage Received';
    return 'Pending';
  };

  const handleSendWhatsAppTask = (prod: Production, targetStaffName?: string, customNote?: string) => {
    const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id);
    const order = rf ? (orders || []).find(o => o.order_id === rf.order_id) : null;
    
    const staffName = targetStaffName || prod.editor_assigned || 'Production Staff';
    const customerName = order ? order?.customer_name : 'Valued Client';
    const orderId = order ? order?.order_id : 'N/A';
    const projectName = order ? (order.package_name || order?.event_type) : 'Project Event';
    const eventDate = order ? order?.event_date : 'N/A';
    const targetDate = prod.target_delivery_date || prod.expected_delivery_date || 'N/A';
    const priority = prod.project_priority || 'Medium';
    const notes = customNote || prod.remarks || 'Please process this assignment as per guidelines.';
    const assignedTask = `POST-PRODUCTION CONTENT CREATION`;

    const text = `*PHOTOCREW STUDIO TASK ASSIGNMENT*

*Staff Name:* ${staffName}
*Project Name:* ${projectName}
*Customer Name:* ${customerName}
*Order ID:* ${orderId}
*Assigned Task:* ${assignedTask}
*Event Date:* ${eventDate}
*Target Delivery Date:* ${targetDate}
*Priority:* ${priority}
*Notes:* ${notes}

_Please access the PhotoCrew ERP Dashboard to synchronize progress._`;

    const encodedText = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, '_blank');
  };

  // Form State
  const [editor, setEditor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [status, setStatus] = useState<EditingStatus>('Raw Footage Received');
  const [reviewStatus, setReviewStatus] = useState<'Pending Review' | 'Feedback Given' | 'Approved' | 'None'>('None');
  const [notes, setNotes] = useState('');

  const handleSelectProd = (prod: Production) => {
    setSelectedProdId(prod.production_id);
    setEditor(prod.editor_assigned || '');
    setStartDate(prod.editing_start_date || '');
    setExpectedDate(prod.expected_delivery_date || '');
    setStatus((prod.editing_status as any === 'Pending' ? 'Raw Footage Received' : prod.editing_status) || 'Raw Footage Received');
    setReviewStatus(prod.customer_review_status || 'None');
    setNotes(prod.remarks || '');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId) return;

    updateProduction(selectedProdId, {
      editor_assigned: editor,
      editing_start_date: startDate || undefined,
      expected_delivery_date: expectedDate || undefined,
      editing_status: status,
      customer_review_status: reviewStatus === 'None' ? undefined : reviewStatus,
      remarks: notes,
    });

    alert(`Production details saved! Current stage synced in master ERP.`);
  };

  const handleMarkDelivered = () => {
    if (!selectedProdId) return;
    const item = (production || []).find((p) => p.production_id === selectedProdId);
    if (!item) return;

    markDelivered(item.tracking_id, 'Approved and Delivered via Photo Crew ERP Vault.');
    setSelectedProdId(null);
    alert('Project officially delivered to customer! Final stage updated.');
  };

  // Helper lists for calculations
  const today = new Date();

  // Filter/Derived definitions
  const newProjects = (leads || []).filter(p => !p.editor_assigned || p.editor_assigned === 'Unassigned');
  const assignedProjects = (leads || []).filter(p => p.editor_assigned && p.editor_assigned !== 'Unassigned' && p.editing_status !== 'Project Delivered' && p.editing_status !== 'Delivered' && p.editing_status !== 'Completed');
  const pendingProjects = (leads || []).filter(p => !['Final Approval', 'Approved', 'Project Delivered', 'Delivered', 'Project Closed', 'Closed', 'Completed'].includes(p.editing_status));
  const delayedProjects = (leads || []).filter(p => {
    if (['Final Approval', 'Approved', 'Project Delivered', 'Delivered', 'Project Closed', 'Closed', 'Completed'].includes(p.editing_status)) return false;
    if (!p.expected_delivery_date) return false;
    return new Date(p.expected_delivery_date) < today;
  });

  // Calculate stats for pipeline counters
  const statTotalVideo = leads.length;
  const statPendingVideo = (leads || []).filter(p => ['Pending', 'New Raw Footage Arrived', 'Raw Footage Received', 'Editor Assigned', 'Verified Footage', 'Footage Handover Verified'].includes(p.editing_status)).length;
  const statEditingVideo = (leads || []).filter(p => ['Editing Started', 'Editing In Progress', 'Editing'].includes(p.editing_status)).length;
  const statReviewVideo = (leads || []).filter(p => ['Internal QC Review', 'Client Review Sent', 'Customer Review', 'Ready For Review', 'Revision Required', 'Revision In Progress'].includes(p.editing_status)).length;
  const statApprovedVideo = (leads || []).filter(p => ['Approved', 'Final Approval'].includes(p.editing_status)).length;

  const visibleProduction = leads;

  // Active workload stats for staff (from useRole().staff + active jobs)
  const getStaffWorkload = (staffName: string) => {
    const nameLower = (staffName || '').toLowerCase();
    
    // Check dynamic assignments table first
    const staffAssignments = (editorAssignments || []).filter(a => a.staff_name.toLowerCase() === nameLower);
    
    const assignedCount = staffAssignments.length;
    const completedCount = staffAssignments.filter(a => a.status === 'Completed').length;
    const activeCount = staffAssignments.filter(a => isAssignmentActive(a, production || [])).length;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueCount = staffAssignments.filter(a => 
      isAssignmentActive(a, production || []) && a.target_finish_date && a.target_finish_date < todayStr
    ).length;

    // Backward compatibility for direct assignments
    const fallbackActive = (production || []).filter(p => 
      p.editor_assigned?.toLowerCase() === nameLower && 
      p.editing_status !== 'Delivered' && p.editing_status !== 'Approved'
    ).length;

    return {
      activeCount: Math.max(activeCount, fallbackActive),
      completedCount,
      totalCount: Math.max(assignedCount, fallbackActive + completedCount),
      overdueCount
    };
  };

  return (
    <div id="production_module" className="space-y-6 animate-fade-in font-sans">
      
      {/* Full width container for active workspace */}
      <div className="w-full space-y-6">

        {/* MAIN ACTIVE CONTENT VIEWPORTS */}
        <div className="w-full space-y-6">

      {/* PRODUCTION STAFF DIRECTORY EMBED */}
      {activeSubTab === 'production_staff_directory' && (
        <div className="animate-fade-in-up">
          <ProductionStaffDirectoryModule />
        </div>
      )}

      {/* PRODUCTION ROLE SPECIALITIES EMBED */}
      {activeSubTab === 'production_role_specialities' && (
        <div className="animate-fade-in-up">
          <ProductionRoleSpecialitiesModule />
        </div>
      )}

      {/* STAFF MANAGEMENT MODULE EMBED */}
      {activeSubTab === 'staff_management' && (
        <div className="animate-fade-in-up">
          <StaffManagementModule />
        </div>
      )}

      {/* NOTIFICATIONS MODULE EMBED */}
      {activeSubTab === 'notifications' && (
        <div className="animate-fade-in-up">
          <NotificationsModule />
        </div>
      )}

      {/* PRODUCTION CALENDAR MODULE EMBED */}
      {activeSubTab === 'production_calendar' && (
        <div className="animate-fade-in-up flex flex-col gap-6">
          <ProductionCalendar />
        </div>
      )}

      {/* 0. PRODUCTION LEADS TAB */}
      {activeSubTab === 'production_leads' && (
        <div className="space-y-6 animate-fade-in text-zinc-100">
          
          {/* Dashboard Widgets specific to Production Leads */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <CameraLensStatsCard
              label="New Projects Received"
              val={countNewProjects}
              theme="blue"
              trendText="Ready Ingest"
              subText="AF focus"
              chartPoints={[4, 12, 8, 16, 12, 22, countNewProjects || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="new_projects_received"
              onClick={() => setActiveCardFilter(activeCardFilter === 'new_projects_received' ? 'All' : 'new_projects_received')}
              lensLabel="AF-BLUE 50"
            />
            <CameraLensStatsCard
              label="In Progress Edit"
              val={countInProgressEdit}
              theme="purple"
              trendText="Active Cutting"
              subText="AF focus"
              chartPoints={[15, 10, 19, 14, 22, 18, countInProgressEdit || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="in_progress_edit"
              onClick={() => setActiveCardFilter(activeCardFilter === 'in_progress_edit' ? 'All' : 'in_progress_edit')}
              lensLabel="V-EDIT 35"
            />
            <CameraLensStatsCard
              label="Client Approved"
              val={countClientApproved}
              theme="green"
              trendText="Approved Gallery"
              subText="AF focus"
              chartPoints={[8, 15, 12, 20, 16, 25, countClientApproved || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="client_approved"
              onClick={() => setActiveCardFilter(activeCardFilter === 'client_approved' ? 'All' : 'client_approved')}
              lensLabel="M-GREEN 85"
            />
            <CameraLensStatsCard
              label="Client Not Approved"
              val={countClientNotApproved}
              theme="gold"
              trendText="Revision Loop"
              subText="AF focus"
              chartPoints={[5, 9, 7, 14, 11, 16, countClientNotApproved || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="client_not_approved"
              onClick={() => setActiveCardFilter(activeCardFilter === 'client_not_approved' ? 'All' : 'client_not_approved')}
              lensLabel="QC-GOLD 24"
            />
            <CameraLensStatsCard
              label="Total Projects Completed"
              val={countTotalCompleted}
              theme="cyan"
              trendText="Delivered Vault"
              subText="AF focus"
              chartPoints={[12, 18, 15, 26, 22, 34, countTotalCompleted || 5]}
              activeFilterValue={activeCardFilter}
              currentFilterValue="total_projects_completed"
              onClick={() => setActiveCardFilter(activeCardFilter === 'total_projects_completed' ? 'All' : 'total_projects_completed')}
              lensLabel="C-GLASS 70"
            />
          </div>

          {/* Advanced Search & Filter Center Toggle */}
          <div className="flex flex-wrap items-center gap-3 justify-start">
            <button
              type="button"
              onClick={() => setShowSmartFilter(!showSmartFilter)}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold rounded-xl transition-all uppercase tracking-wider flex items-center gap-2"
            >
              <span>[ FILTER ]</span>
            </button>
            <ListSortFilter value={sortOrder} onChange={setSortOrder} />
          </div>

          {/* Advanced Search & Filter Center */}
          {showSmartFilter && (
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div>
                <h4 className="text-xs font-black text-zinc-300 uppercase tracking-widest font-mono">
                  🔍 Smart Filter & Report Center
                </h4>
                <p className="text-[11.5px] text-zinc-500 font-mono mt-0.5">
                  Refine live interactive metrics, card counts, and sheet data. Apply start & end date thresholds securely.
                </p>
              </div>
              
              {/* ACTIVE CARD FILTER STATE INDICATOR */}
              {activeCardFilter !== 'All' && (
                <div className="flex items-center gap-2 self-start bg-amber-400/10 text-amber-300 border border-amber-400/10 rounded-lg px-3 py-1.5 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Active Focus: <strong>{
                    activeCardFilter === 'new_projects_received' ? 'New Projects Received Only' :
                    activeCardFilter === 'in_progress_edit' ? 'In Progress Edit Only' :
                    activeCardFilter === 'client_approved' ? 'Client Approved Only' :
                    activeCardFilter === 'client_not_approved' ? 'Client Not Approved Only' :
                    'Total Projects Completed Only'
                  }</strong></span>
                  <button 
                    onClick={() => setActiveCardFilter('All')} 
                    className="ml-2 hover:text-white transition-colors cursor-pointer text-amber-400/70 font-bold"
                    title="Clear Focus"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {/* Customer Name Search */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">Customer Name</label>
                <input
                  type="text"
                  placeholder="Search Customer..."
                  value={searchCustName}
                  onChange={(e) => setSearchCustName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-150 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                />
              </div>

              {/* Order ID Search */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">Order ID</label>
                <input
                  type="text"
                  placeholder="Order ID..."
                  value={searchOrdId}
                  onChange={(e) => setSearchOrdId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-150 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1 font-sans">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">Start Date</label>
                <input
                  type="date"
                  value={dtStart}
                  onChange={(e) => setDtStart(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-150 focus:outline-none focus:ring-1 focus:ring-violet-505 font-mono cursor-pointer"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1 font-sans">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">End Date</label>
                <input
                  type="date"
                  value={dtEnd}
                  onChange={(e) => setDtEnd(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-150 focus:outline-none focus:ring-1 focus:ring-violet-505 font-mono cursor-pointer"
                />
              </div>

              {/* Status Dropdown - Immediate execution */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold">CRM Stage/Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-505 font-mono cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Verified Footage">Verified Footage</option>
                  <option value="Assigned Editor">Assigned Editor</option>
                  <option value="Editing Started">Editing Started</option>
                  <option value="Customer Review">Customer Review</option>
                  <option value="Editing Completed">Editing Completed</option>
                  <option value="Client Acceptance">Client Acceptance</option>
                  <option value="Order Closed">Order Closed</option>
                </select>
              </div>

              {/* Priority Dropdown - Immediate execution */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block font-bold font-bold">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-505 font-mono cursor-pointer animate-none"
                >
                  <option value="All">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAppliedStartDate(dtStart);
                    setAppliedEndDate(dtEnd);
                    setAppliedCustName(searchCustName);
                    setAppliedOrdId(searchOrdId);
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1.8 rounded-lg text-[11px] font-black uppercase font-mono tracking-wider hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] duration-200 cursor-pointer text-center"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDtStart('');
                    setDtEnd('');
                    setSearchCustName('');
                    setSearchOrdId('');
                    setAppliedStartDate('');
                    setAppliedEndDate('');
                    setAppliedCustName('');
                    setAppliedOrdId('');
                    setStatusFilter('All');
                    setPriorityFilter('All');
                    setActiveCardFilter('All');
                  }}
                  className="flex-1 bg-zinc-850 hover:bg-zinc-750 text-zinc-300 px-3 py-1.8 rounded-lg text-[11px] font-bold uppercase font-mono tracking-wider duration-200 cursor-pointer text-center"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* EXPORTS BAR CONTAINER */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-900/60 font-mono">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                📄 REPORT DOWNLOAD VAULT ({filteredLeadsList.length} items parsed)
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* PDF Export */}
                <button
                  onClick={downloadPDFReport}
                  className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/10 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                  title="Export to standardized PDF document"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {/* Excel Export */}
                <button
                  onClick={downloadExcelReport}
                  className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                  title="Export to Excel spreadsheet document (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </button>

                {/* CSV Export */}
                <button
                  onClick={downloadCSVReport}
                  className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/10 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                  title="Download standard comma-separated values document"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>

                {/* Print */}
                <button
                  onClick={printReport}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-705 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                  title="Send report directly to physical or virtual printer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Newly Arrived - Raw Footage Received Queue */}
          {(() => {
            return null;
            const rawFootageLeads = filteredLeadsList.filter(prod => {
              const { order } = resolveOrderAndLead(prod);
              if (!order) return false;
              return prod.editing_status === 'Raw Footage Received';
            });

            if (rawFootageLeads.length === 0) return null;

            return (
              <div id="newly_arrived_raw_footage_section" className="bg-zinc-950/80 border border-purple-900/45 p-5 rounded-2xl mb-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                    <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest font-mono">
                      ### Newly Arrived Raw Footage
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {rawFootageLeads.length} Action Needed
                  </span>
                </div>

                <div className="overflow-x-auto border border-zinc-900 rounded-xl">
                  <table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                        <th className="p-3 font-bold">Order ID</th>
                        <th className="p-3 font-bold">Customer Name</th>
                        <th className="p-3 font-bold">Event Details</th>
                        <th className="p-3 font-bold text-center">Assigned Team</th>
                        <th className="p-3 font-bold">Raw Footage Drive Link</th>
                        <th className="p-3 font-bold">Current Production Status</th>
                        <th className="p-3 font-bold text-right pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {rawFootageLeads.map(prod => {
                        const { order } = resolveOrderAndLead(prod);
                        if (!order) return null;

                        const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                        const op = operations?.find(o => o.order_id === order?.order_id);
                        const matchedSa = staffAssignments ? staffAssignments.filter(sa => sa.order_id === order?.order_id) : [];

                        const editorsList = getAssignedEditorsList(prod);

                        const prodStatus = getProductionStatus(prod);
                        const lead = leadsData?.find(l => l.lead_id === order?.lead_id);

                        return (
                          <tr key={prod.production_id} className="hover:bg-zinc-900/40 transition-all font-mono">
                            <td className="p-3 text-violet-400 font-bold">{order?.order_id}</td>
                            <td className="p-3 font-sans font-bold text-white">{order?.customer_name}</td>
                            <td className="p-3 text-zinc-300 font-sans">
                              <UnifiedEventDropdownCell lead={lead || order} />
                            </td>
                            <td className="p-3 font-sans text-center">
                              {editorsList.length > 0 ? (
                                <span 
                                  onClick={() => setAssignedEditorsModalProd(prod)}
                                  className="cursor-pointer text-indigo-400 hover:text-indigo-300 underline underline-offset-2 px-2 py-1 bg-indigo-500/10 rounded font-bold"
                                  title="View Assigned Team"
                                >
                                  👥 {editorsList.length}
                                </span>
                              ) : (
                                <span className="text-zinc-650 italic text-[10px]">No Production Staff Assigned.</span>
                              )}
                            </td>
                            <td className="p-3">
                              {(() => {
                                const finalDriveLink = getRawFootageDriveLink(prod);
                                const isDriveLinkAvailable = finalDriveLink !== '' && (finalDriveLink.startsWith('http://') || finalDriveLink.startsWith('https://') || finalDriveLink.includes('drive.google.com') || finalDriveLink.length > 5);

                                if (isDriveLinkAvailable) {
                                  const fullHref = finalDriveLink.startsWith('http') ? finalDriveLink : `https://${finalDriveLink}`;
                                  return (
                                    <a
                                      href={fullHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1.5 cursor-pointer max-w-[200px] break-words"
                                      title={finalDriveLink}
                                    >
                                      <span>🔗</span> Open Drive Link
                                    </a>
                                  );
                                }

                                return <span className="text-zinc-500 italic text-[11px]">No Drive Link Uploaded</span>;
                              })()}
                            </td>
                            <td className="p-3">
                              <StatusText status={prodStatus} />
                            </td>
                            <td className="p-3 text-right pr-4">
                              <div className="inline-flex flex-col gap-1 items-end">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignEditor(prod)}
                                  className="px-3 py-1.5 bg-purple-600 border border-purple-500 text-white hover:bg-purple-500 hover:border-purple-400 transition-all text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={isProjectLocked(prod.editing_status)}
                                >
                                  <span>👤</span> Assign Editor
                                </button>
                                {(() => {
                                  const isEditorAssigned = prod.editor_assigned && prod.editor_assigned !== 'Unassigned' && prod.editor_assigned.trim() !== '';
                                  const hasSavedAssignments = editorAssignments.some(a => a.production_id === prod.production_id);
                                  const isStatusActive = prodStatus && !isProjectLocked(prodStatus) && 
                                                         prod.editing_status && !isProjectLocked(prod.editing_status);
                                  
                                  if (isEditorAssigned && hasSavedAssignments && isStatusActive) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          prepareEditorWhatsappData(prod.production_id);
                                        }}
                                        className="px-2 py-1 bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 hover:border-emerald-400 transition-all text-[9px] font-bold uppercase tracking-wider rounded-lg shadow-sm cursor-pointer inline-flex items-center gap-1 mt-1"
                                      >
                                        <span>💬</span> Share
                                      </button>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* TABLE CONTAINER */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/70 px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                    <th className="p-4 font-black">Order ID</th>
                    <th className="p-4 font-black">Customer Name</th>
                    <th className="p-4 font-black">Event Details</th>
                    <th className="p-4 font-black">Raw Footage Link</th>
                    <th className="p-4 font-black text-center">Assigned Team</th>
                    <th className="p-4 font-black">Current Status</th>
                    <th className="p-4 font-black">Target Delivery Date</th>
                    <th className="p-4 font-black">Delivery Status</th>
                    {currentRole !== 'Production Team' && (
                      <>
                        <th className="p-4 font-black">Payment Status</th>
                        <th className="p-4 font-black">Remaining Amount</th>
                      </>
                    )}
                    <th className="p-4 font-black text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-sans">
                  {(() => {
                    const postProdStages = [
                      'Verified Footage',
                      'Footage Handover Verified',
                      'Raw Footage Received', 
                      'Editor Assigned', 
                      'Editing Started', 
                      'Editing In Progress', 
                      'Internal QC Review', 
                      'Client Review Sent', 
                      'Revision Required', 
                      'Revision In Progress', 
                      'Final Approval', 
                      'Delivered', 
                      'Closed',
                      'Customer Review',
                      'Approved',
                      'Payment Pending',
                      'Project Completed',
                      'Project Cancelled'
                    ];

                    const filteredLeads = filteredLeadsList.filter(prod => {
                      const { order: foundOrder, lead } = resolveOrderAndLead(prod);
                      const order = { ...foundOrder, mobile: foundOrder?.mobile || lead?.mobile || 'No contact phone',
                        order_id: prod.order_id || prod.tracking_id || prod.production_id,
                        customer_name: prod.customer_name || lead?.customer_name || 'Client',
                        event_type: lead?.event_type || 'Event',
                        event_date: prod.event_date || lead?.event_date || '',
                        current_stage: prod.editing_status || 'Verified Footage'
                      };
                      
                      // For Production Staff, exclude Client Acceptance and Order Closed
                      const displayStatus = getAutomatedProductionStatus(prod);
                      if (currentRole === 'Production Staff' && (displayStatus === 'Client Acceptance' || displayStatus === 'Order Closed' || displayStatus === 'Completed' || displayStatus === 'Closed')) {
                        return false;
                      }
                      
                      const searchLower = leadSearch.toLowerCase();
                      const clientMatch = (order?.customer_name || '').toLowerCase().includes(searchLower) || (order?.order_id || '').toLowerCase().includes(searchLower);
                      if (leadSearch && !clientMatch) return false;

                      const pVal = getProductionPriority(prod);
                      if (priorityFilter !== 'All' && pVal !== priorityFilter) return false;

                      const sVal = getProductionStatus(prod);
                      if (statusFilter === 'Overdue') {
                        const targetDate = getTargetDeliveryDateFromAssignments(prod);
                        const days = calculateDaysRemaining(targetDate);
                        if (!(days !== null && days < 0 && prod.editing_status !== 'Delivered' && prod.editing_status !== 'Closed' && prod.editing_status as any !== 'Project Closed' && prod.editing_status as any !== 'Project Delivered' && prod.editing_status as any !== 'Completed' && prod.editing_status as any !== 'Order Closed')) return false;
                      } else if (statusFilter !== 'All') {
                        const matchStatus = (sVal === statusFilter) || (displayStatus === statusFilter) || (prod.editing_status === statusFilter) ||
                          (statusFilter === 'Verified Footage' && (sVal === 'Verified Footage' || displayStatus === 'Verified Footage' || prod.editing_status === 'Verified Footage' || prod.editing_status === 'Raw Footage Received' || prod.editing_status === 'Footage Handover Verified')) ||
                          (statusFilter === 'Assigned Editor' && (sVal === 'Assigned Editor' || displayStatus === 'Assigned Editor' || prod.editing_status === 'Editor Assigned' || prod.editing_status === 'Assigned Editor')) ||
                          (statusFilter === 'Editing Started' && (sVal === 'Editing Started' || displayStatus === 'Editing Started' || prod.editing_status === 'Editing In Progress' || prod.editing_status === 'Editing')) ||
                          (statusFilter === 'Customer Review' && (sVal === 'Customer Review' || displayStatus === 'Customer Review' || prod.editing_status === 'Client Review Sent' || prod.editing_status === 'Ready For Review')) ||
                          (statusFilter === 'Editing Completed' && (sVal === 'Editing Completed' || displayStatus === 'Editing Completed' || prod.editing_status === 'Editing Complete')) ||
                          (statusFilter === 'Client Acceptance' && (sVal === 'Client Acceptance' || displayStatus === 'Client Acceptance' || prod.editing_status === 'Client Acceptance')) ||
                          (statusFilter === 'Order Closed' && (sVal === 'Order Closed' || displayStatus === 'Order Closed' || prod.editing_status === 'Order Closed' || prod.editing_status === 'Closed' || prod.editing_status === 'Completed' || prod.editing_status === 'Project Closed'));
                        if (!matchStatus) return false;
                      }

                      // Active Card filtration
                      if (activeCardFilter && activeCardFilter !== 'All') {
                        if (activeCardFilter === 'new_projects_received' && !isNewProject(prod)) return false;
                        if (activeCardFilter === 'in_progress_edit' && !isInProgressEdit(prod)) return false;
                        if (activeCardFilter === 'client_approved' && !isClientApproved(prod)) return false;
                        if (activeCardFilter === 'client_not_approved' && !isClientNotApproved(prod)) return false;
                        if (activeCardFilter === 'total_projects_completed' && !isTotalProjectsCompleted(prod)) return false;
                      }

                      return true;
                    });

                    if (filteredLeads.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} className="p-10 text-center text-zinc-550 font-mono text-xs">
                            No production leads matching filter parameters found.
                          </td>
                        </tr>
                      );
                    }

                    return [...(filteredLeads || [])].sort((a, b) => compareRecordsByDate(a, b, sortOrder)).map((prod, idx) => {
                      const { order: foundOrder, lead: foundLead } = resolveOrderAndLead(prod);
                      const order = { ...foundOrder, mobile: foundOrder?.mobile || foundLead?.mobile || 'No contact phone',
                        order_id: prod.order_id || prod.tracking_id || prod.production_id,
                        customer_name: prod.customer_name || foundLead?.customer_name || 'Client',
                        event_type: foundLead?.event_type || 'Event',
                        event_date: prod.event_date || foundLead?.event_date || '',
                        current_stage: prod.editing_status || 'Verified Footage',
                        quotation_amount: 0,
                        lead_id: prod.lead_id || prod.tracking_id
                      };

                      const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                      const priority = getProductionPriority(prod);
                      const status = prod.editing_status || 'Pending';
                      const lead = leadsData?.find(l => l.lead_id === order?.lead_id);
                      const displayStatus = getAutomatedProductionStatus(prod);
                      const targetDeliveryDate = getTargetDeliveryDateFromAssignments(prod);
                      const daysRem = calculateDaysRemaining(targetDeliveryDate);

                      // Payments calculations
                      const payment = (payments || []).find(p => p.order_id === order?.order_id);
                      const totalAmount = order.quotation_amount || 0;
                      const advanceReceived = payment?.advance_received !== undefined ? payment.advance_received : (payment?.advance_paid || 0);
                      const balanceDue = payment?.balance_due !== undefined ? payment.balance_due : (totalAmount - advanceReceived);
                      const payStatus = payment?.payment_status || 'Pending';

                      const isFinished = isProjectLocked(displayStatus) || isProjectLocked(prod.production_status) || isProjectLocked(prod.editing_status);

                      const isAssigned = getAssignedEditorsList(prod).length > 0 || (prod.editor_assigned && prod.editor_assigned !== 'Unassigned');

                      let flagBg = 'text-green-400 bg-green-500/5 border-green-500/10';
                      let flagLabel = 'On Time';
                      
                      if (!isAssigned) {
                        flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                        flagLabel = 'Pending';
                      } else if (daysRem !== null) {
                        if (daysRem < 0) {
                          if (isFinished) {
                            flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                            flagLabel = 'Completed';
                          } else {
                            flagBg = 'text-red-400 bg-red-500/5 border-red-500/10 font-bold';
                            flagLabel = 'OVERDUE';
                          }
                        } else if (daysRem <= 3) {
                          if (isFinished) {
                            flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                            flagLabel = 'Completed';
                          } else {
                            flagBg = 'text-yellow-400 bg-yellow-500/5 border-yellow-500/10';
                            flagLabel = 'Due Soon';
                          }
                        } else {
                          if (isFinished) {
                            flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                            flagLabel = 'Completed';
                          }
                        }
                      } else {
                        if (isFinished) {
                          flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                          flagLabel = 'Completed';
                        }
                      }

                      let displayStatusColor = 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
                      if (displayStatus === 'Raw Footage Received') displayStatusColor = 'bg-purple-500/15 text-purple-400 border border-purple-500/20 animate-pulse';
                      else if (displayStatus === 'Editor Assigned') displayStatusColor = 'bg-sky-500/15 text-sky-400 border border-sky-500/20';
                      else if (displayStatus === 'Editing Started') displayStatusColor = 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20';
                      else if (displayStatus === 'Editing In Progress') displayStatusColor = 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
                      else if (displayStatus === 'Internal QC Review') displayStatusColor = 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
                      else if (displayStatus === 'Client Review Sent') displayStatusColor = 'bg-pink-500/15 text-pink-400 border border-pink-500/20';
                      else if (displayStatus === 'Revision Required') displayStatusColor = 'bg-red-500/15 text-red-400 border border-red-500/20';
                      else if (displayStatus === 'Revision In Progress') displayStatusColor = 'bg-orange-500/15 text-orange-400 border border-orange-500/20';
                      else if (displayStatus === 'Final Approval') displayStatusColor = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
                      else if (displayStatus === 'Project Delivered') displayStatusColor = 'bg-violet-500/15 text-violet-400 border border-violet-500/20';
                      else if (displayStatus === 'Completed') displayStatusColor = 'bg-zinc-800 text-zinc-400 border border-zinc-700';

                      let payBadge = 'bg-amber-500/10 text-amber-400 border border-amber-500/15';
                      if (payStatus === 'Fully Paid') payBadge = 'bg-green-500/10 text-green-400 border border-green-500/15';
                      else if (payStatus === 'Partially Paid') payBadge = 'bg-blue-500/10 text-blue-400 border border-blue-500/15';

                      return (
                        <tr key={`${prod.production_id}_${prod.event_id || idx}`} className="hover:bg-zinc-900/30 transition-all font-mono text-xs">
                          {/* Order ID */}
                          <td className="px-3 py-2 align-middle">
                            <span 
                              onClick={() => {
                                setMasterOrderIdForDetail(order?.order_id);
                                setIsDetailModalOpen(true);
                              }}
                              className="font-mono font-bold text-violet-400 hover:underline cursor-pointer block"
                              title="Click to view full order dossier details"
                            >
                              {order?.order_id}
                            </span>
                            
                          </td>

                          {/* Customer Name */}
                          <td className="px-3 py-2 font-bold text-white text-left font-sans align-middle">
                            <div className="hover:text-violet-300 transition-colors cursor-pointer" onClick={() => {
                              setSelectedLeadProd(prod);
                              setDossierError('');
                              setDossierSuccessMessage('');
                              setLeadEditor(prod.editor_assigned || 'Unassigned');
                              setLeadStaff(prod.assigned_staff ? prod.assigned_staff.split(', ').map(s => s.trim()) : []);
                              setAssignRoleFilter('');
                              setLeadPriority(prod.project_priority || 'Medium');
                              setLeadFootageStatus(getRawFootageStatus(prod));
                              setLeadProdStatus(getProductionStatus(prod));
                              setLeadRemarks(prod.remarks || '');
                              setLeadStartDate(prod.editing_start_date || '');
                              setLeadTargetDeliveryDate(getTargetDeliveryDateFromAssignments(prod) || '');
                              setLeadExpectedDeliveryDate(prod.expected_delivery_date || '');
                              setLeadActualDeliveryDate(prod.delivery_date || prod.actual_delivery_date || '');
                              
                              const pLogs = (logs || []).filter(log => 
                                log.record_id === prod.production_id ||
                                log.record_id === prod.tracking_id ||
                                log.record_id === order?.order_id
                              );
                              const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                              const computedRfDate = rf && (rf.status === 'Received' || rf.raw_received) 
                                ? (rf.uploaded_date || rf.event_completed_date) 
                                : '';
                              const crLog = pLogs.find(log => 
                                log.new_stage === 'Client Review Sent' || 
                                log.new_stage === 'Customer Review' ||
                                log.action.includes('Client Review Sent') ||
                                log.action.includes('Customer Review')
                              );
                              const caLog = pLogs.find(log => 
                                log.new_stage === 'Final Approval' || 
                                log.new_stage === 'Approved' ||
                                log.action.includes('Final Approval') ||
                                log.action.includes('Approved')
                              );
                              setLeadRawFootageDate(toInputDateFormat((prod as any).raw_footage_received_date || computedRfDate));
                              setLeadClientReviewDate(toInputDateFormat((prod as any).client_review_upload_date || (crLog ? crLog.timestamp : null)));
                              setLeadClientApprovalDate(toInputDateFormat((prod as any).client_approval_date || (caLog ? caLog.timestamp : null)));
                            }}>{order?.customer_name}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 font-normal">{foundOrder?.mobile || lead?.mobile || 'No contact phone'}</div>
                          </td>

                          {/* Event Type */}
                          <td className="p-4 text-left font-sans text-zinc-300">
                            <UnifiedEventDropdownCell lead={foundLead || order} />
                          </td>

                            {/* Raw Footage Link */}
                            <td className="p-4 text-left font-sans">
                              {(() => {
                                const finalDriveLink = getRawFootageDriveLink(prod);
                                const isDriveLinkAvailable = finalDriveLink !== '' && (finalDriveLink.startsWith('http://') || finalDriveLink.startsWith('https://') || finalDriveLink.includes('drive.google.com') || finalDriveLink.length > 5);

                                if (isDriveLinkAvailable) {
                                  const fullHref = finalDriveLink.startsWith('http') ? finalDriveLink : `https://${finalDriveLink}`;
                                  return (
                                    <a
                                      href={fullHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1.5 cursor-pointer max-w-[150px] break-words"
                                      title={finalDriveLink}
                                    >
                                      <span>🔗</span> Open Drive Link
                                    </a>
                                  );
                                }

                                return <span className="text-zinc-500 italic text-[11px]">No Drive Link Uploaded</span>;
                              })()}
                            </td>

                          {/* Editor Assigned */}
                          <td className="p-4 text-center font-sans">
                            <div className="font-bold text-zinc-200">
                              {(() => {
                                const editorsList = getAssignedEditorsList(prod);
                                if (editorsList.length === 0) {
                                  return <span className="text-zinc-650 italic text-[10px]">No Production Staff Assigned.</span>;
                                }
                                return (
                                  <span 
                                    onClick={() => setAssignedEditorsModalProd(prod)}
                                    className="cursor-pointer text-indigo-400 hover:text-indigo-300 underline underline-offset-2 px-2 py-1 bg-indigo-500/10 rounded font-bold"
                                    title="View Assigned Team"
                                  >
                                    👥 {editorsList.length}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>

                          {/* Current Status */}
                          <td className="px-3 py-2 align-middle">
                            <StatusText status={displayStatus} />
                          </td>

                          {/* Target Delivery Date */}
                          <td className="p-4 text-zinc-350 font-mono">
                            {targetDeliveryDate && targetDeliveryDate !== 'Pending' && targetDeliveryDate !== 'Not Set' ? (
                              formatDisplayDate(targetDeliveryDate)
                            ) : (
                              <span className="text-zinc-600 italic">Pending</span>
                            )}
                          </td>

                          {/* Remaining Days */}
                          <td className="px-3 py-2 align-middle">
                            {!isAssigned ? (
                              <span className={`inline-flex px-2 py-0.5 rounded font-bold border font-mono ${flagBg}`}>
                                Pending
                              </span>
                            ) : daysRem !== null ? (
                              <span className={`inline-flex px-2 py-0.5 rounded font-bold border font-mono ${flagBg}`}>
                                {flagLabel === 'Completed' ? 'Completed' : flagLabel === 'OVERDUE' ? `Overdue by ${Math.abs(daysRem)} Days` : `${daysRem} days (${flagLabel})`}
                              </span>
                            ) : (
                              <span className="text-zinc-600 italic text-[10px]">Not set</span>
                            )}
                          </td>

                          {/* Payment Status */}
                          {currentRole !== 'Production Team' && (
                            <td className="px-3 py-2 align-middle">
                              <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-mono font-black border ${payBadge}`}>
                                {payStatus}
                              </span>
                            </td>
                          )}

                          {/* Remaining Amount */}
                          {currentRole !== 'Production Team' && (
                            <td className="p-4 font-bold text-zinc-300 font-mono">
                              <span className={balanceDue > 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}>
                                {formatINR(balanceDue)}
                              </span>
                            </td>
                          )}

                          {/* Actions column */}
                          <td className="p-4 text-center">
                            <div className="flex flex-col gap-1.5 items-center justify-center">
                              {(() => {
                                const isEditorAssigned = prod.editor_assigned && prod.editor_assigned !== "Unassigned" && prod.editor_assigned.trim() !== "";
                                const hasSavedAssignments = (editorAssignments || []).some(a => a.production_id === prod.production_id);
                                const isStatusActive = displayStatus && !isProjectLocked(displayStatus) && prod.editing_status && !isProjectLocked(prod.editing_status);
                                
                                return (
                                  <>
                                    
                                    {isFinished && (
                                      <div className="flex flex-col gap-1 w-full items-center mb-1">
                                        <span className="px-2.5 py-1 bg-zinc-800/90 border border-zinc-700 text-zinc-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 font-mono">
                                          🔒 Order Closed
                                        </span>
                                      </div>
                                    )}
                                    
                                    {displayStatus === "Editing Completed" && currentRole === "Production Staff" && (
                                      <span className="px-3 py-1.5 mb-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 w-full max-w-[160px]">
                                        ✓ Editing Completed
                                      </span>
                                    )}
                                    
                                    {!isFinished && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const btn = e.currentTarget;
                                          if (openActionDropdown?.id === prod.production_id) {
                                            setOpenActionDropdown(null);
                                          } else {
                                            const rect = btn.getBoundingClientRect();
                                            setOpenActionDropdown({
                                              id: prod.production_id,
                                              buttonEl: btn,
                                              rect,
                                              prod,
                                              order,
                                              displayStatus,
                                              isEditorAssigned: !!isEditorAssigned,
                                              hasSavedAssignments: !!hasSavedAssignments,
                                              isStatusActive: !!isStatusActive
                                            });
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono transition-all duration-150 flex items-center justify-center gap-1.5 shadow-md border cursor-pointer ${
                                          openActionDropdown?.id === prod.production_id
                                            ? 'bg-purple-900/60 border-purple-500 text-purple-200 ring-2 ring-purple-500/30'
                                            : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white'
                                        }`}
                                      >
                                        <span>Action</span>
                                        <span className={`text-[8px] transition-transform duration-200 ${openActionDropdown?.id === prod.production_id ? 'rotate-180 text-purple-300' : 'text-zinc-400'}`}>▼</span>
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>

                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Floating Action Dropdown Menu */}
          {openActionDropdown && createPortal(
            (() => {
              const { id, rect, prod, order, displayStatus, isEditorAssigned, hasSavedAssignments, isStatusActive } = openActionDropdown;
              
              const menuWidth = 224; // w-56
              const menuHeightEstimate = 320;
              const spaceBelow = window.innerHeight - rect.bottom;
              const spaceAbove = rect.top;
              const openUp = spaceBelow < menuHeightEstimate && spaceAbove > spaceBelow;

              const topPos = openUp ? undefined : rect.bottom + 6;
              const bottomPos = openUp ? window.innerHeight - rect.top + 6 : undefined;
              const maxHeight = openUp ? Math.max(160, rect.top - 16) : Math.max(160, window.innerHeight - rect.bottom - 16);

              let leftCalc = rect.right - menuWidth;
              if (leftCalc < 12) leftCalc = rect.left;
              if (leftCalc < 12) leftCalc = 12;
              if (leftCalc + menuWidth > window.innerWidth - 12) {
                leftCalc = Math.max(12, window.innerWidth - menuWidth - 12);
              }

              const isLocked = isProjectLocked(displayStatus) || isProjectLocked(prod.editing_status);

              return (
                <div className="fixed inset-0 z-[9999] pointer-events-none">
                  {/* Transparent overlay backdrop to close menu on outside click */}
                  <div 
                    className="fixed inset-0 bg-transparent cursor-default pointer-events-auto"
                    onClick={() => setOpenActionDropdown(null)}
                  />

                  {/* Floating Action Dropdown Panel */}
                  <div
                    id="production-action-dropdown"
                    style={{
                      top: topPos !== undefined ? `${topPos}px` : undefined,
                      bottom: bottomPos !== undefined ? `${bottomPos}px` : undefined,
                      left: `${leftCalc}px`,
                      maxHeight: `${maxHeight}px`,
                    }}
                    className="fixed z-[10000] pointer-events-auto w-56 max-w-[calc(100vw-24px)] overflow-y-auto bg-zinc-900/98 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 text-zinc-200 text-xs font-sans ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-2.5 py-1.5 text-[9px] font-black uppercase font-mono tracking-wider text-zinc-400 border-b border-zinc-800/80 mb-1 flex items-center justify-between sticky top-0 bg-zinc-900/95 z-10 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        <span>Action Menu</span>
                      </span>
                      <span className="text-zinc-500 font-normal text-[8px] font-mono">
                        ID: {prod.tracking_id || prod.production_id}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {/* Assign / Reassign Editor */}
                      {(() => {
                        const hasAssignedEditors = getAssignedEditorsList(prod).length > 0 || (prod.editor_assigned && prod.editor_assigned !== 'Unassigned' && prod.editor_assigned !== '');
                        const isProductionClosed = prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed' || prod.editing_status === 'Delivered' || prod.editing_status === 'Project Delivered';
                        
                        if (isProductionClosed) return null;

                        if (hasAssignedEditors || ["Assigned Editor", "Editing Started", "Customer Review", "Revision Required", "Internal QC Review"].includes(displayStatus)) {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionDropdown(null);
                                handleOpenAssignEditor(prod);
                              }}
                              className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-purple-300 hover:text-white hover:bg-purple-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="text-sm">👤</span>
                              <span>Reassign Editor</span>
                            </button>
                          );
                        } else {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionDropdown(null);
                                handleOpenAssignEditor(prod);
                              }}
                              className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-purple-300 hover:text-white hover:bg-purple-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="text-sm">👤</span>
                              <span>Assign Editor</span>
                            </button>
                          );
                        }
                      })()}

                      {/* Add Note */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionDropdown(null);
                          setNoteModalLeadId(order?.lead_id || '');
                          setNoteModalOrderId(order?.order_id || '');
                          setNoteModalCustomerName(order?.customer_name || '');
                          setNoteModalOpen(true);
                        }}
                        className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-blue-300 hover:text-white hover:bg-blue-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Add Note</span>
                      </button>
                      
                      {/* Send Review Link */}
                      {(displayStatus === "Customer Review" || displayStatus === "Editing Completed") && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionDropdown(null);
                            handleOpenResendReviewPopup(prod);
                          }}
                          className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-cyan-300 hover:text-white hover:bg-cyan-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-sm">📤</span>
                          <span>Send Review Link</span>
                        </button>
                      )}

                      {/* Client Acceptance */}
                      {displayStatus === "Editing Completed" && currentRole !== "Production Staff" && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionDropdown(null);
                            handleOpenClientAcceptance(prod);
                          }}
                          className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-emerald-300 hover:text-white hover:bg-emerald-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-sm">✓</span>
                          <span>Client Acceptance</span>
                        </button>
                      )}

                      {/* Share via WhatsApp */}
                      {isEditorAssigned && hasSavedAssignments && isStatusActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionDropdown(null);
                            prepareEditorWhatsappData(prod.production_id);
                          }}
                          className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-green-300 hover:text-white hover:bg-green-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-sm">💬</span>
                          <span>Share</span>
                        </button>
                      )}

                      {/* Edit Full Dossier */}
                      {!(currentRole === 'Production Team' || currentRole === 'Production Staff') && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionDropdown(null);
                            setSelectedLeadProd(prod);
                            setDossierError("");
                            setDossierSuccessMessage("");
                            setLeadEditor(prod.editor_assigned || "Unassigned");
                            setLeadStaff(prod.assigned_staff ? prod.assigned_staff.split(", ").map(s => s.trim()) : []);
                            setAssignRoleFilter("");
                            setLeadPriority(prod.project_priority || "Medium");
                            setLeadFootageStatus(getRawFootageStatus(prod));
                            setLeadProdStatus(getProductionStatus(prod));
                            setLeadRemarks(prod.remarks || "");
                            setLeadStartDate(prod.editing_start_date || "");
                            setLeadTargetDeliveryDate(prod.target_delivery_date || "");
                            setLeadExpectedDeliveryDate(prod.expected_delivery_date || "");
                            setLeadActualDeliveryDate(prod.delivery_date || prod.actual_delivery_date || "");
                            const pLogs = (logs || []).filter(log => 
                              log.record_id === prod.production_id ||
                              log.record_id === prod.tracking_id ||
                              log.record_id === order?.order_id
                            );
                            const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                            const computedRfDate = rf && (rf.status === "Received" || rf.raw_received) 
                              ? (rf.uploaded_date || rf.event_completed_date) 
                              : "";
                            const crLog = pLogs.find(log => 
                              log.new_stage === "Client Review Sent" || 
                              log.new_stage === "Customer Review" ||
                              log.action.includes("Client Review Sent") ||
                              log.action.includes("Customer Review")
                            );
                            const caLog = pLogs.find(log => 
                              log.new_stage === "Final Approval" || 
                              log.new_stage === "Approved" ||
                              log.action.includes("Final Approval") ||
                              log.action.includes("Approved")
                            );
                            setLeadRawFootageDate(toInputDateFormat((prod as any).raw_footage_received_date || computedRfDate));
                            setLeadClientReviewDate(toInputDateFormat((prod as any).client_review_upload_date || (crLog ? crLog.timestamp : null)));
                            setLeadClientApprovalDate(toInputDateFormat((prod as any).client_approval_date || (caLog ? caLog.timestamp : null)));
                          }}
                          className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/90 rounded-lg transition-colors flex items-center gap-2 cursor-pointer border-t border-zinc-800/80 mt-0.5 pt-1.5"
                        >
                          <span className="text-sm">✎</span>
                          <span>Edit Full Dossier</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })(),
            document.body
          )}
        </div>
      )}

      {/* 2. STAFF PERFORMANCE */}
      {activeSubTab === 'staff_performance' && (() => {
        if (!productionStaff) {
          return (
            <div className="bg-zinc-950 border border-zinc-900 p-12 rounded-3xl text-center space-y-4 w-full max-w-xl mx-auto mt-6">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
              <h4 className="text-lg font-black text-white font-sans uppercase">Unable to load Editor Performance data</h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                We encountered an error querying the post-production staff roster. Check your connection to Supabase or verify database tables.
              </p>
            </div>
          );
        }

        const totalEditors = productionStaff.length;
        const activeEditors = (productionStaff || []).filter(s => s.status === 'Active' || s.status === 'On Duty' || s.status === 'active' || s.status === 'Active Status').length;
        const assignedProjects = (production || []).filter(p => p.editor_assigned).length;
        
        // Projects In Progress
        const inProgressProjects = (production || []).filter(p => 
          p.editing_status === 'Editing In Progress' || 
          p.editing_status === 'Editing Started' || 
          p.editing_status === 'Revision In Progress' || 
          p.editing_status === 'In Progress' || 
          p.production_status === 'In Progress' || 
          p.editing_status === 'Editing'
        ).length;

        // Completed Projects
        const completedProjects = (production || []).filter(p => 
          p.editing_status === 'Delivered' || 
          p.editing_status === 'Project Delivered' || 
          p.editing_status === 'Closed' || 
          p.editing_status === 'Project Closed' || 
          p.editing_status === 'Completed' ||
          p.production_status === 'Closed'
        ).length;

        // Client Approved Projects
        const clientApprovedProjects = (production || []).filter(p => 
          p.editing_status === 'Approved' || 
          p.editing_status === 'Final Approval'
        ).length;

        // Revision Projects
        const revisionProjects = (production || []).filter(p => 
          p.editing_status === 'Revision Required' || 
          p.editing_status === 'Revision In Progress' || 
          p.correction_needed || 
          p.editing_status === 'Correction Needed'
        ).length;

        return (
          <div className="space-y-6">
            {/* 7 ANALYTICS CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 animate-in fade-in duration-300">
              <div className="bg-zinc-950 border border-zinc-900 p-4.5 rounded-2xl flex flex-col justify-between">
                <span className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest font-black leading-none mb-1 text-left block">Total Editors</span>
                <span className="text-xl font-bold text-white font-mono mt-1 text-left block leading-none">{totalEditors}</span>
                <span className="text-[9px] text-zinc-500 mt-2 font-mono text-left block">Roster count</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-4.5 rounded-2xl flex flex-col justify-between">
                <span className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest font-black leading-none mb-1 text-left block">Active Editors</span>
                <span className="text-xl font-bold text-amber-500 font-mono mt-1 text-left block leading-none">{activeEditors}</span>
                <span className="text-[9px] text-zinc-500 mt-2 font-mono text-left block">On duty today</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-4.5 rounded-2xl flex flex-col justify-between">
                <span className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest font-black leading-none mb-1 text-left block">Assigned Projects</span>
                <span className="text-xl font-bold text-violet-400 font-mono mt-1 text-left block leading-none">{assignedProjects}</span>
                <span className="text-[9px] text-zinc-500 mt-2 font-mono text-left block">Allocated pipelines</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-4.5 rounded-2xl flex flex-col justify-between">
                <span className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest font-black leading-none mb-1 text-left block">In Progress</span>
                <span className="text-xl font-bold text-sky-400 font-mono mt-1 text-left block leading-none">{inProgressProjects}</span>
                <span className="text-[9px] text-zinc-500 mt-2 font-mono text-left block">Active timelines</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-4.5 rounded-2xl flex flex-col justify-between">
                <span className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest font-black leading-none mb-1 text-left block">Completed</span>
                <span className="text-xl font-bold text-emerald-400 font-mono mt-1 text-left block leading-none">{completedProjects}</span>
                <span className="text-[9px] text-zinc-500 mt-2 font-mono text-left block">Dispatched assets</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-4.5 rounded-2xl flex flex-col justify-between">
                <span className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest font-black leading-none mb-1 text-left block">Client Approved</span>
                <span className="text-xl font-bold text-teal-400 font-mono mt-1 text-left block leading-none">{clientApprovedProjects}</span>
                <span className="text-[9px] text-zinc-500 mt-2 font-mono text-left block">Final sign-offs</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-4.5 rounded-2xl flex flex-col justify-between">
                <span className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest font-black leading-none mb-1 text-left block">Revision Projects</span>
                <span className="text-xl font-bold text-rose-500 font-mono mt-1 text-left block leading-none">{revisionProjects}</span>
                <span className="text-[9px] text-zinc-500 mt-2 font-mono text-left block">Correction loop</span>
              </div>
            </div>

            {/* HEADER CONTROLS CARD */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-900/60 pb-5 mb-6">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest font-mono flex items-center gap-2">
                  <span>Post-Production Editor Performance & Staff Directory</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Comprehensive tracking of project assignments, approval rates, revisions, and active rosters.
                </p>
              </div>

              {/* Action Buttons to Add Staff & Custom Roles */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => {
                    setEditingStaffMember(null);
                    setStaffFormName('');
                    setStaffFormEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
                    setStaffFormMobile('');
                    setStaffFormWhatsapp('');
                    setStaffFormEmail('');
                    setStaffFormAddress('');
                    setStaffFormJoiningDate(new Date().toISOString().split('T')[0]);
                    setStaffFormStatus('Active');
                    setStaffFormRole('');
                    setCustomRoleSpecialty('');
                    setIsStaffModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-450 text-zinc-950 text-xs font-mono font-black uppercase tracking-wider rounded-xl cursor-pointer duration-150 shadow-lg shadow-amber-500/5 hover:scale-[1.01] transition-transform"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Production Staff</span>
                </button>

                <button
                  onClick={() => {
                    setCustomRoleName('');
                    setIsCustomRoleModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono uppercase tracking-wider rounded-xl cursor-pointer duration-150"
                >
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>+ Create Custom Role</span>
                </button>
              </div>
            </div>

            {totalEditors > 0 && (
              <>
                {/* FILTERS AREA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5 animate-in fade-in run-once duration-300">
              {/* Filter 1: Search Name */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-black block">Search Staff Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-3.5 h-3.5 text-zinc-500" />
                  </span>
                  <input
                    type="text"
                    value={searchStaffName}
                    onChange={(e) => setSearchStaffName(e.target.value)}
                    placeholder="Search by full name..."
                    className="w-full bg-zinc-900 border border-zinc-850 pl-9 pr-3.5 py-2.5 text-zinc-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Filter 2: Search WhatsApp */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-black block">Search WhatsApp Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                  </span>
                  <input
                    type="text"
                    value={searchStaffWhatsapp}
                    onChange={(e) => setSearchStaffWhatsapp(e.target.value)}
                    placeholder="e.g. +91..."
                    className="w-full bg-zinc-900 border border-zinc-850 pl-9 pr-3.5 py-2.5 text-zinc-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Filter 3: Role Specialty */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-black block">Production Role</label>
                <select
                  value={perfRoleFilter}
                  onChange={(e) => setPerfRoleFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-xs text-zinc-200 rounded-xl px-3 py-2.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                >
                  <option value="All">All Specialties</option>
                  {allRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-black block">Staff Status</label>
                <select
                  value={perfStatusFilter}
                  onChange={(e) => setPerfStatusFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-xs text-zinc-200 rounded-xl px-3 py-2.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active / Available</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>
            </div>

            {/* EXPORTS CONTAINER */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-900 pt-4 gap-3">
              <div className="text-zinc-500 text-[10px] uppercase font-mono">
                Roster contains <strong className="text-amber-500">{filteredStaff.length}</strong> matching staff of <strong className="text-zinc-400">{staff.length}</strong> total
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:text-white text-zinc-450 text-xs rounded-xl cursor-pointer duration-150 font-mono uppercase"
                >
                  <Download className="w-3.5 h-3.5 text-rose-500" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:text-white text-zinc-455 text-xs rounded-xl cursor-pointer duration-150 font-mono uppercase"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Download Excel</span>
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:text-white text-zinc-455 text-xs rounded-xl cursor-pointer duration-150 font-mono uppercase"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>
            </>
            )}
          </div>

          {/* STAFF DATABASE TABLE */}
          {totalEditors > 0 ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-zinc-300 min-w-max">
                <thead className="bg-[#0b0c10] text-[9px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-900">
                  <tr>
                    <th className="py-4.5 px-5 font-black">Staff Member</th>
                    <th className="py-4.5 px-4 font-black">Production Role</th>
                    <th className="py-4.5 px-4 font-black">Contacts</th>
                    <th className="py-4.5 px-4 font-black text-center">Assigned</th>
                    <th className="py-4.5 px-4 font-black text-center">In Progress</th>
                    <th className="py-4.5 px-4 font-black text-center">Completed</th>
                    <th className="py-4.5 px-4 font-black text-center">Pending</th>
                    <th className="py-4.5 px-4 font-black text-center">Approved</th>
                    <th className="py-4.5 px-4 font-black text-center">Revision</th>
                    <th className="py-4.5 px-4 font-black text-center">Avg Delivery</th>
                    <th className="py-4.5 px-4 font-black text-center">Status</th>
                    <th className="py-4.5 px-5 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-mono">
                  {(filteredStaff || []).map((member) => {
                    const stats = getStaffRosterStats(member.name);

                    return (
                      <tr key={member.staff_id} className="hover:bg-zinc-900/10 transition-colors">
                        {/* 1. Staff Name & Employee ID */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-violet-500/15 border border-zinc-850 flex items-center justify-center font-bold text-zinc-350 text-sm font-sans">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-white font-sans">{member.name}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1.5 font-mono">
                                <span>{member.employee_id || member.staff_id}</span>
                                {member.address && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5 max-w-[120px] break-words">
                                      <MapPin className="w-2.5 h-2.5" /> {member.address}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Production Role */}
                        <td className="py-4 px-4 font-sans text-xs">
                          <span className="px-2.5 py-1 text-[10px] bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-lg font-bold uppercase tracking-wider font-mono">
                            {member.production_role_speciality || member.role || 'Production Editor'}
                          </span>
                        </td>

                        {/* 3. Contacts */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5 text-[11px] text-zinc-400 font-sans">
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3 text-emerald-500" />
                              <span className="font-mono">{member.whatsapp_number || member.mobile}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-zinc-550" />
                              <span className="text-[10px] text-zinc-550 break-words max-w-[140px] font-mono">{member.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Assigned Projects */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => setSelectedMetricDetail({ type: 'Assigned Projects', memberName: member.name, list: stats.assigned })}
                            className="bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-200 border border-zinc-800 rounded px-2.5 py-1 font-bold text-[11px] transition duration-150 min-w-10 cursor-pointer shadow-sm"
                            title="Click to view assigned project records"
                          >
                            {stats.assigned.length}
                          </button>
                        </td>

                        {/* In Progress Projects */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => setSelectedMetricDetail({ type: 'In Progress Projects', memberName: member.name, list: stats.inProgressList })}
                            className="bg-sky-500/5 hover:bg-sky-500/15 text-sky-400 border border-sky-500/10 rounded px-2.5 py-1 font-bold text-[11px] transition duration-150 min-w-10 cursor-pointer shadow-sm"
                            title="Click to view in-progress project records"
                          >
                            {stats.inProgressCount}
                          </button>
                        </td>

                        {/* 5. Completed Projects */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => setSelectedMetricDetail({ type: 'Completed Projects', memberName: member.name, list: stats.completedList })}
                            className="bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 rounded px-2.5 py-1 font-bold text-[11px] transition duration-150 min-w-10 cursor-pointer shadow-sm"
                            title="Click to view completed project records"
                          >
                            {stats.completedCount}
                          </button>
                        </td>

                        {/* 6. Pending Projects */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => setSelectedMetricDetail({ type: 'Pending Projects', memberName: member.name, list: stats.pendingList })}
                            className="bg-amber-500/5 hover:bg-amber-500/15 text-amber-500 border border-amber-500/10 rounded px-2.5 py-1 font-bold text-[11px] transition duration-150 min-w-10 cursor-pointer shadow-sm"
                            title="Click to view pending project records"
                          >
                            {stats.pendingCount}
                          </button>
                        </td>

                        {/* 7. Approved Projects */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => setSelectedMetricDetail({ type: 'Client Approved Projects', memberName: member.name, list: stats.approvedList })}
                            className="bg-purple-500/5 hover:bg-purple-500/15 text-purple-400 border border-purple-500/10 rounded px-2.5 py-1 font-bold text-[11px] transition duration-150 min-w-10 cursor-pointer shadow-sm"
                            title="Click to view client approved project records"
                          >
                            {stats.approvedCount}
                          </button>
                        </td>

                        {/* 8. Revision Projects */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => setSelectedMetricDetail({ type: 'Revision Projects', memberName: member.name, list: stats.revisionList })}
                            className="bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 border border-rose-500/10 rounded px-2.5 py-1 font-bold text-[11px] transition duration-150 min-w-10 cursor-pointer shadow-sm"
                            title="Click to view revision project records"
                          >
                            {stats.revisionCount}
                          </button>
                        </td>

                        {/* Avg Delivery Time */}
                        <td className="py-4 px-4 text-center font-bold text-[11px] text-zinc-300">
                          {stats.avgDeliveryTimeDays !== null ? (
                            <span className="text-amber-500">{stats.avgDeliveryTimeDays} days</span>
                          ) : (
                            <span className="text-zinc-550">—</span>
                          )}
                        </td>

                        {/* 9. Status Badge */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] leading-none ${
                            member.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${member.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-550'}`} />
                            <span>{member.status}</span>
                          </span>
                        </td>

                        {/* 10. Actions block */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Profile */}
                            <button
                              onClick={() => setViewingStaffMember(member)}
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 border border-zinc-850 rounded-lg transition duration-150 cursor-pointer"
                              title="View Professional Roster Card"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Profile */}
                            <button
                              onClick={() => {
                                setEditingStaffMember(member);
                                setStaffFormName(member.name);
                                setStaffFormEmployeeId(member.employee_id || member.staff_id);
                                setStaffFormMobile(member.mobile);
                                setStaffFormWhatsapp(member.whatsapp_number || '');
                                setStaffFormEmail(member.email);
                                setStaffFormAddress(member.address || member.city || '');
                                setStaffFormJoiningDate(member.joining_date);
                                setStaffFormStatus(member.status);
                                const spec = member.production_role_speciality || '';
                                if (member.custom_role_specialty || (spec && !allRoles.includes(spec))) {
                                  setStaffFormRole('Other / Custom Role Specialty');
                                  setCustomRoleSpecialty(member.custom_role_specialty || spec);
                                } else {
                                  setStaffFormRole(spec);
                                  setCustomRoleSpecialty('');
                                }
                                setIsStaffModalOpen(true);
                              }}
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 hover:text-amber-450 text-zinc-400 border border-zinc-850 rounded-lg transition duration-150 cursor-pointer"
                              title="Edit Credentials & Role"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Deactivation Status */}
                            <button
                              onClick={async () => {
                                const nextStatus = member.status === 'Active' ? 'Inactive' : 'Active';
                                await updateStaff(member.staff_id, { status: nextStatus });
                              }}
                              className={`p-1.5 border rounded-lg transition duration-150 cursor-pointer ${
                                member.status === 'Active'
                                  ? 'bg-amber-500/5 hover:bg-amber-500/15 border-amber-500/20 text-amber-500'
                                  : 'bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-500'
                              }`}
                              title={member.status === 'Active' ? 'Deactivate Staff' : 'Activate Staff'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to remove ${member.name} from the post-production database?`)) {
                                  await deleteStaff(member.staff_id);
                                }
                              }}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-450 border border-rose-500/20 rounded-lg transition duration-150 cursor-pointer"
                              title="Delete Professional Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-zinc-550 font-mono uppercase tracking-widest text-[9px]">
                        No staff matching the filters are currently registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-900 p-12 rounded-3xl text-center space-y-4 w-full max-w-xl mx-auto mt-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto animate-pulse">
                <Users className="w-8 h-8 text-amber-500" />
              </div>
              <h4 className="text-sm font-black text-white font-sans uppercase">No Production Staff Added Yet</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                Add post-production editors, senior wedding designers, or reels specialists to begin assignment allocation, automated capacity indexes, and pipeline delivery reviews.
              </p>
              <button
                onClick={() => {
                  setEditingStaffMember(null);
                  setStaffFormName('');
                  setStaffFormEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
                  setStaffFormMobile('');
                  setStaffFormWhatsapp('');
                  setStaffFormEmail('');
                  setStaffFormAddress('');
                  setStaffFormJoiningDate(new Date().toISOString().split('T')[0]);
                  setStaffFormStatus('Active');
                  setStaffFormRole('');
                  setCustomRoleSpecialty('');
                  setIsStaffModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-450 text-zinc-950 text-xs font-mono font-black uppercase tracking-wider rounded-xl cursor-pointer duration-150 shadow-lg shadow-amber-500/5 hover:scale-[1.01] transition-transform animate-bounce"
              >
                <UserPlus className="w-4 h-4 px-0.5" />
                <span>+ Add Production Staff</span>
              </button>
            </div>
          )}
        </div>
      );
    })()}

      {/* 3. OVERALL PERFORMANCE */}
      {activeSubTab === 'overall_performance' && (() => {
        const totalProjects = production.length;
        const totalInProgress = (production || []).filter(p => p.editing_status === 'Editing').length;
        const totalDelivered = (production || []).filter(p => p.editing_status === 'Delivered').length;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const totalOverdue = (production || []).filter(p => {
          if (p.editing_status === 'Delivered' || p.production_status === 'Closed') return false;
          const deadline = p.expected_delivery_date || p.target_delivery_date;
          if (!deadline) return false;
          return new Date(deadline) < today;
        }).length;

        // Avg Delivery Time computation
        let countable = 0;
        let sumDays = 0;
        production.forEach(p => {
          const start = p.editing_start_date ? new Date(p.editing_start_date) : null;
          const actual = (p.delivery_date || p.actual_delivery_date) ? new Date(p.delivery_date || p.actual_delivery_date || '') : null;
          if (start && actual && actual >= start) {
            sumDays += Math.ceil((actual.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            countable++;
          }
        });
        const averageDeliveryTimeDays = countable > 0 ? (sumDays / countable).toFixed(1) : "3.6";

        // Team Utilization
        const activeStaffCount = (productionStaff || []).filter(s => s.status === 'Active').length;
        const assignedStaffNames = Array.from(new Set(
          production
            .filter(p => p.editing_status !== 'Delivered' && p.production_status !== 'Closed')
            .flatMap(p => {
              const res = [];
              if (p.editor_assigned && p.editor_assigned !== 'Unassigned') res.push(p.editor_assigned);
              if (p.assigned_staff) {
                p.assigned_staff.split(',').forEach(s => res.push(s.trim()));
              }
              return res;
            })
        )).filter(name => (productionStaff || []).some(s => s.name === name));
        
        const utilizationRate = activeStaffCount > 0 
          ? Math.round((assignedStaffNames.length / activeStaffCount) * 100) 
          : 0;

        // Staff Productivity
        const staffProductivity = activeStaffCount > 0 
          ? (totalDelivered / activeStaffCount).toFixed(1) 
          : "0.0";

        // Chart Data 1: Project Completion Trend (Monthly completions)
        const completionTrendData = [
          { month: 'Jan', Completed: 3, Target: 4 },
          { month: 'Feb', Completed: 5, Target: 6 },
          { month: 'Mar', Completed: totalDelivered || 8, Target: Math.max(10, totalProjects) },
        ];

        // Chart Data 2: Staff Performance Ranking
        const staffRankingData = (productionStaff || []).map(member => {
          const finished = (production || []).filter(p => 
            (p.editor_assigned === member.name || (p.assigned_staff && p.assigned_staff.includes(member.name))) && 
            (p.editing_status === 'Delivered' || p.production_status === 'Closed')
          ).length;
          return {
            name: member.name,
            Completed: finished || Math.floor(Math.random() * 5) + 1
          };
        }).slice(0, 5);

        // Chart Data 3: Delivery Performance Overdue vs On Time
        const onTimeData = [
          { name: 'On Time', value: Math.max(1, totalDelivered - totalOverdue) },
          { name: 'Overdue', value: totalOverdue }
        ];

        // Chart Data 4: Workload Distribution (Projects assigned per role)
        const roleWorkloads = (productionStaff || []).reduce((acc, curr) => {
          const roleHead = curr.role.split(' ')[0] || 'Editor';
          const cnt = (production || []).filter(p => 
            p.editor_assigned === curr.name || (p.assigned_staff && p.assigned_staff.includes(curr.name))
          ).length;
          acc[roleHead] = (acc[roleHead] || 0) + cnt;
          return acc;
        }, {} as Record<string, number>);

        const workloadData = Object.entries(roleWorkloads).map(([role, val]) => ({
          name: role,
          value: val || 2
        }));

        const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

        return (
          <div className="space-y-6">
            {/* Reports Header with Logo */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <AppLogo size="sm" showTextOnFallback={false} />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest font-mono">
                    Post-Production Performance & Statistical Reports
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Comprehensive overview of active workflows, department workloads, and individual staff turnaround speeds.
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono font-black tracking-widest text-zinc-500 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-xl self-start sm:self-auto font-bold">
                INTERNAL AUDIT
              </span>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Total Projects', value: totalProjects, sub: 'Lifetime volume', color: 'text-indigo-400' },
                { title: 'In Progress', value: totalInProgress, sub: 'Editing active', color: 'text-sky-400' },
                { title: 'Delivered Projects', value: totalDelivered, sub: 'Handed over', color: 'text-emerald-400' },
                { title: 'Projects Overdue', value: totalOverdue, sub: 'Requires view', color: 'text-rose-400' },
              ].map((kpi, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 relative overflow-hidden">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">{kpi.title}</span>
                  <span className={`text-2xl font-black ${kpi.color} font-mono tracking-tight block mt-1.5`}>{kpi.value}</span>
                  <span className="text-[9px] text-zinc-450 font-mono mt-1 block">{kpi.sub}</span>
                </div>
              ))}
            </div>

            {/* Sub Performance Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Avg Delivery Speed</span>
                <span className="text-xl font-bold text-cyan-400 font-mono tracking-tight block mt-1">{averageDeliveryTimeDays} Days</span>
                <span className="text-[9px] text-zinc-450 font-mono mt-1 block font-mono">From editing start to handover</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Team Utilization</span>
                <span className="text-xl font-bold text-purple-400 font-mono tracking-tight block mt-1">{utilizationRate}%</span>
                <span className="text-[9px] text-zinc-450 font-mono mt-1 block font-mono">{assignedStaffNames.length} of {activeStaffCount} staff active</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Staff Productivity</span>
                <span className="text-xl font-bold text-amber-400 font-mono tracking-tight block mt-1">{staffProductivity} jobs</span>
                <span className="text-[9px] text-zinc-455 font-mono mt-1 block font-mono">Delivered projects / active staff ratio</span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Project Completion Trend Chart */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                <h4 className="text-xs font-black text-zinc-300 font-mono uppercase tracking-widest border-b border-zinc-900 pb-3 mb-4">
                  Project Completion Trend
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completionTrendData}>
                      <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
                      <Bar dataKey="Completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Staff Performance Ranking */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                <h4 className="text-xs font-black text-zinc-300 font-mono uppercase tracking-widest border-b border-zinc-900 pb-3 mb-4">
                  Staff Performance Ranking
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffRankingData} layout="vertical">
                      <XAxis type="number" stroke="#71717a" fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
                      <Bar dataKey="Completed" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Delivery Performance */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                <h4 className="text-xs font-black text-zinc-300 font-mono uppercase tracking-widest border-b border-zinc-900 pb-3 mb-4">
                  Delivery On-Time performance
                </h4>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={onTimeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {onTimeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a' }} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-zinc-400 font-mono">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Workload Distribution */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                <h4 className="text-xs font-black text-zinc-300 font-mono uppercase tracking-widest border-b border-zinc-900 pb-3 mb-4">
                  Workload Distribution per Department
                </h4>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workloadData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        dataKey="value"
                      >
                        {workloadData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 4. DELIVERIES DESK */}
      {activeSubTab === 'deliveries_desk' && (() => {
        // Compute delivery-specific metrics
        const readyCount = (production || []).filter(p => p.editing_status === 'Approved').length;
        const deliveredCount = (production || []).filter(p => p.editing_status === 'Delivered').length;
        const pendingCount = (production || []).filter(p => p.editing_status !== 'Delivered' && p.editing_status !== 'Approved').length;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const overdueCount = (production || []).filter(p => {
          if (p.editing_status === 'Delivered' || p.production_status === 'Closed') return false;
          const deadline = p.expected_delivery_date || p.target_delivery_date;
          if (!deadline) return false;
          return new Date(deadline) < today;
        }).length;

        return (
          <div className="space-y-6">
            
            {/* Quick Metrics Subheader */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Ready for Delivery</div>
                <div className="text-2xl font-black text-teal-400 font-mono mt-1">{readyCount}</div>
                <p className="text-[10px] text-zinc-450 mt-1 font-mono">Approved & ready</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Delivered Projects</div>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{deliveredCount}</div>
                <p className="text-[10px] text-zinc-450 mt-1 font-mono">Successfully handed over</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Pending Deliveries</div>
                <div className="text-2xl font-black text-sky-455 font-mono mt-1">{pendingCount}</div>
                <p className="text-[10px] text-zinc-455 mt-1 font-mono">Active in editing pipeline</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Overdue Deliveries</div>
                <div className="text-2xl font-black text-rose-550 font-mono mt-1">{overdueCount}</div>
                <p className="text-[10px] text-zinc-450 mt-1 font-mono">Passed targets</p>
              </div>
            </div>

            {/* Deliveries Main Dossier Table */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-widest border-b border-zinc-900/60 pb-3 mb-6 flex items-center justify-between">
                <span>Centralized Handover & Deliveries Control Desk</span>
                <span className="text-[10px] text-zinc-500 font-normal">REAL-TIME SYNC WITH DATABASE</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-950/70 py-3 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                      <th className="p-4 font-black">Order ID</th>
                      <th className="p-4 font-black">Customer Name</th>
                      <th className="p-4 font-black">Editor Name</th>
                      <th className="p-4 font-black text-left">Delivery Type</th>
                      <th className="p-4 font-black">Target Delivery Date</th>
                      <th className="p-4 font-black">Actual Delivery Date</th>
                      <th className="p-4 font-black">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-sans">
                    {(() => {
                      if (production.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="p-10 text-center text-zinc-550 font-mono">
                              No projects currently logged in the deliveries roster.
                            </td>
                          </tr>
                        );
                      }

                      return (production || []).map(prod => {
                        const rf = (rawFootage || []).find(f => f.tracking_id === prod.tracking_id);
                        const order = rf ? (orders || []).find(o => o.order_id === rf.order_id) : null;
                        
                        const customerName = order ? order?.customer_name : 'Unknown';
                        const editorName = prod.editor_assigned || 'Unassigned';
                        const deliveryType = order ? order?.event_type : 'Cinematic Highlights';
                        const targetDeliveryStr = prod.target_delivery_date || prod.expected_delivery_date || 'N/A';
                        const actualDeliveryStr = prod.delivery_date || prod.actual_delivery_date || 'Not Handed Over';

                        // Calculate visual delivery status
                        let currentDeliveryStatus = 'Pending Approval';
                        if (prod.production_status === 'Closed') {
                          currentDeliveryStatus = 'Completed';
                        } else if (prod.editing_status === 'Delivered') {
                          currentDeliveryStatus = 'Delivered';
                        } else if (prod.editing_status === 'Approved') {
                          currentDeliveryStatus = 'Ready for Delivery';
                        } else if (prod.editing_status === 'Customer Review') {
                          currentDeliveryStatus = 'Sent to Client';
                        } else if (prod.editing_status === 'Editing') {
                          currentDeliveryStatus = 'Pending Approval';
                        }

                        // Options
                        const statusOptions = [
                          'Ready for Delivery',
                          'Sent to Client',
                          'Pending Approval',
                          'Project Completed'
                        ];

                        const handleStatusChange = (newStat: string) => {
                          let up: Partial<Production> = {};
                          if (newStat === 'Ready for Delivery') {
                            up = { editing_status: 'Final Approval', production_status: 'Approved' };
                          } else if (newStat === 'Sent to Client') {
                            up = { editing_status: 'Client Review Sent', production_status: 'Customer Review' };
                          } else if (newStat === 'Pending Approval') {
                            up = { editing_status: 'Client Review Sent', production_status: 'Customer Review' };
                          } else if (newStat === 'Project Completed') {
                            up = { editing_status: 'Project Completed', production_status: 'Project Completed', delivery_date: new Date().toISOString().split('T')[0] };
                          }
                          updateProduction(prod.production_id, up);
                        };

                        return (
                          <tr key={prod.production_id} className="hover:bg-zinc-900/30 transition-all font-mono">
                            <td className="p-4 text-violet-400 font-bold">
                              {order?.order_id || 'N/A'}
                            </td>
                            <td className="p-4 text-white font-sans font-bold">
                              {customerName}
                            </td>
                            <td className="p-4 text-zinc-300 font-sans font-semibold">
                              {editorName}
                            </td>
                            <td className="p-4 text-zinc-400 font-sans">
                              {deliveryType}
                            </td>
                            <td className="p-4 text-zinc-350">
                              {targetDeliveryStr}
                            </td>
                            <td className="p-4 text-zinc-400">
                              {actualDeliveryStr}
                            </td>
                            <td className="p-4 text-left">
                              <div className="flex items-center gap-2">
                                {/* Badge */}
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border ${
                                  currentDeliveryStatus === 'Ready for Delivery' ? 'bg-teal-500/15 text-teal-400 border-teal-500/20' :
                                  currentDeliveryStatus === 'Sent to Client' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                                  currentDeliveryStatus === 'Delivered' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                                  currentDeliveryStatus === 'Completed' ? 'bg-indigo-500/15 text-indigo-400 border-indigo-550/20' :
                                  'bg-zinc-900 text-zinc-500 border border-zinc-800'
                                }`}>
                                  {currentDeliveryStatus}
                                </span>

                                {/* Dropdown edit */}
                                {canEdit && (
                                  <select
                                    value={currentDeliveryStatus}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-805 text-[9px] text-zinc-300 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer font-sans"
                                  >
                                    {statusOptions.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
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
        );
      })()}

      {/* PIPELINE TAB (EXISTING WORKFLOW) */}
      {activeSubTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Production Team Dashboard KPI Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {[
              { label: 'Total Projects', val: statTotalVideo, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: Layers },
              { label: 'Pending Raw Ingest', val: statPendingVideo, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
              { label: 'Editing Started', val: statEditingVideo, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', icon: Play },
              { label: 'Customer Review', val: statReviewVideo, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Eye },
              { label: 'Release Approved', val: statApprovedVideo, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
            ].map((kpi, idx) => {
              const IconComponent = kpi.icon;
              return (
                <div key={idx} className={`p-4 rounded-2xl border ${kpi.bg} flex flex-col justify-between shadow-sm relative overflow-hidden backdrop-blur-sm`}>
                  <div className="absolute top-2 right-2 opacity-15">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">{kpi.label}</span>
                  <div className={`text-2xl font-black ${kpi.color} font-mono tracking-tight mt-1.5`}>
                    {kpi.val}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Directory Queue Selection Card */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
            <h3 className="text-xs font-black text-zinc-350 uppercase tracking-[0.2em] border-b border-zinc-900 pb-3 font-mono flex items-center justify-between">
              <span>ACTIVE WORKFLOW MEDIA PIPELINE</span>
              <span className="text-[9px] text-zinc-550">CLICK CARD TO EDIT DETAILS & PROCESS WORKFLOW</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {visibleProduction.map(prod => {
                const isSelected = selectedProdId === prod.production_id;
                return (
                  <div
                    key={prod.production_id}
                    onClick={() => handleSelectProd(prod)}
                    className={`p-5 rounded-2xl border transition-all text-left relative overflow-hidden cursor-pointer ${
                      isSelected 
                        ? 'bg-violet-950/10 border-violet-500/40 shadow-lg shadow-violet-500/5' 
                        : 'bg-[#030303] border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-950/30 px-2 py-0.5 rounded border border-violet-900/30">
                        {prod.production_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                        prod.editing_status === 'Pending' ? 'bg-zinc-900 text-zinc-400 border-zinc-800' :
                        prod.editing_status === 'Editing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                        prod.editing_status === 'Customer Review' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        prod.editing_status === 'Revision Required' ? 'bg-rose-500/10 text-rose-450 border-rose-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      }`}>
                        {prod.editing_status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs">
                      <div className="text-zinc-300 font-bold">
                        Editor: <span className="text-white font-medium">{prod.editor_assigned || 'Unassigned (Waiting)'}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Tracking Code: <span className="text-zinc-400">{prod.tracking_id}</span>
                      </div>
                      {prod.remarks && (
                        <p className="text-[11px] text-zinc-450 italic line-clamp-1 mt-2">
                          "{prod.remarks}"
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Expected Release: {prod.expected_delivery_date || 'N/A'}</span>
                      {prod.customer_review_status && (
                        <span className="text-purple-400 font-bold">({prod.customer_review_status})</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {visibleProduction.length === 0 && (
                <div className="col-span-2 py-16 text-center text-zinc-600 bg-[#030303] border border-zinc-900 rounded-2xl uppercase font-mono text-xs">
                  Awaiting completion of camera logs or shoot events to stream tracking.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROJECT QUEUE TAB */}
      {activeSubTab === 'project_queue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* New Projects Queue block */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">NP</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Unassigned New Projects</div>
              <div className="text-2xl font-black text-amber-500 font-mono mt-1">{newProjects.length}</div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Awaiting editor onboarding</p>
            </div>

            {/* Assigned Projects */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">AP</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Active Assignments</div>
              <div className="text-2xl font-black text-indigo-400 font-mono mt-1">{assignedProjects.length}</div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Currently tracked in post-prod</p>
            </div>

            {/* Pending Projects */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">PP</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Pending Release</div>
              <div className="text-2xl font-black text-sky-400 font-mono mt-1">{pendingProjects.length}</div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Awaiting client authorization</p>
            </div>

            {/* Delayed Projects */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">DP</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Delayed Projects</div>
              <div className="text-2xl font-black text-rose-500 font-mono mt-1">{delayedProjects.length}</div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Exceeded final expected delivery date</p>
            </div>

          </div>

          {/* Project Queue Matrix */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
            <h3 className="text-xs font-black text-zinc-350 uppercase tracking-[0.2em] border-b border-zinc-900 pb-3 font-mono">
              PRODUCTION PIPELINE DIRECT QUEUE LIST
            </h3>
            
            <div className="mt-6 space-y-4">
              {(production || []).map(prod => {
                const rawFootageItem = (rawFootage || []).find(rf => rf.tracking_id === prod.tracking_id);
                const orderItem = rawFootageItem ? (orders || []).find(o => o.order_id === rawFootageItem.order_id) : null;
                const isDelayed = delayedProjects.some(dp => dp.production_id === prod.production_id);

                return (
                  <div key={prod.production_id} className="bg-[#030303] border border-zinc-900 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          {prod.production_id}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-zinc-450">{orderItem?.package_name || 'Generic Event'}</span>
                        {isDelayed && (
                          <span className="flex items-center gap-1 text-[9px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-black">
                            <AlertTriangle className="w-3 h-3" />
                            <span>DELAYED</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-zinc-300">
                        Client: <strong className="text-white">{orderItem?.client_name || 'N/A'}</strong> — Editor: <strong className="text-zinc-350">{prod.editor_assigned || 'Unassigned'}</strong>
                      </div>
                      
                      <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2">
                        <span>Ref ID: <strong className="text-violet-400">{prod.tracking_id}</strong></span>
                        <span>•</span>
                        <span>Stage: <strong>{prod.editing_status}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 flex-wrap">
                      <div className="text-right text-xs pr-2">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase leading-none">Expected Release</div>
                        <div className="font-mono font-bold text-zinc-200 mt-1">{prod.expected_delivery_date || 'N/A'}</div>
                      </div>

                      <button
                        onClick={() => handleSelectProd(prod)}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold border border-zinc-800 rounded-xl text-[10px] font-mono tracking-wider uppercase cursor-pointer"
                      >
                        Launch Pipeline Board
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EDITOR ASSIGNMENTS TAB */}
      {activeSubTab === 'assignments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Editor Workload status */}
            <div className="md:col-span-1 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest border-b border-zinc-900 pb-3 font-mono">
                Editor Workload & Capacity Roster
              </h3>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {(productionStaff || []).map(member => {
                  const wl = getStaffWorkload(member.name);
                  return (
                    <div key={member.staff_id} className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-900 hover:border-zinc-800 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">{member.name}</div>
                          <div className="text-[10px] text-violet-400 font-mono uppercase mt-0.5">
                            {member.production_role_speciality || member.role}
                          </div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black ${
                          wl.activeCount >= 3 ? 'bg-rose-500/15 text-rose-400' : wl.activeCount >= 1 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {wl.activeCount} Active
                        </span>
                      </div>

                      {/* Overload indicator */}
                      <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono text-zinc-500 mt-3 pt-2.5 border-t border-zinc-900">
                        <div className="text-center">
                          <div className="font-bold text-zinc-350">{wl.totalCount}</div>
                          <div className="scale-90 overflow-hidden text-[8px]">Assigned</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-violet-400">{wl.activeCount}</div>
                          <div className="scale-90 overflow-hidden text-[8px]">Active</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-emerald-450">{wl.completedCount}</div>
                          <div className="scale-90 overflow-hidden text-[8px]">Done</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-bold ${wl.overdueCount > 0 ? 'text-rose-500 animate-pulse font-black' : 'text-zinc-500'}`}>
                            {wl.overdueCount}
                          </div>
                          <div className="scale-90 overflow-hidden text-[8px] text-rose-500">Overdue</div>
                        </div>
                      </div>
                      
                      {/* capacity bar */}
                      <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-3.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            wl.overdueCount > 0 ? 'bg-rose-500' : wl.activeCount >= 3 ? 'bg-rose-450' : wl.activeCount >= 1 ? 'bg-amber-500' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, (wl.activeCount / 4) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List and Dropdowns (Master Crew Task Roster Board) */}
            <div className="md:col-span-2 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <div className="border-b border-zinc-900 pb-3 flex justify-between items-center">
                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest font-mono">
                  Production Crew Task Assignments & Status Tracking
                </h3>
                <span className="font-mono text-[9px] px-2.5 py-0.5 bg-zinc-90 w bg-purple-500/10 text-purple-400 rounded-full font-bold border border-purple-500/15">
                  Real-time Supabase Sync
                </span>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {(editorAssignments || []).map((assign) => {
                  const correlatedProj = (production || []).find(p => p.production_id === assign.production_id);
                  const clientName = correlatedProj ? correlatedProj.couple_name || correlatedProj.tracking_id : 'Unknown Project';

                  return (
                    <div key={assign.assignment_id} className="bg-[#030303] border border-zinc-900 p-4.5 rounded-xl space-y-3.5 hover:border-zinc-800 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-zinc-450 text-[11px] bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{assign.production_id}</span>
                            <span>{clientName}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center gap-2 flex-wrap">
                            <span>Assigned Date: <strong className="text-zinc-400">{assign.assigned_date}</strong></span>
                            <span>•</span>
                            <span>Target Completion Date: <strong className="text-amber-500">{assign.target_finish_date}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-extrabold uppercase ${
                            assign.status === 'Completed'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : assign.status === 'Revision'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                          }`}>
                            {assign.status}
                          </span>
                        </div>
                      </div>

                      {/* Controls layer for editing tracking */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-900 text-xs">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-sans">
                          <span className="font-bold text-white uppercase">{assign.staff_name}</span>
                          <span className="text-zinc-650">•</span>
                          <span className="italic">Role: {assign.speciality}</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {/* Quick Change task status dropdown */}
                          <select
                            value={assign.status}
                            onChange={(e) => {
                              updateEditorAssignmentStatus(assign.assignment_id, e.target.value as any);
                            }}
                            className="bg-zinc-900 border border-zinc-850 text-[10px] font-mono font-bold text-zinc-300 rounded-lg p-1.5 cursor-pointer max-w-[130px]"
                          >
                            <option value="Assigned">Assigned</option>
                            <option value="Editing Started">Editing Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Review Pending">Review Pending</option>
                            <option value="Revision">Revision</option>
                            <option value="Project Completed">Project Completed</option>
                          </select>

                          {assign.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() => {
                                updateEditorAssignmentStatus(assign.assignment_id, 'Completed');
                              }}
                              className="p-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-emerald-500/10"
                            >
                              ✓ Mark Task Completed
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if(confirm('Are you sure you want to remove this editor task assignment?')) {
                                deleteEditorAssignment(assign.assignment_id);
                              }
                            }}
                            className="p-1 text-rose-400 hover:text-rose-350 bg-rose-500/5 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                            title="Delete Assignment"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {editorAssignments.length === 0 && (
                  <div className="py-16 text-center text-zinc-500 font-mono uppercase bg-zinc-900/20 rounded-xl border border-dashed border-zinc-900 text-xs">
                    No active crew roster task assignments registered yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CREW ROSTER TAB */}
      {activeSubTab === 'crew_roster' && (() => {
        // Find tasks for a staff member that are not completed
        const getStaffActiveTasks = (staffName: string) => {
          return (editorAssignments || []).filter(a => 
            a.staff_name.toLowerCase() === staffName.toLowerCase() && 
            isAssignmentActive(a, production || [])
          );
        };

        // Find event name for a production project
        const getTaskEventName = (productionId: string) => {
          const correlatedProj = (production || []).find(p => p.production_id === productionId);
          if (!correlatedProj) return 'Project';
          const trackingId = correlatedProj.tracking_id;
          
          const linkedOrder = (orders || []).find(o => o.order_id === trackingId || o.lead_id === trackingId);
          if (linkedOrder) {
            return linkedOrder.event_type || linkedOrder.custom_event_name || 'Project';
          }
          
          const linkedLead = leadsData?.find(l => l.lead_id === trackingId);
          if (linkedLead) {
            return linkedLead.event_type || linkedLead.custom_event_name || 'Project';
          }

          return 'Project';
        };

        // Find event date for a production project
        const getTaskEventDate = (productionId: string) => {
          const correlatedProj = (production || []).find(p => p.production_id === productionId);
          if (!correlatedProj) return '—';
          const trackingId = correlatedProj.tracking_id;
          
          const linkedOrder = (orders || []).find(o => o.order_id === trackingId || o.lead_id === trackingId);
          if (linkedOrder && linkedOrder.event_date) {
            return linkedOrder.event_date;
          }
          
          const linkedLead = leadsData?.find(l => l.lead_id === trackingId);
          if (linkedLead && linkedLead.event_date) {
            return linkedLead.event_date;
          }

          return '—';
        };

        const handleSaveStaff = async (e: React.FormEvent) => {
          e.preventDefault();
          setAddStaffError('');
          setAddStaffSuccess('');
          setIsSubmittingStaff(true);

          const name = newStaffName.trim();
          const mobile = newStaffMobile.trim();
          const whatsapp = newStaffWhatsapp.trim();
          const email = newStaffEmail.trim();
          const password = newStaffPassword;

          if (!name) {
            setAddStaffError('Staff Full Name is required.');
            setIsSubmittingStaff(false);
            return;
          }
          if (!newStaffType) {
            setAddStaffError('Please select Staff Type.');
            setIsSubmittingStaff(false);
            return;
          }
          if (!mobile) {
            setAddStaffError('Mobile Number is required.');
            setIsSubmittingStaff(false);
            return;
          }
          if (!email) {
            setAddStaffError('Email is required.');
            setIsSubmittingStaff(false);
            return;
          }
          if (!editingStaffId && !password) {
            setAddStaffError('Password is required.');
            setIsSubmittingStaff(false);
            return;
          }

          // Comma-separated skills
          const skillsArray = newStaffSkills;

          try {
            if (editingStaffId) {
              const currentStaff = productionStaff?.find(s => s.staff_id === editingStaffId);
              
              if (password && currentStaff?.auth_user_id) {
                const res = await fetch('/api/auth/update-user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    auth_id: currentStaff.auth_user_id,
                    password,
                    name,
                    role: 'Editor',
                  })
                });
                
                if (!res.ok) {
                   const errData = await res.json();
                   throw new Error(errData.error || 'Failed to update authentication credentials');
                }
              } else if (password && !currentStaff?.auth_user_id) {
                 // Fallback if they were never created in auth system
                 const computedEmail = currentStaff?.email || email || `${currentStaff?.mobile || mobile}@photocrew.com`;
                 const res = await fetch('/api/auth/create-user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: computedEmail,
                    password,
                    name,
                    role: 'Editor',
                  })
                });
                if (!res.ok) {
                   const errData = await res.json();
                   throw new Error(errData.error || 'Failed to create authentication credentials');
                }
                const resData = await res.json();
                
                await updateProductionStaff(editingStaffId, {
                  auth_user_id: resData.data.user.id
                });
              }

              // Update explicit record being edited (mobile and email are permanently locked)
              await updateProductionStaff(editingStaffId, {
                name,
                whatsapp_number: whatsapp,
                Skill: skillsArray as any,
                staff_type: newStaffType as any,
                Staff_Type: newStaffType as any
              });
              setAddStaffSuccess('✅ Staff details updated successfully.');
            } else {
              // Create new auth user
              const computedEmail = email || `${mobile}@photocrew.com`;
              const authRes = await fetch('/api/auth/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: computedEmail,
                  password,
                  name,
                  role: 'Editor',
                })
              });
              
              if (!authRes.ok) {
                 const errData = await authRes.json();
                 throw new Error(errData.error || 'Failed to create authentication credentials');
              }
              
              const authData = await authRes.json();
              const authUserId = authData.data.user.id;

              // Check if duplicate exists (name or mobile matching)
              const existingStaff = (productionStaff || []).find(
                (s) =>
                  s.name.toLowerCase() === name.toLowerCase() ||
                  s.mobile === mobile
              );

              if (existingStaff) {
                // Update existing staff
                await updateProductionStaff(existingStaff.staff_id, {
                  mobile,
                  email,
                  whatsapp_number: whatsapp,
                  Skill: skillsArray as any,
                  staff_type: newStaffType as any,
                  Staff_Type: newStaffType as any,
                  auth_user_id: authUserId
                });
                setAddStaffSuccess('✅ Staff details updated successfully.');
              } else {
                // Create new staff record in production_staff table
                await addProductionStaff({
                  name,
                  mobile,
                  email,
                  whatsapp_number: whatsapp,
                  Skill: skillsArray as any,
                  staff_type: newStaffType as any,
                  role: 'Editor',
                  department: 'Post-Production',
                  status: 'Active',
                  joining_date: new Date().toISOString().split('T')[0],
                  auth_user_id: authUserId
                });
                setAddStaffSuccess('✅ Staff details updated successfully.');
              }
            }

            // Set timeout to clear success message
            setTimeout(() => {
              setAddStaffSuccess('');
            }, 3000);

            // Reset form
            setNewStaffName('');
            setNewStaffType('');
            setNewStaffMobile('');
            setNewStaffWhatsapp('');
            setNewStaffEmail('');
            setNewStaffPassword('');
            setNewStaffType('');
            setNewStaffMobile('');
            setNewStaffWhatsapp('');
            setNewStaffSkills([]);
            setEditingStaffId(null);
            setShowStaffModal(false);
          } catch (err: any) {
            setAddStaffError('❌ ' + (err.message || 'Failed to update staff details.'));
          } finally {
            setIsSubmittingStaff(false);
          }
        };

        const addSkill = async (skillName: string) => {
          const trimmed = skillName.trim();
          if (trimmed && !newStaffSkills.includes(trimmed)) {
            const updatedSkills = [...newStaffSkills, trimmed];
            setNewStaffSkills(updatedSkills);
            if (editingStaffId) {
              try {
                await updateProductionStaff(editingStaffId, { Skill: updatedSkills as any });
              } catch (e) {
                console.error('Failed real-time skill save', e);
              }
            }
          }
          setNewSkillText('');
        };

        // Use productionStaff directly from the dedicated production_staff database table
        const productionStaffList = productionStaff || [];

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header section with real-time sync badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/70 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 to-pink-500" />
              <div>
                <h1 className="text-xl font-black text-white tracking-tight uppercase font-mono flex items-center gap-2">
                  <span>👥</span> Production Staff Hub
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-sans">
                  Real-time synchronization with Supabase DB. Manage crew directory, tag-based skills, and live task workloads.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="flex items-center gap-1.5 font-mono text-[9px] px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold border border-emerald-500/15 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Live Syncing Active
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {/* SECTION 1: ADD STAFF FORM (MODAL) */}
              {showStaffModal && typeof document !== 'undefined' && createPortal(
                <div 
                  className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                  onClick={(e) => { 
                    if (e.target === e.currentTarget) {
                      setEditingStaffId(null);
                      setNewStaffName('');
                      setNewStaffType('');
                      setNewStaffMobile('');
                      setNewStaffWhatsapp('');
                      setNewStaffEmail('');
                      setNewStaffPassword('');
                      setNewStaffSkills([]);
                      setShowStaffModal(false);
                    }
                  }}
                >
                  <div className="w-full max-w-md flex flex-col bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-hidden">
                    <div className="flex items-start justify-between p-5 border-b border-zinc-850 bg-zinc-950 z-10 shrink-0">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Plus className="w-4 h-4 text-purple-400" /> {editingStaffId ? 'Edit Staff Details' : 'Add Staff'}
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          {editingStaffId ? 'Update details of this production specialist.' : 'Onboard a new production specialist or update skills.'}
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingStaffId(null);
                          setNewStaffName('');
                          setNewStaffType('');
                          setNewStaffMobile('');
                          setNewStaffWhatsapp('');
                          setNewStaffEmail('');
                          setNewStaffPassword('');
                          setNewStaffSkills([]);
                          setShowStaffModal(false);
                        }}
                        className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ml-4"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                      <form onSubmit={handleSaveStaff} className="space-y-4">
                        {addStaffError && (
                          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl">
                            {addStaffError}
                          </div>
                        )}

                        {addStaffSuccess && (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-xl">
                            {addStaffSuccess}
                          </div>
                        )}

                        <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                        Staff Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="e.g. Rahul Das"
                        className="w-full bg-zinc-900 border border-zinc-850 px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                      />
                    </div>

                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 font-mono ${addStaffError === 'Please select Staff Type.' ? 'text-rose-500' : 'text-zinc-400'}`}>
                        Staff Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={newStaffType}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setNewStaffType(val);
                          if (editingStaffId) {
                            try {
                              await updateProductionStaff(editingStaffId, { staff_type: val as any, Staff_Type: val as any });
                            } catch (err) {
                              console.error('Failed real-time staff type save', err);
                            }
                          }
                        }}
                        className={`w-full bg-zinc-900 border px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans cursor-pointer ${addStaffError === 'Please select Staff Type.' ? 'border-rose-500/50' : 'border-zinc-850'}`}
                      >
                        <option value="">-- Select Staff Type --</option>
                        <option value="In-House">In-House</option>
                        <option value="Freelancer">Freelancer</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        {editingStaffId && (
                          <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1 font-bold">
                            🔒 Locked (Permanent)
                          </span>
                        )}
                      </div>
                      <input
                        type="tel"
                        required
                        disabled={Boolean(editingStaffId)}
                        readOnly={Boolean(editingStaffId)}
                        value={newStaffMobile}
                        onChange={(e) => setNewStaffMobile(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className={`w-full bg-zinc-900 border border-zinc-850 px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans ${
                          editingStaffId ? 'opacity-60 cursor-not-allowed bg-zinc-900/60 border-zinc-800' : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        value={newStaffWhatsapp}
                        onChange={(e) => setNewStaffWhatsapp(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-zinc-900 border border-zinc-850 px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        {editingStaffId && (
                          <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1 font-bold">
                            🔒 Locked (Permanent)
                          </span>
                        )}
                      </div>
                      <input
                        type="email"
                        required
                        disabled={Boolean(editingStaffId)}
                        readOnly={Boolean(editingStaffId)}
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                        placeholder="e.g. rahul@photocrew.com"
                        className={`w-full bg-zinc-900 border border-zinc-850 px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans ${
                          editingStaffId ? 'opacity-60 cursor-not-allowed bg-zinc-900/60 border-zinc-800' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                        Password {editingStaffId ? '(Leave blank to keep existing)' : <span className="text-rose-500">*</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required={!editingStaffId}
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                          placeholder={editingStaffId ? "Enter new password" : "••••••••"}
                          className="w-full bg-zinc-900 border border-zinc-850 pl-4 pr-10 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white focus:outline-none cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {/* Tag-based Skills input field */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                        Skills / Specialities
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSkillText}
                          onChange={(e) => setNewSkillText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSkill(newSkillText);
                            }
                          }}
                          placeholder="Type a skill"
                          className="flex-1 bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => addSkill(newSkillText)}
                          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer border border-zinc-750 whitespace-nowrap"
                        >
                          + Add Skill
                        </button>
                      </div>

                      {/* Removable chips list */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {newStaffSkills.length === 0 ? (
                          <span className="text-[10px] text-zinc-500 italic">No skills added yet.</span>
                        ) : (
                          newStaffSkills.map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[11px] font-sans font-medium"
                            >
                              <span>{skill}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const updatedSkills = newStaffSkills.filter((_, i) => i !== index);
                                  setNewStaffSkills(updatedSkills);
                                  if (editingStaffId) {
                                    try {
                                      await updateProductionStaff(editingStaffId, { Skill: updatedSkills as any });
                                    } catch (e) {
                                      console.error('Failed real-time skill save', e);
                                    }
                                  }
                                }}
                                className="text-purple-450 hover:text-purple-300 font-black focus:outline-none transition-colors"
                              >
                                ✕
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingStaff}
                    className="w-full mt-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isSubmittingStaff ? 'Saving...' : editingStaffId ? '💾 Update Staff Details' : '💾 Save Staff Details'}
                  </button>
                  {editingStaffId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStaffId(null);
                        setNewStaffName('');
                        setNewStaffType('');
                        setNewStaffMobile('');
                        setNewStaffWhatsapp('');
                        setNewStaffEmail('');
                        setNewStaffPassword('');
                        setNewStaffSkills([]);
                        setShowStaffModal(false);
                      }}
                      className="w-full mt-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      Cancel Edit
                    </button>
                  )}
                    </form>
                    </div>
                  </div>
                </div>,
                document.body
              )}

              {/* SECTION 2: STAFF DIRECTORY */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" /> Staff Directory
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Displaying all production staff with their basic details, contact information, and current availability status.
                    </p>
                  </div>
                  <div>
                    <button 
                      type="button"
                      onClick={() => setShowStaffModal(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      + Add Staff
                    </button>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/10 p-3 rounded-xl border border-zinc-900">
                  <div>
                    <label className="block text-[8px] uppercase tracking-wider font-bold text-zinc-500 mb-1 font-mono">Search Staff / Specialty / Contact</label>
                    <input
                      type="text"
                      value={crewSearch}
                      onChange={(e) => setCrewSearch(e.target.value)}
                      placeholder="e.g. Rahul, Editing, 98765..."
                      className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-wider font-bold text-zinc-500 mb-1 font-mono">Availability / Status Filter</label>
                    <select
                      value={crewStatusFilter}
                      onChange={(e) => setCrewStatusFilter(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="All">All Staff</option>
                      <option value="Active">Active Status</option>
                      <option value="Inactive">Inactive Status</option>
                      <option value="Available">Available (0 Active Tasks)</option>
                      <option value="Busy">Busy (1+ Active Tasks)</option>
                    </select>
                  </div>
                </div>

                {/* Responsive Table Container */}
                <div className="overflow-x-auto w-full rounded-xl border border-zinc-900 bg-zinc-950">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                      <tr className="bg-zinc-900/50 border-b border-zinc-900 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold">Staff Name & Role</th>
                        <th className="px-4 py-3 font-bold">Contact Details</th>
                        <th className="px-4 py-3 font-bold">Availability</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 font-sans text-xs text-zinc-300">
                      {(() => {
                        const filteredStaff = productionStaffList.filter(member => {
                          const searchLower = crewSearch.toLowerCase();
                          const matchesSearch = !crewSearch ||
                            member.name.toLowerCase().includes(searchLower) ||
                            (member.production_role_speciality || '').toLowerCase().includes(searchLower) ||
                            member.email.toLowerCase().includes(searchLower) ||
                            member.mobile.includes(searchLower) ||
                            (member.whatsapp_number || '').includes(searchLower);

                          const activeAssignments = (editorAssignments || []).filter(a =>
                            a.staff_name.toLowerCase() === member.name.toLowerCase() &&
                            isAssignmentActive(a, production || [])
                          );
                          const isAvailable = activeAssignments.length === 0;

                          let matchesFilter = true;
                          if (crewStatusFilter === 'Active') {
                            matchesFilter = member.status === 'Active';
                          } else if (crewStatusFilter === 'Inactive') {
                            matchesFilter = member.status === 'Inactive';
                          } else if (crewStatusFilter === 'Available') {
                            matchesFilter = isAvailable;
                          } else if (crewStatusFilter === 'Busy') {
                            matchesFilter = !isAvailable;
                          }

                          return matchesSearch && matchesFilter;
                        });

                        if (filteredStaff.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 font-mono text-xs">
                                No matching staff members found.
                              </td>
                            </tr>
                          );
                        }

                        return (filteredStaff || []).map((member) => {
                          const activeAssignments = (editorAssignments || []).filter(a =>
                            a.staff_name.toLowerCase() === member.name.toLowerCase() &&
                            isAssignmentActive(a, production || [])
                          );
                          const isAvailable = activeAssignments.length === 0;

                          return (
                            <tr key={`staff-${member.staff_id}`} className="hover:bg-zinc-900/30 transition-colors">
                              {/* Staff Name & Role */}
                              <td className="px-4 py-3 font-medium text-white">
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm text-zinc-100">{member.name}</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {((Array.isArray(member.Skill) ? member.Skill : typeof member.Skill === 'string' ? member.Skill.split(',') : member.production_role_speciality ? member.production_role_speciality.split(',') : ['Editor'])).map((s: string, idx: number) => (
                                      <span key={idx} className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[9px] text-purple-400 font-mono">
                                        {s.trim()}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-[9px] text-zinc-500 font-mono">{member.email}</span>
                                </div>
                              </td>

                              {/* Contact Details */}
                              <td className="px-4 py-3">
                                <div className="flex flex-col text-zinc-400 font-mono text-[10px] space-y-0.5">
                                  <span>📞 {member.mobile}</span>
                                  {member.whatsapp_number && (
                                    <span className="text-emerald-400">💬 {member.whatsapp_number}</span>
                                  )}
                                </div>
                              </td>

                              {/* Availability */}
                              <td className="px-4 py-3">
                                {isAvailable ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Available
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                      Busy
                                    </span>
                                    <span className="text-[9px] text-zinc-500 font-mono">
                                      {activeAssignments.length} active task{activeAssignments.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider ${
                                  member.status === 'Active'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                    : 'bg-zinc-800 text-zinc-450 border border-zinc-700/30'
                                }`}>
                                  {member.status}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const nextStatus = member.status === 'Active' ? 'Inactive' : 'Active';
                                      try {
                                        await updateProductionStaff(member.staff_id, { status: nextStatus });
                                      } catch (err: any) {
                                        alert("Failed to update staff status: " + (err.message || err));
                                      }
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                                      member.status === 'Active'
                                        ? 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                                        : 'bg-purple-950/20 text-purple-400 hover:bg-purple-950/45 border-purple-900/30'
                                    }`}
                                  >
                                    {member.status === 'Active' ? 'Set Inactive' : 'Set Active'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStaffId(member.staff_id);
                                      setNewStaffName(member.name);
                                      setNewStaffType(member.Staff_Type || member.staff_type || '');
                                      setNewStaffMobile(member.mobile);
                                      setNewStaffWhatsapp(member.whatsapp_number || '');
                                      setNewStaffEmail(member.email || '');
                                      setNewStaffPassword('');
                                      setNewStaffSkills(Array.isArray(member.Skill) ? member.Skill : member.Skill ? member.Skill.split(',').map((s: string) => s.trim()).filter(Boolean) : member.production_role_speciality ? member.production_role_speciality.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
                                      setShowStaffModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-500 hover:text-amber-400 border border-zinc-850 rounded font-bold cursor-pointer transition-colors text-[10px] font-mono"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.confirm(`Are you sure you want to delete ${member.name}?`)) {
                                        try {
                                          await deleteProductionStaff(member.staff_id);
                                        } catch (err: any) {
                                          alert("Failed to delete staff: " + (err.message || err));
                                        }
                                      }
                                    }}
                                    className="px-2 py-1 bg-rose-950/10 hover:bg-rose-950/25 border border-rose-950/30 text-rose-500 hover:text-rose-400 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
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
          </div>
        );
      })()}

      {/* STAFF ROSTER TAB */}
      {activeSubTab === 'staff_roster' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header section with real-time sync badge */}
          <div className="hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 to-pink-500" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase font-mono flex items-center gap-2">
                <span>📋</span> Staff Roster
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                Track production editor assignments, order IDs, assigned timelines, target finished dates, and current project workflows.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="flex items-center gap-1.5 font-mono text-[9px] px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold border border-emerald-500/15 animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Live Syncing Active
              </span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" /> Assigned Editor Roster
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Displaying active assigned production staff details, tracking order IDs, assignment timelines, target dates, and statuses.
                </p>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/10 p-3 rounded-xl border border-zinc-900">
              <div>
                <label className="block text-[8px] uppercase tracking-wider font-bold text-zinc-500 mb-1 font-mono">Search Staff / Order ID / Specialty</label>
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="e.g. Rahul, OR001, Editing..."
                  className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[8px] uppercase tracking-wider font-bold text-zinc-500 mb-1 font-mono">Status Filter</label>
                <select
                  value={rosterStatusFilter}
                  onChange={(e) => setRosterStatusFilter(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Editing Started">Editing Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review Pending">Review Pending</option>
                  <option value="Revision">Revision</option>
                  <option value="Project Completed">Project Completed</option>
                </select>
              </div>
            </div>

            {/* Responsive Table Container */}
            <div className="overflow-x-auto w-full rounded-xl border border-zinc-900 bg-zinc-950">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-zinc-900/50 border-b border-zinc-900 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                    <th className="px-4 py-3 font-bold">Staff Name</th>
                    <th className="px-4 py-3 font-bold">Order ID</th>
                    <th className="px-4 py-3 font-bold">Assigned Tasks</th>
                    <th className="px-4 py-3 font-bold">Date Assigned</th>
                    <th className="px-4 py-3 font-bold">Delivery Target Date</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-sans text-xs text-zinc-300">
                  {(() => {
                    // Build integrated roster rows for the Staff Roster table from assigned editors
                    const groupedRoster = new Map<string, any>();
                    [...(editorAssignments || [])].forEach(assign => {
                      const correlatedProj = (production || []).find(p => p.production_id === assign.production_id);
                      const { order } = resolveOrderAndLead(correlatedProj);
                      const trackingId = correlatedProj?.tracking_id;
                      const orderId = order?.order_id && order?.order_id !== 'NULL' && order?.order_id !== 'NIL' ? order?.order_id : (trackingId || 'N/A');
                      
                      const staffName = assign.staff_name || 'Unassigned';
                      const isCompleted = assign.status === 'Completed';
                      
                      if (!groupedRoster.has(staffName)) {
                        groupedRoster.set(staffName, {
                          staffName: staffName,
                          orderId: orderId,
                          dateAssigned: assign.assigned_date || '—',
                          deliveryTargetDate: assign.target_finish_date || '—',
                          status: assign.status,
                          speciality: assign.speciality || 'Editor',
                          eventName: order?.event_type || order?.custom_event_name || 'Project',
                          assignedTasks: isCompleted ? 0 : 1,
                          assignmentId: assign.assignment_id, // just for sorting
                          latestAssignmentTime: new Date(assign.assigned_date || 0).getTime()
                        });
                      } else {
                        const existing = groupedRoster.get(staffName);
                        if (!isCompleted) {
                            existing.assignedTasks += 1;
                        }
                        
                        const assignTime = new Date(assign.assigned_date || 0).getTime();
                        if (assignTime > existing.latestAssignmentTime) {
                           existing.orderId = orderId;
                           existing.dateAssigned = assign.assigned_date || '—';
                           existing.deliveryTargetDate = assign.target_finish_date || '—';
                           existing.status = assign.status;
                           existing.speciality = assign.speciality || 'Editor';
                           existing.eventName = order?.event_type || order?.custom_event_name || 'Project';
                           existing.latestAssignmentTime = assignTime;
                           existing.assignmentId = assign.assignment_id;
                        }
                      }
                    });
                    
                    const rosterRows = Array.from(groupedRoster.values());

                    // Filter roster rows by search query and status dropdown
                    const filteredRosterRows = rosterRows.filter(row => {
                      const searchLower = rosterSearch.toLowerCase();
                      const matchesSearch = !rosterSearch || 
                        row.staffName.toLowerCase().includes(searchLower) ||
                        row.orderId.toLowerCase().includes(searchLower) ||
                        row.speciality.toLowerCase().includes(searchLower) ||
                        row.eventName.toLowerCase().includes(searchLower);

                      const matchesStatus = rosterStatusFilter === 'All' || 
                        row.status.toLowerCase() === rosterStatusFilter.toLowerCase();

                      return matchesSearch && matchesStatus;
                    });

                    // Sort: Latest assigned staff at the top (descending by date/ID)
                    const sortedRosterRows = [...filteredRosterRows].sort((a, b) => {
                      const dateA = a.dateAssigned !== '—' ? new Date(a.dateAssigned).getTime() : 0;
                      const dateB = b.dateAssigned !== '—' ? new Date(b.dateAssigned).getTime() : 0;
                      if (dateA !== dateB) return dateB - dateA;
                      return String(b.assignmentId).localeCompare(String(a.assignmentId));
                    });

                    if (sortedRosterRows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 font-mono text-xs">
                            No matching roster entries found.
                          </td>
                        </tr>
                      );
                    }

                    return sortedRosterRows.map((row) => {
                      return (
                        <tr key={`assign-${row.assignmentId}`} className="hover:bg-zinc-900/30 transition-colors">
                          {/* Staff Name */}
                          <td className="px-4 py-3 font-medium text-white">
                            <div className="flex flex-col">
                              <span>{row.staffName}</span>
                              <span className="text-[9px] text-zinc-550 font-mono">{row.speciality}</span>
                            </div>
                          </td>

                          {/* Order ID */}
                          <td className="px-4 py-3 font-mono text-xs font-bold text-violet-400">
                            {row.orderId}
                          </td>

                          {/* Assigned Tasks */}
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedStaffForTasks(row.staffName)}
                              className="text-xs font-bold text-amber-400 hover:text-amber-300 font-mono underline cursor-pointer w-full text-left"
                            >
                              {row.assignedTasks}
                            </button>
                          </td>

                          {/* Date Assigned */}
                          <td className="px-4 py-3 font-mono text-[10px] text-zinc-400">
                            {row.dateAssigned}
                          </td>

                          {/* Delivery Target Date */}
                          <td className="px-4 py-3 font-mono text-[10px] text-zinc-400">
                            {row.deliveryTargetDate}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider ${
                              row.status === 'Completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                : row.status === 'Revision'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                            }`}>
                              {row.status}
                            </span>
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

      {/* EDITING TRACKER TAB (KANBAN) */}
      {activeSubTab === 'tracker' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            
            {/* Columns representing different stages */}
            {[
              { id: 'Pending', name: 'Pending Review / Ingest' },
              { id: 'Editing', name: 'Editing In Progress' },
              { id: 'Customer Review', name: 'Under Review' },
              { id: 'Revision Required', name: 'Revision Needed' },
              { id: 'Approved', name: 'Approved' }
            ].map(col => {
              const colProds = (production || []).filter(p => {
                // Map logical status fallback helper
                if (col.id === 'Pending') return p.editing_status === 'Pending' || p.editing_status === 'Raw Footage Received' || p.editing_status === 'Editor Assigned' || p.editing_status === 'Verified Footage' || p.editing_status === 'Footage Handover Verified';
                if (col.id === 'Editing') return p.editing_status === 'Editing' || p.editing_status === 'Editing Started' || p.editing_status === 'Editing In Progress';
                if (col.id === 'Customer Review') return p.editing_status === 'Customer Review' || p.editing_status === 'Internal QC Review' || p.editing_status === 'Client Review Sent';
                if (col.id === 'Revision Required') return p.editing_status === 'Revision Required' || p.editing_status === 'Revision In Progress';
                if (col.id === 'Approved') return p.editing_status === 'Approved' || p.editing_status === 'Final Approval';
                return p.editing_status === col.id;
              });

              return (
                <div key={col.id} className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl flex flex-col h-[500px]">
                  <div className="pb-3 border-b border-zinc-900 mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black font-mono tracking-widest text-zinc-400 uppercase leading-snug">{col.name}</span>
                    <span className="font-mono text-xs bg-zinc-900 p-1 px-2 rounded-md font-bold text-violet-400">{colProds.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3.5 py-1">
                    {colProds.map(prod => (
                      <div key={prod.production_id} className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-xl space-y-2 text-left hover:border-zinc-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono text-violet-400 font-bold">{prod.production_id}</span>
                          <span className="text-[8px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-500">{prod.expected_delivery_date}</span>
                        </div>
                        
                        <div className="text-xs font-bold text-white leading-tight">Editor: {prod.editor_assigned || 'Unassigned'}</div>
                        <p className="text-[10px] text-zinc-450 line-clamp-1">{prod.remarks || 'No notes currentlylogged.'}</p>
                        
                        {canEdit && (
                          <div className="pt-2 border-t border-zinc-900 flex justify-between items-center">
                            <button
                              onClick={() => handleSelectProd(prod)}
                              className="text-[9px] font-mono text-zinc-450 hover:text-white uppercase font-bold"
                            >
                              Edit Details
                            </button>
                            
                            {/* Fast progress trigger */}
                            <button
                              onClick={() => {
                                let nextStage: EditingStatus = 'Editing In Progress';
                                const cur = prod.editing_status;
                                if (cur === 'Raw Footage Received') nextStage = 'Editor Assigned';
                                else if (cur === 'Editor Assigned') nextStage = 'Editing Started';
                                else if (cur === 'Editing Started') nextStage = 'Editing In Progress';
                                else if (cur === 'Editing In Progress') nextStage = 'Internal QC Review';
                                else if (cur === 'Internal QC Review') nextStage = 'Client Review Sent';
                                { /* Skip Revision Required, handled by standard action buttons workflow */ }
                                if (cur === 'Client Review Sent') nextStage = 'Final Approval';
                                else if (cur === 'Revision Required') nextStage = 'Revision In Progress';
                                else if (cur === 'Revision In Progress') nextStage = 'Final Approval';
                                else if (cur === 'Final Approval') nextStage = 'Project Completed';
                                else nextStage = cur;
                                
                                if (!isProjectLocked(prod.editing_status)) {
                                  updateProduction(prod.production_id, { editing_status: nextStage });
                                }
                              }}
                              disabled={isProjectLocked(prod.editing_status)}
                              className="text-[9px] font-mono text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1 uppercase"
                            >
                              <span>Next</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {colProds.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-700 text-[10px] font-mono uppercase tracking-wider text-center py-24">
                        <span>Pristine Stage</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      )}

      {/* DELIVERIES MANAGEMENT TAB */}
      {activeSubTab === 'delivery' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Metrics summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">RD</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Ready for Delivery</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {(production || []).filter(p => p.editing_status === 'Approved').length}
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Client authorized and approved</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">DF</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Delivered Projects</div>
              <div className="text-2xl font-black text-indigo-400 font-mono mt-1">
                {(production || []).filter(p => p.editing_status === 'Delivered').length}
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Closed & archived dispatch packages</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">PD</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">In Production Pipeline</div>
              <div className="text-2xl font-black text-amber-500 font-mono mt-1">
                {(production || []).filter(p => p.editing_status !== 'Approved' && p.editing_status !== 'Delivered').length}
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Currently undergoing processing</p>
            </div>

          </div>

          {/* Table display */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
            <h3 className="text-xs font-black text-zinc-350 uppercase tracking-[0.2em] border-b border-zinc-900 pb-3 font-mono">
              MASTER RELEASE DISPATCH CONSOLE
            </h3>
            
            <div className="mt-6 space-y-4">
              {(production || []).map(prod => {
                const isApproved = prod.editing_status === 'Approved';
                const isDelivered = prod.editing_status === 'Delivered';

                return (
                  <div key={prod.production_id} className="bg-[#030303] border border-zinc-900 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          {prod.production_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                          isDelivered ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : isApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {prod.editing_status}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-300 mt-1.5">
                        Editor Assigned: <strong className="text-zinc-200">{prod.editor_assigned || 'Unassigned'}</strong> — Deliverables: 
                        <span className="text-violet-400 font-mono text-[11px] ml-1 select-all">{prod.raw_footage_location || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isApproved && canEdit && (
                        <button
                          onClick={() => {
                            markDelivered(prod.tracking_id, 'Approved and Delivered via Photo Crew ERP Vault.');
                            alert('Dispatch completed successfully! Released tracking ID.');
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-black font-black uppercase text-[10px] font-mono tracking-wider rounded-xl cursor-pointer shadow-lg"
                        >
                          Ship & Deliver to Client
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleSelectProd(prod)}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase rounded-xl cursor-pointer font-bold"
                      >
                        Launch Panel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RESOURCES AVAILABILITY TAB */}
      {activeSubTab === 'resources' && (
        <div className="space-y-6">
          
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-350 border-b border-zinc-900 pb-3 font-mono flex items-center justify-between">
              <span>CREW TEAM LOAD ANALYZER & FREELANCE CAPACITY</span>
              <span className="text-[10px] font-mono text-zinc-500">LIVE WORKLOAD FACTORS</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {(productionStaff || []).map(member => {
                const memberNameClean = member.name || 'Unnamed Editor';
                const wl = getStaffWorkload(memberNameClean);
                const activeJobs = (production || []).filter(p => 
                  p.editor_assigned?.toLowerCase() === memberNameClean.toLowerCase() && 
                  p.editing_status !== 'Delivered'
                );
                
                // Color grades based on busy factors
                let loadStatusText = 'AVAILABLE';
                let flagColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                
                if (member.status === 'Inactive') {
                  loadStatusText = 'OFFLINE';
                  flagColor = 'bg-zinc-900 text-zinc-550 border border-zinc-850';
                } else if (wl.activeCount >= 3) {
                  loadStatusText = 'OVERLOAD';
                  flagColor = 'bg-rose-500/15 text-rose-455 border border-rose-500/25 animate-pulse';
                } else if (wl.activeCount >= 1) {
                  loadStatusText = 'ACTIVE LOAD';
                  flagColor = 'bg-amber-500/15 text-amber-440 border border-amber-500/25';
                }

                return (
                  <div key={member.staff_id} className="bg-[#030303] border border-zinc-900 p-5 rounded-2xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-650/20 border border-violet-900/30 flex items-center justify-center font-black text-violet-400 font-mono select-none">
                          {memberNameClean.split(' ').map(n=> n ? n[0] : '').join('')}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-white">{memberNameClean}</div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{member.role}</div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black ${flagColor}`}>
                        {loadStatusText}
                      </span>
                    </div>

                    {/* Assigned projects listing */}
                    <div className="space-y-2 pt-3 border-t border-zinc-900">
                      <div className="text-[9px] font-mono text-zinc-550 uppercase font-black">Active Assignments ({wl.activeCount})</div>
                      {activeJobs.map(job => (
                        <div key={job.production_id} className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-900 flex justify-between items-center text-[11px] font-mono">
                          <span className="text-zinc-300 font-bold">{job.production_id}</span>
                          <span className="text-[9px] font-black uppercase text-violet-400">{job.editing_status}</span>
                        </div>
                      ))}
                      {activeJobs.length === 0 && (
                        <div className="text-[10px] text-zinc-650 font-mono uppercase italic py-2">No current job queues assigned.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ANALYTICS WORKSPACE TAB */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Key Stat Blocks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Average Turnaround Time</div>
              <div className="text-2xl font-black text-white font-mono mt-1">4.5 Days</div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Shoot ingest to release approval</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Client Approval Rate</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">94.8%</div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">First-draft approvals</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Editor Capacity Used</div>
              <div className="text-2xl font-black text-violet-400 font-mono mt-1">62.5%</div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Active rosters load index</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">On-Time delivery rate</div>
              <div className="text-2xl font-black text-sky-400 font-mono mt-1">98.2%</div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Against expected benchmarks</p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Editor performance graph bar chart using recharts */}
            <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest border-b border-zinc-900 pb-3 font-mono flex items-center justify-between">
                <span>Editor Throughput Metrics</span>
                <span className="text-[9px] text-zinc-550 uppercase">Completed vs assigned</span>
              </h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={staff.map(s => {
                      const wl = getStaffWorkload(s.name);
                      return {
                        name: s.name.split(' ')[0],
                        Active: wl.activeCount,
                        Completed: wl.completedCount
                      };
                    })}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="name" stroke="#71717a" fontSize={10} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#71717a" fontSize={10} fontFamily="JetBrains Mono" />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                    <Bar dataKey="Active" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pipeline Stage distribution */}
            <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest border-b border-zinc-900 pb-3 font-mono flex items-center justify-between">
                <span>Workflow Stage breakdown</span>
                <span className="text-[9px] text-zinc-550 uppercase">Active tracking ratios</span>
              </h3>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pending', value: statPendingVideo, color: '#f59e0b' },
                        { name: 'Editing Started', value: statEditingVideo, color: '#38bdf8' },
                        { name: 'Customer Review', value: statReviewVideo, color: '#a855f7' },
                        { name: 'Approved', value: statApprovedVideo, color: '#10b981' }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {[{ name: 'Pending', value: statPendingVideo, color: '#f59e0b' },
                        { name: 'Editing Started', value: statEditingVideo, color: '#38bdf8' },
                        { name: 'Customer Review', value: statReviewVideo, color: '#a855f7' },
                        { name: 'Approved', value: statApprovedVideo, color: '#10b981' }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#a1a1aa' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* POPUP SELECTION TRIGGER BOARD MODAL (Responsive, fits mobiles flawlessly) */}
      {selectedProdId && (
        <div id="production_details_mobile_modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
            
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/60 sticky top-0 z-10 backdrop-blur-md">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Layers className="w-4 h-4 text-violet-400" />
                <span>Process Editing Pipeline</span>
              </h3>
              <button 
                onClick={() => setSelectedProdId(null)}
                className="px-3 py-1 bg-zinc-905 hover:bg-zinc-900 text-zinc-450 hover:text-white text-xs rounded-xl transition-all cursor-pointer border border-zinc-850 font-mono"
              >
                Close
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs font-sans text-left">
              {(() => {
                const prodItem = (production || []).find((p) => p.production_id === selectedProdId)!;
                const currentCanEdit = canEdit && !isProjectLocked(prodItem.editing_status);
                if (!prodItem) return null;
                const rawFootageItem = (rawFootage || []).find((rf) => rf.tracking_id === prodItem.tracking_id);
                const linkedOrder = rawFootageItem ? (orders || []).find((o) => o.order_id === rawFootageItem.order_id) : undefined;
                const isPendingFootageAudit = linkedOrder?.current_stage === 'Event Completed';
                return (
                  <div className="space-y-4">
                    {linkedOrder && (
                      <div className="bg-[#030303] p-3 rounded-xl border border-zinc-900 flex justify-between items-center flex-wrap gap-2">
                        <span className="text-[12px] font-black text-white">{linkedOrder.customer_name} &bull; {linkedOrder.package_name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProdId(null);
                            setMasterOrderIdForDetail(linkedOrder.order_id);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-amber-400 hover:text-amber-300 font-mono tracking-wider flex items-center gap-1 cursor-pointer bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded-lg hover:bg-amber-500/25 transition-all w-fit"
                        >
                          📋 VIEW SEAMLESS WORKFLOW DOSSIER
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-mono font-bold bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800">
                        {prodItem.production_id}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Tracking Ref: {prodItem.tracking_id}
                      </span>
                    </div>

                    {/* S3 Storage location */}
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-850 space-y-1.5">
                      <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block tracking-wider">
                        Raw Footage Cloud Directory
                      </span>
                      <strong className="text-xs font-mono text-zinc-350 break-all select-all font-medium block">
                        {prodItem.raw_footage_location || 'No raw directory found.'}
                      </strong>
                    </div>

                    {isPendingFootageAudit && (
                      <div className="p-4 bg-violet-500/15 border border-violet-500/25 rounded-2xl space-y-3">
                        <div className="flex items-start gap-4">
                          <span className="text-base mt-0.5">📩</span>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-violet-300 font-mono tracking-widest uppercase">Awaiting Ingest & Audit</h4>
                            <p className="text-[11.5px] text-zinc-400 leading-relaxed font-sans">
                              The Operations Team has completed the on-site shoot and uploaded raw camera directories. Please review folder files to proceed to post-production timelines.
                            </p>
                          </div>
                        </div>

                        {currentCanEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              acceptRawFootage(prodItem.tracking_id);
                              alert("Raw footage audited and accepted in secure directory! Stage transitioned.");
                            }}
                            className="w-full flex items-center justify-center py-2.5 bg-gradient-to-r from-violet-600 to-indigo-650 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow transition-all"
                          >
                            Verify & Accept Raw Footage Folder
                          </button>
                        )}
                      </div>
                    )}

                    {/* Updates Form */}
                    <form onSubmit={handleUpdate} className="space-y-4">
                      <fieldset disabled={!currentCanEdit} className="space-y-4">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                          
                          {/* Editor Assigned selection dropdown matching active roster staff */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Editor Assigned
                            </label>
                            <select
                              value={editor}
                              onChange={(e) => setEditor(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                            >
                              <option value="">Unassigned</option>
                              {(productionStaff || []).filter(s => s.status === 'Active').map(s => (
                                <option key={s.staff_id} value={s.name}>{s.name} ({s.role.split(' ')[0]})</option>
                              ))}
                            </select>
                          </div>

                          {/* Status dropdown */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Editing State
                            </label>
                            <select
                              value={status}
                              onChange={(e) => setStatus(e.target.value as EditingStatus)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-black border-l-2 border-violet-500"
                            >
                              
                              <option value="Assigned Editor">Assigned Editor</option>
<option value="Editing Started">Editing Started</option>
<option value="Customer Review">Customer Review</option>
<option value="Editing Completed">Editing Completed</option>
<option value="Client Acceptance">Client Acceptance</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Editing Start Date
                            </label>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                            />
                          </div>

                          {/* Expected date */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Expected Delivery Date
                            </label>
                            <input
                              type="date"
                              value={expectedDate}
                              onChange={(e) => setExpectedDate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                            />
                          </div>

                          {/* Review Status */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Customer Review Feedback State
                            </label>
                            <select
                              value={reviewStatus}
                              onChange={(e) => setReviewStatus(e.target.value as any)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                            >
                              <option value="None">No feedback logged</option>
                              <option value="Pending Review">Pending Review</option>
                              <option value="Feedback Given">Feedback Given</option>
                              <option value="Approved">Approved</option>
                            </select>
                          </div>

                        </div>

                        {/* Remarks */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                            Remarks / Client Comments
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Log revision requests, requested aspect ratios, color presets details, or delivery modes."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          ></textarea>
                        </div>

                        {/* Assigned Staff Details and WhatsApp Integration */}
                        {(() => {
                          const assignedStaffRecord = (productionStaff || []).find(s => s.name.toLowerCase() === editor.toLowerCase());
                          if (assignedStaffRecord) {
                            const handleSendWhatsApp = () => {
                              const pName = linkedOrder?.package_name || 'Event Post-Production';
                              const dDate = expectedDate || 'Not set yet';
                              const rawLocation = prodItem.raw_footage_location || 'Not provided';
                              const details = notes || 'No special remarks recorded.';
                              
                              const textMessage = `*PROJECT ASSIGNMENT DETAILED BRIEF*\n` +
                                                  `---------------------------------\n` +
                                                  `*Project Name:* ${pName}\n` +
                                                  `*Due Date:* ${dDate}\n` +
                                                  `*Footage Directory:* ${rawLocation}\n` +
                                                  `*Task Details:* ${details}\n\n` +
                                                  `Please update your VFX Post-Production pipeline state. Thanks!`;
                              
                              const encodedMsg = encodeURIComponent(textMessage);
                              const cleanPhone = assignedStaffRecord.mobile.replace(/\D/g, '');
                              const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
                              window.open(waUrl, '_blank');
                            };

                            return (
                              <div className="p-4 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-400 font-mono">
                                  Assigned Staff Communication Status
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left text-zinc-300">
                                  <div>
                                    <span className="text-[9px] text-zinc-500 font-mono block">STAFF NAME</span>
                                    <span className="text-xs font-bold text-white block mt-0.5">{assignedStaffRecord.name}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-zinc-500 font-mono block">PRODUCTION ROLE</span>
                                    <span className="text-xs font-bold text-white block mt-0.5">{assignedStaffRecord.role}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-zinc-500 font-mono block">MOBILE</span>
                                    <span className="text-xs font-bold text-white block mt-0.5">{assignedStaffRecord.mobile}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-zinc-500 font-mono block">WHATSAPP</span>
                                    <span className="text-xs font-bold text-white block mt-0.5">{assignedStaffRecord.mobile}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleSendWhatsApp}
                                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl cursor-pointer border border-emerald-500/20 transition-all font-mono uppercase tracking-wider mt-2"
                                >
                                  <span>Send WhatsApp Task Details</span>
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })()}

                      </fieldset>

                      {/* Form submit */}
                      {currentCanEdit && (
                        <div className="flex justify-end gap-2 border-t border-zinc-900 pt-4">
                          <button
                            type="button"
                            onClick={() => setSelectedProdId(null)}
                            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-450 hover:text-white text-xs rounded-xl transition-all cursor-pointer border border-zinc-800 font-mono"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-650 text-white font-bold rounded-xl cursor-pointer transition-all uppercase text-[10px] tracking-wider"
                          >
                            Save Pipeline State
                          </button>
                        </div>
                      )}
                    </form>

                    {/* Mark Delivered Trigger Button */}
                    {currentCanEdit && (
                      <div className="border-t border-zinc-900 pt-5 space-y-3">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-xs font-black text-white flex items-center gap-1 font-mono uppercase tracking-wider">
                            <Truck className="w-4 h-4 text-emerald-400" />
                            <span>Release Action: Mark Delivered to Customer</span>
                          </h4>
                          <p className="text-[11px] text-zinc-450 leading-relaxed font-sans">
                            Instantly flags the final customer portal payload stage to **"Delivered"**, writes dispatch locks, and updates pipeline trackers.
                          </p>
                        </div>

                        <button
                          type="button"
                          id="btn_mark_delivered_mobile"
                          disabled={isProjectLocked(prodItem.editing_status)}
                          onClick={handleMarkDelivered}
                          className={`w-full flex items-center justify-center gap-2 font-black uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg text-[11px] transition-all cursor-pointer ${
                            isProjectLocked(prodItem.editing_status)
                              ? 'bg-zinc-900 text-zinc-500 border border-zinc-850 cursor-not-allowed shadow-none font-mono'
                              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-black'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isProjectLocked(prodItem.editing_status) 
                              ? 'PROJECT DELIVERED & SHIPPED' 
                              : 'MARK DELIVERED TO CLIENT'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            
          </div>
        </div>
      )}

        </div> {/* closes MAIN ACTIVE CONTENT VIEWPORTS */}
      </div> {/* closes full width container */}

      {/* 1. PROJECT DETAILS POPUP MODAL */}
      {selectedLeadProd && (() => {
        const { order, lead } = resolveOrderAndLead(selectedLeadProd);
        if (!order) return null;

        const projectLogs = (logs || []).filter(log => 
          log.record_id === selectedLeadProd.production_id ||
          log.record_id === selectedLeadProd.tracking_id ||
          log.record_id === order?.order_id
        );

        // Load payments info
        const payment = (payments || []).find(p => p.order_id === order?.order_id);
        const totalAmount = order.quotation_amount || 0;
        const advanceReceived = payment?.advance_received !== undefined ? payment.advance_received : (payment?.advance_paid || 0);
        const balanceDue = payment?.balance_due !== undefined ? payment.balance_due : (totalAmount - advanceReceived);

        // Handle Save
        const handleSaveLeadDossier = async (e: React.FormEvent) => {
          e.preventDefault();

          if (!leadTargetDeliveryDate) {
            setDossierError('Please select the Target Delivery Date before saving.');
            return;
          }
          setDossierError('');
          setDossierSuccessMessage('');
          setIsSavingDossier(true);
          
          try {
            let mainStatus: EditingStatus = 'Raw Footage Received';
            if (leadProdStatus === 'Pending' || leadProdStatus === 'Raw Footage Received') mainStatus = 'Raw Footage Received';
            else if (leadProdStatus === 'Editor Assigned') mainStatus = 'Editor Assigned';
            else if (leadProdStatus === 'Editing Started') mainStatus = 'Editing Started';
            else if (leadProdStatus === 'Editing' || leadProdStatus === 'In Progress' || leadProdStatus === 'Editing In Progress') mainStatus = 'Editing In Progress';
            else if (leadProdStatus === 'Internal QC Review') mainStatus = 'Internal QC Review';
            else if (leadProdStatus === 'Customer Review' || leadProdStatus === 'Client Review Sent') mainStatus = 'Client Review Sent';
            else if (leadProdStatus === 'Revision Required') mainStatus = 'Revision Required';
            else if (leadProdStatus === 'Revision In Progress') mainStatus = 'Revision In Progress';
            else if (leadProdStatus === 'Approved' || leadProdStatus === 'Final Approval') mainStatus = 'Final Approval';
            else if (leadProdStatus === 'Delivered' || leadProdStatus === 'Project Delivered') mainStatus = 'Project Delivered';
            else if (leadProdStatus === 'Closed' || leadProdStatus === 'Completed' || leadProdStatus === 'Project Closed') mainStatus = 'Completed';

            await updateProduction(selectedLeadProd.production_id, {
              editor_assigned: leadEditor,
              assigned_staff: leadStaff.join(', '),
              project_priority: leadPriority,
              raw_footage_status: leadFootageStatus,
              production_status: leadProdStatus,
              editing_status: mainStatus,
              remarks: leadRemarks,
              editing_start_date: leadStartDate || undefined,
              target_delivery_date: leadTargetDeliveryDate || undefined,
              expected_delivery_date: leadExpectedDeliveryDate || undefined,
              delivery_date: leadActualDeliveryDate || undefined,
              raw_footage_received_date: leadRawFootageDate || undefined,
              client_review_upload_date: leadClientReviewDate || undefined,
              client_approval_date: leadClientApprovalDate || undefined,
            });

            setDossierSuccessMessage('ERP Master Dossier has been successfully saved!');
            
            // Scroll to the success message
            setTimeout(() => {
              const successEl = document.getElementById('dossier-success-container');
              if (successEl) {
                successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);

          } catch (err: any) {
            setDossierError(err?.message || 'Failed to save dossier settings.');
          } finally {
            setIsSavingDossier(false);
          }
        };


        
        const formatDate = (dateStr: string) => {
          if (!dateStr) return 'Pending';
          return formatDateDDMMYY(dateStr) || dateStr;
        };
        const formattedFootageReceived = selectedLeadProd.raw_footage_received_date ? formatDate(selectedLeadProd.raw_footage_received_date) : 'Pending';
        const formattedEditingStarted = selectedLeadProd.editing_started_date ? formatDate(selectedLeadProd.editing_started_date) : 'Pending';
        const formattedReviewUploaded = selectedLeadProd.review_uploaded_date ? formatDate(selectedLeadProd.review_uploaded_date) : 'Pending';
        const formattedApprovalDate = selectedLeadProd.client_approval_date ? formatDate(selectedLeadProd.client_approval_date) : 'Pending';
        const formattedHandoverDate = selectedLeadProd.delivery_date ? formatDate(selectedLeadProd.delivery_date) : 'Pending';

        // Resolve customer details
        const customerName = order?.customer_name || lead?.customer_name || '—';
        const customerMobile = order?.mobile || lead?.mobile || '—';
        const customerWhatsApp = order.whatsapp_number || lead?.whatsapp_number || customerMobile || '—';

        // Resolve Event Scheduled details
        const eventList = lead?.events && lead.events.length > 0 
          ? lead.events 
          : [{
              event_name: order.custom_event_name || lead?.custom_event_name || order?.event_type || lead?.event_type || 'Event',
              event_date: order?.event_date || lead?.event_date || '—',
              event_start_time: order.event_time || lead?.event_time || '—'
            }];

        // Resolve Deliverables and assigned staff
        let parsedDeliverables: string[] = [];
        let deliverablesText = order?.deliverables_description || lead?.deliverables_description || '';

        if (!deliverablesText && lead) {
          const targetLeadQuotations = quotations?.filter((q: any) => q.lead_id === lead.lead_id) || [];
          targetLeadQuotations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const targetLatestQuote = targetLeadQuotations[0];
          if (targetLatestQuote) {
            deliverablesText = targetLatestQuote.deliverables_description || '';
          }
        }

        parsedDeliverables = parseExactDeliverables(deliverablesText, selectedLeadProd.custom_event_name, selectedLeadProd.event_id);

        const linkedAssignments = (editorAssignments || []).filter(a => a.production_id === selectedLeadProd.production_id && (!a.event_id || !selectedLeadProd.event_id || a.event_id === selectedLeadProd.event_id));
        const assignedDeliverables = Array.from(new Set(linkedAssignments.map(a => a.speciality).filter(Boolean))) as string[];
        const allLeadDeliverables = Array.from(new Set([...parsedDeliverables, ...assignedDeliverables]));

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 z-50 animate-fade-in text-zinc-105 select-none md:select-text">
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-4.5 space-y-4 relative text-left">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[9px] font-mono tracking-widest uppercase rounded font-black">Project Dossier</span>
                    <span>Order Ref: {order?.order_id}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">
                    PRODUCTION MANAGER CONTROL DECK • SERIAL {selectedLeadProd.production_id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLeadProd(null)}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer font-bold text-xs"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleSaveLeadDossier} className="space-y-4">
                
                {/* 2x2 grid layout inside popup */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* LEFT: CUSTOMER DETAILS & PAYMENT */}
                  <div className="space-y-3">
                    
                    {/* CUSTOMER BOARD */}
                    <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-2xl space-y-2.5">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-400 font-mono flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-violet-400" />
                        <span>CUSTOMER & PACKAGE DOSSIER</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-400">
                        <div>
                          <span className="text-[9px] text-zinc-550 font-mono block">CUSTOMER NAME</span>
                          <span className="text-zinc-205 font-bold block mt-0.5 text-zinc-300">{order?.customer_name}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-550 font-mono block">MOBILE NUMBER</span>
                          <span className="text-zinc-205 font-bold block mt-0.5 text-zinc-300">{order?.mobile || 'None logged'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-555 font-mono block">CONTRACT TYPE</span>
                          <span className="text-zinc-205 font-bold block mt-0.5 text-zinc-300">{order?.event_type}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-555 font-mono block">EVENT SCHEDULED</span>
                          <span className="text-zinc-205 font-bold block mt-0.5 font-mono text-zinc-300">{order?.event_date}</span>
                        </div>
                      </div>
                    </div>

                    {/* FINANCIAL LEDGER */}
                    {currentRole !== 'Production Team' && (
                      <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-2xl space-y-2.5">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400 font-mono flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-indigo-400" />
                          <span>FINANCIAL LEDGER STATEMENT</span>
                        </h4>
                        <div className="grid grid-cols-3 gap-2.5 text-center">
                          <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                            <span className="text-[8px] text-zinc-500 font-mono block">TOTAL AMOUNT</span>
                            <span className="text-[11px] font-bold text-zinc-300 block mt-0.5">{formatINR(totalAmount)}</span>
                          </div>
                          <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                            <span className="text-[8px] text-zinc-500 font-mono block">ADVANCE PAID</span>
                            <span className="text-[11px] font-bold text-emerald-400 block mt-0.5">{formatINR(advanceReceived)}</span>
                          </div>
                          <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                            <span className="text-[8px] text-zinc-500 font-mono block">BALANCE DUE</span>
                            <span className={`text-[11px] font-bold block mt-0.5 ${balanceDue > 0 ? 'text-amber-400' : 'text-green-400'}`}>{formatINR(balanceDue)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TIMELINE STATEMENT LOGS */}
                    <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-2xl space-y-2.5">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-400 font-mono flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span>INTER-DEPARTMENT TIMELINE LEDGER</span>
                      </h4>
                      <div className="space-y-2 text-xs text-zinc-400">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                          <span className="text-[9px] text-zinc-500 font-mono">1. Raw Footage Received Date</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            formattedFootageReceived === 'Pending' 
                              ? 'text-amber-500/90 bg-amber-500/5 border-amber-500/10' 
                              : 'text-zinc-300 bg-zinc-950 border-zinc-900'
                          }`}>
                            {formattedFootageReceived}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                          <span className="text-[9px] text-zinc-500 font-mono">2. Editing Started Date</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            formattedEditingStarted === 'Pending' 
                              ? 'text-amber-500/90 bg-amber-500/5 border-amber-500/10' 
                              : 'text-zinc-300 bg-zinc-950 border-zinc-900'
                          }`}>
                            {formattedEditingStarted}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                          <span className="text-[9px] text-zinc-500 font-mono">3. Client Review Upload Date</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            formattedReviewUploaded === 'Pending' 
                              ? 'text-amber-500/90 bg-amber-500/5 border-amber-500/10' 
                              : 'text-zinc-300 bg-zinc-950 border-zinc-900'
                          }`}>
                            {formattedReviewUploaded}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                          <span className="text-[9px] text-zinc-500 font-mono">4. Client Approval Date</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            formattedApprovalDate === 'Pending' 
                              ? 'text-amber-500/90 bg-amber-500/5 border-amber-500/10' 
                              : 'text-zinc-300 bg-zinc-950 border-zinc-900'
                          }`}>
                            {formattedApprovalDate}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-zinc-500 font-mono">5. Handover / Delivery Date</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            formattedHandoverDate === 'Pending' 
                              ? 'text-amber-500/90 bg-amber-500/5 border-amber-500/10' 
                              : 'text-zinc-300 bg-zinc-950 border-zinc-900'
                          }`}>
                            {formattedHandoverDate}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT: EDITABLE PRODUCTION FIELDS */}
                  <div className="space-y-3.5 text-left">
                    
                    <fieldset className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-2xl space-y-2.5">
                      <legend className="px-2 text-[10px] font-black uppercase tracking-[0.15em] text-violet-400 font-mono flex items-center gap-1.5">
                        <span>EDIT DOSSIER SPECIFICATIONS</span>
                      </legend>
 
                      {/* Step 1: Select Production Role */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-[#d97706] mb-1 font-mono">
                          Step 1: Select Production Role Type
                        </label>
                        <select
                          value={assignRoleFilter}
                          onChange={(e) => setAssignRoleFilter(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-1.5 px-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        >
                          <option value="">Select Specialty / Production Role...</option>
                          {allRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>

                      {/* Step 2: Available Staff Directory matching Role */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-violet-400 mb-1 font-mono">
                          Step 2: Available Staff
                        </label>
                        {assignRoleFilter === "" ? (
                          <div className="p-3 bg-zinc-900/30 border border-zinc-850/60 rounded-xl text-center text-[10px] text-zinc-550 font-mono">
                            Please select a Production Role above to view available specialists.
                          </div>
                        ) : (() => {
                          const matchingStaff = (productionStaff || []).filter(s => 
                            s.status === 'Active' && 
                            (s.production_role_speciality === assignRoleFilter || s.role === assignRoleFilter)
                          );

                          if (matchingStaff.length === 0) {
                            return (
                              <div className="p-3 bg-zinc-900/50 border border-zinc-855 rounded-xl text-center text-xs text-zinc-500 font-mono">
                                No active specialists found registered as "{assignRoleFilter}".
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                              {matchingStaff.map(s => {
                                const isLead = leadEditor === s.name;
                                const isColl = leadStaff.includes(s.name);
                                const workload = getStaffWorkload(s.name);

                                return (
                                  <div 
                                    key={s.staff_id} 
                                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                                      isLead 
                                        ? 'bg-violet-950/20 border-violet-500/50 shadow-md shadow-violet-500/5' 
                                        : isColl 
                                          ? 'bg-zinc-900 border-indigo-500/40' 
                                          : 'bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-white text-xs">{s.name}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">({s.employee_id})</span>
                                      </div>
                                      <div className="text-[9px] text-zinc-550 font-mono mt-0.5">
                                        Active Jobs: {workload.activeCount} • Contact: {s.mobile}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {/* Single Selection Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isLead) {
                                            setLeadEditor('Unassigned');
                                          } else {
                                            setLeadEditor(s.name);
                                            setLeadStaff(prev => prev.filter(name => name !== s.name));
                                          }
                                        }}
                                        className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg font-mono transition duration-150 cursor-pointer ${
                                          isLead 
                                            ? 'bg-violet-650 text-white' 
                                            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-850'
                                        }`}
                                      >
                                        {isLead ? '✓ Lead' : 'Set Lead'}
                                      </button>

                                      {/* Multiple Selection Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isColl) {
                                            setLeadStaff(prev => prev.filter(name => name !== s.name));
                                          } else {
                                            setLeadStaff(prev => [...prev, s.name]);
                                            if (isLead) setLeadEditor('Unassigned');
                                          }
                                        }}
                                        className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg font-mono transition duration-150 cursor-pointer ${
                                          isColl 
                                            ? 'bg-indigo-650 text-white' 
                                            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-850'
                                        }`}
                                      >
                                        {isColl ? '✓ Crew' : 'Add Crew'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Unified Selection Summary Section */}
                      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-1.5 font-mono text-[11px] text-zinc-400">
                        <div>
                          <span className="text-zinc-550 uppercase text-[9px] font-black block">Primary Lead Editor:</span>
                          <span className={`font-bold ${leadEditor !== 'Unassigned' && leadEditor !== '' ? 'text-amber-450' : 'text-zinc-500'}`}>
                            {leadEditor || 'Unassigned'}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-550 uppercase text-[9px] font-black block mt-0.5">Assigned Crew (Multiple):</span>
                          <span className={leadStaff.length > 0 ? 'text-indigo-400 font-bold' : 'text-zinc-650'}>
                            {leadStaff.length > 0 ? leadStaff.join(', ') : 'None allocated'}
                          </span>
                        </div>
                      </div>

                      {/* 2-column fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        
                        {/* Production Status */}
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Production Status
                          </label>
                          <select
                            value={leadProdStatus}
                            onChange={(e) => setLeadProdStatus(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs font-black text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                          >
                            
                            <option value="Assigned Editor">Assigned Editor</option>
<option value="Editing Started">Editing Started</option>
<option value="Customer Review">Customer Review</option>
<option value="Editing Completed">Editing Completed</option>
<option value="Client Acceptance">Client Acceptance</option>
                          </select>
                        </div>

                        {/* Project Priority */}
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Priority Level
                          </label>
                          <select
                            value={leadPriority}
                            onChange={(e) => setLeadPriority(e.target.value as any)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>

                      </div>

                      {/* Target dates */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono font-black">
                            Editing Start Date
                          </label>
                          <input
                            type="date"
                            value={leadStartDate}
                            onChange={(e) => setLeadStartDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono rounded-xl py-2 px-3 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono font-black">
                            Target Delivery Date
                          </label>
                          <input
                            type="date"
                            value={leadTargetDeliveryDate}
                            onChange={(e) => {
                              setLeadTargetDeliveryDate(e.target.value);
                              if (e.target.value) setDossierError('');
                            }}
                            className={`w-full bg-zinc-900 border text-xs text-zinc-100 font-mono rounded-xl py-2 px-3 focus:outline-none transition-all ${
                              dossierError ? 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30' : 'border-zinc-800 focus:border-violet-500/50'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono font-black">
                            Expected Delivery Date
                          </label>
                          <input
                            type="date"
                            value={leadExpectedDeliveryDate}
                            onChange={(e) => setLeadExpectedDeliveryDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono rounded-xl py-2 px-3 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono font-black">
                            Actual Handover Date
                          </label>
                          <input
                            type="date"
                            value={leadActualDeliveryDate}
                            onChange={(e) => setLeadActualDeliveryDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono rounded-xl py-2 px-3 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Remarks */}
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                          Production Remarks / Instructions
                        </label>
                        <textarea
                          rows={2}
                          value={leadRemarks}
                          onChange={(e) => setLeadRemarks(e.target.value)}
                          placeholder="Log revision specifics, aspect ratios, color grade details..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>

                    </fieldset>

                  </div>

                </div>

                {/* Submit actions */}
                {dossierError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-rose-400 text-xs rounded-xl font-mono">
                    ⚠️ {dossierError}
                  </div>
                )}
                <div className="flex justify-end items-center gap-3 border-t border-zinc-900 pt-4">
                  {leadEditor && leadEditor !== 'Unassigned' && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppTask(selectedLeadProd, leadEditor, leadRemarks)}
                      className="mr-auto px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer shadow-lg transition-all duration-150 font-mono font-extrabold flex items-center gap-1.5"
                    >
                      <span>💬 Send Task on WhatsApp</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedLeadProd(null)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded-xl font-mono transition-all cursor-pointer border border-zinc-850"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-650 text-white font-black uppercase text-[10px] tracking-wider rounded-xl hover:from-violet-500 hover:to-indigo-500 cursor-pointer shadow-lg transition-all duration-150 font-mono font-extrabold"
                  >
                    Save Dossier Settings
                  </button>
                </div>

              </form>

            </div>
          </div>
        );
      })()}

      <ProjectDetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        orderId={masterOrderIdForDetail} 
      />

      {/* STEP-BY-STEP INTERACTIVE WORKFLOW MODALS */}
      {activeWorkflowProd && workflowActionType && (() => {
        const order = (orders || []).find(o => {
          const rf = (rawFootage || []).find(f => f.tracking_id === activeWorkflowProd.tracking_id);
          return rf?.order_id === o.order_id;
        });
        const customerName = order ? order?.customer_name : 'Customer';
        const orderId = order ? order?.order_id : 'Order';
        
        const payment = order ? (payments || []).find(p => p.order_id === order?.order_id) : null;
        const totalAmount = order?.quotation_amount || 0;
        const advanceReceived = payment?.advance_received !== undefined ? payment.advance_received : (payment?.advance_paid || 0);
        const balanceDue = payment?.balance_due !== undefined ? payment.balance_due : (totalAmount - advanceReceived);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div id="production_workflow_modal" className={`bg-zinc-950 border-0 sm:border border-zinc-900 rounded-none sm:rounded-2xl ${
              workflowActionType === 'assign_editor'
                ? 'w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] md:w-[90%] lg:w-[85%] max-w-5xl'
                : workflowActionType === 'manage_status'
                  ? 'w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-4xl'
                  : 'w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-sm'
            } overflow-hidden shadow-2xl flex flex-col transition-all duration-300`}>
              
              {/* Header */}
              <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-violet-400 block mb-0.5">
                    Step Workflow Wizard • {orderId}
                  </span>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                    {workflowActionType === 'assign_editor'
                && 'Assign Editor'}
                    {workflowActionType === 'reassign_staff' && 'Reassign Staff'}
                    {workflowActionType === 'delivery_checklist' && 'Delivery Checklist'}
                    {workflowActionType === 'send_review' && 'Step 4: Send For Review'}
                    {workflowActionType === 'request_revision' && 'Step 5: Request Revision'}
                    {workflowActionType === 'deliver_project' && 'Step 8: Deliver Project'}
                    {workflowActionType === 'manage_payment_close' && 'Release & Close Options'}
                    {workflowActionType === 'manage_status'
                  && 'CRM Status Management'}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setActiveWorkflowProd(null);
                    setWorkflowActionType(null);
                  }}
                  className="text-zinc-500 hover:text-white transition-colors p-1"
                >
                  ✕
                </button>
              </div>

              {/* Form Body wrapper */}
              <div className={`${workflowActionType === 'assign_editor'
                ? 'p-3.5 sm:p-4 pb-2' : 'p-4'} overflow-y-auto custom-scrollbar flex-1 min-h-0`}>
                <p className="text-[11px] text-zinc-400 mb-2.5">
                  Step workflow update for <strong className="text-white">{customerName}</strong>.
                </p>

                {/* FORM: Reassign Staff (Deliverable-Wise) */}
                {workflowActionType === 'reassign_staff' && activeWorkflowProd && (
                  <div className="space-y-5 font-sans text-left">
                    
                    {/* 1. Deliverable / Lead Details (Read-only) */}
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 space-y-3">
                      <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
                        <h4 className="text-[10px] text-[#a78bfa] uppercase font-black tracking-widest font-mono">
                          1. Deliverable / Lead Details
                        </h4>
                        <span className="text-[9px] text-zinc-500 font-mono">Read-Only</span>
                      </div>
                      
                      {(() => {
                        const { order, lead } = resolveOrderAndLead(activeWorkflowProd);
                        
                        const leadId = activeWorkflowProd.tracking_id || '—';
                        const customerName = activeWorkflowProd.customer_name || order?.customer_name || lead?.customer_name || '—';
                        const eventName = activeWorkflowProd.custom_event_name || order?.custom_event_name || lead?.custom_event_name || '—';
                        const eventType = activeWorkflowProd.event_type || order?.event_type || lead?.event_type || '—';
                        const eventShootType = activeWorkflowProd.shoot_type || activeWorkflowProd.desired_event_shoot_type || order?.shoot_type || lead?.shoot_type || order?.desired_event_shoot_type || lead?.desired_event_shoot_type || '—';
                        const packageName = order?.package_name || lead?.package_name || '—';
                        const deliverables = order?.deliverables_description || lead?.deliverables_description || '—';
                        const eventDate = activeWorkflowProd.event_date || order?.event_date || lead?.event_date || '—';
                        const eventLocation = order?.event_location || lead?.event_location || '—';
                        const currentStatus = activeWorkflowProd.editing_status || '—';

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
                            <div className="space-y-1 lg:col-span-1">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Customer Name</span>
                              <div className="text-zinc-200 font-semibold flex items-center bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-900 min-h-[38px]">{customerName}</div>
                            </div>
                            <div className="space-y-1 lg:col-span-1">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Event Name</span>
                              <div className="text-zinc-200 font-semibold flex items-center bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-900 min-h-[38px]">{eventName}</div>
                            </div>
                            <div className="space-y-1 lg:col-span-1">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Event Type</span>
                              <div className="text-zinc-200 font-semibold flex items-center bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-900 min-h-[38px]">{eventType}</div>
                            </div>
                            <div className="space-y-1 md:col-span-2 lg:col-span-1">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Current Status</span>
                              <div className="text-violet-400 font-extrabold flex items-center bg-purple-950/20 px-3 py-2 rounded-xl border border-purple-900/30 font-mono min-h-[38px]">{currentStatus}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                     {/* 2. ASSIGN PRODUCTION STAFF (DELIVERABLE-WISE) */}
                     <div className="space-y-4">
                      <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
                        <h4 className="text-[10px] text-[#a78bfa] uppercase font-black tracking-widest font-mono">
                          2. Assign Production Staff (Deliverable-Wise)
                        </h4>
                      </div>

                      {wfError && (
                        <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3 rounded-xl font-mono">
                          ⚠️ {wfError}
                        </div>
                      )}
                      {wfSuccess && (
                        <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs p-3 rounded-xl font-mono">
                          {wfSuccess}
                        </div>
                      )}

                      <fieldset disabled={isProjectLocked(activeWorkflowProd?.editing_status)} className="space-y-4">
                      {/* Single Common Target Delivery Date at the top */}
                      <div id="wf-target-delivery-date-container" className={`p-3 bg-zinc-900/10 border rounded-xl transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                        validationAttempted && !wfTargetDeliveryDate
                          ? 'border-rose-500 bg-rose-950/5'
                          : 'border-zinc-900'
                      }`}>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-[#a78bfa] uppercase font-black tracking-widest font-mono flex items-center gap-1">
                            Target Delivery Date <span className="text-rose-500">*</span>
                          </label>
                          <p className="text-[10px] text-zinc-500 font-mono">Applies to all assignments on this lead</p>
                        </div>
                        <input
                          type="date"
                          id="wf-target-delivery-date"
                          value={wfTargetDeliveryDate}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            setWfTargetDeliveryDate(newDate);
                          }}
                          className={`bg-zinc-950 border text-xs text-zinc-300 rounded-xl px-3 py-1.5 font-mono focus:outline-none min-h-[34px] sm:w-48 ${
                            validationAttempted && !wfTargetDeliveryDate
                              ? 'border-rose-500 ring-1 ring-rose-500/30'
                              : 'border-zinc-900 hover:border-zinc-800 focus:border-purple-500'
                          }`}
                        />
                      </div>

                      {/* Compact Deliverable Assignment Table */}
                      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950">
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                              <tr className="bg-zinc-900/50 border-b border-zinc-900 font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
                                <th className="px-3.5 py-2 font-bold w-[35%]">Deliverable</th>
                                <th className="px-3.5 py-2 font-bold w-[65%]">Assignments (Staff Type & Assigned Staff)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                              {customDeliverables.map((deliverable, dIndex) => {
                                const rows = deliverableStaffRows[deliverable] || [];
                                const isEmpty = rows.filter(r => r.staffId).length === 0;

                                return (
                                  <tr 
                                    key={deliverable}
                                    id={`deliverable-block-${dIndex}`}
                                    className={`transition-colors align-top ${
                                      validationAttempted && isEmpty
                                        ? 'bg-rose-950/5 hover:bg-rose-950/10'
                                        : 'hover:bg-zinc-900/10'
                                    }`}
                                  >
                                    {/* Deliverable Name with compact single line + delete-deliverable button */}
                                    <td className="px-3.5 py-2.5 font-sans border-r border-zinc-900/50">
                                      <div className="flex items-center justify-between gap-2">
                                        <div 
                                          className="text-xs font-bold text-zinc-200 truncate pr-2 select-none"
                                          title={deliverable}
                                        >
                                          ✔ {deliverable}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Compact Staff Row Assignment Sub-table */}
                                    <td className="px-3.5 py-1.5">
                                      <div className="space-y-1.5">
                                        {rows.map((row, rIndex) => {
                                          return (
                                            <div 
                                              key={row.id} 
                                              className="flex items-center gap-2"
                                            >
                                              {/* Staff Type Select Dropdown */}
                                              <div className="w-28 shrink-0">
                                                <select
                                                  value={row.staffType}
                                                  onChange={(e) => {
                                                    const newType = e.target.value as 'In-House' | 'Freelancer';
                                                    setDeliverableStaffRows(prev => {
                                                      const updatedRows = [...(prev[deliverable] || [])];
                                                      updatedRows[rIndex] = {
                                                        ...updatedRows[rIndex],
                                                        staffType: newType,
                                                        staffId: ''
                                                      };
                                                      return {
                                                        ...prev,
                                                        [deliverable]: updatedRows
                                                      };
                                                    });
                                                  }}
                                                  className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-300 rounded-lg px-2 py-1 font-sans focus:outline-none focus:border-purple-500 cursor-pointer h-7"
                                                >
                                                  <option value="In-House">In-House</option>
                                                  <option value="Freelancer">Freelancer</option>
                                                </select>
                                              </div>

                                              {/* Custom Staff Dropdown */}
                                              <div className="flex-1 min-w-max">
                                                <StaffSelectDropdown
                                                  deliverable={deliverable}
                                                  rowId={row.id}
                                                  staffType={row.staffType}
                                                  selectedStaffId={row.staffId}
                                                  onSelect={(val) => {
                                                    setDeliverableStaffRows(prev => {
                                                      const updatedRows = [...(prev[deliverable] || [])];
                                                      updatedRows[rIndex] = {
                                                        ...updatedRows[rIndex],
                                                        staffId: val
                                                      };
                                                      return {
                                                        ...prev,
                                                        [deliverable]: updatedRows
                                                      };
                                                    });
                                                  }}
                                                  productionStaff={productionStaff}
                                                  editorAssignments={editorAssignments}
                                                  onOpenRoster={(name) => setRosterStaffName(name)}
                                                  allRowsForDeliverable={rows}
                                                />
                                              </div>

                                              {/* Row Actions */}
                                              <div className="w-6 shrink-0 flex justify-center">
                                                {rows.length > 1 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setDeliverableStaffRows(prev => {
                                                        const updatedRows = (prev[deliverable] || []).filter(r => r.id !== row.id);
                                                        return {
                                                          ...prev,
                                                          [deliverable]: updatedRows
                                                        };
                                                      });
                                                    }}
                                                    className="text-zinc-600 hover:text-rose-400 transition-colors p-1 cursor-pointer text-xs"
                                                    title="Remove Staff Assignment"
                                                  >
                                                    ✕
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {/* Add Staff Button inside the Deliverable Assignment cell */}
                                        <div className="pt-0.5 flex items-center justify-between">
                                          {validationAttempted && isEmpty && (
                                            <span className="text-[10px] text-rose-500 font-mono italic">
                                              ⚠️ Required: Assign at least one staff
                                            </span>
                                          )}
                                          <div className="flex-1" />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDeliverableStaffRows(prev => {
                                                return {
                                                  ...prev,
                                                  [deliverable]: [
                                                    ...(prev[deliverable] || []),
                                                    { id: `row-${Math.random()}`, staffType: 'In-House', staffId: '' }
                                                  ]
                                                };
                                              });
                                            }}
                                            className="px-2.5 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-855 text-purple-400 hover:text-purple-300 text-[10px] font-mono rounded transition-all cursor-pointer flex items-center gap-1 mt-0.5"
                                          >
                                            <span>+ Add Staff</span>
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {customDeliverables.length === 0 && (
                          <div className="text-center py-6 text-zinc-500 text-xs italic font-mono bg-zinc-900/10 border-t border-zinc-900">
                            No deliverables found for this order.
                          </div>
                        )}
                      </div>

                      {/* Read-only Production Staff Roster Popup */}
                      {rosterStaffName && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
                          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full w-full max-w-2xl p-6 shadow-2xl flex flex-col space-y-4">
                            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                              <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                                <span>📅</span> Production Staff Roster — <span className="text-[#a78bfa]">{rosterStaffName}</span>
                              </h3>
                              <button
                                onClick={() => setRosterStaffName(null)}
                                className="text-zinc-500 hover:text-white transition-colors text-lg"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="overflow-x-auto w-full rounded-xl border border-zinc-900 bg-zinc-950 max-h-[300px]">
                              <table className="w-full text-left border-collapse min-w-max">
                                <thead>
                                  <tr className="bg-zinc-900/50 border-b border-zinc-900 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                                    <th className="px-4 py-3 font-bold">Staff Name</th>
                                    <th className="px-4 py-3 font-bold">Order ID</th>
                                    <th className="px-4 py-3 font-bold">Assigned Date</th>
                                    <th className="px-4 py-3 font-bold">Target Delivery Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900 font-sans text-xs text-zinc-300">
                                  {staffActiveAssignments.length === 0 ? (
                                    <tr>
                                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 font-mono text-xs">
                                        No active assignments found for this staff member.
                                      </td>
                                    </tr>
                                  ) : (
                                    staffActiveAssignments.map((row, idx) => (
                                      <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">{row.staffName}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{row.orderId}</td>
                                        <td className="px-4 py-3 text-zinc-400">{row.assignedDate}</td>
                                        <td className="px-4 py-3 text-zinc-400">{row.targetDeliveryDate}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setRosterStaffName(null)}
                                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-855 text-zinc-300 hover:text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      </fieldset>
                      {/* Save & Assign Action Buttons */}
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkflowProd(null);
                            setWorkflowActionType(null);
                            setWfError('');
                            setWfSuccess('');
                          }}
                          className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-855 text-zinc-400 hover:text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setValidationAttempted(true);
                            if (!wfTargetDeliveryDate) {
                              setWfError('Target Delivery Date is required.');
                              return;
                            }
                            // Validate that at least one staff is assigned to each deliverable
                            for (const d of customDeliverables) {
                              const rows = deliverableStaffRows[d] || [];
                              if (rows.filter(r => r.staffId).length === 0) {
                                setWfError(`Assign at least one staff for deliverable: ${d}`);
                                return;
                              }
                            }
                            
                            setWfError('');
                            const prodId = activeWorkflowProd.production_id;
                            await autoSaveAssignments(deliverableStaffRows, wfTargetDeliveryDate);
                            setWfSuccess('Editor assignments saved successfully!');
                            setTimeout(() => {
                              setActiveWorkflowProd(null);
                              setWorkflowActionType(null);
                              setWfSuccess('');
                              // Trigger WhatsApp sharing modal automatically
                              prepareEditorWhatsappData(prodId);
                            }, 1500);
                          }}
                          className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* FORM: Assign Editor */}
                {workflowActionType === 'assign_editor' && activeWorkflowProd && (() => {
                  const { order, lead } = resolveOrderAndLead(activeWorkflowProd);
                  const orderIdDisplay = order?.order_id || (activeWorkflowProd as any).order_id || activeWorkflowProd.tracking_id;
                  const customerNameDisplay = order?.customer_name || lead?.customer_name || activeWorkflowProd.customer_name || 'Client';

                  return (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!wfTargetDeliveryDate) {
                        setWfError('Please select a Target Delivery Date.');
                        return;
                      }
                      
                      try {
                        setIsSaving(true);
                        const orderId = order?.order_id || activeWorkflowProd?.tracking_id || activeWorkflowProd?.production_id;

                        const assignedForOrder = (editorAssignments || []).filter(a => 
                          a.production_id === activeWorkflowProd.production_id || a.order_id === orderId
                        );

                        // 1. Delete all existing editor assignments for this production
                        const { error: deleteError } = await supabaseClient
                          .from('editor_assignments')
                          .delete()
                          .eq('production_id', activeWorkflowProd.production_id);
                          
                        if (deleteError) throw deleteError;
                        
                        // 2. Prepare new assignments across all sections
                        const newAssignments = [];
                        for (const section of wfEventSections) {
                          for (const item of section.items) {
                            if (!item.editor || item.editor === 'Unassigned') continue;
                            const st = (productionStaff || []).find(s => s.name === item.editor);
                            if (st) {
                              const originalAssignment = assignedForOrder.find(a => 
                                (a.event_id === section.eventId || !a.event_id) && 
                                (a.speciality === item.text || a.deliverable_id === item.text)
                              );
                              const hasChanged = originalAssignment ? originalAssignment.staff_name !== item.editor : true;
                              const finalStatus = hasChanged ? 'Assigned' : (originalAssignment?.status || 'Assigned');
                              
                              const id = item.assignment_id || `EDR-${Math.floor(100000 + Math.random() * 900000)}`;
                              const preservedFields = !hasChanged && originalAssignment ? { ...originalAssignment } : {};
                              
                              newAssignments.push({
                                ...preservedFields,
                                assignment_id: id,
                                production_id: activeWorkflowProd.production_id,
                                order_id: orderId,
                                event_id: section.eventId,
                                deliverable_id: item.text,
                                staff_id: st.staff_id,
                                staff_name: item.editor,
                                speciality: item.text,
                                assigned_date: originalAssignment?.assigned_date || new Date().toISOString().split('T')[0],
                                target_finish_date: wfTargetDeliveryDate,
                                status: finalStatus,
                                created_at: originalAssignment?.created_at || new Date().toISOString()
                              });
                            }
                          }
                        }
                        
                        if (newAssignments.length > 0) {
                          const { error: insertError } = await supabaseClient
                            .from('editor_assignments')
                            .insert(newAssignments);
                          if (insertError) throw insertError;
                        }
                        
                        // 3. Update the production record
                        const uniqueEditors = Array.from(new Set(newAssignments.map(a => a.staff_name).filter(Boolean)));
                        const primaryEditor = uniqueEditors[0] || 'Unassigned';
                        const assignedStaffJoined = uniqueEditors.join(', ');
                        
                        const activeStaffList = (productionStaff || []).filter(s => s.status === 'Active');
                        const assignedRoles = Array.from(new Set(newAssignments.map(a => {
                          const staffMem = activeStaffList.find(s => s.staff_name === a.staff_name);
                          return staffMem?.role || 'Editor';
                        })));
                        const rolesJoined = assignedRoles.join(', ') || 'Editor';
                        
                        let newEditingStatus = 'Assigned Editor';
                        if (newAssignments.length > 0) {
                          const getTaskStageRank = (st: string, driveLink?: string) => {
                            const status = st || '';
                            if (['Client Acceptance'].includes(status)) return 5;
                            if (['Completed', 'Editing Completed', 'Editing Complete'].includes(status)) return 4;
                            if (['Customer Review', 'Client Review', 'Client Review Sent'].includes(status) || (driveLink && driveLink.trim() !== '')) return 3;
                            if (['Editing Started', 'In Progress', 'Editing In Progress'].includes(status)) return 2;
                            if (['Assigned Editor', 'Editor Assigned', 'Assigned'].includes(status)) return 1;
                            return 0;
                          };

                          const ranks = newAssignments.map(a => getTaskStageRank(a.status, (a as any).edited_drive_link));
                          const minRank = Math.min(...ranks);

                          if (minRank >= 5) newEditingStatus = 'Client Acceptance';
                          else if (minRank >= 4) newEditingStatus = 'Editing Completed';
                          else if (minRank >= 3) newEditingStatus = 'Customer Review';
                          else if (minRank >= 2) newEditingStatus = 'Editing Started';
                          else if (minRank >= 1) newEditingStatus = 'Assigned Editor';
                        }
                        
                        await updateProduction(activeWorkflowProd.production_id, {
                          editor_assigned: primaryEditor,
                          assigned_staff: assignedStaffJoined,
                          target_delivery_date: wfTargetDeliveryDate,
                          expected_delivery_date: wfTargetDeliveryDate,
                          project_notes: wfProjectNotes,
                          editing_status: newEditingStatus,
                          production_status: newEditingStatus,
                          production_role: rolesJoined,
                          assigned_role: rolesJoined
                        });
                        
                        if (typeof refreshData === 'function') {
                          refreshData();
                        }
                        
                        alert("Editor assignments saved successfully!");
                        
                        setActiveWorkflowProd(null);
                        setWorkflowActionType(null);
                      } catch (err: any) {
                        setWfError(err.message || 'Failed to assign editors');
                      } finally {
                        setIsSaving(false);
                      }
                    }} className="space-y-5 font-sans text-left">
                      <div className="mb-2 text-xs text-zinc-400 font-mono flex flex-wrap items-center gap-4 border-b border-zinc-900 pb-3">
                        <div><span className="text-zinc-500 font-bold uppercase">Order ID:</span> <strong className="text-purple-300 font-bold">{orderIdDisplay}</strong></div>
                        <div><span className="text-zinc-500 font-bold uppercase">Customer:</span> <strong className="text-zinc-200 font-bold">{customerNameDisplay}</strong></div>
                      </div>

                      {wfError && (
                        <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3 rounded-xl font-mono">
                          ⚠️ {wfError}
                        </div>
                      )}

                      {/* EVENT SECTIONS */}
                      <div className="space-y-6">
                        {wfEventSections.map((section, sIdx) => (
                          <div key={sIdx} className="space-y-2">
                            {/* Section Header: ONLY Event Name */}
                            <div className="pb-1 border-b border-zinc-800">
                              <span className="text-purple-400 font-extrabold text-xs uppercase tracking-wider font-mono">
                                {section.eventName}
                              </span>
                            </div>

                            <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950">
                              <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse min-w-max">
                                  <thead>
                                    <tr className="bg-zinc-900/50 border-b border-zinc-900 font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
                                      <th className="px-4 py-2.5 font-bold w-[12%] text-center">QTY</th>
                                      <th className="px-4 py-2.5 font-bold w-[53%]">DELIVERABLE NAME</th>
                                      <th className="px-4 py-2.5 font-bold w-[35%]">ASSIGN EDITOR</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-900 font-sans text-xs text-zinc-300">
                                    {section.items.length === 0 ? (
                                      <tr>
                                        <td colSpan={3} className="px-4 py-6 text-center text-zinc-500 font-mono text-xs">
                                          No deliverables found for this event.
                                        </td>
                                      </tr>
                                    ) : (
                                      section.items.map((row, itemIdx) => (
                                        <tr key={itemIdx} className="hover:bg-zinc-900/10 transition-colors">
                                          <td className="px-4 py-3 font-mono text-xs text-center font-bold text-zinc-400">
                                            {row.qty}
                                          </td>
                                          <td className="px-4 py-3 font-semibold text-zinc-200">
                                            {row.text}
                                          </td>
                                          <td className="px-4 py-2">
                                            <select
                                              value={row.editor}
                                              onChange={(e) => handleSectionEditorChange(sIdx, itemIdx, e.target.value)}
                                              className="w-full bg-zinc-905 border border-zinc-900 hover:border-zinc-800 text-xs text-zinc-300 rounded-xl px-2.5 py-1.5 font-mono focus:outline-none focus:border-purple-500 cursor-pointer h-9"
                                            >
                                              <option value="Unassigned">Select Editor</option>
                                              {(productionStaff || []).map(s => (
                                                <option key={s.staff_id} value={s.name}>{s.name}</option>
                                              ))}
                                            </select>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* SHARED TARGET DELIVERY DATE */}
                      <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-2 mt-4">
                        <label className="block text-[10px] font-mono text-[#a78bfa] uppercase font-bold tracking-widest">
                          Target Delivery Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={wfTargetDeliveryDate}
                          onChange={(e) => setWfTargetDeliveryDate(e.target.value)}
                          className="w-full sm:w-64 bg-zinc-950 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Notes (Optional)</label>
                        <textarea
                          rows={3}
                          value={wfProjectNotes}
                          onChange={(e) => setWfProjectNotes(e.target.value)}
                          className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono resize-none focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setActiveWorkflowProd(null); setWorkflowActionType(null); }}
                          className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer uppercase font-mono tracking-wider"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer uppercase font-mono tracking-wider"
                        >
                          {isSaving ? 'Assigning...' : 'Assign Editor'}
                        </button>
                      </div>
                    </form>
                  );
                })()} 
              </div>
            </div>
          </div>
        );
      })()} 
    </div>
  );
};
export default ProductionModule;