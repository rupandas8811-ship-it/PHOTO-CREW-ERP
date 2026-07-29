const fs = require('fs');
let content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

content = content.replace(/onChange=\{\(e\) => handlePhotoCapture\(item\.name, e\)\}/g, "onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} onChange={(e) => handlePhotoCapture(item.name, e)}");

fs.writeFileSync('src/components/StaffModule.tsx', content);
console.log("Patched onClick");
