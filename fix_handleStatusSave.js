import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// We want to add package saving to handleStatusSave.
const pkgSaveCode = `
      // Save Packages
      const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
      if (selectedPkgIds.length > 0) {
        const packagesPayload = selectedPkgs.map(pkg => ({
          package_id: pkg.id,
          package_name: pkg.name,
          package_cost: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          quantity: 1,
          total_amount: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          discount: leadDiscount,
          final_amount: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          deliverables_description: pkgDeliverables[pkg.id] || pkg.deliverables || 'N/A',
          notes_special_customizations: pkgNotes[pkg.id] || '',
          additional_services_cost: 0
        }));
        await saveLeadPackages(createdLeadId!, packagesPayload);
      }
`;

content = content.replace(
  /setIsSaving\(true\);\n\s*await updateLead\(createdLeadId!/g,
  'setIsSaving(true);\n' + pkgSaveCode + '\n      await updateLead(createdLeadId!'
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated handleStatusSave");
