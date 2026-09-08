const fs = require('fs');
let content = fs.readFileSync('src/components/sales/useSalesDashboardState.tsx', 'utf8');

content = content.replace(/event_\n        event_event_\n        desired_event_event_/g, "event_shoot_type: firstEvent.event_shoot_type || '',");
content = content.replace(/event_\n        event_event_\n        desired_event_event_/g, "event_shoot_type: firstEvent.event_shoot_type || '',");

// line 969
content = content.replace(/const \[Number\(finalPackageAmount\) \|\| 0, setFinalPackageAmount\]/g, "const [finalPackageAmount, setFinalPackageAmount]");
content = content.replace(/const \[Number\(advanceReceived\) \|\| 0, setAdvanceReceived\]/g, "const [advanceReceived, setAdvanceReceived]");

// Check for other syntax errors from tsc
// src/components/sales/useSalesDashboardState.tsx(7725,29): error TS1005: '{' expected.

fs.writeFileSync('src/components/sales/useSalesDashboardState.tsx', content);
