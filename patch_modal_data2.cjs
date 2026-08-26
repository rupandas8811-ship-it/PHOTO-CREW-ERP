const fs = require('fs');
let content = fs.readFileSync('src/components/BusinessOwnerDashboard.tsx', 'utf8');

const target1 = `    if (selectedCard === 'overview_prod') {
      return filteredProduction;
    }`;
const replace1 = `    if (selectedCard === 'overview_prod') {
      return filteredProduction;
    }
    if (selectedCard === 'overview_acceptance') {
      return filteredProduction.filter(prod => {
        const sLower = (prod.production_status || prod.editing_status || prod.status || '').toLowerCase();
        return sLower.includes('client accept') || sLower.includes('accepted') || sLower.includes('approved');
      });
    }
    if (selectedCard === 'overview_closed') {
      return filteredOrders.filter(o => o.current_stage === 'Order Closed' || o.current_stage === 'Closed');
    }`;
content = content.replace(target1, replace1);

const target2 = `    if (selectedCard === 'overview_prod') {
      return [
        { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-400">{item.order_id || item.tracking_id}</span> },
        { key: 'event_type', label: 'Project Type', render: (item: any) => <span className="font-bold text-white">{item.event_type || item.project_type || 'Editing'}</span> },
        { key: 'status', label: 'Status', render: (item: any) => <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 font-bold font-mono text-[10px]">{item.production_status || item.editing_status || item.status || 'Active'}</span> },
        { key: 'editor', label: 'Editor', render: (item: any) => <span className="text-zinc-400">{item.editor || item.assigned_editor || 'Unassigned'}</span> }
      ];
    }`;
const replace2 = `    if (selectedCard === 'overview_prod') {
      return [
        { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-400">{item.order_id || item.tracking_id}</span> },
        { key: 'event_type', label: 'Project Type', render: (item: any) => <span className="font-bold text-white">{item.event_type || item.project_type || 'Editing'}</span> },
        { key: 'status', label: 'Status', render: (item: any) => <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 font-bold font-mono text-[10px]">{item.production_status || item.editing_status || item.status || 'Active'}</span> },
        { key: 'editor', label: 'Editor', render: (item: any) => <span className="text-zinc-400">{item.editor || item.assigned_editor || 'Unassigned'}</span> }
      ];
    }
    if (selectedCard === 'overview_acceptance') {
      return [
        { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-400">{item.order_id || item.tracking_id}</span> },
        { key: 'event_type', label: 'Project Type', render: (item: any) => <span className="font-bold text-white">{item.event_type || item.project_type || 'Editing'}</span> },
        { key: 'status', label: 'Status', render: (item: any) => <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono text-[10px]">{item.production_status || item.editing_status || item.status || 'Approved'}</span> }
      ];
    }
    if (selectedCard === 'overview_closed') {
      return [
        { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-400">{item.order_id}</span> },
        { key: 'customer_name', label: 'Customer Name', render: (item: any) => <span className="font-bold text-white">{item.customer_name}</span> },
        { key: 'status', label: 'Status', render: (item: any) => <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono text-[10px]">{item.current_stage || 'Closed'}</span> }
      ];
    }`;
content = content.replace(target2, replace2);

const target3 = `      case 'overview_prod':
        return {
          title: 'Production Performance Details',
          totalLabel: 'Total Projects',
          totalValue: \`\${prodStats.total}\`,
          accentColor: 'pink' as const,
          filterDescription: 'This list displays all production and editing projects active within the selected date range.'
        };`;
const replace3 = `      case 'overview_prod':
        return {
          title: 'Production Performance Details',
          totalLabel: 'Total Projects',
          totalValue: \`\${prodStats.total}\`,
          accentColor: 'pink' as const,
          filterDescription: 'This list displays all production and editing projects active within the selected date range.'
        };
      case 'overview_acceptance':
        return {
          title: 'Client Acceptance Details',
          totalLabel: 'Approved Projects',
          totalValue: \`\${modalData.length}\`,
          accentColor: 'emerald' as const,
          filterDescription: 'This list displays all projects that have been accepted by the client.'
        };
      case 'overview_closed':
        return {
          title: 'Orders Closed Details',
          totalLabel: 'Closed Orders',
          totalValue: \`\${modalData.length}\`,
          accentColor: 'emerald' as const,
          filterDescription: 'This list displays all fully closed orders within the date range.'
        };`;
content = content.replace(target3, replace3);

fs.writeFileSync('src/components/BusinessOwnerDashboard.tsx', content);
console.log('Success patch modal data 2');
