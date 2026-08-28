import React from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, X } from 'lucide-react';
import { formatINR } from '../utils';

export const PaymentHistoryModal = ({
  isOpen,
  onClose,
  order,
  payments
}: {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  payments: any[];
}) => {
  if (!isOpen || !order) return null;

  const orderPayments = payments.filter(
    (p) => p.order_id === order.orderId || (order.leadId && p.lead_id === order.leadId)
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/50 bg-zinc-900/50 rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-lg font-black font-mono tracking-tight text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Payment History
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Order ID: <span className="font-bold text-amber-400">{order.orderId}</span> • 
              Customer: <span className="text-zinc-200">{order.customerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Table */}
        <div className="p-5 overflow-y-auto">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-inner">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-max">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    <th className="py-3 px-4">Lead ID</th>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Payment Type</th>
                    <th className="py-3 px-4">Payment Received</th>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {orderPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500 font-mono">
                        No payment records found.
                      </td>
                    </tr>
                  ) : (
                    orderPayments.map((p, i) => {
                      // Some logic to sum advance_received and final_payment_received might be needed,
                      // or just displaying advance_received if it's the specific payment row.
                      // Wait, the requirement says "Payment Received amount" for the row. 
                      // I will use (p.advance_received || 0) + (p.final_payment_received || 0) just in case,
                      // or whatever the specific row's total is. Usually a single payment row represents one payment event.
                      const amount = (p.advance_received || 0) + (p.final_payment_received || 0);
                      return (
                        <tr key={p.payment_id || i} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-4 text-zinc-300 font-mono">{p.lead_id || order.leadId || '-'}</td>
                          <td className="py-3 px-4 text-amber-400 font-bold font-mono">{p.order_id || order.orderId}</td>
                          <td className="py-3 px-4 text-zinc-200 font-semibold">{order.customerName}</td>
                          <td className="py-3 px-4 text-zinc-300 font-mono">
                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">
                            {p.payment_type || p.Payment_type || '-'}
                          </td>
                          <td className="py-3 px-4 text-emerald-400 font-bold font-mono">
                            {formatINR(amount)}
                          </td>
                          <td className="py-3 px-4 text-zinc-400 font-mono text-[10px]">
                            {p.transaction_id || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              p.payment_status === 'Fully Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : p.payment_status === 'Partially Paid'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {p.payment_status || 'Pending'}
                            </span>
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
    </div>,
    document.body
  );
};
