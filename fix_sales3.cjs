const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

content = content.replace(
  "              </button>\n              )}\n            </div>",
  "              </button>\n            </div>"
); // reverts the bad replace

const target = "              </button>\n            </div>";
const replacement = "              </button>\n              )}\n            </div>";
const lastIndex = content.lastIndexOf(target);

if (lastIndex !== -1) {
    content = content.substring(0, lastIndex) + replacement + content.substring(lastIndex + target.length);
}

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
console.log('Fixed SalesModule 3');
