const fs = require('fs');
let content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');

// Find the problematic lines around cleanTerms
const badLines = `      if (cleanTerms.includes('\n\nMETADATA:')) {\n        cleanTerms = cleanTerms.split('\n\nMETADATA:')[0];`;
// But it was literally a newline in the string literal, let's just replace it by regex
content = content.replace(/cleanTerms\.includes\('[\s\S]*?METADATA:'\)\) \{[\s\S]*?cleanTerms\.split\('[\s\S]*?METADATA:'\)\[0\];/, "cleanTerms.includes('\\n\\nMETADATA:')) {\n        cleanTerms = cleanTerms.split('\\n\\nMETADATA:')[0];");

fs.writeFileSync('src/components/RoleContext.tsx', content);
