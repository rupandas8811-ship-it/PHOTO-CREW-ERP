import React from 'react';
import { 
  Film, Layers, Calendar, Clock, User, UserCheck, CheckCircle2, AlertCircle, 
  ExternalLink, Eye, Upload, RefreshCw, HardDrive, ShieldCheck, Tag, Plus, ChevronRight, Phone
} from 'lucide-react';
import { resolveStorageUrl, formatDateDDMMYY } from '../../utils';

export interface ProductionTaskTableProps {
  activeSubTab: string;
  orders: any[];
  productionList: any[];
  editorAssignments: any[];
  operationsList: any[];
  searchTerm: string;
  statusFilter: string;
  onSelectProject: (order: any, productionItem?: any) => void;
  onAssignEditor: (order: any, productionItem?: any, taskToEdit?: any) => void;
  onAssignOps: (order: any, operationItem?: any) => void;
  onReassignStaff?: (assignment: any) => void;
  onUploadProof: (assignment: any) => void;
  onUpdateStatus: (productionId: string, newStatus: string) => void;
  onPreviewImage: (preview: { url: string; title: string }) => void;
}

export const ProductionTaskTable: React.FC<ProductionTaskTableProps> = ({
  activeSubTab,
  orders = [],
  productionList = [],
  editorAssignments = [],
  operationsList = [],
  searchTerm,
  statusFilter,
  onSelectProject,
  onAssignEditor,
  onAssignOps,
  onReassignStaff,
  onUploadProof,
  onUpdateStatus,
  onPreviewImage
}) => {
  // Combine orders & production records safely
  const projectList = (orders || []).map(ord => {
    const matchedProd = (productionList || []).find(p => 
      p.order_id === ord.order_id || p.tracking_id === ord.order_id || p.order_id === ord.id
    ) || null;

    const matchedOps = (operationsList || []).find(op => 
      op.order_id === ord.order_id || op.event_id === ord.order_id
    ) || null;

    const matchedTasks = (editorAssignments || []).filter(ea => 
      ea.order_id === ord.order_id || (matchedProd?.production_id && ea.production_id === matchedProd.production_id)
    );

    return {
      order: ord,
      production: matchedProd,
      operations: matchedOps,
      tasks: matchedTasks
    };
  });

  // Search and status filter logic for Projects
  const filteredProjects = projectList.filter(item => {
    const q = (searchTerm || '').toLowerCase();
    const custName = (item.order?.customer_name || '').toLowerCase();
    const ordId = (item.order?.order_id || item.order?.id || '').toLowerCase();
    const editor = (item.production?.editor_assigned || '').toLowerCase();
    const eventType = (item.order?.event_type || item.order?.custom_event_name || '').toLowerCase();

    const matchesSearch = !q || custName.includes(q) || ordId.includes(q) || editor.includes(q) || eventType.includes(q);

    const mainStatus = item.production?.editing_status || item.production?.production_status || 'New Project';
    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Footage Received' && mainStatus.includes('Footage')) ||
      (statusFilter === 'Editor Assigned' && mainStatus.includes('Editor')) ||
      (statusFilter === 'Editing Started' && (mainStatus.includes('Editing') || mainStatus.includes('Progress'))) ||
      (statusFilter === 'Customer Review' && mainStatus.includes('Review')) ||
      (statusFilter === 'Completed' && (mainStatus.includes('Completed') || mainStatus.includes('Closed') || mainStatus.includes('Approved')));

    return matchesSearch && matchesStatus;
  });

  // Search and filter logic for Individual Tasks tab
  const filteredDeliverableTasks = (editorAssignments || []).filter(task => {
    const q = (searchTerm || '').toLowerCase();
    const staffName = (task.staff_name || '').toLowerCase();
    const spec = (task.speciality || '').toLowerCase();
    const ordId = (task.order_id || '').toLowerCase();

    const matchesSearch = !q || staffName.includes(q) || spec.includes(q) || ordId.includes(q);

    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Completed' && ['Completed', 'Approved', 'Editing Completed'].includes(task.status)) ||
      (statusFilter === 'Editing Started' && ['Editing Started', 'In Progress'].includes(task.status)) ||
      (statusFilter === 'Customer Review' && ['Customer Review', 'Client Review'].includes(task.status));

    return matchesSearch && matchesStatus;
  });

  if (activeSubTab === 'tasks') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Active Editor Deliverable Tasks ({filteredDeliverableTasks.length})</span>
          </h3>
        </div>

        {filteredDeliverableTasks.length === 0 ? (
          <div className="py-16 text-center bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl space-y-2 font-mono">
            <Film className="w-10 h-10 text-zinc-700 mx-auto" />
            <p className="text-zinc-400 font-medium text-sm">No editor deliverable tasks match your filter parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
            {filteredDeliverableTasks.map(task => {
              const proofCandidate = task.confirmation_proof || task.customer_communication_proof || task.proof_url || task.uploaded_proof;
              const resolvedProof = proofCandidate ? resolveStorageUrl(proofCandidate) : null;

              return (
                <div key={task.assignment_id} className="bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/40 rounded-2xl p-4 space-y-3 transition-all shadow-lg flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 border-b border-zinc-850 pb-2.5">
                      <div>
                        <span className="text-sm font-bold text-white block">{task.speciality || 'Deliverable Task'}</span>
                        <span className="text-xs text-zinc-400 block">
                          Order ID: <strong className="text-zinc-200">{task.order_id || 'N/A'}</strong>
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        ['Completed', 'Approved', 'Editing Completed'].includes(task.status)
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {task.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-zinc-300">
                      <p className="flex items-center justify-between">
                        <span className="text-zinc-500">Editor:</span>
                        <strong className="text-purple-300 font-bold">{task.staff_name}</strong>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-zinc-500">Assigned Date:</span>
                        <span>{task.assigned_date ? formatDateDDMMYY(task.assigned_date) : 'N/A'}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-zinc-500">Target Finish:</span>
                        <span className="text-amber-300 font-bold">{task.target_finish_date ? formatDateDDMMYY(task.target_finish_date) : 'N/A'}</span>
                      </p>

                      {task.edited_drive_link && (
                        <p className="pt-1 truncate">
                          <a href={task.edited_drive_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">Open Edited Drive Link</span>
                          </a>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Task Proof Box - ISOLATED TO THIS SPECIFIC TASK */}
                  <div className="pt-3 border-t border-zinc-850 space-y-2">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-zinc-500 block uppercase">Task Proof Image</span>
                        <span className="text-xs text-zinc-300 block truncate">
                          {resolvedProof ? 'Proof Uploaded' : 'No Proof Attached'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {resolvedProof && (
                          <button
                            type="button"
                            onClick={() => onPreviewImage({ url: resolvedProof, title: `Proof: ${task.speciality} (${task.staff_name})` })}
                            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onUploadProof(task)}
                          className="px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload</span>
                        </button>
                      </div>
                    </div>

                    {onReassignStaff && (
                      <button
                        type="button"
                        onClick={() => onReassignStaff(task)}
                        className="w-full py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                        <span>Reassign Task Editor</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // OVERVIEW TAB: Grouped Production Projects List
  return (
    <div className="space-y-4 font-mono">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Film className="w-4 h-4 text-purple-400" />
          <span>Production Projects Dossiers ({filteredProjects.length})</span>
        </h3>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl space-y-2">
          <Film className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-400 font-medium text-sm">No production projects match your query parameters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map(({ order, production, operations, tasks }) => {
            const currentStatus = production?.editing_status || production?.production_status || 'New Project';
            const orderId = order.order_id || order.id || '';

            return (
              <div 
                key={orderId}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/40 rounded-2xl p-4 sm:p-5 transition-all shadow-xl space-y-4"
              >
                {/* Project Header Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-850 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">
                        Order ID: {orderId}
                      </span>
                      <span className="text-xs text-zinc-400 font-bold">
                        {order.custom_event_name || order.event_type || 'Photography Event'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>{order.customer_name || 'Customer'}</span>
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>Event Date: {order.event_date ? formatDateDDMMYY(order.event_date) : 'N/A'}</span>
                      </span>
                      {order.mobile && (
                        <span className="flex items-center gap-1 text-zinc-300">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{order.mobile}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Dropdown & Main Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5">
                      <span className="text-[10px] text-zinc-500 uppercase">Stage:</span>
                      <select
                        value={currentStatus}
                        onChange={(e) => {
                          if (production?.production_id) {
                            onUpdateStatus(production.production_id, e.target.value);
                          }
                        }}
                        className="bg-transparent text-xs font-bold text-purple-300 focus:outline-none cursor-pointer"
                      >
                        <option value="New Project" className="bg-zinc-900 text-white">New Project</option>
                        <option value="Footage Received" className="bg-zinc-900 text-white">Footage Received</option>
                        <option value="Editor Assigned" className="bg-zinc-900 text-white">Editor Assigned</option>
                        <option value="Editing Started" className="bg-zinc-900 text-white">Editing Started</option>
                        <option value="In Progress" className="bg-zinc-900 text-white">In Progress</option>
                        <option value="Customer Review" className="bg-zinc-900 text-white">Customer Review</option>
                        <option value="Approved" className="bg-zinc-900 text-white">Approved</option>
                        <option value="Completed" className="bg-zinc-900 text-white">Completed / Closed</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectProject(order, production)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <span>Full Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main Content Grid: Editor & Crew info, Deliverable badges, Drive links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  
                  {/* Lead Editor & Crew */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Assigned Crew</span>
                      <button
                        type="button"
                        onClick={() => onAssignEditor(order, production)}
                        className="text-[10px] text-purple-400 hover:underline cursor-pointer"
                      >
                        Assign Editor
                      </button>
                    </div>
                    <p className="text-zinc-300">Lead Editor: <strong className="text-purple-300">{production?.editor_assigned || 'Unassigned'}</strong></p>
                    <p className="text-zinc-400 text-[11px]">Field Photo: <strong className="text-zinc-200">{operations?.photographer_assigned || 'N/A'}</strong></p>
                    <p className="text-zinc-400 text-[11px]">Field Video: <strong className="text-zinc-200">{operations?.videographer_assigned || 'N/A'}</strong></p>
                  </div>

                  {/* Tasks Breakdown */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Deliverable Tasks ({tasks.length})</span>
                      <button
                        type="button"
                        onClick={() => onAssignEditor(order, production)}
                        className="text-[10px] text-purple-400 hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Task</span>
                      </button>
                    </div>
                    {tasks.length === 0 ? (
                      <p className="text-zinc-500 text-[11px] italic">No specific deliverable tasks created.</p>
                    ) : (
                      <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar">
                        {tasks.map((t: any) => (
                          <div key={t.assignment_id} className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-300 truncate" title={t.speciality}>{t.speciality}</span>
                            <span className="text-purple-400 shrink-0 font-bold ml-1">{t.staff_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Drive Links & Actions */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Raw Footage Source</span>
                      {production?.raw_footage_location && production.raw_footage_location.startsWith('http') ? (
                        <a 
                          href={production.raw_footage_location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 text-[11px] font-bold hover:underline truncate block flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">Open Raw Drive</span>
                        </a>
                      ) : (
                        <span className="text-zinc-400 text-[11px] truncate block">
                          {production?.raw_footage_location || 'Drive link pending'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-900">
                      <button
                        type="button"
                        onClick={() => onAssignOps(order, operations)}
                        className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 text-[11px] font-bold cursor-pointer text-center"
                      >
                        Field Crew
                      </button>
                      <button
                        type="button"
                        onClick={() => onAssignEditor(order, production)}
                        className="flex-1 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[11px] font-bold cursor-pointer text-center"
                      >
                        Assign Editor
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
