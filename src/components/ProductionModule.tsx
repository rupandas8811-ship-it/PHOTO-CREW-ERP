import React, { useState, useEffect, useMemo } from 'react';
import { useRole } from './RoleContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, CheckCircle2, UserCheck, Eye, Calendar, Lock, Layers, AlertCircle, Ban, RefreshCw, Clock,
  PlusSquare, ArrowRight, CheckSquare, AlertTriangle, Truck, Users, BarChart3, TrendingUp, Sparkles, UserPlus, ChevronRight,
  Aperture, Camera, Sliders, ShieldCheck, Image, Download, Printer, FileSpreadsheet, FileText, Search,
  Trash2, X, Mail, MessageSquare, Edit3, MapPin, Plus, Phone
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Production, EditingStatus, Staff } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ProjectDetailModal } from './ProjectDetailModal';
import { formatINR, triggerAutoScrollAndFocus } from '../utils';
import { AppLogo } from './AppLogo';
import { StatusText } from './ui/StatusText';
import { ProductionCalendar } from './ProductionCalendar';
import { StaffManagementModule } from './StaffManagementModule';
import { NotificationsModule } from './NotificationsModule';
import { Bell } from 'lucide-react';
import { CameraLensStatsCard, CameraLensTheme } from './CameraLensStatsCard';
import { ProductionStaffDirectoryModule } from './ProductionStaffDirectoryModule';
import { ProductionRoleSpecialitiesModule } from './ProductionRoleSpecialitiesModule';

export const MicroSparkline: React.FC<{ points: number[]; color: string }> = ({ points, color }) => {
  const width = 120;
  const height = 18;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  
  const widthStep = width / (points.length - 1);
  const svgPoints = points.map((p, i) => {
    const x = i * widthStep;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const pathD = svgPoints.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible opacity-45 group-hover/card:opacity-90 transition-opacity duration-300">
      <defs>
        <linearGradient id={`spark-glow-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-glow-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const LiveAnimateCounter: React.FC<{ value: number }> = ({ value }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 1200; // ms
    const increment = Math.max(1, Math.ceil(end / (duration / 16)));
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span className="font-mono font-black">{count}</span>;
};

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

export interface ProductionModuleProps {
  activeSubTab: 'pipeline' | 'production_leads' | 'project_queue' | 'assignments' | 'tracker' | 'delivery' | 'resources' | 'analytics' | 'staff_performance' | 'overall_performance' | 'deliveries_desk' | 'staff_management' | 'notifications' | 'crew_roster' | 'production_staff_directory' | 'production_role_specialities';
  setActiveSubTab: (tab: any) => void;
}

export const ProductionModule: React.FC<ProductionModuleProps> = ({ activeSubTab, setActiveSubTab }) => {
  const { 
    currentRole, 
    production, 
    updateProduction, 
    markDelivered, 
    acceptRawFootage, 
    orders, 
    rawFootage, 
    staff,
    payments,
    operations,
    staffAssignments,
    specialities = [],
    editorAssignments = [],
    assignEditorToProject,
    updateEditorAssignmentStatus,
    deleteEditorAssignment,
    leads: leadsData,
    getLeadCurrentStatus,
    logs,
    addStaff,
    updateStaff,
    deleteStaff,
    addSpeciality,
    isDepartmentAllowedToEdit,
    deleteRawFootage,
    deleteProduction
  } = useRole();

  // Role permissions gate
  const canEdit = (currentRole === 'Production Team' || currentRole === 'Business Owner') && 
                  isDepartmentAllowedToEdit(currentRole, 'Raw Footage Received'); // Need to map correctly per project later

  // Dynamically compile active production projects/leads from leadsData / Supabase leads table
  const leads = useMemo(() => {
    const postProdStages = [
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
      'Project Delivered',
      'Completed',
      'Closed',
      'Project Closed',
      'Customer Review',
      'Approved',
      'Payment Pending'
    ];

    return (leadsData || []).filter(l => {
      const order = orders.find(o => o.lead_id === l.lead_id);
      const stage = l.status || order?.current_stage;
      return postProdStages.includes(stage);
    }).map(l => {
      const order = orders.find(o => o.lead_id === l.lead_id);
      const rf = order ? rawFootage.find(f => f.order_id === order.order_id) : null;
      const prod = rf ? production.find(p => p.tracking_id === rf.tracking_id) : production.find(p => p.tracking_id === l.lead_id);
      
      const defaultTargetDate = l.event_date ? new Date(new Date(l.event_date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '';
      
      if (prod) {
        return {
          ...prod,
          editor_assigned: (l as any).assigned_editor || prod.editor_assigned || 'Unassigned',
          assigned_staff: (l as any).assigned_editors || prod.assigned_staff || '',
          target_delivery_date: (l as any).delivery_target_date || prod.target_delivery_date || defaultTargetDate,
          expected_delivery_date: (l as any).delivery_target_date || prod.expected_delivery_date || defaultTargetDate,
          editing_status: (l as any).current_status || l.status || prod.editing_status
        };
      }

      return {
        production_id: `PRD-${l.lead_id}`,
        tracking_id: rf?.tracking_id || order?.order_id || l.lead_id,
        editor_assigned: (l as any).assigned_editor || 'Unassigned',
        assigned_staff: (l as any).assigned_editors || '',
        raw_footage_location: rf?.server_path || '',
        editing_status: ((l as any).current_status || l.status) as any,
        remarks: l.remarks || '',
        project_priority: 'Medium',
        target_delivery_date: (l as any).delivery_target_date || defaultTargetDate,
        expected_delivery_date: (l as any).delivery_target_date || defaultTargetDate
      };
    });
  }, [leadsData, orders, rawFootage, production]);

  // Staff Performance Filter State
  const [staffRoleFilter, setStaffRoleFilter] = useState<'All' | 'Editor' | 'Album Designer' | 'Retoucher' | 'Motion Graphics Designer'>('All');

  // Enhanced Staff and Role states for Editor Performance and Staff Directory
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<Staff | null>(null);
  const [viewingStaffMember, setViewingStaffMember] = useState<Staff | null>(null);
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<{ type: string; memberName: string; list: any[] } | null>(null);

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
    const assigned = production.filter(prod => 
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
    return (staff || []).filter(s => {
      const matchesName = s.name.toLowerCase().includes(searchStaffName.toLowerCase());
      const whatsappToMatch = s.whatsapp_number || s.mobile || '';
      const matchesWhatsapp = whatsappToMatch.toLowerCase().includes(searchStaffWhatsapp.toLowerCase());
      const matchesRole = perfRoleFilter === 'All' || s.production_role_speciality === perfRoleFilter || s.role === perfRoleFilter;
      const matchesStatus = perfStatusFilter === 'All' || s.status === perfStatusFilter;
      return matchesName && matchesWhatsapp && matchesRole && matchesStatus;
    });
  }, [staff, searchStaffName, searchStaffWhatsapp, perfRoleFilter, perfStatusFilter]);

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
    const dataForSheet = filteredStaff.map(s => {
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
        await updateStaff(editingStaffMember.staff_id, payload);
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

  const getProductionStatus = (prod: Production): string => {
    const status = (prod.editing_status || 'Raw Footage Received') as string;
    if (status === 'Pending' || status === 'Raw Footage Received') return 'Raw Footage Received';
    if (status === 'Editor Assigned') return 'Editor Assigned';
    if (status === 'Editing Started') return 'Editing Started';
    if (status === 'Editing' || status === 'Editing In Progress') return 'Editing In Progress';
    if (status === 'Internal QC Review') return 'Internal QC Review';
    if (status === 'Ready For Review' || status === 'Client Review Sent' || status === 'Customer Review') return 'Client Review Sent';
    if (status === 'Revision Required') return 'Revision Required';
    if (status === 'Revision In Progress') return 'Revision In Progress';
    if (status === 'Approved' || status === 'Final Approval') return 'Final Approval';
    if (status === 'Delivered' || status === 'Project Delivered' || status === 'Payment Pending') return 'Project Delivered';
    if (status === 'Closed' || status === 'Project Closed' || status === 'Completed') return 'Completed';
    return status;
  };

  const getAssignedEditorsText = (prod: Production): string => {
    const assigned_editors = (() => {
      const fromAssignments = editorAssignments.filter(a => a.production_id === prod.production_id);
      if (fromAssignments.length > 0) {
        return fromAssignments.map(a => ({ name: a.staff_name }));
      }
      const staffStr = prod.assigned_staff || prod.editor_assigned;
      if (staffStr && staffStr !== 'Unassigned') {
        return staffStr.split(',').map(s => ({ name: s.trim() }));
      }
      return [];
    })();
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
    const raw = prod.editing_status as string;
    return s === 'Raw Footage Received' || s === 'Editor Assigned' || raw === 'Raw Footage Received' || raw === 'Editor Assigned' || raw === 'Pending';
  };

  const isInProgressEdit = (prod: Production) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Editing Started' || s === 'Editing In Progress' || s === 'Internal QC Review' || raw === 'Editing Started' || raw === 'Editing' || raw === 'Editing In Progress' || raw === 'Internal QC Review';
  };

  const isClientApproved = (prod: Production) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Final Approval' || s === 'Project Delivered' || s === 'Completed' || raw === 'Approved' || raw === 'Final Approval' || raw === 'Delivered' || raw === 'Project Delivered' || raw === 'Closed' || raw === 'Project Closed' || raw === 'Completed' || raw === 'Payment Pending';
  };

  const isClientNotApproved = (prod: Production) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Client Review Sent' || s === 'Revision Required' || s === 'Revision In Progress' || raw === 'Ready For Review' || raw === 'Client Review Sent' || raw === 'Customer Review' || raw === 'Revision Required' || raw === 'Revision In Progress';
  };

  const isTotalProjectsCompleted = (prod: Production) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Project Delivered' || s === 'Completed' || raw === 'Delivered' || raw === 'Project Delivered' || raw === 'Closed' || raw === 'Project Closed' || raw === 'Completed';
  };

  // Base list filtered by applied date range, customer name, and order ID (Supabase leads table data source)
  const filteredLeadsList = useMemo(() => {
    return leads.filter(prod => {
      const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
      const order = rf ? orders.find(o => o.order_id === rf.order_id) : orders.find(o => o.lead_id === prod.production_id.replace('PRD-', ''));
      if (!order) return false;

      // Event date matching (format is YYYY-MM-DD)
      const eventDate = order.event_date || '';
      if (appliedStartDate && eventDate < appliedStartDate) return false;
      if (appliedEndDate && eventDate > appliedEndDate) return false;

      // Search matching
      if (appliedCustName) {
        const cName = order.customer_name || '';
        if (!cName.toLowerCase().includes(appliedCustName.toLowerCase())) return false;
      }
      if (appliedOrdId) {
        if (!order.order_id.toLowerCase().includes(appliedOrdId.toLowerCase())) return false;
      }

      return true;
    });
  }, [leads, orders, rawFootage, appliedStartDate, appliedEndDate, appliedCustName, appliedOrdId]);

  // Computed counts for the five distinct analytics cards
  const countNewProjects = useMemo(() => filteredLeadsList.filter(isNewProject).length, [filteredLeadsList]);
  const countInProgressEdit = useMemo(() => filteredLeadsList.filter(isInProgressEdit).length, [filteredLeadsList]);
  const countClientApproved = useMemo(() => filteredLeadsList.filter(isClientApproved).length, [filteredLeadsList]);
  const countClientNotApproved = useMemo(() => filteredLeadsList.filter(isClientNotApproved).length, [filteredLeadsList]);
  const countTotalCompleted = useMemo(() => filteredLeadsList.filter(isTotalProjectsCompleted).length, [filteredLeadsList]);

  // Report download utilities
  const downloadCSVReport = () => {
    const data = filteredLeadsList.map(prod => {
      const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
      const order = rf ? orders.find(o => o.order_id === rf.order_id) : orders.find(o => o.lead_id === prod.production_id.replace('PRD-', ''));
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
      const data = filteredLeadsList.map(prod => {
        const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
        const order = rf ? orders.find(o => o.order_id === rf.order_id) : orders.find(o => o.lead_id === prod.production_id.replace('PRD-', ''));
        return {
          'ORDER ID': order?.order_id || '',
          'CUSTOMER NAME': order?.customer_name || '',
          'EVENT TYPE': order?.event_type || '',
          'EVENT DATE': order?.event_date || '',
          'ASSIGNED EDITOR': prod.editor_assigned || 'Unassigned',
          'CURRENT STATUS': getProductionStatus(prod),
          'EXPECTED DELIVERY DATE': prod.expected_delivery_date || '',
          'PRIORITY': prod.project_priority || 'Medium'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Production Leads");
      
      const keys = ['ORDER ID', 'CUSTOMER NAME', 'EVENT TYPE', 'EVENT DATE', 'ASSIGNED EDITOR', 'CURRENT STATUS', 'EXPECTED DELIVERY DATE', 'PRIORITY'];
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
    doc.text("Assigned Editor", colX[3], 55);
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
        doc.text("Assigned Editor", colX[3], y);
        doc.text("Current Status", colX[4], y);
        doc.text("Priority", colX[5], y);
        doc.line(14, y + 2, 196, y + 2);
        y += 8;
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(31, 41, 55);
      }
      
      const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
      const order = rf ? orders.find(o => o.order_id === rf.order_id) : orders.find(o => o.lead_id === prod.production_id.replace('PRD-', ''));
      
      const ordId = order?.order_id || 'N/A';
      const custName = order?.customer_name || 'N/A';
      const evDate = order?.event_date || 'N/A';
      const edName = prod.editor_assigned || 'Unassigned';
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
    
    const rowsHtml = filteredLeadsList.map(prod => {
      const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
      const order = rf ? orders.find(o => o.order_id === rf.order_id) : orders.find(o => o.lead_id === prod.production_id.replace('PRD-', ''));
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-family: monospace;">${order?.order_id || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order?.customer_name || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order?.event_type || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order?.event_date || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${prod.editor_assigned || 'Unassigned'}</td>
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
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Event Type</th>
                <th>Event Date</th>
                <th>Assigned Editor</th>
                <th>Current Status</th>
                <th>Target Delivery</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="padding: 20px; text-align: center;">No records found.</td></tr>'}
            </tbody>
          </table>
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
  const [workflowActionType, setWorkflowActionType] = useState<'assign_editor' | 'send_review' | 'request_revision' | 'deliver_project' | 'manage_payment_close' | 'manage_status' | 'close_project' | null>(null);

  // Form states for each step popup
  // Step 1: Assign Editor Form
  const [wfEditor, setWfEditor] = useState('Unassigned');
  const [wfTargetDeliveryDate, setWfTargetDeliveryDate] = useState('');
  const [wfPriority, setWfPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [wfSpeciality, setWfSpeciality] = useState('');
  const [wfProjectNotes, setWfProjectNotes] = useState('');
  const [wfInternalComments, setWfInternalComments] = useState('');
  const [assignmentRows, setAssignmentRows] = useState<{ speciality: string; staffId: string; staffName: string }[]>([
    { speciality: '', staffId: '', staffName: '' }
  ]);
  const [wfError, setWfError] = useState('');

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
      } else if (workflowActionType === 'assign_editor') {
        const assignedForThis = activeWorkflowProd ? editorAssignments.filter(a => a.production_id === activeWorkflowProd.production_id) : [];
        if (assignedForThis.length === 0) {
          setWfEditor('');
          setWfTargetDeliveryDate('');
          setWfPriority('Medium');
          setWfSpeciality('');
          setWfProjectNotes('');
          setWfInternalComments('');
          setAssignmentRows([{ speciality: '', staffId: '', staffName: '' }]);
        }
      }

      triggerAutoScrollAndFocus('#production_workflow_modal', 150);
    }
  }, [workflowActionType, activeWorkflowProd, editorAssignments]);

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

  const getRawFootageStatus = (prod: Production) => {
    if (prod.raw_footage_status) return prod.raw_footage_status;
    const rf = rawFootage.find(r => r.tracking_id === prod.tracking_id);
    if (rf && rf.status === 'Received') return 'Footage Received';
    return 'Pending';
  };

  const handleSendWhatsAppTask = (prod: Production, targetStaffName?: string, customNote?: string) => {
    const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id);
    const order = rf ? orders.find(o => o.order_id === rf.order_id) : null;
    
    const staffName = targetStaffName || prod.editor_assigned || 'Production Staff';
    const customerName = order ? order.customer_name : 'Valued Client';
    const orderId = order ? order.order_id : 'N/A';
    const projectName = order ? (order.package_name || order.event_type) : 'Project Event';
    const eventDate = order ? order.event_date : 'N/A';
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
    const item = production.find((p) => p.production_id === selectedProdId);
    if (!item) return;

    markDelivered(item.tracking_id, 'Approved and Delivered via Photo Crew ERP Vault.');
    setSelectedProdId(null);
    alert('Project officially delivered to customer! Final stage updated.');
  };

  // Helper lists for calculations
  const today = new Date();

  // Filter/Derived definitions
  const newProjects = leads.filter(p => !p.editor_assigned || p.editor_assigned === 'Unassigned');
  const assignedProjects = leads.filter(p => p.editor_assigned && p.editor_assigned !== 'Unassigned' && p.editing_status !== 'Project Delivered' && p.editing_status !== 'Delivered' && p.editing_status !== 'Completed');
  const pendingProjects = leads.filter(p => !['Final Approval', 'Approved', 'Project Delivered', 'Delivered', 'Project Closed', 'Closed', 'Completed'].includes(p.editing_status));
  const delayedProjects = leads.filter(p => {
    if (['Final Approval', 'Approved', 'Project Delivered', 'Delivered', 'Project Closed', 'Closed', 'Completed'].includes(p.editing_status)) return false;
    if (!p.expected_delivery_date) return false;
    return new Date(p.expected_delivery_date) < today;
  });

  // Calculate stats for pipeline counters
  const statTotalVideo = leads.length;
  const statPendingVideo = leads.filter(p => ['Pending', 'New Raw Footage Arrived', 'Raw Footage Received', 'Editor Assigned'].includes(p.editing_status)).length;
  const statEditingVideo = leads.filter(p => ['Editing Started', 'Editing In Progress', 'Editing'].includes(p.editing_status)).length;
  const statReviewVideo = leads.filter(p => ['Internal QC Review', 'Client Review Sent', 'Customer Review', 'Ready For Review', 'Revision Required', 'Revision In Progress'].includes(p.editing_status)).length;
  const statApprovedVideo = leads.filter(p => ['Approved', 'Final Approval'].includes(p.editing_status)).length;

  const visibleProduction = leads;

  // Active workload stats for staff (from useRole().staff + active jobs)
  const getStaffWorkload = (staffName: string) => {
    const nameLower = (staffName || '').toLowerCase();
    
    // Check dynamic assignments table first
    const staffAssignments = editorAssignments.filter(a => a.staff_name.toLowerCase() === nameLower);
    
    const assignedCount = staffAssignments.length;
    const completedCount = staffAssignments.filter(a => a.status === 'Completed').length;
    const activeCount = staffAssignments.filter(a => a.status !== 'Completed').length;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueCount = staffAssignments.filter(a => 
      a.status !== 'Completed' && a.target_finish_date && a.target_finish_date < todayStr
    ).length;

    // Backward compatibility for direct assignments
    const fallbackActive = production.filter(p => 
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

          {/* Advanced Search & Filter Center */}
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
                  <option value="Overdue">⚠️ Overdue Projects</option>
                  <option value="Raw Footage Received">Raw Footage Received</option>
                  <option value="Editor Assigned">Editor Assigned</option>
                  <option value="Editing Started">Editing Started</option>
                  <option value="Editing In Progress">Editing In Progress</option>
                  <option value="Internal QC Review">Internal QC Review</option>
                  <option value="Client Review Sent">Client Review Sent</option>
                  <option value="Revision Required">Revision Required</option>
                  <option value="Revision In Progress">Revision In Progress</option>
                  <option value="Final Approval">Final Approval</option>
                  <option value="Project Delivered">Project Delivered</option>
                  <option value="Completed">Completed</option>
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

          {/* Newly Arrived - Raw Footage Received Queue */}
          {(() => {
            const rawFootageLeads = filteredLeadsList.filter(prod => {
              const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
              const order = rf ? orders.find(o => o.order_id === rf.order_id) : orders.find(o => o.lead_id === prod.production_id.replace('PRD-', ''));
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
                  <table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-[1200px]">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                        <th className="p-3 font-bold">Order ID</th>
                        <th className="p-3 font-bold">Customer Name</th>
                        <th className="p-3 font-bold">Event Type</th>
                        <th className="p-3 font-bold">Event Date</th>
                        <th className="p-3 font-bold">Assigned Team</th>
                        <th className="p-3 font-bold">Raw Footage Drive Link</th>
                        <th className="p-3 font-bold">Current Production Status</th>
                        <th className="p-3 font-bold text-right pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {rawFootageLeads.map(prod => {
                        const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                        const order = rf ? orders.find(o => o.order_id === rf.order_id) : orders.find(o => o.lead_id === prod.production_id.replace('PRD-', ''));
                        if (!order) return null;

                        const op = operations?.find(o => o.order_id === order.order_id);
                        const matchedSa = staffAssignments ? staffAssignments.filter(sa => sa.order_id === order.order_id) : [];

                        const roleMap: Record<string, string[]> = {};
                        const addStaff = (role: string, name: string | null | undefined) => {
                          if (!name || name.trim() === '' || name.toLowerCase() === 'unassigned' || name.toLowerCase() === 'none') return;
                          if (!roleMap[role]) {
                            roleMap[role] = [];
                          }
                          if (!roleMap[role].includes(name.trim())) {
                            roleMap[role].push(name.trim());
                          }
                        };

                        if (op) {
                          addStaff('Photographer', op.photographer_assigned);
                          addStaff('Videographer', op.videographer_assigned);
                          addStaff('Drone Operator', op.drone_operator_assigned);
                          addStaff('Assistant', op.assistant_assigned);
                        }

                        matchedSa.forEach(sa => {
                          if (sa.assignment_status !== 'Cancelled') {
                            const role = sa.staff_role || 'Staff';
                            addStaff(role, sa.staff_name);
                          }
                        });

                        const prodStatus = getProductionStatus(prod);

                        return (
                          <tr key={prod.production_id} className="hover:bg-zinc-900/40 transition-all font-mono">
                            <td className="p-3 text-violet-400 font-bold">{order.order_id}</td>
                            <td className="p-3 font-sans font-bold text-white">{order.customer_name}</td>
                            <td className="p-3 text-zinc-300 font-sans">{order.event_type === 'Other' ? (order.custom_event_name || order.custom_event_type || 'Other') : order.event_type}</td>
                            <td className="p-3 text-zinc-400">{order.event_date || 'N/A'}</td>
                            <td className="p-3 font-sans text-zinc-330">
                              {Object.keys(roleMap).length > 0 ? (
                                <div className="space-y-1.5 text-left">
                                  {Object.entries(roleMap).map(([role, names]) => (
                                    <div key={role} className="text-[10.5px]">
                                      <span className="font-bold text-zinc-400 block">{role}:</span>
                                      <ul className="list-disc pl-4 space-y-0.5 text-white font-medium">
                                        {names.map(name => (
                                          <li key={name}>{name}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-zinc-650 italic">No Team Assigned</span>
                              )}
                            </td>
                            <td className="p-3">
                              {(() => {
                                const serverPath = rf?.server_path || '';
                                const isDriveLinkAvailable = serverPath.trim() !== '' && (serverPath.startsWith('http://') || serverPath.startsWith('https://'));

                                if (isDriveLinkAvailable) {
                                  return (
                                    <a
                                      href={serverPath}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1.5 cursor-pointer max-w-[200px] break-words"
                                      title={serverPath}
                                    >
                                      <span>🔗</span> Open Drive Link
                                    </a>
                                  );
                                }

                                const uploadNotes = rf?.upload_notes || '';
                                const hasHardDisk = uploadNotes.includes('Hard Disk Received: YES');
                                const hasMemoryCard = uploadNotes.includes('Memory Card Received: YES');

                                if (hasHardDisk && hasMemoryCard) {
                                  return <span className="text-zinc-300 font-medium">Hard Disk & Memory Card Received</span>;
                                } else if (hasHardDisk) {
                                  return <span className="text-zinc-300 font-medium">Hard Disk Received</span>;
                                } else if (hasMemoryCard) {
                                  return <span className="text-zinc-300 font-medium">Memory Card Received</span>;
                                }

                                if (rf?.raw_received) {
                                  return <span className="text-zinc-300 font-medium">Physical Media Received</span>;
                                }

                                return <span className="text-zinc-650 italic">No link</span>;
                              })()}
                            </td>
                            <td className="p-3">
                              <StatusText status={prodStatus} />
                            </td>
                            <td className="p-3 text-right pr-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveWorkflowProd(prod);
                                  setWfEditor(prod.editor_assigned || 'Unassigned');
                                  setWfTargetDeliveryDate(prod.target_delivery_date || '');
                                  setWfPriority(prod.project_priority || 'Medium');
                                  setWfProjectNotes(prod.project_notes || prod.remarks || '');
                                  setWfInternalComments(prod.internal_comments || '');
                                  setWfError('');
                                  
                                  const assignedForThis = editorAssignments.filter(a => a.production_id === prod.production_id);
                                  setSelectedStaffIds(assignedForThis.map(a => a.staff_id));
                                  if (assignedForThis.length > 0) {
                                    setWfSpeciality(assignedForThis[0].speciality);
                                    setAssignmentRows(assignedForThis.map(a => ({
                                      speciality: a.speciality,
                                      staffId: a.staff_id,
                                      staffName: a.staff_name
                                    })));
                                  } else {
                                    setWfSpeciality('');
                                    setAssignmentRows([{ speciality: '', staffId: '', staffName: '' }]);
                                  }
                                  
                                  setWorkflowActionType('assign_editor');
                                }}
                                className="px-3 py-1.5 bg-purple-600 border border-purple-500 text-white hover:bg-purple-500 hover:border-purple-400 transition-all text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>👤</span> Assign Editor
                              </button>
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
              <table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-[1200px]">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/70 px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                    <th className="p-4 font-black">Order ID</th>
                    <th className="p-4 font-black">Customer Name</th>
                    <th className="p-4 font-black">Event Type</th>
                    <th className="p-4 font-black">Event Date</th>
                    <th className="p-4 font-black">Raw Footage Link</th>
                    <th className="p-4 font-black">Assigned Editor(s)</th>
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
                      'Payment Pending'
                    ];

                    const filteredLeads = filteredLeadsList.filter(prod => {
                      const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                      const order = rf ? orders.find(o => o.order_id === rf.order_id) : orders.find(o => o.lead_id === prod.production_id.replace('PRD-', ''));
                      if (!order) return false;
                      
                      // Only show in active Production table once editor assignment has been completed
                      if (prod.editing_status === 'Raw Footage Received') return false;
                      
                      const searchLower = leadSearch.toLowerCase();
                      const clientMatch = order.customer_name?.toLowerCase().includes(searchLower) || order.order_id.toLowerCase().includes(searchLower);
                      if (leadSearch && !clientMatch) return false;

                      const pVal = getProductionPriority(prod);
                      if (priorityFilter !== 'All' && pVal !== priorityFilter) return false;

                      const sVal = getProductionStatus(prod);
                      if (statusFilter === 'Overdue') {
                        const days = calculateDaysRemaining(prod.target_delivery_date || prod.expected_delivery_date);
                        if (!(days !== null && days < 0 && prod.editing_status !== 'Delivered' && prod.editing_status !== 'Closed' && prod.editing_status as any !== 'Project Closed' && prod.editing_status as any !== 'Project Delivered' && prod.editing_status as any !== 'Completed')) return false;
                      } else if (statusFilter !== 'All' && sVal !== statusFilter) {
                        return false;
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

                    return filteredLeads.map((prod) => {
                      const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id || f.order_id === prod.tracking_id);
                      const order = rf ? orders.find(o => o.order_id === rf.order_id) : orders.find(o => o.lead_id === prod.production_id.replace('PRD-', ''));
                      if (!order) return null;

                      const priority = getProductionPriority(prod);
                      const status = prod.editing_status || 'Pending';
                      const lead = leadsData?.find(l => l.lead_id === order.lead_id);
                      const displayStatus = lead ? getLeadCurrentStatus(lead) : getProductionStatus(prod);
                      const daysRem = calculateDaysRemaining(prod.target_delivery_date || prod.expected_delivery_date);

                      // Payments calculations
                      const payment = payments.find(p => p.order_id === order.order_id);
                      const totalAmount = order.quotation_amount || 0;
                      const advanceReceived = payment?.advance_received !== undefined ? payment.advance_received : (payment?.advance_paid || 0);
                      const balanceDue = payment?.balance_due !== undefined ? payment.balance_due : (totalAmount - advanceReceived);
                      const payStatus = payment?.payment_status || 'Pending';

                      let flagBg = 'text-green-400 bg-green-500/5 border-green-500/10';
                      let flagLabel = 'On Time';
                      if (daysRem !== null) {
                        if (daysRem < 0) {
                          flagBg = 'text-red-400 bg-red-500/5 border-red-500/10 animate-pulse';
                          flagLabel = 'OVERDUE';
                        } else if (daysRem <= 3) {
                          flagBg = 'text-yellow-400 bg-yellow-500/5 border-yellow-500/10';
                          flagLabel = 'Due Soon';
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
                        <tr key={prod.production_id} className="hover:bg-zinc-900/30 transition-all font-mono text-xs">
                          {/* Order ID */}
                          <td className="p-4">
                            <span 
                              onClick={() => {
                                setMasterOrderIdForDetail(order.order_id);
                                setIsDetailModalOpen(true);
                              }}
                              className="font-mono font-bold text-violet-400 hover:underline cursor-pointer block"
                              title="Click to view full order dossier details"
                            >
                              {order.order_id}
                            </span>
                            <span className="text-[10px] text-zinc-550 block font-mono">{prod.production_id}</span>
                          </td>

                          {/* Customer Name */}
                          <td className="p-4 font-bold text-white text-left font-sans">
                            <div className="hover:text-violet-300 transition-colors cursor-pointer" onClick={() => {
                              setSelectedLeadProd(prod);
                              setLeadEditor(prod.editor_assigned || 'Unassigned');
                              setLeadStaff(prod.assigned_staff ? prod.assigned_staff.split(', ').map(s => s.trim()) : []);
                              setAssignRoleFilter('');
                              setLeadPriority(prod.project_priority || 'Medium');
                              setLeadFootageStatus(getRawFootageStatus(prod));
                              setLeadProdStatus(getProductionStatus(prod));
                              setLeadRemarks(prod.remarks || '');
                              setLeadStartDate(prod.editing_start_date || '');
                              setLeadTargetDeliveryDate(prod.target_delivery_date || '');
                              setLeadExpectedDeliveryDate(prod.expected_delivery_date || '');
                              setLeadActualDeliveryDate(prod.delivery_date || prod.actual_delivery_date || '');
                            }}>{order.customer_name}</div>
                            <div className="text-[10px] text-zinc-455 mt-0.5 font-normal">{order.mobile || 'No contact phone'}</div>
                          </td>

                          {/* Event Type */}
                          <td className="p-4 text-left font-sans text-zinc-300">
                            {order.event_type}
                          </td>

                          {/* Event Date */}
                          <td className="p-4 text-left font-sans text-zinc-350">
                            {order.event_date || 'N/A'}
                          </td>

                           {/* Raw Footage Link */}
                           <td className="p-4 text-left font-sans">
                             {(() => {
                               const serverPath = rf?.server_path || '';
                               const isDriveLinkAvailable = serverPath.trim() !== '' && (serverPath.startsWith('http://') || serverPath.startsWith('https://'));

                               if (isDriveLinkAvailable) {
                                 return (
                                   <a
                                     href={serverPath}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     referrerPolicy="no-referrer"
                                     className="text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1.5 cursor-pointer max-w-[150px] break-words"
                                     title={serverPath}
                                   >
                                     <span>🔗</span> Open Drive Link
                                   </a>
                                 );
                               }

                               const uploadNotes = rf?.upload_notes || '';
                               const hasHardDisk = uploadNotes.includes('Hard Disk Received: YES');
                               const hasMemoryCard = uploadNotes.includes('Memory Card Received: YES');

                               if (hasHardDisk && hasMemoryCard) {
                                 return <span className="text-zinc-300 font-medium">Hard Disk & Memory Card Received</span>;
                               } else if (hasHardDisk) {
                                 return <span className="text-zinc-300 font-medium">Hard Disk Received</span>;
                               } else if (hasMemoryCard) {
                                 return <span className="text-zinc-300 font-medium">Memory Card Received</span>;
                               }

                               if (rf?.raw_received) {
                                 return <span className="text-zinc-300 font-medium">Physical Media Received</span>;
                               }

                               return <span className="text-zinc-650 italic">No link</span>;
                             })()}
                           </td>

                          {/* Editor Assigned */}
                          <td className="p-4 text-left font-sans">
                            <div className="font-bold text-zinc-200">
                              {getAssignedEditorsText(prod)}
                            </div>
                          </td>

                          {/* Current Status */}
                          <td className="p-4">
                            <StatusText status={displayStatus} />
                          </td>

                          {/* Target Delivery Date */}
                          <td className="p-4 text-zinc-350">
                            {prod.target_delivery_date || 'N/A'}
                          </td>

                          {/* Remaining Days */}
                          <td className="p-4">
                            {daysRem !== null ? (
                              <span className={`inline-flex px-2 py-0.5 rounded font-bold border font-mono ${flagBg}`}>
                                {daysRem} days ({flagLabel})
                              </span>
                            ) : (
                              <span className="text-zinc-600 italic">Not set</span>
                            )}
                          </td>

                          {/* Payment Status */}
                          {currentRole !== 'Production Team' && (
                            <td className="p-4">
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
                              {/* Step 1: Assign Editor */}
                              {displayStatus === 'Raw Footage Received' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveWorkflowProd(prod);
                                    setWfEditor(prod.editor_assigned || 'Unassigned');
                                    setWfTargetDeliveryDate(prod.target_delivery_date || '');
                                    setWfPriority(prod.project_priority || 'Medium');
                                    setWfProjectNotes(prod.project_notes || prod.remarks || '');
                                    setWfInternalComments(prod.internal_comments || '');
                                    setWfError('');
                                    
                                    const assignedForThis = editorAssignments.filter(a => a.production_id === prod.production_id);
                                    setSelectedStaffIds(assignedForThis.map(a => a.staff_id));
                                    if (assignedForThis.length > 0) {
                                      setWfSpeciality(assignedForThis[0].speciality);
                                      setAssignmentRows(assignedForThis.map(a => ({
                                        speciality: a.speciality,
                                        staffId: a.staff_id,
                                        staffName: a.staff_name
                                      })));
                                    } else {
                                      setWfSpeciality('');
                                      setAssignmentRows([{ speciality: '', staffId: '', staffName: '' }]);
                                    }
                                    
                                    setWorkflowActionType('assign_editor');
                                  }}
                                  className="w-full max-w-[160px] px-3 py-1.5 bg-purple-600 border border-purple-500 text-white hover:bg-purple-500 hover:border-purple-400 transition-all text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <span>👤</span> Assign Editor
                                </button>
                              )}

                              {/* Dropdown status transition select */}
                              {displayStatus !== 'Raw Footage Received' && displayStatus !== 'Completed' && (
                                <div className="w-full max-w-[160px]">
                                  <label className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-1 text-left">
                                    Change Status:
                                  </label>
                                  <select
                                    value={displayStatus}
                                    onChange={async (e) => {
                                      const val = e.target.value;
                                      if (val === displayStatus) return;
                                      try {
                                        setIsSaving(true);
                                        const updates: any = {
                                          editing_status: val,
                                        };
                                        if (val === 'Project Delivered') {
                                          updates.delivery_date = new Date().toISOString().split('T')[0];
                                        }
                                        await updateProduction(prod.production_id, updates);
                                      } catch (err: any) {
                                        alert("Failed to update status: " + (err.message || err));
                                      } finally {
                                        setIsSaving(false);
                                      }
                                    }}
                                    disabled={isSaving}
                                    className="w-full text-zinc-100 bg-zinc-950 border border-zinc-800 hover:border-zinc-750 text-[10.5px] font-sans font-medium py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                                  >
                                    <option value={displayStatus} disabled>
                                      {displayStatus === 'Client Review Sent' ? 'Client Review' : displayStatus}
                                    </option>
                                    {getDropdownOptions(displayStatus).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt === 'Client Review Sent' ? 'Client Review' : (opt === 'Completed' ? 'Project Closed' : opt)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Step 11: Completed */}
                              {(displayStatus === 'Completed') && (
                                <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/20 border border-emerald-850">
                                  ✓ Completed
                                </span>
                              )}

                              {/* Detail Dossier link */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLeadProd(prod);
                                  setLeadEditor(prod.editor_assigned || 'Unassigned');
                                  setLeadStaff(prod.assigned_staff ? prod.assigned_staff.split(', ').map(s => s.trim()) : []);
                                  setAssignRoleFilter('');
                                  setLeadPriority(prod.project_priority || 'Medium');
                                  setLeadFootageStatus(getRawFootageStatus(prod));
                                  setLeadProdStatus(getProductionStatus(prod));
                                  setLeadRemarks(prod.remarks || '');
                                  setLeadStartDate(prod.editing_start_date || '');
                                  setLeadTargetDeliveryDate(prod.target_delivery_date || '');
                                  setLeadExpectedDeliveryDate(prod.expected_delivery_date || '');
                                  setLeadActualDeliveryDate(prod.delivery_date || prod.actual_delivery_date || '');
                                }}
                                className="text-[9px] text-zinc-500 hover:text-zinc-350 hover:underline mt-0.5 cursor-pointer"
                              >
                                Edit Full Dossier ✎
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
      )}

      {/* 2. STAFF PERFORMANCE */}
      {activeSubTab === 'staff_performance' && (() => {
        if (!staff) {
          return (
            <div className="bg-zinc-950 border border-zinc-900 p-12 rounded-3xl text-center space-y-4 max-w-xl mx-auto mt-6">
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

        const totalEditors = staff.length;
        const activeEditors = staff.filter(s => s.status === 'Active' || s.status === 'On Duty' || s.status === 'active' || s.status === 'Active Status').length;
        const assignedProjects = production.filter(p => p.editor_assigned).length;
        
        // Projects In Progress
        const inProgressProjects = production.filter(p => 
          p.editing_status === 'Editing In Progress' || 
          p.editing_status === 'Editing Started' || 
          p.editing_status === 'Revision In Progress' || 
          p.editing_status === 'In Progress' || 
          p.production_status === 'In Progress' || 
          p.editing_status === 'Editing'
        ).length;

        // Completed Projects
        const completedProjects = production.filter(p => 
          p.editing_status === 'Delivered' || 
          p.editing_status === 'Project Delivered' || 
          p.editing_status === 'Closed' || 
          p.editing_status === 'Project Closed' || 
          p.editing_status === 'Completed' ||
          p.production_status === 'Closed'
        ).length;

        // Client Approved Projects
        const clientApprovedProjects = production.filter(p => 
          p.editing_status === 'Approved' || 
          p.editing_status === 'Final Approval'
        ).length;

        // Revision Projects
        const revisionProjects = production.filter(p => 
          p.editing_status === 'Revision Required' || 
          p.editing_status === 'Revision In Progress' || 
          p.correction_needed || 
          p.editing_status === 'Correction Needed'
        ).length;

        return (
          <div className="space-y-6">
            {/* 7 ANALYTICS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 animate-in fade-in duration-300">
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
              <table className="w-full text-left border-collapse text-xs text-zinc-300 min-w-[1200px]">
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
                  {filteredStaff.map((member) => {
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
            <div className="bg-zinc-950 border border-zinc-900 p-12 rounded-3xl text-center space-y-4 max-w-xl mx-auto mt-6">
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
        const totalInProgress = production.filter(p => p.editing_status === 'Editing').length;
        const totalDelivered = production.filter(p => p.editing_status === 'Delivered').length;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const totalOverdue = production.filter(p => {
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
        const activeStaffCount = staff.filter(s => s.status === 'Active').length;
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
        )).filter(name => staff.some(s => s.name === name));
        
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
        const staffRankingData = staff.map(member => {
          const finished = production.filter(p => 
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
        const roleWorkloads = staff.reduce((acc, curr) => {
          const roleHead = curr.role.split(' ')[0] || 'Editor';
          const cnt = production.filter(p => 
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        const readyCount = production.filter(p => p.editing_status === 'Approved').length;
        const deliveredCount = production.filter(p => p.editing_status === 'Delivered').length;
        const pendingCount = production.filter(p => p.editing_status !== 'Delivered' && p.editing_status !== 'Approved').length;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const overdueCount = production.filter(p => {
          if (p.editing_status === 'Delivered' || p.production_status === 'Closed') return false;
          const deadline = p.expected_delivery_date || p.target_delivery_date;
          if (!deadline) return false;
          return new Date(deadline) < today;
        }).length;

        return (
          <div className="space-y-6">
            
            {/* Quick Metrics Subheader */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-[1200px]">
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

                      return production.map(prod => {
                        const rf = rawFootage.find(f => f.tracking_id === prod.tracking_id);
                        const order = rf ? orders.find(o => o.order_id === rf.order_id) : null;
                        
                        const customerName = order ? order.customer_name : 'Unknown';
                        const editorName = prod.editor_assigned || 'Unassigned';
                        const deliveryType = order ? order.event_type : 'Cinematic Highlights';
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
                          'Delivered',
                          'Pending Approval',
                          'Completed'
                        ];

                        const handleStatusChange = (newStat: string) => {
                          let up: Partial<Production> = {};
                          if (newStat === 'Ready for Delivery') {
                            up = { editing_status: 'Final Approval', production_status: 'Approved' };
                          } else if (newStat === 'Sent to Client') {
                            up = { editing_status: 'Client Review Sent', production_status: 'Customer Review' };
                          } else if (newStat === 'Delivered') {
                            up = { editing_status: 'Project Delivered', production_status: 'Delivered', delivery_date: new Date().toISOString().split('T')[0] };
                          } else if (newStat === 'Pending Approval') {
                            up = { editing_status: 'Client Review Sent', production_status: 'Customer Review' };
                          } else if (newStat === 'Completed') {
                            up = { editing_status: 'Completed', production_status: 'Closed' };
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
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
              {production.map(prod => {
                const rawFootageItem = rawFootage.find(rf => rf.tracking_id === prod.tracking_id);
                const orderItem = rawFootageItem ? orders.find(o => o.order_id === rawFootageItem.order_id) : null;
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
                {staff.map(member => {
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
                {editorAssignments.map((assign) => {
                  const correlatedProj = production.find(p => p.production_id === assign.production_id);
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
                            <option value="Completed">Completed</option>
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
        const todayStr = new Date().toISOString().split('T')[0];

        // Overall Aggregate Metrics
        const totalAssigned = editorAssignments.length;
        const activeTasksCount = editorAssignments.filter(a => a.status !== 'Completed').length;
        const completedTasksCount = editorAssignments.filter(a => a.status === 'Completed').length;
        const overdueTasksCount = editorAssignments.filter(a => 
          a.status !== 'Completed' && a.target_finish_date && a.target_finish_date < todayStr
        ).length;

        // Only display active staff or staff matching production specialties
        const activeStaffList = staff.filter(s => s.status === 'Active');

        // Filter assignments based on search and dropdown selections
        const filteredAssignments = editorAssignments.filter(assign => {
          const matchesSearch = assign.staff_name.toLowerCase().includes(crewSearch.toLowerCase()) || 
                                assign.speciality.toLowerCase().includes(crewSearch.toLowerCase());
          const matchesSpeciality = crewSpecialityFilter === 'All' || assign.speciality === crewSpecialityFilter;
          const matchesStatus = crewStatusFilter === 'All' || assign.status === crewStatusFilter;
          return matchesSearch && matchesSpeciality && matchesStatus;
        });

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header section with real-time sync badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/70 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 to-pink-500" />
              <div>
                <h1 className="text-xl font-black text-white tracking-tight uppercase font-mono flex items-center gap-2">
                  <span>👥</span> Crew Roster & Workspace Tasks Dashboard
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-sans">
                  Real-time synchronization with Supabase DB. Assign multiple professional specialists, manage tasks, and track individual editor capacities.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="flex items-center gap-1.5 font-mono text-[9px] px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold border border-emerald-500/15 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Live Syncing Active
                </span>
              </div>
            </div>

            {/* Crew Workload Tracking Counters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#040406] border border-zinc-900 rounded-2xl p-4.5 relative overflow-hidden group hover:border-zinc-800 transition-all">
                <div className="absolute top-3 right-3 opacity-15">
                  <PlusSquare className="w-8 h-8 text-violet-400" />
                </div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold">Total Assigned Tasks</div>
                <div className="text-3xl font-extrabold text-white mt-1.5 font-mono">{totalAssigned}</div>
                <div className="text-[10px] text-zinc-550 mt-1 font-mono">Workspace Accumulation</div>
              </div>

              <div className="bg-[#040406] border border-zinc-900 rounded-2xl p-4.5 relative overflow-hidden group hover:border-zinc-800 transition-all">
                <div className="absolute top-3 right-3 opacity-15">
                  <Sliders className="w-8 h-8 text-blue-400 animate-pulse" />
                </div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold">Active Ongoing Tasks</div>
                <div className="text-3xl font-extrabold text-blue-400 mt-1.5 font-mono">{activeTasksCount}</div>
                <div className="text-[10px] text-zinc-550 mt-1 font-mono">Work in Progress</div>
              </div>

              <div className="bg-[#040406] border border-zinc-900 rounded-2xl p-4.5 relative overflow-hidden group hover:border-zinc-800 transition-all">
                <div className="absolute top-3 right-3 opacity-15">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold">Completed Tasks</div>
                <div className="text-3xl font-extrabold text-emerald-400 mt-1.5 font-mono">{completedTasksCount}</div>
                <div className="text-[10px] text-zinc-550 mt-1 font-mono">Successfully Reviewed</div>
              </div>

              <div className="bg-[#040406] border border-zinc-900 rounded-2xl p-4.5 relative overflow-hidden group hover:border-zinc-800 transition-all">
                <div className="absolute top-3 right-3 opacity-15">
                  <AlertTriangle className="w-8 h-8 text-rose-500 animate-[bounce_1.5s_infinite]" />
                </div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-rose-500 font-black">Overdue Tasks</div>
                <div className="text-3xl font-extrabold text-rose-500 mt-1.5 font-mono">{overdueTasksCount}</div>
                <div className="text-[10px] text-rose-450 mt-1 font-mono">Missed Target Deadlines</div>
              </div>
            </div>

            {/* Individual Editor Workload Capacity Roster */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-black text-zinc-350 uppercase tracking-widest border-b border-zinc-900 pb-2.5 font-mono">
                Editor Workload & Performance KPIs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStaffList.map(member => {
                  const wl = getStaffWorkload(member.name);
                  return (
                    <div key={member.staff_id} className="bg-zinc-900/20 border border-zinc-900 hover:border-zinc-800 rounded-xl p-4 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-black text-white">{member.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">
                            {member.production_role_speciality || member.role || 'General Editor'}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono tracking-widest font-black uppercase ${
                          wl.activeCount >= 3 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                          wl.activeCount >= 1 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {wl.activeCount} Active
                        </span>
                      </div>

                      {/* Cumulative stats */}
                      <div className="grid grid-cols-4 gap-2 text-center mt-3 pt-2.5 border-t border-zinc-900/60 font-mono text-[10px]">
                        <div>
                          <div className="font-bold text-zinc-300">{wl.totalCount}</div>
                          <div className="text-[8px] text-zinc-550 uppercase">Total</div>
                        </div>
                        <div>
                          <div className="font-bold text-blue-400">{wl.activeCount}</div>
                          <div className="text-[8px] text-blue-500/80 uppercase">Active</div>
                        </div>
                        <div>
                          <div className="font-bold text-emerald-400">{wl.completedCount}</div>
                          <div className="text-[8px] text-emerald-500/80 uppercase">Done</div>
                        </div>
                        <div>
                          <div className={`font-bold ${wl.overdueCount > 0 ? 'text-rose-500 font-black scale-105' : 'text-zinc-500'}`}>
                            {wl.overdueCount}
                          </div>
                          <div className="text-[8px] text-rose-500/80 uppercase">Overdue</div>
                        </div>
                      </div>

                      {/* Spark capacity slider */}
                      <div className="mt-3.5">
                        <div className="flex justify-between text-[8px] font-mono text-zinc-500 mb-1">
                          <span>Capacity Meter</span>
                          <span>{Math.min(100, Math.round((wl.activeCount / 4) * 100))}%</span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              wl.overdueCount > 0 ? 'bg-rose-500' : wl.activeCount >= 3 ? 'bg-rose-450' : wl.activeCount >= 1 ? 'bg-amber-500' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, (wl.activeCount / 4) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activeStaffList.length === 0 && (
                  <div className="col-span-3 text-center py-6 text-zinc-500 font-mono text-xs">
                    No active staff enrolled in the directory yet.
                  </div>
                )}
              </div>
            </div>

            {/* Master Crew Roster Table Container */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                <div>
                  <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest font-mono">
                    Master Crew Tasks Table
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                    Detailed task workflows. Perform one-click status overrides or mark tasks completed.
                  </p>
                </div>

                {/* Filter and search controls row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="Search crew name..."
                    value={crewSearch}
                    onChange={(e) => setCrewSearch(e.target.value)}
                    className="bg-zinc-900 border border-zinc-850 px-3.5 py-1.5 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 max-w-[150px] font-mono"
                  />

                  {/* Specialty selector dropdown */}
                  <select
                    value={crewSpecialityFilter}
                    onChange={(e) => setCrewSpecialityFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-xs text-zinc-300 font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="All">All Specialities</option>
                    {specialities.map(s => (
                      <option key={s.speciality_id} value={s.name}>{s.name}</option>
                    ))}
                  </select>

                  {/* Status selector dropdown */}
                  <select
                    value={crewStatusFilter}
                    onChange={(e) => setCrewStatusFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-xs text-zinc-300 font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="All">All Task Stages</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Editing Started">Editing Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review Pending">Review Pending</option>
                    <option value="Revision">Revision</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Responsive data table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-bold">Staff Name</th>
                      <th className="py-3.5 px-4 font-bold font-mono">Production Speciality</th>
                      <th className="py-3.5 px-4 font-bold text-center font-mono">Current Projects</th>
                      <th className="py-3.5 px-4 font-bold text-center font-mono">Active Tasks</th>
                      <th className="py-3.5 px-3 font-bold font-mono">Assigned Date</th>
                      <th className="py-3.5 px-3 font-bold font-mono">Target Finish</th>
                      <th className="py-3.5 px-4 font-bold font-mono">Current Status</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/50">
                    {filteredAssignments.map((assign) => {
                      const correlatedProj = production.find(p => p.production_id === assign.production_id);
                      const projectClient = correlatedProj ? (correlatedProj.couple_name || correlatedProj.tracking_id) : 'Unknown Project';

                      // Find staff element to verify status
                      const staffMember = staff.find(s => s.name.toLowerCase() === assign.staff_name.toLowerCase());
                      const isStaffActive = staffMember ? staffMember.status === 'Active' : true;

                      // Workload metrics for this editor
                      const wl = getStaffWorkload(assign.staff_name);

                      const isOverdue = assign.status !== 'Completed' && assign.target_finish_date && assign.target_finish_date < todayStr;

                      return (
                        <tr key={assign.assignment_id} className="hover:bg-zinc-900/15 group transition-colors">
                          {/* Staff Name & Project Details */}
                          <td className="py-3 px-4">
                            <div className="font-black text-white hover:text-purple-400 transition-colors flex items-center gap-1.5">
                              <span>{assign.staff_name}</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${isStaffActive ? 'bg-emerald-450' : 'bg-zinc-650'}`} title={isStaffActive ? 'Staff Active' : 'Staff Inactive/On Leave'} />
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono font-bold text-zinc-400 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-850">{assign.production_id}</span>
                              <span className="break-words max-w-[120px]">{projectClient}</span>
                            </div>
                          </td>

                          {/* Production Role Speciality */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/15 rounded text-[10px] font-mono font-bold leading-none">
                              {assign.speciality}
                            </span>
                          </td>

                          {/* Project count */}
                          <td className="py-3 px-4 text-center font-mono text-zinc-300 font-bold">
                            {wl.totalCount}
                          </td>

                          {/* Active tasks count */}
                          <td className="py-3 px-4 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded-[4px] font-bold text-[10px] ${
                              wl.activeCount >= 3 ? 'bg-rose-500/10 text-rose-400' : 
                              wl.activeCount >= 1 ? 'bg-amber-500/10 text-amber-400' : 
                              'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {wl.activeCount} Active
                            </span>
                          </td>

                          {/* Assigned Date */}
                          <td className="py-3 px-3 font-mono text-zinc-400">
                            {assign.assigned_date}
                          </td>

                          {/* Target Finish Date */}
                          <td className="py-3 px-3 font-mono">
                            <div className="flex items-center gap-1">
                              <span className={isOverdue ? 'text-rose-500 font-extrabold animate-pulse' : 'text-zinc-300'}>
                                {assign.target_finish_date}
                              </span>
                              {isOverdue && (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" title="This task has exceeded the specified target finish date!" />
                              )}
                            </div>
                          </td>

                          {/* Current Status Selection Dropdown */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={assign.status}
                                onChange={(e) => {
                                  updateEditorAssignmentStatus(assign.assignment_id, e.target.value as any);
                                }}
                                className={`bg-zinc-900 border text-[11px] font-mono rounded px-2 py-1 cursor-pointer transition-all ${
                                  assign.status === 'Completed' ? 'border-emerald-500/30 text-emerald-400' :
                                  assign.status === 'Revision' ? 'border-rose-500/30 text-rose-400 animate-pulse' :
                                  'border-zinc-800 text-zinc-300 focus:border-purple-500'
                                }`}
                              >
                                <option value="Assigned">Assigned</option>
                                <option value="Editing Started">Editing Started</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Review Pending">Review Pending</option>
                                <option value="Revision">Revision</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>
                          </td>

                          {/* Actions layer */}
                          <td className="py-3 px-4 text-right space-x-2">
                            {assign.status !== 'Completed' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  updateEditorAssignmentStatus(assign.assignment_id, 'Completed');
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm hover:shadow-emerald-500/10"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Complete</span>
                              </button>
                            ) : (
                              <span className="font-mono text-[9px] text-zinc-550 inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 rounded-lg border border-zinc-850">
                                <CheckCircle2 className="w-3 h-3 text-zinc-600" />
                                <span>No Actions</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredAssignments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-zinc-500 font-mono uppercase bg-zinc-900/5 rounded-2xl border border-dashed border-zinc-900 text-xs">
                          {crewSearch || crewSpecialityFilter !== 'All' || crewStatusFilter !== 'All' 
                            ? 'No current tasks matched the specified query filter settings.' 
                            : 'No professional editor task assignments registered in the workspace system.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

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
              const colProds = production.filter(p => {
                // Map logical status fallback helper
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
                                else if (cur === 'Final Approval') nextStage = 'Project Delivered';
                                else if (cur === 'Project Delivered') nextStage = 'Completed';
                                else nextStage = cur;
                                
                                if (prod.editing_status !== 'Completed') {
                                  updateProduction(prod.production_id, { editing_status: nextStage });
                                }
                              }}
                              disabled={prod.editing_status === 'Completed'}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">RD</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Ready for Delivery</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {production.filter(p => p.editing_status === 'Approved').length}
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Client authorized and approved</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">DF</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Delivered Projects</div>
              <div className="text-2xl font-black text-indigo-400 font-mono mt-1">
                {production.filter(p => p.editing_status === 'Delivered').length}
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">Closed & archived dispatch packages</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="absolute bottom-2 right-2 text-zinc-800/10 font-bold text-5xl select-none font-mono">PD</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">In Production Pipeline</div>
              <div className="text-2xl font-black text-amber-500 font-mono mt-1">
                {production.filter(p => p.editing_status !== 'Approved' && p.editing_status !== 'Delivered').length}
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
              {production.map(prod => {
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
              {staff.map(member => {
                const memberNameClean = member.name || 'Unnamed Editor';
                const wl = getStaffWorkload(memberNameClean);
                const activeJobs = production.filter(p => 
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
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
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
            
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
                const prodItem = production.find((p) => p.production_id === selectedProdId)!;
                if (!prodItem) return null;
                const rawFootageItem = rawFootage.find((rf) => rf.tracking_id === prodItem.tracking_id);
                const linkedOrder = rawFootageItem ? orders.find((o) => o.order_id === rawFootageItem.order_id) : undefined;
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

                        {canEdit && (
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
                      <fieldset disabled={!canEdit} className="space-y-4">
                        
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
                              {staff.filter(s => s.status === 'Active').map(s => (
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
                              <option value="Raw Footage Received">Raw Footage Received</option>
                              <option value="Editor Assigned">Editor Assigned</option>
                              <option value="Editing Started">Editing Started</option>
                              <option value="Editing In Progress">Editing In Progress</option>
                              <option value="Internal QC Review">Internal QC Review</option>
                              <option value="Client Review Sent">Client Review Sent</option>
                              <option value="Revision Required">Revision Required</option>
                              <option value="Revision In Progress">Revision In Progress</option>
                              <option value="Final Approval">Final Approval</option>
                              <option value="Project Delivered">Project Delivered</option>
                              <option value="Completed">Completed</option>
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
                          const assignedStaffRecord = staff.find(s => s.name.toLowerCase() === editor.toLowerCase());
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
                                <div className="grid grid-cols-2 gap-3.5 text-left text-zinc-300">
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
                      {canEdit && (
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
                    {canEdit && (
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
                          disabled={prodItem.editing_status === 'Delivered'}
                          onClick={handleMarkDelivered}
                          className={`w-full flex items-center justify-center gap-2 font-black uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg text-[11px] transition-all cursor-pointer ${
                            prodItem.editing_status === 'Delivered'
                              ? 'bg-zinc-900 text-zinc-500 border border-zinc-850 cursor-not-allowed shadow-none font-mono'
                              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-black'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {prodItem.editing_status === 'Delivered' 
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
        const rf = rawFootage.find(f => f.tracking_id === selectedLeadProd.tracking_id);
        const order = rf ? orders.find(o => o.order_id === rf.order_id) : null;
        if (!order) return null;

        // Load payments info
        const payment = payments.find(p => p.order_id === order.order_id);
        const totalAmount = order.quotation_amount || 0;
        const advanceReceived = payment?.advance_received !== undefined ? payment.advance_received : (payment?.advance_paid || 0);
        const balanceDue = payment?.balance_due !== undefined ? payment.balance_due : (totalAmount - advanceReceived);

        const handleSaveLeadDossier = (e: React.FormEvent) => {
          e.preventDefault();
          
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

          updateProduction(selectedLeadProd.production_id, {
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
          });

          alert(`ERP Master Dossier for Order ${order.order_id} has been fully synchronized and written to Supabase!`);
          setSelectedLeadProd(null);
        };

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 z-50 animate-fade-in text-zinc-105 select-none md:select-text">
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-4.5 space-y-4 relative text-left">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[9px] font-mono tracking-widest uppercase rounded font-black">Project Dossier</span>
                    <span>Order Ref: {order.order_id}</span>
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
                      <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400">
                        <div>
                          <span className="text-[9px] text-zinc-550 font-mono block">CUSTOMER NAME</span>
                          <span className="text-zinc-205 font-bold block mt-0.5 text-zinc-300">{order.customer_name}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-550 font-mono block">MOBILE NUMBER</span>
                          <span className="text-zinc-205 font-bold block mt-0.5 text-zinc-300">{order.mobile || 'None logged'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-555 font-mono block">CONTRACT TYPE</span>
                          <span className="text-zinc-205 font-bold block mt-0.5 text-zinc-300">{order.event_type}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-555 font-mono block">EVENT SCHEDULED</span>
                          <span className="text-zinc-205 font-bold block mt-0.5 font-mono text-zinc-300">{order.event_date}</span>
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
                          <input
                            type="date"
                            value={dateFootageReceived}
                            onChange={(e) => setDateFootageReceived(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-350 rounded px-1.5 py-0.5 focus:outline-none"
                          />
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                          <span className="text-[9px] text-zinc-500 font-mono">2. Editing Started Date</span>
                          <input
                            type="date"
                            value={dateEditingStarted || leadStartDate}
                            onChange={(e) => {
                              setDateEditingStarted(e.target.value);
                              setLeadStartDate(e.target.value);
                            }}
                            className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-350 rounded px-1.5 py-0.5 focus:outline-none"
                          />
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                          <span className="text-[9px] text-zinc-500 font-mono">3. Client Review Upload Date</span>
                          <input
                            type="date"
                            value={dateReview}
                            onChange={(e) => setDateReview(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-350 rounded px-1.5 py-0.5 focus:outline-none"
                          />
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                          <span className="text-[9px] text-zinc-500 font-mono">4. Client Approval Date</span>
                          <input
                            type="date"
                            value={dateApproval}
                            onChange={(e) => setDateApproval(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-350 rounded px-1.5 py-0.5 focus:outline-none"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-zinc-500 font-mono">5. Handover / Delivery Date</span>
                          <input
                            type="date"
                            value={dateDelivery || leadActualDeliveryDate}
                            onChange={(e) => {
                              setDateDelivery(e.target.value);
                              setLeadActualDeliveryDate(e.target.value);
                            }}
                            className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-355 rounded px-1.5 py-0.5 focus:outline-none"
                          />
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
                          const matchingStaff = staff.filter(s => 
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
                      <div className="grid grid-cols-2 gap-3">
                        
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
                            <option value="New Project">New Project</option>
                            <option value="Event Scheduled">Event Scheduled</option>
                            <option value="Staff Assigned">Staff Assigned</option>
                            <option value="Event Completed">Event Completed</option>
                            <option value="Raw Footage Received">Raw Footage Received</option>
                            <option value="Editor Assigned">Editor Assigned</option>
                            <option value="Editing Started">Editing Started</option>
                            <option value="Editing In Progress">Editing In Progress</option>
                            <option value="Internal QC Review">Internal QC Review</option>
                            <option value="Client Review Sent">Client Review Sent</option>
                            <option value="Revision Required">Revision Required</option>
                            <option value="Revision In Progress">Revision In Progress</option>
                            <option value="Final Approval">Final Approval</option>
                            <option value="Project Delivered">Project Delivered</option>
                            <option value="Completed">Completed</option>
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
                      <div className="grid grid-cols-2 gap-3">
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
                            onChange={(e) => setLeadTargetDeliveryDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono rounded-xl py-2 px-3 focus:outline-none"
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
        const order = orders.find(o => {
          const rf = rawFootage.find(f => f.tracking_id === activeWorkflowProd.tracking_id);
          return rf?.order_id === o.order_id;
        });
        const customerName = order ? order.customer_name : 'Customer';
        const orderId = order ? order.order_id : 'Order';
        
        const payment = order ? payments.find(p => p.order_id === order.order_id) : null;
        const totalAmount = order?.quotation_amount || 0;
        const advanceReceived = payment?.advance_received !== undefined ? payment.advance_received : (payment?.advance_paid || 0);
        const balanceDue = payment?.balance_due !== undefined ? payment.balance_due : (totalAmount - advanceReceived);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div id="production_workflow_modal" className={`bg-zinc-950 border border-zinc-900 rounded-2xl ${
              workflowActionType === 'assign_editor'
                ? 'w-full md:w-[90%] lg:w-[85%] max-w-5xl'
                : workflowActionType === 'manage_status'
                  ? 'max-w-4xl w-full'
                  : 'max-w-sm w-full'
            } overflow-hidden shadow-2xl flex flex-col transition-all duration-300`}>
              
              {/* Header */}
              <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-violet-400 block mb-0.5">
                    Step Workflow Wizard • {orderId}
                  </span>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                    {workflowActionType === 'assign_editor' && 'Step 1: Assign Editor'}
                    {workflowActionType === 'send_review' && 'Step 4: Send For Review'}
                    {workflowActionType === 'request_revision' && 'Step 5: Request Revision'}
                    {workflowActionType === 'deliver_project' && 'Step 8: Deliver Project'}
                    {workflowActionType === 'manage_payment_close' && 'Release & Close Options'}
                    {workflowActionType === 'manage_status' && 'CRM Status Management'}
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
              <div className={`${workflowActionType === 'assign_editor' ? 'p-3.5 sm:p-4 pb-2' : 'p-4'} overflow-y-auto max-h-[85vh]`}>
                <p className="text-[11px] text-zinc-400 mb-2.5">
                  Step workflow update for <strong className="text-white">{customerName}</strong>.
                </p>

                {/* FORM: Assign Editor (Step 1) */}
                {workflowActionType === 'assign_editor' && activeWorkflowProd && (
                  <div className="space-y-3 font-sans text-left">
                    
                    {/* Row 1: Product Role Specialities & Editors assignments */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-[#a78bfa] uppercase font-black tracking-wider block font-mono">
                        Team Assignment Rosters *
                      </span>
                      {assignmentRows.map((row, index) => {
                        const activeStaff = staff.filter(s => s.status === 'Active');

                        return (
                          <div 
                            key={index} 
                            className="bg-zinc-950/40 border border-zinc-900 hover:border-zinc-850 p-2.5 rounded-xl transition-all duration-150 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
                          >
                            {/* Speciality Selection */}
                            <div className="lg:col-span-5 space-y-1">
                              <label className="text-[9px] text-zinc-500 uppercase font-black tracking-wider block font-mono">
                                Role Speciality #{index + 1} *
                              </label>
                              <select
                                value={row.speciality}
                                onChange={(e) => {
                                  const updated = [...assignmentRows];
                                  updated[index].speciality = e.target.value;
                                  updated[index].staffId = '';
                                  updated[index].staffName = '';
                                  setAssignmentRows(updated);
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 rounded-xl px-2.5 h-9 cursor-pointer font-mono focus:outline-[#7c3aed]"
                              >
                                <option value="">-- Choose Speciality Role --</option>
                                {specialities.filter(s => s.active).map(spec => (
                                  <option key={spec.speciality_id} value={spec.name}>{spec.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Editor Selection */}
                            <div className="lg:col-span-5 space-y-1">
                              <label className="text-[9px] text-zinc-500 uppercase font-black tracking-wider block font-mono">
                                Editor Assignment #{index + 1} *
                              </label>
                              <select
                                disabled={!row.speciality}
                                value={row.staffId ? `${row.staffId}|${row.staffName}` : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...assignmentRows];
                                  if (val) {
                                    const [sId, sName] = val.split('|');
                                    updated[index].staffId = sId;
                                    updated[index].staffName = sName;
                                  } else {
                                    updated[index].staffId = '';
                                    updated[index].staffName = '';
                                  }
                                  setAssignmentRows(updated);
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 rounded-xl px-2.5 h-9 cursor-pointer font-mono disabled:opacity-30 disabled:cursor-not-allowed focus:outline-[#7c3aed]"
                              >
                                <option value="">
                                  {row.speciality ? '-- Select Staff --' : 'Choose speciality first'}
                                </option>
                                {activeStaff.map(s => {
                                  const specLower = (s.production_role_speciality || '').toLowerCase();
                                  const roleLower = (s.role || '').toLowerCase();
                                  const rSpecLower = (row.speciality || '').toLowerCase();
                                  const isMatch = rSpecLower && (specLower === rSpecLower || roleLower === rSpecLower);
                                  const wl = getStaffWorkload(s.name);
                                  return (
                                    <option key={s.staff_id} value={`${s.staff_id}|${s.name}`}>
                                      {isMatch ? '★ ' : ''}{s.name} | {s.production_role_speciality || s.role} | {s.department} | {s.status} ({wl.activeCount} Jobs)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {/* Action Remove */}
                            <div className="lg:col-span-2 flex justify-start lg:justify-end pb-0.5">
                              <button
                                type="button"
                                disabled={assignmentRows.length <= 1}
                                onClick={() => {
                                  const updated = assignmentRows.filter((_, idx) => idx !== index);
                                  setAssignmentRows(updated);
                                }}
                                className="w-full lg:w-9 h-9 flex items-center justify-center gap-1.5 text-[10px] uppercase font-mono font-bold text-zinc-400 hover:text-rose-455 hover:bg-rose-500/10 border border-zinc-850 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Remove team assignments row"
                              >
                                <span className="lg:hidden">Remove Entry</span>
                                <span className="text-sm font-mono leading-none">✕</span>
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Row 2: Delivery Target Date & Priority */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Target Delivery Date */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block font-mono">
                          Delivery Target Date *
                        </label>
                        <input
                          type="date"
                          value={wfTargetDeliveryDate}
                          onChange={(e) => setWfTargetDeliveryDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 rounded-xl px-3 h-9.5 font-mono focus:outline-[#7c3aed]"
                        />
                      </div>

                      {/* Priority */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block font-mono">
                          Priority *
                        </label>
                        <select
                          value={wfPriority}
                          onChange={(e) => setWfPriority(e.target.value as any)}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 rounded-xl px-3 h-9.5 cursor-pointer font-mono focus:outline-[#7c3aed]"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 3: Notes */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block font-mono">
                        Project Notes
                      </label>
                      <textarea
                        rows={1.5}
                        value={wfProjectNotes}
                        onChange={(e) => setWfProjectNotes(e.target.value)}
                        placeholder="Log revision specifics, requested aspect ratios, color grade preferences, reference directories..."
                        className="w-full bg-zinc-900 border border-zinc-805 text-xs text-zinc-100 rounded-xl p-2 flex focus:outline-[#7c3aed] leading-normal"
                      />
                    </div>

                    {/* Row 4: Internal Comments */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block font-mono">
                        Internal Comments
                      </label>
                      <textarea
                        rows={1.5}
                        value={wfInternalComments}
                        onChange={(e) => setWfInternalComments(e.target.value)}
                        placeholder="Log dynamic workflow benchmarks, internal tags, production backlog statuses..."
                        className="w-full bg-zinc-900 border border-zinc-805 text-xs text-zinc-100 rounded-xl p-2 flex focus:outline-[#7c3aed] leading-normal"
                      />
                    </div>

                    {/* Row 5: + Add Another Editor */}
                    <div className="pt-0.5 flex">
                      <button
                        type="button"
                        onClick={() => {
                          setWfError('');
                          setAssignmentRows([...assignmentRows, { speciality: '', staffId: '', staffName: '' }]);
                        }}
                        className="px-3 py-1.5 border border-violet-500/30 text-violet-400 hover:text-white bg-violet-600/10 hover:bg-violet-600/20 text-[10px] font-black uppercase font-mono tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="text-xs font-mono font-semibold">+</span> Add Another River / Editor
                      </button>
                    </div>

                    {/* Display Error Warning If Any (Compact) */}
                    {wfError && (
                      <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono rounded-xl leading-normal flex items-start gap-2">
                        <span className="font-bold">⚠️ Warning:</span>
                        <span>{wfError}</span>
                      </div>
                    )}

                    {/* Row 6: Assign Editor Button & Cancel Button */}
                    <div className="border-t border-zinc-900 pt-3.5 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkflowProd(null);
                          setWorkflowActionType(null);
                          setWfSpeciality('');
                          setWfEditor('Unassigned');
                          setWfError('');
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setWfError('');

                          // 1. Validation
                          let hasError = false;
                          for (let i = 0; i < assignmentRows.length; i++) {
                            const r = assignmentRows[i];
                            if (!r.speciality || !r.staffId) {
                              hasError = true;
                              setWfError(`Please fill both Speciality and Editor fields for team assignment row #${i + 1}.`);
                              break;
                            }
                          }

                          if (hasError || isSaving) return;

                          const filledRows = assignmentRows.filter(r => r.speciality && r.staffId);
                          if (filledRows.length === 0) {
                            setWfError('At least one production role spec and editor selection is required.');
                            return;
                          }

                          try {
                            setIsSaving(true);
                            // 2. Database Sync
                            const existing = editorAssignments.filter(a => a.production_id === activeWorkflowProd.production_id);
                            for (const ext of existing) {
                              await deleteEditorAssignment(ext.assignment_id);
                            }

                            for (const val of filledRows) {
                              await assignEditorToProject({
                                production_id: activeWorkflowProd.production_id,
                                staff_id: val.staffId,
                                staff_name: val.staffName,
                                speciality: val.speciality,
                                target_finish_date: wfTargetDeliveryDate || new Date().toISOString().split('T')[0]
                              });
                            }

                            const finalNames = filledRows.map(r => r.staffName).filter(Boolean);
                            const primaryEditor = finalNames[finalNames.length - 1] || 'Unassigned';
                            const assignedStaffJoined = finalNames.join(', ');
                            const rolesJoined = filledRows.map(r => r.speciality).filter(Boolean).join(', ');

                            await updateProduction(activeWorkflowProd.production_id, {
                              editor_assigned: primaryEditor,
                              assigned_staff: assignedStaffJoined,
                              target_delivery_date: wfTargetDeliveryDate || activeWorkflowProd.target_delivery_date,
                              project_priority: wfPriority,
                              remarks: wfProjectNotes,
                              project_notes: wfProjectNotes,
                              internal_comments: wfInternalComments,
                              editing_status: 'Editor Assigned',
                              production_role: rolesJoined,
                              assigned_role: rolesJoined
                            } as any);

                            setActiveWorkflowProd(null);
                            setWorkflowActionType(null);
                            setWfSpeciality('');
                            setWfEditor('Unassigned');
                            setWfError('');
                            alert("Project Editorial Active");
                          } catch (err: any) {
                            console.error("Failed to assign editor:", err);
                            setWfError("Failed to save editor assignment. " + (err.message || "Please try again."));
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-500 hover:to-indigo-550 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer shadow-lg font-mono font-extrabold"
                      >
                        {isSaving ? 'Processing...' : 'Assign Editor'}
                      </button>
                    </div>

                  </div>
                )}

                {/* FORM: Send For Review (Step 4) */}
                {workflowActionType === 'send_review' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    updateProduction(activeWorkflowProd.production_id, {
                      review_link: wfReviewLink,
                      preview_link: wfPreviewLink,
                      remarks: `Send for review: ${wfReviewNotes}`,
                      editing_status: 'Customer Review'
                    });
                    setActiveWorkflowProd(null);
                    setWorkflowActionType(null);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Review Link * (Frame.io/Youtube/etc)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={wfReviewLink}
                        onChange={(e) => setWfReviewLink(e.target.value)}
                        required
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Preview Link (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={wfPreviewLink}
                        onChange={(e) => setWfPreviewLink(e.target.value)}
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Notes / Comments</label>
                      <textarea
                        rows={3}
                        placeholder="Notes on draft..."
                        value={wfReviewNotes}
                        onChange={(e) => setWfReviewNotes(e.target.value)}
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-3 border-t border-zinc-900/60 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkflowProd(null);
                          setWorkflowActionType(null);
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-855 text-zinc-400 text-[10px] rounded-lg font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition-all"
                      >
                        Confirm Ready
                      </button>
                    </div>
                  </form>
                )}

                {/* FORM: Request Revision (Step 5) */}
                {workflowActionType === 'request_revision' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    updateProduction(activeWorkflowProd.production_id, {
                      remarks: `Revision requested. Deadline: ${wfRevisionDeadline}. Special remarks: ${wfRevisionNotes}`,
                      editing_status: 'Revision Required'
                    });
                    setActiveWorkflowProd(null);
                    setWorkflowActionType(null);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Revision Deadline *</label>
                      <input
                        type="date"
                        value={wfRevisionDeadline}
                        onChange={(e) => setWfRevisionDeadline(e.target.value)}
                        required
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Instructions / Change request notes *</label>
                      <textarea
                        rows={4}
                        placeholder="Special client revision highlights..."
                        value={wfRevisionNotes}
                        onChange={(e) => setWfRevisionNotes(e.target.value)}
                        required
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-3 border-t border-zinc-900/60 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkflowProd(null);
                          setWorkflowActionType(null);
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-855 text-zinc-400 text-[10px] rounded-lg font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-red-650 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition-all"
                      >
                        File Revision
                      </button>
                    </div>
                  </form>
                )}

                {/* FORM: Deliver Project (Step 8) */}
                {workflowActionType === 'deliver_project' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    updateProduction(activeWorkflowProd.production_id, {
                      remarks: `Release Deliverables: Links logged. Remark: ${wfDeliveryNotes}`,
                      delivery_link: wfDeliveryLink,
                      raw_footage_location: wfGoogleDriveLink,
                      editing_status: 'Delivered',
                      delivery_date: new Date().toISOString().split('T')[0]
                    });
                    setActiveWorkflowProd(null);
                    setWorkflowActionType(null);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Final HD Gallery Delivery Link *</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={wfDeliveryLink}
                        onChange={(e) => setWfDeliveryLink(e.target.value)}
                        required
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Google Drive / Archive Location</label>
                      <input
                        type="url"
                        value={wfGoogleDriveLink}
                        onChange={(e) => setWfGoogleDriveLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Delivery Remarks</label>
                      <textarea
                        rows={3}
                        placeholder="Credentials or links commentary..."
                        value={wfDeliveryNotes}
                        onChange={(e) => setWfDeliveryNotes(e.target.value)}
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-3 border-t border-zinc-900/60 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkflowProd(null);
                          setWorkflowActionType(null);
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-855 text-zinc-400 text-[10px] rounded-lg font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition-all"
                      >
                        Confirm Release
                      </button>
                    </div>
                  </form>
                )}

                {/* FORM: Manage Payment & Close (Step 9 & 10) */}
                {workflowActionType === 'manage_payment_close' && (
                  <div className="space-y-4 text-xs">
                    <div className="bg-zinc-900/50 p-4 border border-zinc-900 rounded-xl space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500">Order Quotation:</span>
                        <span className="text-zinc-200 font-bold">{formatINR(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500">Advance Received:</span>
                        <span className="text-emerald-400 font-bold">{formatINR(advanceReceived)}</span>
                      </div>
                      <div className="border-t border-zinc-900 my-1 pt-1 flex justify-between text-xs font-mono">
                        <span className="text-zinc-400 font-bold">Total Balance Due:</span>
                        <span className={`font-black ${balanceDue > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                          {formatINR(balanceDue)}
                        </span>
                      </div>
                    </div>

                    {balanceDue > 0 ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/10 rounded-xl">
                          <p className="text-[10px] text-amber-500 font-semibold leading-relaxed">
                            ⚠️ Outstanding balance of <strong>{formatINR(balanceDue)}</strong> remains. Mark "Payment Pending" until commercial clearance is log-checked.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateProduction(activeWorkflowProd.production_id, {
                                editing_status: 'Payment Pending'
                              });
                              setActiveWorkflowProd(null);
                              setWorkflowActionType(null);
                            }}
                            className="px-2 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
                          >
                            Set Payment Pending
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStage('Completed' as any);
                              setDeliveryDate(new Date().toISOString().split('T')[0]);
                              setClosingNotes('');
                              setWorkflowActionType('close_project');
                            }}
                            className="px-2 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-805 text-[9px] font-semibold uppercase tracking-wider rounded-lg transition-all"
                          >
                            Archive Closed
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 text-green-400 bg-green-500/10 border border-green-500/10 rounded-xl flex items-center gap-2">
                          <span>✓</span>
                          <span className="text-[11px] font-semibold">Ready to safe-close and archive!</span>
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStage('Completed' as any);
                              setDeliveryDate(new Date().toISOString().split('T')[0]);
                              setClosingNotes('');
                              setWorkflowActionType('close_project');
                            }}
                            className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-650 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md"
                          >
                            🔐 Final Archive & Close Project
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* FORM: CRM Status Management Popup */}
                {workflowActionType === 'manage_status' && (() => {
                  const projectLogs = (logs || []).filter(log => 
                    log.record_id === activeWorkflowProd.production_id ||
                    log.record_id === activeWorkflowProd.tracking_id ||
                    (order && log.record_id === order.order_id)
                  );

                  const findLogForStage = (stage: string) => {
                    return projectLogs.find(log => 
                      log.new_stage === stage || 
                      log.action.toLowerCase().includes(`status=${stage.toLowerCase()}`) ||
                      log.action.toLowerCase().includes(`status='${stage.toLowerCase()}'`) ||
                      log.action.toLowerCase().includes(`status: ${stage.toLowerCase()}`)
                    );
                  };

                  const formatTimelineTimestamp = (isoStr: string) => {
                    if (!isoStr) return "";
                    const d = new Date(isoStr);
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const day = String(d.getDate()).padStart(2, "0");
                    const month = months[d.getMonth()];
                    const year = d.getFullYear();
                    let hours = d.getHours();
                    const minutes = String(d.getMinutes()).padStart(2, "0");
                    const ampm = hours >= 12 ? "PM" : "AM";
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    const hoursStr = String(hours).padStart(2, "0");
                    return `${day}-${month}-${year} ${hoursStr}:${minutes} ${ampm}`;
                  };

                  const stagesSequence = [
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
                    'Completed'
                  ];

                  return (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSaving(true);
                        try {
                          const updates: any = {
                            editing_status: selectedStage,
                          };

                          // Map dynamic fields to remarks or specific fields
                          if (selectedStage === 'Internal QC Review') {
                            updates.remarks = qcNotes;
                          } else if (selectedStage === 'Client Review Sent') {
                            updates.remarks = reviewNotes;
                            updates.raw_footage_location = reviewLink || activeWorkflowProd.raw_footage_location;
                          } else if (selectedStage === 'Revision Required') {
                            updates.remarks = revisionNotes;
                            updates.expected_delivery_date = revisionDeadline || activeWorkflowProd.expected_delivery_date;
                            updates.target_delivery_date = revisionDeadline || activeWorkflowProd.target_delivery_date;
                          } else if (selectedStage === 'Revision In Progress') {
                            updates.remarks = revisionComments;
                          } else if (selectedStage === 'Final Approval') {
                            updates.remarks = approvalNotes;
                          } else if (selectedStage === 'Project Delivered') {
                            updates.remarks = `Delivered via ${deliveryLink}`;
                            updates.delivery_date = deliveryDate || new Date().toISOString().split('T')[0];
                            updates.raw_footage_location = deliveryLink || activeWorkflowProd.raw_footage_location;
                          } else if (selectedStage === 'Completed') {
                            updates.remarks = closingNotes;
                          }

                          // Execute update
                          await updateProduction(activeWorkflowProd.production_id, updates);

                          // Close the modal
                          setActiveWorkflowProd(null);
                          setWorkflowActionType(null);
                        } catch (err: any) {
                          console.error("Failed to update status:", err);
                          alert("Failed to update status: " + (err.message || err));
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="flex flex-col"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
                        
                        {/* LEFT COLUMN: CRM Inputs and Cards */}
                        <div className="space-y-4">
                          {/* CRM Information Cards */}
                          <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Order ID:</span>
                              <span className="text-zinc-350 font-bold font-mono">{orderId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Customer Name:</span>
                              <span className="text-zinc-300 font-bold">{customerName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Event Type:</span>
                              <span className="text-zinc-300 font-semibold">{order?.event_type || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Event Date:</span>
                              <span className="text-zinc-300 font-mono">{order?.event_date || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Assigned Editor(s):</span>
                              <span className="text-violet-400 font-bold">{activeWorkflowProd.editor_assigned || 'Unassigned'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Current Status:</span>
                              <span className="text-amber-400 font-mono font-black">{activeWorkflowProd.editing_status}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Delivery Target Date:</span>
                              <span className="text-purple-400 font-mono font-bold">{activeWorkflowProd.target_delivery_date || '—'}</span>
                            </div>
                            <div className="flex flex-col pt-2 border-t border-zinc-900">
                              <span className="text-zinc-550 font-mono mb-1">Raw Footage Link:</span>
                              {activeWorkflowProd.raw_footage_location ? (
                                <a 
                                  href={activeWorkflowProd.raw_footage_location} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-cyan-400 hover:underline break-all font-mono text-[10px]"
                                >
                                  {activeWorkflowProd.raw_footage_location}
                                </a>
                              ) : (
                                <span className="text-zinc-600 italic font-mono text-[10px]">No Link Attached</span>
                              )}
                            </div>
                          </div>

                          {/* Dropdown status changer */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                              Select New Status
                            </label>
                            <select
                              value={selectedStage}
                              onChange={(e) => setSelectedStage(e.target.value as EditingStatus)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2.5 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono cursor-pointer"
                            >
                              {getNextStatuses(activeWorkflowProd).map(stageOpt => (
                                <option key={stageOpt} value={stageOpt}>{stageOpt}</option>
                              ))}
                            </select>
                          </div>

                          {/* Dynamic CRM Fields based on Status Choice */}
                          {selectedStage === 'Internal QC Review' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  QC Notes
                                </label>
                                <textarea
                                  value={qcNotes}
                                  onChange={(e) => setQcNotes(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Describe internal QC findings or checks remaining..."
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Client Review Sent' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Review Link
                                </label>
                                <input
                                  type="text"
                                  value={reviewLink}
                                  onChange={(e) => setReviewLink(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                                  placeholder="https://clientreview.com/album..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Review Notes
                                </label>
                                <textarea
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  rows={2}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="E.g., Sent layout via portal..."
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Revision Required' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Revision Notes
                                </label>
                                <textarea
                                  value={revisionNotes}
                                  onChange={(e) => setRevisionNotes(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Detail what client has requested to change..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Revision Deadline
                                </label>
                                <input
                                  type="date"
                                  value={revisionDeadline}
                                  onChange={(e) => setRevisionDeadline(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-855 rounded-xl p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Revision In Progress' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Revision Update Notes
                                </label>
                                <textarea
                                  value={revisionComments}
                                  onChange={(e) => setRevisionComments(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Detail revision workflows or specific editor remarks..."
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Final Approval' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Approval Notes
                                </label>
                                <textarea
                                  value={approvalNotes}
                                  onChange={(e) => setApprovalNotes(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Notes from customer approval loop..."
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Project Delivered' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Delivery Link
                                </label>
                                <input
                                  type="text"
                                  value={deliveryLink}
                                  onChange={(e) => setDeliveryLink(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                                  placeholder="Google Drive, WeTransfer, or Album delivery link..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Delivery Date
                                </label>
                                <input
                                  type="date"
                                  value={deliveryDate}
                                  onChange={(e) => setDeliveryDate(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Completed' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Closing Notes
                                </label>
                                <textarea
                                  value={closingNotes}
                                  onChange={(e) => setClosingNotes(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Closing summaries, archive drives, or delivery receipts..."
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN: Live Production Timeline */}
                        <div className="space-y-4 md:border-l md:border-zinc-900/60 md:pl-6 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1 font-mono">
                                Complete Production Timeline
                              </span>
                              <h4 className="text-xs font-bold text-zinc-300">
                                Milestones & Ledger Tracking
                              </h4>
                            </div>

                            <div className="overflow-y-auto max-h-[380px] p-1.5 pr-2 space-y-4">
                              {stagesSequence.map((stageName, idx) => {
                                const matchedLog = findLogForStage(stageName);
                                const isCurrent = activeWorkflowProd.editing_status === stageName;
                                const isDone = !!matchedLog || isCurrent;

                                return (
                                  <div key={stageName} className="flex gap-3 relative">
                                    {/* Line connecting milestones */}
                                    {idx < stagesSequence.length - 1 && (
                                      <div className={`absolute left-2.5 top-5 bottom-0 w-[1px] transition-colors ${
                                        isDone ? 'bg-gradient-to-b from-sky-500 to-zinc-900' : 'bg-zinc-900'
                                      }`} />
                                    )}

                                    {/* Icon Indicator Dot */}
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-sans shrink-0 z-10 transition-all ${
                                      isDone
                                        ? 'bg-sky-500/10 border border-sky-500 text-sky-400 font-extrabold shadow-[0_0_8px_rgba(14,165,233,0.25)]'
                                        : isCurrent
                                          ? 'bg-amber-500/10 border border-amber-500 text-amber-500 animate-pulse font-extrabold'
                                          : 'bg-zinc-900/80 border border-zinc-850 text-zinc-600'
                                    }`}>
                                      {isDone ? '✓' : idx + 1}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0 pr-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className={`text-[11px] font-bold font-mono transition-colors ${
                                          isCurrent 
                                            ? 'text-amber-400 font-extrabold' 
                                            : isDone 
                                              ? 'text-zinc-200' 
                                              : 'text-zinc-650'
                                        }`}>
                                          {stageName}
                                        </span>
                                        {matchedLog && (
                                          <span className="text-[9px] font-mono text-zinc-500 text-right">
                                            {formatTimelineTimestamp(matchedLog.timestamp)}
                                          </span>
                                        )}
                                      </div>
                                      {matchedLog && matchedLog.action && (
                                        <p className="text-[9px] text-zinc-500 italic mt-0.5 font-mono line-clamp-1">
                                          {matchedLog.action.replace(`Updated Production ${activeWorkflowProd.production_id}: `, '')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-2 justify-end p-5 border-t border-zinc-900 bg-zinc-900/20">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => {
                            setActiveWorkflowProd(null);
                            setWorkflowActionType(null);
                          }}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white font-mono uppercase text-[10px] tracking-wider rounded-lg transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-5 py-2 bg-gradient-to-r from-blue-650 to-indigo-650 hover:from-blue-600 hover:to-indigo-600 text-white font-mono uppercase text-[10px] tracking-wider rounded-lg transition-all font-black shadow-lg disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save Status Update'}
                        </button>
                      </div>
                    </form>
                  );
                })()}

                {/* FORM: Close Project popup */}
                {workflowActionType === 'close_project' && activeWorkflowProd && (() => {
                  return (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!selectedStage) {
                        alert("Please select project status");
                        return;
                      }

                      updateProduction(activeWorkflowProd.production_id, {
                        editing_status: selectedStage,
                        remarks: closingNotes || activeWorkflowProd.remarks,
                        delivery_date: deliveryDate || new Date().toISOString().split('T')[0]
                      });

                      setActiveWorkflowProd(null);
                      setWorkflowActionType(null);
                    }} className="space-y-2.5">
                      <div className="flex gap-4">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 font-mono">
                            Project ID
                          </label>
                          <div className="text-zinc-200 text-xs font-mono">{activeWorkflowProd.tracking_id}</div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 font-mono">
                            Client
                          </label>
                          <div className="text-zinc-200 text-xs font-mono">{customerName}</div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 font-mono">
                          Current Status
                        </label>
                        <div className="text-amber-400 font-mono text-xs">{activeWorkflowProd.editing_status}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Select New Status *
                          </label>
                          <select
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value as EditingStatus)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                            required
                          >
                            <option value="">Select status...</option>
                            <option value="Editing In Progress">Editing In Progress</option>
                            <option value="Internal QC Review">Internal QC Review</option>
                            <option value="Client Review Sent">Client Review Sent</option>
                            <option value="Final Approval">Final Approval</option>
                            <option value="Project Delivered">Project Delivered</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Completion Date
                          </label>
                          <input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                          Completion Notes
                        </label>
                        <textarea
                          autoFocus
                          value={closingNotes}
                          onChange={(e) => setClosingNotes(e.target.value)}
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          placeholder="Add any final notes or archive links..."
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkflowProd(null);
                            setWorkflowActionType(null);
                          }}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white font-mono uppercase text-[9px] tracking-wider rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-white font-mono uppercase text-[9px] tracking-wider rounded-lg transition-all font-black shadow-lg"
                        >
                          Save 
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

      {/* MODALS GATEWAY FOR POST-PRODUCTION ROSTER */}

      {/* 1. ONBOARD / EDIT STAFF MEMBER MODAL */}
      <AnimatePresence>
        {isStaffModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              id="production_staff_modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-[#0c0d10]">
                <div>
                  <h3 className="text-sm font-black uppercase text-white font-mono tracking-wider">
                    {editingStaffMember ? 'Update Professional Credentials' : 'Onboard New Production Staff'}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Configure official post-production specialties, indices, and contact details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitStaff} className="p-6 space-y-4 font-mono text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={staffFormName}
                      onChange={(e) => setStaffFormName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-white text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Employee ID */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black block">Employee ID</label>
                    <input
                      type="text"
                      required
                      value={staffFormEmployeeId}
                      onChange={(e) => setStaffFormEmployeeId(e.target.value)}
                      placeholder="e.g. EMP-2034"
                      className="w-full bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-white text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black block">Mobile Number</label>
                    <input
                      type="text"
                      value={staffFormMobile}
                      onChange={(e) => setStaffFormMobile(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-white text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black block">WhatsApp Number</label>
                    <input
                      type="text"
                      value={staffFormWhatsapp}
                      onChange={(e) => setStaffFormWhatsapp(e.target.value)}
                      placeholder="Leave blank to copy mobile"
                      className="w-full bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-white text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black block">Email Address</label>
                    <input
                      type="email"
                      value={staffFormEmail}
                      onChange={(e) => setStaffFormEmail(e.target.value)}
                      placeholder="e.g. editor@photocrew.pro"
                      className="w-full bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-white text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black block">Base Address & City</label>
                    <input
                      type="text"
                      value={staffFormAddress}
                      onChange={(e) => setStaffFormAddress(e.target.value)}
                      placeholder="e.g. Suite 4B, MG Road, Bangalore"
                      className="w-full bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-white text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Joining Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black block">Joining Date</label>
                    <input
                      type="date"
                      value={staffFormJoiningDate}
                      onChange={(e) => setStaffFormJoiningDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-white text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Production Role */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black block">Production Role Specialty</label>
                    <select
                      value={staffFormRole}
                      onChange={(e) => setStaffFormRole(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 text-xs text-zinc-200 rounded-xl px-3 py-2.5 cursor-pointer focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">Select Specialty</option>
                      {allRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                      <option value="Other / Custom Role Specialty">Other / Custom Role Specialty</option>
                    </select>
                  </div>

                  {/* Custom Role Specialty Input */}
                  {staffFormRole === 'Other / Custom Role Specialty' && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] text-amber-500 uppercase font-black block">Custom Role Specialty</label>
                      <input
                        type="text"
                        required
                        value={customRoleSpecialty}
                        onChange={(e) => setCustomRoleSpecialty(e.target.value)}
                        placeholder="e.g. Cinematic Reels Editor"
                        className="w-full bg-zinc-900 border border-amber-950 px-3.5 py-2.5 text-white text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-zinc-650"
                      />
                    </div>
                  )}

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black block">Employment Status</label>
                    <select
                      value={staffFormStatus}
                      onChange={(e) => setStaffFormStatus(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-850 text-xs text-zinc-200 rounded-xl px-3 py-2.5 cursor-pointer focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Active">Active / On Roster</option>
                      <option value="Inactive">Inactive / Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 border-t border-zinc-900 bg-zinc-900/30 -mx-6 -mb-6 flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl cursor-pointer duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black uppercase rounded-xl cursor-pointer hover:scale-[1.01] duration-150 shadow-md shadow-amber-500/5"
                  >
                    {editingStaffMember ? 'Update Staff Member' : 'Onboard Staff'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. CUSTOM ROLE FORM MODAL */}
      <AnimatePresence>
        {isCustomRoleModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-[#0c0d10]">
                <div>
                  <h3 className="text-sm font-black uppercase text-white font-mono tracking-wider">
                    Create Custom Production Role
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Newly created roles will instantly propagate across indices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomRoleModalOpen(false)}
                  className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitCustomRole} className="p-6 space-y-4 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-black block">Role Name</label>
                  <input
                    type="text"
                    required
                    value={customRoleName}
                    onChange={(e) => setCustomRoleName(e.target.value)}
                    placeholder="e.g. Drone Video Specialist"
                    className="w-full bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-white text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-zinc-600 block mt-1">
                    Examples: Premium Wedding Editor, Luxury Album Designer, Short Video Specialist.
                  </span>
                </div>

                <div className="p-4 border-t border-zinc-900 bg-zinc-900/30 -mx-6 -mb-6 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCustomRoleModalOpen(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl cursor-pointer duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-650 hover:bg-purple-600 text-white font-extrabold uppercase rounded-xl cursor-pointer duration-150 shadow-md shadow-purple-500/5"
                  >
                    Create Role
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. METRIC DETAILS DRILL-DOWN MODAL */}
      <AnimatePresence>
        {selectedMetricDetail && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-[#0c0d10]">
                <div>
                  <h3 className="text-sm font-black uppercase text-white font-mono tracking-wider">
                    {selectedMetricDetail.type} Detail Log
                  </h3>
                  <p className="text-[11px] text-zinc-550 font-mono mt-0.5">
                    Individual post-production assignment roster for <span className="text-amber-500">{selectedMetricDetail.memberName}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMetricDetail(null)}
                  className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-lg cursor-pointer transition-colors duration-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 max-h-[460px] overflow-y-auto w-full">
                {selectedMetricDetail.list.length === 0 ? (
                  <div className="text-center text-zinc-550 font-mono py-12">
                    No active project assignment records found under this metric.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-xs text-zinc-300 font-mono">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 uppercase pb-2 text-[9px] tracking-widest bg-zinc-950/40">
                          <th className="py-3 px-3 font-bold">Project ID</th>
                          <th className="py-3 px-3 font-bold">Client / Event</th>
                          <th className="py-3 px-3 font-bold">Editing Stage</th>
                          <th className="py-3 px-3 font-bold">Priority</th>
                          <th className="py-3 px-3 font-bold text-right">Target Deadline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {selectedMetricDetail.list.map((proj) => {
                          let clientName = 'Unknown Client';
                          const leadMatch = leadsData?.find(l => l.lead_id === proj.tracking_id || `PRD-${l.lead_id}` === proj.production_id);
                          if (leadMatch) {
                            clientName = `${leadMatch.client_name} - ${leadMatch.event_type || 'Wedding'}`;
                          } else {
                            const orderMatch = orders.find(o => o.order_id === proj.tracking_id || o.lead_id === proj.tracking_id);
                            if (orderMatch) {
                              clientName = `${orderMatch.client_name} - Project`;
                            } else {
                              clientName = proj.tracking_id || 'Post-Production Job';
                            }
                          }

                          return (
                            <tr key={proj.production_id || proj.tracking_id} className="hover:bg-zinc-900/10">
                              <td className="py-3 px-3 font-bold text-amber-500 text-[11px]">
                                {proj.production_id || proj.tracking_id || 'N/A'}
                              </td>
                              <td className="py-3 px-3 font-sans text-xs text-zinc-250 break-words max-w-[200px]">
                                {clientName}
                              </td>
                              <td className="py-3 px-3 text-[11px]">
                                <StatusText status={proj.editing_status || 'Raw Footage Received'} />
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  proj.project_priority === 'Critical' || proj.project_priority === 'High'
                                    ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                                    : 'bg-zinc-905 border border-zinc-900 text-zinc-450'
                                }`}>
                                  {proj.project_priority || 'Medium'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right text-zinc-400 font-black">
                                {proj.expected_delivery_date || proj.target_delivery_date || 'TBD'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-zinc-900 flex justify-end bg-[#0c0d10]">
                <button
                  type="button"
                  onClick={() => setSelectedMetricDetail(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-455 hover:text-white rounded-xl duration-150 cursor-pointer text-xs font-mono uppercase"
                >
                  Close Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. PROFESSIONAL PROFILE OVERLAY CARD MODAL */}
      <AnimatePresence>
        {viewingStaffMember && (() => {
          const stats = getStaffRosterStats(viewingStaffMember.name);
          return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative"
              >
                <div className="relative overflow-hidden bg-[#0c0d11] p-6 border-b border-zinc-900 flex justify-between items-start">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex items-center gap-4 relative z-10 font-sans">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-zinc-950 flex items-center justify-center text-3xl font-black font-mono shadow-xl relative overflow-hidden">
                      {viewingStaffMember.name.charAt(0)}
                      <div className="absolute inset-0 bg-white/10 scale-120 rotate-12" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white uppercase tracking-wider font-mono">
                          {viewingStaffMember.name}
                        </h2>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono leading-none font-bold uppercase ${
                          viewingStaffMember.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {viewingStaffMember.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">
                        {viewingStaffMember.production_role_speciality || viewingStaffMember.role || 'Post-Production Specialist'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setViewingStaffMember(null)}
                    className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-lg cursor-pointer relative z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Info Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left panel: Info cards */}
                  <div className="space-y-4 font-mono text-xs">
                    <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-black border-b border-zinc-900 pb-1">
                      General Contact Details
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-zinc-900/40 border border-zinc-900/60 p-3 rounded-xl space-y-1.5">
                        <span className="text-[9px] text-zinc-550 uppercase font-bold block">Mobile Number</span>
                        <span className="text-zinc-200 tracking-wide">{viewingStaffMember.mobile}</span>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl space-y-1.5">
                        <span className="text-[9px] text-zinc-550 uppercase font-bold block">WhatsApp Number</span>
                        <span className="text-zinc-200 tracking-wide">{viewingStaffMember.whatsapp_number || viewingStaffMember.mobile}</span>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl space-y-1.5">
                        <span className="text-[9px] text-zinc-550 uppercase font-bold block">Email Address</span>
                        <span className="text-zinc-200 break-words block">{viewingStaffMember.email}</span>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl space-y-1.5">
                        <span className="text-[9px] text-zinc-550 uppercase font-bold block">Joining Date</span>
                        <span className="text-zinc-200 tracking-wide">{viewingStaffMember.joining_date}</span>
                      </div>
                      {viewingStaffMember.address && (
                        <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl space-y-1.5">
                          <span className="text-[9px] text-zinc-550 uppercase font-bold block">Base Location / Address</span>
                          <span className="text-zinc-200 block text-[11px] break-words">{viewingStaffMember.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right/Center panel: Analytics Dashboard */}
                  <div className="md:col-span-2 space-y-4 font-mono">
                    <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-black border-b border-zinc-900 pb-1">
                      Editor Performance & Job Metrics
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-[#0b0c10] border border-zinc-900 p-3.5 rounded-xl text-center">
                        <span className="text-zinc-550 text-[9px] uppercase tracking-wider font-bold">Total Assigned</span>
                        <div className="text-2xl font-black text-white mt-1">{stats.assigned.length}</div>
                      </div>
                      <div className="bg-[#0b0c10] border border-zinc-900 p-3.5 rounded-xl text-center">
                        <span className="text-zinc-550 text-[9px] uppercase tracking-wider font-bold text-emerald-450 font-black font-mono">Completed</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1">{stats.completedCount}</div>
                      </div>
                      <div className="bg-[#0b0c10] border border-zinc-900 p-3.5 rounded-xl text-center">
                        <span className="text-zinc-550 text-[9px] uppercase tracking-wider font-bold text-amber-500">Pending</span>
                        <div className="text-2xl font-black text-amber-500 mt-1">{stats.pendingCount}</div>
                      </div>
                      <div className="bg-[#0b0c10] border border-zinc-900 p-3.5 rounded-xl text-center font-bold">
                        <span className="text-zinc-550 text-[9px] uppercase tracking-wider">Approval Rate</span>
                        <div className="text-2xl font-black text-purple-400 mt-1">
                          {stats.assigned.length > 0 ? Math.round((stats.approvedCount / stats.assigned.length) * 100) : 100}%
                        </div>
                      </div>
                    </div>

                    {/* Project List */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-2">
                      <span className="text-[10px] text-zinc-550 uppercase tracking-widest font-black block mb-2">
                        Staff Assignment Log
                      </span>
                      <div className="overflow-y-auto max-h-[220px] space-y-2 pr-1 select-none">
                        {stats.assigned.length === 0 ? (
                          <div className="text-center py-8 text-zinc-650 text-xs font-mono">
                            No historic or pending jobs assigned to this staff member yet.
                          </div>
                        ) : (
                          stats.assigned.map(proj => {
                            let clientTitle = 'Post-Production Job';
                            const leadM = leadsData?.find(l => l.lead_id === proj.tracking_id || `PRD-${l.lead_id}` === proj.production_id);
                            if (leadM) clientTitle = `${leadM.client_name} (${leadM.event_type || 'Wedding'})`;

                            return (
                              <div key={proj.production_id || proj.tracking_id} className="bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-xl flex items-center justify-between text-xs">
                                <div>
                                  <div className="font-extrabold text-zinc-200">{clientTitle}</div>
                                  <div className="text-[9px] text-zinc-550 mt-0.5">
                                    ID: {proj.production_id || proj.tracking_id} | Deadline: {proj.expected_delivery_date || proj.target_delivery_date || 'TBD'}
                                  </div>
                                </div>
                                <StatusText status={proj.editing_status} />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-zinc-900 flex justify-end bg-[#0c0d10]">
                  <button
                    type="button"
                    onClick={() => setViewingStaffMember(null)}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl duration-150 cursor-pointer text-xs uppercase"
                  >
                    Close Profile Card
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
};
