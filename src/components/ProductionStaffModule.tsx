import React, { useState, useEffect } from 'react';
import { useRole } from './RoleContext';
import { 
  Calendar, Clock, CheckCircle2, Eye, FileVideo, Play, UserCheck, 
  ShieldCheck, ChevronDown, Upload, FileText, CheckSquare, Lock, Activity, 
  Link as LinkIcon, AlertCircle, X, Sparkles, Check
} from 'lucide-react';
import { supabaseClient } from '../supabaseClient';
import { EditorAssignment } from '../types';
import { ProjectDetailModal } from './ProjectDetailModal';

// Image compression helper
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const ProductionStaffModule: React.FC = () => {
  const { 
    currentUser, 
    staff, 
    leads, 
    orders, 
    operations, 
    production,
    editorAssignments, 
    updateEditorAssignmentStatus, 
    updateProduction,
    updateOrderStage,
    updateLead,
    pushUpdate,
    refreshData 
  } = useRole();

  // Resolve staff member
  const staffMember = staff.find(s => 
    (s.mobile && s.mobile === currentUser?.mobile) || 
    (s.email && s.email.toLowerCase() === currentUser?.email?.toLowerCase())
  );
  const staffName = staffMember?.name || currentUser?.name || 'Staff';
  
  // Local state
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Selected project for ProjectDetailModal
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<{ order: any; lead: any } | null>(null);

  // Modal States for 4 Workflow Steps
  const [editingStartedModal, setEditingStartedModal] = useState<any | null>(null); // booking
  const [editingStartedForm, setEditingStartedForm] = useState({ date: '', time: '' });

  const [customerReviewModal, setCustomerReviewModal] = useState<any | null>(null); // booking
  const [customerReviewForm, setCustomerReviewForm] = useState({ edited_drive_link: '' });

  const [editingCompletedModal, setEditingCompletedModal] = useState<any | null>(null); // booking
  const [editingCompletedForm, setEditingCompletedForm] = useState({ confirmation_proof: '' });

  const [clientAcceptanceModal, setClientAcceptanceModal] = useState<any | null>(null); // booking
  const [clientAcceptanceForm, setClientAcceptanceForm] = useState({
    checklist_1: false,
    checklist_2: false,
    checklist_3: false,
    communication_proof: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Build assigned bookings list ONLY for logged in assigned editor
  useEffect(() => {
    if (!staffName) return;

    const bookings: any[] = [];
    // Strict filter: ONLY tasks assigned to THIS staff member
    const myAssignments = editorAssignments.filter(ea => 
      ea.staff_name.toLowerCase() === staffName.toLowerCase() ||
      (staffMember?.staff_id && ea.staff_id === staffMember.staff_id)
    );

    myAssignments.forEach(assignment => {
        const order = orders.find(o => o.order_id === assignment.production_id) || leads.find(l => l.lead_id === assignment.production_id);
        const lead = leads.find(l => l.lead_id === order?.lead_id) || leads.find(l => l.lead_id === assignment.production_id);
        const prod = production.find(p => p.production_id === assignment.production_id || p.tracking_id === order?.order_id || p.tracking_id === lead?.lead_id);
        
        if (order || lead) {
            // Determine unified status
            let currentStatus = assignment.status;
            if (prod?.editing_status) {
              currentStatus = prod.editing_status as any;
            } else if (order?.current_stage) {
              currentStatus = order.current_stage as any;
            }

            bookings.push({
                assignmentId: assignment.assignment_id,
                orderId: order?.order_id || lead?.lead_id || assignment.production_id,
                leadId: lead?.lead_id || order?.lead_id,
                customerName: lead?.customer_name || order?.customer_name || 'Client',
                customerMobile: lead?.mobile || order?.customer_phone || '',
                eventDate: lead?.events?.[0]?.event_date || order?.event_date || '',
                eventName: lead?.events?.[0]?.event_name || order?.event_type || '',
                deliverable: assignment.speciality,
                targetFinishDate: assignment.target_finish_date,
                status: currentStatus,
                assignmentObj: assignment,
                orderObj: order,
                leadObj: lead,
                prodObj: prod
            });
        }
    });

    setActiveBookings(bookings);
  }, [staffName, editorAssignments, orders, leads, production, staffMember]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Assigned Editor':
      case 'Editor Assigned':
      case 'Assigned': 
        return { label: 'Assigned Editor', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      case 'Editing Started': 
        return { label: 'Editing Started', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
      case 'Customer Review': 
        return { label: 'Customer Review', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'Editing Completed':
      case 'Editing Complete':
        return { label: 'Editing Completed', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'Client Acceptance':
      case 'Business Owner Review':
      case 'Project Completed':
      case 'Completed': 
        return { label: 'Client Acceptance (Transferred)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      default: 
        return { label: status, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30' };
    }
  };

  // 1. Submit Editing Started Modal
  const handleEditingStartedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStartedModal) return;
    if (!editingStartedForm.date || !editingStartedForm.time) {
      alert("Please provide both Estimated Completion Date and Time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = editingStartedModal;

      // Update Editor Assignment
      await updateEditorAssignmentStatus(b.assignmentId, 'Editing Started' as any);

      // Save estimated completion info & start time
      await pushUpdate('editor_assignments', 'assignment_id', b.assignmentId, {
        target_finish_date: editingStartedForm.date,
        estimated_completion_time: editingStartedForm.time,
        started_at: timestamp,
        started_by: staffName,
        status: 'Editing Started'
      });

      // Update Production
      if (b.prodObj?.production_id) {
        await updateProduction(b.prodObj.production_id, {
          editing_status: 'Editing Started',
          production_status: 'Editing Started',
          expected_delivery_date: editingStartedForm.date,
          remarks: `Editing Started by ${staffName} on ${new Date().toLocaleDateString()} at ${editingStartedForm.time}`
        });
      }

      // Update Orders & Leads
      if (b.orderId) {
        await updateOrderStage(b.orderId, 'Editing Started' as any);
      }
      if (b.leadId) {
        await updateLead(b.leadId, {
          status: 'Editing Started' as any,
          current_status: 'Editing Started' as any
        });
      }

      setEditingStartedModal(null);
      setEditingStartedForm({ date: '', time: '' });
      await refreshData();
      showToast('🚀 Status updated to Editing Started!');
    } catch (err: any) {
      console.error('Error submitting Editing Started:', err);
      alert('Failed to update status: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Customer Review Modal
  const handleCustomerReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerReviewModal) return;
    if (!customerReviewForm.edited_drive_link.trim()) {
      alert("Please provide the Edited Drive Link.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = customerReviewModal;

      await updateEditorAssignmentStatus(b.assignmentId, 'Customer Review' as any);

      // Save Edited Drive Link
      await pushUpdate('editor_assignments', 'assignment_id', b.assignmentId, {
        raw_footage_link: customerReviewForm.edited_drive_link,
        edited_drive_link: customerReviewForm.edited_drive_link,
        edited_link_uploaded_at: timestamp,
        status: 'Customer Review'
      });

      if (b.prodObj?.production_id) {
        await updateProduction(b.prodObj.production_id, {
          editing_status: 'Customer Review',
          production_status: 'Customer Review',
          remarks: `Edited Drive Link uploaded by ${staffName} on ${new Date().toLocaleDateString()}: ${customerReviewForm.edited_drive_link}`
        });
      }

      if (b.orderId) {
        await updateOrderStage(b.orderId, 'Customer Review' as any);
      }
      if (b.leadId) {
        await updateLead(b.leadId, {
          status: 'Customer Review' as any,
          current_status: 'Customer Review' as any
        });
      }

      setCustomerReviewModal(null);
      setCustomerReviewForm({ edited_drive_link: '' });
      await refreshData();
      showToast('📁 Edited Drive Link saved & moved to Customer Review!');
    } catch (err: any) {
      console.error('Error submitting Customer Review:', err);
      alert('Failed to submit: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Editing Completed Modal
  const handleEditingCompletedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompletedModal) return;
    if (!editingCompletedForm.confirmation_proof) {
      alert("Please upload or provide Customer Confirmation Image / Proof.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = editingCompletedModal;

      await updateEditorAssignmentStatus(b.assignmentId, 'Editing Completed' as any);

      await pushUpdate('editor_assignments', 'assignment_id', b.assignmentId, {
        customer_confirmation_proof: editingCompletedForm.confirmation_proof,
        completed_at: timestamp,
        status: 'Editing Completed'
      });

      if (b.prodObj?.production_id) {
        await updateProduction(b.prodObj.production_id, {
          editing_status: 'Editing Completed' as any,
          production_status: 'Editing Completed' as any,
          remarks: `Editing Completed with Customer Proof by ${staffName} on ${new Date().toLocaleDateString()}`
        });
      }

      if (b.orderId) {
        await updateOrderStage(b.orderId, 'Editing Completed' as any);
      }
      if (b.leadId) {
        await updateLead(b.leadId, {
          status: 'Editing Completed' as any,
          current_status: 'Editing Completed' as any
        });
      }

      setEditingCompletedModal(null);
      setEditingCompletedForm({ confirmation_proof: '' });
      await refreshData();
      showToast('🎉 Customer confirmation proof saved & status set to Editing Completed!');
    } catch (err: any) {
      console.error('Error submitting Editing Completed:', err);
      alert('Failed to submit: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Submit Client Acceptance Modal
  const handleClientAcceptanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientAcceptanceModal) return;

    if (!clientAcceptanceForm.checklist_1 || !clientAcceptanceForm.checklist_2 || !clientAcceptanceForm.checklist_3) {
      alert("Validation Failed: Please complete all items in the Final Delivery Checklist.");
      return;
    }

    if (!clientAcceptanceForm.communication_proof) {
      alert("Validation Failed: Please upload or provide Customer Communication Proof.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const b = clientAcceptanceModal;

      await updateEditorAssignmentStatus(b.assignmentId, 'Completed' as any);

      await pushUpdate('editor_assignments', 'assignment_id', b.assignmentId, {
        customer_communication_proof: clientAcceptanceForm.communication_proof,
        accepted_at: timestamp,
        status: 'Client Acceptance'
      });

      if (b.prodObj?.production_id) {
        await updateProduction(b.prodObj.production_id, {
          editing_status: 'Client Acceptance' as any,
          production_status: 'Client Acceptance' as any,
          actual_delivery_date: timestamp.split('T')[0],
          remarks: `Client Acceptance verified by ${staffName} on ${new Date().toLocaleDateString()}`
        });
      }

      // System Action: Transfer project to Business Owner Dashboard for final review
      if (b.orderId) {
        await updateOrderStage(b.orderId, 'Client Acceptance' as any);
      }
      if (b.leadId) {
        await updateLead(b.leadId, {
          status: 'Client Acceptance' as any,
          current_status: 'Client Acceptance' as any
        });
      }

      setClientAcceptanceModal(null);
      setClientAcceptanceForm({
        checklist_1: false,
        checklist_2: false,
        checklist_3: false,
        communication_proof: ''
      });
      await refreshData();
      showToast('🏆 Client Acceptance Verified! Project transferred to Business Owner Dashboard.');
    } catch (err: any) {
      console.error('Error submitting Client Acceptance:', err);
      alert('Failed to submit: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-black min-h-screen text-white font-sans selection:bg-purple-500/30">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                EDITOR STAFF PORTAL
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-1">
              Production Staff Dashboard
            </h1>
            <p className="text-sm text-zinc-400">
              Welcome, <span className="text-purple-400 font-bold">{staffName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <Activity className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-[10px] uppercase font-mono text-zinc-400">Assigned Tasks</div>
              <span className="text-xl font-black text-white">{activeBookings.length} Active</span>
            </div>
          </div>
        </div>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="bg-zinc-900 border border-purple-500/30 shadow-2xl rounded-xl px-5 py-3 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-white whitespace-nowrap">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* TASKS LIST */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h2 className="text-xs font-mono font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <span>🎬 My Assigned Tasks</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">{activeBookings.length}</span>
            </h2>
          </div>

          {activeBookings.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed space-y-2">
              <CheckCircle2 className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-zinc-400 font-medium text-sm">No active tasks assigned specifically to you right now.</p>
              <p className="text-zinc-600 text-xs">New assignments made by Production Manager will automatically appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeBookings.map((b) => {
                const badge = getStatusBadge(b.status);
                const isLocked = ['Client Acceptance', 'Business Owner Review', 'Project Completed', 'Completed'].includes(b.status) || b.orderObj?.current_stage === 'Business Owner Review';

                return (
                  <div 
                    key={b.assignmentId} 
                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-visible hover:border-purple-500/30 transition-all shadow-lg"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {b.orderId}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-black text-white truncate">
                            {b.customerName}
                          </h3>
                          <div className="text-xs text-purple-400 font-bold flex items-center gap-2">
                            <span>🎯 {b.deliverable}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Event: <strong className="text-zinc-200">{b.eventDate || 'N/A'}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Target: <strong className="text-zinc-200">{b.targetFinishDate || 'N/A'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* ACTIONS DROPDOWN */}
                        <div className="relative shrink-0 sm:w-48 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setActiveDropdownId(activeDropdownId === b.assignmentId ? null : b.assignmentId)}
                            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center justify-between gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>⚡ Actions</span>
                            </span>
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* DROPDOWN MENU */}
                          {activeDropdownId === b.assignmentId && (
                            <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-40 overflow-hidden divide-y divide-zinc-800 animate-in fade-in zoom-in-95">
                              
                              {/* Option 1: View Details */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setSelectedProjectForDetail({ order: b.orderObj, lead: b.leadObj });
                                }}
                                className="w-full text-left px-4 py-2.5 text-xs text-zinc-200 hover:bg-purple-600/20 hover:text-purple-300 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4 text-purple-400" /> View Details
                              </button>

                              {/* Locked State Notification */}
                              {isLocked ? (
                                <div className="px-4 py-3 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold flex items-center gap-2">
                                  <Lock className="w-3.5 h-3.5" /> Work Completed & Transferred (Read-Only)
                                </div>
                              ) : (
                                <>
                                  {/* Workflow Step 1: Editing Started */}
                                  {(b.status === 'Assigned Editor' || b.status === 'Editor Assigned' || b.status === 'Assigned') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setEditingStartedModal(b);
                                        setEditingStartedForm({
                                          date: b.targetFinishDate || new Date().toISOString().split('T')[0],
                                          time: '18:00'
                                        });
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs text-sky-400 hover:bg-sky-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Play className="w-4 h-4" /> Editing Started
                                    </button>
                                  )}

                                  {/* Workflow Step 2: Customer Review */}
                                  {b.status === 'Editing Started' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setCustomerReviewModal(b);
                                        setCustomerReviewForm({ edited_drive_link: b.prodObj?.edited_drive_link || '' });
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs text-amber-400 hover:bg-amber-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <UserCheck className="w-4 h-4" /> Customer Review
                                    </button>
                                  )}

                                  {/* Workflow Step 3: Editing Completed */}
                                  {b.status === 'Customer Review' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setEditingCompletedModal(b);
                                        setEditingCompletedForm({ confirmation_proof: '' });
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs text-purple-400 hover:bg-purple-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4" /> Editing Completed
                                    </button>
                                  )}

                                  {/* Workflow Step 4: Client Acceptance */}
                                  {(b.status === 'Editing Completed' || b.status === 'Editing Complete') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setClientAcceptanceModal(b);
                                        setClientAcceptanceForm({
                                          checklist_1: false,
                                          checklist_2: false,
                                          checklist_3: false,
                                          communication_proof: ''
                                        });
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs text-emerald-400 hover:bg-emerald-500/20 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <ShieldCheck className="w-4 h-4" /> Client Acceptance
                                    </button>
                                  )}
                                </>
                              )}

                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================= */}
      {/* 1. EDITING STARTED MODAL POPUP */}
      {/* ========================================================= */}
      {editingStartedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Editing Started</h3>
              </div>
              <button 
                onClick={() => setEditingStartedModal(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Please enter the estimated completion date and time to notify management and start tracking progress.
            </p>

            <form onSubmit={handleEditingStartedSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Estimated Completion Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={editingStartedForm.date}
                  onChange={(e) => setEditingStartedForm({ ...editingStartedForm, date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Estimated Completion Time <span className="text-rose-400">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={editingStartedForm.time}
                  onChange={(e) => setEditingStartedForm({ ...editingStartedForm, time: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingStartedModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-sky-600/20"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit & Start Editing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CUSTOMER REVIEW MODAL POPUP */}
      {/* ========================================================= */}
      {customerReviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Customer Review</h3>
              </div>
              <button 
                onClick={() => setCustomerReviewModal(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Provide the Edited Drive Link containing the preview videos/photos for customer review.
            </p>

            <form onSubmit={handleCustomerReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Edited Drive Link <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={customerReviewForm.edited_drive_link}
                  onChange={(e) => setCustomerReviewForm({ edited_drive_link: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCustomerReviewModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-amber-600/20"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Customer Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. EDITING COMPLETED MODAL POPUP */}
      {/* ========================================================= */}
      {editingCompletedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Editing Completed</h3>
              </div>
              <button 
                onClick={() => setEditingCompletedModal(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Upload or attach the Customer Confirmation Image / Proof confirming review completion.
            </p>

            <form onSubmit={handleEditingCompletedSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Customer Confirmation Image / Proof <span className="text-rose-400">*</span>
                </label>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const compressed = await compressImage(e.target.files[0]);
                      setEditingCompletedForm({ confirmation_proof: compressed });
                    }
                  }}
                  className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer mb-2"
                />

                <div className="text-[10px] text-zinc-500 text-center uppercase font-mono my-1">- OR ENTER PROOF IMAGE URL -</div>

                <input
                  type="text"
                  placeholder="https://..."
                  value={editingCompletedForm.confirmation_proof}
                  onChange={(e) => setEditingCompletedForm({ confirmation_proof: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />

                {editingCompletedForm.confirmation_proof && (
                  <div className="mt-2 text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Proof Attached Successfully
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingCompletedModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editingCompletedForm.confirmation_proof}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-purple-600/20"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Editing Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CLIENT ACCEPTANCE MODAL POPUP */}
      {/* ========================================================= */}
      {clientAcceptanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Client Acceptance</h3>
              </div>
              <button 
                onClick={() => setClientAcceptanceModal(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Verify the final delivery checklist and upload customer communication proof to complete Production and transfer project to Business Owner.
            </p>

            <form onSubmit={handleClientAcceptanceSubmit} className="space-y-4">
              
              {/* CHECKLIST */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <label className="block text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" /> Final Delivery Checklist <span className="text-rose-400">*</span>
                </label>
                
                <label className="flex items-start gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientAcceptanceForm.checklist_1}
                    onChange={(e) => setClientAcceptanceForm({ ...clientAcceptanceForm, checklist_1: e.target.checked })}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>1. All Video & Photo Deliverables Rendered in Full Resolution</span>
                </label>

                <label className="flex items-start gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientAcceptanceForm.checklist_2}
                    onChange={(e) => setClientAcceptanceForm({ ...clientAcceptanceForm, checklist_2: e.target.checked })}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>2. Color Grading & Audio Mix Verified with Client Specifications</span>
                </label>

                <label className="flex items-start gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientAcceptanceForm.checklist_3}
                    onChange={(e) => setClientAcceptanceForm({ ...clientAcceptanceForm, checklist_3: e.target.checked })}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>3. Customer Final Sign-off & Confirmation Received</span>
                </label>
              </div>

              {/* COMMUNICATION PROOF */}
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-1">
                  Customer Communication Proof <span className="text-rose-400">*</span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const compressed = await compressImage(e.target.files[0]);
                      setClientAcceptanceForm({ ...clientAcceptanceForm, communication_proof: compressed });
                    }
                  }}
                  className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer mb-2"
                />

                <div className="text-[10px] text-zinc-500 text-center uppercase font-mono my-1">- OR ENTER PROOF IMAGE URL -</div>

                <input
                  type="text"
                  placeholder="https://..."
                  value={clientAcceptanceForm.communication_proof}
                  onChange={(e) => setClientAcceptanceForm({ ...clientAcceptanceForm, communication_proof: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />

                {clientAcceptanceForm.communication_proof && (
                  <div className="mt-2 text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Communication Proof Attached
                  </div>
                )}
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-[11px] text-purple-300 flex items-center gap-2">
                <span>🚀</span> Submission will automatically complete Production & transfer project to Business Owner Dashboard.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setClientAcceptanceModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting || 
                    !clientAcceptanceForm.checklist_1 || 
                    !clientAcceptanceForm.checklist_2 || 
                    !clientAcceptanceForm.checklist_3 || 
                    !clientAcceptanceForm.communication_proof
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  {isSubmitting ? 'Transferring...' : 'Submit & Transfer to Business Owner Dashboard 🏆'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT DETAIL MODAL */}
      {selectedProjectForDetail && (
        <ProjectDetailModal
          isOpen={!!selectedProjectForDetail}
          onClose={() => setSelectedProjectForDetail(null)}
          order={selectedProjectForDetail.order}
          lead={selectedProjectForDetail.lead}
        />
      )}

    </div>
  );
};
