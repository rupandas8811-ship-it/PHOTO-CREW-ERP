import React, { useState, useMemo } from 'react';
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
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
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

  // Compile real-time pending payment records from Supabase table: leads
  const allPendingRecords = useMemo(() => {
    const TODAY_STR = new Date().toISOString().split('T')[0];

    return (leads || []).map(lead => {
      const order = orders.find(o => o.lead_id === lead.lead_id);
      const payment = order ? payments.find(p => p.order_id === order.order_id) : null;
      
      const finalPackageAmount = order ? order.quotation_amount : lead.budget;
      const advanceReceived = order ? order.advance_received : 0;
      const remainingAmount = order ? (payment ? payment.balance_due : order.balance_amount) : finalPackageAmount;
      const rawPaymentStatus = order ? (payment ? payment.payment_status : (advanceReceived > 0 ? 'Partially Paid' : 'Pending')) : 'Pending';
      
      // Standardize status labels
      let paymentStatus: 'Pending' | 'Partial' | 'Fully Paid' = 'Pending';
      if (rawPaymentStatus === 'Partially Paid' || rawPaymentStatus === 'Partial') {
        paymentStatus = 'Partial';
      } else if (rawPaymentStatus === 'Fully Paid') {
        paymentStatus = 'Fully Paid';
      }

      const isOverdue = lead.event_date && lead.event_date < TODAY_STR;

      return {
        lead,
        order,
        payment,
        orderId: order?.order_id || `MOCK-${lead.lead_id.slice(-4)}`,
        customerName: lead.customer_name,
        mobileNumber: lead.mobile,
        eventType: lead.event_type,
        eventDate: lead.event_date || '',
        finalPackageAmount,
        advanceReceived,
        remainingAmount,
        paymentStatus,
        isOverdue,
        currentProjectStatus: lead.status,
        lastUpdatedDate: lead.updated_at || lead.created_date,
      };
    }).filter(rec => {
      // Filter out completed payments completely
      return rec.remainingAmount > 0 && rec.paymentStatus !== 'Fully Paid';
    });
  }, [leads, orders, payments]);

  // Compute metrics for the 6 Pending Payment Analytics Cards
  const stats = useMemo(() => {
    const totalPendingOrders = allPendingRecords.length;
    const totalPendingAmount = allPendingRecords.reduce((acc, r) => acc + r.remainingAmount, 0);
    const partialPaymentOrders = allPendingRecords.filter(r => r.paymentStatus === 'Partial').length;
    const overduePendingPayments = allPendingRecords.filter(r => r.isOverdue).length;
    const upcomingPaymentDue = allPendingRecords.filter(r => !r.isOverdue).length;
    const averageOutstandingAmount = totalPendingOrders > 0 ? totalPendingAmount / totalPendingOrders : 0;

    return {
      totalPendingOrders,
      totalPendingAmount,
      partialPaymentOrders,
      overduePendingPayments,
      upcomingPaymentDue,
      averageOutstandingAmount
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
        if (paymentStatusFilter === 'Partial' && rec.paymentStatus !== 'Partial') return false;
      }

      // Card Click Filter (interactive filter feedback)
      if (activeCardFilter === 'Pending' && rec.paymentStatus !== 'Pending') return false;
      if (activeCardFilter === 'Partial' && rec.paymentStatus !== 'Partial') return false;
      if (activeCardFilter === 'Overdue' && !rec.isOverdue) return false;
      if (activeCardFilter === 'Upcoming' && rec.isOverdue) return false;

      return true;
    });
  }, [allPendingRecords, startDate, endDate, searchTerm, searchOrderId, eventTypeFilter, paymentStatusFilter, activeCardFilter]);

  // Unique event types for dropdown
  const uniqueEventTypes = useMemo(() => {
    const types = new Set<string>();
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
    const headers = ['Order ID', 'Customer Name', 'Mobile Number', 'Event Type', 'Event Date', 'Final Package Amount', 'Advance Received', 'Remaining Amount', 'Payment Status', 'Project Status', 'Last Updated'];
    const rows = filteredRecords.map(r => [
      r.orderId,
      r.customerName,
      r.mobileNumber,
      r.eventType,
      r.eventDate,
      r.finalPackageAmount,
      r.advanceReceived,
      r.remainingAmount,
      r.paymentStatus === 'Partial' ? 'Partial' : 'Pending',
      r.currentProjectStatus,
      new Date(r.lastUpdatedDate).toLocaleDateString()
    ]);

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
    let excelContent = "Order ID\tCustomer Name\tMobile Number\tEvent Type\tEvent Date\tFinal Package Amount\tAdvance Received\tRemaining Amount\tPayment Status\tProject Status\tLast Updated\n";
    filteredRecords.forEach(r => {
      excelContent += `${r.orderId}\t${r.customerName}\t${r.mobileNumber}\t${r.eventType}\t${r.eventDate}\t${r.finalPackageAmount}\t${r.advanceReceived}\t${r.remainingAmount}\t${r.paymentStatus}\t${r.currentProjectStatus}\t${new Date(r.lastUpdatedDate).toLocaleDateString()}\n`;
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
    doc.text('PENDING PAYMENTS & OUTSTANDING BALANCES REPORT', 15, 21);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated By: ${currentUserName} | Date: ${new Date().toLocaleDateString('en-IN')}`, 15, 28);

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
    doc.text('Paid (Adv)', 210, currentY + 5.5);
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
      doc.text(rec.eventDate, 150, currentY + 5);
      
      doc.text(`INR ${rec.finalPackageAmount.toLocaleString('en-IN')}`, 180, currentY + 5);
      doc.text(`INR ${rec.advanceReceived.toLocaleString('en-IN')}`, 210, currentY + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28); // red for outstanding
      doc.text(`INR ${rec.remainingAmount.toLocaleString('en-IN')}`, 240, currentY + 5);
      
      doc.setFont('helvetica', 'normal');
      if (rec.paymentStatus === 'Partial') {
        doc.setTextColor(180, 83, 9); // amber
        doc.text('Partial', 270, currentY + 5);
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
    const sumVal = filteredRecords.reduce((ax, rx) => ax + rx.remainingAmount, 0);
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

      {/* Pending Payment Analytics Cards (Photocrew Lens-Inspired layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
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
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Total Pending Orders</span>
            <DollarSign className={`w-4 h-4 ${activeCardFilter === 'All' ? 'text-amber-500' : 'text-zinc-500'}`} />
          </div>
          <p className="text-2xl font-extrabold text-white tracking-tight leading-none mb-1">
            {stats.totalPendingOrders}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            AF UNLOCKED • PRIME 16mm
          </p>
          {activeCardFilter === 'All' && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-amber-500 rounded-tl-md" />
          )}
        </div>

        {/* Card 2: Total Pending Amount */}
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
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-extrabold text-rose-405 tracking-tight leading-none mb-1">
            {formatPercentageOrINR(stats.totalPendingAmount)}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            AF CONTINUOUS • CINE 35mm
          </p>
        </div>

        {/* Card 3: Partial Payment Orders */}
        <div 
          onClick={() => handleCardClick('Partial')}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
            activeCardFilter === 'Partial'
              ? 'bg-gradient-to-br from-zinc-850 to-zinc-900 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-750'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Partial Payments</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-500 tracking-tight leading-none mb-1">
            {stats.partialPaymentOrders}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            AF TRANSMIT • TELE 85mm
          </p>
          {activeCardFilter === 'Partial' && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-amber-500 rounded-tl-md" />
          )}
        </div>

        {/* Card 4: Overdue Pending Payments */}
        <div 
          onClick={() => handleCardClick('Overdue')}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
            activeCardFilter === 'Overdue'
              ? 'bg-gradient-to-br from-zinc-850 to-zinc-900 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-750'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Overdue Payments</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-500 tracking-tight leading-none mb-1">
            {stats.overduePendingPayments}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            AF CLOSED • TELE 135mm
          </p>
          {activeCardFilter === 'Overdue' && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-amber-500 rounded-tl-md" />
          )}
        </div>

        {/* Card 5: Upcoming Payment Due */}
        <div 
          onClick={() => handleCardClick('Upcoming')}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
            activeCardFilter === 'Upcoming'
              ? 'bg-gradient-to-br from-zinc-850 to-zinc-900 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-750'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Upcoming Due</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-cyan-400 tracking-tight leading-none mb-1">
            {stats.upcomingPaymentDue}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            AF SCHEDULED • PRIME 50mm
          </p>
          {activeCardFilter === 'Upcoming' && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-amber-500 rounded-tl-md" />
          )}
        </div>

        {/* Card 6: Average Outstanding Amount */}
        <div 
          onClick={() => handleCardClick('All')}
          className="relative p-4 rounded-xl border bg-zinc-900/40 border-zinc-800 overflow-hidden"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Avg Outstanding</span>
            <HelpCircle className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-lg font-extrabold text-zinc-300 tracking-tight leading-none mb-1">
            {formatPercentageOrINR(stats.averageOutstandingAmount)}
          </p>
          <p className="text-[8px] text-zinc-500 font-mono">
            AF PRE-PRO • ZOOM 24-70
          </p>
        </div>

      </div>

      {/* Control Filters & Downloads bar */}
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
                placeholder="ORD-..."
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
              <option value="All">All Oustanding</option>
              <option value="Pending">Pending Only</option>
              <option value="Partial">Partial Only</option>
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

      {/* Main Datatable */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-850 flex items-center justify-between">
          <span className="text-xs uppercase font-mono font-extrabold tracking-widest text-zinc-400">
            PENDING ACCOUNT CORES
          </span>
          <span className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono uppercase font-black tracking-wider text-zinc-400 px-2.5 py-1 rounded-lg">
            Active Records displayed: {filteredRecords.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-zinc-850 bg-zinc-900/30">
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono">Order ID</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono">Customer Name</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono">Mobile</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono">Event Details</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-right">Package Cost</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-right">Advance Paid</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-rose-450 font-mono text-right">Remaining Due</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-center">Payment Status</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-center">Project Status</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-center">Last Updated</th>
                <th className="px-4 py-3.5 text-[10px] uppercase font-black tracking-wider text-zinc-400 font-mono text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-zinc-500 font-medium">
                    <AlertTriangle className="w-8 h-8 text-zinc-750 mx-auto mb-2" />
                    <span>No pending payments fit the selected parameters.</span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, i) => (
                  <tr 
                    key={rec.lead.lead_id}
                    className="border-b border-zinc-850 hover:bg-zinc-900/10 transition-colors"
                  >
                    {/* Order ID */}
                    <td className="px-4 py-4 text-xs font-mono font-medium text-zinc-300">
                      {rec.orderId}
                    </td>

                    {/* Customer Name */}
                    <td className="px-4 py-4 text-xs font-bold text-white">
                      {rec.customerName}
                    </td>

                    {/* Mobile */}
                    <td className="px-4 py-4 text-xs text-zinc-400 font-mono">
                      {rec.mobileNumber}
                    </td>

                    {/* Event Type & Date */}
                    <td className="px-4 py-4 text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-200">{rec.eventType}</span>
                        <span className="text-[10px] text-zinc-550 flex items-center gap-1 font-mono mt-0.5">
                          <Calendar className="w-3 h-3 text-zinc-600" />
                          <span>{rec.eventDate ? new Date(rec.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                        </span>
                      </div>
                    </td>

                    {/* Package Cost */}
                    <td className="px-4 py-4 text-xs font-semibold text-zinc-300 text-right font-mono">
                      {formatPercentageOrINR(rec.finalPackageAmount)}
                    </td>

                    {/* Advance Paid */}
                    <td className="px-4 py-4 text-xs text-zinc-400 text-right font-mono text-emerald-400">
                      {formatPercentageOrINR(rec.advanceReceived)}
                    </td>

                    {/* Remaining Due */}
                    <td className="px-4 py-4 text-xs font-black text-rose-400 text-right font-mono bg-rose-500/5">
                      {formatPercentageOrINR(rec.remainingAmount)}
                    </td>

                    {/* Payment Status Label */}
                    <td className="px-4 py-4 text-xs text-center">
                      {rec.paymentStatus === 'Partial' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-405 border border-amber-500/20">
                          Partial
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-405 border border-rose-500/20">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Project Stage */}
                    <td className="px-4 py-4 text-xs text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
                        {rec.currentProjectStatus}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td className="px-4 py-4 text-xs text-zinc-500 text-center font-mono">
                      {new Date(rec.lastUpdatedDate).toLocaleDateString('en-IN')}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-4 text-xs text-right">
                      <button 
                        onClick={() => {
                          setPaymentModalRecord(rec);
                          setPaymentAmount(rec.remainingAmount);
                          setPaymentNotes('');
                          setShowPaymentModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded transition font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
                      >
                        Update
                      </button>
                    </td>

                  </tr>
                ))
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
            className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
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
                onClick={() => setShowPaymentModal(false)}
                className="p-1 px-2 hover:bg-zinc-900 rounded text-zinc-400 uppercase font-mono text-[10px]"
              >
                Cancel
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="p-3 bg-zinc-900 rounded-lg flex justify-between items-center border border-zinc-850">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Remaining Balance</span>
                <span className="text-sm font-black text-rose-450 font-mono">
                  {formatPercentageOrINR(paymentModalRecord.remainingAmount)}
                </span>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Amount Received (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                  placeholder="0.00"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Leave as remaining balance to mark Fully Paid</p>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Payment Notes (Optional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 min-h-[60px]"
                  placeholder="e.g. Bank transfer reference number..."
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-850 bg-zinc-900/50 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-750 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amt = Number(paymentAmount);
                  if (amt > 0) {
                    recordPayment(paymentModalRecord.orderId, amt, new Date().toISOString().split('T')[0], paymentNotes);
                    setShowPaymentModal(false);
                  }
                }}
                disabled={!paymentAmount || Number(paymentAmount) <= 0}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition uppercase tracking-wider"
              >
                Save Payment
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
