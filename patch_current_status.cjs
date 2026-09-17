const fs = require('fs');
const file = 'src/components/ProductionStaffModule.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `
        // Determine unified status
        let currentStatus = assignment.status || 'Assigned Editor';

        const excludedStatuses = ['Editing Completed', 'Editing Complete', 'Business Owner Review', 'Project Completed', 'Completed', 'Order Closed', 'Closed'];
        const operationsOnlyStages = ['Order Confirmed', 'Confirm Order', 'New Order', 'Operations Assigned', 'Assigned Crew', 'Staff Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'Footage Handover'];
`;

const newLogic = `
        // Edited Drive Link resolution
        const editedDriveLink = (assignment.Edited_Drive_Link || assignment.edited_drive_link || '').trim();

        // Determine unified status
        let currentStatus = assignment.status || 'Assigned Editor';
        
        const excludedStatuses = ['Editing Completed', 'Editing Complete', 'Business Owner Review', 'Project Completed', 'Completed', 'Order Closed', 'Closed'];
        const operationsOnlyStages = ['Order Confirmed', 'Confirm Order', 'New Order', 'Operations Assigned', 'Assigned Crew', 'Staff Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'Footage Handover'];

        // Automatically reflect Customer Review visually if link is present, to prevent UI contradiction
        if (editedDriveLink && !['Client Acceptance'].includes(currentStatus) && !excludedStatuses.includes(currentStatus)) {
            currentStatus = 'Customer Review';
        }
`;

// wait, the file already defines editedDriveLink below this!
