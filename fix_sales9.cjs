const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const lastIndex = content.lastIndexOf(") : null}");
if (lastIndex !== -1) {
    content = content.substring(0, lastIndex) + "        </div>\n      ) : null}" + content.substring(lastIndex + ") : null}".length);
}

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
console.log('Fixed SalesModule 9');
