const fs = require('fs');
let code = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const targetWrap = /{isPackageSelectedAndSaved && \(\(\) => \{\s*const availablePkgs = \(packages && packages.length > 0\) \? packages : INITIAL_PACKAGES;\s*const currentPkgId = wizardLeadData.selected_package_id \|\| wizardLeadData.Select_Package_Option; let selectedPkg = availablePkgs.find\(p => String\(p.package_id\) === String\(currentPkgId\)\); if \(!selectedPkg && currentPkgId\) \{ selectedPkg = \{ package_id: currentPkgId, package_name: \(currentPkgId === 'custom_package' \|\| currentPkgId === 'Custom Package'\) \? 'Custom Package' : \`Package \${currentPkgId} \(Legacy\)\`, price: wizardLeadData.package_cost \|\| 0, deliverables: wizardLeadData.deliverables \|\| "", status: "Active" \} as any; \}\s*if \(!selectedPkg\) return null;\s*const selectedPkgId = selectedPkg.package_id;/;

const newWrap = `{(() => {
                           const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
                           const currentPkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option; 
                           let selectedPkg = availablePkgs.find(p => String(p.package_id) === String(currentPkgId)); 
                           if (!selectedPkg && currentPkgId) { 
                             selectedPkg = { package_id: currentPkgId, package_name: (currentPkgId === 'custom_package' || currentPkgId === 'Custom Package') ? 'Custom Package' : \`Package \${currentPkgId} (Legacy)\`, price: wizardLeadData.package_cost || 0, deliverables: wizardLeadData.deliverables || "", status: "Active" } as any; 
                           }
                           const selectedPkgId = selectedPkg?.package_id || '';`;

if(code.match(targetWrap)) {
  code = code.replace(targetWrap, newWrap);
  console.log('Removed isPackageSelectedAndSaved wrap using regex');
} else {
  console.log('Could not find targetWrap via regex');
}
fs.writeFileSync('src/components/SalesModule.tsx', code);
