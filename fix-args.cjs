const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionWorkflowModal.tsx', 'utf8');

code = code.replace(/const updateOrderStage = async \(\) => \{\};/g, 'const updateOrderStage = async (id: string, stage: string) => {};');
code = code.replace(/const getAssignedEditorsList = \(\) => \[\];/g, 'const getAssignedEditorsList = (prod: any) => [];');
code = code.replace(/const performBusinessOwnerReview = async \(\) => \{\};/g, 'const performBusinessOwnerReview = async (prod: any, status: any) => {};');
code = code.replace(/const updateProduction = \(\) => \{\};/g, 'const updateProduction = (id: string, data: any) => {};');
code = code.replace(/const triggerAutoScrollAndFocus = \(\) => \{\};/g, 'const triggerAutoScrollAndFocus = (s: string, t: number) => {};');

fs.writeFileSync('src/components/production/ProductionWorkflowModal.tsx', code);
