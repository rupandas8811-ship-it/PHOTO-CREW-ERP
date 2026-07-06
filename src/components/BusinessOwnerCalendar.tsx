import React, { useState, useRef } from 'react';
import { UnifiedCalendar } from './UnifiedCalendar';
import { DashboardFilterBar, FilterState } from './analytics/owner/DashboardFilterBar';
import { exportReport } from './analytics/owner/exportUtils';
import { useRole } from './RoleContext';

export const BusinessOwnerCalendar: React.FC = () => {
  const { leads, orders, operations, production } = useRole();
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'All',
    dateRange: 'All Time',
    startDate: '',
    endDate: ''
  });

  const handleDownload = (format: 'csv' | 'xlsx' | 'pdf') => {
    // Collect all events based on logic similar to UnifiedCalendar (Simplified for report)
    // Actually, getting filteredEvents directly from UnifiedCalendar would be better.
    // Instead, we can just duplicate the filtering logic here for the report.
    const allEvents = orders.map(o => ({
      orderId: o.order_id,
      customerName: o.customer_name,
      eventName: o.event_type || 'N/A',
      date: o.event_date || 'N/A',
      location: o.event_location || 'N/A',
      status: o.current_stage || 'N/A'
    }));

    const filteredEvents = allEvents.filter(ev => {
        // 1. Date
        if (filters.dateRange !== 'All Time') {
          if (ev.date < filters.startDate || ev.date > filters.endDate) return false;
        }
        // 2. Search
        if (filters.search) {
          const s = filters.search.toLowerCase();
          const matchCust = ev.customerName.toLowerCase().includes(s);
          const matchEvent = ev.eventName.toLowerCase().includes(s);
          const matchId = ev.orderId.toLowerCase().includes(s);
          if (!matchCust && !matchEvent && !matchId) return false;
        }
        // 3. Status filter
        if (filters.status !== 'All') {
          const isCompleted = ['Event Completed', 'Raw Footage Received', 'Delivered', 'Paid', 'Closed'].includes(ev.status);
          const isCancelled = ev.status === 'Cancelled' || ev.status === 'Lost';
          const todayStr = new Date().toISOString().split('T')[0];
          const isUpcoming = ev.date > todayStr;
          const isOngoing = ev.date === todayStr;
          
          if (filters.status === 'Upcoming' && !isUpcoming) return false;
          if (filters.status === 'Ongoing' && !isOngoing) return false;
          if (filters.status === 'Completed' && !isCompleted) return false;
          if (filters.status === 'Cancelled' && !isCancelled) return false;
        }
        return true;
    });

    const columns = [
      { header: 'Order ID', key: 'orderId' },
      { header: 'Customer Name', key: 'customerName' },
      { header: 'Event Name', key: 'eventName' },
      { header: 'Date', key: 'date' },
      { header: 'Location', key: 'location' },
      { header: 'Status', key: 'status' }
    ];

    exportReport(format, 'Event Calendar Report', filteredEvents, columns, filters);
  };

  return (
    <div className="space-y-4">
      <DashboardFilterBar 
        filters={filters}
        setFilters={setFilters}
        statusOptions={[
          { label: 'Upcoming', value: 'Upcoming' },
          { label: 'Ongoing', value: 'Ongoing' },
          { label: 'Completed', value: 'Completed' },
          { label: 'Cancelled', value: 'Cancelled' }
        ]}
        onDownload={handleDownload}
        searchPlaceholder="Search by Event Name, Customer Name, Order ID..."
      />
      <UnifiedCalendar role="owner" ownerFilters={filters} />
    </div>
  );
};
