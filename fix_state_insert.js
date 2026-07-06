import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const stateInsert = `
  const [statusError, setStatusError] = useState<{ title: string; reason: string; suggestedFix: string } | null>(null);
  
  // Interception Popup for Reporting Date & Time
  const [showReportingPopup, setShowReportingPopup] = useState(false);
  const [reportingPopupData, setReportingPopupData] = useState({ date: '', time: '' });
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [isReportingSaving, setIsReportingSaving] = useState(false);

  const executeWithReportingPopup = (action: () => Promise<void>) => {
    const targetLeadId = selectedLead?.lead_id || createdLeadId;
    const targetLead = leads.find(l => l.lead_id === targetLeadId);
    setReportingPopupData({
      date: targetLead?.Reporting_date || '',
      time: targetLead?.reporting_time || ''
    });
    setPendingConfirmAction(() => action);
    setShowReportingPopup(true);
  };

  const [isSaving, setIsSaving] = useState(false);
`;

const searchStr = `  const [statusError, setStatusError] = useState<{ title: string; reason: string; suggestedFix: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);`;

content = content.replace(searchStr, stateInsert);
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated state insert!");
