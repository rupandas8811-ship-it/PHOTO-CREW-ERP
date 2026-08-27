const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

// The sequence of closing divs.
const target = '        </div>\n        </div>,\n        document.body';
const replacement = 'createPortal(\n        </div>\n        </div>,\n        document.body)';

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
    console.log("Fixed syntax");
} else {
    console.log("Target not found");
}
