import re

with open('src/components/SalesModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;

      const existingQuotation = (quotations || []).find(q => q.lead_id === (leadObj.lead_id || 'DRAFT-LEAD'));
      
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const randomFour = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
      const generatedQuotNum = existingQuotation ? existingQuotation.quotation_number : `QT-${dateStr}-${randomFour}`;
      const quotNum = activeQuoteNum || generatedQuotNum;
      
      if (!activeQuoteNum) {
        setActiveQuoteNum(quotNum);
      }

      console.log(`✔ Creating/Updating quotation ${quotNum}...`);
      const qId = existingQuotation ? existingQuotation.quotation_id : ('QT-' + Math.random().toString(36).substring(2, 9).toUpperCase());
      
      const standardQuotation = {
        quotation_id: qId,
        quotation_number: quotNum,
        lead_id: leadObj.lead_id || 'DRAFT-LEAD',
        customer_id: leadObj.customer_name || 'Customer',
        customer_name: leadObj.customer_name || 'Customer',
        order_id: '',
        package_name: activePkgs.map(p => p.package_name).join(' + '),
        package_price: basePkgSum,
        quotation_amount: basePkgSum + quoteAdditional,
        discount: quoteDiscount,
        discount_amount: quoteDiscount,
        additional_services_cost: quoteAdditional,
        final_quotation_amount: finalAmt,
        final_amount: finalAmt,
        tax_amount: 0,
        quotation_status: 'Sent',
        pdf_url: '',
        generated_date: new Date().toISOString().split('T')[0],
        created_at: existingQuotation ? existingQuotation.created_at : new Date().toISOString(),
        created_by: salesStaffName || 'System',
        whatsapp_sent_status: false,
        viewed_status: false,
        terms_conditions: quotationTerms,
        deliverables_description: leadObj.deliverables_description,
        notes_special_customizations: leadObj.notes_special_customizations,
        client_residence_address: leadObj.client_residence_address,
        city: leadObj.city,
        state: leadObj.state,
        pincode: leadObj.pincode,
        desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
        sales_staff_name: salesStaffName,
        sales_staff_mobile: salesStaffMobile,
        editableInclusions: editableInclusions,
        editableDeliverables: editableDeliverables
      };

      console.log("✔ Saving to Supabase...");
      if (existingQuotation) {
        await updateQuotation(qId, standardQuotation);
      } else {
        await addQuotation(standardQuotation);
      }
      console.log("✔ Quotation saved successfully");"""

content = re.sub(r'      const basePkgSum = dynamicBaseSum;.*?console\.log\("✔ Quotation saved successfully"\);', replacement, content, flags=re.DOTALL)

with open('src/components/SalesModule.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
