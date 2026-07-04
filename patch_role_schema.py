import re

with open('src/components/RoleContext.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement_add = """    const standardPayload = {
      quotation_id: newQuote.quotation_id,
      lead_id: newQuote.lead_id,
      quotation_number: newQuote.quotation_number,
      quotation_amount: newQuote.quotation_amount,
      discount_amount: newQuote.discount_amount,
      tax_amount: newQuote.tax_amount || 0,
      final_amount: newQuote.final_amount,
      quotation_status: newQuote.quotation_status,
      valid_until: newQuote.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms_conditions: newQuote.terms_conditions || '',
      created_by: newQuote.created_by,
      created_at: newQuote.created_at,
      updated_at: new Date().toISOString(),
      package_name: newQuote.package_name,
      package_price: newQuote.package_price,
      deliverables_description: newQuote.deliverables_description,
      notes_special_customizations: newQuote.notes_special_customizations,
      additional_services_cost: newQuote.additional_services_cost,
      client_residence_address: newQuote.client_residence_address,
      city: newQuote.city,
      state: newQuote.state,
      pincode: newQuote.pincode,
      desired_event_shoot_type: newQuote.desired_event_shoot_type,
      customer_id: newQuote.customer_id,
      customer_name: newQuote.customer_name,
      order_id: newQuote.order_id,
      pdf_url: newQuote.pdf_url,
      whatsapp_sent_status: newQuote.whatsapp_sent_status,
      viewed_status: newQuote.viewed_status,
      generated_date: newQuote.generated_date,
      sales_staff_name: newQuote.sales_staff_name || '',
      sales_staff_mobile: newQuote.sales_staff_mobile || '',
      editableInclusions: newQuote.editableInclusions || null,
      editableDeliverables: newQuote.editableDeliverables || null
    };"""

regex_add = re.compile(r'    const metadataObj = \{.*?\n      desired_event_shoot_type: newQuote\.desired_event_shoot_type,\n    \};', re.DOTALL)
content = regex_add.sub(replacement_add, content)


replacement_update = """      let cleanTerms = updatedQuote.terms_conditions || '';
      if (cleanTerms.includes('\\n\\nMETADATA:')) {
        cleanTerms = cleanTerms.split('\\n\\nMETADATA:')[0];
      } else if (cleanTerms.includes('METADATA:')) {
        cleanTerms = cleanTerms.split('METADATA:')[0];
      }
      
      const standardPayload = {
        quotation_status: updatedQuote.quotation_status,
        terms_conditions: cleanTerms,
        package_name: updatedQuote.package_name,
        package_price: updatedQuote.package_price,
        deliverables_description: updatedQuote.deliverables_description,
        notes_special_customizations: updatedQuote.notes_special_customizations,
        discount_amount: updatedQuote.discount_amount,
        additional_services_cost: updatedQuote.additional_services_cost,
        quotation_amount: updatedQuote.quotation_amount,
        tax_amount: updatedQuote.tax_amount || 0,
        final_amount: updatedQuote.final_amount,
        client_residence_address: updatedQuote.client_residence_address,
        city: updatedQuote.city,
        state: updatedQuote.state,
        pincode: updatedQuote.pincode,
        desired_event_shoot_type: updatedQuote.desired_event_shoot_type,
        updated_at: new Date().toISOString(),
        customer_id: updatedQuote.customer_id,
        customer_name: updatedQuote.customer_name,
        order_id: updatedQuote.order_id,
        pdf_url: updatedQuote.pdf_url,
        whatsapp_sent_status: updatedQuote.whatsapp_sent_status,
        viewed_status: updatedQuote.viewed_status,
        generated_date: updatedQuote.generated_date,
        sales_staff_name: updatedQuote.sales_staff_name || '',
        sales_staff_mobile: updatedQuote.sales_staff_mobile || '',
        editableInclusions: updatedQuote.editableInclusions || null,
        editableDeliverables: updatedQuote.editableDeliverables || null
      };"""

regex_update = re.compile(r'      const metadataObj = \{.*?updated_at: new Date\(\)\.toISOString\(\)\n      \};', re.DOTALL)
content = regex_update.sub(replacement_update, content)

with open('src/components/RoleContext.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
