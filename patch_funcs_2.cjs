const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// Replace staffActiveAssignments
content = content.replace(
  'const staffActiveAssignments = (staffId: string) => { return []; };',
  'const [staffActiveAssignments, setStaffActiveAssignments] = useState<any[]>([]);'
);

// Replace handleEditorChange
content = content.replace(
  'const handleEditorChange = (e: any) => {};',
  'const handleEditorChange = (index: number, val: string) => {};'
);

// Replace prepareEditorWhatsappData
content = content.replace(
  'const prepareEditorWhatsappData = (prodId: string) => {};',
  'const prepareEditorWhatsappData = (prodId: string, eventIndex?: number) => {};'
);

fs.writeFileSync('src/components/ProductionModule.tsx', content);
console.log("Successfully patched funcs 2!");
