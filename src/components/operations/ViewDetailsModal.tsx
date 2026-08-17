import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, MessageSquare, Mail, MapPin, Calendar, Clock, Package, ShieldCheck, Video, Camera, Award, FileText, CheckCircle2, ChevronDown, ChevronUp, Users, Check } from 'lucide-react';
import { useRole } from '../RoleContext';
import { deserializeLeadEvents, getEventTeamMemberStaffMapping, EventTeamMemberAssignmentGroup } from '../../utils';
import { SafeProofImage } from '../ui/SafeProofImage';

interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  booking?: any;
  isStaffView?: boolean;
}

export const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  booking,
  isStaffView
}) => {
  const { 
    currentRole,
    orders, 
    leads, 
    operations, 
    payments, 
    staffAssignments, 
    staff,
    equipment, 
    leadPackages, 
    packages,
    leadEquipmentHistory
  } = useRole();

  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(true);
  if (!isOpen || (!orderId && !booking)) return null;

  const isStaff = isStaffView || currentRole === 'Staff' || currentRole === 'Operation Staff';

  const rawTarget = orderId || booking?.orderId || booking?.order_id || booking?.leadId || '';
  const targetOrderId = typeof rawTarget === 'string' ? rawTarget.split('_')[0] : rawTarget;

  // Resolve Order & Lead data
  const order = orders?.find(o => o.order_id === targetOrderId || o.lead_id === targetOrderId);
  const lead = (order?.lead_id ? leads?.find(l => l.lead_id === order.lead_id) : null) || 
               leads?.find(l => l.lead_id === targetOrderId) ||
               (booking?.leadId ? leads?.find(l => l.lead_id === booking.leadId) : null) ||
               (booking?.lead_id ? leads?.find(l => l.lead_id === booking.lead_id) : null);
  const operation = operations?.find(op => op.order_id === targetOrderId || op.order_id === order?.order_id);
  const payment = payments?.find(p => p.order_id === targetOrderId || p.order_id === order?.order_id);
  const targetLeadPkgs = leadPackages?.filter(lp => lp.lead_id === (lead?.lead_id || targetOrderId)) || [];

  // Customer Details
  const customerName = order?.customer_name || lead?.customer_name || booking?.customerName || 'N/A';
  const mobileNumber = order?.mobile || lead?.mobile || booking?.customerMobile || 'N/A';
  const whatsappNumber = lead?.whatsapp_number || booking?.customerWhatsapp || order?.whatsapp_number || mobileNumber || 'N/A';
  const alternateMobile = lead?.alt_mobile || lead?.alternate_mobile || (lead as any)?.alt_phone || order?.alternate_mobile || booking?.customerAltMobile || 'N/A';
  const address = lead?.address || lead?.client_residence_address || order?.address || (lead?.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ''}` : null) || booking?.customerAddress || 'N/A';

  const finalOrderId = order?.order_id || booking?.orderId || targetOrderId || 'N/A';

  // Extract Event Team Member Assignment Groups using canonical helper
  const allAssignmentGroups = getEventTeamMemberStaffMapping({
    lead: lead,
    order: order,
    leadPkgs: targetLeadPkgs,
    staffAssignments: staffAssignments,
    operationsRecord: operation,
    staffList: staff,
    targetStaffName: booking?.assignedStaff || booking?.staff_name
  });

  const targetEvId = booking?.eventId || booking?.event_id || booking?.assignment?.event_id;
  const targetEvName = booking?.eventName || booking?.event_name || booking?.assignment?.event_name || booking?.shootType;
  const targetEvType = booking?.eventType || booking?.event_type || booking?.assignment?.event_type;

  let displayGroups = allAssignmentGroups;
  if (targetEvId || targetEvName || targetEvType) {
    const matched = allAssignmentGroups.filter(g => {
      if (targetEvId && String(g.eventId).toLowerCase() === String(targetEvId).toLowerCase()) return true;
      if (targetEvName && (g.eventName.toLowerCase() === String(targetEvName).toLowerCase() || g.eventType.toLowerCase() === String(targetEvName).toLowerCase())) return true;
      if (targetEvType && g.eventType.toLowerCase() === String(targetEvType).toLowerCase()) return true;
      return false;
    });
    if (matched.length > 0) {
      displayGroups = matched;
    }
  }

  // Extract Proof Records for this order
  const proofRecords = (leadEquipmentHistory || []).filter(h => {
    if (h.order_id && finalOrderId && h.order_id === finalOrderId) return true;
    if (h.lead_id && lead?.lead_id && h.lead_id === lead.lead_id) return true;
    return false;
  }).map(h => {
    let photoUrl = '';
    let rawFootageLink = '';
    let proofType = h.equipment_status || 'Proof';
    if (h.remarks) {
      try {
        const parsed = JSON.parse(h.remarks);
        photoUrl = parsed.photo_url || photoUrl;
        rawFootageLink = parsed.raw_footage_link || rawFootageLink;
        proofType = parsed.proof_type || proofType;
      } catch (e) {}
    }
    return {
      id: h.id,
      equipmentName: h.equipment_name,
      status: h.equipment_status,
      proofType,
      uploadedBy: h.returned_by || 'Staff',
      uploadedAt: h.returned_at ? new Date(h.returned_at).toLocaleString() : 'N/A',
      photoUrl,
      rawFootageLink
    };
  });

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/70 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg shrink-0">
              📋
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                  Order ID: <span className="text-amber-400">{finalOrderId}</span>
                </h3>
                {order?.order_status && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                    {order.order_status}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                {isStaff ? 'Assigned Operations Event Details & Team Roster' : 'Comprehensive Operations & Staff Assignment Dossier'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-zinc-300">
          
          {/* Section 1: Customer Details */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCustomerDetailsOpen(!isCustomerDetailsOpen)}
                className="flex items-center gap-2 text-xs font-bold text-sky-400 font-mono uppercase tracking-wider hover:text-sky-300 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-sky-400" /> Customer Details
                {isCustomerDetailsOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
              </button>
              <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-none">{customerName}</span>
            </div>

            {isCustomerDetailsOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-zinc-800/60 pt-3 mt-2">
                <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                  <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Customer Name</span>
                  <span className="text-xs font-bold text-white break-words">{customerName}</span>
                </div>
                <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                  <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Mobile Number</span>
                  <span className="text-xs font-semibold text-zinc-200 font-mono">{mobileNumber}</span>
                </div>
                <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                  <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">WhatsApp Number</span>
                  <span className="text-xs font-semibold text-zinc-200 font-mono">{whatsappNumber}</span>
                </div>
                <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                  <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Alternate Mobile</span>
                  <span className="text-xs font-semibold text-zinc-200 font-mono">{alternateMobile}</span>
                </div>
                <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60 sm:col-span-2 lg:col-span-4">
                  <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Address / Location</span>
                  <span className="text-xs font-semibold text-zinc-200 break-words">{address}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Event Details & Team Members Included Mapping */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                <Calendar className="w-4 h-4 text-amber-400" /> 
                {displayGroups.length > 1 ? `Events & Staff Allocations (${displayGroups.length} Events)` : 'Event Details & Staff Allocation'}
              </h4>
              <span className="text-xs font-mono text-zinc-400 font-bold">Order: {finalOrderId}</span>
            </div>

            {displayGroups.map((group, gIdx) => (
              <div key={group.eventId || gIdx} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
                
                {/* Event Title Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
                      {displayGroups.length > 1 ? `Event ${gIdx + 1}` : 'Event Type'}: {group.eventType}
                    </span>
                    <span className="text-sm font-black text-white font-mono">
                      {group.eventName}
                    </span>
                  </div>
                  {group.googleMapsLink && group.googleMapsLink !== 'N/A' && (
                    <a 
                      href={group.googleMapsLink.startsWith('http') ? group.googleMapsLink : `https://${group.googleMapsLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:text-sky-300 hover:underline font-mono inline-flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Venue Map
                    </a>
                  )}
                </div>

                {/* Event Timing & Location Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/60">
                    <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Event Date</span>
                    <span className="font-bold text-zinc-100 font-mono">{group.eventDate}</span>
                  </div>
                  <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/60">
                    <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Event Start Time</span>
                    <span className="font-bold text-emerald-400 font-mono">{group.eventStartTime}</span>
                  </div>
                  <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/60">
                    <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Reporting Date</span>
                    <span className="font-bold text-sky-300 font-mono">{group.reportingDate}</span>
                  </div>
                  <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/60">
                    <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Reporting Time</span>
                    <span className="font-bold text-sky-400 font-mono">{group.reportingTime}</span>
                  </div>
                  <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/60 sm:col-span-2 lg:col-span-3">
                    <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Event Location / Venue</span>
                    <span className="font-medium text-zinc-200 break-words">{group.location}</span>
                  </div>
                  <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/60">
                    <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Guest Pax</span>
                    <span className="font-semibold text-zinc-200">{group.guestPax}</span>
                  </div>
                </div>

                {/* Team Members Included & Staff Assignment Mapping Table */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-mono font-bold uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Team Members Included → Assigned Staff
                    </h5>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {group.mappings.filter(m => m.assignedStaffName !== 'Unassigned').length} / {group.mappings.length} Allocated
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/90 shadow-inner">
                    <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-zinc-900/90 border-b border-zinc-800 text-[10.5px] font-mono uppercase tracking-wider text-zinc-400">
                          <th className="py-2.5 px-4 font-bold">Team Member Included</th>
                          <th className="py-2.5 px-4 font-bold">Assigned Staff</th>
                          <th className="py-2.5 px-4 font-bold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {group.mappings.length > 0 ? (
                          group.mappings.map((mapping, mIdx) => (
                            <tr key={mIdx} className="hover:bg-zinc-900/40 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                                  <span className="font-bold text-zinc-100 font-sans">
                                    {mapping.teamMemberRole}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-bold ${mapping.assignedStaffName !== 'Unassigned' ? 'text-white' : 'text-zinc-500 italic'}`}>
                                    {mapping.assignedStaffName}
                                  </span>
                                  {mapping.assignedStaffName !== 'Unassigned' && mapping.assignedStaffType && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                      {mapping.assignedStaffType}
                                    </span>
                                  )}
                                </div>
                                {mapping.mobile && (
                                  <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                                    📞 {mapping.mobile}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                  mapping.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  mapping.status === 'In Progress' || mapping.status === 'Event Started' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                  mapping.status === 'Assigned' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                                  'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                }`}>
                                  {mapping.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-zinc-500 italic text-xs font-mono">
                              No Team Members Included configured for this event.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Section 3: Assigned Equipment (for staff member / booking) */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2 font-mono">
              <Package className="w-4 h-4 text-amber-400" /> Assigned Equipment
            </h4>
            {booking?.equipmentItems && booking.equipmentItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {booking.equipmentItems.map((item: any, idx: number) => (
                  <div key={idx} className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="block text-xs font-bold text-white truncate">{item.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500">Asset ID: {item.assetId}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-lg text-xs text-zinc-400 font-mono flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[11px] font-bold">Not Assigned</span>
                <span>No specific equipment assigned to this staff task.</span>
              </div>
            )}
          </div>

          {/* Section 4: Uploaded Verification Proof Images & Handover Docs */}
          {!(currentRole === 'Operations Team' || currentRole === 'Operation Staff') && (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2 font-mono">
                <Camera className="w-4 h-4 text-emerald-400" /> Uploaded Proofs & Handover Docs ({proofRecords.length})
              </h4>
              
              {proofRecords.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {proofRecords.map((rec, idx) => (
                    <div key={rec.id || idx} className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="block text-[11px] font-bold text-white">{rec.equipmentName}</span>
                          <span className="text-[10px] text-zinc-400">By: {rec.uploadedBy} • {rec.uploadedAt}</span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                          {rec.status}
                        </span>
                      </div>

                      {rec.photoUrl && (
                        <SafeProofImage url={rec.photoUrl} alt={rec.equipmentName} label="View Full Image" />
                      )}

                      {rec.rawFootageLink && (
                        <div className="p-2 bg-indigo-950/40 border border-indigo-800/50 rounded-lg">
                          <span className="block text-[9px] font-mono text-indigo-300 font-bold uppercase mb-0.5">Raw Footage Link</span>
                          <a 
                            href={rec.rawFootageLink.startsWith('http') ? rec.rawFootageLink : `https://${rec.rawFootageLink}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:underline font-mono break-all inline-flex items-center gap-1"
                          >
                            <Video className="w-3 h-3 shrink-0" /> Open Cloud Folder
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center border border-zinc-800/60 rounded-lg bg-zinc-950/40 text-xs text-zinc-500 italic">
                  No proof images or handover links uploaded for this event yet.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-mono"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

