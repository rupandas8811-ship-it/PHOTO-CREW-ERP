import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export const exportReport = (
  format: 'csv' | 'xlsx' | 'pdf',
  reportName: string,
  data: any[],
  columns: { header: string; key: string }[],
  filters: any
) => {
  const businessName = "Cinematic Studio";
  const dateRange = filters.dateRange === 'Custom' 
    ? `${filters.startDate} to ${filters.endDate}` 
    : filters.dateRange;
  const appliedFilters = `Search: ${filters.search || 'None'} | Status: ${filters.status || 'All'} | Date: ${dateRange}`;
  
  if (format === 'csv' || format === 'xlsx') {
    const wsData = [];
    wsData.push([businessName]);
    wsData.push([reportName]);
    wsData.push([`Generated: ${new Date().toLocaleString()}`]);
    wsData.push([`Filters: ${appliedFilters}`]);
    wsData.push([]); // empty row
    
    // Headers
    wsData.push(columns.map(c => c.header));
    
    // Rows
    data.forEach(item => {
      wsData.push(columns.map(c => {
        let val = item[c.key];
        if (val === null || val === undefined) return '';
        return String(val);
      }));
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    if (format === 'csv') {
      XLSX.writeFile(wb, `${reportName.replace(/\s+/g, '_')}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, `${reportName.replace(/\s+/g, '_')}.xlsx`, { bookType: 'xlsx' });
    }
  } else if (format === 'pdf') {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(businessName, 14, 15);
    doc.setFontSize(12);
    doc.text(reportName, 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Filters: ${appliedFilters}`, 14, 34);
    
    let y = 45;
    // Simple table for PDF since we don't have jspdf-autotable installed
    // We'll just write headers and rows with basic spacing.
    const colWidth = 190 / columns.length;
    
    doc.setFont(undefined, 'bold');
    columns.forEach((c, i) => {
      doc.text(c.header.substring(0, 15), 14 + (i * colWidth), y);
    });
    y += 7;
    
    doc.setFont(undefined, 'normal');
    data.forEach(item => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      columns.forEach((c, i) => {
        let val = item[c.key];
        if (val === null || val === undefined) val = '';
        doc.text(String(val).substring(0, 15), 14 + (i * colWidth), y);
      });
      y += 7;
    });
    
    doc.save(`${reportName.replace(/\s+/g, '_')}.pdf`);
  }
};
