const fs = require('fs');

const content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const getBlock = (funcName, startIdx, searchStr) => {
  const start = content.indexOf(searchStr, startIdx);
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  let started = false;
  for(let i=start; i<content.length; i++) {
    if (content[i] === '{') {
      depth++;
      started = true;
    }
    if (content[i] === '}') {
      depth--;
      if (started && depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return content.slice(start, end);
};

const getRawFootageDriveLink = getBlock('getRawFootageDriveLink', 0, 'const getRawFootageDriveLink =');
const getRawFootageStatus = getBlock('getRawFootageStatus', 0, 'const getRawFootageStatus =');
const getAssignedEditorsList = getBlock('getAssignedEditorsList', 0, 'const getAssignedEditorsList =');

fs.writeFileSync('/tmp/extracted_helpers.txt', 
  getRawFootageDriveLink + '\n\n' + 
  getRawFootageStatus + '\n\n' + 
  getAssignedEditorsList + '\n'
);
