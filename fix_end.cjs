const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');
const lastIndex = content.lastIndexOf("              )}");
if (lastIndex !== -1) {
    // We just need to close whatever open tags exist.
    content = content.substring(0, lastIndex) + "              )}\n            </div>\n          </div>\n        </div>\n      ) : null}\n    </div>\n  );\n};\nexport default SalesModule;\n";
}
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
