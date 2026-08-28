import React from 'react';
import { UnifiedCalendar } from './UnifiedCalendar';

interface SalesCalendarProps {
  onSelectLead?: (lead: any) => void;
}

export const SalesCalendar: React.FC<SalesCalendarProps> = ({ onSelectLead }) => {
  return <UnifiedCalendar role="sales" onSelectLead={onSelectLead} />;
};
