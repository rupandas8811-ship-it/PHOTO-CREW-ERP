import React, { useState } from 'react';
import { useRole } from './RoleContext';
import { 
  X, User, Phone, Mail, MapPin, DollarSign, Calendar, Clock, Film, 
  CheckCircle, AlertCircle, RefreshCw, Layers, ArrowRight, Shield, FileText, Landmark
} from 'lucide-react';
import { formatINR, formatTime12Hour } from '../utils';
import { CurrentStage } from '../types';

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

const STAGES_ORDER: CurrentStage[] = [
  'New Lead',
  'Follow Up',
  'Quotation Sent',
  'Negotiation',
  'Order Confirmed',
  'Operations Assigned',
  'Event Scheduled',
  'Event Completed',
  'Raw Footage Received',
  'Editor Assigned',
  'Editing Started',
  'Customer Review',
  'Revision Required',
  'Approved',
  'Delivered',
  'Payment Pending',
  'Closed'
];

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ isOpen, onClose, orderId }) => {
  const { orders, leads, operations, rawFootage, production, payments, logs, currentRole, equipmentHandovers } = useRole();
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'operations' | 'production' | 'billing'>('overview');

  if (!isOpen || !orderId) return null;

  // Single Record Lookup Strategy
  const order = orders.find((o) => o.order_id === orderId);
  if (!order) return null;

  const lead = leads.find((l) => l.lead_id === order.lead_id);
  const operation = operations.find((op) => op.order_id === orderId);
  const footage = rawFootage.find((rf) => rf.order_id === orderId);
  const prod = footage ? production.find((p) => p.tracking_id === footage.tracking_id) : undefined;
  const payment = payments.find((p) => p.order_id === orderId);
  const projectLogs = logs.filter((log) => log.record_id === orderId || log.record_id === order.lead_id);
  const orderHandovers = equipmentHandovers ? equipmentHandovers.filter((eh) => eh.order_id === orderId) : [];

  // Stage sequence mapping helper
  const currentIndex = STAGES_ORDER.indexOf(order.current_stage);
  const previousStage = currentIndex > 0 ? STAGES_ORDER[currentIndex - 1] : 'N/A';
  const nextStage = currentIndex < STAGES_ORDER.length - 1 ? STAGES_ORDER[currentIndex + 1] : 'N/A';

  return (
    <div id="project_detail_master_modal" className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col relative">
        
        {/* Shutter calibrated overlay indicator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />
        
        {/* Header section with viewport frame corner highlights */}
        <div className="p-3 sm:p-4 border-b border-zinc-850 bg-zinc-900/60 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-0.5 px-2 bg-rose-500/15 text-rose-450 border border-rose-500/25 rounded text-[9px] font-mono tracking-widest font-bold">
                PROJECT RECORD LEDGER
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Order ID: {order.order_id}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight font-sans">
              {order.customer_name} &mdash; {order.package_name || 'Premium Shoot'}
            </h2>
          </div>
          <button 
            id="close_project_detail_modal_btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-3 sm:px-4.5 bg-zinc-950 flex border-b border-zinc-900 overflow-x-auto gap-0.5">
          {[
            { id: 'overview', label: 'Master Overview', icon: Layers },
            { id: 'sales', label: 'Contact & Sales', icon: FileText },
            { id: 'operations', label: 'Crew & Shoot', icon: Calendar },
            { id: 'production', label: 'Editing Suites', icon: Film },
            { id: 'billing', label: 'Billing & Cash', icon: Landmark }
          ].filter((tab) => {
            if (tab.id === 'billing' && currentRole === 'Production Team') {
              return false;
            }
            return true;
          }).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-2.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer  ${
                  isActive 
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5' 
                    : 'border-transparent text-zinc-450 hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Pane */}
        <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4 text-xs text-zinc-300">
          
          {/* TAB 1: OVERVIEW & SYSTEM WORKFLOW TIMELINE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Stage Transition Bar */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-center items-center divide-y md:divide-y-0 md:divide-x divide-zinc-850">
                <div className="pb-3 md:pb-0">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">Previous Stage</span>
                  <span className="text-zinc-400 font-bold font-mono tracking-tight bg-zinc-950 px-2.5 py-1 rounded border border-zinc-850">
                    {previousStage || 'N/A'}
                  </span>
                </div>
                <div className="py-3 md:py-0">
                  <span className="text-[10px] text-amber-500 font-mono uppercase tracking-widest block mb-1 font-bold">Current Status</span>
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-md font-extrabold uppercase font-mono tracking-wider">
                    {order.current_stage}
                  </span>
                </div>
                <div className="pt-3 md:pt-0">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">Next Expected Stage</span>
                  <span className="text-zinc-405 font-semibold font-mono tracking-tight bg-zinc-950 px-2.5 py-1 rounded border border-zinc-850">
                    {nextStage || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Progress Stepper Tracking */}
              <div id="modal_stepper_progress" className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-4">
                <h4 className="text-[10px] font-black tracking-widest font-mono text-zinc-450 uppercase">
                  ACTIVE PROGRESS MATRIX
                </h4>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 gap-2 overflow-x-auto pb-2">
                  {[
                    { flag: 'Confirmed', num: '1', label: 'Order Confirmed', active: currentIndex >= 4 },
                    { flag: 'Ops', num: '2', label: 'Crew Assigned', active: currentIndex >= 5 },
                    { flag: 'Shoot', num: '3', label: 'Event Shoot', active: currentIndex >= 7 },
                    { flag: 'Post', num: '4', label: 'Edit Suite', active: currentIndex >= 9 },
                    { flag: 'Review', num: '5', label: 'Customer Review', active: currentIndex >= 11 },
                    { flag: 'Finalised', num: '6', label: 'Project Approved', active: currentIndex >= 13 },
                    { flag: 'Delivered', num: '7', label: 'Delivered', active: currentIndex >= 14 },
                    { flag: 'Closed', num: '8', label: 'Closed/Settled', active: currentIndex >= 16 }
                  ].map((step, sIdx, sArr) => (
                    <React.Fragment key={step.num}>
                      <div className="flex flex-col items-center gap-1 min-w-[70px] relative">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold border transition-all ${
                          step.active 
                            ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/10' 
                            : 'bg-zinc-950 text-zinc-650 border-zinc-850'
                        }`}>
                          {step.active ? '✓' : step.num}
                        </div>
                        <span className={`text-[9px] font-bold text-center tracking-tight font-sans mt-1 ${step.active ? 'text-zinc-200' : 'text-zinc-600'}`}>
                          {step.label}
                        </span>
                      </div>
                      {sIdx < sArr.length - 1 && (
                        <div className={`flex-1 h-0.5 min-w-[15px] max-w-[50px] transition-all -mt-3 ${step.active && sArr[sIdx+1].active ? 'bg-amber-500' : 'bg-zinc-900'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Log History */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black tracking-widest font-mono text-zinc-400 uppercase flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-zinc-550" />
                  <span>TRANSACTIONAL SECURITY TRAIL & AUDIT HISTORY</span>
                </h4>
                
                <div className="bg-[#030303] border border-zinc-900 rounded-xl divide-y divide-zinc-900/60 max-h-[220px] overflow-y-auto">
                  {projectLogs.length > 0 ? (
                    projectLogs.map((log) => (
                      <div key={log.log_id} className="p-3 hover:bg-zinc-950 transition-all grid grid-cols-1 sm:grid-cols-12 gap-2 text-[11px] items-center font-mono">
                        <div className="sm:col-span-2 text-zinc-600 font-bold">
                          {log.log_id}
                        </div>
                        <div className="sm:col-span-3 text-zinc-200 flex flex-col gap-0.5">
                          <span className="font-bold">{log.user_name}</span>
                          <span className="text-[9px] text-zinc-550 leading-none">{log.role}</span>
                        </div>
                        <div className="sm:col-span-5 text-zinc-405 leading-normal text-left sm:text-left-important">
                          {log.action}
                        </div>
                        <div className="sm:col-span-2 text-zinc-500 text-right font-mono text-[10px]">
                          {log.date || log.timestamp.split('T')[0]} &nbsp;
                          <span className="text-zinc-650">{log.time || formatTime12Hour(log.timestamp)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-zinc-650 italic">
                      No matching audit footprints located in global secure key database.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CUSTOMER CONTACTS & SALES DETAILS */}
          {activeTab === 'sales' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Customer Dossier */}
              <div className="md:col-span-6 bg-[#030303] p-5 rounded-2xl border border-zinc-900 space-y-4">
                <h4 className="text-[10px] font-black tracking-widest font-mono text-zinc-400 uppercase flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  <span>CUSTOMER DOSSIER SUMMARY</span>
                </h4>
                
                <div className="space-y-3 font-sans">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">Customer Full Name</span>
                    <p className="text-sm font-bold text-zinc-150 mt-1">{order.customer_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">Primary Phone</span>
                      <p className="text-xs text-zinc-200 mt-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-zinc-600" />
                        <span>{order.mobile}</span>
                      </p>
                    </div>
                    {lead?.alternate_mobile && (
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">Alternate Phone</span>
                        <p className="text-xs text-zinc-200 mt-1 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-zinc-600" />
                          <span>{lead.alternate_mobile}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">Registered Email</span>
                    <p className="text-xs text-zinc-200 mt-1 flex items-center gap-1 font-mono">
                      <Mail className="w-3.5 h-3.5 text-zinc-600" />
                      <span>{lead?.email || 'N/A'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">Assigned Event Venue / Location</span>
                    <p className="text-xs text-zinc-300 mt-1 flex items-start gap-1 leading-relaxed">
                      <MapPin className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                      <span>{order.event_location}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Sales Deal Sheets */}
              <div className="md:col-span-6 bg-[#030303] p-5 rounded-2xl border border-zinc-900 space-y-4">
                <h4 className="text-[10px] font-black tracking-widest font-mono text-zinc-400 uppercase flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>SALES DEAL SHEET NOTES</span>
                </h4>
                
                <div className="space-y-3 font-mono">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Lead Origin Source</span>
                      <p className="text-xs text-zinc-200 font-bold mt-1 uppercase">{lead?.lead_source || 'Organic Search'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Acquiring Agent</span>
                      <p className="text-xs text-zinc-200 font-bold mt-1">{order.sales_person}</p>
                    </div>
                  </div>
                  <div className="border-t border-zinc-900/80 pt-3">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Service Retainer Contract</span>
                    <p className="text-xs text-amber-400 font-black mt-1 uppercase tracking-wider">{order.package_name}</p>
                  </div>
                  {currentRole !== 'Production Team' && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Master Audited Quote</span>
                        <p className="text-xs text-zinc-100 font-extrabold mt-1">{formatINR(order.quotation_amount)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Retainer Advance Deposited</span>
                        <p className="text-xs text-emerald-450 font-extrabold mt-1">{formatINR(order.advance_received)}</p>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-zinc-900/80 pt-3 font-sans">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">Sales Remarks & Retainer Reminders</span>
                    <p className="text-xs text-zinc-400 mt-1 italic whitespace-pre-line leading-relaxed max-h-[100px] overflow-y-auto">
                      {lead?.remarks || "No supplementary sales notation added to master lead record."}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CREW & OPERATIONAL SQUAD SCHEDULES */}
          {activeTab === 'operations' && (
            <div className="space-y-6">
              {operation ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Shoot scheduling dossier */}
                  <div className="md:col-span-5 bg-[#030303] p-5 rounded-2xl border border-zinc-900 space-y-4 font-mono">
                    <h4 className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-550" />
                      <span>SHOOT DATES & LOCATION LOCK</span>
                    </h4>
                    
                    <div className="space-y-3.5 text-xs text-zinc-300">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Event Date</span>
                        <p className="text-zinc-100 font-extrabold mt-1 flex items-center gap-1.5 text-sm">
                          <Calendar className="w-4 h-4 text-rose-500" />
                          <span>{order.event_date}</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Reporting Time Gate</span>
                        <p className="text-zinc-100 font-extrabold mt-1 flex items-center gap-1.5 text-sm">
                          <Clock className="w-4 h-4 text-emerald-500" />
                          <span>{operation.reporting_time || order.event_time}</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Event Stage Status</span>
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase mt-1 tracking-wider ${
                          operation.event_status === 'Completed' 
                            ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/25' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25'
                        }`}>
                          {operation.event_status || 'Assigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operative team assignments */}
                  <div className="md:col-span-7 bg-[#030303] p-5 rounded-2xl border border-zinc-900 space-y-4">
                    <h4 className="text-[10px] font-black tracking-widest font-mono text-zinc-400 uppercase flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>CREW OPERATIVE ROSTER</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 hover:border-zinc-850">
                        <span className="text-[9.5px] text-zinc-550 uppercase tracking-wide block">PRO PHOTOGRAPHER</span>
                        <p className="text-zinc-200 mt-1 font-bold text-xs break-words">
                          {operation.photographer_assigned || 'Unassigned'}
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 hover:border-zinc-850">
                        <span className="text-[9.5px] text-zinc-550 uppercase tracking-wide block">CINEMATOGRAPHER</span>
                        <p className="text-zinc-200 mt-1 font-bold text-xs break-words">
                          {operation.videographer_assigned || 'Unassigned'}
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 hover:border-zinc-850">
                        <span className="text-[9.5px] text-zinc-550 uppercase tracking-wide block">DRONE CAPTAIN</span>
                        <p className="text-zinc-200 mt-1 font-bold text-xs break-words">
                          {operation.drone_operator_assigned || 'Unassigned'}
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 hover:border-zinc-850">
                        <span className="text-[9.5px] text-zinc-550 uppercase tracking-wide block">CREW HELPER ASSIST</span>
                        <p className="text-zinc-200 mt-1 font-bold text-xs break-words">
                          {operation.assistant_assigned || 'Unassigned'}
                        </p>
                      </div>
                    </div>

                     <div className="border-t border-zinc-900 pt-3 text-xs space-y-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">Reporting Equipment Kits</span>
                        {operation.equipment_kit ? (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {operation.equipment_kit.split(',').map((kit: string, idx: number) => (
                              <span key={idx} className="bg-amber-400/10 text-amber-400 px-2 py-0.5 border border-amber-400/10 rounded-lg text-[9.5px] font-mono ">
                                ⚙️ {kit.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-zinc-500 mt-1 italic text-xs font-mono">
                            No equipment kits logged.
                          </p>
                        )}
                      </div>

                      {/* Equipment Return Log Tracking block */}
                      {orderHandovers.length > 0 && (
                        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 space-y-2">
                          <span className="text-[10px] text-amber-500 uppercase tracking-widest font-mono font-bold block">⚙️ Gear Return Handover Statuses</span>
                          <div className="space-y-2">
                            {orderHandovers.map((eh) => (
                              <div key={eh.id} className="text-[11px] font-mono border-b border-zinc-900 pb-1.5 last:border-0 last:pb-0 flex flex-col justify-between md:flex-row md:items-center">
                                <div className="space-y-0.5">
                                  <div className="font-sans font-bold text-zinc-250 text-xs">{eh.equipment_name}</div>
                                  <div className="text-zinc-500 text-[10px]">Returned by: <span className="text-zinc-400">{eh.returned_by}</span> | Date: <span className="text-zinc-400">{eh.return_date}</span></div>
                                  {eh.notes && <div className="text-zinc-400 italic text-[10.5px]">Notes: "{eh.notes}"</div>}
                                </div>
                                <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase self-start md:self-auto ${
                                  eh.return_status === 'Returned' ? 'bg-emerald-500/10 text-emerald-400' :
                                  eh.return_status === 'Damaged' ? 'bg-rose-500/10 text-rose-455 border border-rose-550/20' :
                                  eh.return_status === 'Missing' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                  'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {eh.return_status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center bg-zinc-900/20 border border-zinc-930 rounded-2xl text-zinc-500 space-y-2">
                  <AlertCircle className="w-8 h-8 text-zinc-750 mx-auto" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest font-mono text-zinc-400">Crew Allocation Pending</h4>
                  <p className="text-xs max-w-xs mx-auto text-zinc-650">
                    Operations has not assigned production camera operatives or locked reporting times for this contract reference.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: POST-PRODUCTION EDITING SUITES */}
          {activeTab === 'production' && (
            <div className="space-y-6">
              
              {/* Footage Transfer Path Status */}
              {footage && (
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl font-mono text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10.2px] text-zinc-500 uppercase block tracking-wider mb-0.5">Footage Tracking Ref</span>
                    <strong className="text-zinc-100">{footage.tracking_id}</strong>
                  </div>
                  <div className="bg-[#030303] p-1.5 px-3 rounded-lg border border-zinc-850 flex-1 w-full max-w-md">
                    <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Vault Server Path</span>
                    <span className="text-zinc-350 select-all break-words block text-[10px] text-left">{footage.server_path}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-md p-1.5 px-3 text-[10px] font-bold text-violet-400 uppercase tracking-tight">
                    <CheckCircle className="w-3.5 h-3.5 text-violet-400" />
                    <span>Raw Footage Ingested</span>
                  </div>
                </div>
              )}

              {prod ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Editing Suites status logs */}
                  <div className="md:col-span-5 bg-[#030303] p-5 rounded-2xl border border-zinc-900 space-y-4 font-mono">
                    <h4 className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                      <Film className="w-3.5 h-3.5 text-amber-500" />
                      <span>EDIT SUITE PIPELINE STATUS</span>
                    </h4>
                    
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Assigned Lead Editor</span>
                        <p className="text-zinc-100 font-bold mt-1 text-sm">
                          {prod.editor_assigned || 'Unallocated'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Expected Delivery Target</span>
                        <p className="text-zinc-200 mt-1 flex items-center gap-1 font-mono text-xs">
                          <Calendar className="w-4 h-4 text-rose-500" />
                          <span>{prod.expected_delivery_date || 'Not setup'}</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Editing Status State</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 tracking-wider ${
                          prod.editing_status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/25' :
                          prod.editing_status === 'Approved' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/25' :
                          prod.editing_status === 'Customer Review' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                          prod.editing_status === 'Revision Required' ? 'bg-rose-500/10 text-rose-455 border border-rose-500/25' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {prod.editing_status || 'Pending Ingestion'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Loops feedback & revision locks */}
                  <div className="md:col-span-7 bg-[#030303] p-5 rounded-2xl border border-zinc-900 space-y-4">
                    <h4 className="text-[10px] font-black tracking-widest font-mono text-zinc-400 uppercase flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>EDIT REVIEW LOGS & ACCESS LINKS</span>
                    </h4>
                    
                    <div className="space-y-4 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-550 uppercase tracking-widest block">Customer Review Link</span>
                        <p className="text-zinc-350 break-words mt-1 bg-zinc-950 p-1.5 px-3 rounded border border-zinc-900 select-all text-[11px]">
                          {prod.client_review_url || 'https://review.photocrew.erps.com/rev-loop-client...'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-1">
                        <div>
                          <span className="text-[10px] text-zinc-550 uppercase tracking-widest block">Customer Review Status</span>
                          <p className="text-zinc-200 font-bold mt-1 uppercase text-[11px]">{prod.customer_review_status || 'Awaiting Link'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-550 uppercase tracking-widest block">Editing Progress Weight</span>
                          <p className="text-zinc-200 font-bold mt-1 uppercase text-[11px]">{prod.editing_progress || '0%'}</p>
                        </div>
                      </div>
                      <div className="border-t border-zinc-900/85 pt-3 font-sans">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">Editor Log Notes</span>
                        <p className="text-xs text-zinc-400 mt-1 italic whitespace-pre-line leading-relaxed max-h-[100px] overflow-y-auto">
                          {prod.remarks || "No active supplementary logs updated by Assigned Editor."}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center bg-zinc-900/20 border border-zinc-930 rounded-2xl text-zinc-500 space-y-2">
                  <AlertCircle className="w-8 h-8 text-zinc-750 mx-auto" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest font-mono text-zinc-400">Post-Production Gated</h4>
                  <p className="text-xs max-w-xs mx-auto text-zinc-650 font-sans">
                    Project post-production records have not been initialized. Confirm crew allocations and mark the shoot "Completed" first to generate editable raw footage pools.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: BILLING & LEDGER DETAILS */}
          {activeTab === 'billing' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Financial balances ledger details */}
              <div className="md:col-span-5 bg-[#030303] p-5 rounded-2xl border border-zinc-900 space-y-4 font-mono">
                <h4 className="text-[10px] font-black tracking-widest text-zinc-450 uppercase flex items-center gap-2">
                  <Landmark className="w-3.5 h-3.5 text-rose-500" />
                  <span>CONTRACT BILLINGS LEDGER</span>
                </h4>
                
                {payment ? (
                  <div className="space-y-4 text-xs font-mono">
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 space-y-1">
                      <span className="text-[10px] text-zinc-600 block">Ledger ID</span>
                      <span className="text-zinc-200 font-bold">{payment.payment_id}</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-zinc-900 pb-2">
                        <span className="text-zinc-500">Contract Quotation Amount:</span>
                        <span className="text-zinc-200 font-bold">{formatINR(payment.quotation_amount)}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900 pb-2 text-emerald-400">
                        <span>Paid Retainer Advance:</span>
                        <span className="font-extrabold">{formatINR(payment.advance_received)}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900 pb-2 text-emerald-400">
                        <span>Paid Final Balance:</span>
                        <span className="font-extrabold">{formatINR(payment.final_payment_received)}</span>
                      </div>
                      <div className={`flex justify-between items-baseline pt-2 ${payment.balance_due > 0 ? 'text-rose-455 font-bold' : 'text-emerald-450 font-extrabold'}`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Remaining Outstanding Due:</span>
                        <span className="text-sm font-black">{formatINR(payment.balance_due)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-500 italic">No corresponding ledger account allocated.</div>
                )}
              </div>

              {/* Secure invoice / payment settlement details */}
              <div className="md:col-span-7 bg-[#030303] p-5 rounded-2xl border border-zinc-900 space-y-4">
                <h4 className="text-[10px] font-black tracking-widest font-mono text-zinc-400 uppercase flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-550" />
                  <span>PAYMENT CLEARANCES & RECEIPTS</span>
                </h4>
                
                {payment ? (
                  <div className="space-y-4 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-550 uppercase tracking-widest block">Ledger Settlement Status</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase mt-1 tracking-wider ${
                        payment.payment_status === 'Fully Paid' 
                          ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/25' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                      }`}>
                        {payment.payment_status}
                      </span>
                    </div>

                    <div className="border-t border-zinc-900/85 pt-3">
                      <span className="text-[10px] text-zinc-550 uppercase tracking-widest block">Audit Receipt URL Link</span>
                      <p className="text-zinc-350 break-words mt-1 bg-zinc-950 p-1.5 px-3 rounded border border-zinc-900 select-all text-[11px]">
                        {payment.proof_path_url || 'https://photocrew-receipts.s3.amazonaws.com/rec-31942.pdf'}
                      </p>
                    </div>

                    <div className="p-3 bg-zinc-950 border border-zinc-900 text-[11px] font-sans text-zinc-450 rounded-xl leading-relaxed">
                      🏦 Funds deposited in Photocrew vaults are reconciled automatically with standard business accounting files daily. Only authorized users with Sales/CEO credentials can adjust outstanding ledger entries.
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-500 italic">Ledger not active.</div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer with Actions calibration */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono text-zinc-550 flex-wrap gap-2">
          <span>CLEARED AUTH SYNC: SECURE DIGITAL ACCREDITED</span>
          <button 
            id="modal_secondary_close_btn"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-bold border border-zinc-800 rounded-xl cursor-pointer hover:text-white transition-all"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};
