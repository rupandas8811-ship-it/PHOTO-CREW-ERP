import re

with open('src/components/SalesModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = r"""  const handleSendEmailQuote = async (isEdit: boolean) => {
    try {
      const generatedQuotNum = await handleGenerateQuote(isEdit);
      if (!generatedQuotNum) return;

      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;
      const quotNum = generatedQuotNum;
      
      const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';
      const email = leadObj.email || '';
      
      const safeCustomerName = String(leadObj.customer_name || 'Client');
      const safeEventType = String(leadObj.event_type || 'Event');

      const subject = `Photocrew Pictures - Custom Quotation Details (${quotNum})`;
      const body = `Dear ${safeCustomerName},\n\n` +
        `Thank you for reach out to us! We are pleased to provide the custom quotation details for your upcoming ${safeEventType} shoot.\n\n` +
        `Quotation Number: ${quotNum}\n` +
        `Selected Package: ${pkgNames}\n` +
        `Package Amount: Rs. ${basePkgSum.toLocaleString('en-IN')}\n` +
        `Discount Applied: Rs. ${quoteDiscount.toLocaleString('en-IN')}\n` +
        `Additional Services: Rs. ${quoteAdditional.toLocaleString('en-IN')}\n` +
        `Final Quotation Amount: Rs. ${finalAmt.toLocaleString('en-IN')}\n\n` +
        `We will follow up shortly to discuss any specific adjustments you might need.\n\n` +
        `Warm regards,\n` +
        `The Photocrew Pictures Team\n` +
        `https://www.photocrewpictures.com/`;

      window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    } catch (err: any) {
      showErrorHelper(
        "Email Redirect Failed",
        err.message || "Failed to prepare email message.",
        "handleSendEmailQuote()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check console logs.",
        err
      );
    }
  };"""

start_idx = content.find('  const handleSendEmailQuote = (isEdit: boolean) => {')
end_idx = content.find('  const renderQuotationAndStep4Section = (isEdit: boolean) => {', start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + replacement + "\n" + content[end_idx:]

with open('src/components/SalesModule.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
