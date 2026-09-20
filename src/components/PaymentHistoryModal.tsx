import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatINR, formatDateDDMMYY, formatTime12Hour, formatDateTime, triggerAutoScrollAndFocus } from '../utils';
import { Order, Payment, Lead } from '../types';
import { supabaseClient } from '../supabaseClient';
import { useRole } from './RoleContext';

export interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  payments?: Payment[];
  orders?: Order[];
  leads?: Lead[];
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  order,
  payments = [],
  orders = [],
  leads = []
}) => {
  const { currentRole, approvePayment, rejectPayment, paymentHistory: contextPaymentHistory } = useRole();
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);

  const orderId = order?.orderId || order?.order_id || '';
  const leadId = order?.leadId || order?.lead_id || '';
  const primaryOrderId = orderId || orders.find(o => leadId && o.lead_id === leadId)?.order_id || '';

  const refreshHistory = async () => {
    if (!primaryOrderId) return;
    setIsLoading(true);
    try {
      let dbData: any[] = [];
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('payment_history')
          .select('*')
          .eq('order_id', primaryOrderId)
          .order('payment_date', { ascending: false });
        
        if (!error && data) {
          dbData = data;
        }
      }

      const contextItems = (contextPaymentHistory || []).filter(
        h => h.order_id === primaryOrderId || (leadId && h.order_id === leadId)
      );

      let localPending: any[] = [];
      try {
        const saved = localStorage.getItem('pending_payment_approvals');
        if (saved) {
          localPending = (JSON.parse(saved) || []).filter(
            (h: any) => h.order_id === primaryOrderId || (leadId && h.order_id === leadId)
          );
        }
      } catch (_) {}

      const combinedMap = new Map<string, any>();
      dbData.forEach(item => {
        const key = String(item.id || item.payment_history_id);
        combinedMap.set(key, item);
      });
      contextItems.forEach(item => {
        const key = String(item.id || item.payment_history_id);
        combinedMap.set(key, { ...combinedMap.get(key), ...item });
      });
      localPending.forEach(item => {
        const key = String(item.id || item.payment_history_id);
        if (!combinedMap.has(key)) {
          combinedMap.set(key, item);
        }
      });

      const parsed = Array.from(combinedMap.values()).map(h => {
        const isPending = h.approval_status === 'Waiting for Approval' || (h.notes && h.notes.includes('Waiting for Approval'));
        return {
          ...h,
          approval_status: isPending ? 'Waiting for Approval' : (h.approval_status === 'Rejected' ? 'Rejected' : (h.approval_status === 'Approved' ? 'Approved' : 'Approved'))
        };
      });

      parsed.sort((a, b) => new Date(b.payment_date || b.created_at || 0).getTime() - new Date(a.payment_date || a.created_at || 0).getTime());
      setHistoryList(parsed);
    } catch (err) {
      console.error("Error fetching payment history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      triggerAutoScrollAndFocus('#payment_details_history_modal', 100);
      refreshHistory();
    } else {
      setHistoryList([]);
      setIsApprovingId(null);
    }
  }, [isOpen, primaryOrderId]);

  if (!isOpen || !order) return null;

  const customerName = order.customerName || order.customer_name || 'Customer';

  // Find related objects
  const orderObj = orders.find(o => (orderId && o.order_id === orderId) || (leadId && o.lead_id === leadId));
  const paymentObj = payments.find(p => (orderId && p.order_id === orderId) || (leadId && p.lead_id === leadId) || (orderObj && p.order_id === orderObj.order_id));
  const leadObj = leads.find(l => (leadId && l.lead_id === leadId) || (orderObj && l.lead_id === orderObj.lead_id));

  // Payment amounts
  const finalQuotation = Number(orderObj?.quotation_amount) || Number(order.totalRevenue) || Number(order.finalPackageAmount) || Number(leadObj?.final_amount) || Number(leadObj?.Final_Quotation_Amount) || Number(leadObj?.budget) || 0;

  const pendingItems = historyList.filter(h => h.approval_status === 'Waiting for Approval');
  const approvedItems = historyList.filter(h => h.approval_status === 'Approved');
  const rejectedItems = historyList.filter(h => h.approval_status === 'Rejected');

  let totalPaid = approvedItems.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
  if (historyList.length === 0 && paymentObj && paymentObj.payment_status !== 'Waiting for Approval') {
    totalPaid = (Number(paymentObj.advance_received) || 0) + (Number(paymentObj.final_payment_received) || 0) + (Number(paymentObj.additional_received) || 0);
  }

  const remaining = Math.max(0, finalQuotation - totalPaid);
  const pendingAmount = pendingItems.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

  let statusText = 'Pending Payment';
  let statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

  if (pendingItems.length > 0) {
    statusText = 'Waiting for Approval';
    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  } else if (remaining <= 0 && finalQuotation > 0) {
    statusText = 'Fully Paid';
    statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (totalPaid > 0) {
    statusText = 'Partially Paid';
    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  // Events list
  let eventsList: any[] = [];
  if (Array.isArray(order.events) && order.events.length > 0) {
    eventsList = order.events;
  } else if (leadObj && Array.isArray(leadObj.events) && leadObj.events.length > 0) {
    eventsList = leadObj.events;
  } else if (order.eventDate || order.eventName || orderObj?.event_date) {
    eventsList = [{
      event_name: order.eventName || orderObj?.custom_event_name || 'Event Photography',
      event_date: order.eventDate || orderObj?.event_date,
      event_start_time: (orderObj as any)?.event_start_time
    }];
  }

  const handleReject = async (histId: string) => {
    setIsApprovingId(histId);
    try {
      await rejectPayment(histId, primaryOrderId);
      setHistoryList(prev => prev.map(p => {
        const idMatch = p.id === histId || p.payment_history_id === histId || String(p.id) === String(histId);
        if (idMatch) {
          return {
            ...p,
            approval_status: 'Rejected',
            notes: (p.notes || '').replace(/ - Waiting for Approval/g, '').replace(/Waiting for Approval/g, 'Rejected')
          };
        }
        return p;
      }));
    } catch (err) {
      console.error("Error rejecting payment:", err);
    } finally {
      setIsApprovingId(null);
    }
  };

  const handleApprove = async (histId: string) => {
    setIsApprovingId(histId);
    try {
      await approvePayment(histId, primaryOrderId);
      setHistoryList(prev => prev.map(p => {
        const idMatch = p.id === histId || p.payment_history_id === histId || String(p.id) === String(histId);
        if (idMatch) {
          return {
            ...p,
            approval_status: 'Approved',
            notes: (p.notes || '').replace(/ - Waiting for Approval/g, '').replace(/Waiting for Approval/g, 'Approved')
          };
        }
        return p;
      }));
    } catch (err) {
      console.error("Error approving payment:", err);
    } finally {
      setIsApprovingId(null);
    }
  };

  return createPortal(
    <div id="payment_details_history_modal" className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl 2xl:max-w-6xl min-[1920px]:max-w-[1400px] min-[2560px]:max-w-[1800px] min-[3840px]:max-w-[2400px] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60 rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              Payment Details & Approval
            </h3>
            <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5 font-mono">
              Order: <span className="font-bold text-amber-400">{primaryOrderId || 'N/A'}</span> • Customer: <span className="text-zinc-200 font-semibold">{customerName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Waiting for Approval Alert Card */}
          {pendingItems.length > 0 && (
            <div className="p-4 sm:p-5 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-ping" />
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Payments Waiting for Business Owner Approval ({pendingItems.length})
                  </h4>
                </div>
                <span className="text-xs font-mono text-amber-200/80">
                  Pending: <strong className="text-amber-400">{formatINR(pendingAmount)}</strong>
                </span>
              </div>

              <div className="space-y-3">
                {pendingItems.map((item, idx) => {
                  const itemDate = item.payment_date || item.created_at || '';
                  let datePart = 'N/A';
                  let timePart = 'N/A';
                  try {
                    const d = new Date(itemDate);
                    datePart = formatDateDDMMYY(d) || 'N/A';
                    timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                  } catch (_) {}

                  const histId = item.id || item.payment_history_id;
                  const isPendingApproving = isApprovingId === histId;

                  return (
                    <div key={histId || idx} className="p-4 bg-zinc-900/90 rounded-xl border border-amber-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-1">
                        <div>
                          <span className="block text-[9px] text-zinc-400 uppercase font-mono">Payment Amount</span>
                          <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
                            {formatINR(Number(item.amount) || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400 uppercase font-mono">Payment Type</span>
                          <span className="text-xs font-bold text-zinc-200 font-mono mt-0.5 block">
                            {item.payment_type || 'Payment'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400 uppercase font-mono">Payment Mode</span>
                          <span className="text-xs font-bold text-zinc-200 font-mono mt-0.5 block">
                            {item.payment_mode || 'UPI'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400 uppercase font-mono">Transaction ID</span>
                          <span className="text-xs font-mono text-zinc-300 mt-0.5 block truncate" title={item.transaction_id}>
                            {(!item.transaction_id || item.transaction_id.trim() === '' || item.transaction_id === 'null' || item.transaction_id === 'N/A') ? 'N/A' : item.transaction_id}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400 uppercase font-mono">Payment Date & Time</span>
                          <span className="text-xs font-mono text-zinc-300 mt-0.5 block">
                            {datePart} <span className="text-zinc-500">at</span> {timePart}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400 uppercase font-mono">Payment Note</span>
                          <span className="text-xs font-sans text-zinc-300 mt-0.5 block truncate" title={item.notes}>
                            {item.notes ? item.notes.replace(/ - Waiting for Approval/g, '').replace(/Waiting for Approval/g, '') : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        <button
                          type="button"
                          disabled={isPendingApproving}
                          onClick={() => handleApprove(histId)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black text-xs uppercase tracking-wide cursor-pointer transition-all shadow-lg font-mono disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{isPendingApproving ? 'Approving...' : 'Approve Payment'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div>
            <h4 className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2.5 font-mono">
              Payment Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <span className="block text-[9px] text-zinc-400 uppercase font-mono">Total Order Amount</span>
                <span className="text-sm font-black text-white font-mono mt-0.5 block">
                  {formatINR(finalQuotation)}
                </span>
              </div>
              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <span className="block text-[9px] text-zinc-400 uppercase font-mono">Already Approved / Received</span>
                <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                  {formatINR(totalPaid)}
                </span>
              </div>
              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <span className="block text-[9px] text-zinc-400 uppercase font-mono">Remaining Pending Amount</span>
                <span className={`text-sm font-black font-mono mt-0.5 block ${remaining <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(remaining)}
                </span>
              </div>
              <div className={`p-3 rounded-xl border flex flex-col justify-center ${statusColor}`}>
                <span className="block text-[9px] uppercase font-mono opacity-80">Payment Status</span>
                <span className="text-xs font-bold mt-0.5 block uppercase tracking-wider">
                  {statusText}
                </span>
              </div>
            </div>
          </div>

          {/* Confirmed event dates section */}
          {eventsList.length > 0 && (
            <div>
              <h4 className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2.5 font-mono">
                Confirmed Event Dates & Schedule
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {eventsList.map((ev: any, idx: number) => (
                  <div key={ev.id || idx} className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="text-indigo-400">🎬</span>
                      {ev.event_name || ev.event_type || `Event ${idx + 1}`}
                    </span>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span>Event Date:</span>
                      <span className="text-zinc-200 font-semibold">
                        {ev.event_date ? formatDateDDMMYY(ev.event_date) : 'N/A'}
                      </span>
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

          {/* Payment History Table */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
                Payment History ({historyList.length} records)
              </h4>
              <span className="text-[10px] text-zinc-500 font-mono">
                Verify new payments against previous payments for this order
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-max">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-mono text-[9px] uppercase tracking-wider">
                      <th className="p-3 pl-4 whitespace-nowrap">Date & Time</th>
                      <th className="p-3 text-right whitespace-nowrap">Amount</th>
                      <th className="p-3 whitespace-nowrap">Payment Type</th>
                      <th className="p-3 whitespace-nowrap">Transaction ID</th>
                      <th className="p-3 whitespace-nowrap">Method</th>
                      <th className="p-3 whitespace-nowrap">Updated By</th>
                      <th className="p-3 pr-4 whitespace-nowrap">Notes</th>
                      <th className="p-3 pr-4 whitespace-nowrap">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-zinc-500 text-[10px]">
                          Loading records...
                        </td>
                      </tr>
                    ) : historyList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-zinc-500 text-[10px]">
                          No payment history records found.
                        </td>
                      </tr>
                    ) : (
                      historyList.map((h, index) => {
                        let displayDate = h.payment_date || h.date;
                        try {
                          displayDate = formatDateTime(h.payment_date || h.date) || displayDate;
                        } catch (e) {}

                        const displayType = h.payment_type || h.paymentType || (paymentObj ? ((paymentObj as any).Payment_type || paymentObj.payment_type) : '') || 'Payment';
                        const isPending = h.approval_status === 'Waiting for Approval' || (h.notes && h.notes.includes('Waiting for Approval'));
                        const histId = h.id || h.payment_history_id;
                        const isRowApproving = isApprovingId === histId;

                        return (
                          <tr key={histId || index} className={`hover:bg-zinc-800/30 text-zinc-300 ${isPending ? 'bg-amber-500/5' : ''}`}>
                            <td className="p-3 pl-4 text-[10px] text-zinc-400 whitespace-nowrap">{displayDate}</td>
                            <td className="p-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                              {formatINR(Number(h.amount) || 0)}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-bold text-zinc-200 whitespace-nowrap">
                                {displayType}
                              </span>
                            </td>
                            <td className="p-3 text-[10px] text-zinc-400 whitespace-nowrap">
                              {(!h.transaction_id && !h.transactionId || h.transaction_id?.trim() === '' || h.transaction_id === 'null' || h.transactionId?.trim() === '' || h.transactionId === 'null') ? 'N/A' : (h.transaction_id || h.transactionId)}
                            </td>
                            <td className="p-3 text-[10px] text-zinc-300 whitespace-nowrap">{h.payment_mode || h.paymentMode || 'N/A'}</td>
                            <td className="p-3 text-[10px] text-zinc-400 whitespace-nowrap">{h.updated_by || h.updatedBy || 'N/A'}</td>
                            <td className="p-3 pr-4 text-[10px] text-zinc-400 min-w-[150px] max-w-[250px] truncate" title={h.notes}>
                              {h.notes ? h.notes.replace(/ - Waiting for Approval/g, '') : '-'}
                            </td>
                            <td className="p-3 pr-4 whitespace-nowrap">
                              {isPending ? (
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-400 animate-pulse">
                                    Waiting for Approval
                                  </span>
                                  {currentRole === 'Business Owner' && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isRowApproving}
                                        onClick={() => handleApprove(histId)}
                                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                                      >
                                        {isRowApproving ? 'Approving...' : 'Approve'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isRowApproving}
                                        onClick={() => handleReject(histId)}
                                        className="px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold text-[10px] cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                                      >
                                        {isRowApproving ? 'Rejecting...' : 'Reject'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : h.approval_status === 'Rejected' ? (
                                <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-[9px] font-bold text-rose-400 flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  Rejected
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 flex items-center gap-1 w-fit">
                                  <CheckCircle className="w-3 h-3" />
                                  Approved
                                </span>
                              )}
                            </td>
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
      </div>
    </div>,
    document.body
  );
};
