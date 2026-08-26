const fs = require('fs');
const file = 'src/components/ProductionModule.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Extract handleSaveStaff, addSkill, removeSkill
const startFuncs = content.indexOf('const handleSaveStaff = async (e: React.FormEvent) => {');
const endFuncs = content.indexOf('const productionStaffList = productionStaff || [];');
const funcsBlock = content.substring(startFuncs, endFuncs);

// Remove funcs from IIFE
content = content.substring(0, startFuncs) + content.substring(endFuncs);

// Insert funcs before return (
const returnIndex = content.indexOf('  return (\n    <div id="production_module"');
content = content.substring(0, returnIndex) + funcsBlock + '\n' + content.substring(returnIndex);

// 2. Extract modal
const modalStart = content.indexOf('{/* SECTION 1: ADD STAFF FORM (MODAL) */}');
const modalEnd = content.indexOf('{/* SECTION 2: STAFF DIRECTORY */}');
const modalBlock = content.substring(modalStart, modalEnd);

// Remove modal from IIFE
content = content.substring(0, modalStart) + content.substring(modalEnd);

// Insert modal at the end, right before </AnimatePresence>
const animateEnd = content.indexOf('</AnimatePresence>');
content = content.substring(0, animateEnd) + modalBlock + '\n      ' + content.substring(animateEnd);

fs.writeFileSync(file, content);
console.log("Done");
