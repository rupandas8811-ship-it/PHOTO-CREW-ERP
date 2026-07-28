import React, { useState, useEffect } from 'react';
import { useRole } from './RoleContext';
import { Calendar, MapPin, Clock, Camera, FileVideo, Drone, Users, CheckCircle, ShieldCheck, HelpCircle, Activity, Play, CheckCircle2, UserCheck } from 'lucide-react';
import { supabaseClient } from '../supabaseClient';
import { EditorAssignment } from '../types';

export const ProductionStaffModule: React.FC = () => {
  const { currentUser, staff, leads, orders, operations, editorAssignments, updateEditorAssignmentStatus, refreshData } = useRole();

  // Resolve staff member
  const staffMember = staff.find(s => 
    (s.mobile && s.mobile === currentUser?.mobile) || 
    (s.email && s.email.toLowerCase() === currentUser?.email?.toLowerCase())
  );
  const staffName = staffMember?.name || currentUser?.name || 'Staff';
  
  // Local state for assignments
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Build assigned bookings list for logged in staff
  useEffect(() => {
    if (!staffName) return;

    const bookings: any[] = [];
    const myAssignments = editorAssignments.filter(ea => ea.staff_name.toLowerCase() === staffName.toLowerCase());

    myAssignments.forEach(assignment => {
        const order = orders.find(o => o.order_id === assignment.production_id) || leads.find(l => l.lead_id === assignment.production_id);
        const lead = leads.find(l => l.lead_id === order?.lead_id) || leads.find(l => l.lead_id === assignment.production_id);
        
        if (order && lead) {
            bookings.push({
                assignmentId: assignment.assignment_id,
                orderId: order.order_id || lead.lead_id,
                leadId: lead.lead_id,
                customerName: lead.customer_name,
                eventDate: lead.events?.[0]?.event_date || order.event_date || '',
                eventName: lead.events?.[0]?.event_name || order.event_type || '',
                deliverable: assignment.speciality,
                targetFinishDate: assignment.target_finish_date,
                status: assignment.status
            });
        }
    });

    setActiveBookings(bookings);
  }, [staffName, editorAssignments, orders, leads]);

  const handleUpdateStatus = async (assignmentId: string, nextStatus: 'Editing Started' | 'Client Review' | 'Editing Complete') => {
    if (!confirm(`Are you sure you want to mark this as ${nextStatus}?`)) return;
    
    setIsSubmitting(true);
    try {
      await updateEditorAssignmentStatus(assignmentId, nextStatus as any);
      refreshData();
      showToast(`✅ Status updated to ${nextStatus}!`);
    } catch (err: any) {
      console.error('Error confirming status update:', err);
      showToast('❌ An error occurred while confirming status update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Editing Started': return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      case 'Client Review': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Editing Complete':
      case 'Completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-black min-h-screen text-white font-sans selection:bg-purple-500/30">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-1">Production Dashboard</h1>
            <p className="text-sm text-zinc-400">Welcome, <span className="text-purple-400 font-bold">{staffName}</span></p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-xl font-black text-white">{activeBookings.length} Assignments</span>
          </div>
        </div>

        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-sm font-bold text-white whitespace-nowrap">{toastMessage}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 pl-2">
            My Tasks ({activeBookings.length})
          </h2>

          {activeBookings.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed">
              <CheckCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No active tasks assigned to you right now.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeBookings.map((b) => {
                return (
                  <div key={b.assignmentId} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-colors">
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300">
                              {b.orderId}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusColor(b.status)}`}>
                              {b.status}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-black text-white truncate mb-1">
                            {b.customerName}
                          </h3>
                          <div className="text-sm text-purple-400 font-bold mb-3">
                            {b.deliverable}
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Calendar className="w-4 h-4 text-zinc-500" />
                              <span>Event: {b.eventDate}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Clock className="w-4 h-4 text-zinc-500" />
                              <span>Target: {b.targetFinishDate}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0 sm:w-40">
                            {b.status === 'Assigned' && (
                                <button
                                    onClick={() => handleUpdateStatus(b.assignmentId, 'Editing Started')}
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Play className="w-4 h-4" /> Start Editing
                                </button>
                            )}
                            {b.status === 'Editing Started' && (
                                <button
                                    onClick={() => handleUpdateStatus(b.assignmentId, 'Client Review')}
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <UserCheck className="w-4 h-4" /> Client Review
                                </button>
                            )}
                            {(b.status === 'Editing Started' || b.status === 'Client Review' || b.status === 'Review Pending' || b.status === 'In Progress') && (
                                <button
                                    onClick={() => handleUpdateStatus(b.assignmentId, 'Editing Complete')}
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Complete
                                </button>
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
    </div>
  );
};
