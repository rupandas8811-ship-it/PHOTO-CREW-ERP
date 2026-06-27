import React, { useState } from 'react';
import { useRole } from '../RoleContext';
import { 
  Users, UserCheck, ShieldAlert, PlusCircle, Edit, Trash2, Mail, Phone, Calendar, Briefcase
} from 'lucide-react';
import { Staff } from '../../types';

export const OperationsStaffManagement: React.FC = () => {
  const { currentRole, staff, addStaff, updateStaff, deleteStaff, operations } = useRole();
  const canEdit = currentRole === 'Operations Team' || currentRole === 'Business Owner';

  // Modal / Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    role: 'Lead Photographer',
    email: '',
    mobile: '',
    department: 'Operations',
    status: 'Active' as Staff['status'],
    joining_date: new Date().toISOString().split('T')[0],
    profile_photo: '',
    notes: ''
  });

  const handleSelectEdit = (st: Staff) => {
    setEditingId(st.staff_id);
    setForm({
      name: st.name,
      role: st.role,
      email: st.email || '',
      mobile: st.mobile || '',
      department: st.department || 'Operations',
      status: st.status,
      joining_date: st.joining_date || new Date().toISOString().split('T')[0],
      profile_photo: st.profile_photo || '',
      notes: st.notes || ''
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({
      name: '',
      role: 'Lead Photographer',
      email: '',
      mobile: '',
      department: 'Operations',
      status: 'Active',
      joining_date: new Date().toISOString().split('T')[0],
      profile_photo: '',
      notes: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.mobile) {
      alert('Please fill out the name, email, and mobile fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    const mobileRegex = /^[0-9+\s-]{10,}$/;
    if (!mobileRegex.test(form.mobile)) {
      alert('Please enter a valid mobile number.');
      return;
    }

    if (editingId) {
      updateStaff(editingId, form).then(() => {
        alert('Staff profile updated.');
        handleCancel();
      }).catch(err => {
        alert(`Failed to update staff: ${err.message}`);
      });
    } else {
      addStaff(form).then(() => {
        alert('New staff member registered.');
        handleCancel();
      }).catch(err => {
        alert(`Failed to register staff: ${err.message}`);
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`De-register agent "${name}" from operational roster?`)) {
      deleteStaff(id);
      alert('Roster entry dropped.');
    }
  };

  // Keep list filtered to crew profiles (photographers, videographers, drone operators, assistants) for high specificity
  const operationsCrew = staff;

  // Track active operations for each staff member
  const getStaffActiveAssignmentsCount = (name: string) => {
    return operations.filter(o => 
      (o.photographer_assigned === name || 
       o.videographer_assigned === name || 
       o.drone_operator_assigned === name || 
       o.assistant_assigned === name) && 
      o.event_status !== 'Completed'
    ).length;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Roster form - Left */}
      <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-mono font-black uppercase text-zinc-300 flex items-center gap-1.5 border-b border-zinc-850 pb-2.5">
          <PlusCircle className="w-4 h-4 text-amber-500" />
          <span>{editingId ? 'Edit Operative Profile' : 'Onboard Field Operative'}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <fieldset disabled={!canEdit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-450 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jack Richards"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-450 mb-1">
                Primary Specialty Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white"
              >
                <option value="Lead Photographer">Lead Photographer</option>
                <option value="Associate Photographer">Associate Photographer</option>
                <option value="Lead Videographer">Lead Videographer</option>
                <option value="Drone & Aerial Operator">Drone & Aerial Operator</option>
                <option value="Production Assistant">Production Assistant</option>
                <option value="Post-Production Editor">Post-Production Editor</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-450 mb-1">
                Department
              </label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white"
              >
                <option value="Operations">Operations</option>
                <option value="Sales">Sales</option>
                <option value="Production">Production</option>
                <option value="Post-Production">Post-Production</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-455 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@photocrew.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-455 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 0192"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-455 mb-1">
                Joining Date
              </label>
              <input
                type="date"
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-455 mb-1">
                  Roster Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Staff['status'] })}
                  className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Active">Active (On Call)</option>
                  <option value="Inactive">Inactive (Suspended)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-455 mb-1">
                  Profile Photo URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/photo.jpg"
                  value={form.profile_photo}
                  onChange={(e) => setForm({ ...form, profile_photo: e.target.value })}
                  className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-extrabold uppercase text-zinc-455 mb-1">
                Notes / Bio
              </label>
              <textarea
                rows={3}
                placeholder="List qualified camera systems, certified Part 107 licensing details, active shoot preferences..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-zinc-955 border border-zinc-850 rounded-xl p-2.5 text-white focus:outline-none"
              />
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
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-xl cursor-pointer"
              >
                {editingId ? 'Save Changes' : 'Confirm Onboarding'}
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
      <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-850 bg-zinc-950/70 flex items-center justify-between">
          <h3 className="text-[10px] font-mono font-black text-zinc-350 uppercase tracking-widest flex items-center gap-1.5">
            <Users className="w-4 h-4 text-amber-500" />
            <span>ACTIVE ROSTER SUMMARY ({operationsCrew.length} registered)</span>
          </h3>
        </div>

        <div className="overflow-x-auto text-xs">
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
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className={`w-2 h-2 rounded-full ${activeAssignmentsCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'}`} />
                          <span>{activeAssignmentsCount} booked</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleSelectEdit(st)}
                                className="p-1.5 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
                                title="Edit operatives profile"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(st.staff_id, st.name)}
                                className="p-1.5 hover:bg-zinc-850 text-zinc-400 hover:text-red-400 rounded transition-all cursor-pointer"
                                title="De-register Operative"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
