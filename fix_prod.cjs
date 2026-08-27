const fs = require('fs');
const content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// Find the first non-ASCII character in the last 100000 characters
let firstGibberishIndex = content.length;
for (let i = Math.max(0, content.length - 100000); i < content.length; i++) {
  if (content.charCodeAt(i) > 127 && content.charCodeAt(i) !== 160) { // 160 is non-breaking space
    firstGibberishIndex = i;
    break;
  }
}

let cleanContent = content.substring(0, firstGibberishIndex);
// find the last valid closing tags
let lastValidEnd = cleanContent.lastIndexOf('    </div>\n  );\n};');
if (lastValidEnd !== -1) {
    cleanContent = cleanContent.substring(0, lastValidEnd + '    </div>\n  );\n};\n'.length);
} else {
    // try just };
    lastValidEnd = cleanContent.lastIndexOf('};\n');
    if (lastValidEnd !== -1) {
        cleanContent = cleanContent.substring(0, lastValidEnd + '};\n'.length);
    }
}

fs.writeFileSync('src/components/ProductionModule.tsx', cleanContent, 'utf8');
console.log('Fixed ProductionModule');
