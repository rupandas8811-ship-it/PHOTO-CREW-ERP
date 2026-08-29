import re

with open("src/components/SalesModuleNew.tsx", "r") as f:
    content = f.read()

# Fix 1: Final Package Amount (₹) - always prefer Final_Quotation_Amount
content = re.sub(
    r'quotation_amount:\s*Number\(lead\.Final_Package_Amount\).*?\|\|\s*0,',
    r'quotation_amount: Number(lead.Final_Quotation_Amount) || Number((lead as any).final_quotation_amount) || Number(lead.Final_Package_Amount) || Number((lead as any).final_package_amount) || Number((lead as any).final_amount) || (lead.lead_id === selectedLead?.lead_id ? Number(wizardLeadData.final_amount) : 0) || 0,',
    content
)

content = re.sub(
    r'quotation_amount:\s*Number\(selectedLead\.Final_Package_Amount\).*?\|\|\s*0,',
    r'quotation_amount: Number(selectedLead.Final_Quotation_Amount) || Number(selectedLead.Final_Package_Amount) || Number((selectedLead as any).final_package_amount) || Number((selectedLead as any).final_amount) || Number(wizardLeadData.final_amount) || 0,',
    content
)

content = re.sub(
    r'quotation_amount:\s*Number\(updatedLead\.Final_Package_Amount\).*?\|\|\s*prev\.quotation_amount\s*\|\|\s*0,',
    r'quotation_amount: Number(updatedLead.Final_Quotation_Amount) || Number(updatedLead.Final_Package_Amount) || Number((updatedLead as any).final_package_amount) || Number((updatedLead as any).final_amount) || Number(updatedLead.budget) || (updatedLead.lead_id === selectedLead?.lead_id ? Number(wizardLeadData.final_amount) : 0) || prev.quotation_amount || 0,',
    content
)

content = re.sub(
    r'value=\{confirmForm\.quotation_amount\s*\|\|.*?\}',
    r'value={confirmForm.quotation_amount || Number(selectedLead?.Final_Quotation_Amount) || Number(selectedLead?.Final_Package_Amount) || Number((selectedLead as any)?.final_package_amount) || (Number(wizardLeadData.final_amount) > 0 ? Number(wizardLeadData.final_amount) : 0)}',
    content
)

# Fix 2: "Save & Follow-up" vs "Save" based on Order Confirmed
content = re.sub(
    r"\{isSaving \? 'Saving\.\.\.' : crmWizardStep === 3 \? 'SAVE & FOLLOW-UP' : 'Save & Next'\}",
    r"{isSaving ? 'Saving...' : crmWizardStep === 3 ? (['Order Confirmed', 'Event Scheduled', 'Completed'].includes(wizardLeadData.status || selectedLead?.status || '') ? 'SAVE' : 'SAVE & FOLLOW-UP') : 'Save & Next'}",
    content
)

with open("src/components/SalesModuleNew.tsx", "w") as f:
    f.write(content)
