import React from 'react';
import { OwnerRevenueDetailed } from './analytics/owner/OwnerRevenueDetailed';
import { OwnerSalesDetailed } from './analytics/owner/OwnerSalesDetailed';
import { OwnerOperationsDetailed } from './analytics/owner/OwnerOperationsDetailed';
import { OwnerProductionDetailed } from './analytics/owner/OwnerProductionDetailed';
import { BusinessOwnerCalendar } from './BusinessOwnerCalendar';

// --- 1. REVENUE ANALYTICS ---
export const OwnerRevenueAnalytics = () => {
  return (
    <div className="animate-in fade-in duration-300">
      <OwnerRevenueDetailed />
    </div>
  );
};

// --- 2. EVENT CALENDAR ---
export const OwnerEventCalendar = () => {
  return (
    <div className="animate-in fade-in duration-300">
      <BusinessOwnerCalendar />
    </div>
  );
};

// --- 3. SALES REPORT & ANALYTICS ---
export const OwnerSalesReport = () => {
  return (
    <div className="animate-in fade-in duration-300">
      <OwnerSalesDetailed />
    </div>
  );
};

// --- 4. OPERATIONS REPORT & ANALYTICS ---
export const OwnerOperationsReport = () => {
  return (
    <div className="animate-in fade-in duration-300">
      <OwnerOperationsDetailed />
    </div>
  );
};

// --- 5. PRODUCTION REPORT & ANALYTICS ---
export const OwnerProductionReport = () => {
  return (
    <div className="animate-in fade-in duration-300">
      <OwnerProductionDetailed />
    </div>
  );
};
