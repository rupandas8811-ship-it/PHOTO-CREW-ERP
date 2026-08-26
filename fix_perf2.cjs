const fs = require('fs');
let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');

// Replace order fetching logic with a much faster one
const oldOrdersLogic = `        if (supabaseClient) {
          try {
            const { data: dbOrders } = await supabaseClient.from('orders').select('order_id');
            if (dbOrders) {
              dbOrders.forEach((o: any) => { if (o.order_id) existingOrderIds.add(o.order_id); });
            }
          } catch (e) {
            console.warn("Error fetching order_ids from DB for unique ID generation:", e);
          }
        }`;

const newOrdersLogic = `        if (supabaseClient) {
          try {
            // Only fetch a few latest order IDs
            const { data: dbOrders } = await supabaseClient.from('orders').select('order_id').order('created_at', { ascending: false }).limit(20);
            if (dbOrders) {
              dbOrders.forEach((o: any) => { if (o.order_id) existingOrderIds.add(o.order_id); });
            }
          } catch (e) {
            console.warn("Error fetching order_ids from DB for unique ID generation:", e);
          }
        }`;

if(code.includes(oldOrdersLogic)) {
  code = code.replace(oldOrdersLogic, newOrdersLogic);
  fs.writeFileSync('src/components/RoleContext.tsx', code);
  console.log('RoleContext.tsx orders fetch updated');
} else {
  console.log('Could not find oldOrdersLogic');
}
