const fs = require('fs');
let content = fs.readFileSync('src/components/BusinessOwnerDashboard.tsx', 'utf8');

const targetStr = `    if (selectedCard === 'overview_outstanding') {`;
const replaceStr = `    if (selectedCard === 'overview_sales') {
      return filteredLeads.map(l => {
        const matchingOrder = orders.find(o => o.lead_id === l.lead_id || o.order_id === l.lead_id);
        const isConfirmed = (l.current_status || l.status || '').toLowerCase().includes('confirm') || !!matchingOrder;
        return { ...l, isConfirmed };
      });
    }
    if (selectedCard === 'overview_ops') {
      return filteredOperations;
    }
    if (selectedCard === 'overview_prod') {
      return filteredProduction;
    }
    if (selectedCard === 'overview_outstanding') {`;

content = content.replace(targetStr, replaceStr);

const targetColsStr = `    if (selectedCard === 'overview_outstanding') {`;
const replaceColsStr = `    if (selectedCard === 'overview_sales') {
      return [
        { key: 'lead_id', label: 'Lead ID', render: (item: any) => <span className="font-mono text-zinc-400">{item.lead_id}</span> },
        { key: 'customer_name', label: 'Customer Name', render: (item: any) => <span className="font-bold text-white">{item.customer_name}</span> },
        { key: 'status', label: 'Status', render: (item: any) => <span className={\`px-2.5 py-1 rounded-lg font-bold font-mono text-[10px] \${item.isConfirmed ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-400'}\`}>{item.current_status || item.status || 'Active'}</span> },
        { key: 'sales_person', label: 'Sales Person', render: (item: any) => <span className="text-zinc-400">{item.sales_person || 'Unassigned'}</span> }
      ];
    }
    if (selectedCard === 'overview_ops') {
      return [
        { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-400">{item.order_id || item.lead_id}</span> },
        { key: 'event_type', label: 'Event Type', render: (item: any) => <span className="font-bold text-white">{item.event_type}</span> },
        { key: 'status', label: 'Status', render: (item: any) => <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold font-mono text-[10px]">{item.operations_status || item.status || 'Active'}</span> },
        { key: 'assigned', label: 'Assigned Crew', render: (item: any) => <span className="text-zinc-400">{item.assigned_photographer || item.assigned_videographer || item.primary_assigned || 'Unassigned'}</span> }
      ];
    }
    if (selectedCard === 'overview_prod') {
      return [
        { key: 'order_id', label: 'Order ID', render: (item: any) => <span className="font-mono text-zinc-400">{item.order_id || item.tracking_id}</span> },
        { key: 'event_type', label: 'Project Type', render: (item: any) => <span className="font-bold text-white">{item.event_type || item.project_type || 'Editing'}</span> },
        { key: 'status', label: 'Status', render: (item: any) => <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 font-bold font-mono text-[10px]">{item.production_status || item.editing_status || item.status || 'Active'}</span> },
        { key: 'editor', label: 'Editor', render: (item: any) => <span className="text-zinc-400">{item.editor || item.assigned_editor || 'Unassigned'}</span> }
      ];
    }
    if (selectedCard === 'overview_outstanding') {`;

content = content.replace(targetColsStr, replaceColsStr);

const targetTitleStr = `      case 'overview_outstanding':`;
const replaceTitleStr = `      case 'overview_sales':
        return {
          title: 'Sales Performance Details',
          totalLabel: 'Total Leads',
          totalValue: \`\${salesStats.total}\`,
          accentColor: 'amber' as const,
          filterDescription: 'This list displays all leads generated and processed within the selected date range.'
        };
      case 'overview_ops':
        return {
          title: 'Operations Performance Details',
          totalLabel: 'Total Events',
          totalValue: \`\${opsStats.total}\`,
          accentColor: 'blue' as const,
          filterDescription: 'This list displays all operational events assigned and executed within the selected date range.'
        };
      case 'overview_prod':
        return {
          title: 'Production Performance Details',
          totalLabel: 'Total Projects',
          totalValue: \`\${prodStats.total}\`,
          accentColor: 'pink' as const,
          filterDescription: 'This list displays all production and editing projects active within the selected date range.'
        };
      case 'overview_outstanding':`;

content = content.replace(targetTitleStr, replaceTitleStr);

fs.writeFileSync('src/components/BusinessOwnerDashboard.tsx', content);
console.log('Success patch modal data');
