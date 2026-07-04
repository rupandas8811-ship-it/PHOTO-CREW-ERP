import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const targetStr = `      } else if (step === 3) {
        if (!wizardLeadData.selected_package_id || wizardLeadData.selected_package_id.trim() === '') {`;

const replaceStr = `      } else if (step === 3) {
        if (!salesStaffName || !salesStaffName.trim()) {
          showToastMsg("Please enter Sales Staff Name.", "error");
          setIsSaving(false);
          return;
        }
        if (!salesStaffMobile || !salesStaffMobile.trim() || salesStaffMobile.trim().length !== 10 || !/^\\d+$/.test(salesStaffMobile.trim())) {
          showToastMsg("Please enter a valid 10-digit Sales Staff Mobile Number.", "error");
          setIsSaving(false);
          return;
        }

        if (!wizardLeadData.selected_package_id || wizardLeadData.selected_package_id.trim() === '') {`;

content = content.replace(targetStr, replaceStr);

const targetUpdateStr = `        await updateLead(selectedLead.lead_id, {
          budget: Number(wizardLeadData.package_cost),
          package_price: Number(wizardLeadData.package_cost),
          deliverables_description: wizardLeadData.deliverables,
          notes_special_customizations: wizardLeadData.notes,
          remarks: updatedRemarks,
          Select_Package_Option: wizardLeadData.selected_package_id,
          client_residence_address: wizardLeadData.client_residence_address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode
        });`;

const replaceUpdateStr = `        const updatedEvents = crmEvents.map(ev => ({
          ...ev,
          assigned_staff_names: salesStaffName,
          assigned_staff_mobiles: salesStaffMobile
        }));

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
          sales_staff_name: salesStaffName,
          sales_staff_mobile: salesStaffMobile,
          events: updatedEvents
        });`;

content = content.replace(targetUpdateStr, replaceUpdateStr);

const targetSetLeadStr = `          return {
            ...prev,
            budget: Number(wizardLeadData.package_cost),
            package_price: Number(wizardLeadData.package_cost),
            deliverables_description: wizardLeadData.deliverables,
            notes_special_customizations: wizardLeadData.notes,
            remarks: updatedRemarks,
            Select_Package_Option: wizardLeadData.selected_package_id,
            client_residence_address: wizardLeadData.client_residence_address,
            city: wizardLeadData.city,
            state: wizardLeadData.state,
            pincode: wizardLeadData.pincode
          };`;

const replaceSetLeadStr = `          return {
            ...prev,
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
            sales_staff_name: salesStaffName,
            sales_staff_mobile: salesStaffMobile
          };`;

content = content.replace(targetSetLeadStr, replaceSetLeadStr);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched Step 3 successfully!");
