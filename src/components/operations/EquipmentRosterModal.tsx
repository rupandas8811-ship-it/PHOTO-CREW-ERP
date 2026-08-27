import React from 'react';
import { createPortal } from 'react-dom';
import { X, Wrench, Calendar, MapPin, Tag, ShieldCheck } from 'lucide-react';
import { Equipment } from '../../types';

interface EquipmentRosterModalProps {
  equipmentTarget: Equipment;
  onClose: () => void;
}

export const EquipmentRosterModal: React.FC<EquipmentRosterModalProps> = ({
  equipmentTarget,
  onClose
}) => {
  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl space-y-0 my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm font-sans">Equipment Details</h4>
              <p className="text-[11px] text-slate-400 font-mono">{equipmentTarget.equipment_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">Brand & Model</span>
              <strong className="text-slate-200 text-xs">{equipmentTarget.brand || 'N/A'} {equipmentTarget.model || ''}</strong>
            </div>
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">Type</span>
              <strong className="text-indigo-400 text-xs">{equipmentTarget.equipment_type || 'General'}</strong>
            </div>
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">Serial Number</span>
              <strong className="text-slate-300 font-mono text-xs">{equipmentTarget.serial_number || 'N/A'}</strong>
            </div>
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">Current Status</span>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                equipmentTarget.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                equipmentTarget.status === 'Assigned' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {equipmentTarget.status || 'Available'}
              </span>
            </div>
          </div>

          {equipmentTarget.storage_location && (
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl flex items-center gap-2">
              <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Storage Location</span>
                <span className="text-slate-300">{equipmentTarget.storage_location}</span>
              </div>
            </div>
          )}

          {equipmentTarget.notes && (
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">Notes</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">{equipmentTarget.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end p-4 border-t border-slate-800 bg-slate-850/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
