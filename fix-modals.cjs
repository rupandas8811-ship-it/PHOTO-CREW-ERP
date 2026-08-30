const fs = require('fs');
const files = [
  'src/components/production/AssignEditor.tsx',
  'src/components/production/AssignOperationsStaff.tsx',
  'src/components/production/ReassignStaff.tsx',
  'src/components/production/ProductionProofUpload.tsx',
  'src/components/production/ProductionDetails.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Clean up any bad previous replacements in AssignEditor
  if (file.includes('AssignEditor')) {
    content = content.replace(/,\n    document\.body/g, '');
    content = content.replace(/if \(typeof document === "undefined"\) return null;\n  return createPortal\(/g, 'return (');
    content = content.replace(/import { createPortal } from "react-dom";\n/g, '');
  }
  
  if (!content.includes("import { createPortal }")) {
    content = "import { createPortal } from 'react-dom';\n" + content;
  }
  
  // Look for the main component return (
  // We can just replace the LAST `  );\n};` or `  );\n}` with `, document.body);\n};`
  // and replace the FIRST `return (` in the component body with `if (typeof document === 'undefined') return null;\n  return createPortal(`
  
  // A safer way is to find `return (\n    <div className="fixed ` or similar
  const returnRegex = /return \(\s*<div className="(?:fixed|absolute)/;
  if (returnRegex.test(content)) {
    content = content.replace(returnRegex, (match) => {
      return `if (typeof document === 'undefined') return null;\n  return createPortal(\n    <div className="` + match.split('className="')[1];
    });
    
    // Now replace the final `  );\n};`
    const parts = content.split('  );\n};');
    if (parts.length > 1) {
      content = parts.slice(0, -1).join('  );\n};') + '  ),\n  document.body\n);\n};';
    } else {
       const parts2 = content.split('  );\n}');
       if (parts2.length > 1) {
          content = parts2.slice(0, -1).join('  );\n}') + '  ),\n  document.body\n);}';
       }
    }
    
    fs.writeFileSync(file, content);
    console.log("Fixed", file);
  } else {
    console.log("Could not find return in", file);
  }
}
