import React, { useState, useEffect } from 'react';
import { X, UserCheck, Calendar, Link as LinkIcon, FileText, Check, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { useRole } from '../RoleContext';
import { formatINR, formatDateDDMMYY } from '../../utils';

export interface AssignEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  productionItem?: any;
  assignmentToEdit?: any;
}

export const AssignEditorModal: React.FC<AssignEditorModalProps> = ({
  isOpen,
  onClose,
  order,
  productionItem,
  assignmentToEdit
}) => {
  const { staff = [], pushInsert, pushUpdate, logActivity, currentUserName, refreshData } = useRole();

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [speciality, setSpeciality] = useState('Traditional Video Editing');
  const [targetFinishDate, setTargetFinishDate] = useState('');
  const [rawFootageLink, setRawFootageLink] = useState('');
  const [editedDriveLink, setEditedDriveLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter production/editor staff
  const editorOptions = (staff || []).filter(s => 
    s.status === 'Active' && 
    (s.department === 'Production' || s.role?.toLowerCase().includes('editor') || s.role?.toLowerCase().includes('production') || s.role?.toLowerCase().includes('album') || s.role?.toLowerCase().includes('designer'))
  );

  useEffect(() => {
    if (assignmentToEdit) {
      setSelectedStaffId(assignmentToEdit.staff_id || '');
      setSpeciality(assignmentToEdit.speciality || 'Traditional Video Editing');
      setTargetFinishDate(assignmentToEdit.target_finish_date ? assignmentToEdit.target_finish_date.split('T')[0] : '');
      setRawFootageLink(assignmentToEdit.raw_footage_link || assignmentToEdit.rawFootageLink || '');
      setEditedDriveLink(assignmentToEdit.Edited_Drive_Link || assignmentToEdit.edited_drive_link || '');
    } else {
      setSelectedStaffId('');
      setSpeciality('Traditional Video Editing');
      setTargetFinishDate('');
      setRawFootageLink(productionItem?.raw_footage_location || order?.raw_footage_location || '');
      setEditedDriveLink('');
    }
    setErrorMsg(null);
  }, [assignmentToEdit, productionItem, order, isOpen]);

  if (!isOpen || !order) return null;

  const orderId = order.order_id || order.id || productionItem?.order_id || '';
  const leadId = order.lead_id || productionItem?.lead_id || '';
  const prodId = productionItem?.production_id || `prod_${orderId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErrorMsg('Please select an editor from the active staff list.');
      return;
    }

    const assignedStaff = (staff || []).find(s => s.staff_id === selectedStaffId);
    const staffName = assignedStaff ? assignedStaff.name : 'Assigned Editor';

    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (assignmentToEdit && assignmentToEdit.assignment_id) {
        // Update existing editor assignment
        await pushUpdate('editor_assignments', 'assignment_id', assignmentToEdit.assignment_id, {
          staff_id: selectedStaffId,
          staff_name: staffName,
          speciality,
          target_finish_date: targetFinishDate,
          raw_footage_link: rawFootageLink,
          edited_drive_link: editedDriveLink,
          updated_at: new Date().toISOString()
        });
      } else {
        // Create new editor assignment task
        const newAssignmentId = `ea_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        await pushInsert('editor_assignments', {
          assignment_id: newAssignmentId,
          production_id: prodId,
          order_id: orderId,
          staff_id: selectedStaffId,
          staff_name: staffName,
          speciality,
          assigned_date: new Date().toISOString().split('T')[0],
          target_finish_date: targetFinishDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          status: 'Assigned',
          raw_footage_link: rawFootageLink,
          edited_drive_link: editedDriveLink,
          created_at: new Date().toISOString()
        });
      }

      // Also update overall production record assigned editor if not set
      if (productionItem && productionItem.production_id) {
        await pushUpdate('production', 'production_id', productionItem.production_id, {
          editor_assigned: staffName,
          editing_status: productionItem.editing_status === 'New Project' ? 'Editor Assigned' : productionItem.editing_status,
          updated_at: new Date().toISOString()
        });
      }

      await logActivity({
        log_id: `log_${Date.now()}`,
        user_name: currentUserName || 'Production Manager',
        role: 'Production Staff',
        action: assignmentToEdit ? 'Updated Editor Assignment' : 'Assigned Editor Task',
        module: 'Production',
        record_id: orderId,
        timestamp: new Date().toISOString()
      });

      if (refreshData) refreshData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save editor assignment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-[220] flex flex-col w-full h-full min-h-screen overflow-y-auto animate-in fade-in duration-200">
      
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                {assignmentToEdit ? 'REASSIGN / EDIT TASK' : 'ASSIGN EDITOR DELIVERABLE'}
              </span>
              <span className="text-xs text-zinc-500 font-mono">Order ID: {orderId}</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white mt-1">
              {order.customer_name || 'Customer Project'}
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

      {/* Main Full-Page Form Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6 text-xs font-mono shadow-xl">
          <div className="border-b border-zinc-800 pb-4">
            <h2 className="text-base font-bold text-white">Editor Task Assignment Form</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Configure post-production deliverable details and assign to active editor staff.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Select Editor */}
            <div className="space-y-2">
              <label className="text-zinc-300 font-bold block">Select Production Editor *</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-purple-500 text-xs"
                required
              >
                <option value="">-- Choose Editor --</option>
                {editorOptions.map(s => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.name} ({s.production_role_speciality || s.role || 'Production'})
                  </option>
                ))}
                {/* Fallback option if staff array is small */}
                {editorOptions.length === 0 && (staff || []).map(s => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.name} ({s.role || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {/* Speciality / Task Deliverable */}
            <div className="space-y-2">
              <label className="text-zinc-300 font-bold block">Deliverable Speciality / Task *</label>
              <select
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-purple-500 text-xs"
              >
                <option value="Traditional Video Editing">Traditional Video Editing</option>
                <option value="Teaser & Reel Editing">Teaser & Reel Editing</option>
                <option value="Highlight Video Editing">Highlight Video Editing</option>
                <option value="Album Design & Photo Selection">Album Design & Photo Selection</option>
                <option value="Cinematography Color Grading">Cinematography Color Grading</option>
                <option value="Audio Mixing & Dubbing">Audio Mixing & Dubbing</option>
                <option value="Raw Footage Sorting">Raw Footage Sorting</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Target Finish Date */}
            <div className="space-y-2">
              <label className="text-zinc-300 font-bold block">Target Delivery / Finish Date</label>
              <input
                type="date"
                value={targetFinishDate}
                onChange={(e) => setTargetFinishDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-purple-500 text-xs"
              />
            </div>

            {/* Raw Footage Drive Link */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-zinc-300 font-bold block">Raw Footage Drive Link (Optional)</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={rawFootageLink}
                onChange={(e) => setRawFootageLink(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-purple-500 text-xs"
              />
            </div>
          </div>

          {/* Edited Drive Link */}
          <div className="space-y-2">
            <label className="text-zinc-300 font-bold block">Edited Output Drive Link (Optional)</label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={editedDriveLink}
              onChange={(e) => setEditedDriveLink(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-purple-500 text-xs"
            />
          </div>

          {/* Actions Bar */}
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
              className="px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-bold transition-all cursor-pointer shadow-lg shadow-purple-500/20 flex items-center gap-2 text-xs"
              disabled={isSaving}
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : (assignmentToEdit ? 'Save Task Updates' : 'Assign Editor Task')}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

