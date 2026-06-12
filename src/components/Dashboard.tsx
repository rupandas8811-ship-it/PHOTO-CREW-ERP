import React from 'react';
import { useRole } from './RoleContext';
import { 
  Users, Calendar, FileText, CheckCircle, Landmark, TrendingUp, AlertCircle, Clock, ShieldAlert, Sparkles, Filter, Sliders, ChevronRight
} from 'lucide-react';
import { CurrentStage } from '../types';
import { formatINR, formatTime12Hour } from '../utils';

export const Dashboard: React.FC = () => {
  const { leads, orders, production, payments, logs } = useRole();

  // 1. Total Leads
  const totalLeads = leads.length;

  // 2. Today's Leads (Current date in context: 2026-06-10)
  const todaysLeads = leads.filter(l => l.created_date === '2026-06-10').length;

  // 3. This Month Leads (Created in June 2026)
  const thisMonthLeads = leads.filter(l => l.created_date.startsWith('2026-06')).length;

  // 4. Confirmed Orders (All orders are confirmed orders in this company)
  const confirmedOrdersNum = orders.length;

  // 5. Pending Orders (Orders in active stages, meaning not Closed)
  const pendingOrders = orders.filter(o => o.current_stage !== 'Closed').length;

  // 6. Events Scheduled (In Operations Assigned or Order Confirmed stage)
  const eventsScheduled = orders.filter(o => o.current_stage === 'Operations Assigned' || o.current_stage === 'Order Confirmed').length;

  // 7. Editing Pending (Active production tasks not yet delivered)
  const editingPending = production.filter(p => p.editing_status !== 'Delivered' && p.editing_status !== 'Approved').length;

  // 8. Delivered Projects (Delivered production projects)
  const deliveredProjects = production.filter(p => p.editing_status === 'Delivered').length;

  // 9 & 10. Financial Sums
  const totalOutstanding = payments.reduce((sum, p) => sum + p.balance_due, 0);
  const totalCollected = payments.reduce((sum, p) => sum + (p.advance_received + p.final_payment_received), 0);

  // 11. Conversion Percentage
  const conversionPct = totalLeads > 0 
    ? Math.round((confirmedOrdersNum / totalLeads) * 100) 
    : 0;

  // Pipeline stage groups to count
  const pipelineStages: { label: string; stages: CurrentStage[]; color: string; ringColor: string; bgBadge: string }[] = [
    { label: 'New Lead', stages: ['New Lead'], color: 'bg-indigo-500', ringColor: 'border-indigo-500/30', bgBadge: 'bg-indigo-500/10 text-indigo-400' },
    { label: 'Follow Up', stages: ['Follow Up'], color: 'bg-emerald-500', ringColor: 'border-emerald-500/30', bgBadge: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Quotation', stages: ['Quotation Sent', 'Negotiation'], color: 'bg-amber-500', ringColor: 'border-amber-500/30', bgBadge: 'bg-amber-500/10 text-amber-400' },
    { label: 'Confirmed', stages: ['Order Confirmed'], color: 'bg-orange-500', ringColor: 'border-orange-500/30', bgBadge: 'bg-orange-500/10 text-orange-450' },
    { label: 'Operations', stages: ['Operations Assigned', 'Event Scheduled'], color: 'bg-sky-500', ringColor: 'border-sky-500/30', bgBadge: 'bg-sky-500/10 text-sky-400' },
    { label: 'Production', stages: ['Event Completed', 'Raw Footage Received', 'Editor Assigned', 'Editing Started', 'Customer Review', 'Revision Required', 'Approved'], color: 'bg-pink-500', ringColor: 'border-pink-500/30', bgBadge: 'bg-pink-500/10 text-pink-400' },
    { label: 'Delivered', stages: ['Delivered'], color: 'bg-teal-500', ringColor: 'border-teal-500/30', bgBadge: 'bg-teal-500/10 text-teal-400' },
    { label: 'Closed', stages: ['Closed', 'Payment Pending'], color: 'bg-zinc-500', ringColor: 'border-zinc-500/30', bgBadge: 'bg-zinc-500/10 text-zinc-400' },
  ];

  const getStageCount = (stages: CurrentStage[]) => {
    return leads.filter(l => stages.includes(l.status)).length;
  };

  return (
    <div id="ceo_dashboard" className="space-y-6">
      
      {/* Cinematic Studio Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 rounded-2xl border border-zinc-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-amber-500/[0.04] blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-violet-600/[0.03] blur-[100px] pointer-events-none" />
        
        {/* Viewfinder frame decorations around header */}
        <div className="absolute top-4 left-4 viewfinder-corner-tl" />
        <div className="absolute top-4 right-4 viewfinder-corner-tr" />
        <div className="absolute bottom-4 left-4 viewfinder-corner-bl" />
        <div className="absolute bottom-4 right-4 viewfinder-corner-br" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 px-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-md font-mono text-[10px] tracking-widest border border-amber-500/30">
                EXECUTIVE LIVE
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans uppercase flex items-center gap-2">
              Studio Executive Console
            </h1>
            
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Real-time analytics engine tracking inbound wedding & event leads, live camera squads, editing pipelines, and secure ledger balance clearance.
            </p>
          </div>
          
          {/* Creative Shutter Sync calibration bar */}
          <div className="flex flex-col gap-1.5 self-start lg:self-auto">
            <div className="bg-black/80 backdrop-blur-md px-5 py-3 rounded-xl border border-zinc-800 flex items-center gap-4 text-[10px] font-mono tracking-widest text-zinc-400 uppercase shadow-inner">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>SHUTTER: <strong className="text-amber-400">1/250s</strong></span>
              </div>
              <span className="text-zinc-850">|</span>
              <div>APERTURE: <strong className="text-amber-400">ƒ/2.8</strong></div>
              <span className="text-zinc-850">|</span>
              <div>ISO: <strong className="text-emerald-400">800</strong></div>
            </div>
            <div className="text-[9px] font-mono text-zinc-550 text-right uppercase tracking-[0.15em] mr-1">
              Focal calibration: 50mm PRIME
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 11 Primary Metrics in Elegant Bento Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* KPI 1 - Customer Leads */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-indigo-700" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Customer Leads</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight">{totalLeads}</span>
            <span className="text-[9px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono font-bold">
              ALL TIME
            </span>
          </div>
        </div>

        {/* KPI 2 - Today's Inflow */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Today's Inflow</span>
            <Calendar className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-400 tracking-tight">{todaysLeads}</span>
            <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono font-bold">
              2026-06-10
            </span>
          </div>
        </div>

        {/* KPI 3 - June Leads */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>June Leads</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight">{thisMonthLeads}</span>
            <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase">
              REVENUE MONTH
            </span>
          </div>
        </div>

        {/* KPI 4 - Signed Orders */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-cyan-500 to-sky-500" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Signed Orders</span>
            <CheckCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-100 tracking-tight">{confirmedOrdersNum}</span>
            <span className="text-[9px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-mono font-bold">
              ACTIVE CONTRACTS
            </span>
          </div>
        </div>

        {/* KPI 5 - Pending Shoots */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-500 to-pink-500" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Pending Shoots</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-100 tracking-tight">{pendingOrders}</span>
            <span className="text-[9px] text-zinc-500 font-mono font-bold">IN QUEUE</span>
          </div>
        </div>

        {/* KPI 6 - Events Prepped */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl relative overflow-hidden group hover:border-orange-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-500 to-amber-500" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Events Prepped</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-100 tracking-tight">{eventsScheduled}</span>
            <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded font-mono font-bold">
              READY SQUADS
            </span>
          </div>
        </div>

        {/* KPI 7 - Editing Suite */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 to-violet-600" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Editing Suite</span>
            <AlertCircle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-100 tracking-tight">{editingPending}</span>
            <span className="text-[9px] text-zinc-500 font-mono font-bold">EDIT TIMELINES</span>
          </div>
        </div>

        {/* KPI 8 - Delivered Reels */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl relative overflow-hidden group hover:border-teal-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-teal-500 to-emerald-400" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Delivered Reels</span>
            <CheckCircle className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-100 tracking-tight">{deliveredProjects}</span>
            <span className="text-[9px] px-2 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded font-mono font-bold">
              RELEASED MASTER
            </span>
          </div>
        </div>

        {/* KPI 9 - Settled Ledger */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl col-span-2 relative overflow-hidden group hover:border-amber-400/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Settled Ledger Balance</span>
            <Landmark className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-400 font-mono tracking-tight">
              {formatINR(totalCollected)}
            </span>
            <span className="text-[9px] px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono font-bold">
              CLEARED FUNDS
            </span>
          </div>
        </div>

        {/* KPI 10 - Receivables */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl col-span-1 relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-500 to-red-600" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Receivables</span>
            <AlertCircle className="w-4 h-4 text-rose-450" />
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-400 font-mono tracking-tight">
              {formatINR(totalOutstanding)}
            </span>
            <span className="text-[9.5px] font-mono text-zinc-550 font-bold uppercase">UNPAID</span>
          </div>
        </div>

        {/* KPI 11 - Lead Conversion */}
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-zinc-850 shadow-xl col-span-1 relative overflow-hidden group hover:border-teal-400/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-teal-400 to-emerald-500" />
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <span>Lead Conversion</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight">{conversionPct}%</span>
            <span className="text-[9.5px] font-mono text-zinc-550 font-bold uppercase">WIN RATE</span>
          </div>
        </div>
      </div>

      {/* Interactive photography vectorscope & real-time calibration monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Visual Calibration Meter */}
        <div className="lg:col-span-5 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 rounded-2xl border border-zinc-900 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-4 right-4 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            VECTORSCOPE // CAL-01
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>LIVE VECTORSCOPE INTEGRATOR</span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Interactive visualization of active photography color grading ranges.
            </p>
          </div>

          {/* SVG vectorscope simulation */}
          <div className="my-6 flex items-center justify-center">
            <div className="relative w-44 h-44 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center">
              {/* Target lines */}
              <div className="absolute w-full h-[1px] bg-zinc-850" />
              <div className="absolute h-full w-[1px] bg-zinc-850" />
              {/* Outer markers */}
              <div className="absolute top-1 text-[8px] font-mono text-rose-500 font-black">R</div>
              <div className="absolute right-1 text-[8px] font-mono text-amber-500 font-black font-semibold">YL</div>
              <div className="absolute left-1 text-[8px] font-mono text-indigo-400 font-black">B</div>
              <div className="absolute bottom-1 text-[8px] font-mono text-emerald-400 font-black">G</div>
              
              {/* Interactive circular ranges with radial dots */}
              <div className="absolute w-28 h-28 border border-zinc-850 rounded-full" />
              <div className="absolute w-14 h-14 border border-zinc-850/60 rounded-full" />
              
              {/* Dynamic waveform spline */}
              <svg className="absolute inset-0 w-full h-full transform rotate-12" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="1.5" className="fill-amber-500" />
                <path 
                  d="M 50 50 Q 64 35 70 48 T 50 50 Q 32 60 40 42 T 50 50" 
                  fill="none" 
                  stroke="url(#grade_gradient)" 
                  strokeWidth="1.5" 
                  className="animate-[pulse_4s_infinite_alternate]"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="grade_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div className="space-y-2 text-[11px] font-mono">
            <div className="flex justify-between border-b border-zinc-850 pb-1.5">
              <span className="text-zinc-500">Color Balance:</span>
              <span className="text-zinc-200">5600K DAYLIGHT</span>
            </div>
            <div className="flex justify-between border-b border-zinc-850 pb-1.5">
              <span className="text-zinc-500">Active Cameras:</span>
              <span className="text-emerald-400">Sony FX6 + RED V-Raptor</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Signal Integrity:</span>
              <span className="text-amber-400 font-bold">10-BIT 4:2:2 PRORES</span>
            </div>
          </div>
        </div>

        {/* FOCAL RANGE PIPELINE SYSTEM */}
        <div className="lg:col-span-7 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-900/80 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-500">📸</span>
                <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest font-mono">
                  FOCAL RANGE WORKFLOW PIPELINE
                </h3>
              </div>
              <span className="text-[9px] bg-zinc-950 text-zinc-400 px-2.5 py-1 rounded-md font-mono border border-zinc-800/80">
                STAGE-FLOW INDEX RATIO
              </span>
            </div>
            
            <p className="text-xs text-zinc-400">
              Interactive progression matrix showing how leads transition to confirmed camera contracts, live crew shoots, post-production render pipelines, and final master archives.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
            {pipelineStages.map((ps) => {
              const count = getStageCount(ps.stages);
              return (
                <div key={ps.label} className="bg-zinc-950/80 border border-zinc-850 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-800 hover:shadow-lg transition-all duration-200 relative group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-extrabold text-zinc-450 uppercase tracking-wider font-mono truncate max-w-[80px]">
                      {ps.label}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold ${ps.bgBadge}`}>
                      {count} lead{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-white font-mono">{count}</span>
                    <span className="text-[9px] text-zinc-650 font-mono">STATIONED</span>
                  </div>

                  <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-3">
                    <div 
                      className={`h-full ${ps.color}`} 
                      style={{ width: count > 0 ? `${Math.min(100, (count / totalLeads) * 100)}%` : '0%' }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 font-sans">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Conversion conversionPct is currently optimized at <strong className="text-amber-400">{conversionPct}%</strong>.</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">JUN 2026</span>
          </div>
        </div>

      </div>

      {/* Audit Log Overview */}
      <div className="bg-zinc-900/40 rounded-xl border border-zinc-900 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-900 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono">
              STUDIO DIGITAL AUDIT & SECURITY TRAIL
            </h3>
          </div>
          <span className="text-[9.5px] bg-zinc-950 text-amber-400 px-3 py-1 rounded font-mono border border-zinc-850 tracking-widest font-medium">
            AES_256_STABLE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-950/80 text-zinc-400 font-bold border-b border-zinc-900 text-[10px] uppercase font-mono tracking-wider">
                <th className="p-3.5 pl-5">Audit ID</th>
                <th className="p-3.5">Creative Operative</th>
                <th className="p-3.5">Division Access</th>
                <th className="p-3.5 whitespace-nowrap">Action Conducted</th>
                <th className="p-3.5">Division Code</th>
                <th className="p-3.5">Reference key</th>
                <th className="p-3.5 text-right pr-5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60 font-sans text-zinc-300">
              {logs.slice(0, 6).map((log) => (
                <tr key={log.log_id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="p-3.5 pl-5 font-mono text-[10px] text-amber-500/80 font-bold">
                    {log.log_id}
                  </td>
                  <td className="p-3.5 font-bold text-zinc-100 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-[9.5px] font-black text-amber-400 flex items-center justify-center font-mono border border-zinc-700 uppercase">
                      {log.user_name.substring(0, 2)}
                    </div>
                    <span>{log.user_name}</span>
                  </td>
                  <td className="p-3.5 font-mono text-[10px]">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold border ${
                      log.role === 'Business Owner' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      log.role === 'Sales Team' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      log.role === 'Operations Team' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                      'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}>
                      {log.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3.5 font-sans text-zinc-200">
                    {log.action}
                  </td>
                  <td className="p-3.5 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                    {log.module}
                  </td>
                  <td className="p-3.5 font-mono text-[10px] text-zinc-400 font-bold">
                    {log.record_id}
                  </td>
                  <td className="p-3.5 text-right text-[10px] text-zinc-500 pr-5 font-mono">
                    {formatTime12Hour(log.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
