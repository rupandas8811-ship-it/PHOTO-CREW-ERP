import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(
  /notes_special_customizations: leadObj\.notes_special_customizations,/g,
  'notes_special_customizations: leadObj.notes_special_customizations,\n          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),\n          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),\n          Final_Quotation_Amount: finalAmt === "" ? null : Number(finalAmt),'
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Added back to 2908");
