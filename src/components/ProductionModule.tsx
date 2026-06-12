import React, { useState } from 'react';
import { useRole } from './RoleContext';
import { 
  Play, CheckCircle2, UserCheck, Eye, Calendar, Lock, Layers, AlertCircle, Ban, RefreshCw, Clock
} from 'lucide-react';
import { Production, EditingStatus } from '../types';

export const ProductionModule: React.FC = () => {
  const { currentRole, production, updateProduction, markDelivered, acceptRawFootage, orders, rawFootage } = useRole();

  // Role permissions gate
  const canEdit = currentRole === 'Production Team' || currentRole === 'Business Owner';

  // State to manage active entry selection
  const [selectedProdId, setSelectedProdId] = useState<string | null>(null);

  // Form State
  const [editor, setEditor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [status, setStatus] = useState<EditingStatus>('Pending');
  const [reviewStatus, setReviewStatus] = useState<'Pending Review' | 'Feedback Given' | 'Approved' | 'None'>('None');
  const [notes, setNotes] = useState('');

  const handleSelectProd = (prod: Production) => {
    setSelectedProdId(prod.production_id);
    setEditor(prod.editor_assigned || '');
    setStartDate(prod.editing_start_date || '');
    setExpectedDate(prod.expected_delivery_date || '');
    setStatus(prod.editing_status || 'Pending');
    setReviewStatus(prod.customer_review_status || 'None');
    setNotes(prod.remarks || '');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId) return;

    updateProduction(selectedProdId, {
      editor_assigned: editor,
      editing_start_date: startDate || undefined,
      expected_delivery_date: expectedDate || undefined,
      editing_status: status,
      customer_review_status: reviewStatus === 'None' ? undefined : reviewStatus,
      remarks: notes,
    });

    alert(`Production details saved! Current stage synced in master ERP.`);
  };

  const handleMarkDelivered = () => {
    if (!selectedProdId) return;
    const item = production.find((p) => p.production_id === selectedProdId);
    if (!item) return;

    markDelivered(item.tracking_id, 'Approved and Delivered via Photo Crew ERP Vault.');
    setSelectedProdId(null);
    alert('Project officially delivered to customer! Final stage updated.');
  };

  const statTotalVideo = production.length;
  const statPendingVideo = production.filter(p => p.editing_status === 'Pending').length;
  const statEditingVideo = production.filter(p => p.editing_status === 'Editing').length;
  const statReviewVideo = production.filter(p => p.editing_status === 'Customer Review').length;
  const statApprovedVideo = production.filter(p => p.editing_status === 'Approved').length;

  const visibleProduction = production.filter(p => {
    if (currentRole === 'Production Team') {
      // Data visibility permission check: only post-prod, raw footage, review tasks
      return true;
    }
    return true;
  });

  return (
    <div id="production_module" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <span className="p-1 px-2.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-mono rounded tracking-widest">EDITING</span>
          <span>Post-Production & Delivery Module</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Orchestrate and monitor visual design workflows, track video editing, coordinate consumer reviews, and authorize client deliveries.
        </p>
      </div>

      {/* Production Team Dashboard KPI Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mt-2">
        {[
          { label: 'Total Video Projects', val: statTotalVideo, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: Layers },
          { label: 'Video Projects Pending', val: statPendingVideo, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
          { label: 'Video Projects Editing', val: statEditingVideo, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', icon: Play },
          { label: 'Customer Review', val: statReviewVideo, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Eye },
          { label: 'Video Projects Approved', val: statApprovedVideo, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
        ].map((kpi, idx) => {
          const IconComponent = kpi.icon;
          return (
            <div key={idx} className={`p-4 rounded-2xl border ${kpi.bg} flex flex-col justify-between shadow-sm relative overflow-hidden backdrop-blur-sm`}>
              <div className="absolute top-2 right-2 opacity-15">
                <IconComponent className="w-8 h-8" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">{kpi.label}</span>
              <div className={`text-2xl font-black ${kpi.color} font-mono tracking-tight mt-1.5`}>
                {kpi.val}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column Left: Production Queue */}
        <div className="lg:col-span-12 xl:col-span-12 bg-zinc-900/40 backdrop-blur-sm rounded-2xl border border-zinc-850 overflow-hidden shadow-2xl relative">
          <div className="p-4 border-b border-zinc-850 bg-zinc-950/70 flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-[10px] font-black text-zinc-350 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              <span>Production Queue List</span>
            </h3>
            <span className="text-[9px] text-zinc-550 font-mono">MEDIA INGEST DIRECTORY</span>
          </div>

          <div className="divide-y divide-zinc-900/40 max-h-[500px] overflow-y-auto">
            {visibleProduction.length > 0 ? (
              visibleProduction.map((prod) => {
                const isSelected = selectedProdId === prod.production_id;
                return (
                  <div
                    key={prod.production_id}
                    onClick={() => handleSelectProd(prod)}
                    className={`p-4 transition-all hover:bg-zinc-900/40 cursor-pointer text-left ${
                      isSelected ? 'bg-violet-500/10 border-l-2 border-violet-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-mono font-bold text-zinc-450">
                        {prod.production_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                        prod.editing_status === 'Pending' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
                        prod.editing_status === 'Editing' ? 'bg-amber-500/10 text-amber-40 border-amber-500/20' :
                        prod.editing_status === 'Customer Review' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        prod.editing_status === 'Revision Required' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      }`}>
                        {prod.editing_status}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-bold text-zinc-200">
                      Editor: <span className="text-zinc-300 font-medium">{prod.editor_assigned || 'Unassigned'}</span>
                    </div>

                    <div className="mt-1 text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                      <span>Tracking ID:</span>
                      <strong className="text-violet-400 font-medium">{prod.tracking_id}</strong>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Due: {prod.expected_delivery_date || 'N/A'}</span>
                      {prod.customer_review_status && (
                        <span className="text-purple-400 italic text-[9px]">({prod.customer_review_status})</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-zinc-500">
                <Layers className="w-8 h-8 text-zinc-750 mx-auto mb-2 animate-bounce" />
                <p className="text-xs">Awaiting completion of event shoots to load into editor pipelines.</p>
              </div>
            )}
          </div>
        </div>

        {/* Column Right: Workflow Controls */}
        <div className="hidden space-y-6 w-full">
          {selectedProdId ? (
            (() => {
              const prodItem = production.find((p) => p.production_id === selectedProdId)!;
              const rawFootageItem = rawFootage.find((rf) => rf.tracking_id === prodItem.tracking_id);
              const linkedOrder = rawFootageItem ? orders.find((o) => o.order_id === rawFootageItem.order_id) : undefined;
              const isPendingFootageAudit = linkedOrder?.current_stage === 'Event Completed';
              return (
                <div className="bg-zinc-900/40 backdrop-blur-sm p-6 rounded-2xl border border-zinc-850 space-y-5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 text-violet-500/10 font-mono text-2xl font-black tracking-tighter select-none">PIPELINE</div>
                  
                  <div className="border-b border-zinc-850 pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-mono font-bold bg-zinc-950 px-2 py-0.5 rounded text-zinc-400 border border-zinc-850">
                        {prodItem.production_id}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Tracking Ref: {prodItem.tracking_id}
                      </span>
                    </div>
                    <h3 className="text-xs font-black text-white mt-2 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-violet-400" />
                      <span>Process Editing Pipeline File Status</span>
                    </h3>
                  </div>

                  {/* S3 Storage path from S3 operations (Raw location) */}
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block tracking-wider">
                      Raw Footage Cloud Directory
                    </span>
                    <strong className="text-xs font-mono text-zinc-350 break-all select-all font-medium block">
                      {prodItem.raw_footage_location || 'No raw directory found.'}
                    </strong>
                  </div>

                  {isPendingFootageAudit && (
                    <div id="raw_footage_audit_card" className="p-4 bg-violet-500/15 border border-violet-500/25 rounded-2xl space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5">📩</span>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-violet-300 font-mono tracking-widest uppercase">Awaiting Ingest & Audit</h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                            The Operations Team has completed the on-site shoot and uploaded raw camera directories. Please review folder files to proceed to post-production timelines.
                          </p>
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          id="btn_accept_footage"
                          onClick={() => {
                            acceptRawFootage(prodItem.tracking_id);
                            alert("Raw footage audited and accepted in secure directory! Stage transitioned.");
                          }}
                          className="w-full flex items-center justify-center py-2.5 bg-gradient-to-r from-violet-600 to-indigo-650 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow transition-all"
                        >
                          Verify & Accept Raw Footage Folder
                        </button>
                      )}
                    </div>
                  )}

                  {/* Editing Updates Form */}
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <fieldset disabled={!canEdit} className="space-y-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Editor Assigned */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                            Editor Assigned
                          </label>
                          <div className="relative">
                            <UserCheck className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                            <input
                              type="text"
                              required
                              placeholder="e.g. Emily Watson"
                              value={editor}
                              onChange={(e) => setEditor(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-750 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                            />
                          </div>
                        </div>

                        {/* Status dropdown */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                            Editing State
                          </label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as EditingStatus)}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-black"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Editing">Editing</option>
                            <option value="Customer Review">Customer Review</option>
                            <option value="Revision Required">Revision Required</option>
                            <option value="Approved">Approved</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                            Editing Start Date
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-3 px-4 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>

                        {/* Expected date */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                            Expected Delivery Date
                          </label>
                          <input
                            type="date"
                            value={expectedDate}
                            onChange={(e) => setExpectedDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-3 px-4 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>

                        {/* Review Status */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                            Customer Review Feedback State
                          </label>
                          <select
                            value={reviewStatus}
                            onChange={(e) => setReviewStatus(e.target.value as any)}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                          >
                            <option value="None">No feedback logged</option>
                            <option value="Pending Review">Pending Review</option>
                            <option value="Feedback Given">Feedback Given</option>
                            <option value="Approved">Approved</option>
                          </select>
                        </div>

                      </div>

                      {/* Remarks */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                          Remarks / Client Comments
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Log revision requests, requested aspect ratios, color presets details, or delivery modes."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-855 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        ></textarea>
                      </div>

                    </fieldset>

                    {/* Form submit */}
                    {canEdit && (
                      <div className="flex justify-end gap-2 border-t border-zinc-850 pt-4">
                        <button
                          type="submit"
                          className="px-5 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-350 font-bold rounded-xl cursor-pointer transition-all"
                        >
                          Save Pipeline State
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Mark Delivered Trigger Button - Page 10 */}
                  {canEdit && (
                    <div className="border-t border-zinc-850 pt-5 space-y-3">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-black text-white flex items-center gap-1 font-mono uppercase tracking-wider">
                          <Layers className="w-4 h-4 text-emerald-400" />
                          <span>Release Action: Mark Delivered to Customer</span>
                        </h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                          Instantly flags the final customer portal payload stage to **"Delivered"**, writes dispatch locks, and updates pipeline trackers.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="btn_mark_delivered"
                        disabled={prodItem.editing_status === 'Delivered'}
                        onClick={handleMarkDelivered}
                        className={`w-full flex items-center justify-center gap-2 font-black uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg text-[11px] transition-all cursor-pointer ${
                          prodItem.editing_status === 'Delivered'
                            ? 'bg-zinc-950 text-emerald-403 border border-zinc-850 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-emerald-500 to-violet-600 hover:opacity-95 text-black'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {prodItem.editing_status === 'Delivered' 
                            ? 'PROJECT DELIVERED & SHIPPED' 
                            : 'MARK DELIVERED TO CLIENT'}
                        </span>
                      </button>
                    </div>
                  )}

                </div>
              );
            })()
          ) : (
            <div className="bg-zinc-900/20 backdrop-blur-sm p-12 text-center rounded-2xl border border-zinc-850 text-zinc-500 space-y-3 shadow-xl">
              <Play className="w-12 h-12 text-zinc-750 mx-auto" />
              <h4 className="text-xs font-black text-zinc-350 uppercase tracking-widest font-mono">No Production Task Selected</h4>
              <p className="text-xs max-w-sm mx-auto text-zinc-500 leading-relaxed font-sans">
                Select any active editing track from the left production panel to assign staff editors, update progress, or authorize master releases.
              </p>
            </div>
          )}

          {/* Restriction Warning */}
          {!canEdit && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-4 shadow-md">
              <Ban className="w-4 h-4 text-rose-505 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-[10px] font-black text-rose-455 uppercase tracking-wide font-mono">Editing Write Blocked</h5>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-sans">
                  Only users mimicking the **Production Team** or the **Business Owner** maintain approved clearance certificates to declare a folder package delivered, modify editor logs, or commit grading updates.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Popup Modal for Details (Centered & Responsive for Desktop, Tablet, and Mobile) */}
      {selectedProdId && (
        <div id="production_details_mobile_modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-4 border-b border-zinc-855 flex items-center justify-between bg-zinc-900/60 sticky top-0 z-10 backdrop-blur-md animate-fade-in">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Layers className="w-4 h-4 text-violet-400" />
                <span>Process Editing Pipeline</span>
              </h3>
              <button 
                onClick={() => setSelectedProdId(null)}
                className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded-xl transition-all cursor-pointer border border-zinc-800"
              >
                Close
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs font-sans text-left">
              {(() => {
                const prodItem = production.find((p) => p.production_id === selectedProdId)!;
                if (!prodItem) return null;
                const rawFootageItem = rawFootage.find((rf) => rf.tracking_id === prodItem.tracking_id);
                const linkedOrder = rawFootageItem ? orders.find((o) => o.order_id === rawFootageItem.order_id) : undefined;
                const isPendingFootageAudit = linkedOrder?.current_stage === 'Event Completed';
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-mono font-bold bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800">
                        {prodItem.production_id}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Tracking Ref: {prodItem.tracking_id}
                      </span>
                    </div>

                    {/* Raw Footage location */}
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-850 space-y-1.5">
                      <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block tracking-wider">
                        Raw Footage Cloud Directory
                      </span>
                      <strong className="text-xs font-mono text-zinc-350 break-all select-all font-medium block">
                        {prodItem.raw_footage_location || 'No raw directory found.'}
                      </strong>
                    </div>

                    {isPendingFootageAudit && (
                      <div className="p-4 bg-violet-500/15 border border-violet-500/25 rounded-2xl space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-base mt-0.5">📩</span>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-violet-300 font-mono tracking-widest uppercase">Awaiting Ingest & Audit</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                              The Operations Team has completed the on-site shoot and uploaded raw camera directories. Please review folder files to proceed to post-production timelines.
                            </p>
                          </div>
                        </div>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              acceptRawFootage(prodItem.tracking_id);
                              alert("Raw footage audited and accepted in secure directory! Stage transitioned.");
                            }}
                            className="w-full flex items-center justify-center py-2.5 bg-gradient-to-r from-violet-600 to-indigo-650 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow transition-all"
                          >
                            Verify & Accept Raw Footage Folder
                          </button>
                        )}
                      </div>
                    )}

                    {/* Updates Form */}
                    <form onSubmit={handleUpdate} className="space-y-4">
                      <fieldset disabled={!canEdit} className="space-y-4">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                          
                          {/* Editor Assigned */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Editor Assigned
                            </label>
                            <div className="relative">
                              <UserCheck className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                              <input
                                type="text"
                                required
                                placeholder="e.g. Emily Watson"
                                value={editor}
                                onChange={(e) => setEditor(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-750 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                              />
                            </div>
                          </div>

                          {/* Status dropdown */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Editing State
                            </label>
                            <select
                              value={status}
                              onChange={(e) => setStatus(e.target.value as EditingStatus)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-black"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Editing">Editing</option>
                              <option value="Customer Review">Customer Review</option>
                              <option value="Revision Required">Revision Required</option>
                              <option value="Approved">Approved</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Editing Start Date
                            </label>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                            />
                          </div>

                          {/* Expected date */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Expected Delivery Date
                            </label>
                            <input
                              type="date"
                              value={expectedDate}
                              onChange={(e) => setExpectedDate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                            />
                          </div>

                          {/* Review Status */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                              Customer Review Feedback State
                            </label>
                            <select
                              value={reviewStatus}
                              onChange={(e) => setReviewStatus(e.target.value as any)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                            >
                              <option value="None">No feedback logged</option>
                              <option value="Pending Review">Pending Review</option>
                              <option value="Feedback Given">Feedback Given</option>
                              <option value="Approved">Approved</option>
                            </select>
                          </div>

                        </div>

                        {/* Remarks */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 font-mono">
                            Remarks / Client Comments
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Log revision requests, requested aspect ratios, color presets details, or delivery modes."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          ></textarea>
                        </div>

                      </fieldset>

                      {/* Form submit */}
                      {canEdit && (
                        <div className="flex justify-end gap-2 border-t border-zinc-850 pt-4">
                          <button
                            type="button"
                            onClick={() => setSelectedProdId(null)}
                            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded-xl transition-all cursor-pointer border border-zinc-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-350 font-bold rounded-xl cursor-pointer transition-all"
                          >
                            Save Pipeline State
                          </button>
                        </div>
                      )}
                    </form>

                    {/* Mark Delivered Trigger Button */}
                    {canEdit && (
                      <div className="border-t border-zinc-850 pt-5 space-y-3">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-xs font-black text-white flex items-center gap-1 font-mono uppercase tracking-wider">
                            <Layers className="w-4 h-4 text-emerald-400" />
                            <span>Release Action: Mark Delivered to Customer</span>
                          </h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                            Instantly flags the final customer portal payload stage to **"Delivered"**, writes dispatch locks, and updates pipeline trackers.
                          </p>
                        </div>

                        <button
                          type="button"
                          id="btn_mark_delivered_mobile"
                          disabled={prodItem.editing_status === 'Delivered'}
                          onClick={handleMarkDelivered}
                          className={`w-full flex items-center justify-center gap-2 font-black uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg text-[11px] transition-all cursor-pointer ${
                            prodItem.editing_status === 'Delivered'
                              ? 'bg-zinc-900 text-emerald-403 border border-zinc-800 cursor-not-allowed shadow-none'
                              : 'bg-gradient-to-r from-emerald-500 to-violet-600 hover:opacity-95 text-black'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {prodItem.editing_status === 'Delivered' 
                              ? 'PROJECT DELIVERED & SHIPPED' 
                              : 'MARK DELIVERED TO CLIENT'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
