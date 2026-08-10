const fs = require('fs');
let code = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const targetDropdownChange = `  const handlePackageDropdownChange = (packageId: string) => {
    if (isStep3Locked) {
      showToastMsg("Quotation details are locked. Owner unlock approval required to edit.", "error");
      return;
    }
    setWizardLeadData((prev) => ({
      ...prev,
      selected_package_id: packageId,
      Select_Package_Option: packageId,
    }));
    setIsPackageSelectedAndSaved(false);
    setIsPackageDetailsSaved(false);
  };`;

const newDropdownChange = `  const handlePackageDropdownChange = (packageId: string) => {
    if (isStep3Locked) {
      showToastMsg("Quotation details are locked. Owner unlock approval required to edit.", "error");
      return;
    }
    
    if (!packageId) {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: '',
        Select_Package_Option: '',
      }));
      return;
    }

    if (packageId === 'Custom Package' || packageId === 'custom_package') {
      const customPkgVal = 'Custom Package';
      const existingPrice = wizardLeadData.package_cost || wizardLeadData.package_price || selectedLead?.package_price || selectedLead?.budget || 0;
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: customPkgVal,
        Select_Package_Option: customPkgVal,
        package_name: 'Custom Package',
        package_cost: prev.package_cost || existingPrice,
        package_price: prev.package_price || existingPrice,
        budget: prev.budget || existingPrice,
        final_quoted_amount: prev.final_quoted_amount || existingPrice,
      }));

      const newInclusions = { ...editableInclusions };
      if (!newInclusions[customPkgVal]) newInclusions[customPkgVal] = [];
      if (crmEvents && crmEvents.length > 0) {
        crmEvents.forEach((ev) => {
          const k1 = \`\${customPkgVal}_\${ev.id}\`;
          const k2 = \`\${customPkgVal}_\${ev.event_name || ev.event_type || 'Unnamed Event'}\`;
          if (!newInclusions[k1]) newInclusions[k1] = [];
          if (!newInclusions[k2]) newInclusions[k2] = [];
        });
      }

      const newDeliverables = { ...editableDeliverables };
      if (!newDeliverables[customPkgVal]) newDeliverables[customPkgVal] = [];
      if (crmEvents && crmEvents.length > 0) {
        crmEvents.forEach((ev) => {
          const k1 = \`\${customPkgVal}_\${ev.id}\`;
          const k2 = \`\${customPkgVal}_\${ev.event_name || ev.event_type || 'Unnamed Event'}\`;
          if (!newDeliverables[k1]) newDeliverables[k1] = [];
          if (!newDeliverables[k2]) newDeliverables[k2] = [];
        });
      }

      setEditableInclusions(newInclusions);
      setEditableDeliverables(newDeliverables);
      // Removed saveStep3DataRealtime here so it doesn't auto-save just by selecting
      return;
    }

    const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
    const pkg = availablePkgs.find((p) => String(p.package_id) === String(packageId));
    if (pkg) {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: packageId,
        Select_Package_Option: packageId,
        package_name: pkg.package_name,
        package_cost: Number(pkg.price),
        deliverables: pkg.deliverables || '',
        notes: pkg.seasonal_offer ? \`Seasonal Offer: \${pkg.seasonal_offer}\` : prev.notes,
        budget: Number(pkg.price),
        final_quoted_amount: Number(pkg.price),
      }));
      
      const incList = parseTeamMembers(pkg.team_members);
      const defaultInc = incList.length > 0 ? incList : ['1 Candid Photographer'];
      
      const delList = parseTeamMembers(pkg.deliverables);
      const defaultDel = delList.length > 0 ? delList : ['High Resolution Edited Photos'];

      const newInclusions = { ...editableInclusions };
      newInclusions[packageId] = defaultInc;
      
      if (crmEvents && crmEvents.length > 0) {
        crmEvents.forEach((ev) => {
          newInclusions[\`\${packageId}_\${ev.id}\`] = [...defaultInc];
          newInclusions[\`\${packageId}_\${ev.event_name || ev.event_type || 'Unnamed Event'}\`] = [...defaultInc];
        });
      }

      const newDeliverables = { ...editableDeliverables };
      newDeliverables[packageId] = defaultDel;

      setEditableInclusions(newInclusions);
      setEditableDeliverables(newDeliverables);
      // Removed saveStep3DataRealtime here so it doesn't auto-save just by selecting
    } else {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: packageId || '',
        Select_Package_Option: packageId || '',
      }));
    }
  };`;

if(code.includes(targetDropdownChange)) {
  code = code.replace(targetDropdownChange, newDropdownChange);
  console.log('Replaced handlePackageDropdownChange');
} else {
  console.log('Could not find handlePackageDropdownChange');
}

// Remove handlePackageConfirm
const startConfirm = code.indexOf('const handlePackageConfirm = () => {');
if (startConfirm !== -1) {
    const endConfirm = code.indexOf('const validateStep3Data', startConfirm);
    if (endConfirm !== -1) {
        code = code.substring(0, startConfirm) + code.substring(endConfirm);
        console.log('Removed handlePackageConfirm');
    }
}

fs.writeFileSync('src/components/SalesModule.tsx', code);
