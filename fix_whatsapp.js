const fs = require('fs');

const path = 'src/components/operations/OperationsLeads.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetFunctionStart = `  // Helper to generate personalized WhatsApp message for a staff member
  const generateWhatsAppMessageForStaff = (ord: Order, staffName: string, modalEventAllocations?: any, modalLead?: any, finalAssignments?: any[]) => {`;

const targetFunctionEnd = `    return text.trim();
  };`;

const startIndex = content.indexOf(targetFunctionStart);
const endIndex = content.indexOf(targetFunctionEnd, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find function bounds.");
  process.exit(1);
}

const replacement = `  // Helper to generate personalized WhatsApp message for a staff member
  const generateWhatsAppMessageForStaff = (ord: Order, staffName: string, modalEventAllocations?: any, modalLead?: any, finalAssignments?: any[]) => {
    const lead = modalLead || leads.find(l => l.lead_id === ord.lead_id);
    
    const clientName = ord.customer_name;
    const clientContact = ord.mobile || (lead ? lead.mobile : 'N/A');
    const customerAddress = lead?.client_residence_address || lead?.address || 'N/A';
    
    let text = \`Customer Name: \${clientName}\\n\`;
    text += \`Phone Number: \${clientContact}\\n\\n\`;

    let assignedEvents: any[] = [];
    if (modalEventAllocations && lead?.events && lead.events.length > 0) {
       Object.keys(modalEventAllocations).forEach(evId => {
         const alloc = modalEventAllocations[evId];
         if (alloc.staff && alloc.staff.some((s: any) => s.staff_name === staffName)) {
            const matchedEv = lead.events.find((e: any) => e.id === evId);
            if (matchedEv) {
               const roles = alloc.staff.filter((s: any) => s.staff_name === staffName).map((s: any) => s.staff_role);
               assignedEvents.push({ ...matchedEv, alloc, roles });
            }
         }
       });
    } else if (lead?.events && lead.events.length > 0) {
       assignedEvents = lead.events.filter((ev: any) => {
         const names = ev.assigned_staff_names ? ev.assigned_staff_names.split(',').map((n: string) => n.trim().toLowerCase()) : [];
         return names.includes(staffName.toLowerCase());
       }).map((ev: any) => {
         let fallbackRoles = ['Crew'];
         const myAssignments = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id && sa.staff_name === staffName) : [];
         if (myAssignments.length > 0) {
            fallbackRoles = Array.from(new Set(myAssignments.map(sa => sa.staff_role)));
         } else {
             const history = leadStaffAssignmentHistory?.filter((h: any) => h.order_id === ord.order_id && h.assigned_staff === staffName);
             if (history && history.length > 0) {
                 fallbackRoles = Array.from(new Set(history.map((h: any) => h.assigned_role || h.assigned_roles)));
             }
         }
         return { ...ev, roles: fallbackRoles };
        });
    }

    if (assignedEvents.length === 0) {
       const eventName = ord.custom_event_name || lead?.custom_event_name || ord.event_type || 'N/A';
       const eventType = ord.event_type || 'N/A';
       const reportingDate = ord.Reporting_date || lead?.Reporting_date || ord.event_date || 'N/A';
       const reportingTime = ord.reporting_time || lead?.reporting_time || '8:00 AM';
       
       const evLoc = lead?.google_maps_link || customerAddress;

       let assignedRoles = ['Crew'];
       if (finalAssignments) {
          assignedRoles = Array.from(new Set(finalAssignments.filter(a => a.staff_name === staffName).map(a => a.staff_role)));
       } else {
          const myAssignments = staffAssignments ? staffAssignments.filter(sa => sa.order_id === ord.order_id && sa.staff_name === staffName) : [];
          if (myAssignments.length > 0) {
             assignedRoles = Array.from(new Set(myAssignments.map(sa => sa.staff_role)));
          } else {
             const history = leadStaffAssignmentHistory?.filter((h: any) => h.order_id === ord.order_id && h.assigned_staff === staffName);
             if (history && history.length > 0) {
                 assignedRoles = Array.from(new Set(history.map((h: any) => h.assigned_role || h.assigned_roles)));
             }
          }
       }

       text += \`Event Name: \${eventName}\\n\`;
       text += \`Event Type: \${eventType}\\n\`;
       text += \`Location: \${evLoc}\\n\\n\`;
       text += \`Reporting Date: \${reportingDate}\\n\`;
       text += \`Reporting Time: \${reportingTime}\\n\`;
       text += \`Task: \${assignedRoles.join(', ')}\\n\`;
       
       // When no assignedEvents but finalAssignments exist
       if (finalAssignments) {
          const myAssignments = finalAssignments.filter(a => a.staff_name === staffName);
          const myEq = myAssignments.flatMap(a => a.equipment || []);
          const uniqueEq = Array.from(new Set(myEq));
          if (uniqueEq.length > 0) {
              text += \`\\nAssigned Equipment:\\n\`;
              uniqueEq.forEach(eq => {
                  text += \`- \${eq}\\n\`;
              });
          }
       }
    } else {
       assignedEvents.forEach((ev, index) => {
          const eventName = ev.event_name || (ev.event_type === 'Other' ? (ev.event_name || 'Other') : (ev.event_type || 'N/A'));
          const eventType = ev.event_type || 'N/A';
          const reportingDate = ev.reporting_date || ev.alloc?.reporting_date || ord.Reporting_date || lead?.Reporting_date || ev.event_date || 'N/A';
          const reportingTime = ev.reporting_time || ev.alloc?.reporting_time || ord.reporting_time || lead?.reporting_time || '8:00 AM';
          
          const evLoc = ev.google_maps_link || lead?.google_maps_link || customerAddress;

          let assignedRoles = ev.roles || ['Crew'];
          assignedRoles = Array.from(new Set(assignedRoles));

          if (index > 0) text += \`\\n---\\n\\n\`;
          
          text += \`Event Name: \${eventName}\\n\`;
          text += \`Event Type: \${eventType}\\n\`;
          text += \`Location: \${evLoc}\\n\\n\`;
          text += \`Reporting Date: \${reportingDate}\\n\`;
          text += \`Reporting Time: \${reportingTime}\\n\`;
          text += \`Task: \${assignedRoles.join(', ')}\\n\`;

          // Handle equipment for multi-events if present in modalEventAllocations or finalAssignments
          // We will fetch it from finalAssignments if available for this specific event
          if (finalAssignments) {
              const myAssignments = finalAssignments.filter(a => a.staff_name === staffName && a.event_id === ev.id);
              const myEq = myAssignments.flatMap(a => a.equipment || []);
              const uniqueEq = Array.from(new Set(myEq));
              if (uniqueEq.length > 0) {
                  text += \`\\nAssigned Equipment:\\n\`;
                  uniqueEq.forEach(eq => {
                      text += \`- \${eq}\\n\`;
                  });
              }
          } else if (ev.alloc && ev.alloc.staff) {
              const myAllocStaff = ev.alloc.staff.filter((s: any) => s.staff_name === staffName);
              const myEq = myAllocStaff.flatMap((s: any) => s.equipment || []);
              const uniqueEq = Array.from(new Set(myEq));
              if (uniqueEq.length > 0) {
                  text += \`\\nAssigned Equipment:\\n\`;
                  uniqueEq.forEach(eq => {
                      text += \`- \${eq}\\n\`;
                  });
              }
          }
       });
    }

    return text.trim();
  };`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex + targetFunctionEnd.length);
fs.writeFileSync(path, newContent);
console.log("Successfully replaced generateWhatsAppMessageForStaff");
