import React, { useState } from 'react';
import { 
  X, Calendar, Clock, User, Phone, MapPin, Tag, Film, Layers, CheckCircle, 
  ExternalLink, Eye, HardDrive, ShieldCheck, Image as ImageIcon, Plus, 
  FileText, ArrowUpRight, Upload
} from 'lucide-react';
import { useRole } from '../RoleContext';
import { formatINR, resolveStorageUrl, formatDateDDMMYY, formatTime12Hour } from '../../utils';

export interface ProductionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  productionItem?: any;
  onAssignEditor?: (taskToEdit?: any) => void;
  onAssignOps?: () => void;
  onUploadProof?: (assignment: any) => void;
  onPreviewImage?: (preview: { url: string; title: string }) => void;
}

export const ProductionDetailsModal: React.FC<ProductionDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  productionItem,
  onAssignEditor,
  onAssignOps,
  onUploadProof,
  onPreviewImage
}) => {
  const { editorAssignments = [], operations = [], rawFootage = [], pushUpdate, logActivity, currentUserName, refreshData } = useRole();

  const [rawDriveLink, setRawDriveLink] = useState('');
  const [editedDriveLink, setEditedDriveLink] = useState('');
  const [serverPath, setServerPath] = useState('');
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !order) return null;

  const orderId = order.order_id || order.id || productionItem?.order_id || '';
  const leadId = order.lead_id || productionItem?.lead_id || '';

  // Filter tasks belonging strictly to this order / production
  const matchedTasks = (editorAssignments || []).filter(ea => 
    (orderId && ea.order_id === orderId) ||
    (productionItem?.production_id && ea.production_id === productionItem.production_id)
  );

  const matchedOps = (operations || []).find(op => 
    (orderId && (op.order_id === orderId || op.event_id === orderId)) ||
    (leadId && op.lead_id === leadId)
  );

  const matchedFootage = (rawFootage || []).find(rf => 
    (orderId && rf.order_id === orderId) ||
    (leadId && rf.tracking_id === leadId)
  );

  const rawLink = productionItem?.raw_footage_location || matchedOps?.raw_footage_drive_link || matchedOps?.Raw_Footage_Drive_Link || matchedFootage?.server_path || 'Not set';
  const editedLink = productionItem?.delivery_link || 'Not set';
  const serverVaultPath = productionItem?.server_path || matchedFootage?.server_path || 'Not set';

  const handleSaveLinks = async () => {
    if (!productionItem?.production_id) return;
    setIsSaving(true);
    try {
      await pushUpdate('production', 'production_id', productionItem.production_id, {
        raw_footage_location: rawDriveLink || productionItem.raw_footage_location,
        delivery_link: editedDriveLink || productionItem.delivery_link,
        server_path: serverPath || productionItem.server_path,
        updated_at: new Date().toISOString()
      });

      if (refreshData) refreshData();
      setIsEditingLinks(false);
    } catch (e) {
      console.error('Failed to update drive links:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[210] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                PRODUCTION PROJECT DOSSIER
              </span>
              <span className="text-xs font-mono font-bold text-purple-400">
                Order ID: {orderId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{order.customer_name || 'Customer Project'}</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {order.custom_event_name || order.event_type || 'Event Photography'}
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar text-xs font-mono">
          
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Customer & Event details */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">Client Details</span>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">{order.customer_name || 'Client'}</p>
                {order.mobile && (
                  <p className="text-zinc-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>{order.mobile}</span>
                  </p>
                )}
                {order.event_location && (
                  <p className="text-zinc-400 flex items-center gap-1 truncate" title={order.event_location}>
                    <MapPin className="w-3 h-3 text-rose-400" />
                    <span>{order.event_location}</span>
                  </p>
                )}
                <p className="text-zinc-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  <span>Event Date: {order.event_date ? formatDateDDMMYY(order.event_date) : 'N/A'}</span>
                </p>
              </div>
            </div>

            {/* Field Operations Crew */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-zinc-500 font-bold">Field Operations Crew</span>
                {onAssignOps && (
                  <button
                    type="button"
                    onClick={onAssignOps}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    Edit Crew
                  </button>
                )}
              </div>
              <div className="space-y-1 text-zinc-300">
                <p>📷 Photo: <strong className="text-white">{matchedOps?.photographer_assigned || 'Unassigned'}</strong></p>
                <p>🎥 Video: <strong className="text-white">{matchedOps?.videographer_assigned || 'Unassigned'}</strong></p>
                <p>🛸 Drone: <strong className="text-white">{matchedOps?.drone_operator_assigned || 'N/A'}</strong></p>
                <p>⏰ Reporting: <strong className="text-amber-400">{matchedOps?.reporting_time || 'Standard'}</strong></p>
              </div>
            </div>

            {/* Editing Status & Priority */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">Production Overview</span>
              <div className="space-y-1.5">
                <div>
                  <span className="text-zinc-500 text-[10px] block">Main Status</span>
                  <span className="px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold">
                    {productionItem?.editing_status || productionItem?.production_status || 'New Project'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Main Lead Editor</span>
                  <span className="text-white font-bold">{productionItem?.editor_assigned || 'Unassigned'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Drive & Vault Repository Links */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4" />
                <span>Drive & Footage Repositories</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  if (isEditingLinks) {
                    handleSaveLinks();
                  } else {
                    setRawDriveLink(productionItem?.raw_footage_location || '');
                    setEditedDriveLink(productionItem?.delivery_link || '');
                    setServerPath(productionItem?.server_path || '');
                    setIsEditingLinks(true);
                  }
                }}
                className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
              >
                {isEditingLinks ? (isSaving ? 'Saving...' : 'Save Drive Links') : 'Edit Drive Links'}
              </button>
            </div>

            {isEditingLinks ? (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div>
                  <label className="text-zinc-400 block mb-1">Raw Footage Drive Link:</label>
                  <input
                    type="url"
                    value={rawDriveLink}
                    onChange={(e) => setRawDriveLink(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Edited Output Drive Link:</label>
                  <input
                    type="url"
                    value={editedDriveLink}
                    onChange={(e) => setEditedDriveLink(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Server Upload Vault Path:</label>
                  <input
                    type="text"
                    value={serverPath}
                    onChange={(e) => setServerPath(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs"
                    placeholder="/Volumes/Storage/2026/..."
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-850">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-zinc-500 block">Raw Footage Drive</span>
                  {rawLink && rawLink.startsWith('http') ? (
                    <a
                      href={rawLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 font-bold hover:underline truncate block mt-0.5 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">Open Drive Link</span>
                    </a>
                  ) : (
                    <span className="text-zinc-400 truncate block mt-0.5">{rawLink}</span>
                  )}
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-zinc-500 block">Edited Drive Review</span>
                  {editedLink && editedLink.startsWith('http') ? (
                    <a
                      href={editedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 font-bold hover:underline truncate block mt-0.5 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">Open Edited Link</span>
                    </a>
                  ) : (
                    <span className="text-zinc-400 truncate block mt-0.5">{editedLink}</span>
                  )}
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-zinc-500 block">Server Vault Location</span>
                  <span className="text-purple-300 font-mono truncate block mt-0.5">{serverVaultPath}</span>
                </div>
              </div>
            )}
          </div>

          {/* Individual Task Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Editor Task Breakdown ({matchedTasks.length})</span>
              </h3>

              {onAssignEditor && (
                <button
                  type="button"
                  onClick={() => onAssignEditor()}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Deliverable Task</span>
                </button>
              )}
            </div>

            {matchedTasks.length === 0 ? (
              <div className="p-6 text-center bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl space-y-2">
                <p className="text-zinc-400 font-medium text-xs">No individual editor deliverable tasks created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchedTasks.map((task) => {
                  const proofCandidate = task.confirmation_proof || task.customer_communication_proof || task.proof_url || task.uploaded_proof;
                  const resolvedProof = proofCandidate ? resolveStorageUrl(proofCandidate) : null;

                  return (
                    <div key={task.assignment_id} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-850 pb-2">
                        <div>
                          <span className="text-sm font-bold text-white block">{task.speciality || 'Deliverable Task'}</span>
                          <span className="text-xs text-zinc-400">Assigned Editor: <strong className="text-purple-300">{task.staff_name}</strong></span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                            ['Completed', 'Approved', 'Editing Completed'].includes(task.status)
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {task.status}
                          </span>

                          {onAssignEditor && (
                            <button
                              type="button"
                              onClick={() => onAssignEditor(task)}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Task Info & Isolated Proof View */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1 text-zinc-400">
                          <p>Assigned Date: <span className="text-zinc-200">{task.assigned_date ? formatDateDDMMYY(task.assigned_date) : 'N/A'}</span></p>
                          <p>Target Finish: <span className="text-zinc-200">{task.target_finish_date ? formatDateDDMMYY(task.target_finish_date) : 'N/A'}</span></p>
                          {task.edited_drive_link && (
                            <p className="truncate">
                              Output Drive: <a href={task.edited_drive_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Open Drive Link</a>
                            </p>
                          )}
                        </div>

                        {/* ISOLATED TASK PROOF VIEW */}
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase">Task Proof Image</span>
                            <span className="text-xs text-zinc-300 block truncate">
                              {resolvedProof ? 'Proof Attached' : 'No Proof Uploaded'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {resolvedProof && onPreviewImage && (
                              <button
                                type="button"
                                onClick={() => onPreviewImage({ url: resolvedProof, title: `Proof: ${task.speciality} (${task.staff_name})` })}
                                className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                            )}

                            {onUploadProof && (
                              <button
                                type="button"
                                onClick={() => onUploadProof(task)}
                                className="px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Upload className="w-3 h-3" />
                                <span>Upload</span>
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-all cursor-pointer"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};
