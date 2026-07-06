import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// In handlePackageSelect (around 2898) it was already replaced:
// It has: 
// Quotation_Discount: quoteDiscount || null,
// Additional_Services_Cost: quoteAdditional || null,
// Final_Quotation_Amount: finalAmt || null,

// Let's add them to the updateLead around 5083
content = content.replace(
  /budget: finalTotal,\n\s*package_price: finalTotal,/g,
  'budget: finalTotal,\n          package_price: finalTotal,\n          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),\n          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),\n          Final_Quotation_Amount: finalTotal === "" ? null : Number(finalTotal),'
);

// We should also replace it for step 4 handleSaveWizard in Create Lead?
content = content.replace(
  /budget: Number\(createForm\.budget\),/g,
  'budget: Number(createForm.budget),\n          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),\n          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),\n          Final_Quotation_Amount: finalAmt === "" ? null : Number(finalAmt),'
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated updateLead calls");
