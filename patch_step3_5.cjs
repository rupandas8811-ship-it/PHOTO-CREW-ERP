const fs = require('fs');
let code = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const targetEmptySelect = `    if (!packageId) {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: '',
        Select_Package_Option: '',
      }));
      return;
    }`;

const newEmptySelect = `    if (!packageId) {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: '',
        Select_Package_Option: '',
        package_name: '',
        package_cost: 0,
        package_price: 0,
        budget: 0,
        final_quoted_amount: 0,
        deliverables: '',
        notes: '',
      }));
      setEditableInclusions((prev) => ({ ...prev, '': [] }));
      setEditableDeliverables((prev) => ({ ...prev, '': [] }));
      return;
    }`;

if(code.includes(targetEmptySelect)) {
  code = code.replace(targetEmptySelect, newEmptySelect);
  console.log('Replaced empty package clearing logic');
} else {
  console.log('Could not find empty package clearing logic');
}
fs.writeFileSync('src/components/SalesModule.tsx', code);
