import fs from 'fs';
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

const oldStr = `      if (matchedOrder) {
        setSuccessModalData({
          orderId: assigningOrderId,
          customerName: matchedOrder.customer_name,
          order: { ...matchedOrder, current_stage: targetStage },
          assignments: [...activeAssignments]
        });
      }`;

const newStr = `      if (matchedOrder) {
        setSuccessModalData({
          orderId: assigningOrderId,
          customerName: matchedOrder.customer_name,
          order: { ...matchedOrder, current_stage: targetStage },
          assignments: [...finalAssignments]
        });
      }`;

content = content.replace(oldStr, newStr);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content, 'utf-8');
console.log("Fixed success modal");
