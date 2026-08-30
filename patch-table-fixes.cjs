const fs = require('fs');

let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

// 1. Icons
code = code.replace(/Search } from 'lucide-react';/, 'Search, FileSpreadsheet, Download, Printer } from \'lucide-react\';');

// 2. States
const stateDecls = `
  const [dtStart, setDtStart] = useState('');
  const [dtEnd, setDtEnd] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [appliedCustName, setAppliedCustName] = useState('');
  const [appliedOrdId, setAppliedOrdId] = useState('');
  
  const leadSearch = appliedCustName || appliedOrdId || '';
`;
// Replace the old empty declarations
code = code.replace(/const appliedCustName = searchCustName;/, '');
code = code.replace(/const appliedOrdId = searchOrdId;/, '');
code = code.replace(/const appliedStartDate = '';/, '');
code = code.replace(/const appliedEndDate = '';/, stateDecls);

// 3. Helpers
const helpers = `
  const getProductionPriority = (prod: any) => prod.project_priority || 'Medium';
  const getTargetDeliveryDateFromAssignments = (prod: any) => prod.expected_delivery_date || '';
  const calculateDaysRemaining = (date: string) => {
    if (!date) return 0;
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };
  const compareRecordsByDate = (a: any, b: any) => {
    const d1 = new Date(a.event_date || a.created_at || 0).getTime();
    const d2 = new Date(b.event_date || b.created_at || 0).getTime();
    return d2 - d1;
  };
  const printReport = () => window.print();
  const formatDisplayDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB') : '';
  const setMasterOrderIdForDetail = () => {};
  const setIsDetailModalOpen = () => {};
`;

code = code.replace(/const leads = productionList;/, "const leads = productionList;\n" + helpers);

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code);
