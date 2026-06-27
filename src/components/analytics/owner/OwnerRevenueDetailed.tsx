import React, { useMemo } from 'react';
import { useRole } from '../../RoleContext';
import { formatINR } from '../../../utils';
import { 
  Landmark, DollarSign, FileText, CheckCircle, Clock, AlertCircle, TrendingUp, BarChart3, 
  PieChart as PieChartIcon, Calendar, ArrowUpRight, ArrowDownRight, Package, User
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, BarChart, Bar, Cell, PieChart, Pie, LineChart, Line
} from 'recharts';
import { CameraLensStatsCard } from '../../CameraLensStatsCard';

export const OwnerRevenueDetailed: React.FC = () => {
  const { leads, orders, payments, quotations, globalDateRange } = useRole();

  const metrics = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + (p.advance_received || 0) + (p.final_payment_received || 0), 0);
    const totalPending = payments.reduce((sum, p) => sum + (p.balance_due || 0), 0);
    const totalQuotation = quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0);
    const totalAdvance = payments.reduce((sum, p) => sum + (p.advance_received || 0), 0);
    const totalFinal = payments.reduce((sum, p) => sum + (p.final_payment_received || 0), 0);
    const outstandingBalance = payments.reduce((sum, p) => sum + (p.balance_due || 0), 0);
    const totalConfirmed = orders.length;
    const totalPipeline = leads.length;

    return {
      totalCollected,
      totalPending,
      totalQuotation,
      totalAdvance,
      totalFinal,
      outstandingBalance,
      totalConfirmed,
      totalPipeline
    };
  }, [leads, orders, payments, quotations]);

  // Chart Data: Monthly Revenue Trend
  const monthlyRevenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(m => ({ name: m, revenue: 0, collected: 0 }));
    
    orders.forEach(o => {
      const date = new Date(o.event_date);
      if (date.getFullYear() === new Date().getFullYear()) {
        const monthIndex = date.getMonth();
        data[monthIndex].revenue += (o.quotation_amount || 0);
      }
    });

    payments.forEach(p => {
      const date = p.created_at ? new Date(p.created_at) : new Date();
      if (date.getFullYear() === new Date().getFullYear()) {
        const monthIndex = date.getMonth();
        data[monthIndex].collected += (p.advance_received || 0) + (p.final_payment_received || 0);
      }
    });

    return data;
  }, [orders, payments]);

  // Revenue by Event Type
  const revenueByEventType = useMemo(() => {
    const types: Record<string, number> = {};
    orders.forEach(o => {
      const type = o.event_type || 'Other';
      types[type] = (types[type] || 0) + (o.quotation_amount || 0);
    });
    return Object.entries(types).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [orders]);

  // Revenue by Sales Person
  const revenueBySalesPerson = useMemo(() => {
    const persons: Record<string, number> = {};
    leads.forEach(l => {
      if (l.status === 'Order Confirmed' || l.status === 'Approved') {
        const person = l.assigned_to_name || 'Unassigned';
        persons[person] = (persons[person] || 0) + (l.budget || 0);
      }
    });
    return Object.entries(persons).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [leads]);

  // Payment Status Distribution
  const paymentStatusData = useMemo(() => {
    const counts: Record<string, number> = { 'Fully Paid': 0, 'Partially Paid': 0, 'Advance Received': 0, 'No Payment': 0 };
    payments.forEach(p => {
      const status = p.payment_status || 'No Payment';
      if (counts[status] !== undefined) counts[status]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [payments]);

  // Revenue by Package
  const revenueByPackage = useMemo(() => {
    const packages: Record<string, number> = {};
    orders.forEach(o => {
      const pkg = o.package_name || 'Custom Package';
      packages[pkg] = (packages[pkg] || 0) + (o.quotation_amount || 0);
    });
    return Object.entries(packages).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [orders]);

  const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#A78BFA', '#F472B6', '#2DD4BF', '#FACC15'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CameraLensStatsCard
          label="Total Revenue Collected"
          val={metrics.totalCollected}
          isCurrency={true}
          currencyFormatter={formatINR}
          theme="green"
          trendText="Cash in Bank"
          lensLabel="PRIME 24mm"
        />
        <CameraLensStatsCard
          label="Total Pending Payment"
          val={metrics.totalPending}
          isCurrency={true}
          currencyFormatter={formatINR}
          theme="red"
          trendText="Awaiting Collection"
          lensLabel="PRIME 35mm"
        />
        <CameraLensStatsCard
          label="Total Quotation Amount"
          val={metrics.totalQuotation}
          isCurrency={true}
          currencyFormatter={formatINR}
          theme="purple"
          trendText="Pipeline Potential"
          lensLabel="PRIME 50mm"
        />
        <CameraLensStatsCard
          label="Total Advance Received"
          val={metrics.totalAdvance}
          isCurrency={true}
          currencyFormatter={formatINR}
          theme="blue"
          trendText="Booking Deposits"
          lensLabel="PRIME 85mm"
        />
        <CameraLensStatsCard
          label="Total Final Payment Received"
          val={metrics.totalFinal}
          isCurrency={true}
          currencyFormatter={formatINR}
          theme="cyan"
          trendText="Project Closures"
          lensLabel="TELE 100mm"
        />
        <CameraLensStatsCard
          label="Total Outstanding Balance"
          val={metrics.outstandingBalance}
          isCurrency={true}
          currencyFormatter={formatINR}
          theme="orange"
          trendText="Collection Risk"
          lensLabel="TELE 135mm"
        />
        <CameraLensStatsCard
          label="Total Orders Confirmed"
          val={metrics.totalConfirmed}
          theme="gold"
          trendText="Locked Contracts"
          lensLabel="TELE 200mm"
        />
        <CameraLensStatsCard
          label="Total Leads in Pipeline"
          val={metrics.totalPipeline}
          theme="purple"
          trendText="Growth Opportunities"
          lensLabel="CINE 35mm"
        />
      </div>

      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Monthly Revenue vs Collection
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: number) => [formatINR(val), '']}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
                <Area type="monotone" name="Quoted Revenue" dataKey="revenue" stroke="#818CF8" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" name="Collected Cash" dataKey="collected" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCollected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-purple-400" /> Revenue by Event Type
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByEventType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {revenueByEventType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: number) => [formatINR(val), 'Revenue']}
                />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Section 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" /> Revenue by Package
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByPackage} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: number) => [formatINR(val), 'Revenue']}
                />
                <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" /> Revenue by Sales Person
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBySalesPerson} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: number) => [formatINR(val), 'Revenue']}
                />
                <Bar dataKey="value" fill="#22D3EE" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Recent Payment Transactions
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-450 font-mono text-[10px] uppercase tracking-wider">
                <th className="p-4">Transaction Date</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Quotation Amt</th>
                <th className="p-4">Advance Paid</th>
                <th className="p-4">Final Paid</th>
                <th className="p-4">Balance Due</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {payments.slice(0, 10).map((p, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="p-4 text-zinc-400 font-mono">{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td className="p-4 font-bold text-zinc-100">{orders.find(o => o.order_id === p.order_id)?.customer_name || 'System Transaction'}</td>
                  <td className="p-4 text-zinc-300 font-mono">{formatINR(quotations.find(q => q.order_id === p.order_id)?.grand_total || 0)}</td>
                  <td className="p-4 text-emerald-400 font-mono font-bold">+{formatINR(p.advance_received || 0)}</td>
                  <td className="p-4 text-emerald-400 font-mono font-bold">+{formatINR(p.final_payment_received || 0)}</td>
                  <td className="p-4 text-rose-400 font-mono font-bold">{formatINR(p.balance_due || 0)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.payment_status === 'Fully Paid' ? 'bg-emerald-500/10 text-emerald-500' :
                      p.payment_status === 'Partially Paid' ? 'bg-indigo-500/10 text-indigo-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      {p.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-zinc-500 italic">No recent payment transactions detected in ledger.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
