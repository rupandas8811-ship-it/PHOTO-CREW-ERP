const fs = require('fs');
const content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');
const lines = content.split('\n');
let depth = 0;
let lastDivLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Count open divs
  const opens = (line.match(/<div/g) || []).length;
  // Count close divs
  const closes = (line.match(/<\/div>/g) || []).length;
  
  if (opens > closes) {
    depth += (opens - closes);
    lastDivLines.push({line: i + 1, depth, text: line.trim()});
  } else if (closes > opens) {
    depth -= (closes - opens);
    // Find matching open and remove it conceptually
    lastDivLines.push({line: i + 1, depth, text: line.trim()});
  }
}
console.log("Final depth:", depth);
