import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// The block has:
/*
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalTotal,
        deliverables_description: selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
        notes_special_customizations: selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
        Quotation_Discount: quoteDiscount || null,
          Additional_Services_Cost: quoteAdditional || null,
          Final_Quotation_Amount: finalTotal,
*/

content = content.replace(
  /Quotation_Discount: quoteDiscount \|\| null,\n\s*Additional_Services_Cost: quoteAdditional \|\| null,\n\s*Final_Quotation_Amount: finalTotal,/g,
  ''
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Removed duplicate properties.");
