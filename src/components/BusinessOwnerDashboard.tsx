import React, { useState, useMemo, useEffect } from 'react';
import { supabaseClient } from '../supabaseClient';
import { useRole } from './RoleContext';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  DollarSign, 
  PackageCheck, 
  Clock, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  FileText, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Eye, 
  ShieldCheck, 
  User, 
  Phone, 
  Tag, 
  MapPin, 
  LayoutDashboard, 
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Printer,
  Ban,
  BarChart3,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { OwnerStaffPerformanceReport } from './OwnerModule';
import { formatINR, formatTime12Hour, deserializeLeadEvents } from '../utils';
import { performBusinessOwnerReview } from '../utils/businessOwnerReview';
import { Order, Lead, Production, Payment } from '../types';

interface BusinessOwnerDashboardProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export const BusinessOwnerDashboard: React.FC<BusinessOwnerDashboardProps> = ({
  activeSection: initialSection = 'overview',
  onSectionChange
}) => {
  const { 
    orders, 
    leads, 
    payments, 
    production, 
    editorAssignments,
    notifications,
    currentUserName, 
    currentRole,
    updateOrderStage, 
    updateProduction, 
    logActivity,
    refreshData,
    globalDateRange,
    setGlobalDateRange
  } = useRole();

  // Internal section tab state if not controlled externally
  const [internalSection, setInternalSection] = useState<'overview' | 'calendar' | 'approval' | 'summary' | 'staff_performance'>('overview');
  
  // Normalize current section ID
  const currentSection = useMemo(() => {
    if (initialSection === 'owner_overview' || initialSection === 'overview') return 'overview';
    if (initialSection === 'owner_calendar' || initialSection === 'calendar') return 'calendar';
    if (initialSection === 'owner_approval' || initialSection === 'approval') return 'approval';
    if (initialSection === 'owner_summary' || initialSection === 'summary') return 'summary';
    if (initialSection === 'owner_staff_performance' || initialSection === 'staff_performance') return 'staff_performance';
    return internalSection;
  }, [initialSection, internalSection]);

  const handleSectionSwitch = (sec: 'overview' | 'calendar' | 'approval' | 'summary' | 'staff_performance') => {
    setInternalSection(sec);
    if (onSectionChange) {
      const mapKey = sec === 'overview' ? 'owner_overview' : sec === 'calendar' ? 'owner_calendar' : sec === 'approval' ? 'owner_approval' : sec === 'summary' ? 'owner_summary' : 'owner_staff_performance';
      onSectionChange(mapKey);
    }
  };

  // Date Filter State
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_month' | 'this_year' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Apply date preset
  const handlePresetChange = (preset: 'all' | 'today' | 'this_month' | 'this_year' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'this_year') {
      const firstDayOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      setStartDate(firstDayOfYear);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(todayStr);
    }
  };

  // Filter orders based on active date range
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const dateToCheck = order.created_at ? order.created_at.split('T')[0] : order.event_date;
      if (datePreset === 'all') return true;
      if (!startDate || !endDate) return true;
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
  }, [orders, startDate, endDate, datePreset]);

  const [unlockRequests, setUnlockRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!supabaseClient) return;

    const fetchUnlockRequests = async () => {
      const { data, error } = await supabaseClient
        .from('unlock_requests')
        .select('*')
        .eq('request_status', 'Pending');
        
      if (!error && data) {
        const normalized = data.map((r: any) => ({
          ...r,
          status: r.request_status || r.status || 'Pending',
          reason: r.request_reason || r.reason || '',
          sales_staff_name: r.requested_by_name || r.sales_staff_name || '',
          sales_staff_id: r.requested_by_user_id || r.sales_staff_id || ''
        }));
        setUnlockRequests(normalized);
      }
    };

    fetchUnlockRequests();

    const channel = supabaseClient
      .channel('rt-unlock_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unlock_requests' }, () => {
        fetchUnlockRequests();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // Orders waiting for approval dataset - Unified across orders, production, and leads
  const waitingApprovalOrders = useMemo(() => {
    const validApprovalStages = [
      'client acceptance',
      'client accepted',
      'customer acceptance',
      'business owner review',
      'final approval',
      'accepted',
      'approved'
    ];

    const isApprovalStage = (st?: string) => {
      if (!st) return false;
      const lower = st.trim().toLowerCase();
      return validApprovalStages.some(s => lower === s || lower.includes('client acceptance'));
    };

    const isClosedStage = (st?: string) => {
      if (!st) return false;
      const lower = st.trim().toLowerCase();
      return lower === 'order closed' || lower === 'closed' || lower === 'project closed' || lower === 'completed' || lower === 'project completed';
    };

    const candidatesMap = new Map<string, Order>();

    const addOrMergeCandidate = (
      baseOrder: Order,
      relatedProd?: Production,
      relatedLead?: Lead,
      relatedPay?: Payment
    ) => {
      const key = baseOrder.order_id || baseOrder.lead_id;
      if (!key) return;

      const currentStage = baseOrder.current_stage || relatedProd?.editing_status || relatedProd?.production_status || 'Client Acceptance';

      if (isClosedStage(currentStage) || isClosedStage(relatedProd?.editing_status) || isClosedStage(baseOrder.order_status)) {
        return;
      }

      const orderMatch = isApprovalStage(baseOrder.current_stage) || isApprovalStage(baseOrder.order_status);
      const prodMatch = relatedProd && (
        isApprovalStage(relatedProd.editing_status) ||
        isApprovalStage(relatedProd.production_status) ||
        isApprovalStage(relatedProd.customer_review_status)
      );

      if (orderMatch || prodMatch) {
        const totalQuotation = baseOrder.quotation_amount || (relatedLead as any)?.quotation_amount || (relatedLead as any)?.total_quotation_amount || 0;
        const advanceRec = baseOrder.advance_received || relatedPay?.advance_received || (relatedLead as any)?.advance_received || 0;
        const finalRec = relatedPay?.final_payment_received || 0;
        const totalRec = advanceRec + finalRec;
        const balDue = relatedPay ? relatedPay.balance_due : (baseOrder.balance_amount || Math.max(0, totalQuotation - totalRec));

        const pAny = relatedProd as any;
        const lAny = relatedLead as any;
        const payAny = relatedPay as any;
        const bAny = baseOrder as any;

        const fullOrder: Order = {
          ...baseOrder,
          order_id: baseOrder.order_id || pAny?.order_id || pAny?.tracking_id || key,
          lead_id: baseOrder.lead_id || pAny?.lead_id || lAny?.lead_id || key,
          customer_name: baseOrder.customer_name || lAny?.customer_name || pAny?.customer_name || 'Client',
          mobile: bAny?.customer_phone || bAny?.mobile || lAny?.phone || lAny?.mobile || payAny?.customer_phone || '',
          custom_event_name: baseOrder.custom_event_name || baseOrder.event_type || lAny?.event_name || lAny?.event_type || 'Event',
          event_type: baseOrder.event_type || lAny?.event_type || 'Photography & Videography',
          event_date: baseOrder.event_date || pAny?.event_date || lAny?.event_date || '',
          current_stage: isApprovalStage(relatedProd?.editing_status) ? 'Client Acceptance' : (baseOrder.current_stage || 'Client Acceptance'),
          quotation_amount: totalQuotation,
          advance_received: advanceRec,
          balance_amount: balDue,
          created_at: baseOrder.created_at || pAny?.created_at || lAny?.created_at || new Date().toISOString()
        };

        candidatesMap.set(key, fullOrder);
      }
    };

    // 1. Evaluate existing orders
    (orders || []).forEach(order => {
      const prod = (production || []).find(p => 
        p.tracking_id === order.lead_id || 
        (p as any).order_id === order.lead_id || 
        p.tracking_id === order.order_id ||
        (p as any).order_id === order.order_id ||
        p.production_id === order.order_id ||
        (p as any).lead_id === order.lead_id ||
        p.production_id === `PRD-${order.lead_id}` ||
        p.production_id === `PRD-${order.order_id}`
      );
      const lead = (leads || []).find(l => l.lead_id === order.lead_id || l.lead_id === order.order_id);
      const pay = (payments || []).find(p => p.order_id === order.order_id || p.lead_id === order.lead_id);
      addOrMergeCandidate(order, prod, lead, pay);
    });

    // 2. Evaluate production records that might not be in orders array
    (production || []).forEach(prod => {
      const pAny = prod as any;
      if (isApprovalStage(prod.editing_status) || isApprovalStage(prod.production_status) || isApprovalStage(prod.customer_review_status)) {
        if (isClosedStage(prod.editing_status) || isClosedStage(prod.production_status)) return;

        const existingKey = Array.from(candidatesMap.keys()).find(k => 
          k === pAny.order_id || k === prod.tracking_id || k === pAny.lead_id || k === prod.production_id
        );

        if (!existingKey) {
          const matchingOrder = (orders || []).find(o => 
            o.order_id === pAny.order_id || o.order_id === prod.tracking_id || o.lead_id === pAny.lead_id || o.lead_id === prod.tracking_id
          );
          const lead = (leads || []).find(l => l.lead_id === pAny.lead_id || l.lead_id === prod.tracking_id || l.lead_id === pAny.order_id);
          const pay = (payments || []).find(p => p.order_id === pAny.order_id || p.tracking_id === prod.tracking_id || p.lead_id === pAny.lead_id);
          const lAny = lead as any;

          const baseOrder: Order = matchingOrder || {
            order_id: pAny.order_id || prod.tracking_id || prod.production_id,
            lead_id: pAny.lead_id || prod.tracking_id || pAny.order_id,
            customer_name: pAny.customer_name || lAny?.customer_name || 'Client',
            customer_phone: pAny.customer_mobile || lAny?.phone || lAny?.mobile || '',
            custom_event_name: lAny?.event_name || lAny?.event_type || 'Photography & Videography',
            event_type: lAny?.event_type || 'Photography & Videography',
            event_date: pAny.event_date || lAny?.event_date || '',
            current_stage: 'Client Acceptance',
            order_status: 'Client Acceptance',
            quotation_amount: lAny?.quotation_amount || 0,
            advance_received: lAny?.advance_received || 0,
            balance_amount: lAny?.balance_amount || 0,
            created_at: pAny.created_at || lAny?.created_at || new Date().toISOString()
          };

          addOrMergeCandidate(baseOrder, prod, lead, pay);
        }
      }
    });

    return Array.from(candidatesMap.values());
  }, [orders, production, leads, payments]);

  // KPI Metrics Calculation for Overview
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.quotation_amount || o.advance_received || 0), 0);
  }, [filteredOrders]);

  const activeOrdersCount = useMemo(() => {
    return filteredOrders.filter(o => o.current_stage !== 'Order Closed' && o.current_stage !== 'Closed' && o.current_stage !== 'Event Cancelled').length;
  }, [filteredOrders]);

  const outstandingPaymentTotal = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const pay = payments.find(p => p.order_id === o.order_id || p.lead_id === o.lead_id);
      if (pay) return sum + (pay.balance_due || 0);
      return sum + (o.balance_amount || 0);
    }, 0);
  }, [filteredOrders, payments]);

  // Review & Close Modal State
  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);
  const [approvalFeedback, setApprovalFeedback] = useState<string | null>(null);

  // Calendar Event Selection Modal State
  const [calendarEventModal, setCalendarEventModal] = useState<any | null>(null);
  
  // Quotation Unlock Request Modal State
  const [unlockRequestModal, setUnlockRequestModal] = useState<any | null>(null);
  
  const handleApproveUnlock = async (request: any) => {
    try {
      console.log("[DEBUG handleApproveUnlock] Step 1: Read unlock request:", request);
      if (!request) {
        throw new Error("No unlock request selected.");
      }

      const targetLeadId = request.lead_id || request.order_id;
      const targetOrderId = request.order_id || request.lead_id;

      // Find order or lead in props
      let order = (orders || []).find(o => o.order_id === targetOrderId || o.lead_id === targetLeadId || o.order_id === targetLeadId);
      let lead = (leads || []).find(l => l.lead_id === targetLeadId || l.lead_id === targetOrderId);

      // If not in memory props, fetch directly from Supabase
      if (!order && !lead && supabaseClient) {
        if (targetLeadId) {
          const { data: dbLeads, error: leadFetchErr } = await supabaseClient
            .from('leads')
            .select('*')
            .or(`lead_id.eq.${targetLeadId}`);
          if (leadFetchErr) console.warn("[DEBUG handleApproveUnlock] Lead fetch warning:", leadFetchErr.message);
          if (dbLeads && dbLeads.length > 0) {
            lead = dbLeads[0];
          }
        }

        if (targetOrderId) {
          const { data: dbOrders, error: orderFetchErr } = await supabaseClient
            .from('orders')
            .select('*')
            .or(`order_id.eq.${targetOrderId}`);
          if (orderFetchErr) console.warn("[DEBUG handleApproveUnlock] Order fetch warning:", orderFetchErr.message);
          if (dbOrders && dbOrders.length > 0) {
            order = dbOrders[0];
          }
        }
      }

      const effectiveLeadId = lead?.lead_id || order?.lead_id || targetLeadId;
      const effectiveOrderId = order?.order_id || targetOrderId;

      console.log("[DEBUG handleApproveUnlock] Step 2: Find lead/order:", { effectiveLeadId, effectiveOrderId, lead, order });

      if (!effectiveLeadId && !effectiveOrderId) {
        throw new Error("Target Lead or Order record could not be found.");
      }

      // 1. Update unlock_requests status to Approved
      console.log("[DEBUG handleApproveUnlock] Step 3: Update unlock_requests status to Approved");
      if (supabaseClient) {
        let reqQuery = supabaseClient.from('unlock_requests').update({ 
           request_status: 'Approved',
           status: 'Approved',
           approved_at: new Date().toISOString(),
           approved_by: currentUserName || 'Business Owner'
        });

        if (request.request_id) {
          reqQuery = reqQuery.eq('request_id', request.request_id);
        } else if ((request as any).id) {
          reqQuery = reqQuery.eq('id', (request as any).id);
        } else if (effectiveOrderId && effectiveLeadId) {
          reqQuery = reqQuery.or(`order_id.eq.${effectiveOrderId},lead_id.eq.${effectiveLeadId}`);
        } else if (effectiveLeadId) {
          reqQuery = reqQuery.eq('lead_id', effectiveLeadId);
        } else if (effectiveOrderId) {
          reqQuery = reqQuery.eq('order_id', effectiveOrderId);
        }

        const { error: updErr } = await reqQuery;

        if (updErr) {
          console.error("[DEBUG handleApproveUnlock] unlock_requests update error:", updErr);
          throw new Error(`Failed to update unlock request status: ${updErr.message}`);
        }

        // 2. Update lead in Supabase: set quotation_locked = false
        if (effectiveLeadId) {
          const { error: leadErr } = await supabaseClient
            .from('leads')
            .update({ quotation_locked: false, updated_at: new Date().toISOString() })
            .eq('lead_id', effectiveLeadId);
          if (leadErr) {
            console.warn("[DEBUG handleApproveUnlock] leads table quotation_locked=false update warning:", leadErr.message);
          } else {
            console.log("[DEBUG handleApproveUnlock] Successfully updated lead quotation_locked = false for", effectiveLeadId);
          }
        }
      }

      // 4. Log activity
      if (typeof logActivity === 'function') {
        try {
          logActivity(
            'Approved Quotation Unlock',
            'Business Owner',
            effectiveOrderId || effectiveLeadId || 'N/A',
            `Approved unlock for Lead ${effectiveLeadId} / Order ${effectiveOrderId}`
          );
        } catch (logErr: any) {
          console.warn("[DEBUG handleApproveUnlock] logActivity warning:", logErr?.message || logErr);
        }
      }

      // 5. Send notification to Sales Staff
      console.log("[DEBUG handleApproveUnlock] Step 5: Send notification to Sales Staff");
      if (supabaseClient) {
        const { error: ntfErr } = await supabaseClient.from('notifications').insert({
          notification_id: `NTF-${Math.floor(Math.random() * 100000)}`,
          title: "Quotation Unlocked",
          message: `Your request to unlock quotation for ${request.customer_name || 'lead'} (${effectiveLeadId}) has been approved.`,
          notification_type: 'Alert',
          read_status: false,
          is_read: false,
          recipient_role: 'Sales Team',
          recipient_user_id: request.sales_staff_id || request.requested_by_user_id || null,
          project_id: effectiveOrderId || effectiveLeadId
        });

        if (ntfErr) {
          console.warn("[DEBUG handleApproveUnlock] notification insert warning:", ntfErr.message);
        }
      }

      // 6. Refresh UI
      console.log("[DEBUG handleApproveUnlock] Step 6: Refresh UI");
      setUnlockRequests(prev => Array.isArray(prev) ? prev.filter(r => r.request_id !== request.request_id && r.order_id !== effectiveOrderId && r.lead_id !== effectiveLeadId) : []);
      setUnlockRequestModal(null);
      alert("Quotation has been successfully unlocked.");
    } catch (err: any) {
      console.error("[DEBUG handleApproveUnlock ERROR]:", err);
      if (err && err.stack) {
        console.error("Stack trace:", err.stack);
      }
      alert(err.message || String(err) || "Failed to approve unlock");
    }
  };

  const handleRejectUnlock = async (request: any) => {
    try {
      if (!request) return;
      const targetLeadId = request.lead_id || request.order_id;
      const targetOrderId = request.order_id || request.lead_id;

      if (supabaseClient) {
        let reqQuery = supabaseClient.from('unlock_requests').update({ 
          request_status: 'Rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: currentUserName || 'Business Owner'
        });

        if (request.request_id) {
          reqQuery = reqQuery.eq('request_id', request.request_id);
        } else if (targetOrderId && targetLeadId) {
          reqQuery = reqQuery.or(`order_id.eq.${targetOrderId},lead_id.eq.${targetLeadId}`);
        } else if (targetLeadId) {
          reqQuery = reqQuery.eq('lead_id', targetLeadId);
        } else if (targetOrderId) {
          reqQuery = reqQuery.eq('order_id', targetOrderId);
        }

        const { error: updErr } = await reqQuery;
        if (updErr) throw new Error(`Supabase error rejecting unlock request: ${updErr.message}`);
      }
        
      if (typeof logActivity === 'function') {
        try {
          logActivity(
            'Rejected Quotation Unlock',
            'Business Owner',
            targetOrderId || targetLeadId || 'N/A',
            `Rejected unlock for Lead ${targetLeadId} / Order ${targetOrderId}`
          );
        } catch (logErr: any) {
          console.warn("logActivity warning:", logErr?.message || logErr);
        }
      }
      
      // Notify Sales Staff
      if (supabaseClient) {
        await supabaseClient.from('notifications').insert({
          notification_id: `NTF-${Math.floor(Math.random() * 100000)}`,
          title: "Quotation Unlock Rejected",
          message: `Your request to unlock quotation for ${request.customer_name || 'lead'} (${targetLeadId}) was rejected.`,
          notification_type: 'Alert',
          read_status: false,
          is_read: false,
          recipient_role: 'Sales Team',
          recipient_user_id: request.sales_staff_id || request.requested_by_user_id || null,
          project_id: targetOrderId || targetLeadId
        });
      }

      setUnlockRequests(prev => prev.filter(r => r.request_id !== request.request_id && r.order_id !== targetOrderId && r.lead_id !== targetLeadId));
      setUnlockRequestModal(null);
      alert("Quotation unlock request has been rejected.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to reject unlock");
    }
  };

  // Handle Approve & Close Order Action
  const handleApproveAndCloseOrder = async (order: Order) => {
    if (currentRole !== 'Business Owner') {
      alert("Only the Business Owner role can close orders.");
      return;
    }

    try {
      const lead = leads.find(l => l.lead_id === order.lead_id || l.lead_id === order.order_id);
      const prod = production.find(p => 
        p.tracking_id === order.lead_id || 
        p.order_id === order.lead_id || 
        p.tracking_id === order.order_id ||
        p.order_id === order.order_id ||
        p.production_id === order.order_id ||
        p.production_id === order.lead_id ||
        p.lead_id === order.lead_id ||
        p.production_id === `PRD-${order.lead_id}` ||
        p.production_id === `PRD-${order.order_id}`
      );

      const targetProdId = prod ? prod.production_id : (`PRD-${order.lead_id || order.order_id}`);

      // 1. Call context update function
      if (updateOrderStage) {
        await updateOrderStage(order.order_id, 'Order Closed');
      }

      if (updateProduction) {
        await updateProduction(targetProdId, {
          editing_status: 'Order Closed',
          production_status: 'Order Closed',
          current_status: 'Order Closed',
          remarks: `Final Approval granted & Order Closed by Business Owner (${currentUserName || 'Business Owner'}) on ${new Date().toLocaleString('en-IN')}`
        } as any);
      }

      // 2. Direct Supabase update to ensure database persistence
      if (supabaseClient) {
        const timestamp = new Date().toISOString();
        const userName = currentUserName || 'Business Owner';

        const { error: errOrd } = await supabaseClient
          .from('orders')
          .update({ current_stage: 'Order Closed', updated_by: userName, updated_at: timestamp })
          .or(`order_id.eq.${order.order_id},lead_id.eq.${order.lead_id || order.order_id}`);
        if (errOrd) throw new Error("Orders update error: " + errOrd.message);

        const { error: errLead } = await supabaseClient
          .from('leads')
          .update({ status: 'Order Closed', current_status: 'Order Closed', updated_by: userName, updated_at: timestamp })
          .or(`lead_id.eq.${order.lead_id || order.order_id},lead_id.eq.${order.order_id}`);
        if (errLead) throw new Error("Leads update error: " + errLead.message);

        const { error: errProd } = await supabaseClient
          .from('production')
          .update({ editing_status: 'Order Closed', production_status: 'Order Closed', current_status: 'Order Closed' })
          .or(`production_id.eq.${targetProdId},order_id.eq.${order.order_id},lead_id.eq.${order.lead_id || order.order_id},tracking_id.eq.${order.lead_id || order.order_id}`);
        if (errProd) console.warn("[handleApproveAndCloseOrder] production update warning:", errProd);

        await supabaseClient
          .from('editor_assignments')
          .update({ status: 'Order Closed' })
          .or(`production_id.eq.${targetProdId},order_id.eq.${order.order_id}`);
      }

      if (logActivity) {
        logActivity(
          `Order ${order.order_id} approved & closed by Business Owner (${currentUserName || 'Business Owner'}). Status updated to Order Closed.`,
          'Business Owner',
          order.order_id,
          'Business Owner Review',
          'Order Closed'
        );
      }

      if (refreshData) {
        await refreshData();
      }

      setApprovalFeedback(`Order ${order.order_id} (${order.customer_name}) has been successfully approved and closed.`);
      setReviewModalOrder(null);
      setCalendarEventModal(null);
      setTimeout(() => setApprovalFeedback(null), 5000);
    } catch (err: any) {
      console.error("[handleApproveAndCloseOrder] Error approving order:", err);
      alert("Failed to close order: " + (err?.message || "Database update failed"));
    }
  };

  // Handle Reject Back to Production
  const handleRejectBackToProduction = async (order: Order) => {
    const prod = production.find(p => p.tracking_id === order.lead_id || p.order_id === order.lead_id || p.tracking_id === order.order_id || p.order_id === order.order_id);
    
    if (updateOrderStage) {
      await updateOrderStage(order.order_id, 'Production' as any);
    }
    
    if (prod && updateProduction) {
      await updateProduction(prod.production_id, {
        editing_status: 'Assigned Editor' as any,
        production_status: 'In Progress' as any,
        remarks: `Rejected back to Production by Business Owner (${currentUserName || 'Business Owner'}) on ${new Date().toLocaleString('en-IN')}`
      });
      
      if (supabaseClient) {
        await supabaseClient
          .from('editor_assignments')
          .update({ status: 'Assigned' })
          .eq('production_id', prod.production_id);
      }
    }

    if (logActivity) {
      logActivity(
        `Order ${order.order_id} rejected and sent back to production by Business Owner.`,
        'Business Owner',
        order.order_id,
        'Business Owner Review',
        'Production'
      );
    }

    setApprovalFeedback(`Order ${order.order_id} has been rejected back to production.`);
    setReviewModalOrder(null);
    setCalendarEventModal(null);
    setTimeout(() => setApprovalFeedback(null), 5000);
  };

  return (
    <div className="space-y-6 text-zinc-100 font-sans pb-12">
      
      {/* Header Banner & Navigation Tabs */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                Executive Command
              </span>
              <span className="text-xs text-zinc-500 font-mono">Business Owner Desk</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Business Owner Dashboard
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Monitor overall performance, approve completed projects, and track business metrics.
            </p>
          </div>

          {/* Toast / Notification Banner */}
          {approvalFeedback && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{approvalFeedback}</span>
            </div>
          )}
        </div>

        {/* 5 Main Dashboard Section Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-5 gap-2 mt-5 pt-4 border-t border-zinc-850">
          <button
            onClick={() => handleSectionSwitch('overview')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              currentSection === 'overview'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/5'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-amber-400" />
            <span className="truncate">1. Business Overview</span>
          </button>

          <button
            onClick={() => handleSectionSwitch('calendar')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              currentSection === 'calendar'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/5'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-purple-400" />
            <span className="truncate">2. Event Calendar</span>
          </button>

          <button
            onClick={() => handleSectionSwitch('approval')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              currentSection === 'approval'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/5'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="truncate">3. Waiting Approval</span>
            {waitingApprovalOrders.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono">
                {waitingApprovalOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleSectionSwitch('summary')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              currentSection === 'summary'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/5'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="truncate">4. Revenue Summary</span>
          </button>
          
          <button
            onClick={() => handleSectionSwitch('staff_performance')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              currentSection === 'staff_performance'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/5'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-pink-400" />
            <span className="truncate">5. Staff Performance</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: BUSINESS OVERVIEW */}
      {currentSection === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Section Header & Date Filter */}
          <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                <span>SECTION 1: BUSINESS OVERVIEW</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Key Performance Indicators across revenue, active projects, and pending approvals.
              </p>
            </div>

            {/* Date Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
                <button
                  onClick={() => handlePresetChange('this_month')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${datePreset === 'this_month' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  This Month
                </button>
                <button
                  onClick={() => handlePresetChange('this_year')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${datePreset === 'this_year' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  This Year
                </button>
                <button
                  onClick={() => handlePresetChange('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${datePreset === 'all' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setDatePreset('custom')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${datePreset === 'custom' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Custom
                </button>
              </div>

              {datePreset === 'custom' && (
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-200 text-xs"
                  />
                  <span className="text-zinc-600">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-200 text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Total Revenue */}
            <div className="bg-gradient-to-b from-emerald-950/20 to-zinc-950 border border-emerald-500/20 rounded-2xl p-5 shadow-xl hover:border-emerald-500/40 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-emerald-400/90">
                  Total Revenue
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {formatINR(totalRevenue)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                  <span>Calculated across {filteredOrders.length} projects</span>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-500/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Period Bounds:</span>
                <span className="text-emerald-400 font-bold">{startDate} ~ {endDate}</span>
              </div>
            </div>

            {/* KPI 2: Active Orders */}
            <div className="bg-gradient-to-b from-blue-950/20 to-zinc-950 border border-blue-500/20 rounded-2xl p-5 shadow-xl hover:border-blue-500/40 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-blue-400/90">
                  Active Orders
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <PackageCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {activeOrdersCount}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                  <span>In progress / live projects</span>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-blue-500/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Total Registered:</span>
                <span className="text-blue-400 font-bold">{orders.length} Orders</span>
              </div>
            </div>

            {/* KPI 3: Orders Waiting for Approval */}
            <div 
              onClick={() => handleSectionSwitch('approval')}
              className="bg-gradient-to-b from-amber-950/20 to-zinc-950 border border-amber-500/30 rounded-2xl p-5 shadow-xl hover:border-amber-500/60 transition-all relative overflow-hidden cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-400/90">
                  Waiting Approval
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-300">
                  {waitingApprovalOrders.length}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                  <span>Projects awaiting review & closure</span>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-500/10 flex items-center justify-between text-[11px] font-mono text-amber-400/80 font-bold group-hover:text-amber-300">
                <span>Click to review projects</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* KPI 4: Outstanding Payment */}
            <div className="bg-gradient-to-b from-rose-950/20 to-zinc-950 border border-rose-500/20 rounded-2xl p-5 shadow-xl hover:border-rose-500/40 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-rose-400/90">
                  Outstanding Payment
                </span>
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-300">
                  {formatINR(outstandingPaymentTotal)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                  <span>Balance due across active orders</span>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-rose-500/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Action Required:</span>
                <span className="text-rose-400 font-bold">Follow up with sales</span>
              </div>
            </div>

          </div>

          {/* Quick Overview Summary Banner */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Executive Operations Status</span>
              </h3>
              <p className="text-xs text-zinc-400">
                {waitingApprovalOrders.length > 0 
                  ? `There are currently ${waitingApprovalOrders.length} projects waiting for your review and final closure.`
                  : 'All client-accepted projects have been reviewed and closed! No pending approvals at this time.'}
              </p>
            </div>

            {waitingApprovalOrders.length > 0 && (
              <button
                onClick={() => handleSectionSwitch('approval')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Review Pending Orders ({waitingApprovalOrders.length})</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* SECTION 2: EVENT CALENDAR */}
      {currentSection === 'calendar' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-purple-400 font-mono flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span>SECTION 2: EVENT CALENDAR</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Single unified calendar displaying Event Dates, Delivery Dates, Client Acceptance, and Orders Waiting for Approval.
              </p>
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-zinc-300">Event Dates</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-zinc-300">Delivery Dates</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">Client Acceptance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-zinc-300">Waiting Approval</span>
              </div>
            </div>
          </div>

          {/* Calendar Component Wrapper */}
          <BusinessOwnerCalendarView 
            orders={orders}
            production={production}
            onSelectEvent={(eventData) => setCalendarEventModal(eventData)}
          />

        </div>
      )}

      {/* SECTION 3: ORDERS AWAITING FINAL APPROVAL */}
      {currentSection === 'approval' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* QUOTATION UNLOCK REQUESTS */}
          <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-2">
                <Ban className="w-4 h-4" />
                <span>QUOTATION UNLOCK REQUESTS</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Sales staff requests to unlock quotations for editing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">Total Pending:</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
                {unlockRequests.length} Requests
              </span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl mb-8">
            {unlockRequests.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">No Quotation Unlock Requests</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  There are no pending requests from the sales team to unlock quotations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-max">
                  <thead>
                    <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Lead ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Sales Staff</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Request Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {unlockRequests.map(request => {
                      const orderDetails = orders.find(o => o.order_id === request.order_id || o.lead_id === request.lead_id);
                      const leadDetails = leads.find(l => l.lead_id === request.lead_id || (request.order_id && l.lead_id === request.order_id));

                      const customerName = 
                        request.customer_name || 
                        leadDetails?.customer_name || 
                        orderDetails?.customer_name || 
                        (request.action_url ? (() => { try { return JSON.parse(request.action_url).customer_name; } catch(e) { return null; } })() : null) || 
                        '-';

                      const orderId = request.order_id || orderDetails?.order_id || '-';
                      const leadId = request.lead_id || leadDetails?.lead_id || '-';

                      const staffName = 
                        request.sales_staff_name || 
                        request.requested_by_name || 
                        leadDetails?.sales_person || 
                        orderDetails?.sales_person || 
                        (request.action_url ? (() => { try { return JSON.parse(request.action_url).sales_staff_name; } catch(e) { return null; } })() : null) || 
                        'Sales Staff';

                      const staffMobile = 
                        request.sales_staff_mobile || 
                        leadDetails?.sales_staff_mobile || 
                        leadDetails?.mobile || 
                        (request.action_url ? (() => { try { return JSON.parse(request.action_url).sales_staff_mobile; } catch(e) { return null; } })() : null) || 
                        '-';

                      const reqReason = request.reason || request.request_reason || request.title || 'Quotation unlock requested';
                      const reqStatus = request.status || request.request_status || 'Pending';
                      const reqDate = (request.requested_at || request.created_at) ? new Date(request.requested_at || request.created_at).toLocaleDateString() : '-';

                      return (
                        <tr key={request.request_id || request.order_id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">{orderId}</td>
                          <td className="py-3 px-4 font-mono text-xs text-indigo-400 font-semibold">{leadId}</td>
                          <td className="py-3 px-4 text-zinc-100 font-bold text-sm">{customerName}</td>
                          <td className="py-3 px-4 text-zinc-300">
                            <div className="font-semibold text-zinc-200">{staffName}</div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{staffMobile}</div>
                          </td>
                          <td className="py-3 px-4 text-zinc-300">
                            <div className="font-medium text-amber-200/90">{reqReason}</div>
                            {request.custom_reason && <div className="text-[10px] text-zinc-400 mt-0.5">{request.custom_reason}</div>}
                          </td>
                          <td className="py-3 px-4 text-zinc-400 font-mono text-xs">{reqDate}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                              {reqStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setUnlockRequestModal({
                                ...request,
                                customer_name: customerName,
                                lead_id: leadId,
                                order_id: orderId,
                                sales_staff_name: staffName,
                                sales_staff_mobile: staffMobile,
                                reason: reqReason
                              })}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded shadow text-xs font-bold transition-colors cursor-pointer"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>SECTION 3: ORDERS AWAITING FINAL APPROVAL</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Projects with Client Acceptance status waiting for final Business Owner approval and closure.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">Total Pending:</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
                {waitingApprovalOrders.length} Projects
              </span>
            </div>
          </div>

          {/* Waiting Approval Table */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
            {waitingApprovalOrders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">No Orders Waiting for Approval</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  All client-accepted orders have been reviewed and approved. When a project reaches Client Acceptance, it will appear here for your final approval.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-max">
                  <thead>
                    <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Event Name</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Outstanding Balance</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {waitingApprovalOrders.map(order => {
                      const prod = production.find(p => p.tracking_id === order.lead_id || p.order_id === order.lead_id || p.tracking_id === order.order_id || p.order_id === order.order_id || p.production_id === order.order_id || p.production_id === order.lead_id);
                      const pay = payments.find(p => p.order_id === order.order_id || p.lead_id === order.lead_id);
                      const lead = leads.find(l => l.lead_id === order.lead_id || l.lead_id === order.order_id);
                      
                      const totalQuotation = order.quotation_amount || lead?.quotation_amount || 0;
                      const paymentReceived = pay ? ((pay.advance_received || 0) + (pay.final_payment_received || 0)) : (order.advance_received || 0);
                      const balanceDue = pay ? pay.balance_due : (order.balance_amount || Math.max(0, totalQuotation - paymentReceived));
                      const payStatus = pay ? pay.payment_status : (balanceDue <= 0 ? 'Fully Paid' : (paymentReceived > 0 ? 'Partially Paid' : 'Pending'));
                      const customerMobile = order.customer_phone || order.mobile || lead?.phone || lead?.mobile || pay?.customer_phone || 'N/A';

                      return (
                        <tr key={order.order_id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            {order.order_id}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-zinc-200">
                            <div>{order.customer_name}</div>
                            {customerMobile !== 'N/A' && (
                              <div className="text-[10px] text-zinc-400 font-mono font-normal">{customerMobile}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-300">
                            <div className="font-semibold text-zinc-200">{order.custom_event_name || order.event_type || 'Photography & Videography'}</div>
                            {order.event_date && (
                              <div className="text-[10px] text-zinc-400 font-mono">{order.event_date}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                              payStatus === 'Fully Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : payStatus === 'Partially Paid'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {payStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-zinc-200">
                            <div className={balanceDue <= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatINR(balanceDue)}</div>
                            <div className="text-[10px] text-zinc-400 font-mono">Quotation: {formatINR(totalQuotation)}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                              {prod?.editing_status || order.current_stage || 'Client Acceptance'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setReviewModalOrder(order)}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-black hover:bg-amber-400 transition-all cursor-pointer text-xs flex items-center gap-1.5 ml-auto shadow-md"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SECTION 4: REVENUE & PAYMENT SUMMARY */}
      {currentSection === 'summary' && (
        <RevenuePaymentSummarySection 
          orders={orders}
          payments={payments}
          leads={leads}
          production={production}
        />
      )}

      {/* SECTION 5: STAFF PERFORMANCE */}
      {currentSection === 'staff_performance' && (
        <OwnerStaffPerformanceReport />
      )}

      {/* REVIEW & CLOSE MODAL */}
      {reviewModalOrder && (
        <ReviewAndCloseModal 
          order={reviewModalOrder}
          leads={leads}
          production={production}
          payments={payments}
          currentRole={currentRole}
          onClose={() => setReviewModalOrder(null)}
          onApprove={() => handleApproveAndCloseOrder(reviewModalOrder)}
          onReject={() => handleRejectBackToProduction(reviewModalOrder)}
        />
      )}

      {/* UNLOCK REQUEST REVIEW MODAL */}
      {unlockRequestModal && (
        <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-sans">
                <Ban className="w-4 h-4 text-amber-500" /> Review Quotation Unlock
              </h4>
              <button 
                onClick={() => setUnlockRequestModal(null)}
                className="text-slate-500 hover:text-slate-350 cursor-pointer animate-none border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 font-medium mb-1">Order ID / Lead ID</div>
                  <div className="text-amber-400 font-mono font-bold">{unlockRequestModal.order_id || unlockRequestModal.project_id || '-'}</div>
                  <div className="text-indigo-400 font-mono text-[10px]">{unlockRequestModal.lead_id || '-'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium mb-1">Customer Name</div>
                  <div className="text-white font-bold text-sm">{unlockRequestModal.customer_name || '-'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium mb-1">Sales Staff</div>
                  <div className="text-white font-medium">{unlockRequestModal.sales_staff_name || '-'}</div>
                  <div className="text-slate-400 text-[10px] font-mono">{unlockRequestModal.sales_staff_mobile || '-'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium mb-1">Request Date</div>
                  <div className="text-slate-300 font-mono">{(unlockRequestModal.requested_at || unlockRequestModal.created_at) ? new Date(unlockRequestModal.requested_at || unlockRequestModal.created_at).toLocaleDateString() : '-'}</div>
                </div>
              </div>
              
              <div className="bg-slate-900 border border-slate-750 p-3 rounded-lg text-xs">
                <div className="text-slate-400 font-medium mb-1 border-b border-slate-800 pb-1">Reason</div>
                <div className="text-amber-300 font-bold mt-1.5">{unlockRequestModal.reason || unlockRequestModal.request_reason || unlockRequestModal.title || 'Quotation unlock requested'}</div>
                {unlockRequestModal.custom_reason && (
                  <div className="text-slate-300 mt-2 bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block mb-1">Custom Reason:</span>
                    {unlockRequestModal.custom_reason}
                  </div>
                )}
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-[11px] text-amber-200/80">
                Approving this request will move the project back to the <strong className="text-amber-400">Negotiation</strong> stage, allowing the sales staff to modify the quotation.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                onClick={() => setUnlockRequestModal(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer text-xs font-bold transition-colors border-0"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectUnlock(unlockRequestModal)}
                className="px-3 py-2 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-900/50 rounded-xl cursor-pointer text-xs font-bold transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => handleApproveUnlock(unlockRequestModal)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer text-xs font-bold shadow-lg transition-colors border-0"
              >
                Approve Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR EVENT DETAIL MODAL */}
      {calendarEventModal && (
        <CalendarEventDetailModal 
          event={calendarEventModal}
          onClose={() => setCalendarEventModal(null)}
          onReviewAndClose={(orderObj) => {
            setCalendarEventModal(null);
            setReviewModalOrder(orderObj);
          }}
        />
      )}

    </div>
  );
};

/* ============================================================================
   CALENDAR COMPONENT FOR SECTION 2
   ============================================================================ */
interface BusinessOwnerCalendarViewProps {
  orders: Order[];
  production: Production[];
  onSelectEvent: (eventData: any) => void;
}

const BusinessOwnerCalendarView: React.FC<BusinessOwnerCalendarViewProps> = ({
  orders,
  production,
  onSelectEvent
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigate Months
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const todayMonth = () => setCurrentDate(new Date());

  // Generate Days Grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Combine events from orders & production
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};

    orders.forEach(order => {
      if (!order.event_date) return;
      const dateStr = order.event_date.split('T')[0];
      if (!map[dateStr]) map[dateStr] = [];

      const prod = production.find(p => p.tracking_id === order.lead_id || p.order_id === order.lead_id || p.tracking_id === order.order_id);
      
      const isWaitingApproval = [
        'Client Acceptance',
        'Business Owner Review',
        'Customer Review',
        'Editing Complete',
        'Final Approval'
      ].includes(order.current_stage) || (prod && [
        'Client Acceptance',
        'Business Owner Review',
        'Customer Review',
        'Editing Complete',
        'Final Approval'
      ].includes(prod.editing_status));

      const isClientAcceptance = order.current_stage === 'Client Acceptance' || prod?.editing_status === 'Client Acceptance';

      let typeCategory = 'event_date';
      let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';

      if (isWaitingApproval) {
        typeCategory = 'waiting_approval';
        badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      } else if (isClientAcceptance) {
        typeCategory = 'client_acceptance';
        badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      }

      map[dateStr].push({
        id: `event-${order.order_id}`,
        type: typeCategory,
        badgeColor,
        title: `${order.customer_name} - ${order.event_type || 'Event'}`,
        customerName: order.customer_name,
        orderId: order.order_id,
        eventName: order.custom_event_name || order.event_type || 'Photography Event',
        currentStatus: prod?.editing_status || order.current_stage || 'Event Scheduled',
        eventDate: order.event_date,
        location: order.event_location || 'Studio',
        rawOrder: order,
        rawProd: prod
      });

      // Target delivery date event
      if (prod?.expected_delivery_date || prod?.target_delivery_date) {
        const delDate = (prod.expected_delivery_date || prod.target_delivery_date || '').split('T')[0];
        if (delDate) {
          if (!map[delDate]) map[delDate] = [];
          map[delDate].push({
            id: `delivery-${order.order_id}`,
            type: 'delivery_date',
            badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
            title: `Delivery: ${order.customer_name}`,
            customerName: order.customer_name,
            orderId: order.order_id,
            eventName: `Target Delivery - ${order.custom_event_name || order.event_type}`,
            currentStatus: prod.editing_status || 'Editing In Progress',
            eventDate: delDate,
            location: order.event_location || 'Studio',
            rawOrder: order,
            rawProd: prod
          });
        }
      }
    });

    return map;
  }, [orders, production]);

  return (
    <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      
      {/* Calendar Header Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-zinc-850">
        <div className="flex items-center gap-3">
          <h3 className="text-base sm:text-lg font-black font-mono tracking-tight text-white">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={todayMonth}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono hover:bg-zinc-850 cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-zinc-400 uppercase py-1">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Empty Leading Days */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[90px] p-1 bg-zinc-900/20 rounded-xl border border-zinc-900/50 opacity-30" />
        ))}

        {/* Days of Month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const monthStr = String(month + 1).padStart(2, '0');
          const dayStr = String(dayNum).padStart(2, '0');
          const fullDateStr = `${year}-${monthStr}-${dayStr}`;

          const isToday = fullDateStr === new Date().toISOString().split('T')[0];
          const dayEvents = eventsByDate[fullDateStr] || [];

          return (
            <div
              key={fullDateStr}
              className={`min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-all ${
                isToday
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                  : 'bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold ${isToday ? 'text-amber-400 font-black' : 'text-zinc-400'}`}>
                  {dayNum}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Cards in Day Cell */}
              <div className="space-y-1 mt-1 overflow-y-auto max-h-[50px] sm:max-h-[65px] scrollbar-none">
                {dayEvents.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className={`p-1 rounded-md border text-[10px] font-medium truncate cursor-pointer hover:scale-102 transition-transform ${ev.badgeColor}`}
                    title={`${ev.title} (${ev.currentStatus})`}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

/* ============================================================================
   REVENUE & PAYMENT SUMMARY SECTION 4
   ============================================================================ */
interface RevenuePaymentSummarySectionProps {
  orders: Order[];
  payments: Payment[];
  leads: Lead[];
  production: Production[];
}

const RevenuePaymentSummarySection: React.FC<RevenuePaymentSummarySectionProps> = ({
  orders,
  payments,
  leads,
  production
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Combined detailed records
  const records = useMemo(() => {
    return orders.map(o => {
      const pay = payments.find(p => p.order_id === o.order_id || p.lead_id === o.lead_id);
      const prod = production.find(p => p.tracking_id === o.lead_id || p.order_id === o.lead_id || p.tracking_id === o.order_id);

      const totalRevenue = o.quotation_amount || o.advance_received || 0;
      const paymentReceived = pay 
        ? ((pay.advance_received || 0) + (pay.final_payment_received || 0))
        : (o.advance_received || 0);
      const outstanding = pay ? pay.balance_due : (o.balance_amount || Math.max(0, totalRevenue - paymentReceived));

      const isCompleted = ['Event Completed', 'Client Acceptance', 'Delivered', 'Project Delivered', 'Completed'].includes(o.current_stage) || prod?.editing_status === 'Client Acceptance';
      const isClosed = o.current_stage === 'Order Closed' || o.current_stage === 'Closed' || prod?.editing_status === 'Order Closed';

      return {
        orderId: o.order_id,
        customerName: o.customer_name,
        eventName: o.custom_event_name || o.event_type || 'Event Photography',
        eventDate: o.event_date,
        totalRevenue,
        paymentReceived,
        outstanding,
        paymentStatus: pay ? pay.payment_status : (outstanding <= 0 ? 'Fully Paid' : 'Pending'),
        currentStage: prod?.editing_status || o.current_stage || 'Confirmed',
        isCompleted,
        isClosed
      };
    });
  }, [orders, payments, production]);

  // Filtered by Search & Date
  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch = 
        r.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.eventName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDate = !startDate || !endDate || (r.eventDate >= startDate && r.eventDate <= endDate);

      return matchSearch && matchDate;
    });
  }, [records, searchTerm, startDate, endDate]);

  // Totals for summary header
  const totalRevSum = useMemo(() => filtered.reduce((s, r) => s + r.totalRevenue, 0), [filtered]);
  const totalRecSum = useMemo(() => filtered.reduce((s, r) => s + r.paymentReceived, 0), [filtered]);
  const totalOutSum = useMemo(() => filtered.reduce((s, r) => s + r.outstanding, 0), [filtered]);
  const completedCount = useMemo(() => filtered.filter(r => r.isCompleted || r.isClosed).length, [filtered]);
  const closedCount = useMemo(() => filtered.filter(r => r.isClosed).length, [filtered]);

  // Export CSV
  const downloadCSV = () => {
    const headers = ['Order ID', 'Customer Name', 'Event Name', 'Event Date', 'Total Revenue (INR)', 'Payment Received (INR)', 'Outstanding (INR)', 'Payment Status', 'Current Status'];
    const rows = filtered.map(r => [
      r.orderId,
      r.customerName,
      r.eventName,
      r.eventDate,
      r.totalRevenue,
      r.paymentReceived,
      r.outstanding,
      r.paymentStatus,
      r.currentStage
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Revenue_Payment_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel (.xlsx)
  const downloadExcel = () => {
    const excelData = filtered.map(r => ({
      'Order ID': r.orderId,
      'Customer Name': r.customerName,
      'Event Name': r.eventName,
      'Event Date': r.eventDate,
      'Total Revenue (₹)': r.totalRevenue,
      'Payment Received (₹)': r.paymentReceived,
      'Outstanding Balance (₹)': r.outstanding,
      'Payment Status': r.paymentStatus,
      'Current Status': r.currentStage
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Revenue Summary');
    XLSX.writeFile(workbook, `Revenue_Payment_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export PDF
  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.text('Revenue & Payment Summary Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} | Date Range: ${startDate} to ${endDate}`, 14, 22);

    doc.setFontSize(11);
    doc.text(`Total Revenue: Rs.${totalRevSum.toLocaleString('en-IN')} | Received: Rs.${totalRecSum.toLocaleString('en-IN')} | Outstanding: Rs.${totalOutSum.toLocaleString('en-IN')}`, 14, 30);

    let y = 40;
    doc.setFontSize(9);
    doc.text('Order ID', 14, y);
    doc.text('Customer Name', 45, y);
    doc.text('Event Name', 90, y);
    doc.text('Revenue', 140, y);
    doc.text('Received', 170, y);
    doc.text('Balance', 200, y);
    doc.text('Status', 230, y);

    y += 4;
    doc.line(14, y, 280, y);
    y += 6;

    filtered.forEach(r => {
      if (y > 180) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(r.orderId), 14, y);
      doc.text(String(r.customerName).substring(0, 20), 45, y);
      doc.text(String(r.eventName).substring(0, 22), 90, y);
      doc.text(`Rs.${r.totalRevenue}`, 140, y);
      doc.text(`Rs.${r.paymentReceived}`, 170, y);
      doc.text(`Rs.${r.outstanding}`, 200, y);
      doc.text(String(r.currentStage).substring(0, 18), 230, y);
      y += 6;
    });

    doc.save(`Revenue_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-blue-400 font-mono flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>SECTION 4: REVENUE & PAYMENT SUMMARY</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Summary financial breakdown, search records, and downloadable executive reports.
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadPDF}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>PDF</span>
          </button>
          <button
            onClick={downloadExcel}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={downloadCSV}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Highlights Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Total Revenue</div>
          <div className="text-lg font-black font-mono text-white mt-0.5">{formatINR(totalRevSum)}</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Payment Received</div>
          <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">{formatINR(totalRecSum)}</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Outstanding</div>
          <div className="text-lg font-black font-mono text-rose-400 mt-0.5">{formatINR(totalOutSum)}</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Completed Orders</div>
          <div className="text-lg font-black font-mono text-amber-400 mt-0.5">{completedCount} Projects</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Closed Orders</div>
          <div className="text-lg font-black font-mono text-blue-400 mt-0.5">{closedCount} Projects</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order ID, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 text-xs font-mono w-full sm:w-auto">
          <span className="text-zinc-500 uppercase text-[10px] font-bold">Dates:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-zinc-200 text-xs"
          />
          <span className="text-zinc-600">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-zinc-200 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-max">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Event Name & Date</th>
                <th className="py-3 px-4">Total Revenue</th>
                <th className="py-3 px-4">Payment Received</th>
                <th className="py-3 px-4">Outstanding</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Current Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No matching revenue records found for selected query and date range.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.orderId} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-amber-400">{r.orderId}</td>
                    <td className="py-3.5 px-4 font-sans font-bold text-zinc-200">{r.customerName}</td>
                    <td className="py-3.5 px-4 font-sans text-zinc-300">
                      <div>{r.eventName}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{r.eventDate}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{formatINR(r.totalRevenue)}</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">{formatINR(r.paymentReceived)}</td>
                    <td className="py-3.5 px-4 text-rose-400 font-bold">{formatINR(r.outstanding)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        r.paymentStatus === 'Fully Paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : r.paymentStatus === 'Partially Paid'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {r.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                        {r.currentStage}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

/* ============================================================================
   REVIEW & CLOSE MODAL
   ============================================================================ */
interface ReviewAndCloseModalProps {
  order: Order;
  leads: Lead[];
  production: Production[];
  payments: Payment[];
  currentRole?: string;
  onClose: () => void;
  onApprove: () => void;
  onReject?: () => void;
}

const ReviewAndCloseModal: React.FC<ReviewAndCloseModalProps> = ({
  order,
  leads,
  production,
  payments,
  currentRole = 'Business Owner',
  onClose,
  onApprove,
  onReject
}) => {
  const { editorAssignments } = useRole();
  const [previewProof, setPreviewProof] = useState<{
    imageUrl: string;
    label: string;
    staffName: string;
    deliverableName: string;
  } | null>(null);

  const lead = leads.find(l => l.lead_id === order.lead_id);
  const prod = production.find(p => p.tracking_id === order.lead_id || p.order_id === order.lead_id || p.tracking_id === order.order_id);
  const pay = payments.find(p => p.order_id === order.order_id || p.lead_id === order.lead_id);

  // Financial Summary calculation
  const totalQuotation = order.quotation_amount || order.grand_total || order.total_amount || 0;
  const discountAmount = order.discount || pay?.discount_amount || 0;
  const paymentReceived = pay ? ((pay.advance_received || 0) + (pay.final_payment_received || 0)) : (order.advance_received || 0);
  const outstandingBalance = pay ? pay.balance_due : (order.balance_amount || Math.max(0, totalQuotation - paymentReceived));
  const paymentStatus = pay?.payment_status || order.payment_status || (outstandingBalance <= 0 ? 'Paid' : 'Pending Balance');

  const customerMobile = order.customer_phone || order.mobile || lead?.phone || lead?.mobile || pay?.customer_phone || 'N/A';
  const assignedEditor = prod?.editor_assigned || 'Unassigned';
  const clientAcceptanceStatus = prod?.editing_status || prod?.customer_review_status || order.current_stage || 'Client Acceptance';

  const isBusinessOwner = currentRole === 'Business Owner';

  // Extract ALL events separately for this order
  const resolvedEvents = useMemo(() => {
    const rawLeadEvents = lead?.events && Array.isArray(lead.events) && lead.events.length > 0 ? lead.events : [];
    const deserialized = (!rawLeadEvents || rawLeadEvents.length === 0) && (lead?.notes_special_customizations || order?.notes_special_customizations)
      ? deserializeLeadEvents(lead?.notes_special_customizations || order?.notes_special_customizations).events
      : [];

    const combined = rawLeadEvents.length > 0 ? rawLeadEvents : (deserialized.length > 0 ? deserialized : []);

    if (combined && combined.length > 0) {
      return combined.map((ev: any, idx: number) => {
        const rawEType = ev.event_type || lead?.event_type || order?.event_type || 'N/A';
        const eType = rawEType === 'Other' ? (ev.custom_event_type || 'Other') : rawEType;

        let eName = 'N/A';
        if (ev.event_name === 'Other') {
          eName = ev.custom_event_name || 'Other';
        } else if (ev.custom_event_name && ev.custom_event_name.trim() !== '') {
          eName = ev.custom_event_name;
        } else if (ev.event_name && ev.event_name.trim() !== '') {
          eName = ev.event_name;
        } else if (eType && eType !== 'N/A') {
          eName = eType;
        } else {
          eName = `Event ${idx + 1}`;
        }

        const eDate = ev.event_date || order?.event_date || lead?.event_date || 'N/A';
        const eTime = ev.event_start_time || ev.event_time || order?.event_time || lead?.event_time || 'N/A';
        const eLocation = ev.venue || ev.location || order?.venue || order?.location || lead?.venue || lead?.location || 'N/A';

        // Deliverables assigned for this event
        const matchedAssignments = (editorAssignments || []).filter((a: any) =>
          a.event_id === ev.event_id || a.event_id === ev.id || a.event_id === `ev_${idx + 1}`
        );

        let deliverablesList: string[] = [];
        if (ev.deliverables && Array.isArray(ev.deliverables) && ev.deliverables.length > 0) {
          deliverablesList = ev.deliverables;
        } else if (ev.assigned_deliverables && Array.isArray(ev.assigned_deliverables) && ev.assigned_deliverables.length > 0) {
          deliverablesList = ev.assigned_deliverables;
        } else if (matchedAssignments.length > 0) {
          deliverablesList = matchedAssignments.map((a: any) => `${a.speciality || 'Deliverable'} (${a.staff_name || 'Editor'})`);
        } else {
          deliverablesList = order.deliverables && Array.isArray(order.deliverables) && order.deliverables.length > 0
            ? order.deliverables
            : [order.custom_event_name || order.event_type || 'Full Coverage'];
        }

        return {
          id: ev.event_id || ev.id || `ev_${idx + 1}`,
          eventName: eName,
          eventType: eType,
          eventDate: eDate,
          eventTime: eTime,
          eventLocation: eLocation,
          deliverables: deliverablesList,
          assignments: matchedAssignments
        };
      });
    }

    // Fallback single event if no event array exists
    const eName = order.custom_event_name || order.event_name || order.event_type || lead?.custom_event_name || lead?.event_type || 'Photography & Videography';
    const eType = order.event_type || lead?.event_type || 'N/A';
    const eDate = order.event_date || lead?.event_date || 'N/A';
    const eTime = order.event_time || lead?.event_time || 'N/A';
    const eLocation = order.venue || order.location || lead?.venue || lead?.location || 'N/A';

    const orderAssignments = (editorAssignments || []).filter((a: any) =>
      a.production_id === prod?.production_id ||
      a.order_id === order.order_id ||
      a.order_id === order.lead_id ||
      a.order_id === prod?.tracking_id
    );

    let delivs = order.deliverables && Array.isArray(order.deliverables) && order.deliverables.length > 0
      ? order.deliverables
      : prod?.deliverables && Array.isArray(prod.deliverables)
      ? prod.deliverables
      : [];

    if (delivs.length === 0 && orderAssignments.length > 0) {
      delivs = orderAssignments.map((a: any) => `${a.speciality || 'Deliverable'} (${a.staff_name || 'Editor'})`);
    }
    if (delivs.length === 0) {
      delivs = ['Full Coverage'];
    }

    return [{
      id: order.event_id || 'ev_1',
      eventName: eName,
      eventType: eType,
      eventDate: eDate,
      eventTime: eTime,
      eventLocation: eLocation,
      deliverables: delivs,
      assignments: orderAssignments
    }];
  }, [order, lead, prod, editorAssignments]);

  // Extract Client Communication & Consent Proof uploaded by Production Staff
  const proofList = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      staffName: string;
      deliverableName: string;
      eventName: string;
      imageUrl: string;
      displayUrl: string;
    }> = [];

    const isValidImg = (val: any): string | null => {
      if (!val || typeof val !== 'string') return null;
      const trimmed = val.trim();
      if (
        trimmed.startsWith('data:') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('blob:') ||
        /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(trimmed)
      ) {
        return trimmed;
      }
      return null;
    };

    const formatImgUrl = (url: string) => {
      if (!url) return '';
      const trimmed = url.trim();
      if (trimmed.includes('drive.google.com/file/d/')) {
        const fileIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
        }
      }
      if (trimmed.includes('drive.google.com/open?id=')) {
        const fileIdMatch = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
        }
      }
      return trimmed;
    };

    // 1. Check editor_assignments
    const orderAssignments = (editorAssignments || []).filter((a: any) =>
      a.production_id === prod?.production_id ||
      a.order_id === order.order_id ||
      a.order_id === order.lead_id ||
      a.order_id === prod?.tracking_id
    );

    orderAssignments.forEach((a: any, idx: number) => {
      const candidates = [
        a.customer_communication_proof,
        a.client_communication_proof,
        a.confirmation_proof,
        a.proof_url,
        a.proof_image,
        a.uploaded_proof
      ];

      for (const cand of candidates) {
        const valid = isValidImg(cand);
        if (valid && !items.some(i => i.imageUrl === valid)) {
          items.push({
            id: a.assignment_id || `assign_proof_${idx}`,
            label: `Client Communication & Consent Proof`,
            staffName: a.staff_name || prod?.editor_assigned || 'Production Staff',
            deliverableName: a.speciality || 'Deliverable Proof',
            eventName: a.event_id || 'Event',
            imageUrl: valid,
            displayUrl: formatImgUrl(valid)
          });
          break;
        }
      }
    });

    // 2. Check production record
    if (prod) {
      const prodCandidates = [
        { key: 'client_communication_proof', name: 'Client Communication & Consent Proof' },
        { key: 'customer_communication_proof', name: 'Customer Communication Proof' },
        { key: 'customer_acceptance_proof', name: 'Customer Acceptance Proof' },
        { key: 'confirmation_proof', name: 'Confirmation Proof' },
        { key: 'proof_url', name: 'Uploaded Proof Image' },
        { key: 'communication_proof', name: 'Communication Consent Proof' },
        { key: 'proof_image', name: 'Proof Image' }
      ];

      for (const pCand of prodCandidates) {
        const rawVal = (prod as any)[pCand.key];
        const valid = isValidImg(rawVal);
        if (valid && !items.some(i => i.imageUrl === valid)) {
          items.push({
            id: `prod_proof_${pCand.key}`,
            label: pCand.name,
            staffName: prod.editor_assigned || 'Production Staff',
            deliverableName: 'Client Consent',
            eventName: 'Order Consent',
            imageUrl: valid,
            displayUrl: formatImgUrl(valid)
          });
        }
      }
    }

    // 3. Check order record
    if (order) {
      const orderCandidates = [
        { key: 'client_communication_proof', name: 'Client Communication & Consent Proof' },
        { key: 'customer_communication_proof', name: 'Customer Communication Proof' },
        { key: 'proof_url', name: 'Uploaded Proof Image' }
      ];
      for (const oCand of orderCandidates) {
        const rawVal = (order as any)[oCand.key];
        const valid = isValidImg(rawVal);
        if (valid && !items.some(i => i.imageUrl === valid)) {
          items.push({
            id: `order_proof_${oCand.key}`,
            label: oCand.name,
            staffName: 'Production Staff',
            deliverableName: 'Client Consent',
            eventName: 'Order Consent',
            imageUrl: valid,
            displayUrl: formatImgUrl(valid)
          });
        }
      }
    }

    return items;
  }, [order, prod, editorAssignments]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-850">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                Business Owner Review
              </span>
              <span className="text-xs font-mono text-zinc-500">Order ID: {order.order_id}</span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Final Approval & Order Review
            </h2>
            <p className="text-xs text-zinc-400">
              Review completed workflow and client acceptance before closing this order.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          
          {/* Section 1: Customer Details */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-3">
              <User className="w-3.5 h-3.5" />
              <span>Customer Details</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Customer Name</span>
                <span className="text-zinc-100 font-bold">{order.customer_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Mobile Number</span>
                <span className="text-zinc-200 font-mono">{customerMobile}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Order ID</span>
                <span className="text-amber-400 font-mono font-bold">{order.order_id}</span>
              </div>
            </div>
          </div>

          {/* Section 2: ALL Events (MULTIPLE EVENTS SEPARATELY) */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Event Details ({resolvedEvents.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                {resolvedEvents.length} Event{resolvedEvents.length > 1 ? 's' : ''} in Order
              </span>
            </div>

            <div className="space-y-3">
              {resolvedEvents.map((ev, idx) => (
                <div key={ev.id || idx} className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                      EVENT {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-zinc-200">{ev.eventName}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Event Name</span>
                      <span className="text-zinc-100 font-bold">{ev.eventName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Event Type</span>
                      <span className="text-zinc-200 font-mono">{ev.eventType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Event Date</span>
                      <span className="text-zinc-200 font-mono">{ev.eventDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Event Time</span>
                      <span className="text-zinc-200 font-mono">{ev.eventTime}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Event Location</span>
                      <span className="text-zinc-200 font-mono truncate block" title={ev.eventLocation}>{ev.eventLocation}</span>
                    </div>
                  </div>

                  {/* Assigned Deliverables */}
                  <div className="pt-2 border-t border-zinc-900/80">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold mb-1">Assigned Deliverables</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(ev.deliverables) && ev.deliverables.length > 0 ? (
                        ev.deliverables.map((deliv: string, dIdx: number) => (
                          <span key={dIdx} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-mono">
                            {deliv}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-500 italic text-xs font-mono">No specific deliverables listed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Financial Summary (ONCE PER ORDER) */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-3">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Financial Summary</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Final Quotation Amount</span>
                <span className="text-zinc-100 font-mono font-bold">{formatINR(totalQuotation)}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Discount</span>
                <span className="text-amber-400 font-mono font-bold">{formatINR(discountAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Advance / Payment Received</span>
                <span className="text-emerald-400 font-mono font-bold">{formatINR(paymentReceived)}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Pending Amount</span>
                <span className={`font-mono font-bold ${outstandingBalance <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(outstandingBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Production Summary & Client Acceptance Status */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-3">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Production Summary</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Assigned Editor / Staff</span>
                <span className="text-zinc-100 font-bold">{assignedEditor}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">Client Acceptance Status</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                  {clientAcceptanceStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Client Communication & Consent Proof */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Client Communication & Consent Proof</span>
            </h3>

            {proofList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {proofList.map((proof) => (
                  <div key={proof.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-zinc-200 block truncate">{proof.label}</span>
                      <span className="text-[10px] font-mono text-zinc-400 block truncate">
                        Uploaded by: {proof.staffName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewProof({
                        imageUrl: proof.imageUrl,
                        label: proof.label,
                        staffName: proof.staffName,
                        deliverableName: proof.deliverableName
                      })}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>VIEW IMAGE</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg text-center">
                <span className="text-xs font-mono text-zinc-500 italic">No Proof Uploaded</span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Action Bar */}
        <div className="pt-4 border-t border-zinc-850 flex items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            {isBusinessOwner ? (
              <>Confirms final verification. The order status will automatically update to <strong className="text-emerald-400">Order Closed</strong>.</>
            ) : (
              <span className="text-amber-400 font-bold">Only the Business Owner role can close orders.</span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            {isBusinessOwner && onReject && (
              <button
                onClick={onReject}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Reject Back to Production</span>
              </button>
            )}

            {isBusinessOwner && (
              <button
                onClick={onApprove}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all cursor-pointer shadow-lg flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approve & Close Order</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Proof Image Preview Modal */}
      {previewProof && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/50">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider">
                  Client Communication & Consent Proof
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {previewProof.label} ({previewProof.staffName})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto flex items-center justify-center bg-black">
              {(() => {
                const formattedUrl = previewProof.imageUrl.includes('drive.google.com/file/d/')
                  ? previewProof.imageUrl.replace(/\/file\/d\/([a-zA-Z0-9_-]+).*/, '/uc?export=view&id=$1')
                  : previewProof.imageUrl.includes('drive.google.com/open?id=')
                  ? previewProof.imageUrl.replace(/.*id=([a-zA-Z0-9_-]+).*/, '/uc?export=view&id=$1')
                  : previewProof.imageUrl;

                return (
                  <img
                    src={formattedUrl}
                    alt="Client Communication & Consent Proof"
                    className="max-h-[60vh] w-auto object-contain rounded-lg border border-zinc-800 shadow-xl"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.img-error-fallback')) {
                        const errDiv = document.createElement('div');
                        errDiv.className = 'img-error-fallback p-6 text-center text-zinc-400 font-mono text-xs';
                        errDiv.innerHTML = `<p class="mb-2 text-rose-400 font-bold">Image preview unavailable inline</p><p class="text-zinc-500 text-[11px]">Click "Open Full Image" below to view the proof image.</p>`;
                        parent.appendChild(errDiv);
                      }
                    }}
                  />
                );
              })()}
            </div>

            <div className="p-4 border-t border-zinc-850 flex items-center justify-between bg-zinc-900/50">
              <a
                href={previewProof.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Image</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   CALENDAR EVENT DETAIL MODAL
   ============================================================================ */
interface CalendarEventDetailModalProps {
  event: any;
  onClose: () => void;
  onReviewAndClose: (orderObj: Order) => void;
}

const CalendarEventDetailModal: React.FC<CalendarEventDetailModalProps> = ({
  event,
  onClose,
  onReviewAndClose
}) => {
  const isAwaitingApproval = [
    'Client Acceptance',
    'Business Owner Review',
    'Customer Review',
    'Editing Complete',
    'Final Approval'
  ].includes(event.currentStatus);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">
              Event Details
            </span>
            <h3 className="text-lg font-black text-white mt-0.5">
              {event.eventName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Required Details Display */}
        <div className="space-y-3 text-xs font-sans">
          
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-zinc-500 font-mono uppercase text-[10px] font-bold">Customer Name</span>
            <span className="text-white font-bold text-sm">{event.customerName}</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between font-mono">
            <span className="text-zinc-500 uppercase text-[10px] font-bold">Order ID</span>
            <span className="text-amber-400 font-bold">{event.orderId}</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-zinc-500 font-mono uppercase text-[10px] font-bold">Event Name</span>
            <span className="text-zinc-200 font-bold">{event.eventName}</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-zinc-500 font-mono uppercase text-[10px] font-bold">Current Status</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
              {event.currentStatus}
            </span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between font-mono text-[11px]">
            <span className="text-zinc-500 uppercase font-bold">Event Date</span>
            <span className="text-zinc-300">{event.eventDate}</span>
          </div>

        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          {isAwaitingApproval && event.rawOrder && (
            <button
              onClick={() => onReviewAndClose(event.rawOrder)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review & Close Order</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
