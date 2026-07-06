import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(
  /budget: Number\(createForm\.budget\) \|\| 0,/g,
  'budget: Number(createForm.budget) || 0,\n            Additional_Services_Cost: null,\n            Quotation_Discount: null,\n            Final_Quotation_Amount: null,'
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated addLead calls");
