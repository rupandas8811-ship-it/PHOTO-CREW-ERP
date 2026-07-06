import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const searchStr = `  const [showReportingPopup, setShowReportingPopup] = useState(false);
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
  };`;

const replaceStr = `  const [showReportingPopup, setShowReportingPopup] = useState(false);
  const [reportingPopupData, setReportingPopupData] = useState<{ eventId: string; eventName: string; date: string; time: string; }[]>([]);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [isReportingSaving, setIsReportingSaving] = useState(false);

  const executeWithReportingPopup = (action: () => Promise<void>) => {
    const targetLeadId = selectedLead?.lead_id || createdLeadId;
    const targetLead = leads.find(l => l.lead_id === targetLeadId);
    
    if (targetLead?.events && targetLead.events.length > 0) {
      const initialData = targetLead.events.map(ev => ({
        eventId: ev.id,
        eventName: ev.event_name || 'Event',
        date: targetLead.Reporting_date || ev.event_date || '',
        time: ev.reporting_time || ''
      }));
      setReportingPopupData(initialData);
    } else {
      setReportingPopupData([{
        eventId: 'default',
        eventName: 'Main Event',
        date: targetLead?.Reporting_date || '',
        time: targetLead?.reporting_time || ''
      }]);
    }
    
    setPendingConfirmAction(() => action);
    setShowReportingPopup(true);
  };`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated state logic");
