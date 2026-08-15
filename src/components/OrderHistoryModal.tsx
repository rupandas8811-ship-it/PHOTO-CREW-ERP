import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  History, Calendar, Clock, User, CheckCircle2, CheckCircle, DollarSign, 
  Film, FileText, ExternalLink, Eye, X, Search, Filter, ArrowDownUp, 
  ShieldCheck, Image as ImageIcon, Link as LinkIcon, AlertCircle, Play, 
  Send, RefreshCw, ChevronRight, Layers, FileVideo, Download
} from 'lucide-react';
import { useRole } from './RoleContext';
import { formatINR, resolveStorageUrl, parseCustomerProof } from '../utils';

export interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any; // Order object or row from summary
}

interface HistoryTimelineItem {
  id: string;
  timestamp: string; // ISO or parseable date string
  formattedDate: string;
  formattedTime: string;
  activity: string;
  category: 'Sales' | 'Operations' | 'Production' | 'Client Consent' | 'Payment' | 'System';
  status: string;
  statusColor: string;
  staffName: string;
  staffRole?: string;
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
  order
}) => {
  const { 
    leads, 
    orders, 
    production, 
    operations, 
    editorAssignments, 
    payments, 
    statusHistory, 
    logs 
  } = useRole();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Extract relevant records for this Order
  const targetOrderId = order?.orderId || order?.order_id || '';
  const targetLeadId = order?.leadId || order?.lead_id || '';

  const matchedOrder = useMemo(() => {
    if (!targetOrderId && !targetLeadId) return order;
    return orders.find(o => o.order_id === targetOrderId || (targetLeadId && o.lead_id === targetLeadId)) || order;
  }, [orders, targetOrderId, targetLeadId, order]);

  const matchedLead = useMemo(() => {
    const leadId = targetLeadId || matchedOrder?.lead_id;
    if (!leadId) return null;
    return leads.find(l => l.lead_id === leadId || l.lead_id === targetOrderId) || null;
  }, [leads, targetLeadId, matchedOrder, targetOrderId]);

  const matchedProd = useMemo(() => {
    return production.find(p => 
      p.order_id === targetOrderId || 
      p.tracking_id === targetOrderId || 
      p.production_id === targetOrderId ||
      (targetLeadId && p.lead_id === targetLeadId)
    ) || null;
  }, [production, targetOrderId, targetLeadId]);

  const matchedOps = useMemo(() => {
    return operations.filter(op => 
      op.order_id === targetOrderId || 
      (targetLeadId && op.lead_id === targetLeadId)
    );
  }, [operations, targetOrderId, targetLeadId]);

  const matchedAssignments = useMemo(() => {
    return editorAssignments.filter(ea => 
      ea.order_id === targetOrderId || 
      ea.production_id === targetOrderId || 
      ea.production_id === matchedProd?.production_id ||
      (targetLeadId && ea.order_id === targetLeadId)
    );
  }, [editorAssignments, targetOrderId, targetLeadId, matchedProd]);

  const matchedPayments = useMemo(() => {
    return payments.filter(p => 
      p.order_id === targetOrderId || 
      (targetLeadId && p.lead_id === targetLeadId)
    );
  }, [payments, targetOrderId, targetLeadId]);

  const matchedStatusHistory = useMemo(() => {
    return (statusHistory || []).filter(sh => 
      sh.order_id === targetOrderId || 
      (targetLeadId && sh.lead_id === targetLeadId)
    );
  }, [statusHistory, targetOrderId, targetLeadId]);

  const matchedLogs = useMemo(() => {
    return (logs || []).filter(log => 
      log.record_id === targetOrderId || 
      log.record_id === targetLeadId || 
      log.lead_id === targetLeadId || 
      log.order_id === targetOrderId ||
      (log.details && (log.details.includes(targetOrderId) || (targetLeadId && log.details.includes(targetLeadId))))
    );
  }, [logs, targetOrderId, targetLeadId]);

  // Helper to format Date and Time
  const parseDateTime = (dateVal?: any) => {
    if (!dateVal) {
      return {
        iso: new Date(0).toISOString(),
        date: 'N/A',
        time: 'N/A'
      };
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return {
        iso: String(dateVal),
        date: String(dateVal),
        time: ''
      };
    }
    return {
      iso: d.toISOString(),
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  };

  // Helper to classify image vs link
  const categorizeUrl = (url: string): 'image' | 'link' | 'file' => {
    const u = url.toLowerCase();
    if (u.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(u) || u.includes('/storage/v1/object/public/img/')) {
      return 'image';
    }
    if (u.includes('drive.google.com') || u.includes('docs.google.com') || u.startsWith('http://') || u.startsWith('https://')) {
      return 'link';
    }
    return 'file';
  };

  // Build Comprehensive Unified History Timeline Items
  const historyItems = useMemo<HistoryTimelineItem[]>(() => {
    if (!isOpen) return [];
    const list: HistoryTimelineItem[] = [];

    // 1. Lead / Order Creation & Confirmation Event
    if (matchedLead?.created_at || matchedOrder?.created_at) {
      const ts = parseDateTime(matchedLead?.created_at || matchedOrder?.created_at);
      list.push({
        id: `event_created_${targetOrderId}`,
        timestamp: ts.iso,
        formattedDate: ts.date,
        formattedTime: ts.time,
        activity: 'Lead Registered & Order Initiated',
        category: 'Sales',
        status: 'Order Confirmed',
        statusColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        staffName: matchedLead?.assigned_sales_agent || matchedOrder?.sales_agent || 'Sales Team',
        staffRole: 'Sales Specialist',
        description: `Customer ${matchedOrder?.customer_name || matchedLead?.customer_name || 'Client'} confirmed project order for ₹${Number(matchedOrder?.total_amount || matchedLead?.quotation_amount || 0).toLocaleString('en-IN')}.`,
        proofs: []
      });
    }

    // 2. Status History records (from lead_status_history)
    matchedStatusHistory.forEach((sh, idx) => {
      const ts = parseDateTime(sh.created_at || sh.timestamp);
      const proofs: any[] = [];
      if (sh.proof_url) {
        const resolved = resolveStorageUrl(sh.proof_url);
        if (resolved) {
          proofs.push({
            id: `sh_proof_${sh.id || idx}`,
            label: 'Status Proof Attachment',
            url: resolved,
            type: categorizeUrl(resolved)
          });
        }
      }

      list.push({
        id: `sh_${sh.id || idx}`,
        timestamp: ts.iso,
        formattedDate: ts.date,
        formattedTime: ts.time,
        activity: sh.new_status ? `Stage Changed: ${sh.new_status}` : 'Status Updated',
        category: sh.new_status?.includes('Payment') ? 'Payment' : sh.new_status?.includes('Client') ? 'Client Consent' : 'System',
        status: sh.new_status || sh.old_status || 'Updated',
        statusColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        staffName: sh.changed_by || 'System',
        staffRole: sh.changed_by_role || 'Staff',
        description: sh.remarks || `Status transitioned from "${sh.old_status || 'Initial'}" to "${sh.new_status}".`,
        proofs
      });
    });

    // 3. Activity Logs records (from activity_logs)
    matchedLogs.forEach((log, idx) => {
      const ts = parseDateTime(log.timestamp);
      const proofs: any[] = [];
      if (log.details && (log.details.includes('http://') || log.details.includes('https://'))) {
        const urlMatch = log.details.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          const resolved = resolveStorageUrl(urlMatch[0]);
          if (resolved) {
            proofs.push({
              id: `log_proof_${log.log_id || idx}`,
              label: 'Activity Link / Document',
              url: resolved,
              type: categorizeUrl(resolved)
            });
          }
        }
      }

      list.push({
        id: `log_${log.log_id || idx}`,
        timestamp: ts.iso,
        formattedDate: ts.date,
        formattedTime: ts.time,
        activity: log.action || 'Activity Logged',
        category: (log.role === 'Production' || log.role === 'Editor') ? 'Production' : (log.role === 'Operations' ? 'Operations' : 'System'),
        status: log.action || 'Logged',
        statusColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        staffName: log.user_name || 'Staff User',
        staffRole: log.role || 'Staff',
        description: log.details || `Action recorded: ${log.action}`,
        proofs
      });
    });

    // 4. Operations & Shoot Execution
    matchedOps.forEach((op, idx) => {
      if (op.event_date) {
        const ts = parseDateTime(op.event_date);
        const proofs: any[] = [];
        if (op.footage_link) {
          proofs.push({
            id: `ops_footage_${op.id || idx}`,
            label: 'Raw Footage Link (Handover)',
            url: op.footage_link,
            type: categorizeUrl(op.footage_link)
          });
        }

        list.push({
          id: `ops_shoot_${op.id || idx}`,
          timestamp: ts.iso,
          formattedDate: ts.date,
          formattedTime: op.event_time || ts.time,
          activity: `Shoot Event: ${op.event_name || 'Event Coverage'}`,
          category: 'Operations',
          status: op.status || 'Event Scheduled',
          statusColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          staffName: [op.photographer_name, op.cinematographer_name, op.drone_flyer_name].filter(Boolean).join(', ') || 'Assigned Crew',
          staffRole: 'Operations Crew',
          description: `Location: ${op.event_location || 'Venue'}. Crew assigned for shoot coverage.`,
          proofs
        });
      }
    });

    // 5. Editor Assignments & Deliverable Progress
    matchedAssignments.forEach((ea, idx) => {
      const ts = parseDateTime(ea.created_at || ea.updated_at || matchedProd?.created_at);
      const proofs: any[] = [];

      // Raw footage link
      if (ea.raw_footage_link || ea.rawFootageLink) {
        const rfLink = ea.raw_footage_link || ea.rawFootageLink;
        proofs.push({
          id: `ea_rf_${ea.assignment_id || idx}`,
          label: 'Raw Footage Source',
          url: rfLink,
          type: categorizeUrl(rfLink)
        });
      }

      // Edited Drive Link (Customer Review)
      if (ea.Edited_Drive_Link || ea.edited_drive_link) {
        const edLink = ea.Edited_Drive_Link || ea.edited_drive_link;
        proofs.push({
          id: `ea_ed_${ea.assignment_id || idx}`,
          label: 'Edited Drive Review Link',
          url: edLink,
          type: categorizeUrl(edLink)
        });
      }

      // Customer Confirmation Proof / Client Communication Proof
      const proofCandidate = ea.confirmation_proof || ea.customer_communication_proof || ea.client_communication_proof || ea.proof_url || ea.proof_image || ea.uploaded_proof;
      if (proofCandidate) {
        const resolved = resolveStorageUrl(proofCandidate);
        if (resolved) {
          proofs.push({
            id: `ea_proof_${ea.assignment_id || idx}`,
            label: `Customer Confirmation Proof (${ea.speciality || 'Task'})`,
            url: resolved,
            type: categorizeUrl(resolved)
          });
        }
      }

      list.push({
        id: `ea_${ea.assignment_id || idx}`,
        timestamp: ts.iso,
        formattedDate: ts.date,
        formattedTime: ts.time,
        activity: `Deliverable Task: ${ea.speciality || 'Editing Task'}`,
        category: 'Production',
        status: ea.status || 'Editor Assigned',
        statusColor: ea.status === 'Editing Completed' || ea.status === 'Completed'
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        staffName: ea.staff_name || 'Production Editor',
        staffRole: 'Assigned Editor',
        description: `Target Finish: ${ea.target_finish_date || 'Standard'}. Deliverable status is "${ea.status}".`,
        proofs
      });
    });

    // 6. Production Master Record (Client Acceptance & Final Approval)
    if (matchedProd) {
      const ts = parseDateTime(matchedProd.updated_at || matchedProd.created_at);
      const proofs: any[] = [];

      const prodProof = matchedProd.client_communication_proof || matchedProd.customer_communication_proof || matchedProd.proof_url || matchedProd.customer_acceptance_proof;
      if (prodProof) {
        const resolved = resolveStorageUrl(prodProof);
        if (resolved) {
          proofs.push({
            id: `prod_consent_proof_${matchedProd.production_id}`,
            label: 'Client Communication & Consent Proof',
            url: resolved,
            type: categorizeUrl(resolved)
          });
        }
      }

      if (matchedProd.editing_status === 'Client Acceptance' || matchedProd.production_status === 'Client Acceptance') {
        list.push({
          id: `prod_ca_${matchedProd.production_id}`,
          timestamp: ts.iso,
          formattedDate: ts.date,
          formattedTime: ts.time,
          activity: 'Client Acceptance & Verification',
          category: 'Client Consent',
          status: 'Client Acceptance',
          statusColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          staffName: matchedProd.editor_assigned || 'Production Staff',
          staffRole: 'Production Team',
          description: matchedProd.remarks || 'Client has reviewed and approved all deliverables. Communication & consent proof saved.',
          proofs
        });
      }

      if (['Approved', 'Final Approval', 'Project Delivered', 'Completed', 'Order Closed', 'Closed'].includes(matchedProd.editing_status)) {
        list.push({
          id: `prod_fa_${matchedProd.production_id}`,
          timestamp: ts.iso,
          formattedDate: ts.date,
          formattedTime: ts.time,
          activity: 'Final Approval & Order Review Granted',
          category: 'Client Consent',
          status: matchedProd.editing_status,
          statusColor: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          staffName: 'Business Owner',
          staffRole: 'Executive Review',
          description: matchedProd.remarks || 'Business Owner conducted final review, verified client consent & payment ledger integrity, and finalized project.',
          proofs
        });
      }
    }

    // 7. Payments History (Advance, Milestone, Final)
    matchedPayments.forEach((p, idx) => {
      const ts = parseDateTime(p.payment_date || p.created_at);
      const amount = Number(p.advance_received || p.final_payment_received || p.amount || 0);
      const proofs: any[] = [];

      if (p.receipt_url || p.payment_proof) {
        const pProof = p.receipt_url || p.payment_proof;
        const resolved = resolveStorageUrl(pProof);
        if (resolved) {
          proofs.push({
            id: `pay_proof_${p.payment_id || idx}`,
            label: `Payment Receipt (${p.payment_type || 'Payment'})`,
            url: resolved,
            type: categorizeUrl(resolved)
          });
        }
      }

      list.push({
        id: `pay_${p.payment_id || idx}`,
        timestamp: ts.iso,
        formattedDate: ts.date,
        formattedTime: ts.time,
        activity: `Payment Received: ₹${amount.toLocaleString('en-IN')}`,
        category: 'Payment',
        status: p.payment_status || 'Received',
        statusColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        staffName: p.collected_by || 'Accounts Desk',
        staffRole: 'Financial Team',
        description: `Payment Type: ${p.payment_type || p.Payment_type || 'Installment'} | Mode: ${p.payment_mode || 'Online/Bank'} | Txn ID: ${p.transaction_id || 'N/A'}`,
        proofs
      });
    });

    // Deduplicate by ID and sort chronologically
    const uniqueMap = new Map<string, HistoryTimelineItem>();
    list.forEach(item => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    const result = Array.from(uniqueMap.values());
    result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [
    isOpen,
    matchedOrder, 
    matchedLead, 
    matchedProd, 
    matchedOps, 
    matchedAssignments, 
    matchedPayments, 
    matchedStatusHistory, 
    matchedLogs, 
    sortOrder,
    targetOrderId
  ]);

  // Filtered list based on Search & Category
  const filteredHistory = useMemo(() => {
    return historyItems.filter(item => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      return (
        item.activity.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.staffName.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.formattedDate.toLowerCase().includes(query)
      );
    });
  }, [historyItems, selectedCategory, searchTerm]);

  if (!isOpen || !order) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="order_history_modal_card"
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-4 sm:p-6 pb-4 border-b border-zinc-800 bg-zinc-900/70 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <History className="w-3 h-3" />
                PROJECT TIMELINE & AUDIT LOGS
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                Order ID: {matchedOrder?.order_id || targetOrderId}
              </span>
              {targetLeadId && (
                <span className="text-[10px] font-mono text-zinc-500">
                  (Lead: {targetLeadId})
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>Order History / Project History</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Customer: <strong className="text-zinc-200">{matchedOrder?.customer_name || matchedLead?.customer_name || 'Client'}</strong> • Event: <strong className="text-purple-300">{matchedLead?.event_name || matchedOrder?.event_name || 'Event Coverage'}</strong> • Stage: <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono font-bold text-[10px]">{matchedOrder?.current_stage || matchedProd?.editing_status || 'Active'}</span>
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

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 bg-zinc-900/40 border-b border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
            {['All', 'Sales', 'Operations', 'Production', 'Client Consent', 'Payment'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search activity, staff, status..."
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
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Timeline & Table Content */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/30 border border-zinc-850 border-dashed rounded-2xl space-y-2">
              <History className="w-10 h-10 text-zinc-700 mx-auto" />
              <p className="text-zinc-400 font-medium text-sm">No historical records found for this filter.</p>
              <p className="text-zinc-600 text-xs font-mono">Try switching the category filter or clearing the search box.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3.5 sm:p-4 transition-all space-y-3"
                >
                  {/* Top Bar: Date, Activity, Category & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 text-xs font-mono font-bold">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>{item.formattedDate}</span>
                        {item.formattedTime && item.formattedTime !== 'N/A' && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-400">{item.formattedTime}</span>
                          </>
                        )}
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-950 text-zinc-400 border border-zinc-800">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-xs text-zinc-400 font-mono">
                        By: <strong className="text-zinc-200">{item.staffName}</strong> {item.staffRole && <span className="text-zinc-500 text-[10px]">({item.staffRole})</span>}
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border ${item.statusColor}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle Bar: Activity Headline & Description */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-blue-400">⚡</span>
                      <span>{item.activity}</span>
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {item.description}
                    </p>
                  </div>

                  {/* Proofs / Images / Documents section (ALL PROOFS SHOWN) */}
                  {item.proofs && item.proofs.length > 0 && (
                    <div className="pt-2 border-t border-zinc-850/80 space-y-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Attached Proofs & Documentation ({item.proofs.length})</span>
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {item.proofs.map((proof) => {
                          if (proof.type === 'image') {
                            return (
                              <div 
                                key={proof.id}
                                className="bg-zinc-950 border border-emerald-500/25 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-emerald-500/50 transition-all"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-bold text-zinc-200 block truncate" title={proof.label}>
                                    {proof.label}
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-mono block">Image Attachment</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({
                                    url: proof.url,
                                    title: `${proof.label} - ${item.activity}`
                                  })}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Image</span>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={proof.id}
                              className="bg-zinc-950 border border-blue-500/25 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-blue-500/50 transition-all"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-zinc-200 block truncate" title={proof.label}>
                                  {proof.label}
                                </span>
                                <span className="text-[10px] text-blue-400 font-mono block truncate">File / Link</span>
                              </div>

                              <a
                                href={proof.url.startsWith('http') ? proof.url : `https://${proof.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                referrerPolicy="no-referrer"
                                className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open Link</span>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-zinc-500 font-mono text-center sm:text-left">
            Showing <strong className="text-zinc-300">{filteredHistory.length}</strong> recorded activities for this project.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Close History
          </button>
        </div>

      </div>

      {/* Responsive Full Image Zoom Viewer Modal */}
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
