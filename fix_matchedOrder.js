import fs from 'fs';
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

content = content.replace(
  "      const matchedOrder = orders.find(o => o.order_id === assigningOrderId);\n      if (supabaseClient && matchedOrder?.lead_id) {",
  "      const baseMatchedOrder = orders.find(o => o.order_id === assigningOrderId);\n      if (supabaseClient && baseMatchedOrder?.lead_id) {"
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content, 'utf-8');
console.log("Fixed matchedOrder duplicate");
