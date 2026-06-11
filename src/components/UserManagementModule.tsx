import React, { useState } from 'react';
import { useRole } from './RoleContext';
import { 
  Users, UserPlus, Shield, ToggleLeft, ToggleRight, Key, Mail, Phone, Calendar, PenTool, CheckCircle, Ban, RefreshCw, X, AlertOctagon, HelpCircle
} from 'lucide-react';
import { User, UserRole } from '../types';

export const UserManagementModule: React.FC = () => {
  const { users, currentUser, addUser, editUser, toggleUserStatus, resetUserPassword } = useRole();

  // Role Gate: Only Business Owner can edit
  const canAdministrate = currentUser?.role === 'Business Owner';

  // Modal / Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);

  // Add User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Sales Team');
  const [newActive, setNewActive] = useState(true);
  const [newPassword, setNewPassword] = useState('');

  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Sales Team');
  const [editActive, setEditActive] = useState(true);

  // Password reset state
  const [newResetPasswordValue, setNewResetPasswordValue] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newMobile.trim() || !newPassword.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    addUser(newName, newEmail, newMobile, newRole, newActive, newPassword);
    
    // Clear state
    setNewName('');
    setNewEmail('');
    setNewMobile('');
    setNewRole('Sales Team');
    setNewActive(true);
    setNewPassword('');
    setShowAddForm(false);
    
    alert('Staff account registered successfully in system directory!');
  };

  const handleEditClick = (usr: User) => {
    if (usr.id === currentUser?.id) {
       alert('To prevent lock-outs, edit your personal email from the profile panel.');
       // We can let them edit, but let's remind them. Actually, let's allow it but warn them.
    }
    setEditingUser(usr);
    setEditName(usr.name);
    setEditEmail(usr.email);
    setEditMobile(usr.mobile);
    setEditRole(usr.role);
    setEditActive(usr.active);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim() || !editMobile.trim()) {
      alert('Required values cannot be left empty.');
      return;
    }

    editUser(editingUser.id, {
      name: editName,
      email: editEmail,
      mobile: editMobile,
      role: editRole,
      active: editActive
    });

    setEditingUser(null);
    alert(`Account details of ${editName} updated successfully!`);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPasswordUser) return;
    if (!newResetPasswordValue.trim()) {
      alert('Password cannot be spaces.');
      return;
    }

    resetUserPassword(resettingPasswordUser.id, newResetPasswordValue);
    setNewResetPasswordValue('');
    setResettingPasswordUser(null);
    alert('Access credentials updated in secure index!');
  };

  // Helper calculations
  const totalStaffCount = users.length;
  const activeStaffCount = users.filter(u => u.active).length;
  const inactiveStaffCount = totalStaffCount - activeStaffCount;

  return (
    <div id="user_management_module" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-101 flex items-center gap-2">
            <span>🛡️</span> Personnel & Access Administration
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Register employees, assign role isolation boundaries, deactivate accounts, and view overall credentials index.
          </p>
        </div>
        {canAdministrate && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingUser(null);
              setResettingPasswordUser(null);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/10 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create User Account</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono font-semibold text-slate-500">Personnel Index</span>
            <p className="text-2xl font-bold mt-1 text-slate-101 font-mono">{totalStaffCount}</p>
          </div>
          <div className="p-2 bg-indigo-600/10 rounded-lg">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono font-semibold text-slate-540">Active Cleared Staff</span>
            <p className="text-2xl font-bold mt-1 text-emerald-400 font-mono">{activeStaffCount}</p>
          </div>
          <div className="p-2 bg-emerald-600/10 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono font-semibold text-slate-540">Suspended / Inactive</span>
            <p className="text-2xl font-bold mt-1 text-rose-450 font-mono">{inactiveStaffCount}</p>
          </div>
          <div className="p-2 bg-rose-600/10 rounded-lg">
            <Ban className="w-5 h-5 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Users Directory Table */}
        <div className="lg:col-span-12 bg-slate-850 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="p-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-widest flex items-center gap-1.5">
              <span>👥</span> Database Directory Users
            </h3>
            <span className="text-[9px] bg-indigo-650/15 text-indigo-400 font-mono px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-semibold">
              RBAC Boundaries Enforcement
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-404 font-medium border-b border-slate-800">
                  <th className="p-3 pl-4">ID</th>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Role Level & Scope</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Active Status</th>
                  <th className="p-3 text-right pr-4">Oversight Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.map((usr) => {
                  const isCurrentUser = usr.id === currentUser?.id;
                  return (
                    <tr 
                      key={usr.id} 
                      className={`hover:bg-slate-805/30 transition-all ${
                        isCurrentUser ? 'bg-indigo-600/5' : ''
                      }`}
                    >
                      {/* ID */}
                      <td className="p-3 pl-4 font-mono font-bold text-slate-500 text-[11px]">
                        {usr.id}
                      </td>

                      {/* Name / Created At */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">
                          {usr.name}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-[9px] px-1 bg-indigo-505/25 text-indigo-300 rounded font-mono border border-indigo-400/25">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>Joined: {usr.created_at ? usr.created_at.split('T')[0] : 'N/A'}</span>
                        </div>
                      </td>

                      {/* Role level Badges */}
                      <td className="p-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight inline-block uppercase ${
                          usr.role === 'Business Owner' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                          usr.role === 'Sales Team' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                          usr.role === 'Operations Team' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-505/20'
                        }`}>
                          {usr.role}
                        </span>
                        <p className="text-[10px] text-slate-450 mt-1">
                          {usr.role === 'Business Owner' && 'Unlimited admin control'}
                          {usr.role === 'Sales Team' && 'Leads, followups, CRM'}
                          {usr.role === 'Operations Team' && 'Crews deployment & equipment'}
                          {usr.role === 'Production Team' && 'Video processing & editing workflow'}
                        </p>
                      </td>

                      {/* Email / Mobile */}
                      <td className="p-3 space-y-0.5 text-slate-350">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-550" />
                          <span className="font-mono text-[11px] truncate max-w-[150px]">{usr.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-550" />
                          <span className="font-mono text-[11px]">{usr.mobile}</span>
                        </div>
                      </td>

                      {/* Active Status Toggle */}
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          usr.active 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${usr.active ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                          <span>{usr.active ? 'ACTIVE' : 'SUSPENDED'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right pr-4">
                        {canAdministrate ? (
                          <div className="flex justify-end items-center gap-2">
                            {/* Toggle active / suspend */}
                            <button
                              onClick={() => toggleUserStatus(usr.id)}
                              disabled={isCurrentUser}
                              title={usr.active ? 'Suspend Account' : 'Activate Account'}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isCurrentUser 
                                  ? 'opacity-40 border-slate-800 text-slate-600' 
                                  : usr.active
                                    ? 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                            >
                              {usr.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>

                            {/* Reset password keys */}
                            <button
                              onClick={() => {
                                setResettingPasswordUser(usr);
                                setNewResetPasswordValue(usr.password || 'temp123');
                                setEditingUser(null);
                                setShowAddForm(false);
                              }}
                              title="Reset Password Key"
                              className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-slate-100 cursor-pointer"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            {/* Edit Detail Profiles */}
                            <button
                              onClick={() => handleEditClick(usr)}
                              title="Edit Personal Information"
                              className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-indigo-400 hover:bg-slate-700 cursor-pointer"
                            >
                              <PenTool className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No access</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Panel: Admin Forms */}
        <div className="hidden space-y-6">
          
          {/* Form container */}
          {showAddForm && (
            <div className="bg-slate-850 p-5 rounded-xl border border-indigo-500/20 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-101 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span>Register Personnel</span>
                </h3>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="text-slate-400 hover:text-slate-205 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Jack Richards"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-101 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="jack.r@photocrew.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-101 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 (555) 012-3456"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-101 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">User Role Access *</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-2 text-slate-200"
                    >
                      <option value="Business Owner">Business Owner</option>
                      <option value="Sales Team">Sales Team</option>
                      <option value="Operations Team">Operations Team</option>
                      <option value="Production Team">Production Team</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Initial Status</label>
                    <select
                      value={newActive ? 'true' : 'false'}
                      onChange={(e) => setNewActive(e.target.value === 'true')}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-2 text-slate-200"
                    >
                      <option value="true">Active Clear</option>
                      <option value="false">Suspended</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Initial Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter unique login password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-755 rounded-lg py-1.5 px-3 text-slate-101 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-555 text-white font-semibold rounded cursor-pointer"
                  >
                    Commit account
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit form container */}
          {editingUser && (
            <div className="bg-slate-850 p-5 rounded-xl border border-indigo-500/20 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-101 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-indigo-400" />
                  <span>Edit Profile Details</span>
                </h3>
                <button 
                  onClick={() => setEditingUser(null)} 
                  className="text-slate-400 hover:text-slate-205 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                <div className="p-2 bg-slate-900 border border-slate-850 rounded text-slate-450 text-[11px] font-mono">
                  Modifying account record id: <span className="text-slate-302 font-bold">{editingUser.id}</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-101"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-101 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-101 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Assign User Role *</label>
                    <select
                      value={editRole}
                      disabled={editingUser.id === currentUser?.id}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-2 text-slate-200 disabled:opacity-40"
                    >
                      <option value="Business Owner">Business Owner</option>
                      <option value="Sales Team">Sales Team</option>
                      <option value="Operations Team">Operations Team</option>
                      <option value="Production Team">Production Team</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Access Status *</label>
                    <select
                      value={editActive ? 'true' : 'false'}
                      disabled={editingUser.id === currentUser?.id}
                      onChange={(e) => setEditActive(e.target.value === 'true')}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-2 text-slate-200 disabled:opacity-40"
                    >
                      <option value="true">Active Cleared</option>
                      <option value="false">Suspended</option>
                    </select>
                  </div>
                </div>

                {editingUser.id === currentUser?.id && (
                  <p className="text-[10px] text-amber-400 italic">To prevent locking yourself out of administration access, you cannot change your own role or suspended privileges from here.</p>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-555 text-white font-semibold rounded cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reset password container */}
          {resettingPasswordUser && (
            <div className="bg-slate-850 p-5 rounded-xl border border-indigo-500/20 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-101 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Reset Staff Password</span>
                </h3>
                <button 
                  onClick={() => setResettingPasswordUser(null)} 
                  className="text-slate-400 hover:text-slate-205 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Assignee Name:</span>
                  <p className="font-bold text-slate-200 mt-0.5">{resettingPasswordUser.name}</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">New Login Password Key *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter strong login key..."
                    value={newResetPasswordValue}
                    onChange={(e) => setNewResetPasswordValue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-101 font-mono focus:ring-1 focus:ring-rose-405"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">This takes effect instantly. The employee must log back in using this new security key.</p>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setResettingPasswordUser(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded cursor-pointer"
                  >
                    Override Password Key
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Fallback prompt */}
          {!showAddForm && !editingUser && !resettingPasswordUser && (
            <div className="bg-slate-850 p-6 text-center rounded-xl border border-slate-800 text-slate-500 space-y-3">
              <Shield className="w-12 h-12 text-slate-700 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">Staff Access Control Panel</h4>
              <p className="text-xs max-w-xs mx-auto leading-relaxed">
                Choose any record card in the directory list to modify employee parameters, review clearance levels, override passwords, or lock access securely.
              </p>
            </div>
          )}

          {/* Secure Gate notice */}
          {!canAdministrate && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-red-300">RBAC Restriction Activated</h5>
                <p className="text-[11px] text-red-400/80 mt-1">
                  You are viewing this list as read-only. Action privileges such as editing rosters, adding contractors, or resetting security passwords are restricted to Business Owners only.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Mobile/Tablet Popup Modal for Forms */}
      {(showAddForm || editingUser || resettingPasswordUser) && (
        <div id="user_forms_mobile_modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850 sticky top-0 z-10 backdrop-blur-md">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                {showAddForm && (
                  <>
                    <UserPlus className="w-4 h-4 text-indigo-400" />
                    <span>Register Personnel</span>
                  </>
                )}
                {editingUser && (
                  <>
                    <PenTool className="w-4 h-4 text-indigo-400" />
                    <span>Edit Profile Details</span>
                  </>
                )}
                {resettingPasswordUser && (
                  <>
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>Reset Staff Password</span>
                  </>
                )}
              </h3>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingUser(null);
                  setResettingPasswordUser(null);
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white text-xs rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Close
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs font-sans text-left">
              {showAddForm && (
                <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Jack Richards"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-slate-101 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-505"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="jack.r@photocrew.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-slate-101 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-505 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+1 (555) 012-3456"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-slate-101 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-505 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">User Role Access *</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-2 text-slate-200"
                      >
                        <option value="Business Owner">Business Owner</option>
                        <option value="Sales Team">Sales Team</option>
                        <option value="Operations Team">Operations Team</option>
                        <option value="Production Team">Production Team</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Initial Status</label>
                      <select
                        value={newActive ? 'true' : 'false'}
                        onChange={(e) => setNewActive(e.target.value === 'true')}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-2 text-slate-200"
                      >
                        <option value="true">Active Clear</option>
                        <option value="false">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Initial Password *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter unique login password..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-slate-101 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-505 font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-800 pb-1 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-555 text-white font-semibold rounded cursor-pointer"
                    >
                      Commit account
                    </button>
                  </div>
                </form>
              )}

              {editingUser && (
                <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                  <div className="p-2 bg-slate-955 border border-slate-800 rounded text-slate-450 text-[11px] font-mono">
                    Modifying account record id: <span className="text-slate-320 font-bold">{editingUser.id}</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-slate-101 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-slate-101 font-mono focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-slate-101 font-mono focus:outline-none font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Assign User Role *</label>
                      <select
                        value={editRole}
                        disabled={editingUser.id === currentUser?.id}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-2 text-slate-200 disabled:opacity-40"
                      >
                        <option value="Business Owner">Business Owner</option>
                        <option value="Sales Team">Sales Team</option>
                        <option value="Operations Team">Operations Team</option>
                        <option value="Production Team">Production Team</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Access Status *</label>
                      <select
                        value={editActive ? 'true' : 'false'}
                        disabled={editingUser.id === currentUser?.id}
                        onChange={(e) => setEditActive(e.target.value === 'true')}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-2 text-slate-200 disabled:opacity-40"
                      >
                        <option value="true">Active Cleared</option>
                        <option value="false">Suspended</option>
                      </select>
                    </div>
                  </div>

                  {editingUser.id === currentUser?.id && (
                    <p className="text-[10px] text-amber-400 italic">To prevent locking yourself out of administration access, you cannot change your own role or privileges from here.</p>
                  )}

                  <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-555 text-white font-semibold rounded cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {resettingPasswordUser && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-955 border border-slate-800 rounded font-medium">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Assignee Name:</span>
                    <p className="font-bold text-slate-200 mt-0.5">{resettingPasswordUser.name}</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">New Login Password Key *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter strong login key..."
                      value={newResetPasswordValue}
                      onChange={(e) => setNewResetPasswordValue(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-slate-101 font-mono focus:ring-1 focus:ring-rose-405 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">This takes effect instantly. The employee must log back in using this new security key.</p>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-800 pt-3 font-medium">
                    <button
                      type="button"
                      onClick={() => setResettingPasswordUser(null)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded cursor-pointer"
                    >
                      Override Password Key
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
