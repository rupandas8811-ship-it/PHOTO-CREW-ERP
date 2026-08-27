const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// Undo the change at the beginning
content = content.replace('      )}\n      </div>\n    </div>\n  );\n};\n\nfunction parseQtyAndText', '      )}\n    </div>\n  );\n};\n\nfunction parseQtyAndText');

// Do the change at the VERY END
const endStr = '      )}\n    </div>\n  );\n};\n\nexport default SalesModule;';
const newEndStr = '      )}\n      </div>\n    </div>\n  );\n};\n\nexport default SalesModule;';

if (content.endsWith(endStr)) {
    content = content.substring(0, content.length - endStr.length) + newEndStr;
} else if (content.includes(endStr)) {
    const idx = content.lastIndexOf(endStr);
    content = content.substring(0, idx) + newEndStr + content.substring(idx + endStr.length);
}

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
