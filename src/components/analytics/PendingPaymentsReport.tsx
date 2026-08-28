import React, { useState, useMemo, useEffect } from 'react';
import { useRole } from '../RoleContext';
import { 
  DollarSign, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  HelpCircle,
  FileText,
  Percent,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { EVENT_TYPES } from '../../types';
import { formatDateDDMMYY, formatTime12Hour } from '../../utils';

export const PendingPaymentsReport: React.FC = () => {
  const { leads, orders, payments, currentUserName, recordPayment } = useRole();

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');

  // Modal State for Payment Update
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalRecord, setPaymentModalRecord] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>( '');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [transactionIdInput, setTransactionIdInput] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentType, setPaymentType] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewDetailsRecord, setViewDetailsRecord] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState('');

  useEffect(() => {
    const handleClose = () => {
      setShowPaymentModal(false);
      setShowDetailsModal(false);
    };
    window.addEventListener('close-all-popups', handleClose);
    return () => window.removeEventListener('close-all-popups', handleClose);
  }, []);
  
  // Modal level feedback states
  const [modalSuccessMsg, setModalSuccessMsg] = useState('');
  const [modalErrorMsg, setModalErrorMsg] = useState('');

  // Parse event date robustly and compute overdue days
  const getOverdueDays = (eventDateStr: string, remainingAmount: number) => {
    if (!eventDateStr || remainingAmount <= 0) return 0;
    const clean = eventDateStr.split('T')[0].trim();
    const parts = clean.split('-');
    if (parts.length !== 3) return 0;
    const ey = parseInt(parts[0], 10);
    const em = parseInt(parts[1], 10);
    const ed = parseInt(parts[2], 10);
    const eventDate = new Date(ey, em - 1, ed);
    eventDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today <= eventDate) {
      return 0; // Not overdue
    }

    const diffTime = today.getTime() - eventDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format date cleanly and timezone-safely e.g. "2026-08-20" -> "20 Aug 2026"
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === '—' || dateStr === 'null' || dateStr === 'undefined') return 'N/A';
    const clean = dateStr.split('T')[0].trim();
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const yyyy = parts[0];
      const mm = parseInt(parts[1], 10);
      const dd = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (mm >= 1 && mm <= 12 && !isNaN(dd)) {
        return `${dd} ${months[mm - 1]} ${yyyy}`;
      }
    }
    if (clean.includes('/') || (clean.includes('-') && clean.split('-')[0].length <= 2)) {
      const sep = clean.includes('/') ? '/' : '-';
      const subParts = clean.split(sep);
      if (subParts.length === 3) {
        const dd = parseInt(subParts[0], 10);
        const mm = parseInt(subParts[1], 10);
        const yyyy = subParts[2];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (mm >= 1 && mm <= 12 && !isNaN(dd)) {
          return `${dd} ${months[mm - 1]} ${yyyy}`;
        }
      }
    }
    return clean;
  };
  
  // Start date default: 3 months ago to 1 year ahead
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  }, []);

  const defaultEndDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 12);
    return d.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [showFilters, setShowFilters] = useState(false);

  // Card click active selector
  const [activeCardFilter, setActiveCardFilter] = useState<'All' | 'Pending' | 'Partial' | 'Overdue' | 'Upcoming' | 'Average'>('All');

  // Format currency in INR style
  const formatPercentageOrINR = (amount: number, isPercentage = false) => {
    if (isPercentage) return `${amount.toFixed(1)}%`;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Compile real-time pending payment records from Supabase tables: leads & lead_events
  const allPendingRecords = useMemo(() => {
    const TODAY_STR = new Date().toISOString().split('T')[0];

    return (leads || []).map(lead => {
      const order = orders.find(o => o.lead_id === lead.lead_id);
      const payment = order ? payments.find(p => p.order_id === order.order_id) : null;
      
      const finalPackageAmount = order ? order.quotation_amount : (Number((lead as any).final_amount) || Number(lead.Final_Quotation_Amount) || Number(lead.budget) || 0);
      const advanceReceived = order ? (Number(order.advance_received) || 0) : 0;
      
      const totalPaidAmount = payment ? ((Number(payment.advance_received) || 0) + (Number(payment.final_payment_received) || 0) + (Number(payment.additional_received) || 0)) : advanceReceived;
      
      const remainingAmount = Math.max(0, finalPackageAmount - totalPaidAmount);
      const rawPaymentStatus = payment ? payment.payment_status : (advanceReceived > 0 ? (advanceReceived >= finalPackageAmount ? 'Fully Paid' : 'Partially Paid') : 'Pending');
      
      // Standardize status labels
      let paymentStatus: 'Pending' | 'Partial' | 'Fully Paid' = 'Pending';
      if (remainingAmount <= 0 && finalPackageAmount > 0) {
        paymentStatus = 'Fully Paid';
      } else if (rawPaymentStatus === 'Partially Paid' || rawPaymentStatus === 'Partial' || (totalPaidAmount > 0 && remainingAmount > 0)) {
        paymentStatus = 'Partial';
      } else if (rawPaymentStatus === 'Fully Paid') {
        paymentStatus = 'Fully Paid';
      }

      // Determine payment completion date
      let paymentCompletionDate = '';
      if (paymentStatus === 'Fully Paid') {
        if (payment?.payment_date) {
          paymentCompletionDate = payment.payment_date;
        } else {
          const orderIdStr = order?.order_id || `MOCK-${lead.lead_id.slice(-4)}`;
          const historyKey = `payment_history_${orderIdStr}`;
          const existingHistoryStr = typeof window !== 'undefined' ? localStorage.getItem(historyKey) : null;
          if (existingHistoryStr) {
            try {
              const hist = JSON.parse(existingHistoryStr);
              if (Array.isArray(hist) && hist.length > 0) {
                const lastEntry = hist[hist.length - 1];
                if (lastEntry && lastEntry.date) {
                  paymentCompletionDate = String(lastEntry.date).split('T')[0];
                }
              }
            } catch (e) {}
          }
        }
        if (!paymentCompletionDate) {
          paymentCompletionDate = (lead.updated_at || lead.created_date || TODAY_STR).split('T')[0];
        }
      }

      // Read actual confirmed order event data from lead_events (via lead.events)
      const leadEvents = (lead.events && Array.isArray(lead.events) && lead.events.length > 0)
        ? lead.events
        : (lead.event_date ? [{ event_name: lead.event_name || lead.event_type || 'Event', event_type: lead.event_type, event_date: lead.event_date }] : []);

      const primaryEvent = leadEvents[0];
      const primaryEventDate = primaryEvent?.event_date || primaryEvent?.event_start_date || lead.event_date || '';
      const eventType = leadEvents.map((e: any) => e.event_name || e.event_type).filter(Boolean).join(', ') || lead.event_type || 'Event';

      const isOverdue = primaryEventDate && primaryEventDate < TODAY_STR && remainingAmount > 0;
      
      // Get the semantic stage of the lead
      const status = lead.current_status || lead.status || 'New Lead';
      const salesStatuses = ['New Lead', 'Contacted', 'Follow Up', 'Follow-up', 'Quotation Sent', 'Negotiation', 'Lost Lead', 'Cancelled', 'Lost'];
      const opsStatuses = ['Order Confirmed', 'Operations Assigned', 'Staff Assigned', 'Event Scheduled', 'Event Completed', 'New Order Received'];
      const prodStatuses = ['Raw Footage Received', 'Editor Assigned', 'Editing Started', 'Editing In Progress', 'Internal QC Review', 'Client Review Sent', 'Internal Review', 'Client Review', 'Revision Required', 'Revision In Progress', 'Revision', 'Final Approval', 'Ready for Delivery'];
      const completedStatuses = ['Delivered', 'Completed', 'Closed', 'Project Closed', 'Project Delivered'];

      let currentStage: 'Sales' | 'Operations' | 'Production' | 'Completed' = 'Sales';
      if (completedStatuses.includes(status)) currentStage = 'Completed';
      else if (prodStatuses.includes(status)) currentStage = 'Production';
      else if (opsStatuses.includes(status)) currentStage = 'Operations';

      return {
        lead,
        order,
        payment,
        orderId: order?.order_id || `MOCK-${lead.lead_id.slice(-4)}`,
        customerName: lead.customer_name,
        mobileNumber: lead.mobile,
        eventType,
        eventDate: primaryEventDate,
        events: leadEvents,
        paymentCompletionDate,
        finalPackageAmount,
        advanceReceived,
        totalPaidAmount,
        remainingAmount,
        paymentStatus,
        isOverdue,
        currentProjectStatus: status,
        currentStage,
        lastUpdatedDate: lead.updated_at || lead.created_date,
      };
    }).filter(rec => {
      // 1. Order has reached Order Confirmed or later stage
      const isConfirmedOrder = rec.order && (rec.order.order_status === 'Confirmed' || rec.order.status === 'Confirmed');
      const isPostSalesStage = ['Operations', 'Production', 'Completed'].includes(rec.currentStage);
      const isOrderConfirmedStatus = rec.currentProjectStatus === 'Order Confirmed' || rec.currentProjectStatus === 'Confirmed';
      
      if (!isConfirmedOrder && !isPostSalesStage && !isOrderConfirmedStatus) return false;

      // 3 & 4. Exclude Cancelled and Lost
      const explicitExclusions = ['Lost', 'Cancelled', 'Lost Lead', 'New Lead', 'Contacted', 'Follow-up', 'Follow Up', 'Quotation Sent', 'Negotiation'];
      if (explicitExclusions.includes(rec.currentProjectStatus)) return false;

      // Keep fully paid orders visible in report
      return true;
    });
  }, [leads, orders, payments]);

  // Dynamically retrieve the real-time record to keep modal updated
  const currentRecord = useMemo(() => {
    if (!paymentModalRecord) return null;
    const order = orders.find(o => o.order_id === paymentModalRecord.orderId || o.lead_id === paymentModalRecord.lead.lead_id);
    const payment = order ? payments.find(p => p.order_id === order.order_id) : null;
    const lead = leads.find(l => l.lead_id === paymentModalRecord.lead.lead_id) || paymentModalRecord.lead;
    
    const finalPackageAmount = order ? order.quotation_amount : lead.budget;
    const advanceReceived = order ? (Number(order.advance_received) || 0) : 0;
    const totalPaidAmount = payment ? ((Number(payment.advance_received) || 0) + (Number(payment.final_payment_received) || 0) + (Number(payment.additional_received) || 0)) : advanceReceived;
    const remainingAmount = Math.max(0, finalPackageAmount - totalPaidAmount);
    
    return {
      finalPackageAmount,
      totalPaidAmount,
      remainingAmount
    };
  }, [allPendingRecords, paymentModalRecord, orders, payments, leads]);

  // Compute metrics for the Pending Payment Analytics Cards
  const stats = useMemo(() => {
    const totalPendingOrders = allPendingRecords.filter(r => r.remainingAmount > 0).length;
    const fullyPaidOrders = allPendingRecords.filter(r => r.paymentStatus === 'Fully Paid').length;
    const totalPendingAmount = allPendingRecords.reduce((acc, r) => acc + (r.paymentStatus === 'Fully Paid' ? 0 : r.remainingAmount), 0);
    const partialPaymentOrders = allPendingRecords.filter(r => r.paymentStatus === 'Partial').length;
    const overduePendingPayments = allPendingRecords.filter(r => r.isOverdue).length;
    const overdueAmount = allPendingRecords.filter(r => r.isOverdue).reduce((acc, r) => acc + r.remainingAmount, 0);
    const upcomingPaymentDue = allPendingRecords.filter(r => !r.isOverdue && r.remainingAmount > 0).length;
    const averageOutstandingAmount = totalPendingOrders > 0 ? totalPendingAmount / totalPendingOrders : 0;
    
    // Calculate Due Today and Due This Week
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const endOfWeek = new Date();
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

    const dueTodayAmount = allPendingRecords
      .filter(r => r.eventDate === todayStr && r.remainingAmount > 0)
      .reduce((acc, r) => acc + r.remainingAmount, 0);

    const dueThisWeekAmount = allPendingRecords
      .filter(r => r.eventDate >= todayStr && r.eventDate <= endOfWeekStr && r.remainingAmount > 0)
      .reduce((acc, r) => acc + r.remainingAmount, 0);

    return {
      totalPendingOrders,
      fullyPaidOrders,
      totalPendingAmount,
      partialPaymentOrders,
      overduePendingPayments,
      overdueAmount,
      upcomingPaymentDue,
      averageOutstandingAmount,
      dueTodayAmount,
      dueThisWeekAmount
    };
  }, [allPendingRecords]);

  // Apply filters and date ranges
  const filteredRecords = useMemo(() => {
    return allPendingRecords.filter(rec => {
      // Date filters
      if (startDate && rec.eventDate && rec.eventDate < startDate) return false;
      if (endDate && rec.eventDate && rec.eventDate > endDate) return false;

      // Search filters
      if (searchTerm && !rec.customerName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (searchOrderId && !rec.orderId.toLowerCase().includes(searchOrderId.toLowerCase())) return false;

      // Event Type Filter
      if (eventTypeFilter !== 'All' && rec.eventType !== eventTypeFilter) return false;

      // Payment Status Filter
      if (paymentStatusFilter !== 'All') {
        if (paymentStatusFilter === 'Pending' && rec.paymentStatus !== 'Pending') return false;
        if ((paymentStatusFilter === 'Partially Paid' || paymentStatusFilter === 'Partial') && rec.paymentStatus !== 'Partial') return false;
        if (paymentStatusFilter === 'Fully Paid' && rec.paymentStatus !== 'Fully Paid') return false;
      }

      // Card Click Filter (interactive filter feedback)
      if (activeCardFilter === 'Pending' && rec.paymentStatus !== 'Pending') return false;
      if (activeCardFilter === 'Partial' && rec.paymentStatus !== 'Partial') return false;
      if (activeCardFilter === 'Overdue' && !rec.isOverdue) return false;
      if (activeCardFilter === 'Upcoming' && (rec.isOverdue || rec.remainingAmount <= 0)) return false;

      return true;
    });
  }, [allPendingRecords, startDate, endDate, searchTerm, searchOrderId, eventTypeFilter, paymentStatusFilter, activeCardFilter]);

  // Unique event types for dropdown
  const uniqueEventTypes = useMemo(() => {
    const types = new Set<string>(EVENT_TYPES);
    allPendingRecords.forEach(r => {
      if (r.eventType) types.add(r.eventType);
    });
    return Array.from(types);
  }, [allPendingRecords]);

  // Handle analytical card clicks
  const handleCardClick = (cardType: 'All' | 'Pending' | 'Partial' | 'Overdue' | 'Upcoming' | 'Average') => {
    if (activeCardFilter === cardType) {
      setActiveCardFilter('All'); // Toggle off
    } else {
      setActiveCardFilter(cardType);
    }
  };

  // Export functions (PDF, CSV, Excel, Print)
  const downloadCSV = () => {
    const headers = ['Order ID', 'Customer Name', 'Mobile Number', 'Event Type', 'Event Date', 'Completion Date', 'Final Package Amount', 'Total Paid Amount', 'Remaining Amount', 'Payment Status', 'Project Status', 'Last Updated'];
    const rows = filteredRecords.map(r => {
      const formattedEvDate = r.events && r.events.length > 1
        ? r.events.map((e: any) => `${e.event_name || e.event_type || 'Event'}: ${formatEventDate(e.event_date || e.event_start_date)}`).join(' | ')
        : formatEventDate(r.eventDate);
      return [
        r.orderId,
        r.customerName,
        r.mobileNumber,
        r.eventType,
        formattedEvDate,
        r.paymentStatus === 'Fully Paid' ? (r.paymentCompletionDate ? formatEventDate(r.paymentCompletionDate) : 'Completed') : 'N/A',
        r.finalPackageAmount,
        r.totalPaidAmount,
        r.paymentStatus === 'Fully Paid' ? 0 : r.remainingAmount,
        r.paymentStatus === 'Fully Paid' ? 'Fully Paid' : (r.paymentStatus === 'Partial' ? 'Partially Paid' : 'Pending'),
        r.currentProjectStatus,
        formatDateDDMMYY(r.lastUpdatedDate)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pending_Payments_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcelMock = () => {
    // Generate simple tab-separated content mimicking XLS format
    let excelContent = "Order ID\tCustomer Name\tMobile Number\tEvent Type\tEvent Date\tCompletion Date\tFinal Package Amount\tTotal Paid Amount\tRemaining Amount\tPayment Status\tProject Status\tLast Updated\n";
    filteredRecords.forEach(r => {
      const statusStr = r.paymentStatus === 'Fully Paid' ? 'Fully Paid' : (r.paymentStatus === 'Partial' ? 'Partially Paid' : 'Pending');
      const compDateStr = r.paymentStatus === 'Fully Paid' ? (r.paymentCompletionDate ? formatEventDate(r.paymentCompletionDate) : 'Completed') : 'N/A';
      const formattedEvDate = r.events && r.events.length > 1
        ? r.events.map((e: any) => `${e.event_name || e.event_type || 'Event'}: ${formatEventDate(e.event_date || e.event_start_date)}`).join(' | ')
        : formatEventDate(r.eventDate);
      excelContent += `${r.orderId}\t${r.customerName}\t${r.mobileNumber}\t${r.eventType}\t${formattedEvDate}\t${compDateStr}\t${r.finalPackageAmount}\t${r.totalPaidAmount}\t${r.paymentStatus === 'Fully Paid' ? 0 : r.remainingAmount}\t${statusStr}\t${r.currentProjectStatus}\t${formatDateDDMMYY(r.lastUpdatedDate)}\n`;
    });

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Pending_Payments_Report_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDFReport = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Dark carbon header block
    doc.setFillColor(18, 18, 22);
    doc.rect(0, 0, 297, 35, 'F');

    // Bottom gold line
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 34, 297, 1, 'F');

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(212, 175, 55);
    doc.text('PHOTOCREW PICTURES', 15, 14);

    doc.setFontSize(11);
    doc.setTextColor(230, 230, 230);
    doc.text('PENDING & FULLY PAID PAYMENTS REPORT', 15, 21);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated By: ${currentUserName} | Date: ${formatDateDDMMYY(new Date())}`, 15, 28);

    doc.setTextColor(212, 175, 55);
    doc.text(`Active Filters: Dates [${startDate || 'All'} to ${endDate || 'All'}] | Status [${paymentStatusFilter}]`, 180, 28);

    // List Headers
    let currentY = 48;
    doc.setFillColor(243, 244, 246);
    doc.rect(10, currentY, 277, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text('Order ID', 12, currentY + 5.5);
    doc.text('Customer Name', 38, currentY + 5.5);
    doc.text('Mobile', 88, currentY + 5.5);
    doc.text('Event Type', 115, currentY + 5.5);
    doc.text('Event Date', 150, currentY + 5.5);
    doc.text('Package Cost', 180, currentY + 5.5);
    doc.text('Total Paid', 210, currentY + 5.5);
    doc.text('Balance Due', 240, currentY + 5.5);
    doc.text('Status', 270, currentY + 5.5);

    currentY += 8;

    doc.setLineWidth(0.1);
    doc.setDrawColor(200, 200, 200);

    doc.setFont('helvetica', 'normal');
    
    // Draw records
    filteredRecords.forEach((rec, idx) => {
      if (currentY > 185) {
        doc.addPage();
        currentY = 20;
        doc.setFillColor(18, 18, 22);
        doc.rect(0, 0, 297, 8, 'F');
        currentY += 8;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(10, currentY, 277, 7, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.text(rec.orderId, 12, currentY + 5);
      
      const customerShort = rec.customerName.length > 24 ? rec.customerName.slice(0, 22) + '..' : rec.customerName;
      doc.text(customerShort, 38, currentY + 5);
      doc.text(rec.mobileNumber, 88, currentY + 5);
      doc.text(rec.eventType, 115, currentY + 5);
      doc.text(formatEventDate(rec.eventDate), 150, currentY + 5);
      
      doc.text(`INR ${rec.finalPackageAmount.toLocaleString('en-IN')}`, 180, currentY + 5);
      doc.text(`INR ${rec.totalPaidAmount.toLocaleString('en-IN')}`, 210, currentY + 5);
      
      doc.setFont('helvetica', 'bold');
      if (rec.paymentStatus === 'Fully Paid') {
        doc.setTextColor(16, 185, 129); // emerald for fully paid
        doc.text('INR 0', 240, currentY + 5);
      } else {
        doc.setTextColor(185, 28, 28); // red for outstanding
        doc.text(`INR ${rec.remainingAmount.toLocaleString('en-IN')}`, 240, currentY + 5);
      }
      
      doc.setFont('helvetica', 'normal');
      if (rec.paymentStatus === 'Fully Paid') {
        doc.setTextColor(16, 185, 129); // emerald
        doc.text('Fully Paid', 270, currentY + 5);
      } else if (rec.paymentStatus === 'Partial') {
        doc.setTextColor(180, 83, 9); // amber
        doc.text('Partially Paid', 270, currentY + 5);
      } else {
        doc.setTextColor(185, 28, 28); // red
        doc.text('Pending', 270, currentY + 5);
      }

      doc.line(10, currentY + 7, 287, currentY + 7);
      currentY += 7;
    });

    // Drawing Summary Box
    currentY += 5;
    if (currentY > 180) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(243, 244, 246);
    doc.rect(180, currentY, 107, 24, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(180, currentY, 107, 24, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REPORT SUMMARY', 185, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.text(`Total Records Selected: ${filteredRecords.length}`, 185, currentY + 13);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    const sumVal = filteredRecords.reduce((ax, rx) => ax + (rx.paymentStatus === 'Fully Paid' ? 0 : rx.remainingAmount), 0);
    doc.text(`Total Outstanding Balance: INR ${sumVal.toLocaleString('en-IN')}`, 185, currentY + 20);

    doc.save(`Pending_Payments_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              Pending Payment Report
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Dedicated secure database workflow for tracking customer outstanding accounts, partial payment backlogs, and real-time invoice collections.
          </p>
        </div>

        {/* Real-time sync tracker badge */}
        <div className="flex items-center gap-2 self-start bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
            leads database synchronized
          </span>
        </div>
      </div>

      {updateSuccessMsg && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 p-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{updateSuccessMsg}</span>
          </div>
          <button onClick={() => setUpdateSuccessMsg('')} className="text-emerald-500 hover:text-emerald-300 transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* Pending Payment Analytics Cards (Photocrew Lens-Inspired layout) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Card 1: Total Pending Orders */}
        <div 
          onClick={() => handleCardClick('All')}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
            activeCardFilter === 'All'
              ? 'bg-gradient-to-br from-zinc-850 to-zinc-900 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-750'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Total Pending Amount</span>
            <DollarSign className={`w-4 h-4 ${activeCardFilter === 'All' ? 'text-amber-500' : 'text-zinc-500'}`} />
          </div>
          <p className="text-2xl font-extrabold text-white tracking-tight leading-none mb-1">
            {formatPercentageOrINR(stats.totalPendingAmount)}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            {stats.totalPendingOrders} PENDING INVOICES
          </p>
          {activeCardFilter === 'All' && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-amber-500 rounded-tl-md" />
          )}
        </div>

        {/* Card 2: Overdue Amount */}
        <div 
          onClick={() => handleCardClick('Overdue')}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
            activeCardFilter === 'Overdue'
              ? 'bg-gradient-to-br from-zinc-850 to-zinc-900 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-750'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Overdue Amount</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-extrabold text-rose-500 tracking-tight leading-none mb-1">
            {formatPercentageOrINR(stats.overdueAmount)}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            AF CONTINUOUS • CINE 35mm
          </p>
          {activeCardFilter === 'Overdue' && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-amber-500 rounded-tl-md" />
          )}
        </div>

        {/* Card 3: Payments Due Today */}
        <div 
          onClick={() => handleCardClick('Upcoming')}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden bg-zinc-900/40 border-zinc-800 hover:border-zinc-750`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Due Today</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-500 tracking-tight leading-none mb-1">
            {formatPercentageOrINR(stats.dueTodayAmount)}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            SAME DAY COLLECTION TARGET
          </p>
        </div>

        {/* Card 4: Payments Due This Week */}
        <div 
          onClick={() => handleCardClick('Upcoming')}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden bg-zinc-900/40 border-zinc-800 hover:border-zinc-750`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Due This Week</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-blue-400 tracking-tight leading-none mb-1">
            {formatPercentageOrINR(stats.dueThisWeekAmount)}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            WEEKLY COLLECTION PIPELINE
          </p>
        </div>

      </div>

      <div className="flex justify-end mb-4">
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

      {showFilters && (
        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-2 text-white font-mono text-[10px] uppercase font-black tracking-wider border-b border-zinc-800 md:border-none pb-2 md:pb-0">
            <Filter className="w-4 h-4 text-amber-500" />
            <span>REPORT WORKSPACE CONFIGURATION</span>
          </div>

          {/* Action Downloads Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              id="btn_download_pdf"
              onClick={downloadPDFReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-600 rounded-xl transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-rose-450" />
              <span>Download PDF</span>
            </button>
            <button 
              id="btn_download_excel"
              onClick={downloadExcelMock}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-600 rounded-xl transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-450" />
              <span>Download Excel</span>
            </button>
            <button 
              id="btn_download_csv"
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-600 rounded-xl transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-450" />
              <span>Download CSV</span>
            </button>
            <button 
              id="btn_print_report"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-600 rounded-xl transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Print Report</span>
            </button>
          </div>

        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
          
          <div>
            <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400 mb-1.5">Start Date</label>
            <div className="relative">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400 mb-1.5">End Date</label>
            <div className="relative">
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400 mb-1.5">Search Customer</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-600" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400 mb-1.5">Search Order ID</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="OR..."
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-600" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400 mb-1.5">Event Type</label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            >
              <option value="All">All Event Types</option>
              {uniqueEventTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400 mb-1.5">Payment Status</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Fully Paid">Fully Paid</option>
            </select>
          </div>

        </div>

        {/* Clear active filter tag bar */}
        {activeCardFilter !== 'All' && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 px-3.5 py-2 rounded-xl text-xs text-amber-350 justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Filtering records by active card: <strong>{activeCardFilter} Payments</strong></span>
            </span>
            <button 
              onClick={() => setActiveCardFilter('All')}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 px-2 py-0.5 rounded text-[10px] uppercase font-black font-mono cursor-pointer transition"
            >
              Clear Filter Click
            </button>
          </div>
        )}

      </div>
      )}

      {/* Main Datatable */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-850 flex items-center justify-between">
          <span className="text-xs uppercase font-mono font-extrabold tracking-widest text-zinc-400">
            PAYMENT ACCOUNT CORES
          </span>
          <span className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono uppercase font-black tracking-wider text-zinc-400 px-2.5 py-1 rounded-lg">
            Active Records displayed: {filteredRecords.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-zinc-850 bg-zinc-900/30">
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-left">Order ID</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-left">Client Name</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-left">Event Details</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-right">Total Amount</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-right">Paid Amount</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-rose-450 font-mono text-right">Pending Amount</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-center">Event Date</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-emerald-400 font-mono text-center">Completion Date</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-center">Overdue Since</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-center">Days Overdue</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-center">Payment Status</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-center">Project Status</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-zinc-500 font-medium">
                    <AlertTriangle className="w-8 h-8 text-zinc-750 mx-auto mb-2" />
                    <span>No payments fit the selected parameters.</span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, i) => {
                  const daysOverdue = getOverdueDays(rec.eventDate, rec.remainingAmount);
                  const formattedEventDate = formatEventDate(rec.eventDate);

                  return (
                  <tr 
                    key={rec.lead.lead_id}
                    className="border-b border-zinc-850 hover:bg-zinc-900/10 transition-colors"
                  >
                    {/* Order ID */}
                    <td className="px-4 py-4 text-xs font-mono font-medium text-zinc-300">
                      {rec.orderId}
                    </td>

                    {/* Client Name */}
                    <td className="px-4 py-4 text-xs font-bold text-white">
                      {rec.customerName}
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{rec.mobileNumber}</div>
                    </td>

                    {/* Event Details */}
                    <td className="px-4 py-4 text-xs">
                      {rec.events && rec.events.length > 1 ? (
                        <div className="space-y-1">
                          {rec.events.map((ev: any, idx: number) => (
                            <div key={ev.id || idx} className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                              <span className="truncate max-w-[160px]">{ev.event_name || ev.event_type || `Event ${idx + 1}`}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-semibold text-zinc-300">{rec.eventType}</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-4 text-xs font-semibold text-zinc-300 text-right font-mono">
                      {formatPercentageOrINR(rec.finalPackageAmount)}
                    </td>

                    {/* Paid Amount */}
                    <td className="px-4 py-4 text-xs text-zinc-400 text-right font-mono text-emerald-400">
                      {formatPercentageOrINR(rec.totalPaidAmount)}
                    </td>

                    {/* Pending Amount */}
                    <td className="px-4 py-4 text-xs font-black text-right font-mono bg-zinc-900/20">
                      {rec.paymentStatus === 'Fully Paid' ? (
                        <span className="text-emerald-400 font-mono font-bold">₹0</span>
                      ) : (
                        <span className="text-rose-400 font-mono font-bold">{formatPercentageOrINR(rec.remainingAmount)}</span>
                      )}
                    </td>

                    {/* Event Date */}
                    <td className="px-4 py-4 text-xs text-center font-mono text-zinc-300">
                      {rec.events && rec.events.length > 1 ? (
                        <div className="flex flex-col items-center gap-1">
                          {rec.events.map((ev: any, idx: number) => {
                            const d = ev.event_date || ev.event_start_date;
                            const formatted = formatEventDate(d);
                            return (
                              <span
                                key={ev.id || idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-200"
                                title={`${ev.event_name || ev.event_type || `Event ${idx + 1}`}: ${formatted}`}
                              >
                                <span className="text-[10px] text-indigo-400 font-semibold">{ev.event_name || ev.event_type || `E${idx + 1}`}:</span>
                                <span>{formatted}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="font-mono text-zinc-300">{formattedEventDate}</span>
                      )}
                    </td>

                    {/* Completion Date */}
                    <td className="px-4 py-4 text-xs text-center font-mono text-emerald-400 font-semibold">
                      {rec.paymentStatus === 'Fully Paid' ? (rec.paymentCompletionDate ? formatEventDate(rec.paymentCompletionDate) : 'Completed') : '-'}
                    </td>

                    {/* Overdue Since */}
                    <td className="px-4 py-4 text-xs text-center font-mono text-zinc-300">
                      {rec.paymentStatus === 'Fully Paid' ? '-' : (rec.eventDate ? formattedEventDate : 'N/A')}
                    </td>

                    {/* Days Overdue */}
                    <td className="px-4 py-4 text-xs text-center font-mono font-bold">
                      {rec.paymentStatus === 'Fully Paid' ? (
                        <span className="text-zinc-500">-</span>
                      ) : daysOverdue > 0 ? (
                        <span className="text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">{daysOverdue} Days</span>
                      ) : (
                        <span className="text-emerald-500">-</span>
                      )}
                    </td>

                    {/* Payment Status Label */}
                    <td className="px-4 py-4 text-xs text-center">
                      {rec.paymentStatus === 'Fully Paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          🟢 Fully Paid
                        </span>
                      ) : rec.paymentStatus === 'Partial' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          🟡 Partially Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          🟠 Pending
                        </span>
                      )}
                    </td>

                    {/* Project Stage */}
                    <td className="px-4 py-4 text-xs text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
                        {rec.currentProjectStatus}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-4 text-xs text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setPaymentModalRecord(rec);
                            setPaymentAmount('');
                            setTransactionIdInput('');
                            setPaymentMode('UPI');
                            const linkedPay = payments.find(p => p.order_id === rec.orderId || (rec.payment && p.payment_id === rec.payment.payment_id));
                            const existingType = (linkedPay as any)?.Payment_type || linkedPay?.payment_type || (rec.payment as any)?.Payment_type || rec.payment?.payment_type || '';
                            setPaymentType(existingType);
                            setPaymentNotes('');
                            setModalSuccessMsg('');
                            setModalErrorMsg('');
                            setShowPaymentModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded transition font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          Update
                        </button>
                        <button 
                          onClick={() => {
                            setViewDetailsRecord(rec);
                            setShowDetailsModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 rounded transition font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </td>

                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentModal && paymentModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center p-4 border-b border-zinc-850">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  Update Payment
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase font-mono tracking-widest">
                  Order: {paymentModalRecord.orderId}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  setModalSuccessMsg('');
                  setModalErrorMsg('');
                }}
                className="p-1 px-2 hover:bg-zinc-900 rounded text-zinc-400 uppercase font-mono text-[10px]"
              >
                Close
              </button>
            </div>
            
            {/* Modal level success and error messages */}
            {modalSuccessMsg && (
              <div className="bg-emerald-950/40 border-b border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 font-bold text-center">
                {modalSuccessMsg}
              </div>
            )}
            {modalErrorMsg && (
              <div className="bg-rose-950/40 border-b border-rose-500/30 text-rose-400 text-xs px-4 py-2.5 font-bold text-center">
                {modalErrorMsg}
              </div>
            )}

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <div className="p-3 bg-zinc-900 rounded-lg flex justify-between items-center border border-zinc-850">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Final Quotation Amount</span>
                  <span className="text-sm font-black text-white font-mono">
                    {formatPercentageOrINR(currentRecord ? currentRecord.finalPackageAmount : paymentModalRecord.finalPackageAmount)}
                  </span>
                </div>
                <div className="p-3 bg-zinc-900 rounded-lg flex justify-between items-center border border-zinc-850">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Payment Received</span>
                  <span className="text-sm font-black text-emerald-450 font-mono">
                    {formatPercentageOrINR(currentRecord ? currentRecord.totalPaidAmount : (paymentModalRecord.finalPackageAmount - paymentModalRecord.remainingAmount))}
                  </span>
                </div>
                <div className="p-3 bg-zinc-900 rounded-lg flex justify-between items-center border border-zinc-850">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Pending Amount</span>
                  <span className={`text-sm font-black font-mono ${currentRecord && currentRecord.remainingAmount === 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                    {formatPercentageOrINR(currentRecord ? currentRecord.remainingAmount : paymentModalRecord.remainingAmount)}
                  </span>
                </div>
              </div>
              
              {currentRecord && currentRecord.remainingAmount === 0 ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-center text-emerald-400 text-xs font-bold">
                  🎉 This order is Fully Paid. No outstanding dues remain.
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>Payment Type</span>
                      <span className="text-rose-500 font-black">*</span>
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => {
                        setPaymentType(e.target.value);
                        if (modalErrorMsg && modalErrorMsg.includes('Payment Type')) {
                          setModalErrorMsg('');
                        }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                      required
                    >
                      <option value="">-- Select Payment Type * --</option>
                      <option value="Shoot Time Payment">Shoot Time Payment</option>
                      <option value="Advance Payment">Advance Payment</option>
                      <option value="Final Payment">Final Payment</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Payment Received</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Transaction ID</label>
                    <input
                      type="text"
                      value={transactionIdInput}
                      onChange={(e) => setTransactionIdInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. TXN1002345"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="UPI">UPI / Google Pay / PhonePe</option>
                      <option value="Bank Transfer">Bank NEFT/IMPS/RTGS</option>
                      <option value="Cash">Cash payment</option>
                      <option value="Card">Credit/Debit Card</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Payment Notes</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. Part payment for reception event"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-850 bg-zinc-900/50 flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setModalSuccessMsg('');
                  setModalErrorMsg('');
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-750 transition cursor-pointer"
              >
                Close Panel
              </button>
              <button
                onClick={async () => {
                  if (isSaving) return;
                  const amt = Number(paymentAmount);
                  setModalSuccessMsg('');
                  setModalErrorMsg('');

                  if (!paymentType || paymentType.trim() === '') {
                    setModalErrorMsg('❌ Please select a Payment Type.');
                    return;
                  }

                  if (!paymentAmount || amt <= 0) {
                    setModalErrorMsg('❌ Please enter a valid payment amount.');
                    return;
                  }

                  const maxAllowed = currentRecord ? currentRecord.remainingAmount : paymentModalRecord.remainingAmount;
                  if (amt > maxAllowed) {
                    setModalErrorMsg(`❌ Payment cannot exceed the pending amount of ₹${maxAllowed.toLocaleString('en-IN')}`);
                    return;
                  }

                  try {
                    setIsSaving(true);
                    await recordPayment(
                      paymentModalRecord.orderId, 
                      amt, 
                      new Date().toISOString().split('T')[0], 
                      undefined, 
                      transactionIdInput,
                      paymentMode,
                      paymentNotes,
                      paymentType
                    );
                    
                    // Show success message inside popup
                    setModalSuccessMsg('✅ Payment updated successfully.');
                    setUpdateSuccessMsg('✅ Payment updated successfully.');
                    
                    // Reset input fields
                    setPaymentAmount('');
                    setTransactionIdInput('');
                    setPaymentMode('UPI');
                    setPaymentNotes('');
                    
                    // Auto hide the success message after 2.5 seconds
                    setTimeout(() => {
                      setModalSuccessMsg('');
                      setUpdateSuccessMsg('');
                    }, 2500);
                  } catch (err: any) {
                    console.error(err);
                    setModalErrorMsg('❌ Payment update failed.');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving || (currentRecord && currentRecord.remainingAmount === 0) || !paymentAmount || Number(paymentAmount) <= 0 || !paymentType}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition uppercase tracking-wider cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showDetailsModal && viewDetailsRecord && (() => {
        const historyKey = `payment_history_${viewDetailsRecord.orderId}`;
        const existingHistoryStr = localStorage.getItem(historyKey);
        let historyList: any[] = [];
        if (existingHistoryStr) {
          try {
            historyList = JSON.parse(existingHistoryStr);
          } catch (e) {
            console.error("Failed to parse local storage payment history", e);
          }
        } else {
          // Fallback prepopulated history if none exists but total paid is greater than zero
          const targetPayment = payments.find((p) => p.order_id === viewDetailsRecord.orderId);
          const adv = targetPayment ? targetPayment.advance_received : (viewDetailsRecord.order ? viewDetailsRecord.order.advance_received : 0);
          const finalRecv = targetPayment ? targetPayment.final_payment_received : 0;
          
          if (adv > 0) {
            historyList.push({
              date: targetPayment?.payment_date || new Date().toISOString(),
              amount: adv,
              transactionId: targetPayment?.transaction_id || '',
              paymentMode: 'Bank Transfer',
              paymentType: (targetPayment as any)?.Payment_type || targetPayment?.payment_type || 'Advance Payment',
              updatedBy: 'System',
              notes: 'Initial advance payment'
            });
          }
          if (finalRecv > 0) {
            historyList.push({
              date: targetPayment?.payment_date || new Date().toISOString(),
              amount: finalRecv,
              transactionId: targetPayment?.transaction_id || '',
              paymentMode: 'Bank Transfer',
              paymentType: (targetPayment as any)?.Payment_type || targetPayment?.payment_type || 'Final Payment',
              updatedBy: 'System',
              notes: 'Recorded final payment'
            });
          }
        }

        // Compute live values from the record
        const order = orders.find(o => o.order_id === viewDetailsRecord.orderId);
        const paymentObj = order ? payments.find(p => p.order_id === order.order_id) : null;
        
        const finalQuotation = order ? order.quotation_amount : viewDetailsRecord.finalPackageAmount;
        const totalPaid = paymentObj ? ((Number(paymentObj.advance_received) || 0) + (Number(paymentObj.final_payment_received) || 0) + (Number(paymentObj.additional_received) || 0)) : viewDetailsRecord.totalPaidAmount;
        const remaining = finalQuotation - totalPaid;
        
        let statusText = 'Pending Payment';
        let statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
        if (remaining <= 0) {
          statusText = 'Fully Paid';
          statusColor = 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20';
        } else if (totalPaid > 0) {
          statusText = 'Partially Paid';
          statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b border-zinc-850">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Payment Details & History
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1 uppercase font-mono tracking-widest">
                    Order: {viewDetailsRecord.orderId} • {viewDetailsRecord.customerName}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setViewDetailsRecord(null);
                  }}
                  className="p-1 px-2 hover:bg-zinc-900 rounded text-zinc-400 uppercase font-mono text-[10px]"
                >
                  Close
                </button>
              </div>

              <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Summary section */}
                <div>
                  <h4 className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider mb-2.5 font-mono">Payment Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-850">
                      <span className="block text-[9px] text-zinc-400 uppercase font-mono">Quotation</span>
                      <span className="text-sm font-black text-white font-mono mt-0.5 block">
                        {formatPercentageOrINR(finalQuotation)}
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-850">
                      <span className="block text-[9px] text-zinc-400 uppercase font-mono">Total Paid</span>
                      <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                        {formatPercentageOrINR(totalPaid)}
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-850">
                      <span className="block text-[9px] text-zinc-400 uppercase font-mono">Remaining</span>
                      <span className={`text-sm font-black font-mono mt-0.5 block ${remaining <= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                        {formatPercentageOrINR(remaining)}
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl border flex flex-col justify-center ${statusColor}`}>
                      <span className="block text-[9px] uppercase font-mono opacity-80">Status</span>
                      <span className="text-xs font-bold mt-0.5 block uppercase tracking-wider">
                        {statusText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confirmed event dates section */}
                {viewDetailsRecord?.events && viewDetailsRecord.events.length > 0 && (
                  <div>
                    <h4 className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider mb-2.5 font-mono">Confirmed Event Dates & Schedule</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {viewDetailsRecord.events.map((ev: any, idx: number) => (
                        <div key={ev.id || idx} className="p-3 bg-zinc-900 rounded-xl border border-zinc-850 space-y-1">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="text-indigo-400">🎬</span>
                            {ev.event_name || ev.event_type || `Event ${idx + 1}`}
                          </span>
                          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/60">
                            <span>Event Date:</span>
                            <span className="text-zinc-200 font-semibold">{formatEventDate(ev.event_date || ev.event_start_date)}</span>
                          </div>
                          {ev.event_start_time && (
                            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                              <span>Event Time:</span>
                              <span className="text-zinc-200">{formatTime12Hour(ev.event_start_time)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* History table */}
                <div>
                  <h4 className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider mb-2.5 font-mono">Payment History Table</h4>
                  <div className="overflow-hidden rounded-xl border border-zinc-850 bg-zinc-900/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-900/55 border-b border-zinc-850 text-zinc-400 font-mono text-[9px] uppercase tracking-wider">
                            <th className="p-3 pl-4">Date & Time</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3">Payment Type</th>
                            <th className="p-3">Transaction ID</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Updated By</th>
                            <th className="p-3 pr-4">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                          {historyList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-6 text-zinc-500 font-mono text-[10px]">
                                No payment history records found.
                              </td>
                            </tr>
                          ) : (
                            historyList.map((h, index) => {
                              // Date presentation
                              let displayDate = h.date;
                              try {
                                displayDate = new Date(h.date).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              } catch(e) {}
                              
                              const displayType = h.paymentType || (paymentObj ? ((paymentObj as any).Payment_type || paymentObj.payment_type) : '') || (viewDetailsRecord?.payment ? ((viewDetailsRecord.payment as any).Payment_type || viewDetailsRecord.payment.payment_type) : '') || 'Advance Payment';

                              return (
                                <tr key={index} className="hover:bg-zinc-900/20 text-zinc-300">
                                  <td className="p-3 pl-4 font-mono text-[10px]">{displayDate}</td>
                                  <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                    {formatPercentageOrINR(h.amount)}
                                  </td>
                                  <td className="p-3 font-medium text-[10px] text-zinc-200">
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-750 text-[9px] font-mono font-bold text-zinc-300">
                                      {displayType}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-[10px]">
                                    {(!h.transactionId || h.transactionId.trim() === '' || h.transactionId === 'null' || h.transactionId === 'NULL') ? 'N/A' : h.transactionId}
                                  </td>
                                  <td className="p-3 font-medium text-[10px]">{h.paymentMode || 'N/A'}</td>
                                  <td className="p-3 text-zinc-400 text-[10px]">{h.updatedBy || 'N/A'}</td>
                                  <td className="p-3 pr-4 text-zinc-400 text-[10px] max-w-[150px] truncate" title={h.notes}>{h.notes || '-'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-850 bg-zinc-900/50 flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setViewDetailsRecord(null);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-750 transition cursor-pointer"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

    </div>
  );
};
