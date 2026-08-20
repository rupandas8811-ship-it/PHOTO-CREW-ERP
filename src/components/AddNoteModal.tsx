import React, { useState, useEffect } from 'react';
import { X, Save, Clock, User, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRole } from './RoleContext';
import { supabaseClient } from '../supabaseClient';
import { formatDateDDMMYY, formatTime12Hour } from '../utils';

interface NoteHistory {
  id: string;
  lead_id: string;
  order_id?: string;
  remarks: string;
  changed_by: string;
  created_at: string;
}

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  orderId?: string;
  customerName: string;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, leadId, orderId, customerName }) => {
  const { currentRole, userEmail } = useRole();
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<NoteHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNote('');
      fetchHistory();
    }
  }, [isOpen, leadId, orderId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabaseClient
        .from('lead_status_history')
        .select('*')
        .eq('new_status', 'NOTE');

      // Fetch all notes for this project's entire lifecycle
      query = query.eq('lead_id', leadId);

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (!error && data) {
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!note.trim()) return;
    setIsSaving(true);
    
    try {
      const { data, error } = await supabaseClient.from('lead_status_history').insert({
        lead_id: leadId,
        order_id: orderId || null,
        old_status: 'NOTE',
        new_status: 'NOTE',
        changed_by: userEmail?.split('@')[0] || currentRole || 'System',
        changed_by_role: currentRole,
        remarks: note.trim()
      }).select().single();

      if (!error && data) {
        setNote('');
        setHistory(prev => [data, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
    
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              Add Note
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">For {customerName} {orderId ? `(${orderId})` : `(${leadId})`}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Add Note Section */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-zinc-450 uppercase tracking-wider block">New Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note here..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 min-h-[100px] resize-y"
            />
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSave}
                disabled={!note.trim() || isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-mono"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Note
                  </>
                )}
              </button>
            </div>
          </div>

          {/* History Section */}
          <div className="mt-2 space-y-3">
            <h4 className="text-[11px] font-mono text-zinc-450 uppercase tracking-wider border-b border-zinc-800/50 pb-2">Note History</h4>
            
            {isLoading ? (
              <div className="text-center py-6 text-zinc-500 text-xs flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-zinc-500/30 border-t-zinc-500 rounded-full animate-spin" />
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
                <p className="text-zinc-500 text-xs">No notes found for this {orderId ? 'order' : 'lead'}.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h) => {
                  const dateObj = new Date(h.created_at);
                  const displayDate = formatDateDDMMYY(dateObj);
                  const displayTime = formatTime12Hour(dateObj);

                  return (
                    <div key={h.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-2 border-b border-zinc-800/50 pb-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-500/80 font-mono">
                          <Clock className="w-3 h-3" />
                          {displayDate} | {displayTime}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                          <User className="w-3 h-3" />
                          {h.changed_by}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {h.remarks}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
