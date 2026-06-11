import React, { useState } from 'react';
import { useRole } from './RoleContext';
import { 
  Users, Briefcase, Camera, Video, Compass, HelpCircle, HardDrive, Clock, Clipboard, FileCheck, CheckCircle, Ban
} from 'lucide-react';
import { Order } from '../types';

export const OperationsModule: React.FC = () => {
  const { currentRole, orders, operations, assignOperations, markEventCompleted } = useRole();

  // Role permissions gate
  const canEdit = currentRole === 'Operations Team' || currentRole === 'Business Owner';

  // Toggle selected order
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Assignment Form State
  const [form, setForm] = useState({
    photographer_assigned: '',
    videographer_assigned: '',
    drone_operator_assigned: '',
    assistant_assigned: '',
    equipment_kit: 'Kit Platinum Max (Hasselblad + RED V-Raptor)',
    reporting_time: '07:00',
    remarks: '',
  });

  // Server path for raw footage upload
  const [serverPath, setServerPath] = useState('');

  // Find assigned details if any
  const getOpDetails = (orderId: string) => {
    return operations.find((o) => o.order_id === orderId);
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrderId(order.order_id);
    const op = getOpDetails(order.order_id);
    if (op) {
      setForm({
        photographer_assigned: op.photographer_assigned || '',
        videographer_assigned: op.videographer_assigned || '',
        drone_operator_assigned: op.drone_operator_assigned || '',
        assistant_assigned: op.assistant_assigned || '',
        equipment_kit: op.equipment_kit || 'Kit Platinum Max (Hasselblad + RED V-Raptor)',
        reporting_time: op.reporting_time || '07:00',
        remarks: op.remarks || '',
      });
    } else {
      setForm({
        photographer_assigned: '',
        videographer_assigned: '',
        drone_operator_assigned: '',
        assistant_assigned: '',
        equipment_kit: 'Kit Platinum Max (Hasselblad + RED V-Raptor)',
        reporting_time: '07:00',
        remarks: '',
      });
    }
    setServerPath(`s3://photocrew-vault-production/2026/${order.order_id}-shoot/raw/`);
  };

  // Submit crew allocation
  const handleAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    if (!form.photographer_assigned || !form.videographer_assigned) {
      alert('Please assign at least a Lead Photographer and Lead Videographer.');
      return;
    }

    assignOperations(selectedOrderId, {
      photographer_assigned: form.photographer_assigned,
      videographer_assigned: form.videographer_assigned,
      drone_operator_assigned: form.drone_operator_assigned || 'None',
      assistant_assigned: form.assistant_assigned || 'None',
      equipment_kit: form.equipment_kit,
      reporting_time: form.reporting_time,
      remarks: form.remarks,
    });

    alert('Operations squad allocated successfully. Stage updated to [Operations Assigned]');
  };

  // Mark completion
  const handleMarkCompleted = () => {
    if (!selectedOrderId) return;
    markEventCompleted(selectedOrderId, serverPath);
    setSelectedOrderId(null);
    alert('Event Shoot completed successfully. Tracking ID and Raw Footage node initialized for production!');
  };

  // Filter: Show all orders that are confirmed or operations-managed (i.e., not Closed)
  // Page 9: "Order Queue: Show only confirmed orders."
  // Valid orders are those loaded into ORDERS database table! Let's list those.
  const activeOrders = orders.filter(o => o.current_stage !== 'Closed');

  return (
    <div id="operations_module" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <span className="p-1 px-2.5 bg-sky-500/10 text-sky-450 border border-sky-500/20 text-xs font-mono rounded tracking-widest">OPERATIONS</span>
          <span>Crew & Gear Dispatch</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Review booked orders, allocate crew personnel, deploy equipment kits, and execute shoot deliveries.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column Left: Verified Contract Queue */}
        <div className="lg:col-span-12 bg-zinc-900/40 backdrop-blur-sm rounded-2xl border border-zinc-850 overflow-hidden shadow-xl relative">
          <div className="p-4 border-b border-zinc-850 bg-zinc-950/70">
            <h3 className="text-[10px] font-black text-zinc-350 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>SCREEN // CONFIRMED CALLS</span>
            </h3>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {activeOrders.length > 0 ? (
              activeOrders.map((ord) => {
                const isSelected = selectedOrderId === ord.order_id;
                const op = getOpDetails(ord.order_id);
                return (
                  <div
                    key={ord.order_id}
                    onClick={() => handleSelectOrder(ord)}
                    className={`p-4 transition-all hover:bg-zinc-900/40 cursor-pointer text-left ${
                      isSelected ? 'bg-sky-500/10 border-l-2 border-sky-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono text-indigo-400 bg-slate-800/60 border border-slate-700/60 px-1.5 py-0.5 rounded">
                        {ord.order_id}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight uppercase ${
                        ord.current_stage === 'Order Confirmed' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        ord.current_stage === 'Operations Assigned' ? 'bg-sky-500/10 text-sky-450 border border-sky-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {ord.current_stage}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-201 mt-2.5">
                      {ord.customer_name}
                    </h4>

                    {/* Metadata summary */}
                    <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Camera className="w-3 h-3 text-slate-500" />
                        <span>Type: {ord.event_type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Date: {ord.event_date}</span>
                      </div>
                    </div>

                    {/* Crew Assigned indicators */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-mono">Assigned Action:</span>
                      {op ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" />
                          <span>Crew Deployed ({op.photographer_assigned})</span>
                        </span>
                      ) : (
                        <span className="text-rose-450 font-medium font-mono animate-pulse">Pending Allocation</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500">
                <Clipboard className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs">No active confirmed orders awaiting execution.</p>
              </div>
            )}
          </div>
        </div>

        {/* Column Right: Details & interactive assigning */}
        <div className="hidden space-y-6">
          {selectedOrderId ? (
            (() => {
              const order = orders.find((o) => o.order_id === selectedOrderId)!;
              const op = getOpDetails(selectedOrderId);
              return (
                <div className="bg-slate-850 p-5 rounded-xl border border-slate-800 space-y-5">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 border border-slate-700 rounded font-mono font-bold text-slate-400">
                        {order.order_id}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 mt-2">
                        Crew Dispatch for {order.customer_name}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400">
                      Loc: <strong className="text-slate-200">{order.event_location}</strong>
                    </span>
                  </div>

                  {/* Operational Details Form */}
                  <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                    <fieldset disabled={!canEdit} className="space-y-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Photographer field */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Photographer Assigned *
                          </label>
                          <div className="relative">
                            <Camera className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              required
                              placeholder="e.g. Jack Richards"
                              value={form.photographer_assigned}
                              onChange={(e) => setForm({ ...form, photographer_assigned: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-750 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                            />
                          </div>
                        </div>

                        {/* Videographer field */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Videographer Assigned *
                          </label>
                          <div className="relative">
                            <Video className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              required
                              placeholder="e.g. Tina Fey"
                              value={form.videographer_assigned}
                              onChange={(e) => setForm({ ...form, videographer_assigned: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-750 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Drone field */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Drone Operator / Aerialist
                          </label>
                          <div className="relative">
                            <Compass className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              placeholder="e.g. Leo Di Caprio"
                              value={form.drone_operator_assigned}
                              onChange={(e) => setForm({ ...form, drone_operator_assigned: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-755 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-105 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Assistant field */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Production Assistant
                          </label>
                          <div className="relative">
                            <Users className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              placeholder="e.g. Steve Rogers"
                              value={form.assistant_assigned}
                              onChange={(e) => setForm({ ...form, assistant_assigned: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-755 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-105 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Equipment Kit */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Assigned Equipment Kit
                          </label>
                          <select
                            value={form.equipment_kit}
                            onChange={(e) => setForm({ ...form, equipment_kit: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-755 rounded-lg py-1.5 px-3 text-xs text-slate-105"
                          >
                            <option value="Kit Gold: Sony A7iv, RED Komodo, DJI Inspire 3 Drone">Kit Gold: Sony A7iv, RED Komodo, DJI Inspire 3 Drone</option>
                            <option value="Kit Platinum Max: Hasselblad H6D, RED V-Raptor, ARRI Mini Cines">Kit Platinum Max: Hasselblad H6D, RED V-Raptor, ARRI Mini Cines</option>
                            <option value="Kit Light: Canon R5, Ronin S3, Gimbals and Apure Strobists">Kit Light: Canon R5, Ronin S3, Gimbals and Apure Strobists</option>
                            <option value="Kit Minimal Compact DSLR and GoPros">Kit Minimal Compact DSLR and GoPros</option>
                          </select>
                        </div>

                        {/* Reporting Time */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Reporting Time on Site
                          </label>
                          <input
                            type="time"
                            value={form.reporting_time}
                            onChange={(e) => setForm({ ...form, reporting_time: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-755 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                          />
                        </div>

                      </div>

                      {/* Operations Remarks */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Operations Notes & Safety Log
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Note site clearances, weather projections, sunset timing, or specific angles requested."
                          value={form.remarks}
                          onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-755 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-noneFocus"
                        ></textarea>
                      </div>

                    </fieldset>

                    {/* Submit assignments */}
                    {canEdit && (
                      <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-semibold bg-sky-650 hover:bg-sky-550 text-white rounded shadow-sm transition-all cursor-pointer"
                        >
                          Save Crew Assignment
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Completing Action Button - Page 9 */}
                  {op && canEdit && (
                    <div className="border-t border-slate-800 pt-5 space-y-3">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-semibold text-slate-205 flex items-center gap-1">
                          <span>🎬</span> Master Action: Mark Event Shoot Completed
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Clicking this initiates raw video storage, produces a tracking handle, and transitions to the post-production editor pipeline.
                        </p>
                      </div>

                      {/* Path to serve bucket */}
                      <div className="grid grid-cols-1 gap-2.5">
                        <label className="text-[10px] text-slate-450 uppercase font-mono font-bold">
                          Raw Footage Server Directory Path (S3/OSS)
                        </label>
                        <input
                          type="text"
                          value={serverPath}
                          onChange={(e) => setServerPath(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-2.5 text-xs text-slate-100 font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        id="btn_mark_event_completed"
                        onClick={handleMarkCompleted}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-650 to-blue-600 hover:from-sky-550 hover:to-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-sky-950/20 text-xs transition-all cursor-pointer"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>MARK EVENT COMPLETED & SEND TO PRODUCTION</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="bg-slate-850 p-12 text-center rounded-xl border border-slate-800 text-slate-500 space-y-2">
              <Camera className="w-12 h-12 text-slate-700 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">No Target Contract Selected</h4>
              <p className="text-xs max-w-sm mx-auto">
                Select any verified booking from the contract queue on the left to allocate camera operators and initiate shoot logs.
              </p>
            </div>
          )}

          {/* Role block check notification */}
          {!canEdit && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <Ban className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-red-400">Operations Edit Restrictions Active</h5>
                <p className="text-[11px] text-red-500/80 mt-1">
                  Only users representing the **Operations Team** or the **Business Owner** possess authorized credentials to allocate photographers, edit kit logs, or mark event shoots as complete. Feel free to use the switcher above to toggle your persona!
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Popup Modal for Details (Centered & Responsive for Desktop, Tablet, and Mobile) */}
      {selectedOrderId && (
        <div id="operations_details_mobile_modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850 sticky top-0 z-10 backdrop-blur-md">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <span>⚡</span>
                <span>Crew Dispatch Detail</span>
              </h3>
              <button 
                onClick={() => setSelectedOrderId(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Close
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {(() => {
                const order = orders.find((o) => o.order_id === selectedOrderId)!;
                if (!order) return null;
                const op = getOpDetails(selectedOrderId);
                return (
                  <div className="space-y-5">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 border border-slate-705 rounded font-mono font-bold text-slate-400">
                          {order.order_id}
                        </span>
                        <h3 className="text-sm font-bold text-slate-100 mt-2">
                          Crew Dispatch for {order.customer_name}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400">
                        Loc: <strong className="text-slate-205">{order.event_location}</strong>
                      </span>
                    </div>

                    {/* Operational Details Form */}
                    <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                      <fieldset disabled={!canEdit} className="space-y-4">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          {/* Photographer field */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">
                              Photographer Assigned *
                            </label>
                            <div className="relative">
                              <Camera className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                              <input
                                type="text"
                                required
                                placeholder="e.g. Jack Richards"
                                value={form.photographer_assigned}
                                onChange={(e) => setForm({ ...form, photographer_assigned: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                              />
                            </div>
                          </div>

                          {/* Videographer field */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">
                              Videographer Assigned *
                            </label>
                            <div className="relative">
                              <Video className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                              <input
                                type="text"
                                required
                                placeholder="e.g. Tina Fey"
                                value={form.videographer_assigned}
                                onChange={(e) => setForm({ ...form, videographer_assigned: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Drone field */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">
                              Drone Operator / Aerialist
                            </label>
                            <div className="relative">
                              <Compass className="w-4 h-4 text-slate-505 absolute left-2.5 top-2.5" />
                              <input
                                type="text"
                                placeholder="e.g. Leo Di Caprio"
                                value={form.drone_operator_assigned}
                                onChange={(e) => setForm({ ...form, drone_operator_assigned: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-105 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Assistant field */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">
                              Production Assistant
                            </label>
                            <div className="relative">
                              <Users className="w-4 h-4 text-slate-505 absolute left-2.5 top-2.5" />
                              <input
                                type="text"
                                placeholder="e.g. Steve Rogers"
                                value={form.assistant_assigned}
                                onChange={(e) => setForm({ ...form, assistant_assigned: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-105 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Equipment Kit */}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 mb-1">
                              Assigned Equipment Kit
                            </label>
                            <select
                              value={form.equipment_kit}
                              onChange={(e) => setForm({ ...form, equipment_kit: e.target.value })}
                              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200"
                            >
                              <option value="Kit Gold: Sony A7iv, RED Komodo, DJI Inspire 3 Drone">Kit Gold: Sony A7iv, RED Komodo, DJI Inspire 3 Drone</option>
                              <option value="Kit Platinum Max: Hasselblad H6D, RED V-Raptor, ARRI Mini Cines">Kit Platinum Max: Hasselblad H6D, RED V-Raptor, ARRI Mini Cines</option>
                              <option value="Kit Light: Canon R5, Ronin S3, Gimbals and Apure Strobists">Kit Light: Canon R5, Ronin S3, Gimbals and Apure Strobists</option>
                              <option value="Kit Minimal Compact DSLR and GoPros">Kit Minimal Compact DSLR and GoPros</option>
                            </select>
                          </div>

                          {/* Reporting Time */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">
                              Reporting Time on Site
                            </label>
                            <input
                              type="time"
                              value={form.reporting_time}
                              onChange={(e) => setForm({ ...form, reporting_time: e.target.value })}
                              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                        </div>

                        {/* Operations Remarks */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Operations Notes & Safety Log
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Note site clearances, weather projections, sunset timing, or specific angles requested."
                            value={form.remarks}
                            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                            className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none"
                          ></textarea>
                        </div>

                      </fieldset>

                      {/* Submit assignments */}
                      {canEdit && (
                        <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(null)}
                            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 text-xs font-semibold bg-sky-650 hover:bg-sky-550 text-white rounded shadow-sm transition-all cursor-pointer"
                          >
                            Save Crew Assignment
                          </button>
                        </div>
                      )}
                    </form>

                    {/* Completing Action Button - Page 9 */}
                    {op && canEdit && (
                      <div className="border-t border-slate-800 pt-5 space-y-3">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-xs font-semibold text-slate-205 flex items-center gap-1">
                            <span>🎬</span> Master Action: Mark Event Shoot Completed
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Clicking this initiates raw video storage, produces a tracking handle, and transitions to the post-production editor pipeline.
                          </p>
                        </div>

                        {/* Path to serve bucket */}
                        <div className="grid grid-cols-1 gap-2.5">
                          <label className="text-[10px] text-slate-450 uppercase font-mono font-bold">
                            Raw Footage Server Directory Path (S3/OSS)
                          </label>
                          <input
                            type="text"
                            value={serverPath}
                            onChange={(e) => setServerPath(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-100 font-mono"
                          />
                        </div>

                        <button
                          type="button"
                          id="btn_mark_event_completed_mobile"
                          onClick={handleMarkCompleted}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-650 to-blue-600 hover:from-sky-550 hover:to-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-sky-950/20 text-xs transition-all cursor-pointer"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>MARK EVENT COMPLETED & SEND TO PRODUCTION</span>
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
