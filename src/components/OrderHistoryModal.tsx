import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  History, Calendar, Clock, User, CheckCircle2, DollarSign, 
  Film, FileText, ExternalLink, Eye, X, Search, ArrowDownUp, 
  ShieldCheck, Image as ImageIcon, AlertCircle, RefreshCw, 
  Layers, ChevronDown, CreditCard, Receipt, Wallet, Phone, 
  Building, Tag, Camera, Video, Wrench, HardDrive, CheckSquare,
  MessageSquare, Sparkles, FolderCheck, Check, ArrowRight
} from 'lucide-react';
import { useRole } from './RoleContext';
import { formatINR, resolveStorageUrl, formatDateDDMMYY, formatTime12Hour } from '../utils';
import { supabaseClient } from '../supabaseClient';

export interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any; // Order object or row from summary
  initialTab?: 'all' | 'status' | 'notes' | 'operations' | 'production' | 'proofs' | 'payment_details';
}

export type HistoryViewTab = 'all' | 'status' | 'notes' | 'operations' | 'production' | 'proofs' | 'payment_details';

export interface StatusHistoryItem {
  id: string;
  orderId: string;
  leadId: string;
  previousStatus: string;
  newStatus: string;
  changedDate: string;
  changedTime: string;
  changedBy: string;
  changedByRole?: string;
  remarks?: string;
  proofUrl?: string | null;
  rawTimestamp: string;
}

export interface NoteHistoryItem {
  id: string;
  orderId: string;
  leadId: string;
  noteContent: string;
  addedBy: string;
  addedByRole?: string;
  noteDate: string;
  noteTime: string;
  rawTimestamp: string;
  source: string;
}

export interface OperationsUpdateItem {
  id: string;
  orderId: string;
  leadId: string;
  updateType: 'Staff Assignment' | 'Equipment Kit / Handover' | 'Event & Reporting' | 'Footage & Shoot';
  title: string;
  description: string;
  staffName: string;
  staffRole?: string;
  updatedBy: string;
  date: string;
  time: string;
  rawTimestamp: string;
  equipmentDetails?: string[];
  proofUrl?: string | null;
  statusBadge?: string;
}

export interface ProductionUpdateItem {
  id: string;
  orderId: string;
  leadId: string;
  updateType: 'Editor Assignment' | 'Status & Progress' | 'Checklist Verification' | 'Customer Review' | 'Server & Folder';
  title: string;
  description: string;
  staffName: string;
  staffRole?: string;
  updatedBy: string;
  date: string;
  time: string;
  rawTimestamp: string;
  proofUrl?: string | null;
  driveLink?: string | null;
  statusBadge?: string;
}

export interface ImageProofItem {
  id: string;
  orderId: string;
  leadId: string;
  url: string;
  isImage: boolean;
  category: 'Operations Proof' | 'Production Proof' | 'Customer Consent / Communication' | 'Payment Receipt' | 'Status Proof' | 'Deliverable';
  title: string;
  uploadedBy: string;
  uploadedByRole?: string;
  uploadDate: string;
  uploadTime: string;
  rawTimestamp: string;
}

export interface ChronoActivityItem {
  id: string;
  group: 'Status' | 'Notes' | 'Operations' | 'Production' | 'Proofs' | 'Payment';
  activity: string;
  badge: string;
  badgeColor: string;
  staffName: string;
  staffRole?: string;
  date: string;
  time: string;
  rawTimestamp: string;
  description: string;
  proofs: Array<{
    id: string;
    label: string;
    url: string;
    type: 'image' | 'link' | 'file';
  }>;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  order,
  initialTab = 'all'
}) => {
  const { 
    leads, 
    orders, 
    production, 
    operations, 
    editorAssignments, 
    payments, 
    statusHistory: contextStatusHistory, 
    logs,
    staffAssignments,
    leadStaffAssignmentHistory,
    leadEquipmentHistory,
    equipmentHandovers,
  } = useRole();

  const [activeTab, setActiveTab] = useState<HistoryViewTab>(initialTab === 'payment_details' ? 'payment_details' : 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  
  // Local state for fetched live status history from Supabase if available
  const [fetchedStatusHistory, setFetchedStatusHistory] = useState<any[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  // Extract strict identifiers for this Order / Lead
  const targetOrderId = order?.orderId || order?.order_id || '';
  const targetLeadId = order?.leadId || order?.lead_id || '';

  const matchedOrder = useMemo(() => {
    if (!targetOrderId && !targetLeadId) return order;
    return orders.find(o => (targetOrderId && o.order_id === targetOrderId) || (targetLeadId && o.lead_id === targetLeadId)) || order;
  }, [orders, targetOrderId, targetLeadId, order]);

  const matchedLead = useMemo(() => {
    const leadId = targetLeadId || matchedOrder?.lead_id;
    if (!leadId) return null;
    return leads.find(l => l.lead_id === leadId || (targetOrderId && l.lead_id === targetOrderId)) || null;
  }, [leads, targetLeadId, matchedOrder, targetOrderId]);

  const finalOrderId = matchedOrder?.order_id || targetOrderId;
  const finalLeadId = matchedLead?.lead_id || matchedOrder?.lead_id || targetLeadId;

  // Fetch latest notes & status history on open for 100% database synchronization
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    
    async function fetchLiveHistory() {
      setIsLoadingLive(true);
      try {
        let query = supabaseClient.from('lead_status_history').select('*');
        if (finalOrderId && finalLeadId) {
          query = query.or(`order_id.eq.${finalOrderId},lead_id.eq.${finalLeadId}`);
        } else if (finalOrderId) {
          query = query.eq('order_id', finalOrderId);
        } else if (finalLeadId) {
          query = query.eq('lead_id', finalLeadId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data && isMounted) {
          setFetchedStatusHistory(data);
        }
      } catch (err) {
        // Fallback gracefully to context records
      } finally {
        if (isMounted) setIsLoadingLive(false);
      }
    }

    fetchLiveHistory();
    return () => { isMounted = false; };
  }, [isOpen, finalOrderId, finalLeadId]);

  // Combined status history strictly for this order/lead
  const mergedStatusHistory = useMemo(() => {
    const combined = [...(contextStatusHistory || []), ...(fetchedStatusHistory || [])];
    const map = new Map<string, any>();
    
    combined.forEach((sh, idx) => {
      const isMatch = (finalOrderId && sh.order_id === finalOrderId) ||
                      (finalLeadId && sh.lead_id === finalLeadId);
      if (isMatch) {
        const key = sh.id ? `sh_${sh.id}` : `sh_${sh.created_at}_${sh.new_status}_${idx}`;
        if (!map.has(key)) {
          map.set(key, sh);
        }
      }
    });

    return Array.from(map.values());
  }, [contextStatusHistory, fetchedStatusHistory, finalOrderId, finalLeadId]);

  // Helper to parse date and time cleanly
  const parseDateTime = (dateVal?: any, fallbackTime?: string) => {
    if (!dateVal) {
      return {
        iso: new Date(0).toISOString(),
        date: 'N/A',
        time: fallbackTime || 'N/A',
        raw: 0
      };
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return {
        iso: String(dateVal),
        date: String(dateVal).split('T')[0] || String(dateVal),
        time: fallbackTime || '',
        raw: 0
      };
    }
    return {
      iso: d.toISOString(),
      date: formatDateDDMMYY(d),
      time: formatTime12Hour(d) || fallbackTime || '',
      raw: d.getTime()
    };
  };

  // Helper to test if a string is an image URL
  const isImageUrl = (url?: string | null): boolean => {
    if (!url) return false;
    const u = url.toLowerCase().trim();
    return u.startsWith('data:image/') || 
           /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(u) || 
           u.includes('/storage/v1/object/public/img/');
  };

  // Matched entities strictly filtered for THIS order
  const matchedProd = useMemo(() => {
    return production.find(p => 
      (finalOrderId && (p.order_id === finalOrderId || p.tracking_id === finalOrderId || p.production_id === finalOrderId)) ||
      (finalLeadId && (p.lead_id === finalLeadId || p.tracking_id === finalLeadId))
    ) || null;
  }, [production, finalOrderId, finalLeadId]);

  const matchedOps = useMemo(() => {
    return operations.filter(op => 
      (finalOrderId && op.order_id === finalOrderId) || 
      (finalLeadId && op.lead_id === finalLeadId)
    );
  }, [operations, finalOrderId, finalLeadId]);

  const matchedAssignments = useMemo(() => {
    return editorAssignments.filter(ea => 
      (finalOrderId && (ea.order_id === finalOrderId || ea.production_id === finalOrderId)) || 
      (matchedProd?.production_id && ea.production_id === matchedProd.production_id) ||
      (finalLeadId && ea.order_id === finalLeadId)
    );
  }, [editorAssignments, finalOrderId, finalLeadId, matchedProd]);

  const matchedPayments = useMemo(() => {
    return payments.filter(p => 
      (finalOrderId && p.order_id === finalOrderId) || 
      (finalLeadId && p.lead_id === finalLeadId)
    );
  }, [payments, finalOrderId, finalLeadId]);

  const matchedStaffAssignments = useMemo(() => {
    return (staffAssignments || []).filter(sa => 
      (finalOrderId && sa.order_id === finalOrderId) ||
      (finalLeadId && (sa as any).lead_id === finalLeadId)
    );
  }, [staffAssignments, finalOrderId, finalLeadId]);

  const matchedLeadStaffHistory = useMemo(() => {
    return (leadStaffAssignmentHistory || []).filter(lsh => 
      (finalOrderId && lsh.order_id === finalOrderId) || 
      (finalLeadId && lsh.lead_id === finalLeadId)
    );
  }, [leadStaffAssignmentHistory, finalOrderId, finalLeadId]);

  const matchedEquipmentHistory = useMemo(() => {
    return (leadEquipmentHistory || []).filter(leh => 
      (finalOrderId && leh.order_id === finalOrderId) || 
      (finalLeadId && leh.lead_id === finalLeadId)
    );
  }, [leadEquipmentHistory, finalOrderId, finalLeadId]);

  const matchedHandovers = useMemo(() => {
    return (equipmentHandovers || []).filter(eh => 
      (finalOrderId && eh.order_id === finalOrderId)
    );
  }, [equipmentHandovers, finalOrderId]);

  const matchedLogs = useMemo(() => {
    return (logs || []).filter(log => 
      (finalOrderId && (log.record_id === finalOrderId || log.order_id === finalOrderId)) || 
      (finalLeadId && (log.record_id === finalLeadId || log.lead_id === finalLeadId)) ||
      (log.details && ((finalOrderId && log.details.includes(finalOrderId)) || (finalLeadId && log.details.includes(finalLeadId))))
    );
  }, [logs, finalOrderId, finalLeadId]);

  /* ============================================================================
     1. STATUS CHANGE HISTORY (Chronological, previous status, new status, date, time)
     ============================================================================ */
  const statusHistoryList = useMemo<StatusHistoryItem[]>(() => {
    const items: StatusHistoryItem[] = [];
    const seen = new Set<string>();

    // Initial Order Confirmed / Lead Created event
    if (matchedOrder?.created_at || matchedLead?.created_at) {
      const ts = parseDateTime(matchedOrder?.created_at || matchedLead?.created_at);
      const key = `init_${finalOrderId}`;
      seen.add(key);
      items.push({
        id: key,
        orderId: finalOrderId,
        leadId: finalLeadId || '',
        previousStatus: matchedLead ? 'New Lead' : 'Booking Received',
        newStatus: matchedOrder?.order_status || 'Order Confirmed',
        changedDate: ts.date,
        changedTime: ts.time,
        changedBy: matchedOrder?.sales_person || matchedLead?.sales_person || 'Sales Desk',
        changedByRole: 'Sales',
        remarks: `Order registered and confirmed with ${matchedOrder?.package_name || 'Standard Package'}.`,
        proofUrl: null,
        rawTimestamp: ts.iso
      });
    }

    // Lead Status History records (excluding NOTE items)
    mergedStatusHistory.forEach((sh, idx) => {
      const nStatus = (sh.new_status || '').trim();
      const oStatus = (sh.old_status || '').trim();
      
      // Filter out pure note records
      if (nStatus === 'NOTE' && oStatus === 'NOTE') return;

      const ts = parseDateTime(sh.created_at || sh.timestamp);
      const key = `sh_${sh.id || idx}_${ts.iso}_${nStatus}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: key,
          orderId: sh.order_id || finalOrderId,
          leadId: sh.lead_id || finalLeadId || '',
          previousStatus: oStatus || 'Previous Stage',
          newStatus: nStatus || 'Updated Status',
          changedDate: ts.date,
          changedTime: ts.time,
          changedBy: sh.changed_by || 'System User',
          changedByRole: sh.changed_by_role || 'Staff',
          remarks: sh.remarks || `Transitioned stage from ${oStatus || 'previous'} to ${nStatus}.`,
          proofUrl: sh.proof_url ? resolveStorageUrl(sh.proof_url) : null,
          rawTimestamp: ts.iso
        });
      }
    });

    // Stage change logs from Activity Logs
    matchedLogs.forEach((log, idx) => {
      if (log.previous_stage || log.new_stage || (log.action && (log.action.includes('Stage') || log.action.includes('Status')))) {
        const ts = parseDateTime(log.timestamp);
        const key = `log_status_${log.log_id || idx}_${ts.iso}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            id: key,
            orderId: finalOrderId,
            leadId: finalLeadId || '',
            previousStatus: log.previous_stage || 'Previous Stage',
            newStatus: log.new_stage || log.action,
            changedDate: ts.date,
            changedTime: ts.time,
            changedBy: log.user_name || 'System User',
            changedByRole: log.role || 'Staff',
            remarks: log.details || `Stage updated: ${log.action}`,
            proofUrl: null,
            rawTimestamp: ts.iso
          });
        }
      }
    });

    items.sort((a, b) => {
      const timeA = new Date(a.rawTimestamp).getTime() || 0;
      const timeB = new Date(b.rawTimestamp).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return items;
  }, [mergedStatusHistory, matchedLogs, matchedOrder, matchedLead, finalOrderId, finalLeadId, sortOrder]);

  /* ============================================================================
     2. ADD NOTE HISTORY (Note content, added by, note date, note time)
     ============================================================================ */
  const noteHistoryList = useMemo<NoteHistoryItem[]>(() => {
    const items: NoteHistoryItem[] = [];
    const seen = new Set<string>();

    // 1. From lead_status_history where new_status === 'NOTE' or old_status === 'NOTE'
    mergedStatusHistory.forEach((sh, idx) => {
      const isNote = sh.new_status === 'NOTE' || sh.old_status === 'NOTE' || (sh.remarks && sh.remarks.startsWith('NOTE:'));
      if (isNote && sh.remarks && sh.remarks.trim()) {
        const ts = parseDateTime(sh.created_at || sh.timestamp);
        const content = sh.remarks.replace(/^NOTE:\s*/i, '').trim();
        const key = `note_sh_${sh.id || idx}_${content}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            id: key,
            orderId: sh.order_id || finalOrderId,
            leadId: sh.lead_id || finalLeadId || '',
            noteContent: content,
            addedBy: sh.changed_by || 'Staff Member',
            addedByRole: sh.changed_by_role || 'Staff',
            noteDate: ts.date,
            noteTime: ts.time,
            rawTimestamp: ts.iso,
            source: 'Status & Action Notes'
          });
        }
      }
    });

    // 2. Remarks in lead_status_history that are genuine standalone remarks
    mergedStatusHistory.forEach((sh, idx) => {
      if (sh.remarks && sh.remarks.trim() && sh.new_status !== 'NOTE') {
        const content = sh.remarks.trim();
        if (content.length > 3 && !content.startsWith('Status transitioned') && !content.startsWith('Stage changed')) {
          const ts = parseDateTime(sh.created_at || sh.timestamp);
          const key = `remark_sh_${sh.id || idx}_${content}`;
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              id: key,
              orderId: sh.order_id || finalOrderId,
              leadId: sh.lead_id || finalLeadId || '',
              noteContent: `[${sh.new_status || 'Update'} Remark] ${content}`,
              addedBy: sh.changed_by || 'Staff Member',
              addedByRole: sh.changed_by_role || 'Staff',
              noteDate: ts.date,
              noteTime: ts.time,
              rawTimestamp: ts.iso,
              source: 'Stage Progress Remarks'
            });
          }
        }
      }
    });

    // 3. Lead Follow Up Notes & Negotiation Notes
    if (matchedLead?.follow_up_notes && matchedLead.follow_up_notes.trim()) {
      const ts = parseDateTime(matchedLead.updated_at || matchedLead.created_at);
      const key = `lead_fn_${finalLeadId}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: key,
          orderId: finalOrderId,
          leadId: finalLeadId,
          noteContent: matchedLead.follow_up_notes.trim(),
          addedBy: matchedLead.sales_person || 'Sales Representative',
          addedByRole: 'Sales',
          noteDate: ts.date,
          noteTime: ts.time,
          rawTimestamp: ts.iso,
          source: 'Sales Follow-up Log'
        });
      }
    }

    if (matchedLead?.remarks && matchedLead.remarks.trim() && matchedLead.remarks !== matchedLead.follow_up_notes) {
      const ts = parseDateTime(matchedLead.created_at);
      const key = `lead_rem_${finalLeadId}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: key,
          orderId: finalOrderId,
          leadId: finalLeadId,
          noteContent: matchedLead.remarks.trim(),
          addedBy: matchedLead.sales_person || matchedLead.created_by || 'Sales Representative',
          addedByRole: 'Sales',
          noteDate: ts.date,
          noteTime: ts.time,
          rawTimestamp: ts.iso,
          source: 'Lead Intake Notes'
        });
      }
    }

    // 4. Special Customizations / Contract Notes
    if (matchedLead?.notes_special_customizations || matchedOrder?.notes_special_customizations) {
      const customNote = (matchedOrder?.notes_special_customizations || matchedLead?.notes_special_customizations || '').trim();
      if (customNote) {
        const ts = parseDateTime(matchedOrder?.created_at || matchedLead?.created_at);
        const key = `custom_notes_${finalOrderId}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            id: key,
            orderId: finalOrderId,
            leadId: finalLeadId,
            noteContent: `Customization Notes: ${customNote}`,
            addedBy: matchedOrder?.sales_person || matchedLead?.sales_person || 'Sales Desk',
            addedByRole: 'Sales',
            noteDate: ts.date,
            noteTime: ts.time,
            rawTimestamp: ts.iso,
            source: 'Client Package Customization'
          });
        }
      }
    }

    // 5. Activity Logs matching notes
    matchedLogs.forEach((log, idx) => {
      if (log.action === 'Add Note' || (log.details && log.details.toLowerCase().includes('note'))) {
        const ts = parseDateTime(log.timestamp);
        const key = `log_note_${log.log_id || idx}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            id: key,
            orderId: finalOrderId,
            leadId: finalLeadId,
            noteContent: log.details || 'Note logged',
            addedBy: log.user_name || 'Staff User',
            addedByRole: log.role || 'Staff',
            noteDate: ts.date,
            noteTime: ts.time,
            rawTimestamp: ts.iso,
            source: 'Activity Log Note'
          });
        }
      }
    });

    items.sort((a, b) => {
      const timeA = new Date(a.rawTimestamp).getTime() || 0;
      const timeB = new Date(b.rawTimestamp).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return items;
  }, [mergedStatusHistory, matchedLead, matchedOrder, matchedLogs, finalOrderId, finalLeadId, sortOrder]);

  /* ============================================================================
     3. OPERATIONS UPDATES (Staff updates, equipment updates, event/reporting, date, time, staff)
     ============================================================================ */
  const operationsUpdateList = useMemo<OperationsUpdateItem[]>(() => {
    const items: OperationsUpdateItem[] = [];
    const seen = new Set<string>();

    // A. Staff Assignments from staffAssignments table
    matchedStaffAssignments.forEach((sa, idx) => {
      const ts = parseDateTime(sa.assignment_date || (sa as any).created_at);
      const key = `sa_${sa.assignment_id || idx}_${sa.staff_name}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: key,
          orderId: finalOrderId,
          leadId: finalLeadId,
          updateType: 'Staff Assignment',
          title: `Crew Assigned: ${sa.staff_name}`,
          description: `Role: ${sa.staff_role} (${sa.staff_type || 'In-House'}). Task Status: ${sa.task_status || sa.assignment_status || 'Assigned'}.`,
          staffName: sa.staff_name,
          staffRole: sa.staff_role,
          updatedBy: sa.updated_by || 'Operations Lead',
          date: ts.date,
          time: ts.time,
          rawTimestamp: ts.iso,
          equipmentDetails: Array.isArray(sa.equipment) ? sa.equipment : [],
          proofUrl: sa.raw_footage_link ? resolveStorageUrl(sa.raw_footage_link) : null,
          statusBadge: sa.assignment_status || 'Assigned'
        });
      }
    });

    // B. Lead Staff Assignment History
    matchedLeadStaffHistory.forEach((lsh, idx) => {
      const ts = parseDateTime(lsh.assigned_at);
      const key = `lsh_${lsh.id || idx}_${lsh.assigned_staff}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: key,
          orderId: finalOrderId,
          leadId: finalLeadId,
          updateType: 'Staff Assignment',
          title: `Role Assignment: ${lsh.assigned_role}`,
          description: `Assigned staff member: ${lsh.assigned_staff}.`,
          staffName: lsh.assigned_staff,
          staffRole: lsh.assigned_role,
          updatedBy: lsh.assigned_by || 'Operations Manager',
          date: ts.date,
          time: ts.time,
          rawTimestamp: ts.iso,
          statusBadge: 'Assigned'
        });
      }
    });

    // C. Operations Master Record (Shoot details & reporting time)
    matchedOps.forEach((op, idx) => {
      const ts = parseDateTime((op as any).updated_at || (op as any).created_at || matchedOrder?.event_date);
      const key = `op_master_${op.operation_id || idx}`;
      
      const crewList = [
        op.photographer_assigned ? `Photographer: ${op.photographer_assigned}` : '',
        op.videographer_assigned ? `Videographer: ${op.videographer_assigned}` : '',
        op.drone_operator_assigned ? `Drone Operator: ${op.drone_operator_assigned}` : '',
        op.assistant_assigned ? `Assistant: ${op.assistant_assigned}` : ''
      ].filter(Boolean).join(' | ');

      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: key,
          orderId: finalOrderId,
          leadId: finalLeadId,
          updateType: 'Event & Reporting',
          title: `Shoot Logistics: ${op.event_status || 'Scheduled'}`,
          description: `Reporting Time: ${op.reporting_time || matchedOrder?.reporting_time || 'N/A'}. Assigned Crew: ${crewList || 'Standard Crew'}. Equipment Kit: ${op.equipment_kit || 'Standard Kit'}. ${op.remarks ? `Remarks: ${op.remarks}` : ''}`,
          staffName: op.photographer_assigned || op.videographer_assigned || 'Operations Team',
          staffRole: 'Operations',
          updatedBy: op.updated_by || 'Operations Team',
          date: ts.date,
          time: ts.time,
          rawTimestamp: ts.iso,
          proofUrl: op.raw_footage_drive_link || (op as any).footage_link || null,
          statusBadge: op.event_status || 'Assigned'
        });
      }

      // Raw Footage / Handover Link from Operations
      if (op.raw_footage_drive_link || (op as any).consolidated_drive_link) {
        const rfLink = op.raw_footage_drive_link || (op as any).consolidated_drive_link;
        const rfKey = `op_rf_${op.operation_id || idx}`;
        if (!seen.has(rfKey)) {
          seen.add(rfKey);
          items.push({
            id: rfKey,
            orderId: finalOrderId,
            leadId: finalLeadId,
            updateType: 'Footage & Shoot',
            title: 'Raw Footage Handover Uploaded',
            description: `Raw footage drive link registered: ${rfLink}. ${op.upload_notes_remarks ? `Upload Notes: ${op.upload_notes_remarks}` : ''}`,
            staffName: op.updated_by || 'Operations Crew',
            staffRole: 'Operations',
            updatedBy: op.updated_by || 'Operations Crew',
            date: ts.date,
            time: ts.time,
            rawTimestamp: ts.iso,
            proofUrl: rfLink,
            statusBadge: 'Footage Received'
          });
        }
      }
    });

    // D. Equipment History & Checkouts / Returns
    matchedEquipmentHistory.forEach((leh, idx) => {
      const ts = parseDateTime(leh.returned_at || (leh as any).created_at);
      const key = `leh_${leh.id || idx}_${leh.equipment_name}`;
      if (!seen.has(key)) {
        seen.add(key);
        let photoUrl: string | null = null;
        if ((leh as any).photo_url) photoUrl = resolveStorageUrl((leh as any).photo_url);
        if (leh.remarks) {
          try {
            const parsed = typeof leh.remarks === 'string' ? JSON.parse(leh.remarks) : leh.remarks;
            if (parsed.photo_url) photoUrl = resolveStorageUrl(parsed.photo_url);
          } catch (e) {}
        }

        items.push({
          id: key,
          orderId: finalOrderId,
          leadId: finalLeadId,
          updateType: 'Equipment Kit / Handover',
          title: `Equipment Status: ${leh.equipment_name}`,
          description: `Kit: ${leh.equipment_name} marked as "${leh.equipment_status}". ${leh.remarks && typeof leh.remarks === 'string' && !leh.remarks.startsWith('{') ? `Remarks: ${leh.remarks}` : ''}`,
          staffName: leh.returned_by || 'Operations Staff',
          staffRole: 'Equipment Desk',
          updatedBy: leh.returned_by || 'Operations Staff',
          date: ts.date,
          time: ts.time,
          rawTimestamp: ts.iso,
          proofUrl: photoUrl,
          statusBadge: leh.equipment_status
        });
      }
    });

    // E. Equipment Handovers
    matchedHandovers.forEach((eh, idx) => {
      const ts = parseDateTime(eh.return_date || eh.created_at);
      const key = `eh_${eh.handover_id || idx}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: key,
          orderId: finalOrderId,
          leadId: finalLeadId,
          updateType: 'Equipment Kit / Handover',
          title: `Equipment Return: ${eh.equipment_name}`,
          description: `Return Status: ${eh.return_status}. ${eh.notes ? `Handover Notes: ${eh.notes}` : ''}`,
          staffName: eh.returned_by || 'Crew Member',
          staffRole: 'Operations Crew',
          updatedBy: eh.returned_by || 'Operations Staff',
          date: ts.date,
          time: ts.time,
          rawTimestamp: ts.iso,
          statusBadge: eh.return_status
        });
      }
    });

    items.sort((a, b) => {
      const timeA = new Date(a.rawTimestamp).getTime() || 0;
      const timeB = new Date(b.rawTimestamp).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return items;
  }, [
    matchedStaffAssignments,
    matchedLeadStaffHistory,
    matchedOps,
    matchedEquipmentHistory,
    matchedHandovers,
    matchedOrder,
    finalOrderId,
    finalLeadId,
    sortOrder
  ]);

  /* ============================================================================
     4. PRODUCTION UPDATES (Production staff, status/checklist, customer review, server/folder)
     ============================================================================ */
  const productionUpdateList = useMemo<ProductionUpdateItem[]>(() => {
    const items: ProductionUpdateItem[] = [];
    const seen = new Set<string>();

    // A. Editor Assignments & Task Specialities
    matchedAssignments.forEach((ea, idx) => {
      const ts = parseDateTime(ea.created_at || ea.assigned_date || matchedProd?.created_at);
      const key = `ea_${ea.assignment_id || idx}`;
      if (!seen.has(key)) {
        seen.add(key);
        
        const proofCandidate = ea.confirmation_proof || ea.customer_communication_proof || ea.client_communication_proof || ea.proof_url || ea.proof_image || ea.uploaded_proof;
        const resolvedProof = proofCandidate ? resolveStorageUrl(proofCandidate) : null;
        const driveLink = ea.Edited_Drive_Link || ea.edited_drive_link || null;

        items.push({
          id: key,
          orderId: finalOrderId,
          leadId: finalLeadId,
          updateType: 'Editor Assignment',
          title: `Editor Assigned: ${ea.staff_name}`,
          description: `Speciality Task: ${ea.speciality || 'Main Editing'}. Status: "${ea.status}". Target Finish: ${ea.target_finish_date || 'Standard'}.`,
          staffName: ea.staff_name,
          staffRole: `Editor (${ea.speciality || 'General'})`,
          updatedBy: 'Production Manager',
          date: ts.date,
          time: ts.time,
          rawTimestamp: ts.iso,
          proofUrl: resolvedProof,
          driveLink: driveLink,
          statusBadge: ea.status
        });

        // Server Upload Confirmation from Editor Assignment
        if (ea.server_upload_confirmed || ea.server_upload_folder_name) {
          const srvTs = parseDateTime(ea.server_upload_confirmed_at || ea.created_at);
          const srvKey = `ea_srv_${ea.assignment_id || idx}`;
          if (!seen.has(srvKey)) {
            seen.add(srvKey);
            items.push({
              id: srvKey,
              orderId: finalOrderId,
              leadId: finalLeadId,
              updateType: 'Server & Folder',
              title: 'Server Folder Upload Confirmed',
              description: `Folder Name: "${ea.server_upload_folder_name || 'Standard Event Folder'}". Upload verified to central media server.`,
              staffName: ea.server_upload_confirmed_by || ea.staff_name,
              staffRole: 'Production Staff',
              updatedBy: ea.server_upload_confirmed_by || ea.staff_name,
              date: srvTs.date,
              time: srvTs.time,
              rawTimestamp: srvTs.iso,
              statusBadge: 'Server Uploaded'
            });
          }
        }
      }
    });

    // B. Production Master Record (Status, Checklists, Customer Review)
    if (matchedProd) {
      const ts = parseDateTime((matchedProd as any).updated_at || matchedProd.editing_start_date || (matchedProd as any).created_at);
      
      // 1. Overall Production Status Update
      const prodStatusKey = `prod_status_${matchedProd.production_id}`;
      if (!seen.has(prodStatusKey)) {
        seen.add(prodStatusKey);
        items.push({
          id: prodStatusKey,
          orderId: finalOrderId,
          leadId: finalLeadId,
          updateType: 'Status & Progress',
          title: `Production Status: ${matchedProd.editing_status || matchedProd.production_status || 'In Progress'}`,
          description: `Primary Editor: ${matchedProd.editor_assigned || 'Unassigned'}. Delivery Target: ${matchedProd.expected_delivery_date || matchedProd.target_delivery_date || 'Standard'}. ${matchedProd.remarks ? `Remarks: ${matchedProd.remarks}` : ''}`,
          staffName: matchedProd.editor_assigned || 'Production Staff',
          staffRole: 'Production Lead',
          updatedBy: matchedProd.editor_assigned || 'Production Team',
          date: ts.date,
          time: ts.time,
          rawTimestamp: ts.iso,
          statusBadge: matchedProd.editing_status || 'In Progress'
        });
      }

      // 2. Customer Review & Acceptance
      if (matchedProd.customer_review_status || matchedProd.editing_status === 'Customer Review' || matchedProd.editing_status === 'Client Acceptance') {
        const crKey = `prod_cr_${matchedProd.production_id}`;
        if (!seen.has(crKey)) {
          seen.add(crKey);
          const consentProof = matchedProd.client_communication_proof || (matchedProd as any).customer_acceptance_proof;
          items.push({
            id: crKey,
            orderId: finalOrderId,
            leadId: finalLeadId,
            updateType: 'Customer Review',
            title: `Client Review & Approval: ${matchedProd.customer_review_status || matchedProd.editing_status}`,
            description: `Client verification status is "${matchedProd.customer_review_status || matchedProd.editing_status}". ${matchedProd.remarks || 'Client communication proof registered.'}`,
            staffName: matchedProd.editor_assigned || 'Production Desk',
            staffRole: 'Production',
            updatedBy: matchedProd.editor_assigned || 'Production Desk',
            date: ts.date,
            time: ts.time,
            rawTimestamp: ts.iso,
            proofUrl: consentProof ? resolveStorageUrl(consentProof) : null,
            driveLink: matchedProd.delivery_link || null,
            statusBadge: matchedProd.customer_review_status || matchedProd.editing_status
          });
        }
      }

      // 3. Checklist Verification Updates
      const hasAnyChecklist = matchedProd.checklist_customer_acceptance || 
                              matchedProd.checklist_content_usage || 
                              matchedProd.checklist_footage_deleted_7_days || 
                              matchedProd.checklist_payment_from_sales || 
                              matchedProd.checklist_edited_files_uploaded;

      if (hasAnyChecklist) {
        const clKey = `prod_chk_${matchedProd.production_id}`;
        if (!seen.has(clKey)) {
          seen.add(clKey);
          const completedChecks: string[] = [];
          if (matchedProd.checklist_customer_acceptance) completedChecks.push('Customer Acceptance Confirmed');
          if (matchedProd.checklist_content_usage) completedChecks.push('Content Usage Permission Granted');
          if (matchedProd.checklist_footage_deleted_7_days) completedChecks.push('7-Day Footage Deletion Verified');
          if (matchedProd.checklist_payment_from_sales) completedChecks.push('Sales Payment Verification');
          if (matchedProd.checklist_edited_files_uploaded) completedChecks.push('Edited Files Uploaded to Server');

          items.push({
            id: clKey,
            orderId: finalOrderId,
            leadId: finalLeadId,
            updateType: 'Checklist Verification',
            title: 'Production Quality & Closeout Checklist Verified',
            description: `Verified Checklist Items (${completedChecks.length}): ${completedChecks.join(', ')}.`,
            staffName: 'Production Lead / QA',
            staffRole: 'Quality Control',
            updatedBy: 'Production QA',
            date: ts.date,
            time: ts.time,
            rawTimestamp: ts.iso,
            statusBadge: 'Checklist Passed'
          });
        }
      }

      // 4. Server Path & Folder Verification
      if (matchedProd.server_path || matchedProd.server_upload_folder_name || matchedProd.server_upload_confirmed) {
        const srvMasterKey = `prod_srv_master_${matchedProd.production_id}`;
        if (!seen.has(srvMasterKey)) {
          seen.add(srvMasterKey);
          items.push({
            id: srvMasterKey,
            orderId: finalOrderId,
            leadId: finalLeadId,
            updateType: 'Server & Folder',
            title: 'Server Storage Path Configured',
            description: `Storage Location: ${matchedProd.server_path || 'Central Storage'}. Folder: "${matchedProd.server_upload_folder_name || matchedOrder?.custom_event_name || 'Event Files'}". Upload Confirmed: ${matchedProd.server_upload_confirmed ? 'Yes' : 'Pending'}.`,
            staffName: matchedProd.editor_assigned || 'Production Staff',
            staffRole: 'Storage Admin',
            updatedBy: 'Production System',
            date: ts.date,
            time: ts.time,
            rawTimestamp: ts.iso,
            statusBadge: 'Server Synced'
          });
        }
      }
    }

    items.sort((a, b) => {
      const timeA = new Date(a.rawTimestamp).getTime() || 0;
      const timeB = new Date(b.rawTimestamp).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return items;
  }, [matchedAssignments, matchedProd, matchedOrder, finalOrderId, finalLeadId, sortOrder]);

  /* ============================================================================
     5. IMAGE / PROOF UPDATES (Strictly for THIS specific order only)
     ============================================================================ */
  const imageProofList = useMemo<ImageProofItem[]>(() => {
    const list: ImageProofItem[] = [];
    const seen = new Set<string>();

    const addProof = (
      rawUrl: any, 
      category: ImageProofItem['category'], 
      title: string, 
      uploadedBy: string, 
      uploadedByRole: string, 
      dateVal: any,
      fallbackTime?: string
    ) => {
      if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return;
      const cleanUrl = rawUrl.trim();
      const resolved = resolveStorageUrl(cleanUrl) || (cleanUrl.startsWith('http') ? cleanUrl : null);
      if (!resolved) return;

      const key = `${category}_${title}_${resolved}`;
      if (seen.has(key)) return;
      seen.add(key);

      const ts = parseDateTime(dateVal, fallbackTime);
      list.push({
        id: `proof_${seen.size}_${key.substring(0, 16)}`,
        orderId: finalOrderId,
        leadId: finalLeadId,
        url: resolved,
        isImage: isImageUrl(resolved),
        category,
        title,
        uploadedBy: uploadedBy || 'Staff',
        uploadedByRole: uploadedByRole || 'Team',
        uploadDate: ts.date,
        uploadTime: ts.time,
        rawTimestamp: ts.iso
      });
    };

    // A. Operations Proofs & Footage Links
    matchedOps.forEach((op, idx) => {
      const opDate = (op as any).updated_at || (op as any).created_at || matchedOrder?.event_date;
      if (op.raw_footage_drive_link) {
        addProof(op.raw_footage_drive_link, 'Operations Proof', `Raw Footage Drive Link (${op.photographer_assigned || 'Shoot'})`, op.updated_by || op.photographer_assigned || 'Operations', 'Operations', opDate);
      }
      if ((op as any).consolidated_drive_link) {
        addProof((op as any).consolidated_drive_link, 'Operations Proof', 'Consolidated Footage Drive Link', op.updated_by || 'Operations', 'Operations', opDate);
      }
      if ((op as any).footage_link) {
        addProof((op as any).footage_link, 'Operations Proof', 'Footage Handover Link', op.updated_by || 'Operations', 'Operations', opDate);
      }
    });

    matchedStaffAssignments.forEach((sa, idx) => {
      if (sa.raw_footage_link) {
        addProof(sa.raw_footage_link, 'Operations Proof', `Crew Handover Link (${sa.staff_name})`, sa.staff_name, sa.staff_role || 'Crew', sa.assignment_date);
      }
    });

    matchedEquipmentHistory.forEach((leh, idx) => {
      let photoUrl = (leh as any).photo_url;
      if (leh.remarks) {
        try {
          const parsed = typeof leh.remarks === 'string' ? JSON.parse(leh.remarks) : leh.remarks;
          if (parsed.photo_url) photoUrl = parsed.photo_url;
        } catch (e) {}
      }
      if (photoUrl) {
        addProof(photoUrl, 'Operations Proof', `Equipment Handover Proof (${leh.equipment_name})`, leh.returned_by || 'Operations Staff', 'Operations', leh.returned_at || (leh as any).created_at);
      }
    });

    // B. Production & Production Staff Proofs
    if (matchedProd) {
      const pDate = (matchedProd as any).updated_at || (matchedProd as any).created_at;
      const clientProof = matchedProd.client_communication_proof || (matchedProd as any).customer_communication_proof || (matchedProd as any).customer_acceptance_proof;
      if (clientProof) {
        addProof(clientProof, 'Customer Consent / Communication', 'Client Communication & Consent Proof', matchedProd.editor_assigned || 'Production Staff', 'Production', pDate);
      }
      if (matchedProd.delivery_link) {
        addProof(matchedProd.delivery_link, 'Deliverable', 'Final Project Delivery Drive Link', matchedProd.editor_assigned || 'Production Desk', 'Production', matchedProd.delivery_date || pDate);
      }
    }

    matchedAssignments.forEach((ea, idx) => {
      const eaDate = ea.created_at || ea.assigned_date;
      const proofCandidate = ea.confirmation_proof || ea.customer_communication_proof || ea.client_communication_proof || ea.proof_url || ea.proof_image || ea.uploaded_proof;
      if (proofCandidate) {
        addProof(proofCandidate, 'Production Proof', `Editor Deliverable Proof (${ea.speciality || 'Task'} - ${ea.staff_name})`, ea.staff_name, 'Editor', eaDate);
      }
      if (ea.Edited_Drive_Link || ea.edited_drive_link) {
        const edLink = ea.Edited_Drive_Link || ea.edited_drive_link;
        addProof(edLink, 'Customer Consent / Communication', `Edited Drive Review Link (${ea.speciality || 'Task'})`, ea.staff_name, 'Editor', eaDate);
      }
      if (ea.raw_footage_link) {
        addProof(ea.raw_footage_link, 'Operations Proof', `Raw Footage Source Link (${ea.speciality || 'Task'})`, ea.staff_name, 'Editor', eaDate);
      }
    });

    // C. Status Change Proofs
    mergedStatusHistory.forEach((sh, idx) => {
      if (sh.proof_url) {
        addProof(sh.proof_url, 'Status Proof', `Status Change Proof (${sh.new_status || 'Stage'})`, sh.changed_by || 'Staff', sh.changed_by_role || 'Staff', sh.created_at || sh.timestamp);
      }
    });

    // D. Payment Receipts for THIS order
    matchedPayments.forEach((p, idx) => {
      const pProof = p.payment_proof_url || (p as any).receipt_url || (p as any).payment_proof;
      if (pProof) {
        addProof(pProof, 'Payment Receipt', `Payment Deposit Receipt (${p.payment_type || (p as any).Payment_type || 'Installment'} - Rs. ${Number(p.advance_received || p.final_payment_received || 0).toLocaleString('en-IN')})`, (p as any).collected_by || 'Accounts Desk', 'Finance', p.payment_date || (p as any).created_at);
      }
    });

    list.sort((a, b) => {
      const timeA = new Date(a.rawTimestamp).getTime() || 0;
      const timeB = new Date(b.rawTimestamp).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [
    matchedOps,
    matchedStaffAssignments,
    matchedEquipmentHistory,
    matchedProd,
    matchedAssignments,
    mergedStatusHistory,
    matchedPayments,
    matchedOrder,
    finalOrderId,
    finalLeadId,
    sortOrder
  ]);

  /* ============================================================================
     UNIFIED CHRONOLOGICAL TIMELINE (All activities sorted together)
     ============================================================================ */
  const unifiedTimeline = useMemo<ChronoActivityItem[]>(() => {
    const list: ChronoActivityItem[] = [];

    // Map Status Changes
    statusHistoryList.forEach(item => {
      list.push({
        id: `chrono_status_${item.id}`,
        group: 'Status',
        activity: `Stage: ${item.previousStatus} → ${item.newStatus}`,
        badge: item.newStatus,
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        staffName: item.changedBy,
        staffRole: item.changedByRole || 'Staff',
        date: item.changedDate,
        time: item.changedTime,
        rawTimestamp: item.rawTimestamp,
        description: item.remarks || `Status transitioned to ${item.newStatus}.`,
        proofs: item.proofUrl ? [{
          id: `p_${item.id}`,
          label: 'Status Proof Attachment',
          url: item.proofUrl,
          type: (isImageUrl(item.proofUrl) ? 'image' : 'link') as 'image' | 'link'
        }] : []
      });
    });

    // Map Add Notes
    noteHistoryList.forEach(item => {
      list.push({
        id: `chrono_note_${item.id}`,
        group: 'Notes',
        activity: `Note Added (${item.source})`,
        badge: 'Note',
        badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        staffName: item.addedBy,
        staffRole: item.addedByRole || 'User',
        date: item.noteDate,
        time: item.noteTime,
        rawTimestamp: item.rawTimestamp,
        description: item.noteContent,
        proofs: []
      });
    });

    // Map Operations Updates
    operationsUpdateList.forEach(item => {
      list.push({
        id: `chrono_ops_${item.id}`,
        group: 'Operations',
        activity: item.title,
        badge: item.statusBadge || item.updateType,
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        staffName: item.staffName,
        staffRole: item.staffRole || 'Operations',
        date: item.date,
        time: item.time,
        rawTimestamp: item.rawTimestamp,
        description: item.description,
        proofs: item.proofUrl ? [{
          id: `p_ops_${item.id}`,
          label: item.title,
          url: item.proofUrl,
          type: (isImageUrl(item.proofUrl) ? 'image' : 'link') as 'image' | 'link'
        }] : []
      });
    });

    // Map Production Updates
    productionUpdateList.forEach(item => {
      list.push({
        id: `chrono_prod_${item.id}`,
        group: 'Production',
        activity: item.title,
        badge: item.statusBadge || item.updateType,
        badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
        staffName: item.staffName,
        staffRole: item.staffRole || 'Production',
        date: item.date,
        time: item.time,
        rawTimestamp: item.rawTimestamp,
        description: item.description,
        proofs: [
          ...(item.proofUrl ? [{
            id: `p_prod_${item.id}`,
            label: 'Production Proof',
            url: item.proofUrl,
            type: (isImageUrl(item.proofUrl) ? 'image' : 'link') as 'image' | 'link'
          }] : []),
          ...(item.driveLink ? [{
            id: `p_prod_link_${item.id}`,
            label: 'Review / Delivery Link',
            url: item.driveLink,
            type: 'link' as const
          }] : [])
        ]
      });
    });

    // Map Payment Transactions
    matchedPayments.forEach((p, idx) => {
      const ts = parseDateTime(p.payment_date || (p as any).created_at);
      const amt = Number(p.advance_received || p.final_payment_received || (p as any).amount || 0);
      const proofUrl = p.payment_proof_url || (p as any).receipt_url || (p as any).payment_proof;
      
      list.push({
        id: `chrono_pay_${p.payment_id || idx}`,
        group: 'Payment',
        activity: `Payment Received: ${formatINR(amt)}`,
        badge: p.payment_status || 'Received',
        badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
        staffName: (p as any).collected_by || 'Accounts Desk',
        staffRole: 'Finance',
        date: ts.date,
        time: ts.time,
        rawTimestamp: ts.iso,
        description: `Type: ${p.payment_type || (p as any).Payment_type || 'Installment'} | Mode: ${(p as any).payment_mode || 'Online/Bank'} | Txn ID: ${p.transaction_id || 'N/A'}`,
        proofs: proofUrl ? [{
          id: `p_pay_${p.payment_id || idx}`,
          label: 'Payment Receipt',
          url: resolveStorageUrl(proofUrl) || proofUrl,
          type: (isImageUrl(proofUrl) ? 'image' : 'link') as 'image' | 'link'
        }] : []
      });
    });

    list.sort((a, b) => {
      const timeA = new Date(a.rawTimestamp).getTime() || 0;
      const timeB = new Date(b.rawTimestamp).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [
    statusHistoryList,
    noteHistoryList,
    operationsUpdateList,
    productionUpdateList,
    matchedPayments,
    sortOrder
  ]);

  // Search Filter for All Activity
  const filteredUnifiedTimeline = useMemo(() => {
    if (!searchTerm.trim()) return unifiedTimeline;
    const q = searchTerm.toLowerCase();
    return unifiedTimeline.filter(item => 
      item.activity.toLowerCase().includes(q) ||
      item.badge.toLowerCase().includes(q) ||
      item.staffName.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
    );
  }, [unifiedTimeline, searchTerm]);

  // Search Filter for Status History
  const filteredStatusHistory = useMemo(() => {
    if (!searchTerm.trim()) return statusHistoryList;
    const q = searchTerm.toLowerCase();
    return statusHistoryList.filter(item => 
      item.previousStatus.toLowerCase().includes(q) ||
      item.newStatus.toLowerCase().includes(q) ||
      item.changedBy.toLowerCase().includes(q) ||
      (item.remarks && item.remarks.toLowerCase().includes(q)) ||
      item.changedDate.toLowerCase().includes(q)
    );
  }, [statusHistoryList, searchTerm]);

  // Search Filter for Note History
  const filteredNoteHistory = useMemo(() => {
    if (!searchTerm.trim()) return noteHistoryList;
    const q = searchTerm.toLowerCase();
    return noteHistoryList.filter(item => 
      item.noteContent.toLowerCase().includes(q) ||
      item.addedBy.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.noteDate.toLowerCase().includes(q)
    );
  }, [noteHistoryList, searchTerm]);

  // Search Filter for Operations
  const filteredOperations = useMemo(() => {
    if (!searchTerm.trim()) return operationsUpdateList;
    const q = searchTerm.toLowerCase();
    return operationsUpdateList.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.staffName.toLowerCase().includes(q) ||
      item.updateType.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q)
    );
  }, [operationsUpdateList, searchTerm]);

  // Search Filter for Production
  const filteredProduction = useMemo(() => {
    if (!searchTerm.trim()) return productionUpdateList;
    const q = searchTerm.toLowerCase();
    return productionUpdateList.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.staffName.toLowerCase().includes(q) ||
      item.updateType.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q)
    );
  }, [productionUpdateList, searchTerm]);

  // Search Filter for Proofs
  const filteredProofs = useMemo(() => {
    if (!searchTerm.trim()) return imageProofList;
    const q = searchTerm.toLowerCase();
    return imageProofList.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.uploadedBy.toLowerCase().includes(q) ||
      item.uploadDate.toLowerCase().includes(q)
    );
  }, [imageProofList, searchTerm]);

  // Payment Summary computation
  const paymentSummary = useMemo(() => {
    const quotationAmount = Number(
      matchedOrder?.quotation_amount || 
      matchedLead?.Final_Package_Amount || 
      matchedLead?.budget || 
      matchedPayments[0]?.quotation_amount || 
      order?.totalRevenue || 
      0
    );

    const advanceFromPayments = matchedPayments.reduce((s, p) => s + (Number(p.advance_received) || 0), 0);
    const finalFromPayments = matchedPayments.reduce((s, p) => s + (Number(p.final_payment_received) || 0), 0);
    const additionalFromPayments = matchedPayments.reduce((s, p) => s + (Number((p as any).additional_received) || 0), 0);

    const advanceReceived = advanceFromPayments || Number(matchedOrder?.advance_received || matchedLead?.advance_amount || 0);
    const finalReceived = finalFromPayments || Number(matchedOrder?.final_payment_received || 0);
    const additionalReceived = additionalFromPayments;

    const computedTotalPaid = advanceReceived + finalReceived + additionalReceived;
    const totalPaid = computedTotalPaid > 0 
      ? computedTotalPaid 
      : Number(order?.paymentReceived || matchedOrder?.total_payment_received || 0);

    const balanceDue = Math.max(0, quotationAmount - totalPaid);
    
    let paymentStatus: 'Fully Paid' | 'Partially Paid' | 'Pending' = 'Pending';
    if (quotationAmount > 0 && balanceDue === 0 && totalPaid > 0) {
      paymentStatus = 'Fully Paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'Partially Paid';
    } else if (order?.paymentStatus) {
      paymentStatus = order.paymentStatus;
    }

    const percentPaid = quotationAmount > 0 
      ? Math.min(100, Math.round((totalPaid / quotationAmount) * 100)) 
      : (totalPaid > 0 ? 100 : 0);

    const entries: any[] = [];
    if (matchedPayments.length > 0) {
      matchedPayments.forEach((p, idx) => {
        const rawAmt = Number(p.advance_received || 0) + Number(p.final_payment_received || 0) + Number((p as any).additional_received || (p as any).amount || 0);
        const pDate = p.payment_date || (p as any).created_at || matchedOrder?.event_date || matchedOrder?.created_at;
        const pType = p.payment_type || (p as any).Payment_type || (idx === 0 ? 'Advance Downpayment' : 'Final Settlement');
        const pMode = (p as any).payment_mode || (p as any).mode || (p.transaction_id ? 'UPI / Online' : 'Direct / Bank');
        const proof = p.payment_proof_url || (p as any).receipt_url || (p as any).payment_proof;
        
        entries.push({
          id: p.payment_id || `pay_${idx + 1}`,
          payment_id: p.payment_id || `PAY-${1000 + idx}`,
          order_id: p.order_id || finalOrderId,
          lead_id: p.lead_id || finalLeadId || '-',
          date: pDate,
          type: pType,
          mode: pMode,
          amount: rawAmt > 0 ? rawAmt : totalPaid,
          balance_due: p.balance_due !== undefined ? p.balance_due : balanceDue,
          transaction_id: p.transaction_id || 'N/A',
          payment_status: p.payment_status || paymentStatus,
          collection_status: p.payment_collection_status || 'Verified',
          proof_url: proof ? resolveStorageUrl(proof) : null,
          collected_by: (p as any).collected_by || (p as any).staff_name || matchedOrder?.sales_executive || matchedLead?.assigned_sales_agent || 'Accounts / Sales Desk',
          remarks: (p as any).notes || (p as any).remarks || 'Official Payment Record'
        });
      });
    } else if (totalPaid > 0) {
      if (advanceReceived > 0) {
        entries.push({
          id: `pay_adv_${finalOrderId}`,
          payment_id: `ADV-${finalOrderId.replace('ORD-', '') || '01'}`,
          order_id: finalOrderId,
          lead_id: finalLeadId || '-',
          date: matchedOrder?.created_at || matchedLead?.created_at || 'Registered Date',
          type: 'Advance Downpayment',
          mode: matchedOrder?.payment_mode || 'UPI / Bank Transfer',
          amount: advanceReceived,
          balance_due: Math.max(0, quotationAmount - advanceReceived),
          transaction_id: (matchedOrder as any)?.transaction_id || 'N/A',
          payment_status: advanceReceived >= quotationAmount ? 'Fully Paid' : 'Partially Paid',
          collection_status: 'Cleared',
          proof_url: null,
          collected_by: matchedOrder?.sales_person || matchedLead?.sales_person || 'Sales Team',
          remarks: 'Initial advance booking downpayment'
        });
      }
      if (finalReceived > 0) {
        entries.push({
          id: `pay_fin_${finalOrderId}`,
          payment_id: `FIN-${finalOrderId.replace('ORD-', '') || '01'}`,
          order_id: finalOrderId,
          lead_id: finalLeadId || '-',
          date: (matchedOrder as any)?.final_payment_date || matchedOrder?.updated_at || 'Final Date',
          type: 'Final Payment Settlement',
          mode: (matchedOrder as any)?.final_payment_mode || 'UPI / Bank Transfer',
          amount: finalReceived,
          balance_due: balanceDue,
          transaction_id: (matchedOrder as any)?.final_transaction_id || 'N/A',
          payment_status: 'Fully Paid',
          collection_status: 'Cleared',
          proof_url: null,
          collected_by: matchedOrder?.sales_person || 'Accounts Team',
          remarks: 'Final project milestone settlement'
        });
      }
    }

    return {
      quotationAmount,
      advanceReceived,
      finalReceived,
      additionalReceived,
      totalPaid,
      balanceDue,
      paymentStatus,
      percentPaid,
      entries
    };
  }, [matchedOrder, matchedLead, matchedPayments, order, finalOrderId, finalLeadId]);

  const filteredPaymentEntries = useMemo(() => {
    if (!paymentSearchTerm.trim()) return paymentSummary.entries;
    const q = paymentSearchTerm.toLowerCase();
    return paymentSummary.entries.filter(entry => 
      String(entry.payment_id || '').toLowerCase().includes(q) ||
      String(entry.type || '').toLowerCase().includes(q) ||
      String(entry.mode || '').toLowerCase().includes(q) ||
      String(entry.transaction_id || '').toLowerCase().includes(q) ||
      String(entry.payment_status || '').toLowerCase().includes(q) ||
      String(entry.collected_by || '').toLowerCase().includes(q) ||
      String(entry.date || '').toLowerCase().includes(q)
    );
  }, [paymentSummary.entries, paymentSearchTerm]);

  if (!isOpen || !order) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="order_history_modal_card"
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl shadow-2xl relative flex flex-col max-h-[94vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ========================================================================= */}
        {/* HEADER: ORDER CONTEXT & NAVIGATION TABS */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/80 shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3 h-3" />
                  ACTIVITY HISTORY & AUDIT LOGS
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  Order ID: {finalOrderId}
                </span>
                {finalLeadId && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    (Lead: {finalLeadId})
                  </span>
                )}
                {isLoadingLive && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-blue-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Syncing live...
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Order Activity History</span>
              </h2>

              <p className="text-xs text-zinc-400 mt-0.5">
                Customer: <strong className="text-zinc-200">{matchedOrder?.customer_name || matchedLead?.customer_name || order?.customerName || 'Client'}</strong>
                {' '}• Event: <strong className="text-purple-300">{matchedLead?.custom_event_name || matchedLead?.event_name || matchedOrder?.custom_event_name || matchedOrder?.event_type || order?.eventName || 'Photography Event'}</strong>
                {' '}• Date: <strong className="text-zinc-300 font-mono">{matchedOrder?.event_date || matchedLead?.event_date || 'Scheduled'}</strong>
                {' '}• Stage: <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono font-bold text-[10px]">{matchedOrder?.current_stage || matchedProd?.editing_status || order?.currentStage || 'Confirmed'}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Close History"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Group Tabs (All 5 Categories + Chrono Feed + Payment Details) */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/80 overflow-x-auto pb-1 no-scrollbar">
            {/* Tab 1: All Activity */}
            <button
              type="button"
              id="tab_history_all"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-500'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>All Activity</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'all' ? 'bg-blue-800 text-blue-100' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {unifiedTimeline.length}
              </span>
            </button>

            {/* Tab 2: Status Change History */}
            <button
              type="button"
              id="tab_history_status"
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'status'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25 border border-sky-500'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-300" />
              <span>Status Changes</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'status' ? 'bg-sky-800 text-sky-100' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {statusHistoryList.length}
              </span>
            </button>

            {/* Tab 3: Add Note History */}
            <button
              type="button"
              id="tab_history_notes"
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'notes'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25 border border-amber-500'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
              <span>Add Notes</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'notes' ? 'bg-amber-800 text-amber-100' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {noteHistoryList.length}
              </span>
            </button>

            {/* Tab 4: Operations Updates */}
            <button
              type="button"
              id="tab_history_operations"
              onClick={() => setActiveTab('operations')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'operations'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-500'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span>Operations Updates</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'operations' ? 'bg-emerald-800 text-emerald-100' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {operationsUpdateList.length}
              </span>
            </button>

            {/* Tab 5: Production Updates */}
            <button
              type="button"
              id="tab_history_production"
              onClick={() => setActiveTab('production')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'production'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 border border-purple-500'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-purple-300" />
              <span>Production Updates</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'production' ? 'bg-purple-800 text-purple-100' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {productionUpdateList.length}
              </span>
            </button>

            {/* Tab 6: Image / Proof Updates */}
            <button
              type="button"
              id="tab_history_proofs"
              onClick={() => setActiveTab('proofs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'proofs'
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/25 border border-pink-500'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-pink-300" />
              <span>Image / Proofs</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'proofs' ? 'bg-pink-800 text-pink-100' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {imageProofList.length}
              </span>
            </button>

            {/* Tab 7: Payment Details History */}
            <button
              type="button"
              id="tab_history_payment_details"
              onClick={() => setActiveTab('payment_details')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'payment_details'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25 border border-teal-500'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-teal-300" />
              <span>Payment Details</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                paymentSummary.paymentStatus === 'Fully Paid'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : paymentSummary.paymentStatus === 'Partially Paid'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {paymentSummary.paymentStatus}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEARCH & CONTROLS TOOLBAR (For timeline views) */}
        {/* ========================================================================= */}
        {activeTab !== 'payment_details' && (
          <div className="p-3 sm:px-6 bg-zinc-900/40 border-b border-zinc-850 flex items-center justify-between gap-3 shrink-0 flex-wrap">
            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {activeTab === 'all' && `Complete Chronological Activity Timeline (${filteredUnifiedTimeline.length})`}
                {activeTab === 'status' && `Status Change History Records (${filteredStatusHistory.length})`}
                {activeTab === 'notes' && `Add Note History Log (${filteredNoteHistory.length})`}
                {activeTab === 'operations' && `Operations Updates & Handover Records (${filteredOperations.length})`}
                {activeTab === 'production' && `Production & Editing Updates (${filteredProduction.length})`}
                {activeTab === 'proofs' && `Uploaded Proofs & Documents (${filteredProofs.length})`}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search in history..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono placeholder-zinc-600"
                />
              </div>

              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title="Toggle Sort Direction"
              >
                <ArrowDownUp className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Latest First' : 'Oldest First'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BODY CONTENT: DEDICATED VIEWS ACCORDING TO USER REQUIREMENTS */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          
          {/* ----------------------------------------------------------------------- */}
          {/* TAB 1: ALL ACTIVITY TIMELINE (CHRONOLOGICAL) */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              {filteredUnifiedTimeline.length === 0 ? (
                <div className="py-16 text-center bg-zinc-900/30 border border-zinc-850 border-dashed rounded-2xl space-y-2">
                  <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400 font-mono">No matching activity history found for this order.</p>
                </div>
              ) : (
                <div className="relative pl-4 sm:pl-6 border-l-2 border-zinc-800/80 space-y-4">
                  {filteredUnifiedTimeline.map((item) => (
                    <div key={item.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] sm:-left-[29px] top-3 w-3 h-3 rounded-full bg-zinc-950 border-2 border-blue-500 ring-4 ring-zinc-950" />

                      <div className="bg-zinc-900/50 border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-3.5 sm:p-4 transition-all space-y-2">
                        {/* Header line */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {item.group}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-100">
                              {item.activity}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 shrink-0">
                            <span className="flex items-center gap-1 text-zinc-300">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              {item.date} {item.time}
                            </span>
                            <span className="flex items-center gap-1 text-zinc-400">
                              <User className="w-3 h-3 text-zinc-500" />
                              {item.staffName} {item.staffRole ? `(${item.staffRole})` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Description content */}
                        {item.description && (
                          <div className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-850">
                            {item.description}
                          </div>
                        )}

                        {/* Proof attachments */}
                        {item.proofs.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {item.proofs.map(proof => (
                              <div key={proof.id} className="flex items-center gap-1.5">
                                {proof.type === 'image' ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ url: proof.url, title: proof.label })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View Proof ({proof.label})</span>
                                  </button>
                                ) : (
                                  <a
                                    href={proof.url.startsWith('http') ? proof.url : `https://${proof.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    referrerPolicy="no-referrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Open Link ({proof.label})</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 2: STATUS CHANGE HISTORY */}
          {/* Required fields: Previous status, New status, Status changed date, Status changed time */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                <div className="p-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Status Change Progression ({filteredStatusHistory.length})
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Chronological Transition Audit
                  </span>
                </div>

                {filteredStatusHistory.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                    No status transition records found for this order.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-max">
                      <thead>
                        <tr className="bg-zinc-950/60 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Previous Status</th>
                          <th className="py-3 px-4 text-center">Transition</th>
                          <th className="py-3 px-4">New Status</th>
                          <th className="py-3 px-4">Status Changed Date</th>
                          <th className="py-3 px-4">Status Changed Time</th>
                          <th className="py-3 px-4">Changed By</th>
                          <th className="py-3 px-4">Remarks / Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {filteredStatusHistory.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-zinc-850/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-zinc-500 text-[10px]">{idx + 1}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-750 text-zinc-300 font-mono text-[11px]">
                                {item.previousStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center text-zinc-500">
                              <ArrowRight className="w-3.5 h-3.5 inline-block text-blue-400" />
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 font-mono font-bold text-[11px]">
                                {item.newStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-zinc-200 font-semibold">
                              {item.changedDate}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-zinc-400">
                              {item.changedTime}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-300 text-xs">
                              <span className="font-bold text-zinc-200 block">{item.changedBy}</span>
                              {item.changedByRole && <span className="text-[10px] text-zinc-500 font-mono">({item.changedByRole})</span>}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-400 text-xs max-w-xs">
                              <div className="truncate" title={item.remarks}>{item.remarks || '-'}</div>
                              {item.proofUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({ url: item.proofUrl!, title: `Status Proof: ${item.newStatus}` })}
                                  className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold cursor-pointer"
                                >
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>View Proof</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 3: ADD NOTE HISTORY */}
          {/* Required fields: Note content, Added by user/staff, Note date, Note time */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                <div className="p-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Complete Notes & Remarks Log ({filteredNoteHistory.length})
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Order-Specific Notes
                  </span>
                </div>

                {filteredNoteHistory.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                    No notes recorded for this specific order/lead.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60">
                    {filteredNoteHistory.map((item, idx) => (
                      <div key={item.id} className="p-4 hover:bg-zinc-850/30 transition-colors space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                              {item.source}
                            </span>
                            <span className="text-xs font-bold text-zinc-200">
                              Added by <strong className="text-white">{item.addedBy}</strong> {item.addedByRole ? `(${item.addedByRole})` : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                            <span className="flex items-center gap-1 text-zinc-300">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              Date: <strong className="text-zinc-200">{item.noteDate}</strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-zinc-300">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              Time: <strong className="text-zinc-200">{item.noteTime}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="bg-zinc-950/70 border border-zinc-850 p-3 rounded-xl text-xs text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap">
                          {item.noteContent}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 4: OPERATIONS UPDATES */}
          {/* Required fields: Operation staff updates, Equipment-related updates, Event/reporting updates, Date & Time, Staff/user */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                <div className="p-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Operations Activity & Handover Trail ({filteredOperations.length})
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Crew, Equipment & Shoot Updates
                  </span>
                </div>

                {filteredOperations.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                    No operations updates recorded for this order.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60">
                    {filteredOperations.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-zinc-850/30 transition-colors space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                              {item.updateType}
                            </span>
                            {item.statusBadge && (
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono">
                                {item.statusBadge}
                              </span>
                            )}
                            <h4 className="text-xs sm:text-sm font-bold text-white">
                              {item.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                            <span className="flex items-center gap-1 text-zinc-300">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              {item.date}
                            </span>
                            <span className="flex items-center gap-1 text-zinc-300">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              {item.time}
                            </span>
                            <span>•</span>
                            <span className="text-zinc-300 font-bold">
                              Staff: {item.staffName}
                            </span>
                          </div>
                        </div>

                        <div className="bg-zinc-950/70 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-200 font-sans leading-relaxed">
                          {item.description}
                          {item.equipmentDetails && item.equipmentDetails.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-zinc-850 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono text-zinc-400 uppercase">Assigned Equipment:</span>
                              {item.equipmentDetails.map((eq, eqIdx) => (
                                <span key={eqIdx} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-[10px] font-mono text-emerald-300">
                                  {eq}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {item.proofUrl && (
                          <div className="flex items-center gap-2 pt-1">
                            {isImageUrl(item.proofUrl) ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: item.proofUrl!, title: item.title })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Attached Proof</span>
                              </button>
                            ) : (
                              <a
                                href={item.proofUrl.startsWith('http') ? item.proofUrl : `https://${item.proofUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                referrerPolicy="no-referrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open Footage Drive Link</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 5: PRODUCTION UPDATES */}
          {/* Required fields: Production staff updates, Production status/checklist, Customer review, Server/folder, Date & Time, Staff/user */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'production' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                <div className="p-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" />
                    Production Deliverable & Quality Trail ({filteredProduction.length})
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Editors, Checklists, Reviews & Server Storage
                  </span>
                </div>

                {filteredProduction.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                    No production updates recorded for this order.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60">
                    {filteredProduction.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-zinc-850/30 transition-colors space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                              {item.updateType}
                            </span>
                            {item.statusBadge && (
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono">
                                {item.statusBadge}
                              </span>
                            )}
                            <h4 className="text-xs sm:text-sm font-bold text-white">
                              {item.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                            <span className="flex items-center gap-1 text-zinc-300">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              {item.date}
                            </span>
                            <span className="flex items-center gap-1 text-zinc-300">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              {item.time}
                            </span>
                            <span>•</span>
                            <span className="text-zinc-300 font-bold">
                              Staff: {item.staffName}
                            </span>
                          </div>
                        </div>

                        <div className="bg-zinc-950/70 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-200 font-sans leading-relaxed">
                          {item.description}
                        </div>

                        {(item.proofUrl || item.driveLink) && (
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {item.proofUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: item.proofUrl!, title: item.title })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Attached Proof</span>
                              </button>
                            )}

                            {item.driveLink && (
                              <a
                                href={item.driveLink.startsWith('http') ? item.driveLink : `https://${item.driveLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                referrerPolicy="no-referrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open Review / Deliverable Link</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 6: IMAGE / PROOF UPDATES */}
          {/* Required fields: Preview/Link, Type/Category, Uploaded By, Upload Date, Upload Time */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'proofs' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                <div className="p-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Uploaded Proofs, Images & Links ({filteredProofs.length})
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Order-Specific Media & Verifications
                  </span>
                </div>

                {filteredProofs.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                    No image proofs or document links uploaded for this specific order.
                  </div>
                ) : (
                  <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {filteredProofs.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden flex flex-col justify-between p-3 space-y-3 transition-all group shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-[10px] font-mono text-pink-300 font-bold uppercase truncate max-w-[160px]" title={item.category}>
                              {item.category}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {item.uploadDate}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-white truncate" title={item.title}>
                            {item.title}
                          </h5>

                          {/* Image preview thumbnail or Link card */}
                          {item.isImage ? (
                            <div 
                              onClick={() => setPreviewImage({ url: item.url, title: item.title })}
                              className="relative w-full h-32 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 cursor-pointer group-hover:border-pink-500/40 transition-colors flex items-center justify-center"
                            >
                              <img 
                                src={item.url} 
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-mono font-bold">
                                <Eye className="w-4 h-4" />
                                <span>Zoom</span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-24 bg-zinc-900/80 rounded-lg border border-zinc-800 p-2.5 flex flex-col justify-between">
                              <span className="text-[10px] font-mono text-blue-400 truncate block">
                                {item.url}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">External Document / Drive</span>
                            </div>
                          )}
                        </div>

                        {/* Metadata Footer & Action */}
                        <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                          <div>
                            <span className="text-zinc-300 font-bold block">{item.uploadedBy}</span>
                            <span className="text-zinc-500">{item.uploadTime}</span>
                          </div>

                          {item.isImage ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: item.url, title: item.title })}
                              className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          ) : (
                            <a
                              href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                              className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 7: PAYMENT DETAILS HISTORY (PRESERVED VIEW) */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'payment_details' && (
            <div className="space-y-6">
              {/* Financial Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                    <span className="font-mono uppercase text-[10px] tracking-wider text-zinc-400">Total Quotation</span>
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-white">
                    {formatINR(paymentSummary.quotationAmount)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">Contract Total Value</div>
                </div>

                <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                    <span className="font-mono uppercase text-[10px] tracking-wider text-emerald-400">Advance Received</span>
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-emerald-400">
                    {formatINR(paymentSummary.advanceReceived)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">Booking Downpayment</div>
                </div>

                <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                    <span className="font-mono uppercase text-[10px] tracking-wider text-cyan-400">Final Received</span>
                    <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-cyan-400">
                    {formatINR(paymentSummary.finalReceived + paymentSummary.additionalReceived)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">Settlement / Milestones</div>
                </div>

                <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                    <span className="font-mono uppercase text-[10px] tracking-wider text-rose-400">Balance Due</span>
                    <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className={`text-lg sm:text-xl font-black font-mono ${
                    paymentSummary.balanceDue === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {formatINR(paymentSummary.balanceDue)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">
                    {paymentSummary.balanceDue === 0 ? 'Fully Cleared' : 'Pending Payment'}
                  </div>
                </div>
              </div>

              {/* Realized Revenue Progress */}
              <div className="bg-zinc-900/40 border border-zinc-800/90 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs font-mono mb-2 flex-wrap gap-2">
                  <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Total Realized Revenue: <strong className="text-emerald-400">{formatINR(paymentSummary.totalPaid)}</strong>
                  </span>
                  <span className="text-zinc-400 text-[11px]">
                    {paymentSummary.percentPaid}% Cleared of {formatINR(paymentSummary.quotationAmount)}
                  </span>
                </div>
                <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      paymentSummary.paymentStatus === 'Fully Paid'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.max(4, paymentSummary.percentPaid)}%` }}
                  />
                </div>
              </div>

              {/* Detailed Transactions Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-black font-mono uppercase tracking-wider text-white">
                      Detailed Payment Transactions & Proofs ({paymentSummary.entries.length})
                    </h4>
                  </div>

                  {paymentSummary.entries.length > 1 && (
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search payment ref, mode..."
                        value={paymentSearchTerm}
                        onChange={(e) => setPaymentSearchTerm(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono placeholder-zinc-600"
                      />
                    </div>
                  )}
                </div>

                {filteredPaymentEntries.length === 0 ? (
                  <div className="py-12 text-center bg-zinc-900/30 border border-zinc-850 border-dashed rounded-2xl space-y-2">
                    <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-xs text-zinc-400 font-mono">No matching payment transactions registered for this order.</p>
                  </div>
                ) : (
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-max">
                        <thead>
                          <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                            <th className="py-3 px-4">Payment ID / Ref</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4">Method / Mode</th>
                            <th className="py-3 px-4">Amount Received</th>
                            <th className="py-3 px-4">Balance Due</th>
                            <th className="py-3 px-4">Txn / UTR Ref</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Receipt / Proof</th>
                            <th className="py-3 px-4">Collected By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {filteredPaymentEntries.map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                                {p.payment_id}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-zinc-300">
                                {p.date ? formatDateDDMMYY(p.date) : '-'}
                              </td>
                              <td className="py-3.5 px-4 text-zinc-200 font-semibold">
                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-750 text-[11px]">
                                  {p.type}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                                {p.mode}
                              </td>
                              <td className="py-3.5 px-4 font-bold font-mono text-emerald-400 text-sm">
                                {formatINR(Number(p.amount) || 0)}
                              </td>
                              <td className="py-3.5 px-4 font-bold font-mono text-rose-400">
                                {formatINR(Number(p.balance_due) || 0)}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-400">
                                {(!p.transaction_id || p.transaction_id === 'N/A' || p.transaction_id === 'null') ? (
                                  <span className="text-zinc-600">N/A</span>
                                ) : (
                                  <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                                    {p.transaction_id}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  p.payment_status === 'Fully Paid'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : p.payment_status === 'Partially Paid'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {p.payment_status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {p.proof_url ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImage({
                                        url: p.proof_url,
                                        title: `Payment Receipt: ${p.payment_id} (${formatINR(Number(p.amount) || 0)})`
                                      })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Receipt</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-mono text-zinc-600 italic">No receipt</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-zinc-400 text-xs">
                                {p.collected_by}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* FOOTER & CLOSE CONTROLS */}
        {/* ========================================================================= */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-zinc-400 font-mono text-center sm:text-left">
            Project Ref: <strong className="text-amber-400">{finalOrderId}</strong>
            {' '}• Showing <strong className="text-zinc-200">
              {activeTab === 'all' && `${filteredUnifiedTimeline.length} total activity items`}
              {activeTab === 'status' && `${filteredStatusHistory.length} status change records`}
              {activeTab === 'notes' && `${filteredNoteHistory.length} notes`}
              {activeTab === 'operations' && `${filteredOperations.length} operations updates`}
              {activeTab === 'production' && `${filteredProduction.length} production updates`}
              {activeTab === 'proofs' && `${filteredProofs.length} proof attachments`}
              {activeTab === 'payment_details' && `${filteredPaymentEntries.length} payment records`}
            </strong> for this specific customer project.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 font-mono"
              >
                <History className="w-3.5 h-3.5" />
                <span>All Activities</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>

      {/* Full Image Zoom / Proof Viewer */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[300] flex items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-850 bg-zinc-900/80 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-4">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider block">
                  Proof Image Viewer
                </span>
                <h4 className="text-sm font-bold text-white truncate mt-0.5">
                  {previewImage.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 flex-1 overflow-y-auto flex items-center justify-center bg-black min-h-[300px]">
              <img
                src={previewImage.url}
                alt="Proof Preview"
                referrerPolicy="no-referrer"
                className="max-h-[65vh] max-w-full object-contain rounded-lg border border-zinc-850 shadow-2xl"
              />
            </div>

            <div className="p-3 sm:p-4 border-t border-zinc-850 bg-zinc-900/80 flex items-center justify-between shrink-0">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Original Image</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
};
