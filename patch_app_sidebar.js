const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace {sidebarOpen && ( <div className="hidden lg:block w-64 ...> ... </div> )}
// with an always rendered div that shrinks when !sidebarOpen.

const oldSidebar = `{sidebarOpen && (
          <div className="hidden lg:block w-64 flex-shrink-0 transition-all duration-300">
            <div className="sticky top-20">
              {renderSidebarContent()}
            </div>
          </div>
        )}`;

const newSidebar = `<div className={\`hidden lg:block flex-shrink-0 transition-all duration-300 \${sidebarOpen ? 'w-64' : 'w-20'}\`}>
          <div className={\`sticky top-20 \${!sidebarOpen ? 'sidebar-collapsed' : ''}\`}>
            {renderSidebarContent()}
          </div>
        </div>`;

code = code.replace(oldSidebar, newSidebar);
fs.writeFileSync('src/App.tsx', code);
