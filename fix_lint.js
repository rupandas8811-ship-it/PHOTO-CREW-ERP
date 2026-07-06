import fs from 'fs';
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

content = content.replace(
  "const hasAnyAllocations = Object.values(eventAllocations).some(alloc => alloc.staff && alloc.staff.length > 0);",
  "const hasAnyAllocations = Object.values(eventAllocations).some((alloc: any) => alloc.staff && alloc.staff.length > 0);"
);

content = content.replace(
  "Object.values(eventAllocations).forEach(alloc => {",
  "Object.values(eventAllocations).forEach((alloc: any) => {"
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content, 'utf-8');
console.log("Fixed lint");
