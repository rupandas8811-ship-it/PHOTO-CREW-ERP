import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(
  /budget: 0,\n\s*remarks: 'Repeat Customer Booking',/g,
  'budget: 0,\n      Additional_Services_Cost: null,\n      Quotation_Discount: null,\n      Final_Quotation_Amount: null,\n      remarks: \'Repeat Customer Booking\','
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated addLead at 4023");
