const { execSync } = require('child_process');
const output = execSync("awk '/const handleSectionEditorChange =/,/^[ \\t]*};[ \\t]*$/' src/components/ProductionModule.tsx").toString();
console.log(output);
