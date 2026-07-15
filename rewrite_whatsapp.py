import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target_start = """      const leadId = orderData?.lead_id || trackingId;"""
target_end = """      setEditorWhatsappData({"""

start_idx = content.find(target_start)
end_idx = content.find(target_end, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find section.")
    exit(1)

new_content = """      const leadId = orderData?.lead_id || trackingId;
      const leadData = leadsData?.find(l => l.lead_id === leadId);

      const activeStaffList = productionStaff || [];

      // Events list
      const eventsList = leadData?.events || [];
      const selectedEvent = eventsList[eventIndex] || null;

      // Build fields for WhatsApp prefilled message
      const customerName = orderData?.customer_name || leadData?.customer_name || '—';
      const customerMobile = orderData?.customer_mobile || leadData?.mobile || '—';
      const customerWhatsapp = orderData?.whatsapp_number || leadData?.whatsapp_number || '—';
      const eventName = selectedEvent?.event_name || orderData?.event_type || 'Event';
      const eventType = selectedEvent?.event_type || selectedEvent?.event_shoot_type || orderData?.event_type || 'Shoot Type';

      // Raw footage drive link
      const driveLink = prodData?.raw_footage_location || rfItem?.server_path || '—';

      // Target Delivery date
      const targetDate = prodData?.target_delivery_date || prodData?.expected_delivery_date || '—';

      // Get unique editors assigned to this project
      const assignedEditors = Array.from(new Set((assignmentsData || []).map((a: any) => a.staff_name).filter(Boolean)));
      
      const editors = assignedEditors.map((editorName: any) => {
        const staff = activeStaffList.find(s => s.name === editorName);
        const editorPhone = staff ? (staff.whatsapp_number || staff.mobile || '') : '';
        
        const displayDeliverables = (assignmentsData || [])
          .filter((a: any) => a.staff_name && a.staff_name.trim().toLowerCase() === editorName.trim().toLowerCase())
          .map((a: any) => a.speciality)
          .filter(Boolean);

        const deliverableListText = displayDeliverables.length > 0
          ? displayDeliverables.map((d: any) => `• ${d}`).join('\\n')
          : 'None Assigned';

        const msg = `*PHOTOCREW STUDIO TASK ASSIGNMENT*

*Customer Details:*
• Name: ${customerName}
• Mobile: ${customerMobile}
• WhatsApp: ${customerWhatsapp}

*Project Details:*
• Event Type: ${eventType}
• Event Name: ${eventName}
• Raw Footage Drive Link: ${driveLink}
• Target Delivery Date: ${targetDate}

*Assignment Details:*
${deliverableListText}

_Please acknowledge receipt of this task assignment._`;

        return { name: editorName, phone: editorPhone, message: msg };
      });

"""

updated = content[:start_idx] + new_content + content[end_idx:]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(updated)
print("Updated successfully")
