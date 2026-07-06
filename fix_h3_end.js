import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const h3EndSearch = `    } finally {
      setIsSaving(false);
    }
  };`;
const h3EndReplace = `    } finally {
      setIsSaving(false);
    }
    });
  };`;

content = content.replace(h3EndSearch, h3EndReplace);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated h3End");
