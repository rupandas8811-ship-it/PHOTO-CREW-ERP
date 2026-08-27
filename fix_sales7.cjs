const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

// Undo line 113
content = content.replace(
  "      ) : null}\n    </div>\n  );\n};",
  "      )}\n    </div>\n  );\n};"
);

// Do it at the end
const lastIndex = content.lastIndexOf("      )}\n    </div>\n  );\n};");
if (lastIndex !== -1) {
    content = content.substring(0, lastIndex) + "      ) : null}\n    </div>\n  );\n};\n" + content.substring(lastIndex + "      )}\n    </div>\n  );\n};".length);
} else {
    // If lastIndex is -1 because of formatting, maybe try something else.
    console.log("Could not find at the end");
}

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
console.log('Fixed SalesModule 7');
