import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// The keys we want to replace in `updateLead` and `addLead` objects.
// Sometimes it's `quotation_discount: quoteDiscount` or similar.

// In line 2909-2910:
content = content.replace(
  /quotation_discount: quoteDiscount,\n\s*additional_services_cost: quoteAdditional,/g,
  'Quotation_Discount: quoteDiscount || null,\n          Additional_Services_Cost: quoteAdditional || null,\n          Final_Quotation_Amount: finalAmt || null,'
);

// In line 5177-5178:
content = content.replace(
  /quotation_discount: quoteDiscount,\n\s*additional_services_cost: quoteAdditional,/g,
  'Quotation_Discount: quoteDiscount || null,\n        Additional_Services_Cost: quoteAdditional || null,\n        Final_Quotation_Amount: finalTotal || null,'
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Replaced first set.");
