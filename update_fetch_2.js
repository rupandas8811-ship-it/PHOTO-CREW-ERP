import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// I'll add an else block or pull it out.
content = content.replace(
  /    if \(latestQuote\) \{\n      setActiveQuoteNum\(latestQuote\.quotation_number \|\| ''\);\n      setQuoteDiscount\(lead\.Quotation_Discount \?\? latestQuote\.discount_amount \?\? 0\);\n      setQuoteAdditional\(lead\.Additional_Services_Cost \?\? latestQuote\.additional_services_cost \?\? 0\);/g,
  '    setQuoteDiscount(lead.Quotation_Discount ?? latestQuote?.discount_amount ?? 0);\n    setQuoteAdditional(lead.Additional_Services_Cost ?? latestQuote?.additional_services_cost ?? 0);\n    if (latestQuote) {\n      setActiveQuoteNum(latestQuote.quotation_number || \'\');'
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated handleSelectLead fetch logic 2");
