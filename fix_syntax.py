import re

with open('src/components/RoleContext.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

def rewrite_update_quotation(match):
    return """  const updateQuotation = async (quotationId: string, updates: Partial<any>) => {
    let updatedQuote: any = null;
    
    setQuotations((prev) => {
      const next = prev.map((q) => {
        if (q.quotation_id === quotationId) {
          updatedQuote = { ...q, ...updates, updated_at: new Date().toISOString() };
          return updatedQuote;
        }
        return q;
      });
      localStorage.setItem('erp_quotations', JSON.stringify(next));
      return next;
    });

    setTimeout(async () => {
      if (!updatedQuote) return;
      if (!supabaseClient) return;

      let cleanTerms = updatedQuote.terms_conditions || '';
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
      };

      try {
        const { error } = await supabaseClient.from('quotations').update(standardPayload).eq('quotation_id', quotationId);
        if (error) {
          console.warn('Supabase Update error for quotations table:', error.message);
        }
      } catch (err) {
        console.warn('Supabase Exception on updating quotation:', err);
      }
    }, 10);
  };"""

content = re.sub(r'  const updateQuotation = async \(quotationId: string, updates: Partial<any>\) => \{[\s\S]*?    \}, 10\);\n  \};', rewrite_update_quotation, content)

with open('src/components/RoleContext.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
