import React, { useState, useEffect } from 'react';
import { useRole } from './RoleContext';
import { MapPin, Calendar, Clock, Briefcase, Camera, User } from 'lucide-react';
import { Lead, Order, Operation, StaffAssignment } from '../types';

export const StaffModule: React.FC = () => {
  const { currentUser, staff, leads, orders, operations, staffAssignments } = useRole();

  // Get the matching staff record based on mobile
  const staffMember = staff.find(s => s.mobile === currentUser?.mobile);
  const staffName = staffMember?.name || currentUser?.name || 'Staff';

  // State
  const [activeBookings, setActiveBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!staffName) return;

    const bookings: any[] = [];

    (leads || []).forEach((lead) => {
      const order = (orders || []).find(o => o.lead_id === lead.lead_id);
      const op = operations.find(o => o.order_id === (order?.order_id || lead.lead_id));

      const bookingStage = order?.current_stage || lead.status;
      const eventStatus = op?.event_status || 'Assigned';

      const isCompletedOrCancelled = [
        'completed', 'event completed', 'raw footage received', 'event cancelled', 'closed', 'delivered', 'cancelled'
      ].includes(bookingStage.toLowerCase()) || [
        'completed', 'event completed', 'cancelled'
      ].includes(eventStatus.toLowerCase());

      if (isCompletedOrCancelled) return;

      let hasEventAssignment = false;
      if (lead.events && lead.events.length > 0) {
        lead.events.forEach((ev) => {
          const assignedNames = ev.assigned_staff_names 
            ? ev.assigned_staff_names.split(',').map(n => n.trim().toLowerCase()) 
            : [];
            
          if (assignedNames.includes(staffName.toLowerCase())) {
            hasEventAssignment = true;
            
            let equipmentAssigned = 'None';
            const mobilesRaw = ev.assigned_staff_mobiles || '';
            if (mobilesRaw.includes(' || EQUIPMENT: JSON:')) {
               try {
                  const parts = mobilesRaw.split(' || EQUIPMENT: JSON:');
                  const staffEqs = JSON.parse(parts[1]);
                  const names = ev.assigned_staff_names ? ev.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase()) : [];
                  const idx = names.indexOf(staffName.toLowerCase());
                  if (idx !== -1 && staffEqs[idx] && staffEqs[idx].length > 0) {
                      equipmentAssigned = staffEqs[idx].join(', ');
                  }
               } catch(e) {}
            } else if (mobilesRaw.includes(' || EQUIPMENT: ')) {
              const parts = mobilesRaw.split(' || EQUIPMENT: ');
              equipmentAssigned = parts[1] || 'None';
            } else if (op?.equipment_kit) {
              equipmentAssigned = op.equipment_kit;
            }

            const staffObj = staff?.find(s => s.name.toLowerCase() === staffName.toLowerCase());
            let assignedRole = staffObj ? staffObj.role : 'Crew';
            const sa = staffAssignments?.find(s => s.order_id === order?.order_id && s.staff_name.toLowerCase() === staffName.toLowerCase());
            if (sa?.staff_role) {
              assignedRole = sa.staff_role;
            }

            bookings.push({
              id: `event-${ev.id}-${staffName}`,
              eventName: ev.event_type === 'Other' ? (ev.event_name || 'Other Event') : (ev.event_type || 'N/A'),
              clientName: lead.customer_name || order?.customer_name || 'N/A',
              shootType: ev.event_shoot_type || lead.shoot_type || 'N/A',
              assignedRole: assignedRole,
              eventDate: ev.event_date || 'N/A',
              eventStartTime: ev.event_start_time || 'N/A',
              eventEndTime: ev.event_end_time || 'N/A',
              reportingDate: ev.reporting_date || ev.event_date || 'N/A',
              reportingTime: ev.reporting_time || 'N/A',
              venue: ev.event_location || lead.event_location || 'N/A',
              googleMapsLink: ev.google_maps_link || 'N/A',
              leadStatus: lead.status,
              equipmentAssigned: equipmentAssigned,
              coordinator: op?.operations_coordinator || 'Unassigned',
              eventStatus: eventStatus,
              bookingStatus: bookingStage
            });
          }
        });
      }

      if (!hasEventAssignment) {
        const isAssignedInOp = op && (
          op.photographer_assigned?.toLowerCase() === staffName.toLowerCase() ||
          op.videographer_assigned?.toLowerCase() === staffName.toLowerCase() ||
          op.drone_operator_assigned?.toLowerCase() === staffName.toLowerCase() ||
          op.assistant_assigned?.toLowerCase() === staffName.toLowerCase()
        );
        const hasStaffAssignment = staffAssignments?.some(sa => 
          sa.order_id === order?.order_id && 
          sa.staff_name.toLowerCase() === staffName.toLowerCase() &&
          sa.assignment_status !== 'Cancelled'
        );

        if (isAssignedInOp || hasStaffAssignment) {
          let assignedRole = 'Crew';
          if (op) {
            if (op.photographer_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Photographer';
            else if (op.videographer_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Videographer';
            else if (op.drone_operator_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Drone Operator';
            else if (op.assistant_assigned?.toLowerCase() === staffName.toLowerCase()) assignedRole = 'Assistant';
          }
          if (assignedRole === 'Crew') {
            const staffObj = staff?.find(s => s.name.toLowerCase() === staffName.toLowerCase());
            if (staffObj) assignedRole = staffObj.role;
          }
          const sa = staffAssignments?.find(s => s.order_id === order?.order_id && s.staff_name.toLowerCase() === staffName.toLowerCase());
          if (sa?.staff_role) {
            assignedRole = sa.staff_role;
          }

          bookings.push({
            id: `order-${order?.order_id || lead.lead_id}-${staffName}`,
            eventName: lead.event_name || lead.shoot_type || 'General Shoot',
            clientName: lead.customer_name || order?.customer_name || 'N/A',
            shootType: lead.shoot_type || 'N/A',
            assignedRole: assignedRole,
            eventDate: lead.event_date || 'N/A',
            eventStartTime: lead.event_start_time || 'N/A',
            eventEndTime: 'N/A',
            reportingDate: lead.Reporting_date || lead.event_date || 'N/A',
            reportingTime: lead.reporting_time || 'N/A',
            venue: lead.event_location || 'N/A',
            googleMapsLink: 'N/A',
            leadStatus: lead.status,
            equipmentAssigned: op?.equipment_kit || 'None',
            coordinator: op?.operations_coordinator || 'Unassigned',
            eventStatus: eventStatus,
            bookingStatus: bookingStage
          });
        }
      }
    });

    setActiveBookings(bookings);
  }, [leads, orders, operations, staffAssignments, staffName, staff]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Staff Dashboard</h2>
          <p className="text-zinc-400 font-mono text-xs mt-1">Welcome, {staffName}</p>
        </div>
      </div>

      {activeBookings.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Active Bookings</h3>
          <p className="text-zinc-400 text-sm max-w-sm mx-auto">
            You currently have no active assignments. New shoots and events assigned to you will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeBookings.map((booking) => (
            <div key={booking.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
              <div className="p-5 border-b border-zinc-800/60 flex justify-between items-start gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-mono font-bold uppercase tracking-wider mb-3">
                    {booking.shootType}
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight">{booking.eventName}</h3>
                  <p className="text-zinc-400 text-sm mt-1">{booking.clientName}</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Date</span>
                    <div className="flex items-center gap-2 text-zinc-200 text-sm font-medium">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      {booking.eventDate}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Reporting Time</span>
                    <div className="flex items-center gap-2 text-zinc-200 text-sm font-medium">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      {booking.reportingTime}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Location</span>
                  <div className="flex items-start gap-2 text-zinc-200 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{booking.venue}</span>
                  </div>
                  {booking.googleMapsLink && booking.googleMapsLink !== 'N/A' && (
                    <a href={booking.googleMapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-500 hover:text-amber-400 ml-6 mt-1 transition-colors">
                      View on Maps ↗
                    </a>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-800/60 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Assigned Role</span>
                    <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                      <Briefcase className="w-4 h-4 shrink-0" />
                      {booking.assignedRole}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Equipment</span>
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                      <Camera className="w-4 h-4 shrink-0" />
                      <span className="truncate" title={booking.equipmentAssigned}>{booking.equipmentAssigned}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
