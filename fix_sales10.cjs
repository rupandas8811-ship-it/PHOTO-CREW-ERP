const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

// replace the end with just what's needed
const lastIndex = content.lastIndexOf("              )}");
if (lastIndex !== -1) {
    content = content.substring(0, lastIndex) + "              )}\n            </div>\n          </div>\n        ) : null}\n    </div>\n  );\n};\nexport default SalesModule;\n";
}

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
console.log('Fixed SalesModule 10');
