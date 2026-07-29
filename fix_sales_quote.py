import sys

with open('src/components/SalesModule.tsx', 'r') as f:
    content = f.read()

target2 = """        await updateLead(createdLeadId!, {
          budget: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          package_price: basePkgSum,
          deliverables_description: leadObj.deliverables_description,
          notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
          
          client_residence_address: leadObj.client_residence_address,"""

replacement2 = """        await updateLead(createdLeadId!, {
          budget: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          package_price: basePkgSum,
          deliverables_description: leadObj.deliverables_description,
          notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
          sales_staff_name: salesStaffName,
          sales_staff_mobile: salesStaffMobile,
          client_residence_address: leadObj.client_residence_address,"""

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Replaced target2")
else:
    print("Target2 not found")

with open('src/components/SalesModule.tsx', 'w') as f:
    f.write(content)

print("Done")
