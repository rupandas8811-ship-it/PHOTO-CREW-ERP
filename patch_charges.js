import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// 1. Remove quoteExtraCharges from states
content = content.replace(/const \[quoteExtraCharges, setQuoteExtraCharges\] = useState<number \| ''>\(''\);\n?/g, '');

// 2. Remove useEffect that overwrites quoteAdditional
content = content.replace(/\/\/ Keep quoteAdditional synchronized in real-time\n  React.useEffect\(\(\) => \{\n    const additionalSum = quoteServices\n      .filter\(s => s.isAdditional\)\n      .reduce\(\(sum, s\) => sum \+ \(Number\(s.qty\) \* Number\(s.price\)\), 0\);\n    setQuoteAdditional\(additionalSum\);\n  \}, \[quoteServices\]\);\n?/g, '');

// 3. Remove quoteExtraCharges from resets
content = content.replace(/    setQuoteExtraCharges\(0\);\n?/g, '');

// 4. In Final calculation
content = content.replace(/const extraChargesVal = Number\(quoteExtraCharges \|\| 0\);\n?/g, '');
content = content.replace(/const dynamicFinalAmt = Math.max\(0, dynamicBaseSum \+ dynamicAdditionalSum \+ extraChargesVal - discountVal\);/g, 
  'const dynamicFinalAmt = Math.max(0, dynamicBaseSum + Number(quoteAdditional || 0) - discountVal);');

// 5. Replace references to quoteExtraCharges in Quotation Generation
content = content.replace(/quotation_amount: basePkgSum \+ Number\(quoteAdditional \|\| 0\) \+ Number\(quoteExtraCharges \|\| 0\)/g,
  'quotation_amount: basePkgSum + Number(quoteAdditional || 0)');
content = content.replace(/additional_services_cost: Number\(quoteAdditional \|\| 0\) \+ Number\(quoteExtraCharges \|\| 0\)/g,
  'additional_services_cost: Number(quoteAdditional || 0)');

content = content.replace(/Number\(quoteExtraCharges \|\| 0\),/g, '0, // Extra charges removed');

// 6. Fix the formula text
content = content.replace(/Formula: Base Price \(₹\{basePkgSum\}\) \+ Addl \(₹\{quoteAdditional\}\) \+ Extra \(₹\{quoteExtraCharges \|\| 0\}\) - Disc \(₹\{quoteDiscount\}\)/g, 
  'Formula: Base Price (₹{basePkgSum}) + Addl (₹{quoteAdditional || 0}) - Disc (₹{quoteDiscount || 0})');

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched charges logic");
