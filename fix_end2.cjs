const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');
content = content.replace('      )}\n    </div>\n  );\n};', '      )}\n      </div>\n    </div>\n  );\n};');
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
