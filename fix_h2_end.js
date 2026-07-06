import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const h2EndSearch = `      } finally {
        setIsSaving(false);
      }
      return;
    }`;
const h2EndReplace = `      } finally {
        setIsSaving(false);
      }
      });
      return;
    }`;

content = content.replace(h2EndSearch, h2EndReplace);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated h2End");
