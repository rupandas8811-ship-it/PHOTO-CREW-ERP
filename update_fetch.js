import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// The current code:
// setQuoteDiscount(latestQuote.discount_amount || 0);
// setQuoteAdditional(latestQuote.additional_services_cost || 0);

content = content.replace(
  /setQuoteDiscount\(latestQuote\.discount_amount \|\| 0\);/g,
  'setQuoteDiscount(lead.Quotation_Discount ?? latestQuote.discount_amount ?? 0);'
);
content = content.replace(
  /setQuoteAdditional\(latestQuote\.additional_services_cost \|\| 0\);/g,
  'setQuoteAdditional(lead.Additional_Services_Cost ?? latestQuote.additional_services_cost ?? 0);'
);

// Is there an else block where latestQuote is falsy?
// What if latestQuote doesn't exist?

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated handleSelectLead fetch logic");
