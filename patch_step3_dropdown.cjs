const fs = require('fs');
let code = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const targetValue = `                             value={wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || (selectedLead as any)?.selected_package_id || (leadPackages?.find(lp => lp.lead_id === selectedLead?.lead_id)?.package_id) || (quotations?.find(q => q.lead_id === selectedLead?.lead_id)?.package_id) || ''}`;

const newValue = `                             value={wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || ''}`;

if(code.includes(targetValue)) {
  code = code.replace(targetValue, newValue);
  console.log('Replaced value logic');
} else {
  console.log('Could not find value logic');
}

const targetCurrentPkgId = `                               const currentPkgId = wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || (selectedLead as any)?.selected_package_id || (leadPackages?.find(lp => lp.lead_id === selectedLead?.lead_id)?.package_id) || (quotations?.find(q => q.lead_id === selectedLead?.lead_id)?.package_id) || '';`;

const newCurrentPkgId = `                               const currentPkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || '';`;

if(code.includes(targetCurrentPkgId)) {
  code = code.replace(targetCurrentPkgId, newCurrentPkgId);
  console.log('Replaced currentPkgId logic');
} else {
  console.log('Could not find currentPkgId logic');
}

fs.writeFileSync('src/components/SalesModule.tsx', code);
