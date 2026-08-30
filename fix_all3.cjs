const fs = require('fs');
let code = fs.readFileSync('build-workflow-modal.cjs', 'utf8');
code = code.replace(/const handlers = fs\.readFileSync\('\/tmp\/all_handlers\.ts', 'utf8'\); \/\/ Using all handlers!/, "const handlers = fs.readFileSync('/tmp/workflow_handlers.txt', 'utf8');\n  const goodHandler = `const handleSectionEditorChange = (sectionIndex: number, itemIndex: number, editorName: string) => {\\n    setWfEventSections(prev => {\\n      const updated = [...prev];\\n      const section = { ...updated[sectionIndex] };\\n      const items = [...section.items];\\n      items[itemIndex] = { ...items[itemIndex], editor: editorName };\\n      section.items = items;\\n      updated[sectionIndex] = section;\\n      return updated;\\n    });\\n  };`;\n  const fixedHandlers = handlers.replace('const handleSectionEditorChange = (sectionIndex: number, itemIndex: number, editorName: string) => {', goodHandler);");

code = code.replace(/\$\{handlers\}/, "${fixedHandlers}");
fs.writeFileSync('build-workflow-modal.cjs', code);
