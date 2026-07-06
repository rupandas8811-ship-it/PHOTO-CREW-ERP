import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// The block to remove is from `    else if (wizardStep === 3) {` up to `    }  };\n\n  const handleStatusSave = async () => {`

const startIdx = content.indexOf('    else if (wizardStep === 3) {');
const endIdx = content.indexOf('  const handleStatusSave = async () => {');

if (startIdx !== -1 && endIdx !== -1) {
  // Let's make sure we preserve the end of wizardStep === 2
  // Let's just find `    }  };\n\n  const handleStatusSave = async () => {`
  content = content.slice(0, startIdx) + '  };\n\n' + content.slice(endIdx);
  fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
  console.log("Removed wizardStep 3 and 4 logic from handleWizardNext");
} else {
  console.log("Could not find blocks");
}

