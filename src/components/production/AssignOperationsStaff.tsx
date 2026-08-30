import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { X, UserCheck, Calendar, Clock, Camera, Video, Shield, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { useRole } from '../RoleContext';
import { formatDateDDMMYY } from '../../utils';

export interface AssignOperationsStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  operationItem?: any;
}

export const AssignOperationsStaffModal: React.FC<AssignOperationsStaffModalProps> = ({
  isOpen,
  onClose,
  order,
  operationItem
}) => {
  const { staff = [], pushInsert, pushUpdate, logActivity, currentUserName, refreshData } = useRole();

  const [photographer, setPhotographer] = useState('');
  const [videographer, setVideographer] = useState('');
  const [droneOperator, setDroneOperator] = useState('');
  const [assistant, setAssistant] = useState('');
  const [reportingTime, setReportingTime] = useState('');
  const [equipmentKit, setEquipmentKit] = useState('');
  const [remarks, setRemarks] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (operationItem) {
      setPhotographer(operationItem.photographer_assigned || '');
      setVideographer(operationItem.videographer_assigned || '');
      setDroneOperator(operationItem.drone_operator_assigned || '');
      setAssistant(operationItem.assistant_assigned || '');
      setReportingTime(operationItem.reporting_time || '');
      setEquipmentKit(operationItem.equipment_kit || '');
      setRemarks(operationItem.remarks || '');
    } else {
      setPhotographer('');
      setVideographer('');
      setDroneOperator('');
      setAssistant('');
      setReportingTime('');
      setEquipmentKit('');
      setRemarks('');
    }
    setErrorMsg(null);
  }, [operationItem, order, isOpen]);

  if (!isOpen || !order) return null;

  const orderId = order.order_id || order.id || '';

  const opsStaffList = (staff || []).filter(s => 
    s.status === 'Active' && 
    (s.department === 'Operations' || s.role?.toLowerCase().includes('photo') || s.role?.toLowerCase().includes('video') || s.role?.toLowerCase().includes('drone') || s.role?.toLowerCase().includes('assistant'))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (operationItem && operationItem.operation_id) {
        await pushUpdate('operations', 'operation_id', operationItem.operation_id, {
          photographer_assigned: photographer,
          videographer_assigned: videographer,
          drone_operator_assigned: droneOperator,
          assistant_assigned: assistant,
          reporting_time: reportingTime,
          equipment_kit: equipmentKit,
          remarks: remarks,
          updated_by: currentUserName || 'Production Desk'
        });
      } else {
        await pushInsert('operations', {
          operation_id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          order_id: orderId,
          photographer_assigned: photographer,
          videographer_assigned: videographer,
          drone_operator_assigned: droneOperator,
          assistant_assigned: assistant,
          reporting_time: reportingTime || '09:00 AM',
          equipment_kit: equipmentKit || 'Standard Kit',
          event_status: 'Assigned',
          remarks: remarks,
          updated_by: currentUserName || 'Production Desk'
        });
      }

      await logActivity({
        log_id: `log_${Date.now()}`,
        user_name: currentUserName || 'Production Desk',
        role: 'Production Staff',
        action: 'Updated Operations Staff Assignment',
        module: 'Production',
        record_id: orderId,
        timestamp: new Date().toISOString()
      });

      if (refreshData) refreshData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update operations crew assignment.');
    } finally {
      setIsSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 bg-zinc-950 z-[220] flex flex-col w-full h-full min-h-screen overflow-y-auto animate-in fade-in duration-200">
      
      {/* Full-screen Top Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors flex items-center gap-2 text-xs font-mono font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                FIELD CREW / OPERATIONS STAFF ASSIGNMENT
              </span>
              <span className="text-xs text-zinc-500 font-mono">Order ID: {orderId}</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white mt-1">
              {order.customer_name || 'Customer Event'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors text-xs font-mono font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6 text-xs font-mono shadow-xl">
          <div className="border-b border-zinc-800 pb-4">
            <h2 className="text-base font-bold text-white">Operations Crew Assignment Form</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Assign field photographers, videographers, drone operators, and reporting times for live events.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Photographer */}
            <div className="space-y-2">
              <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Assigned Photographer</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={photographer}
                onChange={(e) => setPhotographer(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            {/* Videographer */}
            <div className="space-y-2">
              <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                <span>Assigned Videographer</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Vikram Singh"
                value={videographer}
                onChange={(e) => setVideographer(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Drone Operator & Assistant Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-zinc-300 font-bold block">Drone Operator</label>
              <input
                type="text"
                placeholder="e.g. Amit Kumar"
                value={droneOperator}
                onChange={(e) => setDroneOperator(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-zinc-300 font-bold block">Assistant Crew</label>
              <input
                type="text"
                placeholder="e.g. Suresh V."
                value={assistant}
                onChange={(e) => setAssistant(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Reporting Time & Kit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Reporting Time</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 09:00 AM"
                value={reportingTime}
                onChange={(e) => setReportingTime(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-zinc-300 font-bold block">Equipment Kit</label>
              <input
                type="text"
                placeholder="e.g. Sony FX3 + A7IV + Gimbal"
                value={equipmentKit}
                onChange={(e) => setEquipmentKit(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <label className="text-zinc-300 font-bold block">Crew Notes / Special Instructions</label>
            <textarea
              rows={3}
              placeholder="e.g. Bring extra batteries, low light venue setup..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-blue-500 text-xs resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-black font-bold transition-all cursor-pointer shadow-lg shadow-blue-500/20 flex items-center gap-2 text-xs"
              disabled={isSaving}
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Field Crew'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  ,
  document.body
);
};