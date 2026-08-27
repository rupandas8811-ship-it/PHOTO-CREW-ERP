const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');
// Find the portal close and prepend createPortal(
const target = '</div>        </div>,        document.body';
const replacement = 'createPortal(        </div>        </div>,        document.body)';
if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
    console.log("Fixed syntax");
} else {
    // Try a more robust search
    console.log("Target not found, searching...");
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('document.body')) {
             console.log("Found at line " + (i+1) + ": " + lines[i]);
             break;
        }
    }
}
