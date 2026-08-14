const fs = require('fs');
let content = fs.readFileSync('src/components/BusinessOwnerDashboard.tsx', 'utf8');

const targetStr = `  const outstandingPaymentTotal = useMemo(() => {`;
const replaceStr = `  const salesStats = useMemo(() => {
    const total = filteredLeads.length;
    const confirmed = filteredLeads.filter(l => {
      const matchingOrder = orders.find(o => o.lead_id === l.lead_id || o.order_id === l.lead_id);
      const sLower = (l.current_status || l.status || '').toLowerCase();
      return sLower.includes('confirm') || matchingOrder;
    }).length;
    const rate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    return { total, confirmed, rate };
  }, [filteredLeads, orders]);

  const opsStats = useMemo(() => {
    const total = filteredOperations.length;
    const completed = filteredOperations.filter(op => {
      const sLower = (op.operations_status || op.status || '').toLowerCase();
      return sLower.includes('complete') || sLower.includes('delivered') || sLower.includes('closed');
    }).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate };
  }, [filteredOperations]);

  const prodStats = useMemo(() => {
    const total = filteredProduction.length;
    const completed = filteredProduction.filter(prod => {
      const sLower = (prod.production_status || prod.editing_status || prod.status || '').toLowerCase();
      return sLower.includes('complete') || sLower.includes('delivered') || sLower.includes('closed') || sLower.includes('verified');
    }).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate };
  }, [filteredProduction]);

  const outstandingPaymentTotal = useMemo(() => {`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BusinessOwnerDashboard.tsx', content);
console.log('Success patch kpi calc');
