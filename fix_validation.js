import fs from 'fs';
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

const oldStr = `    // Validate required fields
    if (activeAssignments.length === 0) {
      alert("Please assign at least one staff member.");
      return;
    }`;

const newStr = `    // Validate required fields
    const hasAnyAllocations = Object.values(eventAllocations).some(alloc => alloc.staff && alloc.staff.length > 0);
    if (activeAssignments.length === 0 && !hasAnyAllocations) {
      alert("Please assign at least one staff member.");
      return;
    }`;

content = content.replace(oldStr, newStr);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content, 'utf-8');
console.log("Fixed validation");
