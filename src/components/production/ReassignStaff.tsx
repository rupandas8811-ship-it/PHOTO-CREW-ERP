import React, { useState } from 'react';
import { X, RefreshCw, UserCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { useRole } from '../RoleContext';

export interface ReassignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any; // EditorAssignment or StaffAssignment
}

export const ReassignStaffModal: React.FC<ReassignStaffModalProps> = ({
  isOpen,
  onClose,
  assignment
}) => {
  const { staff = [], pushUpdate, logActivity, currentUserName, refreshData } = useRole();

  const [newStaffId, setNewStaffId] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  const currentStaffName = assignment.staff_name || 'Current Staff';
  const speciality = assignment.speciality || assignment.staff_role || 'Task';
  const isEditorTask = Boolean(assignment.assignment_id && assignment.speciality);

  const activeStaffOptions = (staff || []).filter(s => s.status === 'Active');

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffId) {
      setErrorMsg('Please select a new staff member to reassign.');
      return;
    }

    const selectedStaff = activeStaffOptions.find(s => s.staff_id === newStaffId);
    if (!selectedStaff) {
      setErrorMsg('Selected staff member not found.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (isEditorTask) {
        await pushUpdate('editor_assignments', 'assignment_id', assignment.assignment_id, {
          staff_id: selectedStaff.staff_id,
          staff_name: selectedStaff.name,
          updated_at: new Date().toISOString()
        });
      } else {
        await pushUpdate('staff_assignments', 'id', assignment.id, {
          staff_id: selectedStaff.staff_id,
          staff_name: selectedStaff.name,
          updated_at: new Date().toISOString()
        });
      }

      await logActivity({
        log_id: `log_${Date.now()}`,
        user_name: currentUserName || 'Production Admin',
        role: 'Production Staff',
        action: `Reassigned Task (${speciality}) from ${currentStaffName} to ${selectedStaff.name}`,
        module: 'Production',
        record_id: assignment.order_id || assignment.production_id || '',
        timestamp: new Date().toISOString()
      });

      if (refreshData) refreshData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to reassign staff member.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-[230] flex flex-col w-full h-full min-h-screen overflow-y-auto animate-in fade-in duration-200">
      
      {/* Full-screen Top Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors flex items-center gap-2 text-xs font-mono font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                REASSIGN TASK CREW
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white mt-1">
              {speciality}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors text-xs font-mono font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleReassign} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6 text-xs font-mono shadow-xl">
          <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Currently Assigned Staff</span>
            <strong className="text-amber-400 text-base font-bold block">{currentStaffName}</strong>
          </div>

          <div className="space-y-2">
            <label className="text-zinc-300 font-bold block">Select Replacement Staff Member *</label>
            <select
              value={newStaffId}
              onChange={(e) => setNewStaffId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-amber-500 text-xs"
              required
            >
              <option value="">-- Select Staff Member --</option>
              {activeStaffOptions
                .filter(s => s.name !== currentStaffName)
                .map(s => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.name} ({s.role || s.department})
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-zinc-300 font-bold block">Reassignment Reason / Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Workload distribution, unavailability..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2 text-xs"
              disabled={isSaving}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isSaving ? 'Reassigning...' : 'Confirm Reassignment'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

