const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');
content = content.replace(
  "              </button>\n            </div>",
  "              </button>\n              )}\n            </div>"
);
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
console.log('Fixed SalesModule 2');
