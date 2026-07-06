import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const searchStr1 = `
            booking_status: createForm.booking_status || undefined,
            Additional_Services_Cost: null,
            Quotation_Discount: null,
            Final_Quotation_Amount: null,
            remarks: getRemarksPayload(
`;

const replaceStr1 = `
            booking_status: createForm.booking_status || undefined,
            remarks: getRemarksPayload(
`;

content = content.replace(searchStr1, replaceStr1);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated handleWizardNext 1 to avoid resetting values");
