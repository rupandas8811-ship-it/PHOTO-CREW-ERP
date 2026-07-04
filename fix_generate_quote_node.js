import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const brokenMarkerStart = "const leadIdForError = leadObj?.lead_id || createdLeadId || 'UNKNOWN';";
const brokenMarkerEnd = `      if (!salesStaffMobile || !salesStaffMobile.trim() || salesStaffMobile.trim().length !== 10 || !/^\\d+$/.test(salesStaffMobile.trim())) {
        showValidationError("input_sales_staff_mobile", "Please enter a valid 10-digit mobile number.");
        return;
      }`;

const startIndex = content.indexOf(brokenMarkerStart);
const endIndex = content.indexOf(brokenMarkerEnd) + brokenMarkerEnd.length;

if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
  console.log("Could not find markers!");
  console.log("startIndex", startIndex);
  console.log("endIndex", endIndex);
  process.exit(1);
}

const replacement = `const leadIdForError = leadObj?.lead_id || createdLeadId || 'UNKNOWN';

      if (!salesStaffName || !salesStaffName.trim()) {
        showValidationError("input_sales_staff_name", "Missing required field: Sales Staff Name");
        setIsSaving(false);
        return null;
      }
      if (!salesStaffMobile || !salesStaffMobile.trim() || salesStaffMobile.trim().length !== 10 || !/^\\d+$/.test(salesStaffMobile.trim())) {
        showValidationError("input_sales_staff_mobile", "Invalid mobile number. Must be 10 digits.");
        setIsSaving(false);
        return null;
      }

      console.log("✔ Validating form...");
      const activePkgs = getSelectedPkgsInfo(isEdit);
      const missingFields = validateLeadForQuotation(leadObj, activePkgs);

      if (missingFields.length > 0) {
        showValidationError("", \`Please complete all required fields:\\n- \${missingFields.join('\\n- ')}\`);
        setIsSaving(false);
        return null;
      }

      const quotationData: QuotationData = {
        quotation_number: \`QT-\${Date.now()}\`,
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_amount: isEdit ? (wizardLeadData.package_cost || 0) : (finalPackageAmount === '' ? 0 : Number(finalPackageAmount) || 0),
        discount_amount: quoteDiscount,
        additional_services_cost: quoteExtraCharges,
        final_amount: (isEdit ? (wizardLeadData.package_cost || 0) : (finalPackageAmount === '' ? 0 : Number(finalPackageAmount) || 0)) - quoteDiscount + quoteExtraCharges,
        lead: {
          lead_id: leadObj.lead_id,
          customer_name: leadObj.customer_name,
          mobile: leadObj.mobile,
          email: leadObj.email,
          event_date: leadObj.event_date || leadObj.event_start_date || '',
          event_time: leadObj.event_time || leadObj.reporting_time || '',
          event_type: leadObj.event_type || leadObj.custom_event_name || '',
          event_location: leadObj.event_location,
          client_residence_address: leadObj.client_residence_address,
          city: leadObj.city,
          state: leadObj.state,
          pincode: leadObj.pincode,
          desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
          sales_staff_name: salesStaffName,
          sales_staff_mobile: salesStaffMobile,
          editableInclusions: editableInclusions,
          editableDeliverables: editableDeliverables
        },
        packages: activePkgs
      };

      console.log("✔ Saving to Supabase...");
      const quoteId = await saveQuotation(quotationData);
      
      setIsSaving(false);
      return quoteId;
    } catch (err: any) {
      console.error(err);
      showToastMsg(err.message, "error");
      setIsSaving(false);
      return null;
    }
  };

  const handlePreviewQuotePDF = async (isEdit: boolean) => {
    try {
      if (!salesStaffName || !salesStaffName.trim()) {
        showValidationError("input_sales_staff_name", "Quotation Incomplete! Please enter Sales Staff Name.");
        return;
      }
      if (!salesStaffMobile || !salesStaffMobile.trim() || salesStaffMobile.trim().length !== 10 || !/^\\d+$/.test(salesStaffMobile.trim())) {
        showValidationError("input_sales_staff_mobile", "Please enter a valid 10-digit mobile number.");
        return;
      }`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Fixed!");
