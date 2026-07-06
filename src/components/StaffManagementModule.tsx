import React, { useState, useEffect } from 'react';
import { useRole } from './RoleContext';
import { Staff } from '../types';
import { triggerAutoScrollAndFocus } from '../utils';
import { 
  Users, UserPlus, Phone, Mail, Award, Clock, FileText, ToggleLeft, ToggleRight, Trash2, ShieldAlert,
  Search, Filter, Calendar, FolderOpen, Heart, CheckCircle2, ChevronRight, X, Sparkles, Image
} from 'lucide-react';

export const StaffManagementModule: React.FC = () => {
  const { 
    staff, addStaff, updateStaff, deleteStaff, production, currentRole,
    specialities = [], addSpeciality, updateSpeciality, deactivateSpeciality
  } = useRole();
  
  // Tabs: 'dashboard' | 'list' | 'add' | 'specialities'
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'list' | 'add' | 'specialities'>('dashboard');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form State for Adding Staff
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Editor');
  const [department, setDepartment] = useState('Editing');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [notes, setNotes] = useState('');
  const [showPhotoTip, setShowPhotoTip] = useState(false);

  // Specialties & experience fields
  const [prodSpeciality, setProdSpeciality] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState('Junior Editor (1-2 Years)');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Specialty manager inline form states
  const [newSpecName, setNewSpecName] = useState('');
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [editingSpecName, setEditingSpecName] = useState('');

  useEffect(() => {
    if (activeSubTab === 'add') {
      triggerAutoScrollAndFocus('#add_staff_form', 150);
    }
  }, [activeSubTab]);

  // Core production roles requested by user
  const PRODUCTION_ROLES = [
    'Editor', 'Senior Editor', 'Photo Editor', 'Video Editor', 
    'Album Designer', 'Color Grading Artist', 'Retoucher', 
    'Motion Graphics Designer', 'Delivery Coordinator', 'Production Manager', 
    'Studio Coordinator', 'Freelancer'
  ];

  const DEPARTMENTS = [
    'Editing', 'Post-Production', 'Design', 'Operations', 'Management', 'Freelance'
  ];

  // Calculations for dashboard
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'Active').length;
  
  // Production assignments summary
  const getStaffStats = (staffName: string) => {
    const staffProjects = production.filter(p => 
      p.editor_assigned?.toLowerCase() === staffName.toLowerCase()
    );
    const completed = staffProjects.filter(p => 
      ['Approved', 'Delivered', 'Final Approval', 'Project Delivered', 'Project Closed'].includes(p.editing_status)
    ).length;
    const pending = staffProjects.filter(p => 
      !['Approved', 'Delivered', 'Final Approval', 'Project Delivered', 'Project Closed'].includes(p.editing_status)
    ).length;
    return {
      assigned: staffProjects.length,
      completed,
      pending
    };
  };

  const dashboardStats = staff.reduce((acc, current) => {
    const stats = getStaffStats(current.name);
    return {
      totalAssigned: acc.totalAssigned + stats.assigned,
      totalCompleted: acc.totalCompleted + stats.completed,
      totalPending: acc.totalPending + stats.pending
    };
  }, { totalAssigned: 0, totalCompleted: 0, totalPending: 0 });

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !mobile) {
      alert('Please fill out all required fields (Name, Email, Mobile).');
      return;
    }

    const payload: any = {
      name,
      mobile,
      whatsapp_number: whatsappNumber || mobile,
      email,
      role,
      department,
      status,
      joining_date: joiningDate,
      profile_photo: profilePhoto || undefined,
      notes: notes || undefined,
      production_role_speciality: prodSpeciality,
      experience: experience,
      Skill: skills
    };

    if (editingStaffId) {
      updateStaff(editingStaffId, payload);
      alert('Staff member updated successfully!');
      setEditingStaffId(null);
    } else {
      addStaff(payload);
      alert('Staff member registered successfully in ERP system!');
    }

    // Reset Form
    setName('');
    setMobile('');
    setWhatsappNumber('');
    setEmail('');
    setRole('Editor');
    setDepartment('Editing');
    setStatus('Active');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setProfilePhoto('');
    setNotes('');
    setProdSpeciality('');
    setSkills([]);
    setExperience('Junior Editor (1-2 Years)');

    setActiveSubTab('list');
  };

  const handleEditStaffClick = (member: Staff) => {
    setEditingStaffId(member.staff_id);
    setName(member.name);
    setMobile(member.mobile);
    setWhatsappNumber(member.whatsapp_number || '');
    setEmail(member.email);
    setRole(member.role);
    setDepartment(member.department);
    setStatus(member.status);
    setJoiningDate(member.joining_date);
    setProfilePhoto(member.profile_photo || '');
    setNotes(member.notes || '');
    setProdSpeciality(member.production_role_speciality || '');
    setSkills(Array.isArray(member.Skill) ? member.Skill : []);
    setExperience(member.experience || 'Junior Editor (1-3 Years)');
    setActiveSubTab('add');
    setTimeout(() => {
      triggerAutoScrollAndFocus('#add_staff_form', 150);
    }, 50);
  };

  const handleToggleStatus = (member: Staff) => {
    const nextStatus = member.status === 'Active' ? 'Inactive' : 'Active';
    updateStaff(member.staff_id, { status: nextStatus });
  };

  // Filtered staff list
  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.mobile.includes(searchQuery);
    
    const matchesRole = roleFilter === 'All' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || member.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-black uppercase tracking-wider text-white">
              Studio Crew Registry & Staff Directory
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            CREW ASSIGNMENTS, CAPACITY ALLOCATIONS AND INTERACTIVE WORKLOAD METRICS
          </p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800 z-10">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-400 border border-violet-500/30'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'list'
                ? 'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-400 border border-violet-500/30'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            Crew Roster ({staff.length})
          </button>
          <button
            onClick={() => setActiveSubTab('add')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              activeSubTab === 'add'
                ? 'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-400 border border-violet-500/30'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard Staff</span>
          </button>
          <button
            onClick={() => setActiveSubTab('specialities')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              activeSubTab === 'specialities'
                ? 'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-400 border border-violet-500/30'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Specialities ({specialities.length})</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD TAB CONTAINER */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Key Metrics row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* Total Staff member count */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden group hover:border-violet-500/20 transition-all shadow-md">
              <span className="absolute bottom-4 right-4 text-zinc-800 font-bold text-5xl select-none font-mono opacity-20">TS</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Total Crew Members</div>
              <div className="text-3xl font-black text-white font-mono mt-1">{totalStaff}</div>
              <div className="text-[10px] text-zinc-400 mt-2 font-mono">FTE + Contractors</div>
            </div>

            {/* Active Staff */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden group hover:border-violet-500/20 transition-all shadow-md">
              <span className="absolute bottom-4 right-4 text-zinc-800 font-bold text-5xl select-none font-mono opacity-20">AS</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Active Staff</div>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">{activeStaff}</div>
              <div className="text-[10px] text-zinc-400 mt-2 font-mono">
                {totalStaff - activeStaff} Inactive
              </div>
            </div>

            {/* Assigned Projects */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden group hover:border-violet-500/20 transition-all shadow-md">
              <span className="absolute bottom-4 right-4 text-zinc-800 font-bold text-5xl select-none font-mono opacity-20">AP</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Assigned Projects</div>
              <div className="text-3xl font-black text-violet-400 font-mono mt-1">{dashboardStats.totalAssigned}</div>
              <div className="text-[10px] text-zinc-400 mt-2 font-mono">Total allocated queue</div>
            </div>

            {/* Completed Projects */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden group hover:border-violet-500/20 transition-all shadow-md">
              <span className="absolute bottom-4 right-4 text-zinc-800 font-bold text-5xl select-none font-mono opacity-20">CP</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Completed Projects</div>
              <div className="text-3xl font-black text-teal-400 font-mono mt-1">{dashboardStats.totalCompleted}</div>
              <div className="text-[10px] text-zinc-400 mt-2 font-mono">Master releases archived</div>
            </div>

            {/* Pending Projects */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative overflow-hidden group hover:border-violet-500/20 transition-all shadow-md">
              <span className="absolute bottom-4 right-4 text-zinc-800 font-bold text-5xl select-none font-mono opacity-20">PP</span>
              <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">Pending Release</div>
              <div className="text-3xl font-black text-amber-500 font-mono mt-1">{dashboardStats.totalPending}</div>
              <div className="text-[10px] text-zinc-400 mt-2 font-mono">Currently in editing pipelines</div>
            </div>

          </div>

          {/* Quick Staff Availability Grid */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300 border-b border-zinc-900 pb-3 font-mono flex items-center justify-between">
              <span>Crew Allocation Matrix & Load Factors</span>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {staff.map(member => {
                const stats = getStaffStats(member.name);
                const loadPercent = stats.pending > 3 ? 100 : (stats.pending / 3) * 100;
                let statusColor = 'bg-zinc-800';
                if (member.status === 'Inactive') statusColor = 'text-zinc-650 bg-zinc-950 border-zinc-900';
                else if (loadPercent > 80) statusColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                else if (loadPercent > 30) statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                else statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                return (
                  <div key={member.staff_id} className="bg-[#030303] border border-zinc-900 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-800 transition-all duration-150">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-950/40 border border-violet-900/30 flex items-center justify-center font-black text-violet-400 font-mono select-none">
                          {member.name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">{member.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{member.role}</div>
                        </div>
                      </div>
                      
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-bold ${
                        member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                      }`}>
                        {member.status}
                      </span>
                    </div>

                    <div className="space-y-2 mt-4 pt-3 border-t border-zinc-900">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-zinc-500 uppercase">Workload Capacity</span>
                        <span className="font-bold text-white">{stats.pending} Active / {stats.completed} Done</span>
                      </div>
                      
                      {/* Capacity line bar */}
                      <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            stats.pending >= 3 ? 'bg-rose-500' : stats.pending >= 2 ? 'bg-amber-500' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${member.status === 'Inactive' ? 0 : Math.min(100, (stats.pending / 4) * 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-zinc-500">
                        <span>Dept: <strong className="text-zinc-350">{member.department}</strong></span>
                        <span className="text-[9px] uppercase font-bold tracking-wider rounded-md border px-1.5 py-0.5 bg-zinc-950" style={{ borderColor: statusColor.includes('border') ? statusColor.split(' ')[2]?.replace('border-', '') : '#18181b' }}>
                          {member.status === 'Inactive' ? 'OFFLINE' : stats.pending >= 3 ? 'OVERLOAD' : stats.pending >= 1 ? 'ACTIVE' : 'AVAILABLE'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {staff.length === 0 && (
                <div className="col-span-3 py-12 text-center text-zinc-600 bg-zinc-950 border border-zinc-900 rounded-xl uppercase font-mono text-xs">
                  No staff registered. Press Add Staff to seed your workflow.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ROSTER / LIST TAB CONTAINER */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between relative">
            <div className="flex items-center gap-2.5 bg-zinc-900/60 p-2 rounded-xl border border-zinc-800 w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search staff by name, email or cell..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white border-none outline-none focus:ring-0 w-full font-sans placeholder-zinc-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {/* Role filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase hidden sm:inline">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 px-3 text-xs text-zinc-300 font-mono focus:border-violet-500 outline-none cursor-pointer"
                >
                  <option value="All">All Roles</option>
                  {PRODUCTION_ROLES.map(roleOpt => (
                    <option key={roleOpt} value={roleOpt}>{roleOpt}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 px-3 text-xs text-zinc-300 font-mono focus:border-violet-500 outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Roster Grid list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStaff.map(member => {
              const stats = getStaffStats(member.name);
              return (
                <div key={member.staff_id} className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl relative shadow-md flex flex-col justify-between hover:border-zinc-850 transition-colors">
                  
                  {/* Photo & Identity details */}
                  <div className="flex items-start gap-4">
                    {member.profile_photo ? (
                      <img 
                        src={member.profile_photo} 
                        referrerPolicy="no-referrer"
                        alt={member.name} 
                        className="w-14 h-14 rounded-2xl object-cover border border-zinc-800 bg-zinc-900"
                        onError={(e) => {
                          // Fallback on broken URL path
                          e.currentTarget.style.display = 'none';
                        }} 
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/20 flex items-center justify-center font-black text-lg text-violet-400 font-mono select-none">
                        {member.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                    )}

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white capitalize">{member.name}</h3>
                        <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-mono tracking-wider font-extrabold uppercase leading-none mt-0.5 ${
                          member.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}>
                          {member.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400 font-sans">
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                          <span>{(Array.isArray(member.Skill) && member.Skill.length > 0) ? member.Skill.join(' • ') : 'No Skills Defined'}</span>
                        </span>
                        {member.experience && (
                          <>
                            <span className="text-zinc-650">•</span>
                            <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">Exp: {member.experience}</span>
                          </>
                        )}
                        <span className="text-zinc-650">•</span>
                        <span className="bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono leading-none rounded text-zinc-300">
                          {member.department}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes / Descriptions */}
                  {member.notes && (
                    <p className="text-xs text-zinc-400 font-sans mt-3 px-3 py-2 bg-zinc-900/50 border border-zinc-900 rounded-lg italic">
                      "{member.notes}"
                    </p>
                  )}

                  {/* Contact details */}
                  <div className="grid grid-cols-3 gap-2 mt-4 py-3 border-t border-b border-zinc-900 text-[10px]">
                    <div className="space-y-1">
                      <div className="text-[9px] font-mono text-zinc-500 uppercase">Mobile</div>
                      <a href={`tel:${member.mobile}`} className="font-mono font-bold text-zinc-300 hover:text-white flex items-center gap-1 break-words" title={member.mobile}>
                        <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="break-words">{member.mobile}</span>
                      </a>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] font-mono text-zinc-500 uppercase">WhatsApp</div>
                      <a 
                        href={`https://api.whatsapp.com/send?phone=${(member.whatsapp_number || member.mobile || '').replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 break-words" 
                        title={member.whatsapp_number || member.mobile}
                      >
                        <span className="text-emerald-450 text-[11px] font-bold shrink-0">💬</span>
                        <span className="break-words">{member.whatsapp_number || member.mobile}</span>
                      </a>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] font-mono text-zinc-500 uppercase">Email</div>
                      <a href={`mailto:${member.email}`} className="font-mono font-bold text-zinc-300 hover:text-white flex items-center gap-1 break-words" title={member.email}>
                        <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="break-words">{member.email}</span>
                      </a>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Joined {member.joining_date}</span>
                      </span>
                      <span>•</span>
                      <span className="font-bold text-white">
                        {stats.pending} Active
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditStaffClick(member)}
                        className="p-1 px-2.5 text-[9px] font-mono font-bold border border-zinc-800 hover:border-zinc-650 bg-zinc-900 text-zinc-300 rounded-lg cursor-pointer select-none transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(member)}
                        title="Toggle Active/Inactive Staff member Status"
                        className="p-1 px-2.5 text-[9px] font-mono font-bold border border-zinc-800 hover:border-zinc-650 bg-zinc-900 text-zinc-300 rounded-lg cursor-pointer select-none transition-colors"
                      >
                        {member.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>

                      {currentRole === 'Business Owner' && (
                        <button
                          onClick={() => {
                            if(confirm(`Are you absolutely sure you want to remove ${member.name} from the crew roster? This action is permanent.`)){
                              deleteStaff(member.staff_id);
                            }
                          }}
                          className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Purge Staff From Directory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
            {filteredStaff.length === 0 && (
              <div className="col-span-2 py-16 text-center text-zinc-500 bg-zinc-950 border border-zinc-900 rounded-2xl uppercase font-mono text-xs">
                No staff members found matching search filters.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ADD / ONBOARD TABLE FORM */}
      {activeSubTab === 'add' && (
        <form id="add_staff_form" onSubmit={handleAddStaffSubmit} className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl space-y-6 shadow-xl relative">
          <div className="absolute top-3 left-3 w-1.5 h-1.5 bg-violet-500/50 rounded-full" />
          <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-violet-500/50 rounded-full" />
          
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-350 border-b border-zinc-900 pb-3 font-mono">
            STAFF DIRECTORY ENROLLMENT PACK
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <span>Staff Member Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Liam Campbell"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 outline-none"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <span>Email Address (Unique ID)</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. liam@photocrew.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 outline-none font-mono"
              />
            </div>

            {/* Mobile */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <span>Mobile Contact Number</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +1 (555) 765-4321"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 outline-none font-mono"
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <span>WhatsApp Contact Number</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. +1 (555) 765-4321"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 outline-none font-mono"
              />
            </div>

            {/* Joining Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <span>Joining Date</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-violet-500 outline-none font-mono"
              />
            </div>

            {/* Skills / Specialities Checkboxes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <span>Skills / Specialities</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3 max-h-48 overflow-y-auto">
                {specialities.filter(s => s.active).map(spec => (
                  <label key={spec.speciality_id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={spec.name}
                      checked={skills.includes(spec.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSkills([...skills, spec.name]);
                        } else {
                          setSkills(skills.filter(s => s !== spec.name));
                        }
                      }}
                      className="w-3.5 h-3.5 accent-violet-500"
                    />
                    <span className="text-xs text-zinc-300 font-mono">{spec.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <span>Experience Level</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 focus:border-violet-500 outline-none cursor-pointer font-mono"
              >
                <option value="1-3 Years">Junior Editor (1-3 Years)</option>
                <option value="3-5 Years">Mid-Level (3-5 Years)</option>
                <option value="5-8 Years">Senior specialist (5-8 Years)</option>
                <option value="8+ Years">Technical Expert / Lead (8+ Years)</option>
              </select>
            </div>

            {/* Department dropdown list */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <span>Corporate Department</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 focus:border-violet-500 outline-none cursor-pointer font-mono"
              >
                {DEPARTMENTS.map(deptOpt => (
                  <option key={deptOpt} value={deptOpt}>{deptOpt}</option>
                ))}
              </select>
            </div>

            {/* Profile Photo URL Optional */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                  <span>Profile Photo URL (Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPhotoTip(!showPhotoTip)}
                  className="text-[9px] font-mono text-violet-400 underline hover:text-violet-300 cursor-pointer"
                >
                  Need temporary placeholder avatar?
                </button>
              </div>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or leave blank for initials"
                value={profilePhoto}
                onChange={(e) => setProfilePhoto(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 outline-none font-mono"
              />
              
              {showPhotoTip && (
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 mt-2 text-[11px] font-mono text-zinc-400 leading-relaxed max-w-full">
                  <div className="font-bold text-white flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Instant Copy-Paste Placeholders</span>
                  </div>
                  <div>You can use these curated custom-styled production and designer avatars:</div>
                  <div className="space-y-1">
                    <div>• <strong>FTE Editor</strong>: <code>https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200</code></div>
                    <div>• <strong>Videographer</strong>: <code>https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200</code></div>
                    <div>• <strong>Lead Manager</strong>: <code>https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200</code></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200');
                      setShowPhotoTip(false);
                    }}
                    className="mt-1 p-1 px-3 text-[9px] font-extrabold uppercase bg-violet-500/10 text-violet-400 rounded border border-violet-500/20 hover:bg-violet-500/20 cursor-pointer"
                  >
                    Load Sample Avatar automatically
                  </button>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <span>Personal Remarks & Technical Capabilities notes</span>
              </label>
              <textarea
                placeholder="Enter technical skill specifications, certifications, special camera equipment limits, or secondary competencies..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 outline-none resize-none font-sans"
              />
            </div>

            {/* Status active/inactive checkbox */}
            <div className="md:col-span-2 p-4 bg-zinc-900/40 border border-zinc-900 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white uppercase">Primary Status</div>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Toggle default active status immediately upon onboarding</p>
              </div>
              <button
                type="button"
                onClick={() => setStatus(status === 'Active' ? 'Inactive' : 'Active')}
                className="cursor-pointer"
              >
                {status === 'Active' ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-xs">
                    <span>ACTIVE</span>
                    <ToggleRight className="w-7 h-7" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-zinc-500 font-mono font-bold text-xs">
                    <span>INACTIVE</span>
                    <ToggleLeft className="w-7 h-7" />
                  </span>
                )}
              </button>
            </div>

          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-violet-500/15 cursor-pointer flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Generate Crew Roll Verification & Register</span>
          </button>
        </form>
      )}

      {/* SPECIALITIES TAB CONTAINER */}
      {activeSubTab === 'specialities' && (
        <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl space-y-6 shadow-xl relative animate-fade-in">
          <div className="absolute top-3 left-3 w-1.5 h-1.5 bg-violet-500/50 rounded-full" />
          <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-violet-500/50 rounded-full" />
          
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-350 border-b border-zinc-900 pb-3 font-mono">
            MANAGE PRODUCTION ROLE SPECIALITIES
          </h2>

          {/* Add / Edit Specialty Form */}
          <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              {editingSpecId ? 'Edit Room Speciality' : 'Add New Production Speciality'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. Wedding Video Editor, Reel Editor..."
                value={editingSpecId ? editingSpecName : newSpecName}
                onChange={(e) => editingSpecId ? setEditingSpecName(e.target.value) : setNewSpecName(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (editingSpecId) {
                      if (!editingSpecName.trim()) return;
                      await updateSpeciality(editingSpecId, editingSpecName.trim());
                      setEditingSpecId(null);
                      setEditingSpecName('');
                    } else {
                      if (!newSpecName.trim()) return;
                      await addSpeciality(newSpecName.trim());
                      setNewSpecName('');
                    }
                  }}
                  className="px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {editingSpecId ? 'Save' : 'Create Speciality'}
                </button>
                {editingSpecId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSpecId(null);
                      setEditingSpecName('');
                    }}
                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Specialities List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Speciality ID</th>
                  <th className="py-3 px-4 font-bold">Speciality Name</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {specialities.map((spec) => (
                  <tr key={spec.speciality_id} className="hover:bg-zinc-900/10">
                    <td className="py-3.5 px-4 font-mono text-zinc-400">{spec.speciality_id}</td>
                    <td className="py-3.5 px-4 font-bold text-white text-xs">{spec.name}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-mono tracking-wider font-extrabold uppercase ${
                        spec.active 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                      }`}>
                        {spec.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2.5">
                      <button
                        onClick={() => {
                          setEditingSpecId(spec.speciality_id);
                          setEditingSpecName(spec.name);
                        }}
                        className="text-[10px] font-mono font-bold text-violet-400 hover:text-violet-350 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          await deactivateSpeciality(spec.speciality_id, !spec.active);
                        }}
                        className={`text-[10px] font-mono font-bold cursor-pointer ${
                          spec.active ? 'text-zinc-400 hover:text-white' : 'text-emerald-400 hover:text-emerald-350'
                        }`}
                      >
                        {spec.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
