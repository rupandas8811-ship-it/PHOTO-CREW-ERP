import fs from 'fs';
let content = fs.readFileSync('src/types.ts', 'utf-8');

if (!content.includes('Additional_Services_Cost?: number')) {
  content = content.replace(
    /additional_services_cost\?: number;/,
    'additional_services_cost?: number;\n  Additional_Services_Cost?: number | null;\n  Quotation_Discount?: number | null;\n  Final_Quotation_Amount?: number | null;'
  );
  fs.writeFileSync('src/types.ts', content, 'utf-8');
  console.log("Added fields to Lead in types.ts");
} else {
  console.log("Already added");
}
