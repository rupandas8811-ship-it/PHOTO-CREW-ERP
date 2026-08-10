const fs = require('fs');
let code = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

// 1. Remove isPackageSelectedAndSaved wrapping
const targetWrap = `{isPackageSelectedAndSaved && (() => {
                           const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
                           const currentPkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option; let selectedPkg = availablePkgs.find(p => String(p.package_id) === String(currentPkgId)); if (!selectedPkg && currentPkgId) { selectedPkg = { package_id: currentPkgId, package_name: (currentPkgId === 'custom_package' || currentPkgId === 'Custom Package') ? 'Custom Package' : \`Package \${currentPkgId} (Legacy)\`, price: wizardLeadData.package_cost || 0, deliverables: wizardLeadData.deliverables || "", status: "Active" } as any; }
                           if (!selectedPkg) return null;
                          const selectedPkgId = selectedPkg.package_id;`;

const newWrap = `                          {(() => {
                           const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
                           const currentPkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option; 
                           let selectedPkg = availablePkgs.find(p => String(p.package_id) === String(currentPkgId)); 
                           if (!selectedPkg && currentPkgId) { 
                             selectedPkg = { package_id: currentPkgId, package_name: (currentPkgId === 'custom_package' || currentPkgId === 'Custom Package') ? 'Custom Package' : \`Package \${currentPkgId} (Legacy)\`, price: wizardLeadData.package_cost || 0, deliverables: wizardLeadData.deliverables || "", status: "Active" } as any; 
                           }
                           const selectedPkgId = selectedPkg?.package_id || '';`;

if(code.includes(targetWrap)) {
  code = code.replace(targetWrap, newWrap);
  console.log('Removed isPackageSelectedAndSaved wrap');
} else {
  console.log('Could not find targetWrap');
}

// 2. Change handleCrmLeadClick so that Step 3 fields are strictly empty upon entry
const targetWizardState = `      // Step 3
      selected_package_id: fullLead.Select_Package_Option || latestQuote?.package_id || primaryLP?.package_id || '',
      package_cost: cleanPkgPrice,
      package_price: cleanPkgPrice,
      deliverables: loadedDelText,
      deliverables_description: loadedDelText,`;

const newWizardState = `      // Step 3 (Always initialize as empty per requirements)
      selected_package_id: '',
      Select_Package_Option: '',
      package_cost: '',
      package_price: '',
      deliverables: '',
      deliverables_description: '',`;

if(code.includes(targetWizardState)) {
  code = code.replace(targetWizardState, newWizardState);
  console.log('Updated handleCrmLeadClick to not prefill Step 3');
} else {
  console.log('Could not find targetWizardState');
}

fs.writeFileSync('src/components/SalesModule.tsx', code);
