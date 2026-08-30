const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionWorkflowModal.tsx', 'utf8');

const badHandler = `const handleSectionEditorChange = (sectionIndex: number, itemIndex: number, editorName: string) => {`;
const goodHandler = `const handleSectionEditorChange = (sectionIndex: number, itemIndex: number, editorName: string) => {
    setWfEventSections(prev => {
      const updated = [...prev];
      const section = { ...updated[sectionIndex] };
      const items = [...section.items];
      items[itemIndex] = { ...items[itemIndex], editor: editorName };
      section.items = items;
      updated[sectionIndex] = section;
      return updated;
    });
  };`;

code = code.replace(badHandler, goodHandler);

fs.writeFileSync('src/components/production/ProductionWorkflowModal.tsx', code);
