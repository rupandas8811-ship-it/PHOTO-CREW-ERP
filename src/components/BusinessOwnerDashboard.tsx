import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronDown,
  ChevronUp,
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
  Image as ImageIcon,
  TrendingUp,
  Briefcase,
  Video,
  History
} from 'lucide-react';
import { CameraLensStatsCard, CameraLensTheme } from './CameraLensStatsCard';
import { OwnerStaffPerformanceReport } from './OwnerModule';
import { BusinessOwnerCardDetailModal } from './BusinessOwnerCardDetailModal';
import { PaymentHistoryModal } from './PaymentHistoryModal';
import { OrderHistoryModal } from './OrderHistoryModal';
import { formatINR, formatTime12Hour, deserializeLeadEvents, resolveStorageUrl } from '../utils';
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
    operations,
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
  const [showFilters, setShowFilters] = useState(false);
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

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const dateToCheck = lead.created_date || lead.created_at?.split('T')[0] || '';
      if (datePreset === 'all') return true;
      if (!startDate || !endDate) return true;
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
  }, [leads, startDate, endDate, datePreset]);

  const filteredOperations = useMemo(() => {
    return operations.filter(op => {
      const dateToCheck = op.created_at ? op.created_at.split('T')[0] : '';
      if (datePreset === 'all') return true;
      if (!startDate || !endDate) return true;
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
  }, [operations, startDate, endDate, datePreset]);

  const filteredProduction = useMemo(() => {
    return production.filter(prod => {
      const dateToCheck = prod.created_at ? prod.created_at.split('T')[0] : '';
      if (datePreset === 'all') return true;
      if (!startDate || !endDate) return true;
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
  }, [production, startDate, endDate, datePreset]);

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

  // Unified Lifecycle Pipeline across Sales, Operations, Production, Acceptance & Closed
  const unifiedPipeline = useMemo(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeOps = Array.isArray(operations) ? operations : [];
    const safeProd = Array.isArray(production) ? production : [];

    const itemMap = new Map<string, any>();

    const getOrCreate = (key: string) => {
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          id: key,
          lead_id: key,
          order_id: '',
          customer_name: 'Client',
          mobile: '',
          custom_event_name: 'Event',
          event_type: '',
          event_date: '',
          delivery_date: '',
          quotation_amount: 0,
          sales_person: 'Unassigned',
          sales_status: 'New Lead',
          ops_status: 'Not Started',
          prod_status: 'Not Started',
          acceptance_status: 'Pending',
          closed_status: 'Active',
          current_status: 'New Lead',
          assigned_crew: 'Unassigned',
          editor: 'Unassigned',
          hasEnteredSales: true,
          hasEnteredOps: false,
          hasEnteredProd: false,
          hasEnteredAcceptance: false,
          isClosed: false,
          created_at: '',
          rawLead: undefined,
          rawOrder: undefined,
          rawOps: undefined,
          rawProd: undefined
        });
      }
      return itemMap.get(key);
    };

    // 1. Process Leads
    safeLeads.forEach(lead => {
      if (!lead || !lead.lead_id) return;
      const item = getOrCreate(lead.lead_id);
      item.lead_id = lead.lead_id;
      item.customer_name = lead.customer_name || item.customer_name;
      item.mobile = lead.mobile || lead.phone || item.mobile;
      item.custom_event_name = lead.custom_event_name || lead.event_name || lead.event_type || item.custom_event_name;
      item.event_type = lead.event_type || item.event_type;
      item.event_date = lead.event_date || item.event_date;
      item.quotation_amount = lead.quotation_amount || lead.grand_total || lead.final_quotation_amount || lead.package_price || lead.budget || item.quotation_amount;
      item.sales_person = lead.sales_person || lead.sales_staff_name || lead.created_by || item.sales_person;
      item.sales_status = lead.current_status || lead.status || 'Active Lead';
      item.current_status = item.sales_status;
      item.created_at = lead.created_date || lead.created_at || item.created_at;
      item.rawLead = lead;
    });

    // 2. Process Orders
    safeOrders.forEach(order => {
      if (!order) return;
      const key = order.lead_id || order.order_id;
      if (!key) return;
      const item = getOrCreate(key);

      if (order.lead_id) item.lead_id = order.lead_id;
      if (order.order_id) item.order_id = order.order_id;

      item.customer_name = order.customer_name || item.customer_name;
      item.mobile = (order as any).customer_phone || (order as any).mobile || item.mobile;
      item.custom_event_name = order.custom_event_name || order.event_type || item.custom_event_name;
      item.event_type = order.event_type || item.event_type;
      item.event_date = order.event_date || item.event_date;
      item.quotation_amount = order.quotation_amount || order.grand_total || item.quotation_amount;
      item.created_at = order.created_at || item.created_at;
      item.rawOrder = order;

      item.hasEnteredSales = true;
      item.hasEnteredOps = true;

      const oStage = (order.current_stage || order.order_status || '').trim();
      const oLower = oStage.toLowerCase();

      if (oLower.includes('confirm')) {
        item.sales_status = 'Order Confirmed';
      }

      if (oLower.includes('closed') || oLower.includes('completed')) {
        item.hasEnteredProd = true;
        item.hasEnteredAcceptance = true;
        item.isClosed = true;
        item.closed_status = 'Order Closed';
        item.ops_status = 'Operations Completed';
        item.prod_status = 'Production Completed';
        item.acceptance_status = 'Client Accepted';
        item.current_status = 'Order Closed';
      } else if (oLower.includes('acceptance') || oLower.includes('approved') || oLower.includes('customer review')) {
        item.hasEnteredProd = true;
        item.hasEnteredAcceptance = true;
        item.ops_status = 'Operations Completed';
        item.prod_status = 'Proof Uploaded';
        item.acceptance_status = 'Acceptance Pending';
        item.current_status = 'Acceptance Pending';
      } else if (oLower.includes('production') || oLower.includes('editing') || oLower.includes('proof')) {
        item.hasEnteredProd = true;
        item.ops_status = 'Operations Completed';
        item.prod_status = oStage || 'In Production';
        item.current_status = oStage || 'Production Started';
      } else if (oLower.includes('operation')) {
        item.ops_status = oStage || 'Operations Assigned';
        item.current_status = oStage || 'Operations Assigned';
      } else if (oStage) {
        item.current_status = oStage;
      }
    });

    // 3. Process Operations
    safeOps.forEach(op => {
      if (!op) return;
      const opOrderId = op.order_id || (op as any).tracking_id;
      if (!opOrderId) return;

      let item = Array.from(itemMap.values()).find(i => i.order_id === opOrderId || i.lead_id === opOrderId || i.id === opOrderId);
      if (!item) {
        item = getOrCreate(opOrderId);
        item.order_id = opOrderId;
      }

      item.rawOps = op;
      item.hasEnteredOps = true;

      if (op.event_date) item.event_date = op.event_date;
      if ((op as any).customer_name) item.customer_name = (op as any).customer_name;

      const crewList = [op.photographer_assigned, op.videographer_assigned, op.drone_operator_assigned, op.assistant_assigned].filter(Boolean);
      const assignedCrew = crewList.length > 0 ? crewList.join(', ') : ((op as any).assigned_photographer || (op as any).assigned_crew || (op as any).assigned_staff || item.assigned_crew);
      item.assigned_crew = assignedCrew;

      const rawOpStatus = op.event_status || (op as any).operations_status || (op as any).status || 'Assigned';
      item.ops_status = rawOpStatus;

      const opLower = rawOpStatus.toLowerCase();
      if (opLower.includes('complete') || opLower.includes('delivered') || opLower.includes('closed') || opLower.includes('handover')) {
        item.ops_status = 'Operations Completed';
        item.hasEnteredProd = true;
        if (item.current_status === 'New Lead' || item.current_status === 'Order Confirmed' || item.current_status.toLowerCase().includes('operation')) {
          item.current_status = 'Production Started';
        }
      } else {
        if (!item.hasEnteredProd && !item.isClosed && !item.hasEnteredAcceptance) {
          item.current_status = `Operations: ${rawOpStatus}`;
        }
      }
    });

    // 4. Process Production
    safeProd.forEach(prod => {
      if (!prod) return;
      const pOrderId = prod.order_id || prod.tracking_id || (prod as any).production_id;
      if (!pOrderId) return;

      let item = Array.from(itemMap.values()).find(i => i.order_id === pOrderId || i.lead_id === pOrderId || i.id === pOrderId);
      if (!item) {
        item = getOrCreate(pOrderId);
        item.order_id = pOrderId;
      }

      item.rawProd = prod;
      item.hasEnteredOps = true;
      item.hasEnteredProd = true;

      if (prod.expected_delivery_date || (prod as any).delivery_date || prod.target_delivery_date) {
        item.delivery_date = prod.expected_delivery_date || (prod as any).delivery_date || prod.target_delivery_date;
      }
      if (prod.editor_assigned || (prod as any).assigned_editor || (prod as any).assigned_staff) {
        item.editor = prod.editor_assigned || (prod as any).assigned_editor || (prod as any).assigned_staff;
      }
      if (prod.proof_url || (prod as any).proof_link) {
        item.proof_url = prod.proof_url || (prod as any).proof_link;
      }
      if (prod.footage_url) {
        item.footage_url = prod.footage_url;
      }

      const rawProdStatus = prod.editing_status || prod.production_status || (prod as any).status || 'Editing Started';
      item.prod_status = rawProdStatus;

      const prLower = rawProdStatus.toLowerCase();
      if (prLower.includes('client acceptance') || prLower.includes('customer review') || prLower.includes('proof uploaded')) {
        item.hasEnteredAcceptance = true;
        item.acceptance_status = 'Acceptance Pending';
        if (!item.isClosed) {
          item.current_status = 'Proof Uploaded (Acceptance Pending)';
        }
      } else if (prLower.includes('closed') || (prLower.includes('complete') && prLower.includes('project'))) {
        item.hasEnteredAcceptance = true;
        item.isClosed = true;
        item.closed_status = 'Order Closed';
        item.current_status = 'Order Closed';
      } else {
        if (!item.isClosed && !item.hasEnteredAcceptance) {
          item.current_status = rawProdStatus;
        }
      }
    });

    // Date range filtering helper
    const isWithinDate = (dateStr?: string) => {
      if (datePreset === 'all' || (!startDate && !endDate)) return true;
      if (!dateStr) return true;
      const cleanDate = dateStr.split('T')[0];
      if (startDate && cleanDate < startDate) return false;
      if (endDate && cleanDate > endDate) return false;
      return true;
    };

    return Array.from(itemMap.values()).filter(item => {
      const d = item.created_at || item.event_date || '';
      return isWithinDate(d);
    });
  }, [leads, orders, operations, production, startDate, endDate, datePreset]);

  const boCardsData = useMemo(() => {
    // SALES
    const salesTotalLeads = unifiedPipeline.filter(i => i.hasEnteredSales);
    const salesConverted = salesTotalLeads.filter(i => (i.sales_status || '').toLowerCase().includes('confirm') || i.order_id);
    const salesLost = salesTotalLeads.filter(i => (i.sales_status || '').toLowerCase().includes('lost'));
    const salesFollowup = salesTotalLeads.filter(i => (i.sales_status || '').toLowerCase().includes('quotation'));

    // OPERATIONS
    const opsAll = unifiedPipeline.filter(i => i.hasEnteredOps);
    const opsNew = opsAll.filter(i => (i.ops_status || '').toLowerCase().includes('pending') || (i.ops_status || '').toLowerCase().includes('assigned') || (i.ops_status || '').toLowerCase() === 'not started');
    const opsCompleted = opsAll.filter(i => (i.ops_status || '').toLowerCase().includes('complete') || (i.ops_status || '').toLowerCase().includes('delivered'));
    const opsUpcoming = opsAll.filter(i => i.event_date && new Date(i.event_date) >= new Date() && !(i.ops_status || '').toLowerCase().includes('complete'));
    const opsScheduled = opsAll.filter(i => (i.ops_status || '').toLowerCase().includes('scheduled') || i.assigned_crew !== 'Unassigned');

    // PRODUCTION
    const prodAll = unifiedPipeline.filter(i => i.hasEnteredProd);
    const prodNew = prodAll.filter(i => (i.prod_status || '').toLowerCase().includes('raw') || (i.prod_status || '').toLowerCase().includes('new') || i.prod_status === 'Not Started');
    const prodInProgress = prodAll.filter(i => (i.prod_status || '').toLowerCase().includes('progress') || (i.prod_status || '').toLowerCase().includes('started') || (i.prod_status || '').toLowerCase().includes('editing'));
    const prodEditingCompleted = prodAll.filter(i => (i.prod_status || '').toLowerCase().includes('complete') || (i.prod_status || '').toLowerCase().includes('proof'));
    const prodClientAcceptance = unifiedPipeline.filter(i => i.hasEnteredAcceptance);

    return {
      salesTotalLeads, salesConverted, salesLost, salesFollowup,
      opsNew, opsCompleted, opsUpcoming, opsScheduled, opsAll,
      prodNew, prodInProgress, prodEditingCompleted, prodClientAcceptance, prodAll
    };
  }, [unifiedPipeline]);

  const outstandingPaymentTotal = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const pay = payments.find(p => p.order_id === o.order_id || p.lead_id === o.lead_id);
      if (pay) return sum + (pay.balance_due || 0);
      return sum + (o.balance_amount || 0);
    }, 0);
  }, [filteredOrders, payments]);

  // Clickable card modal state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenCard = (e: any) => setSelectedCard(e.detail);
    window.addEventListener('open-business-owner-card', handleOpenCard);
    return () => window.removeEventListener('open-business-owner-card', handleOpenCard);
  }, []);

  // Configs for Overview Card details
  const modalData = useMemo(() => {
    if (!selectedCard) return [];
    if (selectedCard === 'overview_revenue') return filteredOrders;
    if (selectedCard === 'overview_active') return filteredOrders.filter(o => o.current_stage !== 'Order Closed' && o.current_stage !== 'Closed' && o.current_stage !== 'Event Cancelled');
    if (selectedCard === 'overview_approval') return waitingApprovalOrders;
    if (selectedCard === 'overview_outstanding') return filteredOrders.map(o => {
      const pay = payments.find(p => p.order_id === o.order_id || p.lead_id === o.lead_id);
      const totalRev = o.quotation_amount || o.advance_received || 0;
      const received = pay ? ((pay.advance_received || 0) + (pay.final_payment_received || 0)) : (o.advance_received || 0);
      const outstanding = pay ? (pay.balance_due || 0) : (o.balance_amount || Math.max(0, totalRev - received));
      return { ...o, totalRevenue: totalRev, paymentReceived: received, outstandingAmount: outstanding };
    }).filter(item => item.outstandingAmount > 0);

    // SALES CARDS
    if (selectedCard === 'sales_total_leads' || selectedCard === 'overview_sales') {
      return boCardsData.salesTotalLeads;
    }
    if (selectedCard === 'sales_total_converted') {
      return boCardsData.salesConverted;
    }
    if (selectedCard === 'sales_total_lost') {
      return boCardsData.salesLost;
    }
    if (selectedCard === 'sales_quotation_followup') {
      return boCardsData.salesFollowup;
    }

    // OPERATIONS CARDS
    if (selectedCard === 'ops_new' || selectedCard === 'ops_completed' || selectedCard === 'ops_upcoming' || selectedCard === 'ops_scheduled' || selectedCard === 'overview_ops') {
      return selectedCard === 'ops_new' ? boCardsData.opsNew
        : selectedCard === 'ops_completed' ? boCardsData.opsCompleted
        : selectedCard === 'ops_upcoming' ? boCardsData.opsUpcoming
        : selectedCard === 'ops_scheduled' ? boCardsData.opsScheduled
        : boCardsData.opsAll;
    }

    // PRODUCTION CARDS
    if (selectedCard === 'prod_new' || selectedCard === 'prod_inprogress' || selectedCard === 'prod_editing_completed' || selectedCard === 'prod_client_acceptance' || selectedCard === 'overview_prod' || selectedCard === 'overview_acceptance') {
      return selectedCard === 'prod_new' ? boCardsData.prodNew
        : selectedCard === 'prod_inprogress' ? boCardsData.prodInProgress
        : selectedCard === 'prod_editing_completed' ? boCardsData.prodEditingCompleted
        : (selectedCard === 'prod_client_acceptance' || selectedCard === 'overview_acceptance') ? boCardsData.prodClientAcceptance
        : boCardsData.prodAll;
    }

    if (selectedCard === 'overview_closed') {
      return unifiedPipeline.filter(i => i.isClosed);
    }

    return [];
  }, [selectedCard, filteredOrders, waitingApprovalOrders, payments, boCardsData, unifiedPipeline]);

  const modalColumns = useMemo(() => {
    const actionCol = { 
      key: 'actions', 
      label: 'Action', 
      render: (item: any) => (
        <button
          type="button"
          onClick={() => setSelectedHistoryOrder(item.rawOrder || item.rawLead || item)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
          title="View Project History & Timeline"
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      )
    };

    const baseOrderCols = [
      { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-400">{item.order_id || item.lead_id}</span> },
      { key: 'customer_name', label: 'Customer Name', render: (item: any) => <span className="font-bold text-white">{item.customer_name}</span> },
      { key: 'custom_event_name', label: 'Event Name', render: (item: any) => <span className="text-zinc-200">{item.custom_event_name || item.event_type || 'Photography'}</span> },
      { key: 'event_date', label: 'Event Date', render: (item: any) => <span className="font-mono text-zinc-400">{item.event_date ? item.event_date.split('T')[0] : 'N/A'}</span> }
    ];

    const baseLeadCols = [
      { key: 'lead_id', label: 'Lead ID', render: (item: any) => <span className="font-mono text-zinc-400 font-bold">{item.lead_id}</span> },
      { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-300 font-bold">{item.order_id || 'N/A'}</span> },
      { key: 'customer_name', label: 'Customer Name', render: (item: any) => (
        <div>
          <span className="font-bold text-white block">{item.customer_name}</span>
          {item.mobile && item.mobile !== 'N/A' && <span className="text-[10px] text-zinc-400 font-mono">{item.mobile}</span>}
        </div>
      )},
      { key: 'custom_event_name', label: 'Event / Type', render: (item: any) => <span className="text-zinc-300">{item.custom_event_name || 'Event'}</span> },
      { key: 'event_date', label: 'Event Date', render: (item: any) => <span className="font-mono text-zinc-400 text-xs">{item.event_date ? item.event_date.split('T')[0] : 'N/A'}</span> },
      { key: 'sales_person', label: 'Sales Staff', render: (item: any) => <span className="text-amber-400 font-mono text-xs">{item.sales_person || 'Unassigned'}</span> },
      { key: 'quotation_amount', label: 'Quotation Amount', render: (item: any) => <span className="font-mono text-emerald-400 font-bold text-xs">{formatINR(item.quotation_amount || 0)}</span> },
      { key: 'sales_status', label: 'Sales Status', render: (item: any) => <span className="text-zinc-300 font-mono text-xs">{item.sales_status}</span> },
      { key: 'current_status', label: 'Current Status', render: (item: any) => (
        <span className={`px-2 py-0.5 rounded-lg border font-bold font-mono text-[10px] ${
          (item.current_status || '').toLowerCase().includes('closed') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          (item.current_status || '').toLowerCase().includes('lost') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
          (item.current_status || '').toLowerCase().includes('production') ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
          'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {item.current_status || item.sales_status || 'Active'}
        </span>
      )}
    ];

    const baseOpsCols = [
      { key: 'lead_id', label: 'Lead ID', render: (item: any) => <span className="font-mono text-zinc-400 font-bold">{item.lead_id}</span> },
      { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-300 font-bold">{item.order_id || 'N/A'}</span> },
      { key: 'customer_name', label: 'Customer Name', render: (item: any) => <span className="font-bold text-white">{item.customer_name}</span> },
      { key: 'custom_event_name', label: 'Event / Shoot Type', render: (item: any) => <span className="text-zinc-200">{item.custom_event_name}</span> },
      { key: 'event_date', label: 'Shoot Date', render: (item: any) => <span className="font-mono text-zinc-400 text-xs">{item.event_date ? item.event_date.split('T')[0] : 'N/A'}</span> },
      { key: 'assigned_crew', label: 'Assigned Crew', render: (item: any) => <span className="text-blue-400 font-mono text-xs">{item.assigned_crew}</span> },
      { key: 'ops_status', label: 'Ops Status', render: (item: any) => (
        <span className={`px-2 py-0.5 rounded-lg border font-bold font-mono text-[10px] ${
          (item.ops_status || '').toLowerCase().includes('complete') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          'bg-blue-500/10 text-blue-400 border-blue-500/20'
        }`}>
          {item.ops_status || 'Active'}
        </span>
      )},
      { key: 'current_status', label: 'Current Status', render: (item: any) => (
        <span className={`px-2 py-0.5 rounded-lg border font-bold font-mono text-[10px] ${
          (item.current_status || '').toLowerCase().includes('closed') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          (item.current_status || '').toLowerCase().includes('production') ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
          (item.current_status || '').toLowerCase().includes('acceptance') ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
          'bg-blue-500/10 text-blue-400 border-blue-500/20'
        }`}>
          {item.current_status || 'Active'}
        </span>
      )}
    ];

    const baseProdCols = [
      { key: 'lead_id', label: 'Lead ID', render: (item: any) => <span className="font-mono text-zinc-400 font-bold">{item.lead_id}</span> },
      { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-300 font-bold">{item.order_id || 'N/A'}</span> },
      { key: 'customer_name', label: 'Customer Name', render: (item: any) => <span className="font-bold text-white">{item.customer_name}</span> },
      { key: 'custom_event_name', label: 'Deliverable / Project', render: (item: any) => <span className="text-zinc-200">{item.custom_event_name}</span> },
      { key: 'delivery_date', label: 'Target Delivery', render: (item: any) => <span className="font-mono text-zinc-400 text-xs">{item.delivery_date ? item.delivery_date.split('T')[0] : 'N/A'}</span> },
      { key: 'editor', label: 'Assigned Editor', render: (item: any) => <span className="text-purple-400 font-mono text-xs">{item.editor}</span> },
      { key: 'ops_status', label: 'Ops Status', render: (item: any) => <span className="text-zinc-400 font-mono text-xs">{item.ops_status || 'N/A'}</span> },
      { key: 'prod_status', label: 'Production Status', render: (item: any) => (
        <span className={`px-2 py-0.5 rounded-lg border font-bold font-mono text-[10px] ${
          (item.prod_status || '').toLowerCase().includes('acceptance') || (item.prod_status || '').toLowerCase().includes('approved') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          (item.prod_status || '').toLowerCase().includes('complete') ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
          'bg-pink-500/10 text-pink-400 border-pink-500/20'
        }`}>
          {item.prod_status || 'In Production'}
        </span>
      )},
      { key: 'current_status', label: 'Current Status', render: (item: any) => (
        <span className={`px-2 py-0.5 rounded-lg border font-bold font-mono text-[10px] ${
          (item.current_status || '').toLowerCase().includes('closed') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          (item.current_status || '').toLowerCase().includes('acceptance') ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
          'bg-purple-500/10 text-purple-400 border-purple-500/20'
        }`}>
          {item.current_status || 'In Production'}
        </span>
      )},
      { key: 'proof_url', label: 'Proof Link', render: (item: any) => item.proof_url ? (
        <a href={item.proof_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline font-mono">
          View Proof
        </a>
      ) : <span className="text-zinc-500 text-xs">No Proof</span> }
    ];

    if (selectedCard === 'overview_revenue') return [...baseOrderCols, { key: 'quotation_amount', label: 'Quotation Amount', render: (item: any) => <span className="font-mono text-emerald-400 font-bold">{formatINR(item.quotation_amount || 0)}</span> }, { key: 'advance_received', label: 'Advance Received', render: (item: any) => <span className="font-mono text-zinc-400">{formatINR(item.advance_received || 0)}</span> }, actionCol];
    if (selectedCard === 'overview_active') return [...baseOrderCols, { key: 'current_stage', label: 'Current Stage', render: (item: any) => <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold font-mono text-[10px]">{item.current_stage || 'In Progress'}</span> }, actionCol];
    if (selectedCard === 'overview_approval') return [...baseOrderCols, { key: 'current_stage', label: 'Current Stage', render: (item: any) => <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold font-mono text-[10px]">{item.current_stage || 'Awaiting Approval'}</span> }, actionCol];
    if (selectedCard === 'overview_outstanding') return [...baseOrderCols, { key: 'totalRevenue', label: 'Total Revenue', render: (item: any) => <span className="font-mono text-zinc-400">{formatINR(item.totalRevenue || 0)}</span> }, { key: 'paymentReceived', label: 'Received', render: (item: any) => <span className="font-mono text-emerald-400">{formatINR(item.paymentReceived || 0)}</span> }, { key: 'outstandingAmount', label: 'Outstanding Balance', render: (item: any) => <span className="font-mono text-rose-400 font-bold">{formatINR(item.outstandingAmount || 0)}</span> }, actionCol];

    if (selectedCard && (selectedCard.startsWith('sales_') || selectedCard === 'overview_sales')) return [...baseLeadCols, actionCol];
    if (selectedCard && (selectedCard.startsWith('ops_') || selectedCard === 'overview_ops')) return [...baseOpsCols, actionCol];
    if (selectedCard && (selectedCard.startsWith('prod_') || selectedCard === 'overview_prod' || selectedCard === 'overview_acceptance')) return [...baseProdCols, actionCol];
    if (selectedCard === 'overview_closed') return [...baseOrderCols, { key: 'current_stage', label: 'Status', render: () => <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono text-[10px]">Closed & Completed</span> }, actionCol];

    return [];
  }, [selectedCard]);

  const modalTitleAndMeta = useMemo(() => {
    switch (selectedCard) {
      case 'overview_revenue': return { title: 'Total Revenue Breakdown', totalLabel: 'Total Revenue Sum', totalValue: formatINR(totalRevenue), accentColor: 'emerald' as const, filterDescription: `This list displays all ${filteredOrders.length} orders created within the active date range, contributing to the total revenue calculation.` };
      case 'overview_active': return { title: 'Active Orders Details', totalLabel: 'Active Projects Count', totalValue: `${modalData.length} Projects`, accentColor: 'blue' as const, filterDescription: 'This list displays all active projects that are currently in progress.' };
      case 'overview_approval': return { title: 'Awaiting Business Owner Approval', totalLabel: 'Awaiting Approvals Count', totalValue: `${modalData.length} Projects`, accentColor: 'amber' as const, filterDescription: 'This list displays all projects currently waiting for review and final closure.' };
      case 'overview_outstanding': return { title: 'Outstanding Payments List', totalLabel: 'Total Outstanding Balance', totalValue: formatINR(outstandingPaymentTotal), accentColor: 'rose' as const, filterDescription: 'This list displays all orders that have a non-zero outstanding balance.' };

      case 'sales_total_leads':
      case 'overview_sales': return { title: 'Total Leads Breakdown', totalLabel: 'Total Leads Count', totalValue: `${modalData.length}`, accentColor: 'amber' as const, filterDescription: 'All leads currently logged in the Sales pipeline.' };
      case 'sales_total_converted': return { title: 'Total Converted Leads', totalLabel: 'Converted Count', totalValue: `${modalData.length}`, accentColor: 'emerald' as const, filterDescription: 'Leads that have been successfully confirmed and transitioned into active orders.' };
      case 'sales_total_lost': return { title: 'Total Leads Lost', totalLabel: 'Lost Leads Count', totalValue: `${modalData.length}`, accentColor: 'rose' as const, filterDescription: 'Leads whose status has been marked as Lost.' };
      case 'sales_quotation_followup': return { title: 'Total Quotation Follow-up', totalLabel: 'Follow-up Count', totalValue: `${modalData.length}`, accentColor: 'amber' as const, filterDescription: 'Leads requiring active quotation follow-up.' };

      case 'ops_new': return { title: 'Total New Projects (Operations)', totalLabel: 'New Projects Count', totalValue: `${modalData.length}`, accentColor: 'blue' as const, filterDescription: 'New incoming shoot assignments requiring operational planning and crew deployment.' };
      case 'ops_completed': return { title: 'Total Completed Shoot Projects', totalLabel: 'Completed Count', totalValue: `${modalData.length}`, accentColor: 'emerald' as const, filterDescription: 'Shoot assignments successfully completed on location.' };
      case 'ops_upcoming': return { title: 'Total Upcoming Shoots', totalLabel: 'Upcoming Count', totalValue: `${modalData.length}`, accentColor: 'blue' as const, filterDescription: 'Scheduled shoots with future event dates.' };
      case 'ops_scheduled': return { title: 'Total Scheduled Shoots', totalLabel: 'Scheduled Count', totalValue: `${modalData.length}`, accentColor: 'blue' as const, filterDescription: 'Events where crew, equipment, and shoot timing have been scheduled.' };
      case 'overview_ops': return { title: 'Operations Pipeline Breakdown', totalLabel: 'Total Operations Count', totalValue: `${modalData.length}`, accentColor: 'blue' as const, filterDescription: 'Comprehensive overview of all operations tasks and event shoots.' };

      case 'prod_new': return { title: 'Total New Projects (Production)', totalLabel: 'New Projects Count', totalValue: `${modalData.length}`, accentColor: 'purple' as const, filterDescription: 'Projects with raw footage received, awaiting editor allocation and start.' };
      case 'prod_inprogress': return { title: 'Total In Progress Editing', totalLabel: 'In Progress Count', totalValue: `${modalData.length}`, accentColor: 'purple' as const, filterDescription: 'Projects actively being edited and color-graded by production staff.' };
      case 'prod_editing_completed': return { title: 'Total Editing Complete', totalLabel: 'Editing Complete Count', totalValue: `${modalData.length}`, accentColor: 'purple' as const, filterDescription: 'Projects with post-production finished and ready for review.' };
      case 'prod_client_acceptance':
      case 'overview_acceptance': return { title: 'Total Client Acceptance', totalLabel: 'Client Accepted Count', totalValue: `${modalData.length}`, accentColor: 'emerald' as const, filterDescription: 'Projects reviewed and accepted by the client.' };
      case 'overview_prod': return { title: 'Production Pipeline Breakdown', totalLabel: 'Total Production Count', totalValue: `${modalData.length}`, accentColor: 'purple' as const, filterDescription: 'Comprehensive overview of deliverables across all editing phases.' };
      case 'overview_closed': return { title: 'Closed & Completed Orders', totalLabel: 'Closed Orders Count', totalValue: `${modalData.length}`, accentColor: 'emerald' as const, filterDescription: 'Projects successfully completed, fully paid, and closed.' };

      default: return { title: 'Detail View', totalLabel: 'Total Count', totalValue: `${modalData.length}`, accentColor: 'amber' as const, filterDescription: 'Detailed view of matching records.' };
    }
  }, [selectedCard, totalRevenue, outstandingPaymentTotal, modalData.length, filteredOrders.length]);
  // Review & Close Modal State
  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);
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
      throw err;
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
      
      {/* Toast / Notification Banner */}
      {approvalFeedback && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg animate-in fade-in duration-300 mb-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{approvalFeedback}</span>
        </div>
      )}

      {/* SECTION 1: BUSINESS OVERVIEW */}
      {currentSection === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Section Header & Date Filter */}
          <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                <span>BUSINESS OVERVIEW</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Key Performance Indicators across revenue, active projects, and pending approvals.
              </p>
            </div>

            {/* Filter toggle button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                showFilters ? 'border-amber-500/40 text-amber-400 bg-amber-500/5' : 'border-zinc-800 text-zinc-400'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>

          {/* Collapsible Date Filter Bar */}
          {showFilters && (
            <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl flex flex-wrap items-center gap-2 animate-fade-in shadow-inner">
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
          )}

          {/* BUSINESS OVERVIEW 12 CARDS SECTION */}
          <div className="space-y-6">
            
            {/* SALES PERFORMANCE */}
            <div className="space-y-3">
              <h3 className="text-xs font-black font-mono tracking-wider text-amber-400 uppercase">Sales Performance</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <CameraLensStatsCard
                  label="Total Leads"
                  val={boCardsData.salesTotalLeads.length}
                  theme="amber"
                  trendText="All Inquiries"
                  lensLabel="PRIME 24mm"
                  chartPoints={[10, 18, 14, 22, 19, 28, 25]}
                  onClick={() => setSelectedCard('sales_total_leads')}
                />
                <CameraLensStatsCard
                  label="Total Converted"
                  val={boCardsData.salesConverted.length}
                  theme="green"
                  trendText="Confirmed Deals"
                  lensLabel="PRIME 35mm"
                  chartPoints={[8, 12, 15, 20, 24, 30, 32]}
                  onClick={() => setSelectedCard('sales_total_converted')}
                />
                <CameraLensStatsCard
                  label="Total Leads Lost"
                  val={boCardsData.salesLost.length}
                  theme="red"
                  trendText="Closed / Lost"
                  lensLabel="TELE 85mm"
                  chartPoints={[5, 4, 6, 3, 5, 2, 4]}
                  onClick={() => setSelectedCard('sales_total_lost')}
                />
                <CameraLensStatsCard
                  label="Total Quotation Follow-up"
                  val={boCardsData.salesFollowup.length}
                  theme="gold"
                  trendText="In Negotiation"
                  lensLabel="CINE 50mm"
                  chartPoints={[12, 15, 11, 18, 14, 20, 17]}
                  onClick={() => setSelectedCard('sales_quotation_followup')}
                />
              </div>
            </div>

            {/* OPERATIONS PERFORMANCE */}
            <div className="space-y-3">
              <h3 className="text-xs font-black font-mono tracking-wider text-blue-400 uppercase">Operations Performance</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <CameraLensStatsCard
                  label="Total New Projects"
                  val={boCardsData.opsNew.length}
                  theme="blue"
                  trendText="Awaiting Allocation"
                  lensLabel="PRIME 24mm"
                  chartPoints={[6, 10, 8, 14, 12, 18, 16]}
                  onClick={() => setSelectedCard('ops_new')}
                />
                <CameraLensStatsCard
                  label="Total Completed Shoot Projects"
                  val={boCardsData.opsCompleted.length}
                  theme="green"
                  trendText="Shoots Wrapped"
                  lensLabel="PRIME 50mm"
                  chartPoints={[14, 18, 22, 28, 32, 38, 42]}
                  onClick={() => setSelectedCard('ops_completed')}
                />
                <CameraLensStatsCard
                  label="Total Upcoming Shoots"
                  val={boCardsData.opsUpcoming.length}
                  theme="cyan"
                  trendText="Scheduled Fleet"
                  lensLabel="TELE 135mm"
                  chartPoints={[8, 12, 10, 16, 14, 20, 19]}
                  onClick={() => setSelectedCard('ops_upcoming')}
                />
                <CameraLensStatsCard
                  label="Total Scheduled"
                  val={boCardsData.opsScheduled.length}
                  theme="indigo"
                  trendText="Crew Assigned"
                  lensLabel="ZOOM 24-70"
                  chartPoints={[10, 14, 12, 18, 16, 22, 21]}
                  onClick={() => setSelectedCard('ops_scheduled')}
                />
              </div>
            </div>

            {/* PRODUCTION PERFORMANCE */}
            <div className="space-y-3">
              <h3 className="text-xs font-black font-mono tracking-wider text-pink-400 uppercase">Production Performance</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <CameraLensStatsCard
                  label="Total New Projects"
                  val={boCardsData.prodNew.length}
                  theme="purple"
                  trendText="Raw Footage Ingest"
                  lensLabel="PRIME 35mm"
                  chartPoints={[5, 9, 7, 13, 11, 17, 15]}
                  onClick={() => setSelectedCard('prod_new')}
                />
                <CameraLensStatsCard
                  label="Total In Progress"
                  val={boCardsData.prodInProgress.length}
                  theme="orange"
                  trendText="Active Cutting"
                  lensLabel="V-EDIT 50"
                  chartPoints={[8, 14, 11, 19, 16, 24, 22]}
                  onClick={() => setSelectedCard('prod_inprogress')}
                />
                <CameraLensStatsCard
                  label="Total Editing Completed"
                  val={boCardsData.prodEditingCompleted.length}
                  theme="cyan"
                  trendText="Render Complete"
                  lensLabel="MASTER 85"
                  chartPoints={[12, 16, 14, 22, 20, 26, 28]}
                  onClick={() => setSelectedCard('prod_editing_completed')}
                />
                <CameraLensStatsCard
                  label="Total Client Acceptance"
                  val={boCardsData.prodClientAcceptance.length}
                  theme="green"
                  trendText="Client Approved"
                  lensLabel="RELEASE 24"
                  chartPoints={[15, 20, 18, 26, 24, 32, 35]}
                  onClick={() => setSelectedCard('prod_client_acceptance')}
                />
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
                <span>EVENT CALENDAR</span>
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

      {/* SECTION 3: ORDERS AWAITING FINAL APPROVAL / UNLOCK REQUESTS */}
      {currentSection === 'approval' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* QUOTATION UNLOCK REQUESTS */}
          {unlockRequests.length > 0 && (
            <div className="space-y-4 mb-8">
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

              <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
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
              </div>
            </div>
          )}
          
          {/* SECTION 3: ORDERS AWAITING FINAL APPROVAL */}
          {waitingApprovalOrders.length > 0 && (
            <div className="space-y-4">
              <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>ORDERS AWAITING FINAL APPROVAL</span>
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
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryOrder(order)}
                                  className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                  title="View Project History & Timeline"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span>History</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewModalOrder(order)}
                                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-black hover:bg-amber-400 transition-all cursor-pointer text-xs flex items-center gap-1.5 shadow-md"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Review</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Fallback empty state when both unlock requests and waiting approval orders are 0 */}
          {unlockRequests.length === 0 && waitingApprovalOrders.length === 0 && (
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-12 text-center space-y-3 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Pending Approvals or Requests</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                There are currently no quotation unlock requests from sales staff or orders awaiting final Business Owner approval.
              </p>
            </div>
          )}

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

      {/* CARD DETAIL POPUP/MODAL */}
      <BusinessOwnerCardDetailModal
        isOpen={selectedCard !== null}
        onClose={() => setSelectedCard(null)}
        title={modalTitleAndMeta.title}
        subtitle={`${startDate} ~ ${endDate}`}
        accentColor={modalTitleAndMeta.accentColor}
        data={modalData}
        columns={modalColumns}
        totalLabel={modalTitleAndMeta.totalLabel}
        totalValue={modalTitleAndMeta.totalValue}
        filterDescription={modalTitleAndMeta.filterDescription}
      />

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
        <UnlockRequestReviewModal 
          unlockRequestModal={unlockRequestModal}
          onClose={() => setUnlockRequestModal(null)}
          onReject={(item) => handleRejectUnlock(item)}
          onApprove={(item) => handleApproveUnlock(item)}
        />
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

      {/* UNIFIED ORDER HISTORY & TIMELINE AUDIT MODAL */}
      <OrderHistoryModal
        isOpen={selectedHistoryOrder !== null}
        onClose={() => setSelectedHistoryOrder(null)}
        order={selectedHistoryOrder}
      />

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

  // Filter state (Hidden by default)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    eventDates: true,
    deliveryDates: true,
    clientAcceptance: true,
    waitingApproval: true,
  });
  const [draftFilters, setDraftFilters] = useState({
    eventDates: true,
    deliveryDates: true,
    clientAcceptance: true,
    waitingApproval: true,
  });

  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

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

  // Filter actions
  const handleApplyFilters = () => {
    setActiveFilters(draftFilters);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    const allEnabled = {
      eventDates: true,
      deliveryDates: true,
      clientAcceptance: true,
      waitingApproval: true,
    };
    setDraftFilters(allEnabled);
    setActiveFilters(allEnabled);
  };

  // Generate Days Grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Combine events from orders & production filtered by activeFilters
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};

    orders.forEach(order => {
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

      // Check if this type of event should be shown based on activeFilters
      const shouldShowEvent =
        (typeCategory === 'event_date' && activeFilters.eventDates) ||
        (typeCategory === 'client_acceptance' && activeFilters.clientAcceptance) ||
        (typeCategory === 'waiting_approval' && activeFilters.waitingApproval);

      if (order.event_date && shouldShowEvent) {
        const dateStr = order.event_date.split('T')[0];
        if (dateStr) {
          if (!map[dateStr]) map[dateStr] = [];
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
        }
      }

      // Target delivery date event
      if ((prod?.expected_delivery_date || prod?.target_delivery_date) && activeFilters.deliveryDates) {
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
  }, [orders, production, activeFilters]);

  return (
    <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      
      {/* Calendar Header Navigation & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-zinc-850">
        <div className="flex items-center gap-3">
          <h3 className="text-base sm:text-lg font-black font-mono tracking-tight text-white">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={todayMonth}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono hover:bg-zinc-850 cursor-pointer transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Calendar Filter Dropdown Container */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                isFilterOpen
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <span>Filters</span>
              {isFilterOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            {/* Filter Panel Dropdown */}
            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-4 z-50 font-mono text-xs space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                  <span className="font-bold text-zinc-200 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-purple-400" />
                    Filter Options
                  </span>
                  {(!draftFilters.eventDates || !draftFilters.deliveryDates || !draftFilters.clientAcceptance || !draftFilters.waitingApproval) && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      Modified
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-zinc-300 hover:text-white cursor-pointer select-none py-1.5 px-2 rounded-lg hover:bg-zinc-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={draftFilters.eventDates}
                      onChange={(e) => setDraftFilters(prev => ({ ...prev, eventDates: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-500"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-xs font-medium">Event Dates</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-zinc-300 hover:text-white cursor-pointer select-none py-1.5 px-2 rounded-lg hover:bg-zinc-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={draftFilters.deliveryDates}
                      onChange={(e) => setDraftFilters(prev => ({ ...prev, deliveryDates: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-500"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="text-xs font-medium">Delivery Dates</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-zinc-300 hover:text-white cursor-pointer select-none py-1.5 px-2 rounded-lg hover:bg-zinc-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={draftFilters.clientAcceptance}
                      onChange={(e) => setDraftFilters(prev => ({ ...prev, clientAcceptance: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-medium">Client Acceptance</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-zinc-300 hover:text-white cursor-pointer select-none py-1.5 px-2 rounded-lg hover:bg-zinc-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={draftFilters.waitingApproval}
                      onChange={(e) => setDraftFilters(prev => ({ ...prev, waitingApproval: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-amber-500"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs font-medium">Waiting Approval</span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-850">
                  <button
                    onClick={handleResetFilters}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 text-xs font-mono cursor-pointer transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
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
              onClick={() => {
                if (dayEvents.length > 0) {
                  onSelectEvent({ date: fullDateStr, events: dayEvents });
                }
              }}
              className={`min-h-[70px] sm:min-h-[90px] p-1 sm:p-1.5 rounded-xl border flex flex-col justify-start transition-all overflow-hidden ${
                dayEvents.length > 0 ? 'cursor-pointer hover:border-zinc-700' : ''
              } ${
                isToday
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                  : 'bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900/80'
              }`}
            >
              <div className="w-full flex items-center justify-between shrink-0">
                <span className={`text-xs font-mono font-bold ${isToday ? 'text-amber-400 font-black' : 'text-zinc-400'}`}>
                  {dayNum}
                </span>
                {dayEvents.length > 1 && (
                  <span className="text-[8px] font-mono font-bold px-1 rounded bg-zinc-800 text-zinc-400 hidden sm:inline-block">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Cards inside the Day Cell */}
              {dayEvents.length > 0 && (
                <div className="w-full flex-1 flex flex-col justify-start gap-0.5 overflow-hidden mt-0.5 min-h-0">
                  {dayEvents.map((ev, eIdx) => {
                    const displayName = ev.eventName || ev.title || ev.customerName || 'Event';
                    return (
                      <div
                        key={ev.id || eIdx}
                        className="w-full truncate text-[8px] sm:text-[10px] leading-tight px-1 py-0.5 rounded bg-zinc-900/90 text-zinc-300 border border-zinc-800/80 font-medium text-left"
                        title={displayName}
                      >
                        {displayName}
                      </div>
                    );
                  })}
                </div>
              )}
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

  // Clickable summary card state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedPaymentHistoryOrder, setSelectedPaymentHistoryOrder] = useState<any | null>(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<any | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'all' | 'pending' | 'history'>('all');

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

      const paymentDate = pay?.payment_date || o.created_at || o.event_date;
      const paymentType = pay?.payment_type || pay?.Payment_type || (pay?.final_payment_received ? 'Final Payment' : pay?.advance_received ? 'Advance Payment' : 'Standard Payment');
      const transactionId = pay?.transaction_id || '-';

      return {
        orderId: o.order_id,
        leadId: o.lead_id,
        customerName: o.customer_name,
        eventName: o.custom_event_name || o.event_type || 'Event Photography',
        eventDate: o.event_date,
        paymentDate,
        paymentType,
        transactionId,
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

  // Filtered by Search & Date & Payment Tab
  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch = 
        r.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.eventName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDate = !startDate || !endDate || (r.eventDate >= startDate && r.eventDate <= endDate);

      let matchTab = true;
      if (paymentTab === 'pending') {
        matchTab = r.outstanding > 0 || r.paymentStatus === 'Pending' || r.paymentStatus === 'Partially Paid';
      } else if (paymentTab === 'history') {
        matchTab = r.paymentReceived > 0 || r.paymentStatus === 'Fully Paid';
      }

      return matchSearch && matchDate && matchTab;
    });
  }, [records, searchTerm, startDate, endDate, paymentTab]);

  // Totals for summary header
  const totalRevSum = useMemo(() => filtered.reduce((s, r) => s + r.totalRevenue, 0), [filtered]);
  const totalRecSum = useMemo(() => filtered.reduce((s, r) => s + r.paymentReceived, 0), [filtered]);
  const totalOutSum = useMemo(() => filtered.reduce((s, r) => s + r.outstanding, 0), [filtered]);
  const completedCount = useMemo(() => filtered.filter(r => r.isCompleted || r.isClosed).length, [filtered]);
  const closedCount = useMemo(() => filtered.filter(r => r.isClosed).length, [filtered]);

  // Configs for Summary Card details
  const modalData = useMemo(() => {
    if (!selectedCard) return [];
    if (selectedCard === 'summary_revenue') {
      return filtered;
    }
    if (selectedCard === 'summary_payment') {
      return filtered.filter(r => r.paymentReceived > 0);
    }
    if (selectedCard === 'summary_outstanding') {
      return filtered.filter(r => r.outstanding > 0);
    }
    if (selectedCard === 'summary_completed') {
      return filtered.filter(r => r.isCompleted || r.isClosed);
    }
    if (selectedCard === 'summary_closed') {
      return filtered.filter(r => r.isClosed);
    }
    return [];
  }, [selectedCard, filtered]);

  const modalColumns = useMemo(() => {
    const actionCol = { 
      key: 'actions', 
      label: 'Action', 
      render: (item: any) => (
        <button
          type="button"
          onClick={() => {
            const fullOrder = orders.find(o => o.order_id === item.orderId || o.lead_id === item.leadId) || item;
            setSelectedPaymentHistoryOrder(fullOrder);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
          title="View Payment Details & History"
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      )
    };

    const baseCols = [
      { key: 'orderId', label: 'Order ID', render: (item: any) => <span className="font-mono font-bold text-amber-400">{item.orderId}</span> },
      { key: 'customerName', label: 'Customer Name', render: (item: any) => <span className="font-bold text-white">{item.customerName}</span> },
      { key: 'eventName', label: 'Event Name', render: (item: any) => <span>{item.eventName}</span> },
      { key: 'eventDate', label: 'Event Date', render: (item: any) => <span className="font-mono text-zinc-400">{item.eventDate ? item.eventDate.split('T')[0] : 'N/A'}</span> }
    ];

    if (selectedCard === 'summary_revenue') {
      return [
        ...baseCols,
        { key: 'totalRevenue', label: 'Total Revenue', render: (item: any) => <span className="font-mono text-emerald-400 font-bold">{formatINR(item.totalRevenue)}</span> },
        { key: 'paymentReceived', label: 'Received', render: (item: any) => <span className="font-mono text-zinc-300">{formatINR(item.paymentReceived)}</span> },
        { key: 'outstanding', label: 'Outstanding', render: (item: any) => <span className="font-mono text-rose-400">{formatINR(item.outstanding)}</span> },
        { key: 'paymentStatus', label: 'Payment Status', render: (item: any) => (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            item.paymentStatus === 'Fully Paid'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : item.paymentStatus === 'Partially Paid'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {item.paymentStatus}
          </span>
        )},
        actionCol
      ];
    }
    if (selectedCard === 'summary_payment') {
      return [
        { key: 'orderId', label: 'Order ID', render: (item: any) => <span className="font-mono font-bold text-amber-400">{item.orderId}</span> },
        { key: 'customerName', label: 'Customer Name', render: (item: any) => <span className="font-bold text-white">{item.customerName}</span> },
        { key: 'eventName', label: 'Event Name', render: (item: any) => <span>{item.eventName}</span> },
        { key: 'paymentDate', label: 'Payment Date', render: (item: any) => <span className="font-mono text-zinc-300">{item.paymentDate ? item.paymentDate.split('T')[0] : 'N/A'}</span> },
        { key: 'paymentType', label: 'Payment Type', render: (item: any) => <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-mono">{item.paymentType || 'Standard'}</span> },
        { key: 'paymentReceived', label: 'Payment Received', render: (item: any) => <span className="font-mono text-emerald-400 font-bold">{formatINR(item.paymentReceived)}</span> },
        { key: 'transactionId', label: 'Transaction / Ref', render: (item: any) => <span className="font-mono text-zinc-400 text-[10px]">{item.transactionId || '-'}</span> },
        { key: 'paymentStatus', label: 'Payment Status', render: (item: any) => (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            item.paymentStatus === 'Fully Paid'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : item.paymentStatus === 'Partially Paid'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {item.paymentStatus}
          </span>
        )},
        actionCol
      ];
    }
    if (selectedCard === 'summary_outstanding') {
      return [
        ...baseCols,
        { key: 'totalRevenue', label: 'Total Revenue', render: (item: any) => <span className="font-mono text-zinc-400">{formatINR(item.totalRevenue)}</span> },
        { key: 'paymentReceived', label: 'Received', render: (item: any) => <span className="font-mono text-emerald-400">{formatINR(item.paymentReceived)}</span> },
        { key: 'outstanding', label: 'Outstanding Balance', render: (item: any) => <span className="font-mono text-rose-400 font-bold">{formatINR(item.outstanding)}</span> },
        { key: 'paymentStatus', label: 'Payment Status', render: (item: any) => (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            item.paymentStatus === 'Fully Paid'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : item.paymentStatus === 'Partially Paid'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {item.paymentStatus}
          </span>
        )},
        actionCol
      ];
    }
    if (selectedCard === 'summary_completed' || selectedCard === 'summary_closed') {
      return [
        ...baseCols,
        { key: 'totalRevenue', label: 'Total Revenue', render: (item: any) => <span className="font-mono text-emerald-400">{formatINR(item.totalRevenue)}</span> },
        { key: 'paymentReceived', label: 'Received', render: (item: any) => <span className="font-mono text-zinc-300">{formatINR(item.paymentReceived)}</span> },
        { key: 'currentStage', label: 'Current Stage', render: (item: any) => <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-850 font-bold font-mono text-[10px] text-zinc-300">{item.currentStage || 'Completed'}</span> },
        actionCol
      ];
    }
    return [];
  }, [selectedCard, orders]);

  const modalTitleAndMeta = useMemo(() => {
    switch (selectedCard) {
      case 'summary_revenue':
        return {
          title: 'Summary: Total Revenue',
          totalLabel: 'Total Revenue Sum',
          totalValue: formatINR(totalRevSum),
          accentColor: 'blue' as const,
          filterDescription: 'This list displays all summary orders active within the selected parameters, contributing to the Total Revenue.'
        };
      case 'summary_payment':
        return {
          title: 'Summary: Payment Received & Collections',
          totalLabel: 'Total Received Sum',
          totalValue: formatINR(totalRecSum),
          accentColor: 'emerald' as const,
          filterDescription: 'This list displays all payments received, transaction collections, and deposits for active orders.'
        };
      case 'summary_outstanding':
        return {
          title: 'Summary: Outstanding Balances',
          totalLabel: 'Total Outstanding Balance',
          totalValue: formatINR(totalOutSum),
          accentColor: 'rose' as const,
          filterDescription: 'This list displays all summary orders that currently have a positive outstanding balance.'
        };
      case 'summary_completed':
        return {
          title: 'Summary: Completed Orders',
          totalLabel: 'Completed Projects Count',
          totalValue: `${completedCount} Projects`,
          accentColor: 'amber' as const,
          filterDescription: 'This list displays all projects that have been successfully completed, delivered, or accepted by clients.'
        };
      case 'summary_closed':
        return {
          title: 'Summary: Closed Orders',
          totalLabel: 'Closed Projects Count',
          totalValue: `${closedCount} Projects`,
          accentColor: 'blue' as const,
          filterDescription: 'This list displays all projects that have been fully closed and archived.'
        };
      default:
        return {
          title: 'Detail View',
          totalLabel: 'Total',
          totalValue: '0',
          accentColor: 'amber' as const,
          filterDescription: ''
        };
    }
  }, [selectedCard, totalRevSum, totalRecSum, totalOutSum, completedCount, closedCount]);

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
            <span>REVENUE & PAYMENT SUMMARY</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Summary financial breakdown, search records, and downloadable executive reports.
          </p>
        </div>

        {/* Filter / Download Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showFilters ? 'border-amber-500/40 text-amber-400 bg-amber-500/5' : 'border-zinc-800 text-zinc-400'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter / Download</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Highlights Row */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <CameraLensStatsCard
          label="Total Revenue"
          val={totalRevSum}
          isCurrency={true}
          currencyFormatter={formatINR}
          theme="blue"
          trendText="Gross Value"
          lensLabel="PRIME 50mm"
          chartPoints={[25, 35, 30, 45, 40, 55, 60]}
          onClick={() => setSelectedCard('summary_revenue')}
        />
        <CameraLensStatsCard
          label="Payment Received"
          val={totalRecSum}
          isCurrency={true}
          currencyFormatter={formatINR}
          theme="emerald"
          trendText="Collections"
          lensLabel="CINE 35mm"
          chartPoints={[20, 28, 25, 38, 35, 48, 52]}
          onClick={() => setSelectedCard('summary_payment')}
        />
        <CameraLensStatsCard
          label="Outstanding"
          val={totalOutSum}
          isCurrency={true}
          currencyFormatter={formatINR}
          theme="red"
          trendText="Balance Due"
          lensLabel="TELE 85mm"
          chartPoints={[15, 12, 18, 14, 10, 12, 8]}
          onClick={() => setSelectedCard('summary_outstanding')}
        />
        <CameraLensStatsCard
          label="Completed"
          val={completedCount}
          theme="amber"
          trendText="Projects Wrapped"
          lensLabel="PRIME 24mm"
          chartPoints={[10, 15, 12, 20, 18, 25, 28]}
          onClick={() => setSelectedCard('summary_completed')}
        />
        <CameraLensStatsCard
          label="Closed Orders"
          val={closedCount}
          theme="indigo"
          trendText="Settled Orders"
          lensLabel="TELE 135mm"
          chartPoints={[8, 12, 10, 16, 15, 22, 24]}
          onClick={() => setSelectedCard('summary_closed')}
        />
      </div>

      {showFilters && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Download Buttons Bar */}
          <div className="flex flex-wrap items-center justify-end gap-2 bg-zinc-950/20 border border-zinc-900 p-3 rounded-xl">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mr-2">Download:</span>
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

          {/* Filter & Search Bar */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Subtab Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setPaymentTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                  paymentTab === 'all'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Records
              </button>
              <button
                type="button"
                onClick={() => setPaymentTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                  paymentTab === 'pending'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pending Payments
              </button>
              <button
                type="button"
                onClick={() => setPaymentTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                  paymentTab === 'history'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Payment History
              </button>
            </div>

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
        </div>
      )}

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
                <th className="py-3 px-4">Current Stage</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-500">
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
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedPaymentHistoryOrder(r)}
                        className="text-emerald-400 font-bold hover:text-emerald-300 hover:underline transition-colors focus:outline-none"
                      >
                        {formatINR(r.paymentReceived)}
                      </button>
                    </td>
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
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                        {r.currentStage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const fullOrder = orders.find(o => o.order_id === r.orderId || o.lead_id === r.leadId) || r;
                          setSelectedPaymentHistoryOrder(fullOrder);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
                        title="View Payment Details & History"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARD DETAIL POPUP/MODAL */}
      <BusinessOwnerCardDetailModal
        isOpen={selectedCard !== null && selectedCard.startsWith('summary_')}
        onClose={() => setSelectedCard(null)}
        title={modalTitleAndMeta.title}
        subtitle={`${startDate} ~ ${endDate}`}
        accentColor={modalTitleAndMeta.accentColor}
        data={modalData}
        columns={modalColumns}
        totalLabel={modalTitleAndMeta.totalLabel}
        totalValue={modalTitleAndMeta.totalValue}
        filterDescription={modalTitleAndMeta.filterDescription}
      />

      {/* PAYMENT HISTORY MODAL */}
      <PaymentHistoryModal
        isOpen={selectedPaymentHistoryOrder !== null}
        onClose={() => setSelectedPaymentHistoryOrder(null)}
        order={selectedPaymentHistoryOrder}
        payments={payments}
        orders={orders}
        leads={leads}
      />

      {/* ORDER HISTORY & TIMELINE AUDIT MODAL */}
      <OrderHistoryModal
        isOpen={selectedHistoryOrder !== null}
        onClose={() => setSelectedHistoryOrder(null)}
        order={selectedHistoryOrder}
      />

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
  onApprove: () => Promise<void> | void;
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
  const { editorAssignments, quotations } = useRole();
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const handleApproveSubmit = async () => {
    if (isApproving) return;
    setIsApproving(true);
    setApproveError(null);
    try {
      await onApprove();
      // Auto-close is handled by parent resetting the modal order state
    } catch (err: any) {
      setApproveError(err.message || "Database update failed");
      setIsApproving(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.minHeight = '';
      document.body.style.position = '';
      document.body.style.padding = '';
      document.body.style.margin = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.minHeight = '';
    };
  }, []);

  const lead = leads.find(l => l.lead_id === order.lead_id);
  const prod = production.find(p => p.tracking_id === order.lead_id || p.order_id === order.lead_id || p.tracking_id === order.order_id);
  const pay = payments.find(p => p.order_id === order.order_id || p.lead_id === order.lead_id);

  const customerMobile = order.customer_phone || order.mobile || lead?.phone || lead?.mobile || pay?.customer_phone || 'N/A';
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
        const eMapsLink = ev.google_maps_link || order?.google_maps_link || lead?.google_maps_link || null;

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
          googleMapsLink: eMapsLink,
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
    const eMapsLink = order?.google_maps_link || lead?.google_maps_link || null;

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
      googleMapsLink: eMapsLink,
      deliverables: delivs,
      assignments: orderAssignments
    }];
  }, [order, lead, prod, editorAssignments]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-zinc-850 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                Business Owner Review
              </span>
              <span className="text-xs font-mono text-zinc-500 truncate">Order ID: {order.order_id}</span>
            </div>
            <h2 className="text-xl font-black text-white">
              Final Approval & Order Review
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 hidden sm:block">
              Review completed workflow and client acceptance before closing this order.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
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
              <span className="text-[10px] font-mono text-zinc-500 uppercase hidden sm:block">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2 md:col-span-1">
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
                      <span className="text-zinc-200 font-mono">{formatTime12Hour(ev.eventTime)}</span>
                    </div>
                    <div className="sm:col-span-2 md:col-span-3">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold mb-1">Event Location / Google Maps Link</span>
                      {ev.googleMapsLink ? (
                        <a 
                          href={ev.googleMapsLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate max-w-[200px] sm:max-w-xs">Open Google Maps</span>
                        </a>
                      ) : (
                        <span className="text-zinc-200 font-mono truncate block" title={ev.eventLocation}>
                          {ev.eventLocation && ev.eventLocation !== 'N/A' ? ev.eventLocation : 'N/A'}
                        </span>
                      )}
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
        </div>

        {/* Modal Action Bar */}
        <div className="p-4 sm:p-6 pt-4 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-zinc-950 rounded-b-2xl">
          <p className="text-xs text-zinc-500 text-center sm:text-left">
            {isBusinessOwner ? (
              <>Confirms final verification. The order status will automatically update to <strong className="text-emerald-400">Order Closed</strong>.</>
            ) : (
              <span className="text-amber-400 font-bold">Only the Business Owner role can close orders.</span>
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto relative">
            {approveError && (
              <div className="absolute bottom-[calc(100%+24px)] right-0 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold text-center flex items-center justify-center gap-2 z-10 w-full sm:w-max max-w-sm whitespace-normal shadow-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>ORDER CLOSE FAILED: {approveError}</span>
              </div>
            )}
            <button
              onClick={onClose}
              disabled={isApproving}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            {isBusinessOwner && onReject && (
              <button
                onClick={onReject}
                disabled={isApproving}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-all cursor-pointer flex justify-center items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Reject Back to Production</span>
              </button>
            )}

            {isBusinessOwner && (
              <button
                onClick={handleApproveSubmit}
                disabled={isApproving}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all cursor-pointer shadow-lg flex justify-center items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Approving & Closing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve & Close Order</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

/* ============================================================================
   UNLOCK REQUEST REVIEW MODAL
   ============================================================================ */
interface UnlockRequestReviewModalProps {
  unlockRequestModal: any;
  onClose: () => void;
  onReject: (item: any) => void;
  onApprove: (item: any) => void;
}

const UnlockRequestReviewModal: React.FC<UnlockRequestReviewModalProps> = ({
  unlockRequestModal,
  onClose,
  onReject,
  onApprove
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.minHeight = '';
      document.body.style.position = '';
      document.body.style.padding = '';
      document.body.style.margin = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.minHeight = '';
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/85 z-[200] flex items-center justify-center p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-sans">
            <Ban className="w-4 h-4 text-amber-500" /> Review Quotation Unlock
          </h4>
          <button 
            onClick={onClose}
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
            onClick={onClose}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer text-xs font-bold transition-colors border-0"
          >
            Cancel
          </button>
          <button
            onClick={() => onReject(unlockRequestModal)}
            className="px-3 py-2 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-900/50 rounded-xl cursor-pointer text-xs font-bold transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(unlockRequestModal)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer text-xs font-bold shadow-lg transition-colors border-0"
          >
            Approve Unlock
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ============================================================================
   CALENDAR EVENT DETAIL MODAL (READ-ONLY TABLE)
   ============================================================================ */
interface CalendarEventDetailModalProps {
  event: any;
  onClose: () => void;
  onReviewAndClose: (orderObj: Order) => void;
}

const CalendarEventDetailModal: React.FC<CalendarEventDetailModalProps> = ({
  event,
  onClose
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.minHeight = '';
      document.body.style.position = '';
      document.body.style.padding = '';
      document.body.style.margin = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.minHeight = '';
    };
  }, []);

  if (typeof document === 'undefined') return null;

  const eventList: any[] = event?.events ? event.events : [event];
  const dateStr = event?.date || eventList[0]?.eventDate || '';

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl p-5 md:p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-850 shrink-0">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
              EVENT DETAILS
            </span>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5 font-mono">
              {dateStr || 'Selected Date'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg select-none">
              {eventList.length} EVENTS
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Read-Only Table */}
        <div className="overflow-y-auto flex-1">
          <div className="overflow-x-auto w-full border border-zinc-850 rounded-xl bg-zinc-900/40">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/90 text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-bold">
                  <th className="p-3.5 pl-4">Event Name</th>
                  <th className="p-3.5">Event Date</th>
                  <th className="p-3.5">Event Time</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-4">Target Delivery Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60 text-xs font-sans">
                {eventList.map((ev, idx) => {
                  const evName = ev.eventName || ev.rawOrder?.custom_event_name || ev.title || 'Event';
                  const evDate = ev.eventDate || ev.rawOrder?.event_date || dateStr;
                  const evTime = ev.rawOrder?.event_time || '10:00 AM';
                  const custName = ev.customerName || ev.rawOrder?.customer_name || '—';
                  const status = ev.currentStatus || ev.rawOrder?.current_stage || 'Active';
                  const targetDel = ev.rawProd?.target_delivery_date || ev.rawProd?.expected_delivery_date || ev.rawOrder?.delivery_target_date || '—';

                  return (
                    <tr 
                      key={ev.id || idx}
                      className="bg-zinc-950/20 select-text"
                    >
                      <td className="p-3.5 pl-4 font-bold text-zinc-100">
                        {evName}
                      </td>
                      <td className="p-3.5 font-mono text-zinc-300">
                        {evDate}
                      </td>
                      <td className="p-3.5 font-mono text-zinc-300">
                        {formatTime12Hour(evTime)}
                      </td>
                      <td className="p-3.5 text-zinc-200 font-medium">
                        {custName}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-zinc-850 text-amber-400 border border-zinc-750">
                          {status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 font-mono font-bold text-pink-400">
                        {targetDel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};


