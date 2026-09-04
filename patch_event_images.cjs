const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

code = code.replace(
  `                    const startMeta = getRecordMeta(startRecord);
                    const endMeta = getRecordMeta(endRecord);
                    return (`,
  `                    let startMeta = getRecordMeta(startRecord);
                    let endMeta = getRecordMeta(endRecord);
                    
                    if (selectedEventImages.taskDetails) {
                       startMeta.url = selectedEventImages.taskDetails.event_start_photo || startMeta.url;
                       endMeta.url = selectedEventImages.taskDetails.event_end_photo || endMeta.url;
                    }
                    return (`
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
