import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X } from 'lucide-react';
import { formatINR, formatDateDDMMYY, formatTime12Hour, triggerAutoScrollAndFocus } from '../utils';
import { Order, Payment, Lead } from '../types';
import { supabaseClient } from '../supabaseClient';

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
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const orderId = order?.orderId || order?.order_id || '';
  const leadId = order?.leadId || order?.lead_id || '';
  const primaryOrderId = orderId || orders.find(o => leadId && o.lead_id === leadId)?.order_id || '';

  useEffect(() => {
    if (isOpen) {
      triggerAutoScrollAndFocus('#payment_details_history_modal', 100);
      
      const fetchHistory = async () => {
        if (!primaryOrderId || !supabaseClient) return;
        setIsLoading(true);
        try {
          const { data, error } = await supabaseClient
            .from('payment_history')
            .select('*')
            .eq('order_id', primaryOrderId)
            .order('payment_date', { ascending: true });
          
          if (!error && data) {
            setHistoryList(data);
          }
        } catch (err) {
          console.error("Error fetching payment history:", err);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchHistory();
    } else {
      setHistoryList([]);
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
  const totalPaid = paymentObj
    ? ((Number(paymentObj.advance_received) || 0) + (Number(paymentObj.final_payment_received) || 0) + (Number(paymentObj.additional_received) || 0))
    : (Number(order.paymentReceived) || Number(order.totalPaidAmount) || Number(orderObj?.advance_received) || 0);

  const remaining = Math.max(0, finalQuotation - totalPaid);
  let statusText = 'Pending Payment';
  let statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

  if (remaining <= 0 && finalQuotation > 0) {
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

  return createPortal(
    <div id="payment_details_history_modal" className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl 2xl:max-w-6xl min-[1920px]:max-w-[1400px] min-[2560px]:max-w-[1800px] min-[3840px]:max-w-[2400px] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60 rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              Payment Details & History
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
          
          {/* Payment Summary */}
          <div>
            <h4 className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2.5 font-mono">
              Payment Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <span className="block text-[9px] text-zinc-400 uppercase font-mono">Quotation</span>
                <span className="text-sm font-black text-white font-mono mt-0.5 block">
                  {formatINR(finalQuotation)}
                </span>
              </div>
              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <span className="block text-[9px] text-zinc-400 uppercase font-mono">Total Paid</span>
                <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                  {formatINR(totalPaid)}
                </span>
              </div>
              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <span className="block text-[9px] text-zinc-400 uppercase font-mono">Remaining</span>
                <span className={`text-sm font-black font-mono mt-0.5 block ${remaining <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(remaining)}
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
                        {ev.event_date ? (ev.event_date.includes('T') ? formatDateDDMMYY(ev.event_date) : ev.event_date) : 'N/A'}
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
            <h4 className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2.5 font-mono">
              Payment History Table
            </h4>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-zinc-500 text-[10px]">
                          Loading records...
                        </td>
                      </tr>
                    ) : historyList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-zinc-500 text-[10px]">
                          No payment history records found.
                        </td>
                      </tr>
                    ) : (
                      historyList.map((h, index) => {
                        let displayDate = h.payment_date || h.date;
                        try {
                          displayDate = new Date(h.payment_date || h.date).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          });
                        } catch (e) {}

                        const displayType = h.payment_type || h.paymentType || (paymentObj ? ((paymentObj as any).Payment_type || paymentObj.payment_type) : '') || 'Payment';

                        return (
                          <tr key={index} className="hover:bg-zinc-800/30 text-zinc-300">
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
                            <td className="p-3 pr-4 text-[10px] text-zinc-400 min-w-[150px] max-w-[250px] truncate" title={h.notes}>{h.notes || '-'}</td>
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
