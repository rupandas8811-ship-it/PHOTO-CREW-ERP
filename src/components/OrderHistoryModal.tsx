import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  History, Calendar, Clock, User, CheckCircle2, CheckCircle, DollarSign, 
  Film, FileText, ExternalLink, Eye, X, Search, Filter, ArrowDownUp, 
  ShieldCheck, Image as ImageIcon, Link as LinkIcon, AlertCircle, Play, 
  Send, RefreshCw, ChevronRight, Layers, FileVideo, Download,
  ChevronDown, CreditCard, Receipt, Wallet, Landmark, Phone, Building, Tag
} from 'lucide-react';
import { useRole } from './RoleContext';
import { formatINR, resolveStorageUrl, parseCustomerProof, formatDateDDMMYY, formatTime12Hour } from '../utils';

export interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any; // Order object or row from summary
  initialTab?: 'timeline' | 'payment_details';
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
  order,
  initialTab = 'timeline'
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

  // Tab State: 'timeline' (Project Timeline & Audit Logs) or 'payment_details' (Payment Details History)
  const [activeTab, setActiveTab] = useState<'timeline' | 'payment_details'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !(prev[section] ?? true) }));
  };
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
      (targetLeadId && p.lead_id === targetLeadId) ||
      (matchedOrder?.lead_id && p.lead_id === matchedOrder.lead_id) ||
      (matchedLead?.lead_id && p.lead_id === matchedLead.lead_id)
    );
  }, [payments, targetOrderId, targetLeadId, matchedOrder, matchedLead]);

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
      date: formatDateDDMMYY(d),
      time: formatTime12Hour(d)
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

  // Compute Comprehensive Payment Summary for this Customer/Order
  const paymentSummary = useMemo(() => {
    const quotationAmount = Number(
      matchedOrder?.quotation_amount || 
      matchedLead?.Final_Package_Amount || 
      matchedLead?.budget || 
      matchedPayments[0]?.quotation_amount || 
      order?.totalRevenue || 
      order?.quotation_amount || 
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

    // Build synthesized list of payment entries if raw payments table is empty but payment was recorded
    const entries: any[] = [];
    if (matchedPayments.length > 0) {
      matchedPayments.forEach((p, idx) => {
        const rawAmt = Number(p.advance_received || 0) + Number(p.final_payment_received || 0) + Number((p as any).additional_received || (p as any).amount || 0);
        const pDate = p.payment_date || (p as any).created_at || matchedOrder?.event_date || matchedOrder?.created_at;
        const pType = p.payment_type || (p as any).Payment_type || (idx === 0 ? 'Advance Downpayment' : 'Final Settlement');
        const pMode = (p as any).payment_mode || (p as any).mode || (p.transaction_id ? 'UPI / Online' : 'Direct / Bank');
        const proof = p.payment_proof_url || (p as any).receipt_url || (p as any).payment_proof || (p as any).proof_url;
        
        entries.push({
          id: p.payment_id || `pay_${idx + 1}`,
          payment_id: p.payment_id || `PAY-${1000 + idx}`,
          order_id: p.order_id || targetOrderId,
          lead_id: p.lead_id || targetLeadId || matchedOrder?.lead_id || '-',
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
      // Fallback constructed transaction entry from order master
      if (advanceReceived > 0) {
        entries.push({
          id: `pay_adv_${targetOrderId}`,
          payment_id: `ADV-${targetOrderId.replace('ORD-', '') || '01'}`,
          order_id: targetOrderId,
          lead_id: targetLeadId || matchedOrder?.lead_id || '-',
          date: matchedOrder?.created_at || matchedLead?.created_at || 'Registered Date',
          type: 'Advance Downpayment',
          mode: matchedOrder?.payment_mode || 'UPI / Bank Transfer',
          amount: advanceReceived,
          balance_due: Math.max(0, quotationAmount - advanceReceived),
          transaction_id: (matchedOrder as any)?.transaction_id || 'N/A',
          payment_status: advanceReceived >= quotationAmount ? 'Fully Paid' : 'Partially Paid',
          collection_status: 'Cleared',
          proof_url: null,
          collected_by: matchedOrder?.sales_executive || matchedLead?.assigned_sales_agent || 'Sales Team',
          remarks: 'Initial advance booking downpayment'
        });
      }
      if (finalReceived > 0) {
        entries.push({
          id: `pay_fin_${targetOrderId}`,
          payment_id: `FIN-${targetOrderId.replace('ORD-', '') || '01'}`,
          order_id: targetOrderId,
          lead_id: targetLeadId || matchedOrder?.lead_id || '-',
          date: (matchedOrder as any)?.final_payment_date || matchedOrder?.updated_at || 'Final Date',
          type: 'Final Payment Settlement',
          mode: (matchedOrder as any)?.final_payment_mode || 'UPI / Bank Transfer',
          amount: finalReceived,
          balance_due: balanceDue,
          transaction_id: (matchedOrder as any)?.final_transaction_id || 'N/A',
          payment_status: 'Fully Paid',
          collection_status: 'Cleared',
          proof_url: null,
          collected_by: matchedOrder?.sales_executive || 'Accounts Team',
          remarks: 'Final project milestone settlement'
        });
      }
    }

    // Payment-related logs
    const paymentAuditLogs = [
      ...matchedLogs.filter(l => 
        l.module === 'Billings' || 
        l.module === 'Payment' || 
        (l.action && l.action.toLowerCase().includes('payment')) ||
        (l.details && l.details.toLowerCase().includes('payment'))
      ).map(l => ({
        id: `plog_${l.log_id}`,
        timestamp: l.timestamp,
        formattedDate: parseDateTime(l.timestamp).date,
        formattedTime: parseDateTime(l.timestamp).time,
        action: l.action || 'Payment Action',
        userName: l.user_name || 'Accounts Staff',
        role: l.role || 'Finance',
        details: l.details || ''
      })),
      ...matchedStatusHistory.filter(sh => 
        (sh.new_status && sh.new_status.toLowerCase().includes('payment')) ||
        (sh.remarks && sh.remarks.toLowerCase().includes('payment'))
      ).map((sh, idx) => ({
        id: `psh_${sh.id || idx}`,
        timestamp: sh.created_at || sh.timestamp,
        formattedDate: parseDateTime(sh.created_at || sh.timestamp).date,
        formattedTime: parseDateTime(sh.created_at || sh.timestamp).time,
        action: `Status: ${sh.new_status}`,
        userName: sh.changed_by || 'Staff',
        role: sh.changed_by_role || 'Staff',
        details: sh.remarks || `Status transitioned to ${sh.new_status}`
      }))
    ];

    return {
      quotationAmount,
      advanceReceived,
      finalReceived,
      additionalReceived,
      totalPaid,
      balanceDue,
      paymentStatus,
      percentPaid,
      entries,
      paymentAuditLogs
    };
  }, [
    matchedOrder, 
    matchedLead, 
    matchedPayments, 
    order, 
    targetOrderId, 
    targetLeadId, 
    matchedLogs, 
    matchedStatusHistory
  ]);

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
        description: `Customer ${matchedOrder?.customer_name || matchedLead?.customer_name || 'Client'} confirmed project order for Rs. ${Number(matchedOrder?.total_amount || matchedLead?.quotation_amount || 0).toLocaleString('en-IN')}.`,
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
      const ts = parseDateTime(p.payment_date || (p as any).created_at);
      const amount = Number(p.advance_received || p.final_payment_received || (p as any).amount || 0);
      const proofs: any[] = [];

      if (p.payment_proof_url || (p as any).receipt_url || (p as any).payment_proof) {
        const pProof = p.payment_proof_url || (p as any).receipt_url || (p as any).payment_proof;
        const resolved = resolveStorageUrl(pProof);
        if (resolved) {
          proofs.push({
            id: `pay_proof_${p.payment_id || idx}`,
            label: `Payment Receipt (${p.payment_type || (p as any).Payment_type || 'Payment'})`,
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
        activity: `Payment Received: Rs. ${amount.toLocaleString('en-IN')}`,
        category: 'Payment',
        status: p.payment_status || 'Received',
        statusColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        staffName: (p as any).collected_by || 'Accounts Desk',
        staffRole: 'Financial Team',
        description: `Payment Type: ${p.payment_type || (p as any).Payment_type || 'Installment'} | Mode: ${(p as any).payment_mode || 'Online/Bank'} | Txn ID: ${p.transaction_id || 'N/A'}`,
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

  // Filtered list based on Search for Timeline
  const filteredHistory = useMemo(() => {
    return historyItems.filter(item => {
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
  }, [historyItems, searchTerm]);

  // Filtered payment entries for Payment Details History
  const filteredPaymentEntries = useMemo(() => {
    return paymentSummary.entries.filter(entry => {
      if (!paymentSearchTerm.trim()) return true;
      const q = paymentSearchTerm.toLowerCase();
      return (
        String(entry.payment_id || '').toLowerCase().includes(q) ||
        String(entry.type || '').toLowerCase().includes(q) ||
        String(entry.mode || '').toLowerCase().includes(q) ||
        String(entry.transaction_id || '').toLowerCase().includes(q) ||
        String(entry.payment_status || '').toLowerCase().includes(q) ||
        String(entry.collected_by || '').toLowerCase().includes(q) ||
        String(entry.date || '').toLowerCase().includes(q)
      );
    });
  }, [paymentSummary.entries, paymentSearchTerm]);

  const CATEGORY_ORDER = ['Sales', 'Operations', 'Production', 'Client Consent', 'Payment', 'Other'];

  const groupedHistory = useMemo(() => {
    const groups: Record<string, typeof filteredHistory> = {};
    filteredHistory.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredHistory]);

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
        
        {/* Header with Project Metadata & Tabs */}
        <div className="p-4 sm:p-6 pb-3 border-b border-zinc-800 bg-zinc-900/70 flex flex-col gap-3 shrink-0">
          <div className="flex items-start justify-between gap-4">
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
                Customer: <strong className="text-zinc-200">{matchedOrder?.customer_name || matchedLead?.customer_name || order?.customerName || 'Client'}</strong> * Event: <strong className="text-purple-300">{matchedLead?.event_name || matchedOrder?.event_name || order?.eventName || 'Event Coverage'}</strong> * Stage: <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono font-bold text-[10px]">{matchedOrder?.current_stage || matchedProd?.editing_status || order?.currentStage || 'Active'}</span>
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

          {/* Section / Option Switcher: Timeline vs Payment Details History */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 overflow-x-auto pb-1">
            <button
              type="button"
              id="tab_history_timeline"
              onClick={() => setActiveTab('timeline')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'timeline'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-500'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Project Timeline & Activities</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'timeline' ? 'bg-blue-800/80 text-blue-100' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {historyItems.length}
              </span>
            </button>

            <button
              type="button"
              id="tab_history_payment_details"
              onClick={() => setActiveTab('payment_details')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'payment_details'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-500'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
              <span>Payment Details History</span>
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
        {/* VIEW 1: PAYMENT DETAILS HISTORY (NEW DEDICATED SECTION) */}
        {/* ========================================================================= */}
        {activeTab === 'payment_details' ? (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
            
            {/* Customer & Business Profile Card */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">
                      Customer Payment Ledger
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Ref: {targetOrderId}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-400" />
                    <span>{matchedOrder?.customer_name || matchedLead?.customer_name || order?.customerName || 'Customer'}</span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                    <span>Event: <strong className="text-zinc-200">{matchedLead?.event_name || matchedOrder?.event_name || order?.eventName || 'Event Coverage'}</strong></span>
                    <span>*</span>
                    <span>Date: <strong className="text-zinc-300 font-mono">{matchedLead?.event_date || matchedOrder?.event_date || order?.eventDate || 'Scheduled'}</strong></span>
                    {matchedLead?.contact_number && (
                      <>
                        <span>*</span>
                        <span className="flex items-center gap-1 font-mono text-zinc-300">
                          <Phone className="w-3 h-3 text-zinc-500" />
                          {matchedLead.contact_number}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Overall Settlement</div>
                    <div className={`text-sm font-black font-mono ${
                      paymentSummary.paymentStatus === 'Fully Paid'
                        ? 'text-emerald-400'
                        : paymentSummary.paymentStatus === 'Partially Paid'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      {paymentSummary.paymentStatus} ({paymentSummary.percentPaid}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Overview Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Quotation Amount */}
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

              {/* Card 2: Advance Payment Received */}
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

              {/* Card 3: Final / Settlement Payment */}
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

              {/* Card 4: Outstanding Balance Due */}
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

            {/* Total Paid & Progress Bar */}
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

            {/* Complete Payment Transactions Table & Details */}
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
                      placeholder="Search payment type, mode, txn..."
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
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px]">
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
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                                    title="View Payment Receipt Image"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Receipt</span>
                                  </button>
                                  <a
                                    href={p.proof_url.startsWith('http') ? p.proof_url : `https://${p.proof_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    referrerPolicy="no-referrer"
                                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    title="Open link in new tab"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[10px] font-mono text-zinc-600 italic">No proof</span>
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

            {/* Payment Audit Logs & Ledger Trail */}
            {paymentSummary.paymentAuditLogs.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-black font-mono uppercase tracking-wider text-white">
                    Payment Ledger Audit Trail ({paymentSummary.paymentAuditLogs.length})
                  </h4>
                </div>

                <div className="space-y-2">
                  {paymentSummary.paymentAuditLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                          <DollarSign className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-zinc-200">{log.action}</div>
                          {log.details && <div className="text-zinc-400 text-[11px] mt-0.5">{log.details}</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 sm:text-right shrink-0">
                        <div>
                          <span className="text-zinc-300 font-bold">{log.userName}</span> ({log.role})
                        </div>
                        <div className="text-zinc-500">
                          {log.formattedDate} {log.formattedTime}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (

        /* ========================================================================= */
        /* VIEW 2: PROJECT TIMELINE & AUDIT LOGS (EXISTING UNTOUCHED VIEW) */
        /* ========================================================================= */
        <>
          {/* Filter & Search Bar */}
          <div className="p-3 sm:p-4 bg-zinc-900/40 border-b border-zinc-850 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
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
                <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400 font-mono">No matching project activities or audit logs found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {CATEGORY_ORDER.map(cat => {
                  const itemsInCat = groupedHistory[cat] || [];
                  if (itemsInCat.length === 0) return null;
                  const isExpanded = expandedSections[cat] ?? true;

                  return (
                    <div 
                      key={cat} 
                      className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-all"
                    >
                      {/* Category Header Accordion */}
                      <div 
                        onClick={() => toggleSection(cat)}
                        className="p-3 sm:p-4 bg-zinc-900/80 hover:bg-zinc-850/80 border-b border-zinc-800 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`p-1.5 rounded-lg border text-xs font-mono font-bold ${
                            cat === 'Sales' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            cat === 'Operations' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                            cat === 'Production' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                            cat === 'Client Consent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            cat === 'Payment' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                            'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}>
                            {cat === 'Sales' && <Layers className="w-3.5 h-3.5" />}
                            {cat === 'Operations' && <Calendar className="w-3.5 h-3.5" />}
                            {cat === 'Production' && <Film className="w-3.5 h-3.5" />}
                            {cat === 'Client Consent' && <ShieldCheck className="w-3.5 h-3.5" />}
                            {cat === 'Payment' && <DollarSign className="w-3.5 h-3.5" />}
                            {cat === 'Other' && <Clock className="w-3.5 h-3.5" />}
                          </span>
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                              {cat} STAGE TIMELINE
                            </h3>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {itemsInCat.length} recorded events
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {cat === 'Payment' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('payment_details');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>View Payment Details History →</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="p-1 rounded-lg text-zinc-400 hover:text-white"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Items in Category */}
                      {isExpanded && (
                        <div className="divide-y divide-zinc-850 p-2 sm:p-4 space-y-3">
                          {itemsInCat.map(item => (
                            <div 
                              key={item.id} 
                              className="p-3 sm:p-4 rounded-xl bg-zinc-950/60 border border-zinc-850 hover:border-zinc-700 transition-all space-y-3"
                            >
                              {/* Item Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${item.statusColor}`}>
                                    {item.status}
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-bold text-zinc-100">
                                    {item.activity}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 shrink-0">
                                  <span className="flex items-center gap-1 text-zinc-300">
                                    <Clock className="w-3 h-3 text-zinc-500" />
                                    {item.formattedDate} {item.formattedTime}
                                  </span>
                                  <span className="flex items-center gap-1 text-zinc-400">
                                    <User className="w-3 h-3 text-zinc-500" />
                                    {item.staffName} {item.staffRole ? `(${item.staffRole})` : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Description */}
                              {item.description && (
                                <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-850/60">
                                  {item.description}
                                </p>
                              )}

                              {/* Proofs / Images / Documents section (ALL PROOFS SHOWN) */}
                              {item.proofs.length > 0 && (
                                <div className="space-y-2 pt-1">
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
                  );
                })}
              </div>
            )}
          </div>
        </>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-zinc-500 font-mono text-center sm:text-left">
            {activeTab === 'payment_details' ? (
              <span>
                Payment Summary for <strong className="text-zinc-300">{matchedOrder?.customer_name || matchedLead?.customer_name || order?.customerName || 'Client'}</strong>: Total Received <strong className="text-emerald-400">{formatINR(paymentSummary.totalPaid)}</strong> / <strong className="text-zinc-300">{formatINR(paymentSummary.quotationAmount)}</strong>.
              </span>
            ) : (
              <span>
                Showing <strong className="text-zinc-300">{filteredHistory.length}</strong> recorded activities for this project.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === 'payment_details' ? (
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 font-mono"
              >
                <History className="w-3.5 h-3.5" />
                <span>View Full Timeline</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('payment_details')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 font-mono"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Payment Details History</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
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
