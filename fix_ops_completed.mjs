import fs from 'fs';
const file = 'src/components/BusinessOwnerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "{ key: 'completed_date', label: 'Completion Date', render: (item: any) => <span className=\"font-mono text-zinc-400 text-xs\">{item.rawOrder?.updated_at ? item.rawOrder.updated_at.replace('T', ' ').substring(0, 16) : 'N/A'}</span> },",
  "{ key: 'completed_date', label: 'Completion Date', render: (item: any) => <span className=\"font-mono text-zinc-400 text-xs\">{item.rawOrder?.updated_at ? item.rawOrder.updated_at.replace('T', ' ').substring(0, 16) : 'N/A'}</span> },\n          { key: 'order_closed_date', label: 'Order Closed Date', render: (item: any) => <span className=\"font-mono text-zinc-400 text-xs\">{item.rawOrder?.updated_at ? item.rawOrder.updated_at.replace('T', ' ').substring(0, 16) : 'N/A'}</span> },"
);
fs.writeFileSync(file, content);
console.log("Done");
