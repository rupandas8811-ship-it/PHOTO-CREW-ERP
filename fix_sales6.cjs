const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

// The very last ')}' before '</div>\n  );\n};'
const target = "      )}\n    </div>\n  );\n};";
const replacement = "      ) : null}\n    </div>\n  );\n};";
content = content.replace(target, replacement);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
console.log('Fixed SalesModule 6');
