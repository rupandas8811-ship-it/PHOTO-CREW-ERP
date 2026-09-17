const fs = require('fs');
const file = 'src/components/ProductionStaffModule.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `        // Edited Drive Link resolution
        const editedDriveLink = (assignment.Edited_Drive_Link || assignment.edited_drive_link || '').trim();`;

const newLogic = `        // Edited Drive Link resolution
        const editedDriveLink = (assignment.Edited_Drive_Link || assignment.edited_drive_link || '').trim();

        // Visually upgrade currentStatus to Customer Review if a link was uploaded, keeping it consistent with overall order status rank logic
        if (editedDriveLink && !['Client Acceptance'].includes(currentStatus) && !excludedStatuses.includes(currentStatus)) {
            currentStatus = 'Customer Review';
        }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
console.log('patched');
