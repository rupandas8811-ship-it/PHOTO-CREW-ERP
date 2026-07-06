import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// Fix 5090: Final_Quotation_Amount: finalTotal === "" ? null : Number(finalTotal)
// Replace with finalTotal
content = content.replace(
  /Final_Quotation_Amount: finalTotal === "" \? null : Number\(finalTotal\),/g,
  'Final_Quotation_Amount: finalTotal,'
);

// Fix 5140: finalAmt not found in wizardStep === 4
content = content.replace(
  /Final_Quotation_Amount: finalAmt === "" \? null : Number\(finalAmt\),/g,
  'Final_Quotation_Amount: createForm.budget === "" ? null : Number(createForm.budget),'
);

// Fix 5185: Final_Quotation_Amount: finalTotal === "" ? null : Number(finalTotal)
content = content.replace(
  /Final_Quotation_Amount: finalAmt \|\| null,/g, // Wait, I might have used finalAmt at 5190
  'Final_Quotation_Amount: finalTotal,'
);

// Check around 5188 for duplicate properties
// The original updateLead at 5171 had quotation_discount and additional_services_cost.
// Maybe I replaced it, but didn't remove the old ones or something?
// Let's replace quotation_discount === "" ? null : Number(quoteDiscount) since quoteDiscount is number|''
// Let's fix the duplication first by looking at the exact code block.
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Fixed finalAmt and finalTotal.");
