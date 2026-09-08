import fs from 'fs';
const contents = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');
console.log("Imports buildInitialEventAllocations:", contents.includes('buildInitialEventAllocations'));
