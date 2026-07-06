import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const searchStr = `
        await updateLead(selectedLead.lead_id, {
          budget: Number(wizardLeadData.package_cost),
          package_price: Number(wizardLeadData.package_cost),
          deliverables_description: wizardLeadData.deliverables,
          notes_special_customizations: wizardLeadData.notes,
          remarks: updatedRemarks,
          Select_Package_Option: wizardLeadData.selected_package_id,
          client_residence_address: wizardLeadData.client_residence_address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode,
          
          events: updatedEvents
        });
`;

const replaceStr = `
        await updateLead(selectedLead.lead_id, {
          budget: Number(wizardLeadData.package_cost),
          package_price: Number(wizardLeadData.package_cost),
          deliverables_description: wizardLeadData.deliverables,
          notes_special_customizations: wizardLeadData.notes,
          remarks: updatedRemarks,
          Select_Package_Option: wizardLeadData.selected_package_id,
          client_residence_address: wizardLeadData.client_residence_address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: Math.max(0, Number(wizardLeadData.package_cost) + Number(quoteAdditional || 0) - Number(quoteDiscount || 0)),
          events: updatedEvents
        });
`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated handleSaveStep 3");
