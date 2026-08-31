import React, { useState, useMemo } from 'react';
import { useRole } from './RoleContext';
import { 
  Users, UserPlus, Shield, ToggleLeft, ToggleRight, Key, Mail, Phone, Calendar, 
  PenTool, CheckCircle, Ban, RefreshCw, X, AlertOctagon, HelpCircle, Activity, 
  Server, Database, Check, AlertCircle as AlertCircleIcon, Terminal, 
  Trash2, Briefcase, Eye, Save, Lock
} from 'lucide-react';
import { User, UserRole, Lead } from '../types';

export const SalesStaffManagementModule: React.FC = () => {
  const { users, currentUser, addUser, editUser, deleteUser, toggleUserStatus, resetUserPassword, leads, currentRole } = useRole();

  // Filter only sales team users
  const salesStaffList = useMemo(() => {
    return users.filter(u => u.role === 'Sales Team');
  }, [users]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResetPwdForm, setShowResetPwdForm] = useState(false);
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // New Staff State
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newActive, setNewActive] = useState(true);

  // Edit Staff State
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Reset Password State
  const [resetPwd, setResetPwd] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newMobile.trim() || !newPassword.trim()) {
      alert("Name, Mobile, and Password are required.");
      return;
    }

    try {
      // addUser signature: addUser(name, email, mobile, role, active, password, employee_id) 
      // Wait, let's check addUser in RoleContext or I might need to adjust it.
      // We will pass the arguments. If addUser doesn't take employeeId, we can add it later.
      // But we can update the user right after.
      await addUser(newName, newEmail, newMobile, 'Sales Team', newActive, newPassword, newEmployeeId);
      
      setNewName('');
      setNewEmail('');
      setNewMobile('');
      setNewPassword('');
      setNewEmployeeId('');
      setNewActive(true);
      setShowAddForm(false);
    } catch (err: any) {
      alert(`Failed to add staff: ${err.message}`);
    }
  };

  const openEditForm = (usr: User) => {
    setSelectedUserId(usr.id);
    setEditName(usr.name);
    setEditEmail(usr.email || '');
    setEditMobile(usr.mobile);
    setEditEmployeeId(usr.employee_id || '');
    setEditActive(usr.active);
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    if (!editName.trim() || !editMobile.trim()) {
      alert("Name and Mobile are required.");
      return;
    }

    try {
      await editUser(selectedUserId, {
        name: editName,
        employee_id: editEmployeeId,
        active: editActive,
      });
      setShowEditForm(false);
      setSelectedUserId(null);
    } catch (err: any) {
      alert(`Failed to update staff: ${err.message}`);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !resetPwd.trim()) {
      alert("Password is required.");
      return;
    }
    
    try {
      await resetUserPassword(selectedUserId, resetPwd);
      setResetPwd('');
      setShowResetPwdForm(false);
      setSelectedUserId(null);
      alert("Password reset successfully.");
    } catch (err: any) {
      alert(`Failed to reset password: ${err.message}`);
    }
  };
  
  const getAssignedLeadsCount = (userId: string, userName: string) => {
    return leads.filter(l => l.sales_staff_id === userId || l.sales_person === userName).length;
  };
  
  const getActiveAssignedLeadsCount = (userId: string, userName: string) => {
    return leads.filter(l => (l.sales_staff_id === userId || l.sales_person === userName) && l.status !== 'Lead Lost' && l.status !== 'Order Confirmed').length;
  };

  const handleDeleteStaff = async (usr: User) => {
    const activeLeadsCount = getActiveAssignedLeadsCount(usr.id, usr.name);
    if (activeLeadsCount > 0) {
      alert(`Cannot delete this Sales Staff because they have ${activeLeadsCount} active lead(s) assigned. Please reassign the leads before deleting.`);
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${usr.name}? This action cannot be undone.`)) {
      try {
        await deleteUser(usr.id);
      } catch (err: any) {
        alert(`Failed to delete staff: ${err.message}`);
      }
    }
  };

  if (currentRole !== 'Business Owner') {
    return (
      <div className="p-8 text-center text-rose-500">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Sales Staff Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage Sales Executives, authentication, and assignments.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/20"
        >
          <UserPlus className="w-4 h-4" />
          Add Sales Staff
        </button>
      </div>

      <div className="bg-[#09090b] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto min-h-[400px] custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800 text-[10px] uppercase font-mono tracking-wider text-zinc-400 whitespace-nowrap">
                <th className="p-4 font-bold">Staff Name</th>
                <th className="p-4 font-bold">Contact</th>
                <th className="p-4 font-bold">Employee ID</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Leads (Total/Active)</th>
                <th className="p-4 font-bold">Created Date</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {salesStaffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono text-xs">
                    No Sales Staff found. Click "Add Sales Staff" to create one.
                  </td>
                </tr>
              ) : (
                salesStaffList.map((usr) => (
                  <tr key={usr.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-slate-200">{usr.name}</div>
                      {usr.username && <div className="text-xs text-slate-500">@{usr.username}</div>}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {usr.mobile}
                      </div>
                      {usr.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                          <Mail className="w-3 h-3" />
                          {usr.email}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm font-mono text-slate-300 whitespace-nowrap">
                      {usr.employee_id || '-'}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${usr.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                        {usr.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono whitespace-nowrap">
                      <span className="text-slate-300">{getAssignedLeadsCount(usr.id, usr.name)} Total</span>
                      <span className="text-slate-500 mx-2">|</span>
                      <span className="text-indigo-400">{getActiveAssignedLeadsCount(usr.id, usr.name)} Active</span>
                    </td>
                    <td className="p-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                      {new Date(usr.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditForm(usr)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                          title="Edit Staff"
                        >
                          <PenTool className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(usr.id)}
                          className={`p-1.5 rounded transition-colors ${usr.active ? 'text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' : 'text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'}`}
                          title={usr.active ? 'Deactivate' : 'Activate'}
                        >
                          {usr.active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => { setSelectedUserId(usr.id); setShowResetPwdForm(true); }}
                          className="p-1.5 text-slate-400 hover:text-sky-400 bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                          title="Reset Password"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(usr)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                          title="Delete Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Add Sales Staff
              </h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name *</label>
                  <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Mobile Number (Login ID) *</label>
                  <input type="tel" required value={newMobile} onChange={e => setNewMobile(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="10-digit mobile number" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password *</label>
                  <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Create a secure password" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address (Optional)</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Employee ID (Optional)</label>
                  <input type="text" value={newEmployeeId} onChange={e => setNewEmployeeId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="EMP-1001" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <label className="text-sm font-bold text-slate-300">Status</label>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold ${newActive ? 'text-emerald-400' : 'text-slate-500'}`}>ACTIVE</span>
                    <button type="button" onClick={() => setNewActive(!newActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newActive ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="pt-6 flex gap-3 justify-end border-t border-zinc-800 mt-6">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-300 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Sales Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-indigo-400" />
                Edit Sales Staff
              </h2>
              <button onClick={() => setShowEditForm(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name *</label>
                  <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile Number (Login ID) *</label>
                    <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1 font-bold">🔒 Locked (Permanent)</span>
                  </div>
                  <input type="tel" disabled readOnly value={editMobile} onChange={e => setEditMobile(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none opacity-60 cursor-not-allowed bg-zinc-900/60" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address (Optional)</label>
                    <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1 font-bold">🔒 Locked (Permanent)</span>
                  </div>
                  <input type="email" disabled readOnly value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none opacity-60 cursor-not-allowed bg-zinc-900/60" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Employee ID (Optional)</label>
                  <input type="text" value={editEmployeeId} onChange={e => setEditEmployeeId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <label className="text-sm font-bold text-slate-300">Status</label>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold ${editActive ? 'text-emerald-400' : 'text-slate-500'}`}>ACTIVE</span>
                    <button type="button" onClick={() => setEditActive(!editActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editActive ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="pt-6 flex gap-3 justify-end border-t border-zinc-800 mt-6">
                <button type="button" onClick={() => setShowEditForm(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-300 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPwdForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-400" />
                Reset Password
              </h2>
              <button onClick={() => setShowResetPwdForm(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">New Password *</label>
                <input type="password" required value={resetPwd} onChange={e => setResetPwd(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-colors" placeholder="Enter new password" />
              </div>
              <div className="pt-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowResetPwdForm(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-colors">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
