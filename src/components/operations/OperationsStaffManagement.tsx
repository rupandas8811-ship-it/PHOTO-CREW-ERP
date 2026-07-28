import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from '../RoleContext';
import { 
  Users, UserCheck, ShieldAlert, PlusCircle, Edit, Trash2, Mail, Phone, Calendar, Briefcase, Search, X
} from 'lucide-react';
import { Staff } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

export const OperationsStaffManagement: React.FC = () => {
  const { currentRole, staff, addStaff, updateStaff, deleteStaff, operations, leads, orders, staffAssignments } = useRole();
  const canEdit = currentRole === 'Operations Team' || currentRole === 'Business Owner';

  // Modal / Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [form, setForm] = useState({
    name: '',
    role: 'Lead Photographer',
    email: '',
    mobile: '',
    whatsapp_number: '',
    department: 'Operations',
    status: 'Active' as Staff['status'],
    staff_type: 'In-House' as 'In-House' | 'Freelancer',
    joining_date: new Date().toISOString().split('T')[0],
    profile_photo: '',
    notes: ''
  });

  const [selectedStaffBookings, setSelectedStaffBookings] = useState<{ staffName: string; bookings: any[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [operatingId, setOperatingId] = useState<string | null>(null);

  const handleSelectEdit = (st: any) => {
    setEditingId(st.staff_id);
    setForm({
      name: st.name,
      role: st.role,
      email: st.email || '',
      mobile: st.mobile || '',
      whatsapp_number: st.whatsapp_number || '',
      department: st.department || 'Operations',
      status: st.status,
      staff_type: st.Staff_Type || st.staff_type || 'In-House',
      joining_date: st.joining_date || new Date().toISOString().split('T')[0],
      profile_photo: st.profile_photo || '',
      notes: st.notes || ''
    });
    const loadedSkills = typeof st.Skill === 'string'
      ? st.Skill.split(',').map((s: string) => s.trim()).filter(Boolean)
      : (Array.isArray(st.Skill) ? st.Skill : []);
    setSkills(loadedSkills);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({
      name: '',
      role: 'Lead Photographer',
      email: '',
      mobile: '',
      whatsapp_number: '',
      department: 'Operations',
      status: 'Active',
      staff_type: 'In-House',
      joining_date: new Date().toISOString().split('T')[0],
      profile_photo: '',
      notes: ''
    });
    setSkills([]);
    setNewSkill('');
  };

  const handleAddSkill = async () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      const newSkills = [...skills, trimmed];
      setSkills(newSkills);
      setNewSkill('');
      
      if (editingId) {
        try {
          await updateStaff(editingId, { Skill: newSkills.join(', ') });
        } catch (e) {
          console.error("Failed to update skills in real-time:", e);
        }
      }
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    const newSkills = skills.filter(s => s !== skillToRemove);
    setSkills(newSkills);
    
    if (editingId) {
      try {
        await updateStaff(editingId, { Skill: newSkills.join(', ') });
      } catch (e) {
        console.error("Failed to update skills in real-time:", e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile) {
      alert('Please fill out the name and mobile fields.');
      return;
    }

    const mobileRegex = /^[0-9+\s-]{10,}$/;
    if (!mobileRegex.test(form.mobile)) {
      alert('Please enter a valid mobile number.');
      return;
    }

    // Auto-generate email and set notes to comma-separated skills
    const finalEmail = form.email || `${form.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff'}@photocrew.com`;
    const finalSkillsStr = skills.join(', ');

    const submissionPayload = {
      ...form,
      email: finalEmail,
      Skill: finalSkillsStr,
      Staff_Type: form.staff_type
    };

    try {
      setIsSaving(true);
      if (editingId) {
        await updateStaff(editingId, submissionPayload);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 font-sans text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5';
        toast.innerHTML = '✅ Staff details updated successfully.';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        handleCancel();
      } else {
        await addStaff(submissionPayload);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 font-sans text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5';
        toast.innerHTML = '✅ New staff member registered.';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        handleCancel();
      }
    } catch (err: any) {
      alert(`Operation failed: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to delete staff member "${name}"? This action cannot be undone.`)) {
      try {
        setOperatingId(id);
        await deleteStaff(id);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 font-sans text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5';
        toast.innerHTML = `✅ Staff member "${name}" deleted successfully.`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      } catch (err: any) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 font-sans text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5';
        toast.innerHTML = `❌ Failed to delete staff member: ${err.message || err}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      } finally {
        setOperatingId(null);
      }
    }
  };

  const handleStatusChange = async (staffId: string, newStatus: 'Active' | 'Inactive') => {
    try {
      setOperatingId(staffId);
      await updateStaff(staffId, { status: newStatus });
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 font-sans text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5';
      toast.innerHTML = `✅ Staff member successfully ${newStatus === 'Active' ? 'activated' : 'deactivated'}.`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err: any) {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 font-sans text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5';
      toast.innerHTML = `❌ Failed to update status: ${err.message || err}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setOperatingId(null);
    }
  };

  // Keep list filtered to crew profiles (photographers, videographers, drone operators, assistants) for high specificity
  const operationsCrew = staff;

  // Helper to get all active bookings/events for a staff member
  const getStaffActiveBookings = (staffName: string) => {
    const activeBookings: any[] = [];

    (leads || []).forEach((lead) => {
      const order = (orders || []).find(o => o.lead_id === lead.lead_id);
      const op = operations.find(o => o.order_id === (order?.order_id || lead.lead_id));

      // Determine booking/event status
      const bookingStage = order?.current_stage || lead.status;
      const eventStatus = op?.event_status || 'Assigned';

      // We skip completed/cancelled bookings
      const isCompletedOrCancelled = [
        'completed', 'event completed', 'raw footage received', 'event cancelled', 'closed', 'delivered', 'cancelled'
      ].includes(bookingStage.toLowerCase()) || [
        'completed', 'event completed', 'cancelled'
      ].includes(eventStatus.toLowerCase());

      if (isCompletedOrCancelled) {
        return;
      }

      // Check 1: Specific sub-events in lead.events
      let hasEventAssignment = false;
      if (lead.events && lead.events.length > 0) {
        lead.events.forEach((ev) => {
          const assignedNames = ev.assigned_staff_names 
            ? ev.assigned_staff_names.split(',').map(n => n.trim().toLowerCase()) 
            : [];
          
          if (assignedNames.includes(staffName.toLowerCase())) {
            hasEventAssignment = true;

            // Resolve equipment assigned to this event or staff
            let equipmentAssigned = 'None';
            const mobilesRaw = ev.assigned_staff_mobiles || '';
            if (mobilesRaw.includes(' || EQUIPMENT: JSON:')) {
               try {
                  const parts = mobilesRaw.split(' || EQUIPMENT: JSON:');
                  const staffEqs = JSON.parse(parts[1]);
                  const names = ev.assigned_staff_names ? ev.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase()) : [];
                  const idx = names.indexOf(staffName.toLowerCase());
                  if (idx !== -1 && staffEqs[idx] && staffEqs[idx].length > 0) {
                      equipmentAssigned = staffEqs[idx].join(', ');
                  }
               } catch(e) {}
            } else if (mobilesRaw.includes(' || EQUIPMENT: ')) {
              const parts = mobilesRaw.split(' || EQUIPMENT: ');
              equipmentAssigned = parts[1] || 'None';
            } else if (op?.equipment_kit) {
              equipmentAssigned = op.equipment_kit;
            }

            // Resolve role assigned
            const staffObj = staff?.find(s => s.name.toLowerCase() === staffName.toLowerCase());
            let assignedRole = staffObj ? staffObj.role : 'Crew';
            const sa = staffAssignments?.find(s => s.order_id === order?.order_id && s.staff_name.toLowerCase() === staffName.toLowerCase());
            if (sa?.staff_role) {
              assignedRole = sa.staff_role;
            }

            activeBookings.push({
              id: `event-${ev.id}-${staffName}`,
              eventName: ev.event_type === 'Other' ? (ev.event_name || 'Other Event') : (ev.event_type || 'N/A'),
              clientName: lead.customer_name || order?.customer_name || 'N/A',
              shootType: ev.event_shoot_type || lead.shoot_type || 'N/A',
              assignedRole: assignedRole,
              eventDate: ev.event_date || 'N/A',
              eventStartTime: ev.event_start_time || 'N/A',
              eventEndTime: ev.event_end_time || 'N/A',
              reportingDate: ev.reporting_date || ev.event_date || 'N/A',
              reportingTime: ev.reporting_time || 'N/A',
              venue: ev.event_location || lead.event_location || 'N/A',
              googleMapsLink: ev.google_maps_link || 'N/A',
              leadStatus: lead.status,
              equipmentAssigned: equipmentAssigned,
              coordinator: lead.sales_person || lead.created_by || 'Operations Team',
              eventStatus: eventStatus,
              bookingStatus: bookingStage
            });
          }
        });
      }

      // Check 2: General order/operation assignments if no specific sub-events were matched
      if (!hasEventAssignment) {
        const isAssignedInOp = op && (
          op.photographer_assigned?.toLowerCase() === staffName.toLowerCase() ||
          op.videographer_assigned?.toLowerCase() === staffName.toLowerCase() ||
          op.drone_operator_assigned?.toLowerCase() === staffName.toLowerCase() ||
          op.assistant_assigned?.toLowerCase() === staffName.toLowerCase()
        );

        const hasStaffAssignment = staffAssignments?.some(sa => 
          sa.order_id === order?.order_id && 
          sa.staff_name.toLowerCase() === staffName.toLowerCase() &&
          sa.assignment_status !== 'Cancelled'
        );

        if (isAssignedInOp || hasStaffAssignment) {
          // Resolve role assigned
          let assignedRole = 'Crew';
          if (op) {
            if (op.photographer_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Photographer';
            else if (op.videographer_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Videographer';
            else if (op.drone_operator_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Drone Operator';
            else if (op.assistant_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Assistant';
          }
          
          const sa = staffAssignments?.find(s => s.order_id === order?.order_id && s.staff_name.toLowerCase() === staffName.toLowerCase());
          if (sa?.staff_role) {
            assignedRole = sa.staff_role;
          } else {
            const staffObj = staff?.find(s => s.name.toLowerCase() === staffName.toLowerCase());
            if (staffObj) {
              assignedRole = staffObj.role;
            }
          }

          activeBookings.push({
            id: `order-${lead.lead_id}-${staffName}`,
            eventName: lead.custom_event_name || order?.event_type || lead.event_type || 'N/A',
            clientName: lead.customer_name || order?.customer_name || 'N/A',
            shootType: lead.shoot_type || order?.shoot_type || 'N/A',
            assignedRole: assignedRole,
            eventDate: lead.event_date || order?.event_date || 'N/A',
            eventStartTime: lead.event_time || order?.event_time || 'N/A',
            eventEndTime: 'N/A',
            reportingDate: lead.Reporting_date || lead.event_date || 'N/A',
            reportingTime: lead.reporting_time || op?.reporting_time || 'N/A',
            venue: lead.event_location || order?.event_location || 'N/A',
            googleMapsLink: (lead as any).google_maps_link || 'N/A',
            leadStatus: lead.status,
            equipmentAssigned: op?.equipment_kit || 'None',
            coordinator: lead.sales_person || lead.created_by || 'Operations Team',
            eventStatus: eventStatus,
            bookingStatus: bookingStage
          });
        }
      }
    });

    return activeBookings;
  };

  // Track active operations for each staff member
  const getStaffActiveAssignmentsCount = (name: string) => {
    return getStaffActiveBookings(name).length;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Roster form - Left */}
      <div className="lg:col-span-4 flex flex-col bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl space-y-4 overflow-hidden h-full">
        <h3 className="text-xs font-mono font-black uppercase text-zinc-300 flex items-center gap-1.5 border-b border-zinc-850 pb-2.5">
          <PlusCircle className="w-4 h-4 text-amber-500" />
          <span>{editingId ? 'Edit Operative Profile' : 'Onboard Field Operative'}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs flex-1 flex flex-col">
          <fieldset disabled={!canEdit} className="space-y-4 flex-1">
            <div className="min-w-0">
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-450 mb-1">
                Staff Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jack Richards"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full min-w-0 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-450 mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +91 9876543210"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full min-w-0 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-450 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                className="w-full min-w-0 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-450 mb-1">
                Staff Type *
              </label>
              <select
                required
                value={form.staff_type}
                onChange={(e) => setForm({ ...form, staff_type: e.target.value as 'In-House' | 'Freelancer' })}
                className="w-full min-w-0 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="In-House">In-House</option>
                <option value="Freelancer">Freelancer</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-450 mb-1">
                Skills
              </label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 bg-zinc-950 border border-zinc-850 rounded-xl items-center w-full">
                {skills.length === 0 ? (
                  <span className="text-zinc-550 italic font-mono text-[10px] pl-1">No skills added yet</span>
                ) : (
                  skills.map((skill) => (
                    <div 
                      key={skill} 
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[10px] rounded-lg break-all"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-zinc-500 hover:text-rose-400 focus:outline-none transition-colors ml-1 font-bold cursor-pointer shrink-0"
                        title={`Remove ${skill}`}
                      >
                        ✖
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  placeholder="Type a skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-1 min-w-0 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-amber-500/50 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-3 py-1.5 shrink-0 bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs transition-all font-mono font-bold cursor-pointer"
                >
                  + Add Skill
                </button>
              </div>
            </div>
          </fieldset>

          {canEdit ? (
            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-850">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-2 bg-zinc-800 text-zinc-305 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Processing...' : (editingId ? 'Save Changes' : 'Confirm Onboarding')}
              </button>
            </div>
          ) : (
            <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-850 text-[10px] text-zinc-450 font-mono">
              🔒 Operations permissions required for editing.
            </div>
          )}
        </form>
      </div>

      {/* Roster table - Right */}
      <div className="lg:col-span-8 flex flex-col bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl space-y-4 overflow-hidden h-full">
        <h3 className="text-xs font-mono font-black uppercase text-zinc-300 flex items-center gap-1.5 border-b border-zinc-850 pb-2.5">
          <Users className="w-4 h-4 text-amber-500" />
          <span>ACTIVE ROSTER SUMMARY ({operationsCrew.length} registered)</span>
        </h3>

        <div className="overflow-x-auto text-xs flex-1 bg-zinc-950/30 rounded-xl border border-zinc-850">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-850 text-[10px] font-mono uppercase text-zinc-400 bg-zinc-950/30">
                <th className="p-3.5">Code / Roster</th>
                <th className="p-3.5 font-bold">Contact Node</th>
                <th className="p-3.5 font-bold">Specialty & Rating</th>
                <th className="p-3.5 font-bold">Roster Status</th>
                <th className="p-3.5 font-bold">Active Shoots</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
              {operationsCrew.length > 0 ? (
                operationsCrew.map((st) => {
                  const activeAssignmentsCount = getStaffActiveAssignmentsCount(st.name);
                  return (
                    <tr key={st.staff_id} className="hover:bg-zinc-900/10 transition-all">
                      <td className="p-3.5">
                        <div className="font-mono text-zinc-405 bg-zinc-950 px-1.5 py-0.5 rounded text-[10px] w-fit border border-zinc-850">
                          {st.staff_id}
                        </div>
                        <div className="font-bold text-zinc-100 mt-1">{st.name}</div>
                      </td>
                      <td className="p-3.5 space-y-1 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-zinc-550 flex-shrink-0" />
                          <span>{st.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-550 flex-shrink-0" />
                          <span>{st.mobile}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px]">
                          <span>Dept: {st.department}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px]">
                          <span>Type: {st.staff_type || 'In-House'}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-zinc-200">{st.role}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Joined: {st.joining_date}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          st.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                            : 'bg-zinc-805 text-zinc-450 border-zinc-755'
                        }`}>
                          {st.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            const bookings = getStaffActiveBookings(st.name);
                            setSelectedStaffBookings({ staffName: st.name, bookings });
                            setSearchQuery('');
                          }}
                          className={`flex items-center gap-2 font-mono text-xs text-left cursor-pointer group transition-all duration-200 ${
                            activeAssignmentsCount > 0 
                              ? 'text-amber-500 hover:text-amber-400 hover:underline' 
                              : 'text-zinc-500 hover:text-zinc-400'
                          }`}
                          title={`Click to view bookings for ${st.name}`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${activeAssignmentsCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'}`} />
                          <span className="font-semibold">
                            {activeAssignmentsCount === 1 ? '1 Booking' : `${activeAssignmentsCount} Bookings`}
                          </span>
                        </button>
                      </td>
                       <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleSelectEdit(st)}
                                disabled={operatingId !== null}
                                className="p-1.5 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded border border-transparent hover:border-zinc-800 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Edit operatives profile"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {st.status === 'Active' ? (
                                <button
                                  onClick={() => handleStatusChange(st.staff_id, 'Inactive')}
                                  disabled={operatingId !== null}
                                  className="px-2 py-1 text-[10px] font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 hover:border-amber-500/40 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                  title="Deactivate Staff Member"
                                >
                                  {operatingId === st.staff_id ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                  ) : null}
                                  <span>Deactivate</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(st.staff_id, 'Active')}
                                  disabled={operatingId !== null}
                                  className="px-2 py-1 text-[10px] font-mono font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border border-emerald-500/25 hover:border-emerald-500/40 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                  title="Activate Staff Member"
                                >
                                  {operatingId === st.staff_id ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  ) : null}
                                  <span>Activate</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(st.staff_id, st.name)}
                                disabled={operatingId !== null}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-450 border border-rose-500/20 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                                title="Delete Staff Member"
                              >
                                {operatingId === st.staff_id ? (
                                  <span className="w-3 h-3 border-2 border-rose-450 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-zinc-550 italic font-mono">
                    No field personnel currently on call.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedStaffBookings && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-850 flex items-center justify-between bg-zinc-950/40">
                <div className="space-y-1">
                  <h3 className="text-sm font-mono font-bold uppercase text-amber-500 flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    Active Roster Summary — {selectedStaffBookings.staffName}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Currently allocated events and operations on call.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStaffBookings(null)}
                  className="text-zinc-400 hover:text-white bg-zinc-850 hover:bg-zinc-855 p-2 rounded-full cursor-pointer transition-colors"
                  type="button"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Search Bar */}
                {selectedStaffBookings.bookings.length > 0 && (
                  <div className="relative max-w-md w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-550">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search by event, client, role, date or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 placeholder-zinc-550 font-mono"
                    />
                  </div>
                )}

                {/* Event Details Table */}
                {(() => {
                  const query = searchQuery.trim().toLowerCase();
                  const filtered = selectedStaffBookings.bookings.filter(b => {
                    if (!query) return true;
                    return (
                      b.eventName?.toLowerCase().includes(query) ||
                      b.clientName?.toLowerCase().includes(query) ||
                      b.shootType?.toLowerCase().includes(query) ||
                      b.assignedRole?.toLowerCase().includes(query) ||
                      b.venue?.toLowerCase().includes(query) ||
                      b.eventDate?.toLowerCase().includes(query)
                    );
                  });

                  if (selectedStaffBookings.bookings.length === 0) {
                    return (
                      <div className="py-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                        <div className="text-zinc-500 italic font-mono text-sm">
                          No Active Bookings
                        </div>
                        <p className="text-xs text-zinc-600 mt-1">
                          This staff member has no assigned active events or shoots.
                        </p>
                      </div>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center text-zinc-500 italic font-mono text-xs">
                        No bookings match your search query "{searchQuery}".
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto rounded-2xl border border-zinc-850 bg-zinc-950/20">
                      <table className="w-full text-left border-collapse min-w-[1500px] text-xs">
                        <thead>
                          <tr className="border-b border-zinc-850 bg-zinc-950/60 font-mono text-[10px] uppercase text-zinc-400">
                            <th className="p-3.5 font-bold">Event Name</th>
                            <th className="p-3.5 font-bold">Client Name</th>
                            <th className="p-3.5 font-bold">Shoot Type</th>
                            <th className="p-3.5 font-bold">Assigned Role</th>
                            <th className="p-3.5 font-bold">Event Date</th>
                            <th className="p-3.5 font-bold">Event Start Time</th>
                            <th className="p-3.5 font-bold">Event End Time</th>
                            <th className="p-3.5 font-bold">Reporting Date</th>
                            <th className="p-3.5 font-bold">Reporting Time</th>
                            <th className="p-3.5 font-bold">Venue / Event Location</th>
                            <th className="p-3.5 font-bold">Google Maps Link</th>
                            <th className="p-3.5 font-bold">Lead Status</th>
                            <th className="p-3.5 font-bold">Equipment Assigned</th>
                            <th className="p-3.5 font-bold">Operations Coordinator</th>
                            <th className="p-3.5 font-bold">Current Event Status</th>
                            <th className="p-3.5 font-bold">Booking Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                          {filtered.map((b) => (
                            <tr key={b.id} className="hover:bg-zinc-900/20 transition-all">
                              <td className="p-3.5 font-bold text-zinc-100">{b.eventName}</td>
                              <td className="p-3.5 text-zinc-300">{b.clientName}</td>
                              <td className="p-3.5 text-zinc-300 font-mono text-[11px]">{b.shootType}</td>
                              <td className="p-3.5 text-indigo-400 font-mono font-bold text-[11px]">{b.assignedRole}</td>
                              <td className="p-3.5 font-mono text-zinc-300 font-medium">{b.eventDate}</td>
                              <td className="p-3.5 font-mono text-zinc-400">{b.eventStartTime}</td>
                              <td className="p-3.5 font-mono text-zinc-400">{b.eventEndTime}</td>
                              <td className="p-3.5 font-mono text-zinc-400">{b.reportingDate}</td>
                              <td className="p-3.5 font-mono text-zinc-400">{b.reportingTime}</td>
                              <td className="p-3.5 text-zinc-300 max-w-xs truncate" title={b.venue}>
                                {b.venue}
                              </td>
                              <td className="p-3.5">
                                {b.googleMapsLink && b.googleMapsLink !== 'N/A' ? (
                                  <a 
                                    href={b.googleMapsLink} 
                                    target="_blank" 
                                    referrerPolicy="no-referrer"
                                    rel="noopener noreferrer" 
                                    className="text-amber-500 hover:underline font-mono text-[11px] font-bold"
                                  >
                                    Maps ↗
                                  </a>
                                ) : (
                                  <span className="text-zinc-650 font-mono">N/A</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-900 text-zinc-450 border border-zinc-800">
                                  {b.leadStatus}
                                </span>
                              </td>
                              <td className="p-3.5 font-mono text-amber-400 font-bold text-[11px]">{b.equipmentAssigned}</td>
                              <td className="p-3.5 text-zinc-300">{b.coordinator}</td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                                  b.eventStatus.toLowerCase() === 'completed' || b.eventStatus.toLowerCase() === 'event completed'
                                    ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                }`}>
                                  {b.eventStatus}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
                                  {b.bookingStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-850 flex justify-end bg-zinc-950/40">
                <button
                  type="button"
                  onClick={() => setSelectedStaffBookings(null)}
                  className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
