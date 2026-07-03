const fs = require('fs');
let content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');

// Replace useStates with localStorage caching to just []
content = content.replace(/const \[leads, setLeads\] = useState<Lead\[\]>\(\(\) => \{[^}]+\}\);/g, "const [leads, setLeads] = useState<Lead[]>([]);");
content = content.replace(/const \[statusHistory, setStatusHistory\] = useState<any\[\]>\(\(\) => \{[^}]+\}\);/g, "const [statusHistory, setStatusHistory] = useState<any[]>([]);");
content = content.replace(/const \[quotations, setQuotations\] = useState<any\[\]>\(\(\) => \{[^}]+\}\);/g, "const [quotations, setQuotations] = useState<any[]>([]);");
content = content.replace(/const \[leadPackages, setLeadPackages\] = useState<LeadPackage\[\]>\(\(\) => \{[^}]+\}\);/g, "const [leadPackages, setLeadPackages] = useState<LeadPackage[]>([]);");
content = content.replace(/const \[orders, setOrders\] = useState<Order\[\]>\(\(\) => \{[^}]+\}\);/g, "const [orders, setOrders] = useState<Order[]>([]);");
content = content.replace(/const \[operations, setOperations\] = useState<Operation\[\]>\(\(\) => \{[^}]+\}\);/g, "const [operations, setOperations] = useState<Operation[]>([]);");
content = content.replace(/const \[rawFootage, setRawFootage\] = useState<RawFootage\[\]>\(\(\) => \{[^}]+\}\);/g, "const [rawFootage, setRawFootage] = useState<RawFootage[]>([]);");
content = content.replace(/const \[production, setProduction\] = useState<Production\[\]>\(\(\) => \{[^}]+\}\);/g, "const [production, setProduction] = useState<Production[]>([]);");
content = content.replace(/const \[payments, setPayments\] = useState<Payment\[\]>\(\(\) => \{[^}]+\}\);/g, "const [payments, setPayments] = useState<Payment[]>([]);");
content = content.replace(/const \[logs, setLogs\] = useState<ActivityLog\[\]>\(\(\) => \{[^}]+\}\);/g, "const [logs, setLogs] = useState<ActivityLog[]>([]);");
content = content.replace(/const \[staffAssignments, setStaffAssignments\] = useState<StaffAssignment\[\]>\(\(\) => \{[^}]+\}\);/g, "const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);");
content = content.replace(/const \[leadStaffAssignmentHistory, setLeadStaffAssignmentHistory\] = useState<LeadStaffAssignmentHistory\[\]>\(\(\) => \{[^}]+\}\);/g, "const [leadStaffAssignmentHistory, setLeadStaffAssignmentHistory] = useState<LeadStaffAssignmentHistory[]>([]);");

// Remove the caching useEffects
content = content.replace(/  useEffect\(\(\) => \{\n    localStorage\.setItem\('erp_[a-z_]+', JSON\.stringify\([a-zA-Z]+\)\);\n  \}, \[[a-zA-Z]+\]\);\n/g, "");

fs.writeFileSync('src/components/RoleContext.tsx', content);
