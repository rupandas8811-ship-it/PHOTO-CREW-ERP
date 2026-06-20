import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from './RoleContext';
import { 
  Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight, ChevronDown, Check, Package
} from 'lucide-react';
import { Lead, CurrentStage, LeadPackage } from '../types';
import { CameraLensStatsCard, CameraLensTheme } from './CameraLensStatsCard';
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers } from '../utils';
import { SalesCalendar } from './SalesCalendar';
import { jsPDF } from 'jspdf';

const generateQuotationPDF = (
  lead: any,
  activePkgs: any[],
  quoteNum: string,
  termsText: string,
  logoBase64?: string,
  editableInclusions?: Record<string, string[]>,
  editableDeliverables?: Record<string, string[]>,
  discountValue = 0,
  additionalCharges = 0
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color Palette & Premium Theme Variables (Photography Studio Inspired)
  const slateDark = [15, 23, 42];      // #0f172a
  const slateGray = [100, 116, 139];   // #64748b
  const bgLightGrid = [248, 250, 252]; // #f8fafc
  const headerBgColor = [18, 18, 22];  // Luxury Carbon Black
  const goldColor = [212, 175, 55];   // #D4AF37 Classic Gold

  // 1. BRAND HEADER (Black + Gold Premium Theme)
  // Fill full-width elegant dark header block
  doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
  doc.rect(0, 0, 210, 42, 'F'); // 42mm tall header

  // Bottom gold ribbon border
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, 41, 210, 1.2, 'F');

  // LEFT: Draw White Logo (stands out beautifully on Luxury Carbon Black background)
  let logoY = 10;
  let hasLogo = false;
  if (logoBase64 && logoBase64.startsWith('data:image')) {
    try {
      doc.addImage(logoBase64, 'PNG', 15, logoY, 22, 22);
      hasLogo = true;
    } catch (e) {
      console.warn('Failed to add logo image to PDF, drawing fallback badge:', e);
    }
  }

  if (!hasLogo) {
    // Fallback: A luxury golden camera style emblem & title branding
    doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.setLineWidth(0.6);
    doc.setFillColor(18, 18, 22);
    doc.circle(26, logoY + 11, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('P', 24.5, logoY + 14.5);
  }

  // CENTER: Photocrew Pictures Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text('PHOTOCREW PICTURES', 105, 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(185, 185, 185); // elegant light text
  doc.text('PREMIUM PHOTOGRAPHY STUDIO & VISUAL PRODUCTION', 105, 24, { align: 'center' });

  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.setFontSize(6.5);
  doc.text('★ ★ ★ ★ ★', 105, 29, { align: 'center' });

  // RIGHT: Contact Info (Right-aligned, absolutely safe against any overlap)
  doc.setTextColor(245, 245, 245);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('www.photocrewpictures.com', 195, 17, { align: 'right' });
  doc.text('info@photocrewpictures.com', 195, 22, { align: 'right' });
  doc.text('+91 9060144016', 195, 27, { align: 'right' });

  // 2. CUSTOMER DETAILS & LOGISTICS
  let clientY = 49;
  doc.setFillColor(bgLightGrid[0], bgLightGrid[1], bgLightGrid[2]); // slate-50
  doc.roundedRect(15, clientY, 180, 32, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.25);
  doc.roundedRect(15, clientY, 180, 32, 1.5, 1.5, 'D');

  // Left Column (Customer Specifics)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('CUSTOMER DETAILS', 20, clientY + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  
  const wrapCustName = doc.splitTextToSize(lead.customer_name || '', 55);
  doc.text(`Customer Name  :  ${wrapCustName[0] || 'N/A'}`, 20, clientY + 11.5);
  doc.text(`Mobile Number  :  ${lead.mobile || 'N/A'}`, 20, clientY + 16.5);
  const wrapEmail = doc.splitTextToSize(lead.email || 'N/A', 55);
  doc.text(`Email Address  :  ${wrapEmail[0]}`, 20, clientY + 21.5);
  doc.text(`Quotation No   :  ${quoteNum}`, 20, clientY + 26.5);

  // Right Column (Event & Proposal Logistics)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('EVENT LOGISTICS', 110, clientY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  
  const wrapEventType = doc.splitTextToSize(lead.event_type || '', 60);
  doc.text(`Event Type      :  ${wrapEventType[0] || 'N/A'}`, 110, clientY + 11.5);
  
  let formattedEvDate = 'N/A';
  if (lead.event_date) {
    try {
      const parts = lead.event_date.split('-');
      if (parts.length === 3) {
        const localDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        formattedEvDate = localDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        formattedEvDate = new Date(lead.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch(e) {}
  }
  doc.text(`Event Date      :  ${formattedEvDate}`, 110, clientY + 16.5);
  
  const wrapLocation = doc.splitTextToSize(lead.event_location || 'N/A', 60);
  doc.text(`Event Location  :  ${wrapLocation[0]}`, 110, clientY + 21.5);
  doc.text(`Quotation Date  :  ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, 110, clientY + 26.5);

  // 3. PACKAGE DETAILS SECTION
  let currentY = 88;
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('CHOSEN PACKAGE SPECIFICATIONS', 15, currentY);
  currentY += 4.5; // 92.5

  const hasActivePkgs = activePkgs.length > 0;
  
  const defaultDeliverables = [
    '350 Edited Photos',
    '4K Cinematic Video',
    '3 Reels',
    'Traditional Edited Video',
    'Album Details',
    'Additional Deliverables'
  ];

  const defaultInclusions = [
    '1 Candid Photographer',
    '1 Cinematographer',
    '2 Traditional Photographers',
    '2 Traditional Videographers',
    '1 Drone',
    '1 LED Wall',
    '1 Spot Mixing'
  ];

  const packagesToRender = hasActivePkgs ? activePkgs : [{
    package_name: `Default ${lead.event_type} Standard Package`,
    package_id: `default_${lead.lead_id}`,
    package_cost: lead.budget
  }];

  packagesToRender.forEach((pkg: any) => {
    const pkgKey = pkg.package_id || pkg.lead_package_id || 'default';
    
    // Resolve dynamic edited items or fallbacks
    const inclusionsList = (editableInclusions && editableInclusions[pkgKey]) || defaultInclusions;
    const deliverablesList = (editableDeliverables && editableDeliverables[pkgKey]) || defaultDeliverables;

    // Set font and style explicitly for title wrapping to avoid inheritance mismatch
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const titleLines = doc.splitTextToSize((pkg.package_name || '').toUpperCase(), 110);
    const titleHeight = Math.max(8, 4 + titleLines.length * 4.2);

    // Set font and style explicitly for inclusions & deliverables wrapping to avoid inheritance mismatch
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    // Compute fully wrapped inclusions and deliverables to prevent any overflow or boundary breaking
    const wrappedInclusions: string[] = [];
    inclusionsList.forEach(inc => {
      const lines = doc.splitTextToSize(inc, 74); // column width ~80 minus space indent padding
      lines.forEach((line, i) => {
        wrappedInclusions.push(i === 0 ? `✓  ${line}` : `    ${line}`);
      });
    });

    const wrappedDeliverables: string[] = [];
    deliverablesList.forEach(del => {
      const lines = doc.splitTextToSize(del, 74);
      lines.forEach((line, i) => {
        wrappedDeliverables.push(i === 0 ? `✓  ${line}` : `    ${line}`);
      });
    });

    const maxRows = Math.max(wrappedInclusions.length, wrappedDeliverables.length);
    const contentHeight = 12 + (maxRows * 4.2);
    const totalBoxHeight = titleHeight + contentHeight;

    // Rigid check to prevent any content or border overflowing onto footer (max height before footer is 250)
    if (currentY + totalBoxHeight > 250) {
      doc.addPage();
      currentY = 20; // reset to top gap on empty page
      doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
      doc.rect(0, 0, 210, 4, 'F'); // elegant top band
    }

    // Outer package layout container box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(15, currentY, 180, totalBoxHeight, 1.5, 1.5, 'FD');

    // Inside package header bar (Carbon Black)
    doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
    doc.rect(15, currentY, 180, titleHeight, 'F');

    // Left sidebar ribbon gold accent
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(15, currentY, 1.5, titleHeight, 'F');

    // Render wrapped Package Title lines
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    titleLines.forEach((line: string, lineIdx: number) => {
      doc.text(line, 19, currentY + 5.5 + (lineIdx * 4.2));
    });

    // Package Price (Align Right, vertically centered)
    doc.setFont('helvetica', 'bold');
    const priceStr = `Price: ₹ ${Number(pkg.package_cost).toLocaleString('en-IN')}`;
    doc.text(priceStr, 192, currentY + (titleHeight / 2) + 1.2, { align: 'right' });

    let detailsY = currentY + titleHeight + 4; // content rendering offset

    // INCLUSIONS (Left Column - fully aligned, wrapped inside bounds)
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PACKAGE INCLUDES:', 20, detailsY);

    wrappedInclusions.forEach((incLine: string, lineIdx: number) => {
      const isHeader = incLine.startsWith('✓');
      const yItem = detailsY + 5 + (lineIdx * 4.2);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      
      if (isHeader) {
        // Draw elegant circular bullet using shapes instead of questionable unicode characters
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.circle(21.5, yItem - 1.1, 0.7, 'F');
        doc.text(incLine.slice(2).trim(), 24, yItem);
      } else {
        doc.text(incLine.trim(), 24, yItem);
      }
    });

    // DELIVERABLES (Right Column - perfectly aligned, wrapped inside bounds)
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DELIVERABLES:', 110, detailsY);

    wrappedDeliverables.forEach((delLine: string, lineIdx: number) => {
      const isHeader = delLine.startsWith('✓');
      const yItem = detailsY + 5 + (lineIdx * 4.2);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      
      if (isHeader) {
        // Draw elegant amber/gold circular bullet using shapes
        doc.setFillColor(212, 175, 55); // goldColor/amber
        doc.circle(111.5, yItem - 1.1, 0.7, 'F');
        doc.text(delLine.slice(2).trim(), 114, yItem);
      } else {
        doc.text(delLine.trim(), 114, yItem);
      }
    });

    currentY += totalBoxHeight + 6; // gap below of cards
  });

  // 4. TERMS AND PRICING CONTAINER
  // Make sure we have enough space (at least 48mm) before drawing the bottom elements
  if (currentY + 48 > 250) {
    doc.addPage();
    currentY = 20;
    doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
    doc.rect(0, 0, 210, 4, 'F');
  }

  let blockY = currentY + 4;

  // Draw Left Container roundedRect for Terms & Conditions (Aligns beautifully in a clean enclosed box)
  doc.setFillColor(bgLightGrid[0], bgLightGrid[1], bgLightGrid[2]); // slate-50
  doc.roundedRect(15, blockY - 2, 92, 41, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.25);
  doc.roundedRect(15, blockY - 2, 92, 41, 1.5, 1.5, 'D');

  // Gold brand ribbon on the left of terms box
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(15, blockY - 2, 1.5, 41, 'F');

  // Terms title (fully aligned and nested)
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TERMS & CONDITIONS', 19, blockY + 3.5);

  const customTermsList = termsText.split('\n').map(t => t.trim()).filter(Boolean);
  const pdfTerms = customTermsList.length > 0 ? customTermsList : [
    'Booking subject to wedding / event date availability.',
    'Advance payment required for booking confirmation.',
    'Remaining balance to be cleared as per standard company timeline.',
    'Additional travel/accommodation charges may apply on actuals.',
    'Additional post-production editing requests might incur extra fee.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8); // elegant, high-profile tight legal text
  doc.setTextColor(100, 116, 139); // slate-500
  let termsOffset = blockY + 8.5;
  
  pdfTerms.forEach((term: string) => {
    const termLines = doc.splitTextToSize(term, 82);
    termLines.forEach((line: string, lineIdx: number) => {
      if (termsOffset < blockY + 37) { // keep it inside the 41mm height container safely
        if (lineIdx === 0) {
          // Draw a tiny amber list bullet
          doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
          doc.circle(20.5, termsOffset - 0.9, 0.5, 'F');
          doc.text(line, 22.5, termsOffset);
        } else {
          doc.text(line, 22.5, termsOffset);
        }
        termsOffset += 3.3;
      }
    });
  });

  // Draw Pricing Section (Right Column) with Dotted Rows
  doc.setFillColor(bgLightGrid[0], bgLightGrid[1], bgLightGrid[2]); // slate-50
  doc.rect(112, blockY - 2, 83, 41, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.25);
  doc.rect(112, blockY - 2, 83, 41, 'D');

  const subtotal = packagesToRender.reduce((acc, p) => acc + Number(p.package_cost), 0);
  const discount = discountValue;
  const additionalServices = additionalCharges;
  const tempSubVal = subtotal + additionalServices - discount;
  const gstValue = 0; // GST is custom or zero

  const drawPricingRow = (label: string, valueStr: string, yPos: number, isBold = false) => {
    const style = isBold ? 'bold' : 'normal';
    const size = isBold ? 8.5 : 7.5;
    
    // Set active font to measure correctly
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    
    // Replace Rupee sign with standard safe metric chars for exact printable measurement width calculations
    const cleanValueStr = valueStr.replace('₹', 'Rs.');
    
    const labelWidth = doc.getTextWidth(label);
    const valueWidth = doc.getTextWidth(cleanValueStr);
    
    // Left-aligned label
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(label, 115, yPos);
    
    // Right-aligned value
    if (isBold) {
      doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]); // Gold accent for final amounts
    } else {
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    }
    doc.text(valueStr, 192, yPos, { align: 'right' });

    // Dotted Leaders (measured and drawn in standard normal 7.5 font)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    
    // Re-measure with normal 7.5 for dot offset calculation
    const normalLabelW = doc.getTextWidth(label);
    const normalValueW = doc.getTextWidth(cleanValueStr);
    
    const dotStart = 115 + normalLabelW + 2;
    const dotEnd = 192 - normalValueW - 2;
    if (dotStart < dotEnd) {
      let dots = '';
      const dotCharW = doc.getTextWidth('.');
      let currW = dotStart;
      while (currW < dotEnd) {
        dots += '.';
        currW += dotCharW;
      }
      doc.text(dots, dotStart, yPos);
    }
  };

  let pricingOffset = blockY + 3;
  
  const formattedSubtotal = `₹ ${subtotal.toLocaleString('en-IN')}`;
  const formattedAddl = `₹ ${additionalServices.toLocaleString('en-IN')}`;
  const formattedDisc = `₹ ${discount.toLocaleString('en-IN')}`;
  const formattedSub = `₹ ${tempSubVal.toLocaleString('en-IN')}`;
  const formattedGST = `₹ 0`;
  const formattedGrand = `₹ ${tempSubVal.toLocaleString('en-IN')}`;

  drawPricingRow('Package Cost', formattedSubtotal, pricingOffset);
  pricingOffset += 4.5;
  drawPricingRow('Additional Services', formattedAddl, pricingOffset);
  pricingOffset += 4.5;
  drawPricingRow('Discount', formattedDisc, pricingOffset);
  pricingOffset += 4.5;
  
  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(115, pricingOffset + 1.2, 192, pricingOffset + 1.2);
  pricingOffset += 5.5;

  drawPricingRow('Sub Total', formattedSub, pricingOffset, true);
  pricingOffset += 4.5;
  drawPricingRow('GST (If Applicable)', formattedGST, pricingOffset);
  pricingOffset += 4.5;

  // Final Total highlight line
  doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.setLineWidth(0.25);
  doc.line(115, pricingOffset + 1.2, 192, pricingOffset + 1.2);
  pricingOffset += 5.5;
  
  drawPricingRow('Final Amount', formattedGrand, pricingOffset, true);

  // 5. FOOTER SECTION
  let footerY = 260;
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(15, footerY, 195, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('PHOTOCREW PICTURES', 15, footerY + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Website : https://www.photocrewpictures.com/  |  Email: info@photocrewpictures.com  |  Phone: +91 9060144016', 15, footerY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]); // Gold primary accent
  doc.text('Thank You For Choosing Photocrew Pictures', 15, footerY + 14);

  // Authorised Signatory right aligned
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('For Photocrew Pictures', 150, footerY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Authorized Signatory', 150, footerY + 12);

  // Bottom Accent ribbon
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, 292, 210, 5, 'F');

  return doc;
};


const highlightText = (text: string, search: string) => {
  if (!search.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-yellow-105 rounded px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};



interface SalesModuleProps {
  activeSubTab?: 'list' | 'create' | 'profiles' | 'packages' | 'calendar';
  setActiveSubTab?: (tab: 'list' | 'create' | 'profiles' | 'packages' | 'calendar') => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ activeSubTab: externalActiveTab, setActiveSubTab: externalSetActiveTab }) => {
  const { 
    currentRole, 
    leads, 
    leadPackages, 
    orders, 
    payments, 
    production, 
    addLead, 
    updateLeadFollowUp, 
    confirmOrder,
    packages,
    addPackage,
    updatePackage,
    deletePackage,
    quotations,
    addQuotation,
    updateQuotation,
    updateLead
  } = useRole();

  const [logoBase64, setLogoBase64] = useState<string>('');

  React.useEffect(() => {
    const preloadLogo = async () => {
      try {
        const response = await fetch('https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/logo.png');
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setLogoBase64(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        }
      } catch (err) {
        // Fall back to loader with canvas
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            try {
              const dataUrl = canvas.toDataURL('image/png');
              setLogoBase64(dataUrl);
            } catch (e) {
              console.warn('Canvas toDataURL failed:', e);
            }
          }
        };
        img.src = 'https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/logo.png';
      }
    };
    preloadLogo();
  }, []);

  // Role permissions gate
  const canEdit = currentRole === 'Sales Team' || currentRole === 'Business Owner';

  // Toggle modes
  const [internalTab, setInternalTab] = useState<'list' | 'create' | 'profiles' | 'packages' | 'calendar'>('list');
  const activeTab = externalActiveTab || internalTab;
  const setActiveTab = externalSetActiveTab || setInternalTab;

  // Leads export report handlers
  const handleDownloadCSV = () => {
    const headers = ["Lead ID", "Order ID", "Customer Name", "Mobile Number", "Event Type", "Event Date", "Current Stage", "Current Status", "Payment Status", "Created Date"];
    const rows = filteredLeads.map(l => {
      const ord = orders.find(o => o.lead_id === l.lead_id);
      const pay = ord ? payments?.find(p => p.order_id === ord.order_id) : null;
      return [
        l.lead_id,
        ord?.order_id || 'N/A',
        l.customer_name,
        l.mobile,
        l.event_type,
        l.event_date || 'N/A',
        l.status,
        l.remarks.slice(0, 50).replace(/["\n\r]/g, ' '),
        pay ? pay.payment_status : 'Pending',
        l.created_date
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Leads_Report_${appliedStartDate || 'all'}_to_${appliedEndDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcel = () => {
    const headers = ["Lead ID", "Order ID", "Customer Name", "Mobile Number", "Event Type", "Event Date", "Current Stage", "Current Status", "Payment Status", "Created Date"];
    const rows = filteredLeads.map(l => {
      const ord = orders.find(o => o.lead_id === l.lead_id);
      const pay = ord ? payments?.find(p => p.order_id === ord.order_id) : null;
      return [
        l.lead_id,
        ord?.order_id || 'N/A',
        l.customer_name,
        l.mobile,
        l.event_type,
        l.event_date || 'N/A',
        l.status,
        l.remarks.slice(0, 50).replace(/["\t\n\r]/g, ' '),
        pay ? pay.payment_status : 'Pending',
        l.created_date
      ];
    });
    
    // Generate standard TSV structure compatible with native Excel import
    const content = [headers.join("\t"), ...rows.map(e => e.join("\t"))].join("\n");
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Leads_Report_${appliedStartDate || 'all'}_to_${appliedEndDate || 'all'}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rowsHtml = filteredLeads.map(l => {
      const ord = orders.find(o => o.lead_id === l.lead_id);
      const pay = ord ? payments?.find(p => p.order_id === ord.order_id) : null;
      return `
        <tr>
          <td>${l.lead_id}</td>
          <td>${ord?.order_id || 'N/A'}</td>
          <td>${l.customer_name}</td>
          <td>${l.mobile}</td>
          <td>${l.event_type}</td>
          <td>${l.event_date || 'N/A'}</td>
          <td>${l.status}</td>
          <td>${l.created_date}</td>
          <td>${pay ? pay.payment_status : 'Pending'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Leads Directory Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; margin-bottom: 5px; color: #111; text-transform: uppercase; letter-spacing: 1px; }
            p { font-size: 11px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>LEADS DIRECTORY REPORT</h1>
          <p>Generated on ${new Date().toLocaleString('en-IN')} | Date Range: ${appliedStartDate || 'All'} to ${appliedEndDate || 'All'} | Records Count: ${filteredLeads.length}</p>
          <table>
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Event Type</th>
                <th>Event Date</th>
                <th>Current Status</th>
                <th>Created Date</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Confidential Systems Report | ERP Sales Desk</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Package Management States
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [viewingPkgDetails, setViewingPkgDetails] = useState<any | null>(null);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pkgForm, setPkgForm] = useState({
    package_name: '',
    category: 'Wedding',
    price: 0,
    status: 'Active' as 'Active' | 'Inactive',
    deliverables: '',
    team_members: '',
    seasonal_offer: '',
    terms_conditions: '',
    event_type: '',
    duration: '',
    package_includes: ''
  });
  const [customCategory, setCustomCategory] = useState('');
  const [isComparingPkgs, setIsComparingPkgs] = useState(false);

  // Group active packages directly loaded from Supabase!
  const categoriesList = React.useMemo(() => {
    const rawCats = Array.from(new Set((packages || []).map((p) => p.category)));
    const defaults = [
      'Wedding',
      'Engagement',
      'House Warming',
      'Maternity',
      'Baby Shower',
      'Birthday',
      'Naming Ceremony',
      'Anniversary',
      'Pre-Wedding',
      'Interior Shoot',
      'Product Shoot',
      'Car/Bike Shoot',
      'Wedding Packages',
      'Premium Wedding Packages',
      'House Warming Packages',
      'Engagement Packages',
      'Anniversary Packages',
      'Naming Ceremony Packages',
      'Maternity Shoot Packages',
      'Baby Shower Packages',
      'Baby Shoot Packages',
      'Car / Bike Shoot Packages',
      'Pre-Wedding Packages',
      'Interior Shoot',
      'Product Photography'
    ];
    defaults.forEach(c => {
      if (!rawCats.includes(c)) rawCats.push(c);
    });
    return rawCats.sort();
  }, [packages]);

  const PACKAGES_LIST = categoriesList.map((cat) => ({
    categoryName: cat,
    items: (packages || [])
      .filter((p) => p.category === cat && p.status === 'Active')
      .map((p) => ({
        id: p.package_id,
        name: p.package_name,
        cost: p.price,
        deliverables: p.deliverables || 'N/A',
        team_members: p.team_members || 'N/A',
        seasonal_offer: p.seasonal_offer || 'None'
      }))
  }));
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Repeat Customer / Reorder System states
  const [detectedCustomer, setDetectedCustomer] = useState<any>(null);
  const [showDetectionPopup, setShowDetectionPopup] = useState(false);
  const [isQuickReorderView, setIsQuickReorderView] = useState(false);
  
  // Custom states for configuring quick reorder
  const [reorderForm, setReorderForm] = useState({
    event_type: 'Pre-Wedding Shoot',
    event_date: '',
    event_time: '12:00',
    event_location: '',
    package_name: 'Premium Pre-Wedding Special Pack',
    quotation_amount: 45000,
    advance_received: 15000,
  });

  // Customer Profiles sub-tab states
  const [selectedCustomerProfileId, setSelectedCustomerProfileId] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Filter States
  const [filterQuery, setFilterQuery] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSalesPerson, setFilterSalesPerson] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  // Extra state for "Other" lead source name input
  const [otherSource, setOtherSource] = useState('');

  // Screen 2 Form State
  const [createForm, setCreateForm] = useState({
    customer_name: '',
    mobile: '+91 ',
    alternate_mobile: '+91 ',
    email: '',
    lead_source: 'Website Form',
    event_type: 'Wedding Shoot',
    event_date: '',
    event_time: '12:00',
    event_location: '',
    budget: 35000,
    remarks: '',
  });

  // Packages creation hooks
  const [selectedPkgIds, setSelectedPkgIds] = useState<string[]>([]);
  const [leadDiscount, setLeadDiscount] = useState<number>(0);
  const [isPkgDropdownOpen, setIsPkgDropdownOpen] = useState(false);
  const [pkgSearchQuery, setPkgSearchQuery] = useState('');

  // Auto calculate and sync with createForm.budget
  const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
  const subtotal = selectedPkgs.reduce((sum, item) => sum + item.cost, 0);
  const finalTotal = subtotal - leadDiscount;

  React.useEffect(() => {
    // Only auto-override if packages are actively selected
    if (selectedPkgIds.length > 0) {
      setCreateForm(prev => ({
        ...prev,
        budget: finalTotal
      }));
    }
  }, [finalTotal, selectedPkgIds]);

  // Body scroll lock effect when Create Lead modal is open
  React.useEffect(() => {
    if (activeTab === 'create') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeTab]);

  // Screen 3 Follow-Up Form State
  const [followUpForm, setFollowUpForm] = useState({
    call_notes: '',
    next_follow_up_date: '',
    status: 'Follow Up' as CurrentStage,
    quotation_amount: 3500,
    negotiation_notes: '',
    event_date: '',
    event_time: '',
    reporting_time: '08:00',
    advance_received: 0,
    payment_mode: 'UPI',
  });

  // Confirm Order Form State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmForm, setConfirmForm] = useState({
    package_name: 'Luxury Cinematic Bundle',
    quotation_amount: 3500,
    advance_received: 1000,
    event_date: '',
    event_time: '',
    payment_mode: 'UPI',
    notes: '',
  });

  // Quotation System State
  const [quotationTerms, setQuotationTerms] = useState(
    "1. 50% advance payment required to confirm event booking.\n" +
    "2. Remaining 50% balance must be cleared upon raw footage delivery.\n" +
    "3. Videos will be hosted on Photocrew Cloud storage for 90 days.\n" +
    "4. Extra shoot hours are billed at ₹5,000/hr.\n" +
    "5. Delivery of final edits: 15-20 business days."
  );
  const [generatedPDFBlobUrl, setGeneratedPDFBlobUrl] = useState<string>('');
  const [activeQuoteNum, setActiveQuoteNum] = useState<string>('');

  // Customizable inclusions, deliverables, discount, and additional charges states
  const [editableInclusions, setEditableInclusions] = useState<Record<string, string[]>>({});
  const [editableDeliverables, setEditableDeliverables] = useState<Record<string, string[]>>({});
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteAdditional, setQuoteAdditional] = useState<number>(0);

  const handleEditInclusion = (pkgKey: string, index: number, value: string) => {
    setEditableInclusions(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list[index] = value;
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleRemoveInclusion = (pkgKey: string, index: number) => {
    setEditableInclusions(prev => {
      const list = prev[pkgKey] ? prev[pkgKey].filter((_, i) => i !== index) : [];
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleAddInclusion = (pkgKey: string, value: string) => {
    if (!value.trim()) return;
    setEditableInclusions(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list.push(value.trim());
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleEditDeliverable = (pkgKey: string, index: number, value: string) => {
    setEditableDeliverables(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list[index] = value;
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleRemoveDeliverable = (pkgKey: string, index: number) => {
    setEditableDeliverables(prev => {
      const list = prev[pkgKey] ? prev[pkgKey].filter((_, i) => i !== index) : [];
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleAddDeliverable = (pkgKey: string, value: string) => {
    if (!value.trim()) return;
    setEditableDeliverables(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list.push(value.trim());
      return { ...prev, [pkgKey]: list };
    });
  };

  // Auto-initialize spec editor state when selecting a lead
  React.useEffect(() => {
    if (!selectedLead) {
      setEditableInclusions({});
      setEditableDeliverables({});
      return;
    }

    const activePackages = (leadPackages || []).filter(lp => lp.lead_id === selectedLead.lead_id);
    const hasActivePkgs = activePackages.length > 0;

    const newInclusions = { ...editableInclusions };
    const newDeliverables = { ...editableDeliverables };
    let changed = false;

    if (!hasActivePkgs) {
      const defaultId = `default_${selectedLead.lead_id}`;
      if (!newInclusions[defaultId]) {
        newInclusions[defaultId] = [
          '1 Candid Photographer',
          '1 Cinematographer',
          '2 Traditional Photographers',
          '2 Traditional Videographers',
          '1 Drone',
          '1 LED Wall',
          '1 Spot Mixing'
        ];
        newDeliverables[defaultId] = [
          '350 Edited Photos',
          '4K Cinematic Video',
          '3 Reels',
          'Traditional Edited Video',
          'Album Details',
          'Additional Deliverables'
        ];
        changed = true;
      }
    } else {
      activePackages.forEach((lp) => {
        const pkgKey = lp.package_id || lp.lead_package_id || 'default';
        if (!newInclusions[pkgKey]) {
          const pObj = (packages || []).find(p => p.package_id === lp.package_id);
          const incStr = pObj?.team_members || lp.team_members || '';
          const delStr = pObj?.deliverables || lp.deliverables || '';

          newInclusions[pkgKey] = incStr
            ? incStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
            : [
                '1 Candid Photographer',
                '1 Cinematographer',
                '2 Traditional Photographers',
                '2 Traditional Videographers',
                '1 Drone',
                '1 LED Wall',
                '1 Spot Mixing'
              ];

          newDeliverables[pkgKey] = delStr
            ? delStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
            : [
                '350 Edited Photos',
                '4K Cinematic Video',
                '3 Reels',
                'Traditional Edited Video',
                'Album Details',
                'Additional Deliverables'
              ];
          changed = true;
        }
      });
    }

    if (changed) {
      setEditableInclusions(newInclusions);
      setEditableDeliverables(newDeliverables);
    }
  }, [selectedLead, leadPackages, packages]);

  // Handle lead select
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setGeneratedPDFBlobUrl('');
    setActiveQuoteNum('');
    setQuoteDiscount(0);
    setQuoteAdditional(0);
    // Explicitly reset on new lead selection
    setEditableInclusions({});
    setEditableDeliverables({});

    setFollowUpForm({
      call_notes: '',
      next_follow_up_date: '',
      status: lead.status,
      quotation_amount: lead.budget,
      negotiation_notes: '',
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      reporting_time: lead.reporting_time || '08:00',
      advance_received: Math.round(lead.budget / 3),
      payment_mode: 'UPI',
    });
    setConfirmForm({
      package_name: lead.event_type + ' Premium Package',
      quotation_amount: lead.budget,
      advance_received: Math.round(lead.budget / 3),
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      payment_mode: 'UPI',
      notes: '',
    });
  };

  // On-change/blur handler for phone/email inputs to detect repeat customers
  const handleCheckExistingCustomer = (type: 'phone' | 'email', value: string) => {
    if (!value || value.length < 5) return;
    const parsedCustomers = getCustomers(leads, orders, payments || []);
    
    const matched = parsedCustomers.find(c => {
      if (type === 'phone') {
        const cleanInput = value.replace(/[^\d]/g, '').slice(-10);
        if (!cleanInput || cleanInput.length < 10) return false;
        const cleanMobile = c.mobile.replace(/[^\d]/g, '').slice(-10);
        const cleanAlt = c.alternate_mobile?.replace(/[^\d]/g, '').slice(-10);
        return cleanInput === cleanMobile || (cleanAlt && cleanInput === cleanAlt);
      } else {
        const cleanInput = value.trim().toLowerCase();
        if (!cleanInput.includes('@')) return false;
        return c.email && c.email.trim().toLowerCase() === cleanInput;
      }
    });

    if (matched) {
      setDetectedCustomer(matched);
      setShowDetectionPopup(true);
    }
  };

  // Handle repeat bookings (Pre-fills customized data and issues a Lead AND dynamic Order immediately)
  const handleExecuteQuickReorder = (cust: any) => {
    if (!reorderForm.event_date) {
      alert('Please specify the event date for the repeat customer booking.');
      return;
    }

    const newLeadId = addLead({
      customer_name: cust.customer_name,
      mobile: cust.mobile,
      alternate_mobile: cust.alternate_mobile || undefined,
      email: cust.email,
      lead_source: 'Repeat Customer Desk',
      event_type: reorderForm.event_type,
      event_date: reorderForm.event_date,
      event_time: reorderForm.event_time,
      event_location: reorderForm.event_location,
      budget: Number(reorderForm.quotation_amount),
      remarks: `Dynamic Repeat reservation. [CUST_ID: ${cust.customer_id}]`
    });

    const newOrderId = confirmOrder(
      newLeadId,
      reorderForm.package_name,
      Number(reorderForm.quotation_amount),
      Number(reorderForm.advance_received)
    );

    alert(`Success! Repeat booking completed.\nNew Lead ID: ${newLeadId}\nNew Order ID: ${newOrderId}\nSame Customer ID: ${cust.customer_id}`);

    // Reset forms and view
    setShowDetectionPopup(false);
    setIsQuickReorderView(false);
    setDetectedCustomer(null);
    setReorderForm({
      event_type: 'Pre-Wedding Shoot',
      event_date: '',
      event_time: '12:00',
      event_location: '',
      package_name: 'Premium Pre-Wedding Special Pack',
      quotation_amount: 45000,
      advance_received: 15000,
    });
    setActiveTab('list');
  };

  // Handle lead creation
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customer_name || !createForm.mobile) {
      alert('Required fields (Customer Name and Mobile Number) must be completed.');
      return;
    }

    // Validate email if entered
    if (createForm.email && createForm.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createForm.email.trim())) {
        alert('Please enter a valid email address.');
        return;
      }
    }

    // Validate Indian mobile numbers
    if (!validateIndianMobile(createForm.mobile)) {
      alert('Please enter a valid Indian mobile number starting with 6, 7, 8, or 9 (10 digits).');
      return;
    }
    if (createForm.alternate_mobile && createForm.alternate_mobile.trim() !== '' && createForm.alternate_mobile.trim() !== '+91' && !validateIndianMobile(createForm.alternate_mobile)) {
      alert('Please enter a valid alternate Indian mobile number starting with 6, 7, 8, or 9 (10 digits).');
      return;
    }

    const finalSource = createForm.lead_source === 'Other' ? (otherSource ? `Other: ${otherSource}` : 'Other') : createForm.lead_source;

    const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
    const subtotal = selectedPkgs.reduce((sum, item) => sum + item.cost, 0);
    const finalTotal = subtotal - leadDiscount;

    const packagesPayload = selectedPkgs.map(pkg => ({
      package_id: pkg.id,
      package_name: pkg.name,
      package_cost: pkg.cost,
      quantity: 1,
      total_amount: subtotal,
      discount: leadDiscount,
      final_amount: finalTotal
    }));

    const newId = addLead({
      customer_name: createForm.customer_name,
      mobile: createForm.mobile,
      alternate_mobile: (createForm.alternate_mobile && createForm.alternate_mobile.trim() !== '' && createForm.alternate_mobile.trim() !== '+91') ? createForm.alternate_mobile : undefined,
      email: createForm.email,
      lead_source: finalSource,
      event_type: createForm.event_type,
      event_date: createForm.event_date || new Date().toISOString().split('T')[0],
      event_time: createForm.event_time,
      event_location: createForm.event_location,
      budget: selectedPkgIds.length > 0 ? finalTotal : Number(createForm.budget),
      remarks: createForm.remarks,
    }, packagesPayload);

    setCreateForm({
      customer_name: '',
      mobile: '+91 ',
      alternate_mobile: '+91 ',
      email: '',
      lead_source: 'Website Form',
      event_type: 'Wedding Shoot',
      event_date: '',
      event_time: '12:00',
      event_location: '',
      budget: 35000,
      remarks: '',
    });
    setOtherSource('');
    setSelectedPkgIds([]);
    setLeadDiscount(0);
    setIsPkgDropdownOpen(false);

    setActiveTab('list');
    alert(`Lead created with ID: ${newId}`);
  };

  // Handle follow up submit
  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    if (followUpForm.status === 'Order Confirmed') {
      if (!followUpForm.event_date || !followUpForm.event_time || !followUpForm.reporting_time) {
        alert('Do not allow Order Confirmed without Event Date, Event Time, and Reporting Time.');
        return;
      }

      const orderId = confirmOrder(
        selectedLead.lead_id,
        selectedLead.event_type + ' Premium Package',
        Number(followUpForm.quotation_amount),
        Number(followUpForm.advance_received),
        followUpForm.event_date,
        followUpForm.event_time,
        followUpForm.payment_mode,
        followUpForm.call_notes || 'Confirmed from CRM activity logger',
        followUpForm.reporting_time
      );

      setSelectedLead(null);
      alert(`Lead Successfully Converted! Order Contract Generated: ${orderId}`);
      return;
    }

    if (!followUpForm.call_notes) {
      alert('Please fill in some Call Notes to update lead follow-up.');
      return;
    }

    updateLeadFollowUp(
      selectedLead.lead_id,
      followUpForm.status,
      followUpForm.call_notes,
      followUpForm.next_follow_up_date || new Date().toISOString().split('T')[0],
      Number(followUpForm.quotation_amount),
      followUpForm.negotiation_notes
    );

    // Refresh selected lead state
    setSelectedLead((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: followUpForm.status,
        budget: Number(followUpForm.quotation_amount),
      };
    });

    // Clear follow up text
    setFollowUpForm(prev => ({ ...prev, call_notes: '', negotiation_notes: '' }));
    alert('Follow-up activity recorded.');
  };

  // Handle Order Confirmation Process
  const handleConfirmOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    // Validation – enforce Event Date is confirmed
    if (!confirmForm.event_date || confirmForm.event_date.trim() === '') {
      alert("Event date is required before confirming booking.");
      
      // Automatically keep status as 'Follow Up' (which represents Follow Up Required)
      updateLeadFollowUp(
        selectedLead.lead_id,
        'Follow Up',
        'Attempted booking but event date was not confirmed.',
        new Date().toISOString().split('T')[0],
        Number(confirmForm.quotation_amount) || selectedLead.budget,
        'Booking failed due to missing event date.'
      );

      setSelectedLead((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'Follow Up',
        };
      });

      // Reset follow up form choice
      setFollowUpForm(prev => ({
        ...prev,
        status: 'Follow Up'
      }));

      setShowConfirmModal(false);
      return;
    }

    const orderId = confirmOrder(
      selectedLead.lead_id,
      confirmForm.package_name,
      Number(confirmForm.quotation_amount),
      Number(confirmForm.advance_received),
      confirmForm.event_date,
      confirmForm.event_time,
      confirmForm.payment_mode,
      confirmForm.notes
    );

    setShowConfirmModal(false);
    setSelectedLead(null);
    alert(`Lead Successfully Converted! Order Contract Generated: ${orderId}`);
  };

  // Companion lead metadata parse
  const getFollowUpDate = (remarks?: string) => {
    if (!remarks) return null;
    const match = remarks.match(/Next follow-up:\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const todayStr = '2026-06-10';

  const statNewLeads = leads.filter(l => l.status === 'New Lead').length;
  const statTodayFollowups = leads.filter(l => l.status === 'Follow Up' && getFollowUpDate(l.remarks) === todayStr).length;
  const statOverdueFollowups = leads.filter(l => {
    if (l.status !== 'Follow Up') return false;
    const fDate = getFollowUpDate(l.remarks);
    return fDate ? fDate < todayStr : false;
  }).length;
  const statQuotesSent = leads.filter(l => l.status === 'Quotation Sent').length;
  const statNegotiations = leads.filter(l => l.status === 'Negotiation').length;
  const statConfirmedOrders = leads.filter(l => l.status === 'Order Confirmed').length;

  // Filter Leads List
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.customer_name.toLowerCase().includes(filterQuery.toLowerCase()) || 
      lead.lead_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      lead.mobile.includes(filterQuery);

    const matchesSource = filterSource === '' || lead.lead_source === filterSource;
    const matchesStatus = filterStatus === '' 
      ? true 
      : filterStatus === 'Overdue' 
        ? (() => {
            if (lead.status !== 'Follow Up') return false;
            const fDate = getFollowUpDate(lead.remarks);
            return fDate ? fDate < todayStr : false;
          })()
        : lead.status === filterStatus;
    const matchesSales = filterSalesPerson === '' || lead.sales_person === filterSalesPerson;
    const matchesDate = filterDate === '' || lead.event_date === filterDate;

    let matchesDateRange = true;
    if (appliedStartDate) {
      matchesDateRange = matchesDateRange && (lead.created_date >= appliedStartDate);
    }
    if (appliedEndDate) {
      matchesDateRange = matchesDateRange && (lead.created_date <= appliedEndDate);
    }

    return matchesSearch && matchesSource && matchesStatus && matchesSales && matchesDate && matchesDateRange;
  });

  return (
    <div id="sales_module" className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono rounded tracking-widest">SALES</span>
            <span>Sales & Lead Desk</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Collect potential inbound queries, log CRM call reports, propose quotations and confirm contracts.
          </p>
        </div>

        {/* Create and Tabs Controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn_lead_tab_profiles"
            onClick={() => { setActiveTab('profiles'); setSelectedLead(null); setSelectedCustomerProfileId(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              activeTab === 'profiles'
                ? 'bg-zinc-900 border-zinc-750 text-white font-black hover:border-zinc-700'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            👥 Customer Profiles
          </button>

          <button
            id="btn_lead_tab_calendar"
            onClick={() => { setActiveTab('calendar'); setSelectedLead(null); setSelectedCustomerProfileId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-zinc-900 border-zinc-750 text-white font-black hover:border-zinc-700'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-zinc-405 group-hover:text-zinc-200" />
            <span>Sales Calendar</span>
          </button>
          
          {canEdit ? (
            <button
              id="btn_lead_create_flag"
              onClick={() => { setActiveTab('create'); setSelectedLead(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all ${
                activeTab === 'create'
                  ? 'bg-emerald-600 hover:bg-emerald-505 text-white'
                  : 'bg-emerald-500/10 hover:bg-emerald-600/20 text-emerald-450 border border-emerald-500/25'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Lead</span>
            </button>
          ) : (
            <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2.5 py-1 flex items-center gap-1.5" title="You are restricted from adding leads in this role.">
              <Ban className="w-3 h-3" />
              <span>Sales Access Blocked</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Sandbox Area */}
      {false && selectedLead && (
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A: Lead Details & Meta */}
          <div className="lg:col-span-4 bg-slate-850 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded font-black border border-slate-700">
                  {selectedLead.lead_id}
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-2">{selectedLead.customer_name}</h3>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-450 hover:text-slate-250 text-xs rounded transition-all cursor-pointer text-slate-400"
              >
                Close Back
              </button>
            </div>

            {/* Informational Items */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-350">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="font-mono text-slate-200">{formatIndianPhoneNumber(selectedLead.mobile)}</span>
              </div>
              {selectedLead.alternate_mobile && (
                <div className="flex items-center gap-2.5 text-slate-350">
                  <Phone className="w-4 h-4 text-slate-505 flex-shrink-0" />
                  <span>Alt: <span className="font-mono text-slate-200">{formatIndianPhoneNumber(selectedLead.alternate_mobile)}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-slate-350">
                <Mail className="w-4 h-4 text-slate-505 flex-shrink-0" />
                <span className="text-slate-200 truncate">{selectedLead.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-350">
                <MapPin className="w-4 h-4 text-slate-505 flex-shrink-0" />
                <span className="text-slate-200">{selectedLead.event_location}</span>
              </div>
            </div>

            {/* Detailed Parameters */}
            <div className="border-t border-slate-800 pt-3.5 grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block">Shoot Type</span>
                <strong className="text-slate-200 font-medium">{selectedLead.event_type}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Lead Source</span>
                <strong className="text-slate-200 font-medium">{selectedLead.lead_source}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Date Scheduled</span>
                <strong className="text-slate-200 font-medium">{selectedLead.event_date} @ {formatTime12Hour(selectedLead.event_time)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Current Budget</span>
                <strong className="text-amber-400 font-extrabold font-mono">{formatINR(selectedLead.budget)}</strong>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 text-[11px]">
              <span className="text-slate-500 block mb-1">Remarks & Audits</span>
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 font-mono text-[10px] text-slate-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {selectedLead.remarks || 'No remarks recorded.'}
              </div>
            </div>

            {/* Action Area: Convert Lead */}
            {canEdit && (
              <div className="border-t border-slate-800 pt-4">
                <button
                  id="btn_confirm_order"
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950/20 text-xs transition-all cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>CONFIRM ORDER CONTRACT</span>
                </button>
              </div>
            )}
          </div>

          {/* Column B: Follow-up Activity Logger */}
          <div className="lg:col-span-8 bg-slate-850 rounded-xl border border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 pb-2.5 border-b border-slate-800 mb-4">
              <span>📝</span> Log Lead Follow-up activity & CRM notes
            </h3>

            {canEdit ? (
              <form onSubmit={handleFollowUpSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                  {/* Status Options */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Transition ERP Stage *
                    </label>
                    <select
                      value={followUpForm.status}
                      onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value as CurrentStage })}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Follow Up">Follow Up</option>
                      <option value="Quotation Sent">Quotation Sent</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Order Confirmed">Order Confirmed</option>
                    </select>
                  </div>
                </div>

                {followUpForm.status === 'Order Confirmed' ? (
                  <div className="space-y-4 pt-2 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Configure Confirmed Order Settings</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Event Date * (Required)
                        </label>
                        <input
                          type="date"
                          required
                          value={followUpForm.event_date}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, event_date: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Event Time * (Required)
                        </label>
                        <input
                          type="time"
                          required
                          value={followUpForm.event_time}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, event_time: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Reporting Time * (Required)
                        </label>
                        <input
                          type="time"
                          required
                          value={followUpForm.reporting_time}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, reporting_time: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Final Amount (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          value={followUpForm.quotation_amount}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, quotation_amount: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Advance Amount Received (₹)
                        </label>
                        <input
                          type="number"
                          value={followUpForm.advance_received}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, advance_received: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Payment Mode
                        </label>
                        <select
                          value={followUpForm.payment_mode}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, payment_mode: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="UPI">UPI (GPay/PhonePe)</option>
                          <option value="Cash">Cash Handover</option>
                          <option value="Bank Transfer">Bank NFT/RTGS/IMPS</option>
                          <option value="Card">Credit/Debit Card</option>
                          <option value="Cheque">Cheque Deposit</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Next Date */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Next Follow-up Action Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={followUpForm.next_follow_up_date}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_date: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>

                      {/* Proposed budget */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Negotiated Quotation Amount (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          value={followUpForm.quotation_amount}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, quotation_amount: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Call reports */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Call / Conversation Notes *
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Log exact customer concerns, desired outputs, specific package selections, or callbacks."
                        value={followUpForm.call_notes}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, call_notes: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      ></textarea>
                    </div>

                    {/* Negotiation notes */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Negotiation Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Specific price offsets, discount justifications, extra features offered..."
                        value={followUpForm.negotiation_notes}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, negotiation_notes: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition-all cursor-pointer"
                  >
                    Discard Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-650 hover:bg-indigo-550 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    {followUpForm.status === 'Order Confirmed' ? '💍 Confirm Order booking' : 'Save Follow-up Notes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                <Ban className="w-10 h-10 text-slate-650 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-350">Access Restrictions Active</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Only the **Sales Team** or the **Business Owner** possess authorized write clearances to log client interaction updates. Keep testing with another persona.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Sandbox Area & Mobile Base view */}
      <div className="space-y-6">
        {activeTab === 'calendar' ? (
          <SalesCalendar />
        ) : activeTab === 'profiles' ? (
          /* NEW SCREEN: Customer Profiles & History Timeline sub-tab */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Accounts Directory / Ledger */}
            <div className="lg:col-span-4 bg-slate-850 rounded-xl border border-slate-800 p-4 space-y-4 text-left">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-mono">
                  <span>👥</span> CLIENT ACCOUNTS ({getCustomers(leads, orders, payments).length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Unified customer profiles compiled via CRM phone & email graphs.
                </p>
              </div>

              {/* Search Customer Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, phone, email..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                {customerSearchQuery && (
                  <button 
                    onClick={() => setCustomerSearchQuery('')} 
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Roster List */}
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {(() => {
                  const items = getCustomers(leads, orders, payments);
                  const filtered = items.filter(c => 
                    c.customer_name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.customer_id.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.mobile.includes(customerSearchQuery)
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No clients match your query.
                      </div>
                    );
                  }

                  return filtered.map((cust) => {
                    const isSelected = selectedCustomerProfileId === cust.customer_id;
                    return (
                      <div
                        key={cust.customer_id}
                        onClick={() => {
                          setSelectedCustomerProfileId(cust.customer_id);
                          setIsQuickReorderView(false);
                        }}
                        className={`p-3 rounded-xl border transition-all text-left cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600/10 border-indigo-500/40 shadow-sm shadow-indigo-505/10' 
                            : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-slate-800 border border-slate-700 text-amber-500/90 px-2 py-0.5 rounded font-mono font-bold">
                            {cust.customer_id}
                          </span>
                          {cust.totalOrders >= 2 && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-black uppercase">
                              🔥 REPEAT ({cust.totalOrders})
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-xs font-black text-slate-100 mt-2 font-sans truncate">
                          {cust.customer_name}
                        </h4>
                        
                        <div className="text-[10px] text-slate-400 font-mono mt-1 space-y-0.5">
                          <div className="truncate">{cust.email}</div>
                          <div>{formatIndianPhoneNumber(cust.mobile)}</div>
                        </div>

                        <div className="border-t border-slate-800/60 mt-2.5 pt-2 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Total CLV:</span>
                          <strong className="text-emerald-450 font-bold font-mono">{formatINR(cust.totalRevenue)}</strong>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Column: In-depth Timeline & Historiography Ledger */}
            <div className="lg:col-span-8 bg-slate-850 rounded-xl border border-slate-800 p-5 space-y-6 text-left">
              {(() => {
                const list = getCustomers(leads, orders, payments);
                // default to first customer if none is explicitly clicked
                const currentProfileId = selectedCustomerProfileId || (list.length > 0 ? list[0].customer_id : null);
                const cust = list.find(c => c.customer_id === currentProfileId);

                if (!cust) {
                  return (
                    <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                      <h4 className="text-sm font-semibold text-slate-400">Select customer profile</h4>
                      <p className="text-xs text-slate-505">Pick any client from the directory to review lifetime timeline history.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6 animate-fade-in text-slate-200">
                    {/* Header profile details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-slate-900 border border-slate-750 font-mono text-amber-500 px-2.5 py-0.5 rounded font-black font-mono">
                            {cust.customer_id}
                          </span>
                          {cust.totalOrders >= 2 && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-black">
                              LOYAL RETIRED BUYER COHORT
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-black text-white mt-1.5">{cust.customer_name}</h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 font-mono text-[10px] mt-1.5">
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-indigo-400" /> {cust.email}</span>
                          <span className="text-slate-800">|</span>
                          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-400" /> {formatIndianPhoneNumber(cust.mobile)}</span>
                          {cust.alternate_mobile && (
                            <>
                              <span className="text-slate-800">|</span>
                              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-zinc-500" /> Alt: {formatIndianPhoneNumber(cust.alternate_mobile)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsQuickReorderView(!isQuickReorderView);
                            // Set event date default to next month
                            const defaultReorderDate = new Date();
                            defaultReorderDate.setMonth(defaultReorderDate.getMonth() + 1);
                            setReorderForm(prev => ({
                              ...prev,
                              event_date: defaultReorderDate.toISOString().split('T')[0]
                            }));
                          }}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-650 to-indigo-750 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-lg transition-all cursor-pointer font-sans"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isQuickReorderView ? "Close Reorder Desk" : "Create New Reorder"}</span>
                        </button>
                      )}
                    </div>

                    {/* Quick Reorder Config Section */}
                    {isQuickReorderView && (
                      <div className="bg-slate-900 border border-indigo-500/20 p-4 rounded-xl space-y-4 animate-fade-in-up">
                        <div className="border-b border-slate-800 pb-2">
                          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono">
                            ✍️ CONFIGURE REPEAT SHOOT CONTRACT
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Book a new independent contract project. This generates a new Lead and verified Order ID, keeping customer ID intact.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Event Shoot Type</label>
                            <select
                              value={reorderForm.event_type}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_type: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                            >
                              <option value="Wedding Shoot">Wedding Shoot</option>
                              <option value="Destination Wedding">Destination Wedding</option>
                              <option value="Pre-Wedding Shoot">Pre-Wedding Shoot</option>
                              <option value="Corporate Event">Corporate Event</option>
                              <option value="Real Estate Reel">Real Estate Reel</option>
                              <option value="Fashion Portfolio">Fashion Portfolio</option>
                              <option value="Music Video Launch">Music Video Launch</option>
                              <option value="Birthday Banquet">Birthday Banquet</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Shoot Date *</label>
                            <input
                              type="date"
                              required
                              value={reorderForm.event_date}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_date: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Execution Location</label>
                            <input
                              type="text"
                              placeholder="e.g. Grand Hyatt, Goa"
                              value={reorderForm.event_location}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_location: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Package Designation</label>
                            <input
                              type="text"
                              placeholder="e.g. Royal Gold Cinema"
                              value={reorderForm.package_name}
                              onChange={(e) => setReorderForm({ ...reorderForm, package_name: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-440 mb-1">Quotation Contract Sum (₹)</label>
                            <input
                              type="number"
                              value={reorderForm.quotation_amount}
                              onChange={(e) => setReorderForm({ ...reorderForm, quotation_amount: Number(e.target.value), advance_received: Math.round(Number(e.target.value)/3) })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-440 mb-1">Advance Deposited (₹)</label>
                            <input
                              type="number"
                              value={reorderForm.advance_received}
                              onChange={(e) => setReorderForm({ ...reorderForm, advance_received: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                          <button
                            type="button"
                            onClick={() => setIsQuickReorderView(false)}
                            className="bg-slate-800 hover:bg-slate-750 px-4 py-1.5 text-xs rounded border border-slate-700 text-slate-350 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteQuickReorder(cust)}
                            className="bg-indigo-600 hover:bg-indigo-555 px-4 py-1.5 text-xs text-white rounded font-bold shadow shadow-indigo-650/30 cursor-pointer"
                          >
                            Issue Repeat Order Contract
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stats Summary widgets */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-750 text-indigo-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Total Bookings</span>
                          <span className="text-sm font-black text-slate-100 font-mono">{cust.totalOrders}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-750 text-emerald-400">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Lifetime Revenue</span>
                          <span className="text-sm font-black text-emerald-400 font-mono">{formatINR(cust.totalRevenue)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-750 text-amber-500">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Latest Event Date</span>
                          <span className="text-sm font-bold text-slate-205 font-mono">{cust.lastEventDate || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timelines history segments */}
                    <div className="space-y-6">
                      
                      {/* Subsegment 1: Historical Inquiries Timeline */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Inquiries Timeline</span>
                        </h4>
                        <div className="space-y-3">
                          {cust.leads.map((ld, i) => (
                            <div key={ld.lead_id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-800">
                              <span className="absolute left-[3px] top-[5px] w-1.5 h-1.5 rounded-full bg-indigo-505 ring-4 ring-slate-850" />
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs w-full">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-amber-400 font-bold">{ld.lead_id}</span>
                                    <span className="text-slate-500">Scheduled:</span>
                                    <span className="font-semibold text-slate-300 font-mono">{ld.event_date}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-1">
                                    Shoot: <strong className="text-slate-100">{ld.event_type}</strong> | Source: {ld.lead_source}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[9px] font-mono text-indigo-400 font-semibold uppercase">
                                    {ld.status}
                                  </span>
                                  <span className="font-mono text-[11px] text-emerald-450 font-black">
                                    {formatINR(ld.budget)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {cust.leads.length === 0 && (
                            <p className="text-[11px] text-slate-500 font-mono italic">No previous inquiries logged.</p>
                          )}
                        </div>
                      </div>

                      {/* Subsegment 2: Confirmed Orders History */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Verified Orders & Contracts History</span>
                        </h4>
                        <div className="space-y-3">
                          {cust.orders.map((ord) => (
                            <div key={ord.order_id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-indigo-400 font-bold">{ord.order_id}</span>
                                  <span className="text-slate-500">Event Date:</span>
                                  <span className="font-semibold text-slate-300 font-mono">{ord.event_date}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                  Package: <strong className="text-slate-200">{ord.package_name}</strong> | Location: {ord.event_location}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-slate-550 font-mono text-[10px] uppercase">Quotation</div>
                                  <strong className="text-emerald-450 text-[11px] font-mono font-black">{formatINR(ord.quotation_amount)}</strong>
                                </div>
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-amber-500 font-semibold uppercase">
                                  {ord.order_status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {cust.orders.length === 0 && (
                            <p className="text-[11px] text-slate-500 font-mono italic">No confirmed order folders detected.</p>
                          )}
                        </div>
                      </div>

                      {/* Subsegment 3: Payment History Ledger */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Financial Ledger Payments History</span>
                        </h4>
                        <div className="space-y-3">
                          {(() => {
                            const customerOrdersIds = cust.orders.map(o => o.order_id);
                            const customerPayments = payments.filter(p => customerOrdersIds.includes(p.order_id));
                            
                            if (customerPayments.length === 0) {
                              return <p className="text-[11px] text-slate-550 font-mono italic">Awaiting payment ledger clearance logs...</p>;
                            }

                            return customerPayments.map(p => (
                              <div key={p.payment_id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-mono">Invoice Code</span>
                                  <span className="font-mono text-indigo-400 font-bold">{p.payment_id} (Ref: {p.order_id})</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-mono">Deposited Cash</span>
                                  <span className="font-mono text-emerald-445 font-bold">{formatINR(p.advance_received + p.final_payment_received)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-505 text-[10px] block font-mono">Balance Due</span>
                                  <span className={`font-mono font-black ${p.balance_due > 0 ? 'text-red-405 animate-pulse' : 'text-slate-405'}`}>{formatINR(p.balance_due)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-mono">Clearance Status</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold leading-none inline-block mt-0.5 uppercase ${
                                    p.payment_status === 'Cleared' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                                  }`}>
                                    {p.payment_status}
                                  </span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Subsegment 4: Delivery History */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Operational Crews & Delivery History</span>
                        </h4>
                        <div className="space-y-3">
                          {(() => {
                            const customerOrdersIds = cust.orders.map(o => o.order_id);
                            // Link production items
                            const linkedProduction = production.filter(prod => customerOrdersIds.includes(prod.order_id));

                            if (linkedProduction.length === 0) {
                              return <p className="text-[11px] text-slate-550 font-mono italic">Roster operations not yet dispatched to editors...</p>;
                            }

                            return linkedProduction.map(prod => (
                              <div key={prod.production_id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs flex justify-between items-center text-zinc-300">
                                <div>
                                  <span className="font-mono text-[10px] text-indigo-400 font-black">PROD-{prod.production_id} / ORD-{prod.order_id}</span>
                                  <div className="text-[11px] text-slate-450 mt-0.5">
                                    Editor assigned: <strong className="text-slate-205">{prod.editor_assigned || 'Unassigned'}</strong>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-[10px] text-slate-550 font-mono uppercase">Delivery Stage</div>
                                  <span className="text-amber-500 font-black font-mono text-[11px] uppercase">{prod.editing_status}</span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                      
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : activeTab === 'packages' ? (
          /* NEW SCREEN: Package Management Catalog */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-left relative overflow-hidden font-sans">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>Dynamic Package Catalog</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Manage core service offerings, pricing rates, and category bindings synced directly with Supabase.
                </p>
              </div>
              
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPackage(null);
                    setPkgForm({ 
                      package_name: '', 
                      category: 'Wedding', 
                      price: 0, 
                      status: 'Active', 
                      deliverables: '', 
                      team_members: '', 
                      seasonal_offer: '',
                      terms_conditions: '',
                      event_type: '',
                      duration: '',
                      package_includes: ''
                    });
                    setCustomCategory('');
                    setIsAddFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer border border-transparent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create offering</span>
                </button>
              )}
            </div>

            {/* In-place Add / Edit Package Modal */}
            {(isAddFormOpen || editingPackage) && (
              <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto animate-fade-in text-left text-xs bg-black/70">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl md:w-[90%] p-4 md:p-6 space-y-3.5 shadow-2xl relative text-slate-350">
                  <h4 className="text-sm font-bold text-slate-100 font-mono tracking-wide border-b border-slate-800 pb-2 flex items-center gap-2">
                    {editingPackage ? '✏️ Edit Service Package' : '✨ Define New Service Package'}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3.5 text-xs text-slate-300">
                    {/* Row 1: Package Name | Package Category */}
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Package Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Traditional Wedding Photography"
                        value={pkgForm.package_name}
                        onChange={(e) => setPkgForm({ ...pkgForm, package_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Package Category</label>
                      <select
                        value={pkgForm.category}
                        onChange={(e) => setPkgForm({ ...pkgForm, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
                      >
                        {categoriesList.filter(c => c !== 'CUSTOM_CATEGORY').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="CUSTOM_CATEGORY">➕ Create Custom Category...</option>
                      </select>
                      {pkgForm.category === 'CUSTOM_CATEGORY' && (
                        <div className="animate-slide-down mt-1.5">
                          <label className="block text-amber-450 font-semibold mb-1">New Custom Category Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Newborn Baby shoot"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full bg-slate-950 border border-amber-500/40 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
                          />
                        </div>
                      )}
                    </div>

                    {/* Row 2: Package Price | Status */}
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Package Price (INR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 25000"
                        value={pkgForm.price}
                        onChange={(e) => setPkgForm({ ...pkgForm, price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Status</label>
                      <select
                        value={pkgForm.status}
                        onChange={(e) => setPkgForm({ ...pkgForm, status: e.target.value as 'Active' | 'Inactive' })}
                        className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Row 3: Event Type | Package Duration */}
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Event Type</label>
                      <input
                        type="text"
                        placeholder="e.g. Wedding, Reception, Pre-wedding shoot"
                        value={pkgForm.event_type}
                        onChange={(e) => setPkgForm({ ...pkgForm, event_type: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Package Duration</label>
                      <input
                        type="text"
                        placeholder="e.g. 1 Day, 2 Days, 8 Hours"
                        value={pkgForm.duration}
                        onChange={(e) => setPkgForm({ ...pkgForm, duration: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                    </div>

                    {/* Row 4: Package Includes | Deliverables */}
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Package Includes</label>
                      <input
                        type="text"
                        placeholder="e.g. Photobook, Drone coverage, Raw shots drive copy"
                        value={pkgForm.package_includes}
                        onChange={(e) => setPkgForm({ ...pkgForm, package_includes: e.target.value })}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Deliverables</label>
                      <textarea
                        placeholder="e.g. 2 Candid Photographers, 1 Cinematic Videographer, Standard Album..."
                        value={pkgForm.deliverables}
                        onChange={(e) => setPkgForm({ ...pkgForm, deliverables: e.target.value })}
                        rows={1}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans resize-y"
                      />
                    </div>

                    {/* Extra Fields: Team Members Included | Seasonal Offer */}
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Team Members Included</label>
                      <input
                        type="text"
                        placeholder="e.g. 3 Crew Members + Drone"
                        value={pkgForm.team_members}
                        onChange={(e) => setPkgForm({ ...pkgForm, team_members: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Seasonal Offer</label>
                      <input
                        type="text"
                        placeholder="e.g. Free 1-min pre-wedding teaser"
                        value={pkgForm.seasonal_offer}
                        onChange={(e) => setPkgForm({ ...pkgForm, seasonal_offer: e.target.value })}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                    </div>

                    {/* Terms & Conditions (Spanning both cols) */}
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 font-semibold mb-1">Terms & Conditions</label>
                      <textarea
                        placeholder="e.g. 55% advance for booking confirmation. Prices exclude travel outside city limits..."
                        value={pkgForm.terms_conditions}
                        onChange={(e) => setPkgForm({ ...pkgForm, terms_conditions: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans resize-y"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFormOpen(false);
                        setEditingPackage(null);
                        setPkgForm({ 
                          package_name: '', 
                          category: 'Wedding', 
                          price: 0, 
                          status: 'Active', 
                          deliverables: '', 
                          team_members: '', 
                          seasonal_offer: '',
                          terms_conditions: '',
                          event_type: '',
                          duration: '',
                          package_includes: ''
                        });
                        setCustomCategory('');
                      }}
                      className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-lg transition-all cursor-pointer font-medium border border-transparent"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!pkgForm.package_name.trim()) {
                          alert('Please supply a package name.');
                          return;
                        }
                        if (pkgForm.price <= 0) {
                          alert('Please enter a valid price greater than zero.');
                          return;
                        }

                        let resolvedCategory = pkgForm.category;
                        if (resolvedCategory === 'CUSTOM_CATEGORY') {
                          if (!customCategory.trim()) {
                            alert('Please enter a valid custom category name.');
                            return;
                          }
                          resolvedCategory = customCategory.trim();
                        }
                        
                        const payload = {
                          ...pkgForm,
                          category: resolvedCategory
                        };
                        
                        if (editingPackage) {
                          await updatePackage(editingPackage.package_id, payload);
                        } else {
                          await addPackage(payload);
                        }
                        
                        setIsAddFormOpen(false);
                        setEditingPackage(null);
                        setPkgForm({ 
                          package_name: '', 
                          category: 'Wedding', 
                          price: 0, 
                          status: 'Active', 
                          deliverables: '', 
                          team_members: '', 
                          seasonal_offer: '',
                          terms_conditions: '',
                          event_type: '',
                          duration: '',
                          package_includes: ''
                        });
                        setCustomCategory('');
                      }}
                      className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all cursor-pointer border border-transparent"
                    >
                      Save Package
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Multi-Search & Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
              {/* Search Package Field */}
              <div className="relative w-full">
                <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-tight">Search Package</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search package name..."
                    value={catSearchQuery}
                    onChange={(e) => setCatSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-250 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  {catSearchQuery && (
                    <button
                      onClick={() => setCatSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter by Category selection */}
              <div className="w-full">
                <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-tight font-sans">Filter by Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-250 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Categories ({categoriesList.length})</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Status selection */}
              <div className="w-full">
                <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-tight font-sans">Filter by Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-250 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Packages Only</option>
                  <option value="Inactive">Inactive Packages Only</option>
                </select>
              </div>
            </div>

            {/* Category Listing Grid */}
            <div className="space-y-6">
              {categoriesList.map((cat) => {
                // Respect category filter
                if (categoryFilter !== 'All' && cat !== categoryFilter) return null;

                const catPkgs = (packages || []).filter(
                  p => p.category === cat && 
                  p.package_name.toLowerCase().includes(catSearchQuery.toLowerCase()) &&
                  (statusFilter === 'All' || p.status === statusFilter)
                );
                
                if (catPkgs.length === 0) return null;
                
                return (
                  <div key={cat} className="space-y-2.5 text-left animate-fade-in">
                    <h4 className="text-[10px] font-black font-mono tracking-wider text-slate-400 border-b border-slate-800 pb-1 uppercase flex justify-between items-center bg-slate-950/20 px-2 py-1 rounded">
                      <span>{cat}</span>
                      <span className="text-slate-500 font-mono">({catPkgs.length})</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {catPkgs.map((pkg) => (
                        <div
                          key={pkg.package_id}
                          className="bg-slate-955 border border-slate-850 p-4 rounded-xl flex flex-col justify-between hover:border-slate-800 transition-all space-y-4 hover:shadow-lg relative group"
                        >
                          <div className="space-y-1.5 text-left">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] text-slate-500 font-bold uppercase">{pkg.package_id}</span>
                              <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded ${
                                pkg.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}>
                                {pkg.status}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-100 leading-tight">{pkg.package_name}</h5>
                            <p className="text-[11px] text-slate-400 truncate leading-snug">
                              {pkg.deliverables || 'No custom deliverables specified'}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 pt-2.5 border-t border-slate-900/80">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-emerald-400">₹{pkg.price.toLocaleString('en-IN')}</span>
                              <button
                                type="button"
                                onClick={() => setViewingPkgDetails(pkg)}
                                className="text-[10px] font-mono font-bold tracking-tight text-slate-405 hover:text-emerald-400 cursor-pointer flex items-center gap-1 transition-all"
                              >
                                🔍 View specifications
                              </button>
                            </div>
                            
                            {canEdit && (
                              <div className="grid grid-cols-3 gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPackage(pkg);
                                    setPkgForm({
                                      package_name: pkg.package_name,
                                      category: pkg.category,
                                      price: pkg.price,
                                      status: pkg.status,
                                      deliverables: pkg.deliverables || '',
                                      team_members: pkg.team_members || '',
                                      seasonal_offer: pkg.seasonal_offer || '',
                                      terms_conditions: pkg.terms_conditions || '',
                                      event_type: pkg.event_type || '',
                                      duration: pkg.duration || '',
                                      package_includes: pkg.package_includes || ''
                                    });
                                    setCustomCategory('');
                                    setIsAddFormOpen(false);
                                  }}
                                  className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] uppercase font-mono tracking-tight font-bold border border-slate-800 hover:border-slate-700 rounded transition-all cursor-pointer text-center"
                                  title="Edit package details"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextStatus = pkg.status === 'Active' ? 'Inactive' : 'Active';
                                    await updatePackage(pkg.package_id, { status: nextStatus });
                                  }}
                                  className={`py-1 px-1.5 text-center text-[10px] uppercase font-mono tracking-tight font-bold border rounded transition-all cursor-pointer ${
                                    pkg.status === 'Active'
                                      ? 'bg-amber-500/10 border-amber-550/20 text-amber-500 hover:bg-amber-500/20'
                                      : 'bg-emerald-500/10 border-emerald-555/20 text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                  title={pkg.status === 'Active' ? "Deactivate Package" : "Activate Package"}
                                >
                                  {pkg.status === 'Active' ? 'Deact' : 'Act'}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Remove package "${pkg.package_name}"?`)) {
                                      await deletePackage(pkg.package_id);
                                    }
                                  }}
                                  className="py-1 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 text-[10px] uppercase font-mono tracking-tight font-bold border border-rose-500/10 hover:border-rose-500/25 rounded transition-all cursor-pointer text-center"
                                  title="Delete package"
                                >
                                  Del
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'create' ? (
          /* SCREEN 2: Create Lead Layout as centered Popup Modal utilizing createPortal to escape parents with transform/will-change limits */
          createPortal(
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden animate-fade-in text-left">
              <form 
                onSubmit={handleCreateSubmit}
                className="bg-slate-900 border-0 sm:border border-slate-800 rounded-none sm:rounded-2xl w-full sm:w-[95vw] lg:w-[85vw] lg:max-w-[1200px] h-[100vh] sm:h-[90vh] shadow-2xl relative flex flex-col text-left overflow-hidden bg-gradient-to-tr from-slate-900 via-slate-900 to-slate-950"
              >
            {/* Header: Sticky */}
            <div className="border-b border-slate-800/80 p-4 sm:p-5 flex items-center justify-between shrink-0 bg-slate-950/40 backdrop-blur-md">
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-emerald-400">✍️</span> Create New Inbound Lead
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  Capture inbound photography and videography business queries.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setActiveTab('list')}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-slate-700/50"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body: Content Fields */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              
              {/* Section 1: Customer Contact details */}
              <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">1. Customer Details</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cust Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Customer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Sophia Loren"
                      value={createForm.customer_name}
                      onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-sans"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Primary Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="sophia@example.com"
                      value={createForm.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateForm({ ...createForm, email: val });
                        if (val.includes('@') && val.length > 5 && (val.endsWith('.com') || val.endsWith('.in') || val.endsWith('.org'))) {
                          handleCheckExistingCustomer('email', val);
                        }
                      }}
                      onBlur={(e) => handleCheckExistingCustomer('email', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                    />
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Primary Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+1 (555) 019-4820"
                      value={createForm.mobile}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateForm({ ...createForm, mobile: val });
                        const cleanNum = val.replace(/[^\d]/g, '').slice(-10);
                        if (cleanNum.length === 10) {
                          handleCheckExistingCustomer('phone', val);
                        }
                      }}
                      onBlur={(e) => handleCheckExistingCustomer('phone', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                    />
                  </div>

                  {/* Alt Mobile */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Alternate Mobile (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="+1 (555) 012-3456"
                      value={createForm.alternate_mobile}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateForm({ ...createForm, alternate_mobile: val });
                        const cleanNum = val.replace(/[^\d]/g, '').slice(-10);
                        if (cleanNum.length === 10) {
                          handleCheckExistingCustomer('phone', val);
                        }
                      }}
                      onBlur={(e) => handleCheckExistingCustomer('phone', e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Event Details */}
              <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">2. Event Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Event Type */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Desired Event Shoot Type
                    </label>
                    <select
                      value={createForm.event_type}
                      onChange={(e) => setCreateForm({ ...createForm, event_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all cursor-pointer"
                    >
                      <option value="Wedding Shoot">Wedding Shoot</option>
                      <option value="Destination Wedding">Destination Wedding</option>
                      <option value="Pre-Wedding Shoot">Pre-Wedding Shoot</option>
                      <option value="Corporate Event">Corporate Event</option>
                      <option value="Real Estate Reel">Real Estate Reel</option>
                      <option value="Fashion Portfolio">Fashion Portfolio</option>
                      <option value="Music Video Launch">Music Video Launch</option>
                      <option value="Birthday Banquet">Birthday Banquet</option>
                    </select>
                  </div>

                  {/* Lead Source */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Inbound Lead Channel Source
                      </label>
                      <select
                        value={createForm.lead_source}
                        onChange={(e) => setCreateForm({ ...createForm, lead_source: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all cursor-pointer"
                      >
                        <option value="Website Form">Website Form</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook Ad">Facebook Ad</option>
                        <option value="Google Search">Google Search</option>
                        <option value="Referral">Referral</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {createForm.lead_source === 'Other' && (
                      <div className="animate-fade-in-down">
                        <label className="block text-xs font-mono font-bold text-amber-500 mb-1.5">
                          Specify Custom Lead Source Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. YouTube, Billboard, Event Flyer"
                          value={otherSource}
                          onChange={(e) => setOtherSource(e.target.value)}
                          className="w-full bg-slate-950 border border-amber-500/50 rounded-lg py-2 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* Event Date */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Estimated Event Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.event_date}
                      onChange={(e) => setCreateForm({ ...createForm, event_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                    />
                  </div>

                  {/* Event Time */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Estimated Reporting Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={createForm.event_time}
                      onChange={(e) => setCreateForm({ ...createForm, event_time: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                    />
                  </div>

                  {/* Shoot Location */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Shoot Geography / Location *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="Grand Hyatt Central Beach Lawn"
                        value={createForm.event_location}
                        onChange={(e) => setCreateForm({ ...createForm, event_location: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Package Selection */}
              <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">3. Package Selection</span>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Packages Required
                  </label>

                  {/* Selected Packages Tags/Chips */}
                  {selectedPkgIds.length > 0 && (
                    <div id="pkg_selected_tags_chips" className="flex flex-wrap gap-1.5 mb-3 pt-0.5 animate-fade-in">
                      {selectedPkgIds.map((id) => {
                        const pkg = PACKAGES_LIST.flatMap(cat => cat.items).find(item => item.id === id);
                        if (!pkg) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium px-2.5 py-1 rounded-full hover:bg-emerald-900/60 transition-all duration-150"
                          >
                            <span>{pkg.name} — ₹{pkg.cost.toLocaleString('en-IN')}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPkgIds(selectedPkgIds.filter(x => x !== id));
                              }}
                              className="hover:bg-emerald-850 rounded-full p-0.5 focus:outline-none cursor-pointer transition-colors inline-flex items-center justify-center ml-0.5"
                              title="Remove Package"
                            >
                              <X className="w-3 h-3 text-emerald-450 stroke-[2.5px]" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsPkgDropdownOpen(!isPkgDropdownOpen)}
                    className="w-full bg-[#0F172A] border border-slate-800 hover:border-emerald-600 rounded-lg py-2.5 px-3.5 text-xs text-white flex items-center justify-between focus:outline-none transition-all cursor-pointer"
                  >
                    <span className="text-slate-300 font-medium">
                      {selectedPkgIds.length === 0
                        ? 'Select Packages...'
                        : `${selectedPkgIds.length} Packages Selected (Total: ₹${finalTotal.toLocaleString('en-IN')})`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isPkgDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isPkgDropdownOpen && (
                    <div id="pkg_multiselect_dropdown" className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl p-3.5 space-y-4">
                      {/* Search Input Filter */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search packages by name, category, or service..."
                          value={pkgSearchQuery}
                          onChange={(e) => setPkgSearchQuery(e.target.value)}
                          className="w-full bg-[#1e293b] border border-slate-800 rounded-lg pl-8.5 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all font-sans"
                          autoFocus
                        />
                        {pkgSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setPkgSearchQuery('')}
                            className="absolute right-2.5 top-2.5 hover:bg-slate-800 p-0.5 rounded cursor-pointer text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {(() => {
                        if (PACKAGES_LIST.flatMap(cat => cat.items).length === 0) {
                          return (
                            <div className="text-center py-6 text-slate-400 space-y-3" onClick={(e) => e.stopPropagation()}>
                              <div className="font-mono text-xs font-semibold">No Packages Available</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsPkgDropdownOpen(false);
                                  setActiveTab('packages');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-transparent"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create Package</span>
                              </button>
                            </div>
                          );
                        }

                        const searchLower = pkgSearchQuery.toLowerCase().trim();
                        const filteredCategories = PACKAGES_LIST.map((category) => {
                          const categoryMatch = category.categoryName.toLowerCase().includes(searchLower);
                          const matchedItems = category.items.filter((item) => {
                            return (
                              item.name.toLowerCase().includes(searchLower) ||
                              categoryMatch
                            );
                          });
                          return {
                            ...category,
                            categoryMatch,
                            items: matchedItems,
                          };
                        }).filter((cat) => cat.items.length > 0);

                        if (filteredCategories.length === 0) {
                          return (
                            <div className="text-center py-5 text-xs text-slate-500 font-mono" onClick={(e) => e.stopPropagation()}>
                              No matching packages found for "{pkgSearchQuery}"
                            </div>
                          );
                        }

                        return filteredCategories.map((category) => (
                          <div key={category.categoryName} className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-black text-slate-500 font-mono tracking-wider block uppercase border-b border-slate-900/50 pb-1">
                              {highlightText(category.categoryName, pkgSearchQuery)}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                              {category.items.map((pkg) => {
                                const isChecked = selectedPkgIds.includes(pkg.id);
                                return (
                                  <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() => {
                                      if (isChecked) {
                                        setSelectedPkgIds(selectedPkgIds.filter(id => id !== pkg.id));
                                      } else {
                                        setSelectedPkgIds([...selectedPkgIds, pkg.id]);
                                      }
                                    }}
                                    className={`flex items-center justify-between text-left px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-all duration-150 ${
                                      isChecked
                                        ? 'bg-[#0c2d24] border-emerald-500 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                                        : 'bg-[#1b2234] border-slate-850 text-slate-250 hover:border-slate-700 hover:bg-[#242d45]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <div className={`w-3.5 h-3.5 flex items-center justify-center rounded border transition-all duration-150 shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-600' : 'border-slate-600'}`}>
                                        {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3.5px]" />}
                                      </div>
                                      <span className="font-medium truncate">{highlightText(pkg.name, pkgSearchQuery)}</span>
                                    </div>
                                    <span className="font-mono text-[10px] opacity-85 pl-2.5 shrink-0 text-emerald-400">₹{pkg.cost.toLocaleString('en-IN')}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}

                      <div className="flex justify-end pt-1.5 border-t border-slate-900/55" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setIsPkgDropdownOpen(false)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-md"
                        >
                          Done Selecting
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Package Summary Panel with viewer + compare workflows */}
                {selectedPkgIds.length > 0 && (
                  <div id="create_lead_pkg_summary_panel" className="bg-[#0F172A] border border-slate-800 rounded-xl p-4.5 space-y-4 animate-fade-in text-xs text-left">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-350">Selected Packages</span>
                        <span className="bg-emerald-990/90 text-emerald-400 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border border-emerald-900/40">
                          {selectedPkgIds.length} Packages
                        </span>
                      </div>
                      
                      {selectedPkgIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setIsComparingPkgs(true)}
                          className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 rounded-lg font-bold text-[10px] cursor-pointer transition-colors uppercase font-mono tracking-wider flex items-center gap-1"
                        >
                          ⚖️ Compare Specs ({selectedPkgIds.length})
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {selectedPkgIds.map((id) => {
                        const pkgObj = packages.find(p => p.package_id === id);
                        if (!pkgObj) return null;
                        return (
                          <div key={id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-850 p-3 rounded-lg hover:border-slate-800 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-white text-[12px]">{pkgObj.package_name}</span>
                                <span className="text-[9px] bg-slate-800/80 text-custom text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">
                                  {pkgObj.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span>Price:</span>
                                <span className="font-mono text-emerald-400 font-bold">₹{pkgObj.price.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setViewingPkgDetails(pkgObj)}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 font-semibold cursor-pointer transition-all flex items-center gap-1 text-[11px]"
                              >
                                📋 View Specification
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedPkgIds(selectedPkgIds.filter(x => x !== id))}
                                className="px-2.5 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 hover:border-rose-900/50 rounded-lg font-semibold cursor-pointer transition-all flex items-center gap-1 text-[11px]"
                                title="Remove Package"
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-850 flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Combined Package Total</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-mono text-[11px]">Total Amount =</span>
                        <span className="font-mono text-emerald-400 font-black text-xs sm:text-sm">₹{subtotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display Package Pricing & Live Auto Calculation Output */}
                {selectedPkgIds.length > 0 && (
                  <div id="pkg_pricing_calc_panel" className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3 animate-fade-in">
                    <span className="text-[10px] font-bold text-slate-400 font-mono block border-b border-slate-800/65 pb-1.5 uppercase tracking-wider">
                      Selected Packages & Price Estimate
                    </span>
                    <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedPkgIds.map((id) => {
                        const pkg = PACKAGES_LIST.flatMap(cat => cat.items).find(item => item.id === id);
                        if (!pkg) return null;
                        return (
                          <li key={id} className="flex justify-between items-center text-xs text-slate-300">
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {pkg.name}
                            </span>
                            <span className="font-mono text-emerald-400">₹{pkg.cost.toLocaleString('en-IN')}</span>
                          </li>
                        );
                      })}
                    </ul>
                    
                    <div className="border-t border-slate-800/80 pt-3 space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span className="font-mono text-slate-200">₹{subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Discount (Optional)</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={subtotal}
                            placeholder="0"
                            value={leadDiscount || ''}
                            onChange={(e) => {
                              const val = Math.min(subtotal, Math.max(0, Number(e.target.value)));
                              setLeadDiscount(val);
                            }}
                            className="w-24 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-right font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-600 transition-all"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-white font-extrabold border-t border-slate-800/80 pt-2.5">
                        <span className="tracking-wide">Final Total Project Value</span>
                        <span className="font-mono text-amber-400 text-sm">₹{finalTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Proposed Budget & Remarks */}
              <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm pb-6">
                <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                  <Edit className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">4. Proposed Budget & Remarks</span>
                </div>

                <div className="space-y-4">
                  {/* Budget */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Initial Proposed Budget (₹)
                    </label>
                    <input
                      type="number"
                      required
                      value={createForm.budget}
                      onChange={(e) => setCreateForm({ ...createForm, budget: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 font-mono transition-all"
                    />
                  </div>

                  {/* Init query remarks */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Remarks & Detailed Inbound Scope (Notes)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="List customized requests, physical albums requirement, or crew limits."
                      value={createForm.remarks}
                      onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-sans"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-800/80 p-4 sm:p-5 bg-slate-950/40 backdrop-blur-md shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4.5 py-2 text-xs font-semibold bg-slate-805 hover:bg-slate-800 text-slate-300 rounded-xl cursor-pointer border border-slate-800 hover:border-slate-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer border border-transparent transition-colors"
              >
                Save Lead
              </button>
            </div>
          </form>
        </div>,
        document.body
      )
    ) : (
        /* SCREEN 1: Lead List datagrid */
        <div className="space-y-4">

          {/* Sales Performance Dashboard Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 mt-2">
            {[
              { label: 'New Leads', val: statNewLeads, theme: 'gold' as CameraLensTheme, filterValue: 'New Lead', chartPoints: [10, 18, 14, 25, 20, 31, 35], trendText: 'Inbound' },
              { label: "Today's Follow-ups", val: statTodayFollowups, theme: 'green' as CameraLensTheme, filterValue: 'Follow Up', chartPoints: [5, 12, 8, 15, 10, 19, 14], trendText: 'Pending Call' },
              { label: 'Overdue Follow-ups', val: statOverdueFollowups, theme: 'red' as CameraLensTheme, filterValue: 'Overdue', chartPoints: [2, 6, 3, 8, 4, 10, 6], trendText: 'Urgent CRM' },
              { label: 'Quotations Sent', val: statQuotesSent, theme: 'purple' as CameraLensTheme, filterValue: 'Quotation Sent', chartPoints: [12, 14, 18, 15, 21, 25, 22], trendText: 'Proposals Out' },
              { label: 'Negotiations', val: statNegotiations, theme: 'blue' as CameraLensTheme, filterValue: 'Negotiation', chartPoints: [4, 9, 7, 12, 11, 15, 13], trendText: 'Contract Discussions' },
              { label: 'Confirmed Orders', val: statConfirmedOrders, theme: 'cyan' as CameraLensTheme, filterValue: 'Order Confirmed', chartPoints: [8, 15, 12, 20, 16, 25, 24], trendText: 'Signed Reels' },
            ].map((card, idx) => (
              <CameraLensStatsCard
                key={idx}
                label={card.label}
                val={card.val}
                theme={card.theme}
                trendText={card.trendText}
                subText="CRM STATUS"
                chartPoints={card.chartPoints}
                activeFilterValue={filterStatus}
                currentFilterValue={card.filterValue}
                onClick={() => setFilterStatus(filterStatus === card.filterValue ? '' : card.filterValue)}
                lensLabel={card.label.slice(0, 10).toUpperCase()}
              />
            ))}
          </div>
          
          {/* Leads Directory Title & Export Utility Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-850 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">📁</span>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Leads Directory</h3>
                <p className="text-[10px] text-zinc-400">Export active pipeline registers using start and end filters</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-amber-400 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                title="Print lead report to paper"
              >
                <span>🖨️</span> Print Report
              </button>
              
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-rose-400 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                title="Download report as PDF format"
              >
                <span>📄</span> Download PDF
              </button>
              
              <button
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-emerald-450 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                title="Download report as Excel spreadsheet"
              >
                <span>📊</span> Excel (.xlsx)
              </button>

              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-indigo-400 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-all cursor-pointer"
                title="Download report as CSV file"
              >
                <span>📝</span> CSV
              </button>
            </div>
          </div>

          {/* Quick Filters Panel */}
          <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-850 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end relative overflow-hidden">
            {/* Corner calibration tick marks */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-emerald-500/40" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-emerald-500/40" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-emerald-500/40" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-emerald-500/40" />

            {/* Search query */}
            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">
                Search Lead / Customer Name
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-emerald-505 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="ID, name, or phone..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>
            </div>

            {/* Source */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                Lead Source
              </label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100/90"
              >
                <option value="">All Sources</option>
                <option value="Website Form">Website Form</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook Ad">Facebook Ad</option>
                <option value="Google Search">Google Search</option>
                <option value="Referral">Referral</option>
              </select>
            </div>

            {/* Status (Stage) */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                Active Stage
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100/90"
              >
                <option value="">All Stages</option>
                <option value="Overdue">⚠️ Overdue Follow-ups</option>
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Quotation Generated">Quotation Generated</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Order Confirmed">Order Confirmed</option>
                <option value="Operations Stage">Operations Stage</option>
                <option value="Operations Assigned">Operations Assigned</option>
                <option value="Event Completed">Event Completed</option>
                <option value="Production Stage">Production Stage</option>
                <option value="Editing Started">Editing Started</option>
                <option value="Customer Review">Customer Review</option>
                <option value="Delivered">Delivered</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                Start Date (Created)
              </label>
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                End Date (Created)
              </label>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="md:col-span-1 flex flex-col gap-1.5">
              <button
                onClick={() => {
                  setAppliedStartDate(dateRangeStart);
                  setAppliedEndDate(dateRangeEnd);
                }}
                className="w-full flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 py-1 py-1.5 text-[10px] font-bold text-white rounded transition-all cursor-pointer"
                title="Apply Date Filter"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setFilterQuery('');
                  setFilterSource('');
                  setFilterStatus('');
                  setFilterSalesPerson('');
                  setFilterDate('');
                  setDateRangeStart('');
                  setDateRangeEnd('');
                  setAppliedStartDate('');
                  setAppliedEndDate('');
                }}
                className="w-full flex items-center justify-center gap-0.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 py-1 px-1.5 text-[10px] text-zinc-300 rounded transition-all cursor-pointer animate-none"
                title="Reset all filters"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Table view */}
          <div className="bg-zinc-900/20 rounded-2xl border border-zinc-850 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950/70 text-zinc-405 font-bold border-b border-zinc-850 text-[10px] uppercase font-mono tracking-wider">
                    <th className="p-3.5 pl-5">Lead ID</th>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Mobile Number</th>
                    <th className="p-3.5">Event Type</th>
                    <th className="p-3.5">Event Date</th>
                    <th className="p-3.5">Current Stage</th>
                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Payment Status</th>
                    <th className="p-3.5">Created Date</th>
                    <th className="p-3.5 text-right pr-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => {
                      const isActiveInSales = ['New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation'].includes(lead.status);
                      const linkedOrder = orders.find((o) => o.lead_id === lead.lead_id);
                      const paymentRecord = linkedOrder ? payments.find((p) => p.order_id === linkedOrder.order_id) : null;
                      const paymentLabel = paymentRecord ? paymentRecord.payment_status : 'N/A';

                      // Determine high-level stage
                      let stageLabel = 'Sales';
                      if (['Order Confirmed', 'New Order Received', 'Operations Assigned', 'Event Scheduled', 'Staff Assigned', 'Event Completed', 'Operations Stage'].includes(lead.status)) {
                        stageLabel = 'Operations';
                      } else if (['Raw Footage Received', 'Editor Assigned', 'Editing Started', 'Editing In Progress', 'Internal QC Review', 'Client Review Sent', 'Revision Required', 'Revision In Progress', 'Final Approval', 'Production Stage', 'Approved'].includes(lead.status)) {
                        stageLabel = 'Production';
                      } else if (['Delivered', 'Closed'].includes(lead.status)) {
                        stageLabel = 'Closed / Delivered';
                      }

                      return (
                        <tr 
                          key={lead.lead_id} 
                          className="hover:bg-zinc-900/30 text-zinc-300 transition-all"
                        >
                          <td className="p-3.5 pl-5 font-mono text-[11px] font-bold text-indigo-400">
                            {lead.lead_id}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-violet-400 font-bold">
                            {linkedOrder ? linkedOrder.order_id : 'N/A'}
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {lead.customer_name}
                          </td>
                          <td className="p-3.5 font-mono text-zinc-400">
                            {formatIndianPhoneNumber(lead.mobile)}
                          </td>
                          <td className="p-3.5 text-zinc-300 font-sans">
                            {lead.event_type}
                          </td>
                          <td className="p-3.5 font-mono text-zinc-350">
                            {lead.event_date}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                              stageLabel === 'Sales' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              stageLabel === 'Operations' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                              stageLabel === 'Production' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {stageLabel}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase border ${
                              lead.status === 'New Lead' ? 'bg-indigo-555/15 text-indigo-400 border-indigo-505/20' :
                              lead.status === 'Follow Up' ? 'bg-emerald-555/15 text-emerald-400 border-emerald-505/20' :
                              lead.status === 'Quotation Sent' ? 'bg-amber-555/15 text-amber-400 border-amber-505/20' :
                              lead.status === 'Negotiation' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                              lead.status === 'Order Confirmed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-450/40 font-black' :
                              'bg-zinc-900 text-zinc-400 border-zinc-800'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              paymentLabel === 'Fully Paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                              paymentLabel === 'Partially Paid' ? 'bg-amber-555/15 text-amber-400 border-amber-505/20' :
                              paymentLabel === 'Pending' ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' :
                              'bg-zinc-900 text-zinc-400 border-zinc-800'
                            }`}>
                              {paymentLabel}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-zinc-400">
                            {lead.created_date ? lead.created_date.split('T')[0] : 'N/A'}
                          </td>
                          <td className="p-3.5 text-right pr-5">
                            <button
                              id={`btn_followup_${lead.lead_id}`}
                              onClick={() => handleSelectLead(lead)}
                              className="px-3.5 py-1.5 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white rounded-xl border border-zinc-850 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow"
                            >
                              <Edit className="w-3 h-3" />
                              <span>{isActiveInSales && canEdit ? 'Manage CRM' : 'View CRM'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-500">
                        <Filter className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                        <span className="text-xs font-mono text-zinc-500">No matching records in the directory grid. Try resetting filters.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Confirmation Modal to Officially Log and Book Contract */}
      {showConfirmModal && selectedLead && (
        <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-md w-full shadow-2xl p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-sans">
                <span>💍</span> Booking Confirmation & Contract Form
              </h4>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-500 hover:text-slate-350 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-[11px] space-y-1">
              <p className="text-slate-400">Client: <strong className="text-slate-200">{selectedLead.customer_name}</strong></p>
              <p className="text-slate-400">Type: <strong className="text-slate-200">{selectedLead.event_type}</strong></p>
              <p className="text-slate-400">Address: <strong className="text-slate-200">{selectedLead.event_location}</strong></p>
            </div>

            <form onSubmit={handleConfirmOrderSubmit} className="space-y-3.5 text-xs">
              
              {/* Product package */}
              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Product Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Royal Destination Platinum"
                  value={confirmForm.package_name}
                  onChange={(e) => setConfirmForm({ ...confirmForm, package_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Event Date & Time Block */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Event Date * (Required)
                  </label>
                  <input
                    type="date"
                    required
                    value={confirmForm.event_date}
                    onChange={(e) => setConfirmForm({ ...confirmForm, event_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Event Time
                  </label>
                  <input
                    type="time"
                    value={confirmForm.event_time}
                    onChange={(e) => setConfirmForm({ ...confirmForm, event_time: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Package cost and advance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Final Package Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={confirmForm.quotation_amount}
                    onChange={(e) => setConfirmForm({ ...confirmForm, quotation_amount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Advance Collected (₹)
                  </label>
                  <input
                    type="number"
                    value={confirmForm.advance_received}
                    onChange={(e) => setConfirmForm({ ...confirmForm, advance_received: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Payment Mode
                </label>
                <select
                  value={confirmForm.payment_mode}
                  onChange={(e) => setConfirmForm({ ...confirmForm, payment_mode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="UPI">UPI (GPay/PhonePe)</option>
                  <option value="Cash">Cash Handover</option>
                  <option value="Bank Transfer">Bank NFT/RTGS/IMPS</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Cheque">Cheque Deposit</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Notes / Contract Clauses
                </label>
                <textarea
                  placeholder="Add payment timelines, custom requests, shoot clauses..."
                  value={confirmForm.notes}
                  onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>

              {/* Balance due readout */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                <span className="text-slate-350">Remaining Balance Due:</span>
                <strong className="text-emerald-400 font-mono font-black text-sm">
                  {formatINR(Math.max(0, confirmForm.quotation_amount - confirmForm.advance_received))}
                </strong>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn_confirm_submit"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/20 text-xs"
                >
                  <span>Approve & Book Contract</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Popup Modal for Lead Follow-up Details */}
      {selectedLead && (
        <div id="lead_details_mobile_modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-0 sm:p-4 overflow-hidden animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-none sm:rounded-2xl w-full sm:w-[95vw] lg:w-[92vw] xl:w-[95vw] xl:max-w-[1600px] h-screen sm:h-[90vh] shadow-2xl relative flex flex-col overflow-hidden text-left bg-gradient-to-tr from-slate-900 via-slate-900 to-slate-950">
            {/* Header: Sticky */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 sticky top-0 z-10 backdrop-blur-md shrink-0">
              <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <span>💍</span> Lead CRM follow-up Desk & Quotation Suite
              </h3>
              <button 
                onClick={() => setSelectedLead(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs rounded-xl transition-all cursor-pointer border border-slate-700 font-bold uppercase tracking-wider"
              >
                Close Desk
              </button>
            </div>
            
            {/* Scrollable Workspace Body */}
            <div className="p-5 overflow-y-auto flex-1 text-xs text-left space-y-5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* COLUMN 1 : BUSINESS CAPTURE & QUOTATIONS */}
                <div className="lg:col-span-12 xl:col-span-8 space-y-5">
                  
                  {/* Lead Details & Identity Card */}
                  <div className="bg-slate-850/65 rounded-xl border border-slate-800 p-5 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-mono px-2.5 py-1 rounded-md font-bold border border-indigo-500/20 shadow-sm">
                          ID: {selectedLead.lead_id}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Agent: <strong className="text-slate-200 font-semibold">{selectedLead.sales_person}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <span>Source:</span>
                        <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-700 font-bold">
                          {selectedLead.lead_source}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                      {/* Left side: Core Contact Info */}
                      <div className="space-y-3.5">
                        <h4 className="text-slate-405 text-[10px] font-bold tracking-wider uppercase">Contact Identity</h4>
                        <h3 className="text-xl font-bold text-white tracking-tight">{selectedLead.customer_name}</h3>
                        
                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-center gap-3 text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/70">
                            <Phone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <div>
                              <span className="font-mono text-slate-200 font-semibold">{formatIndianPhoneNumber(selectedLead.mobile)}</span>
                              <span className="block text-[9px] text-slate-500">Primary Mobile</span>
                            </div>
                          </div>
                          
                          {selectedLead.alternate_mobile && (
                            <div className="flex items-center gap-3 text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/70">
                              <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <div>
                                <span className="font-mono text-slate-200 font-semibold">{formatIndianPhoneNumber(selectedLead.alternate_mobile)}</span>
                                <span className="block text-[9px] text-slate-500">Alternate Mobile</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/70">
                            <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-slate-200 truncate block font-medium" title={selectedLead.email}>{selectedLead.email || 'N/A'}</span>
                              <span className="block text-[9px] text-slate-500">Email Address</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Project Details */}
                      <div className="space-y-3.5">
                        <h4 className="text-slate-405 text-[10px] font-bold tracking-wider uppercase">Event Parameters</h4>
                        
                        <div className="space-y-2.5 text-xs">
                          <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/70 space-y-3">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              <div>
                                <span className="text-slate-500 text-[10px] block font-medium uppercase tracking-wider">Shoot Type</span>
                                <strong className="text-white text-xs font-bold">{selectedLead.event_type}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] block font-medium uppercase tracking-wider">Scheduled Date</span>
                                <strong className="text-indigo-300 text-xs font-bold font-mono">{selectedLead.event_date || 'N/A'}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] block font-medium uppercase tracking-wider">Event Time</span>
                                <strong className="text-slate-200 text-xs font-semibold">{formatTime12Hour(selectedLead.event_time)}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-medium">Project Budget</span>
                                <strong className="text-amber-400 text-xs font-black font-mono">{formatINR(selectedLead.budget)}</strong>
                              </div>
                            </div>

                            <div className="border-t border-slate-800/80 pt-2.5 flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Shoot Location</span>
                                <span className="text-slate-200 font-semibold leading-relaxed">{selectedLead.event_location || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Packages & Pricing breakdown */}
                  <div id="lead_detail_packages_breakdown_section" className="bg-slate-850/60 rounded-xl border border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-mono">
                        <span>📦</span> Current Selected Packages
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">Package Composition</span>
                    </div>
                    {(() => {
                      const activePackages = (leadPackages || []).filter(lp => lp.lead_id === selectedLead.lead_id);
                      if (activePackages.length > 0) {
                        const subtotalAmount = activePackages.reduce((acc, lp) => acc + Number(lp.package_cost), 0);
                        const discountAmt = Number(activePackages[0]?.discount || 0);
                        const finalProjValue = Number(activePackages[0]?.final_amount || selectedLead.budget);
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                            {/* List of active packages */}
                            <div className="space-y-2">
                              <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold font-mono block">Package Breakdown</label>
                              <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {activePackages.map((lp) => (
                                  <li key={lp.lead_package_id} className="flex justify-between items-center text-xs bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/70">
                                    <span className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                      <span className="font-semibold text-slate-200">{lp.package_name}</span>
                                    </span>
                                    <span className="font-mono font-bold text-slate-100">₹{Number(lp.package_cost).toLocaleString('en-IN')}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {/* Summary of calculation */}
                            <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-800 space-y-2.5">
                              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold font-mono block">Financial Statement</label>
                              <div className="space-y-2 text-[11px]">
                                <div className="flex justify-between text-slate-400">
                                  <span>Subtotal Package Value</span>
                                  <span className="font-mono font-black text-slate-200">₹{subtotalAmount.toLocaleString('en-IN')}</span>
                                </div>
                                {discountAmt > 0 && (
                                  <div className="flex justify-between text-slate-400">
                                    <span>Discount Claimed</span>
                                    <span className="font-mono font-semibold text-emerald-400">-₹{discountAmt.toLocaleString('en-IN')}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center text-white border-t border-slate-800/80 pt-2.5 font-bold">
                                  <span className="text-slate-300">Approved Project Value</span>
                                  <span className="font-mono text-amber-400 text-sm">₹{finalProjValue.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-xs text-slate-400 py-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="flex justify-between items-center text-slate-355 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                              <span className="flex items-center gap-2 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                Default {selectedLead.event_type} Single Package
                              </span>
                              <span className="font-mono font-black text-slate-200">₹{selectedLead.budget.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-white bg-slate-900/50 p-3 rounded-lg border border-slate-800 font-bold">
                              <span className="text-slate-400">Total Project Value</span>
                              <span className="font-mono text-amber-400">₹{selectedLead.budget.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* Quotation & Sharing Workspace */}
                  <div id="lead_detail_quotation_section" className="bg-slate-850/60 rounded-xl border border-slate-800 p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                        <span>📄</span> Quotation & Sharing Workspace
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">Premium Invoice Engine</span>
                    </div>

                    {(() => {
                      const activePackages = (leadPackages || []).filter(lp => lp.lead_id === selectedLead.lead_id);
                      const hasActivePkgs = activePackages.length > 0;

                      // Use the activePackages to build editable structures
                      const activePackagesToRender = hasActivePkgs 
                        ? activePackages.map(lp => {
                            const pObj = (packages || []).find(p => p.package_id === lp.package_id);
                            const key = lp.package_id || lp.lead_package_id || 'default';
                            return {
                              ...lp,
                              package_key: key,
                              package_name: lp.package_name || pObj?.package_name || 'Premium Shoot Package',
                              package_cost: Number(lp.package_cost)
                            };
                          })
                        : [
                            {
                              package_key: `default_${selectedLead.lead_id}`,
                              package_name: `${selectedLead.event_type} High-End Shoot Package`,
                              package_cost: selectedLead.budget
                            }
                          ];

                      const subtotalValue = activePackagesToRender.reduce((acc, p) => acc + Number(p.package_cost), 0);
                      const totalQuoteValue = subtotalValue + quoteAdditional - quoteDiscount;

                      const handleCreateQuote = () => {
                        const qNum = `QT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
                        setActiveQuoteNum(qNum);
                        
                        // Directly generate a premium PDF blob to keep in-memory
                        const doc = generateQuotationPDF(
                          selectedLead,
                          activePackagesToRender,
                          qNum,
                          quotationTerms,
                          logoBase64,
                          editableInclusions,
                          editableDeliverables,
                          quoteDiscount,
                          quoteAdditional
                        );
                        const pdfBlob = doc.output('blob');
                        const blobUrl = URL.createObjectURL(pdfBlob);
                        setGeneratedPDFBlobUrl(blobUrl);

                        // Update lead status to quotation generated/sent
                        updateLead(selectedLead.lead_id, { status: 'Quotation Sent' });
                      };

                      const handleViewPDF = () => {
                        if (!activeQuoteNum) return;
                        const doc = generateQuotationPDF(
                          selectedLead,
                          activePackagesToRender,
                          activeQuoteNum,
                          quotationTerms,
                          logoBase64,
                          editableInclusions,
                          editableDeliverables,
                          quoteDiscount,
                          quoteAdditional
                        );
                        const pdfBlob = doc.output('blob');
                        const blobUrl = URL.createObjectURL(pdfBlob);
                        window.open(blobUrl, '_blank');
                      };

                      const handleDownloadPDF = () => {
                        if (!activeQuoteNum) return;
                        const doc = generateQuotationPDF(
                          selectedLead,
                          activePackagesToRender,
                          activeQuoteNum,
                          quotationTerms,
                          logoBase64,
                          editableInclusions,
                          editableDeliverables,
                          quoteDiscount,
                          quoteAdditional
                        );
                        doc.save(`Quotation_${activeQuoteNum}.pdf`);
                      };

                      const handleWhatsAppShare = () => {
                        if (!activeQuoteNum) return;
                        const packageList = activePackagesToRender.map(p => `• ${p.package_name}`).join('\n');
                        const message = `Hello *${selectedLead.customer_name}*! 💍🌟\n\nHere is your premium wedding/event shoot quotation from *Photocrew Pictures* for your upcoming *${selectedLead.event_type}* shoot on *${selectedLead.event_date}*.\n\n*Quotation Details:*\n📄 Quotation #: ${activeQuoteNum}\n💰 Final Quote Value: ₹${totalQuoteValue.toLocaleString('en-IN')}\n\nWe have generated your detailed quotation PDF. Looking forward to capturing your beautiful lifetime memories!\n\nWarm regards,\n*Photocrew Pictures Team*\n+91 9060144016\nwww.photocrewpictures.com`;
                        
                        const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(selectedLead.mobile)}&text=${encodeURIComponent(message)}`;
                        window.open(url, '_blank');
                      };

                      return (
                        <div className="space-y-4">
                          {!activeQuoteNum ? (
                            <div className="space-y-4">
                              <div className="text-[11px] text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 leading-relaxed text-left">
                                <span className="font-bold text-amber-500 block mb-0.5">✨ Sales Team Suite</span>
                                Customize the packages, inclusions, deliverables, prices, and terms dynamically here. Updates will map onto the generated PDF in real-time.
                              </div>

                              {/* LIST EDITORS */}
                              <div className="space-y-4">
                                {activePackagesToRender.map((pkg) => {
                                  const pkgKey = pkg.package_key;
                                  const inclusions = editableInclusions[pkgKey] || [];
                                  const deliverables = editableDeliverables[pkgKey] || [];

                                  return (
                                    <div key={pkgKey} className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 space-y-4 text-left">
                                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                        <span className="font-bold text-amber-450 text-xs uppercase tracking-wide">📦 {pkg.package_name}</span>
                                        <span className="text-xs text-slate-355 font-bold font-mono">₹{Number(pkg.package_cost).toLocaleString('en-IN')}</span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                        {/* Package Includes Block */}
                                        <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-800/60 space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Inclusions List:</span>
                                          </div>
                                          <div className="space-y-1">
                                            {inclusions.map((inc, idx) => (
                                              <div key={idx} className="flex items-center gap-1.5 group">
                                                <span className="text-emerald-500 text-[11px] font-bold">✓</span>
                                                <input
                                                  type="text"
                                                  value={inc}
                                                  onChange={(e) => handleEditInclusion(pkgKey, idx, e.target.value)}
                                                  className="bg-transparent border-b border-transparent hover:border-slate-800 focus:border-slate-700 focus:outline-none transition-all py-0.5 text-[11px] text-slate-200 w-full"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveInclusion(pkgKey, idx)}
                                                  className="text-slate-400 hover:text-red-400 opacity-20 group-hover:opacity-100 transition-all text-sm px-1 cursor-pointer"
                                                  title="Remove Item"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Inline Add Component */}
                                          <div className="flex gap-1.5 pt-1.5">
                                            <input
                                              id={`new_inc_input_${pkgKey}`}
                                              type="text"
                                              placeholder="Add new item..."
                                              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] w-full text-slate-300 focus:outline-none focus:border-slate-700"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const val = e.currentTarget.value;
                                                  if (val) {
                                                    handleAddInclusion(pkgKey, val);
                                                    e.currentTarget.value = '';
                                                  }
                                                }
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const el = document.getElementById(`new_inc_input_${pkgKey}`) as HTMLInputElement;
                                                if (el && el.value) {
                                                  handleAddInclusion(pkgKey, el.value);
                                                  el.value = '';
                                                }
                                              }}
                                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-[10px] cursor-pointer font-semibold transition-all"
                                            >
                                              Add
                                            </button>
                                          </div>
                                        </div>

                                        {/* Deliverables Block */}
                                        <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-800/60 space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Deliverables Scope:</span>
                                          </div>
                                          <div className="space-y-1">
                                            {deliverables.map((del, idx) => (
                                              <div key={idx} className="flex items-center gap-1.5 group">
                                                <span className="text-emerald-500 text-[11px] font-bold">✓</span>
                                                <input
                                                  type="text"
                                                  value={del}
                                                  onChange={(e) => handleEditDeliverable(pkgKey, idx, e.target.value)}
                                                  className="bg-transparent border-b border-transparent hover:border-slate-800 focus:border-slate-700 focus:outline-none transition-all py-0.5 text-[11px] text-slate-200 w-full"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveDeliverable(pkgKey, idx)}
                                                  className="text-slate-400 hover:text-red-400 opacity-20 group-hover:opacity-100 transition-all text-sm px-1 cursor-pointer"
                                                  title="Remove Deliverable"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Inline Add Deliverable */}
                                          <div className="flex gap-1.5 pt-1.5">
                                            <input
                                              id={`new_del_input_${pkgKey}`}
                                              type="text"
                                              placeholder="Add new deliverable..."
                                              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] w-full text-slate-300 focus:outline-none focus:border-slate-700"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const val = e.currentTarget.value;
                                                  if (val) {
                                                    handleAddDeliverable(pkgKey, val);
                                                    e.currentTarget.value = '';
                                                  }
                                                }
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const el = document.getElementById(`new_del_input_${pkgKey}`) as HTMLInputElement;
                                                if (el && el.value) {
                                                  handleAddDeliverable(pkgKey, el.value);
                                                  el.value = '';
                                                }
                                              }}
                                              className="bg-slate-800 hover:bg-slate-700 text-slate-305 border border-slate-700 px-3 py-1 rounded-lg text-[10px] cursor-pointer font-semibold transition-all"
                                            >
                                              Add
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* FINANCIAL MODIFIERS */}
                              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 space-y-3.5 text-left">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">💰 Price Controls & Overrides:</span>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase font-mono tracking-wide">Addl. Services Cost (₹)</label>
                                    <input
                                      type="number"
                                      value={quoteAdditional || ''}
                                      onChange={(e) => setQuoteAdditional(Math.max(0, parseInt(e.target.value) || 0))}
                                      placeholder="0"
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-amber-400 font-mono focus:outline-none focus:border-slate-700 font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase font-mono tracking-wide">Discount Amount (₹)</label>
                                    <input
                                      type="number"
                                      value={quoteDiscount || ''}
                                      onChange={(e) => setQuoteDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                                      placeholder="0"
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-rose-400 font-mono focus:outline-none focus:border-slate-700 font-bold"
                                    />
                                  </div>
                                </div>

                                <div className="border-t border-slate-800/80 pt-3 space-y-1.5 text-[11px] font-mono leading-relaxed">
                                  <div className="flex justify-between text-slate-400">
                                    <span>Base Package Value</span>
                                    <span>₹{subtotalValue.toLocaleString('en-IN')}</span>
                                  </div>
                                  {quoteAdditional > 0 && (
                                    <div className="flex justify-between text-amber-500">
                                      <span>+ Additional charges</span>
                                      <span>+₹{quoteAdditional.toLocaleString('en-IN')}</span>
                                    </div>
                                  )}
                                  {quoteDiscount > 0 && (
                                    <div className="flex justify-between text-rose-400">
                                      <span>- Custom discount</span>
                                      <span>-₹{quoteDiscount.toLocaleString('en-IN')}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-white border-t border-slate-800/60 pt-2.5 font-bold font-sans">
                                    <span className="text-slate-300 text-xs uppercase tracking-wide">Final Proposal Quotation</span>
                                    <span className="text-amber-450 text-sm font-black font-mono">₹{totalQuoteValue.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              </div>

                              {/* TERMS & CONDITIONS BLOCK */}
                              <div className="space-y-1.5 text-left">
                                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                  Quotation Terms & Conditions (Editable)
                                </label>
                                <textarea
                                  value={quotationTerms}
                                  onChange={(e) => setQuotationTerms(e.target.value)}
                                  rows={4}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[10.5px] text-slate-300 font-mono focus:border-slate-700 focus:outline-none leading-relaxed"
                                  placeholder="Type Terms Clauses..."
                                />
                              </div>

                              {/* GENERATE ACTION */}
                              <button
                                type="button"
                                onClick={handleCreateQuote}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold py-3 px-4 rounded-xl shadow-lg transition-all text-xs cursor-pointer tracking-wider text-center uppercase"
                              >
                                <span>Generate Quotation Proposal</span>
                              </button>
                            </div>
                          ) : (
                            /* PREMIUM DRAFT PREVIEW & SIMPLE PDF ACTIONS */
                            <div className="space-y-4">
                              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-xl border border-slate-800 text-left space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-804">
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Live Proposal Code:</span>
                                    <strong className="text-amber-500 block font-mono text-xs">{activeQuoteNum}</strong>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Quoted Price:</span>
                                    <strong className="text-white block font-mono text-xs">₹{totalQuoteValue.toLocaleString('en-IN')}</strong>
                                  </div>
                                </div>

                                {/* Standard PDF actions requested by the user: Preview, Download, WhatsApp Share in single row layout */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                  <button
                                    type="button"
                                    onClick={handleViewPDF}
                                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-4 rounded-xl border border-slate-700 transition-all cursor-pointer font-bold text-[11px] uppercase tracking-wider shadow-sm hover:text-white"
                                  >
                                    <span>👁️</span> PREVIEW PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleDownloadPDF}
                                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-4 rounded-xl border border-slate-700 transition-all cursor-pointer font-bold text-[11px] uppercase tracking-wider shadow-sm hover:text-white"
                                  >
                                    <span>📥</span> DOWNLOAD PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleWhatsAppShare}
                                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer text-[11px] uppercase tracking-wider"
                                  >
                                    <span>💬</span> WHATSAPP SHARE
                                  </button>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-slate-800/80 text-[10px]">
                                  <span className="text-slate-500 font-mono">Timestamp: {new Date().toLocaleDateString('en-IN')}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveQuoteNum('');
                                      setGeneratedPDFBlobUrl('');
                                    }}
                                    className="text-amber-400 hover:text-amber-300 font-extrabold transition-all text-right uppercase tracking-wider cursor-pointer flex items-center gap-1"
                                  >
                                    ✏️ EDIT PACKAGE DETAILS & PRICING
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* COLUMN 2 : ACTIVITY LOGGER & AUDIT LOGS */}
                <div className="lg:col-span-12 xl:col-span-4 space-y-5">
                  <div className="bg-slate-850/60 rounded-xl border border-slate-800 p-5 space-y-4">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 pb-2.5 border-b border-slate-800 uppercase tracking-widest font-mono">
                      <span>📝</span> CRM Notes & Follow-up
                    </h3>

                    {canEdit ? (
                      <form onSubmit={handleFollowUpSubmit} className="space-y-4">
                        <div className="space-y-4 text-left">
                          {/* Status select */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
                              Transition ERP Stage *
                            </label>
                            <select
                              value={followUpForm.status}
                              onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value as CurrentStage })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-slate-700"
                            >
                              <option value="Follow Up">Follow Up</option>
                              <option value="Quotation Sent">Quotation Sent</option>
                              <option value="Negotiation">Negotiation</option>
                              <option value="Order Confirmed">Order Confirmed</option>
                            </select>
                          </div>
                        </div>

                        {followUpForm.status === 'Order Confirmed' ? (
                          <div className="space-y-4 pt-2 border-t border-slate-800 text-left">
                            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Configure Confirmed Order Settings</h4>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                  Event Date * (Required)
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={followUpForm.event_date}
                                  onChange={(e) => setFollowUpForm({ ...followUpForm, event_date: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                  Event Time * (Required)
                                </label>
                                <input
                                  type="time"
                                  required
                                  value={followUpForm.event_time}
                                  onChange={(e) => setFollowUpForm({ ...followUpForm, event_time: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                  Reporting Time * (Required)
                                </label>
                                <input
                                  type="time"
                                  required
                                  value={followUpForm.reporting_time}
                                  onChange={(e) => setFollowUpForm({ ...followUpForm, reporting_time: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                  Final Amount (₹) *
                                </label>
                                <input
                                  type="number"
                                  required
                                  value={followUpForm.quotation_amount}
                                  onChange={(e) => setFollowUpForm({ ...followUpForm, quotation_amount: Number(e.target.value) })}
                                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                  Advance Amount Received (₹)
                                </label>
                                <input
                                  type="number"
                                  value={followUpForm.advance_received}
                                  onChange={(e) => setFollowUpForm({ ...followUpForm, advance_received: Number(e.target.value) })}
                                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                  Payment Mode
                                </label>
                                <select
                                  value={followUpForm.payment_mode}
                                  onChange={(e) => setFollowUpForm({ ...followUpForm, payment_mode: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="UPI">UPI (GPay/PhonePe)</option>
                                  <option value="Cash">Cash Handover</option>
                                  <option value="Bank Transfer">Bank NFT/RTGS/IMPS</option>
                                  <option value="Card">Credit/Debit Card</option>
                                  <option value="Cheque">Cheque Deposit</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-4 text-left">
                              {/* Date picker */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
                                  Next Follow-up Action Date *
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={followUpForm.next_follow_up_date}
                                  onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_date: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-slate-700"
                                />
                              </div>

                              {/* Quotation amount */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
                                  Negotiated Quotation Amount (₹) *
                                </label>
                                <input
                                  type="number"
                                  required
                                  value={followUpForm.quotation_amount}
                                  onChange={(e) => setFollowUpForm({ ...followUpForm, quotation_amount: Number(e.target.value) })}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-slate-700"
                                />
                              </div>
                            </div>

                            {/* Conversation/Notes */}
                            <div className="text-left">
                              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
                                Call / Conversation Notes *
                              </label>
                              <textarea
                                rows={3}
                                required
                                placeholder="Log customer concerns, callbacks or package details."
                                value={followUpForm.call_notes}
                                onChange={(e) => setFollowUpForm({ ...followUpForm, call_notes: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-zinc-100 font-sans focus:outline-none focus:border-slate-700"
                              ></textarea>
                            </div>

                            {/* Negotiation notes */}
                            <div className="text-left">
                              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
                                Negotiation Notes (Optional)
                              </label>
                              <input
                                type="text"
                                placeholder="Price offsets, justifications..."
                                value={followUpForm.negotiation_notes}
                                onChange={(e) => setFollowUpForm({ ...followUpForm, negotiation_notes: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-zinc-100 focus:outline-none focus:border-slate-700"
                              />
                            </div>
                          </>
                        )}

                        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800 font-bold">
                          <button
                            type="button"
                            onClick={() => setSelectedLead(null)}
                            className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-305 rounded-lg cursor-pointer border border-slate-700 font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 text-xs bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg shadow-sm cursor-pointer font-bold"
                          >
                            {followUpForm.status === 'Order Confirmed' ? '💍 Confirm Order booking' : 'Save Follow-up Notes'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                        <Ban className="w-8 h-8 text-slate-650 mx-auto" />
                        <h4 className="text-xs font-semibold text-slate-355">Access Restricted</h4>
                        <p className="text-[10px] leading-relaxed max-w-sm mx-auto">
                          Only the **Sales Team** or the **Business Owner** possess authorized write clearances to log client interaction updates. Keep testing with another persona.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Payment Collection Status Section */}
                  {(() => {
                    const associatedOrder = orders.find(o => o.lead_id === selectedLead.lead_id);
                    if (!associatedOrder) return null;
                    const p = payments?.find(pay => pay.order_id === associatedOrder.order_id);
                    if (!p) return null;

                    const optionVal = p.payment_collection_status || (p.payment_status === 'Fully Paid' ? 'Full Payment Received' : p.payment_status === 'Partially Paid' ? 'Partial Payment Received' : 'Payment Pending');

                    return (
                      <div className="bg-slate-850/65 rounded-xl border border-slate-800 p-5 space-y-4">
                        <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 pb-2.5 border-b border-slate-805">
                          <span>💰</span> Payment Collection Status
                        </span>
                        
                        <div className="bg-slate-900/45 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-[11px] text-slate-300">
                          <div className="flex justify-between border-b border-indigo-500/10 pb-2">
                            <span className="text-slate-450">Collection Option:</span>
                            <span className="font-extrabold text-amber-400 uppercase tracking-wide">{optionVal}</span>
                          </div>

                          {optionVal === 'Full Payment Received' && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-slate-455 text-[10px]">Total Amount:</span>
                                <span className="font-bold text-white">₹{p.quotation_amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-455 text-[10px]">Amount Received:</span>
                                <span className="font-bold text-emerald-450">₹{p.quotation_amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-900">
                                <span className="text-slate-455 text-[10px]">Payment Status:</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold uppercase">Paid</span>
                              </div>
                            </div>
                          )}

                          {optionVal === 'Partial Payment Received' && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-slate-455 text-[10px]">Total Amount:</span>
                                <span className="font-bold text-white">₹{p.quotation_amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-455 text-[10px]">Advance Amount:</span>
                                <span className="font-bold text-slate-400">₹{p.advance_received.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-455 text-[10px]">Additional Amount Received:</span>
                                <span className="font-bold text-emerald-450">₹{(p.additional_received || p.final_payment_received || 0).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-900">
                                <span className="text-slate-455 text-[10px]">Remaining Amount:</span>
                                <span className="font-bold text-amber-500">₹{p.balance_due.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between pt-1">
                                <span className="text-slate-455 text-[10px]">Status:</span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-300/15 text-[9px] font-extrabold uppercase">Partial Payment</span>
                              </div>
                            </div>
                          )}

                          {optionVal === 'Payment Pending' && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-slate-455 text-[10px]">Total Amount:</span>
                                <span className="font-bold text-white">₹{p.quotation_amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-455 text-[10px]">Advance Received:</span>
                                <span className="font-bold text-slate-400">₹{p.advance_received.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-900 text-red-405">
                                <span className="text-slate-455 text-[10px]">Remaining Amount Pending:</span>
                                <span className="font-bold text-red-405">₹{p.balance_due.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between pt-1">
                                <span className="text-slate-455 text-[10px]">Status:</span>
                                <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500/35 border border-red-500/20 text-[9px] font-extrabold uppercase header-f">Payment Pending</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Remarks & Live Audits Log + Order Confirmation Block */}
                  <div className="bg-slate-850/60 rounded-xl border border-slate-800 p-5 space-y-4">
                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
                      <span>📜</span> Remarks & Live Audits Log
                    </span>
                    <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 font-mono text-[10.5px] text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {selectedLead.remarks || 'No remarks recorded.'}
                    </div>
                    
                    {/* Convert Lead button directly below the log */}
                    {canEdit && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowConfirmModal(true)}
                          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3 px-4 rounded-xl shadow-lg text-xs transition-all cursor-pointer uppercase tracking-wider border border-emerald-500/15"
                        >
                          <CheckSquare className="w-4.5 h-4.5" />
                          <span>CONFIRM ORDER CONTRACT</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Existing Customer Detection Pop-up */}
      {showDetectionPopup && detectedCustomer && (
        <div id="modal_existing_customer_detection" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl w-full max-w-lg shadow-2xl relative p-6 space-y-5">
            {/* Ambient light ring */}
            <div className="absolute top-0 left-12 w-48 h-48 bg-indigo-500/[0.03] rounded-full blur-[60px] pointer-events-none" />

            <div className="flex items-start justify-between border-b border-slate-800 pb-3 relative z-10">
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest font-mono flex items-center gap-1.5">
                  <span className="p-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] rounded font-black font-mono">DUPLICATION WARNING</span>
                  <span>EXISTING CUSTOMER DETECTED</span>
                </h3>
                <p className="text-[11px] text-indigo-300 mt-0.5 font-sans">
                  The phone index or email graph entered already maps to an active account.
                </p>
              </div>
              <button 
                onClick={() => { setShowDetectionPopup(false); setDetectedCustomer(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 relative z-10 text-slate-300">
              {/* Profile Card Summary */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-500 bg-slate-850 px-2 py-0.5 border border-slate-750 rounded font-black">
                    {detectedCustomer.customer_id}
                  </span>
                  <span className="text-[9px] bg-slate-850 text-slate-400 px-2 py-0.5 rounded border border-slate-750 font-mono">
                    Last Event: {detectedCustomer.lastEventDate || 'N/A'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white">{detectedCustomer.customer_name}</h4>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-x-3 gap-y-1 flex-wrap">
                    <span>{detectedCustomer.email}</span>
                    <span>•</span>
                    <span>{formatIndianPhoneNumber(detectedCustomer.mobile)}</span>
                  </div>
                </div>

                {/* Key Retention KPIs */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/50 text-xs text-left">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-mono">PREVIOUS ORDERS</span>
                    <strong className="text-slate-200 font-black font-mono">{detectedCustomer.totalOrders} Contracts</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-mono">TOTAL REVENUE (CLV)</span>
                    <strong className="text-emerald-455 font-black font-mono">{formatINR(detectedCustomer.totalRevenue)}</strong>
                  </div>
                </div>
              </div>

              {/* Packages badge roster */}
              {detectedCustomer.previousPackages.length > 0 && (
                <div className="space-y-1.5 text-left">
                  <span className="text-[9px] text-slate-550 uppercase font-bold tracking-wider font-mono">PREVIOUS PACKAGES UNDERTAKINGS:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedCustomer.previousPackages.map((pkg: string, i: number) => (
                      <span key={pkg + i} className="bg-slate-900 border border-slate-800 px-2 py-0.5 text-[9px] font-mono rounded text-slate-400">
                        {pkg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* REORDER MODE TOGGLE SEGMENT */}
              {isQuickReorderView ? (
                <div className="bg-slate-900 border border-indigo-500/25 p-3 rounded-xl space-y-3 animate-fade-in-up text-left">
                  <span className="text-[9px] font-black text-indigo-400 tracking-widest font-mono block">CONFIGURE QUICK REORDER PACKAGE</span>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Shoot Category</label>
                      <select
                        value={reorderForm.event_type}
                        onChange={(e) => setReorderForm({ ...reorderForm, event_type: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                      >
                        <option value="Wedding Shoot">Wedding Shoot</option>
                        <option value="Pre-Wedding Shoot">Pre-Wedding Shoot</option>
                        <option value="Corporate Event">Corporate Event</option>
                        <option value="Birthday Banquet">Birthday Banquet</option>
                        <option value="Fashion Portfolio">Fashion Portfolio</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Event Plan Date *</label>
                      <input
                        type="date"
                        required
                        value={reorderForm.event_date}
                        onChange={(e) => setReorderForm({ ...reorderForm, event_date: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Contract Amount (₹)</label>
                      <input
                        type="number"
                        value={reorderForm.quotation_amount}
                        onChange={(e) => setReorderForm({ ...reorderForm, quotation_amount: Number(e.target.value), advance_received: Math.round(Number(e.target.value)/3) })}
                        className="w-full bg-slate-950 border border-slate-805 rounded px-2 py-1 text-slate-200 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Advance Received (₹)</label>
                      <input
                        type="number"
                        value={reorderForm.advance_received}
                        onChange={(e) => setReorderForm({ ...reorderForm, advance_received: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-805 rounded px-2 py-1 text-slate-205 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-800 pt-2 text-[11px]">
                    <button 
                      type="button" 
                      onClick={() => setIsQuickReorderView(false)} 
                      className="px-3 py-1 bg-slate-800 text-slate-400 rounded hover:text-slate-200 cursor-pointer"
                    >
                      Refuse
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleExecuteQuickReorder(detectedCustomer)} 
                      className="px-3 py-1 bg-indigo-650 text-white rounded font-bold cursor-pointer"
                    >
                      Finalize Reorder Project
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic text-left">
                  Tip: Bypassing manual typing and booking a new event will keep the legacy events intact in client timeline record history.
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 p-1 border-t border-slate-800">
              {!isQuickReorderView && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      // Autofill name and other details back to the createForm
                      setCreateForm(prev => ({
                        ...prev,
                        customer_name: detectedCustomer.customer_name,
                        email: detectedCustomer.email,
                        alternate_mobile: detectedCustomer.alternate_mobile || '',
                      }));
                      setShowDetectionPopup(false);
                      setDetectedCustomer(null);
                    }}
                    className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-700 rounded-lg cursor-pointer transition-all font-bold"
                  >
                    Auto-Fill Contact Info
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickReorderView(true);
                      // Set default reorder date
                      const tomorrowStr = new Date();
                      tomorrowStr.setDate(tomorrowStr.getDate() + 30);
                      setReorderForm(prev => ({
                        ...prev,
                        event_date: tomorrowStr.toISOString().split('T')[0]
                      }));
                    }}
                    className="px-4 py-2 text-xs bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-505 hover:to-indigo-605 text-white rounded-lg shadow-md cursor-pointer transition-all font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Repeat Reorder</span>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* GLOBAL MODALS ACCESSIBLE CROSS-TAB */}
      
      {/* 1. Global Read-Only View Details Modal wrapped in createPortal to overlay on top of any active portals (like Screen 2 Create Lead) */}
      {viewingPkgDetails && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left text-xs bg-black/60">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl relative text-slate-300">
            
            {!viewingPkgDetails.package_name ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                <span className="text-3xl text-rose-550">⚠️</span>
                <h4 className="text-sm font-bold text-slate-100">Package details not available.</h4>
                <p className="text-xs text-slate-400">The requested package specifications could not be resolved or found.</p>
                <button
                  type="button"
                  onClick={() => setViewingPkgDetails(null)}
                  className="px-4 py-2 bg-emerald-605 hover:bg-emerald-505 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (() => {
              // Internal parser helpers
              const getDeliverableValue = (pkg: any, key: string) => {
                const text = (pkg.deliverables || '').toLowerCase();
                const name = (pkg.package_name || '').toLowerCase();
                
                if (key === 'photos') {
                  const matches = pkg.deliverables?.match(/(\d+\s+edited\s+photos|\d+\+?\s+photos|unlimited\s+photos)/i);
                  if (matches) return matches[0];
                  if (text.includes('photographer') || text.includes('photos')) {
                    const sentences = pkg.deliverables.split(',').map((s: string) => s.trim());
                    const match = sentences.find((s: string) => s.toLowerCase().includes('photographer') || s.toLowerCase().includes('photo') || s.toLowerCase().includes('candid'));
                    if (match) return match;
                  }
                  return 'Standard High-Res Edited Digital Photos';
                }

                if (key === 'videos') {
                  if (text.includes('video') || text.includes('videographer') || text.includes('cinematic') || text.includes('teaser')) {
                    const sentences = pkg.deliverables.split(',').map((s: string) => s.trim());
                    const match = sentences.find((s: string) => s.toLowerCase().includes('video') || s.toLowerCase().includes('videographer') || s.toLowerCase().includes('cinematic') || s.toLowerCase().includes('teaser'));
                    if (match) return match;
                    return '4K Cinematic Highlight Video';
                  }
                  return 'Not Included';
                }

                if (key === 'reels') {
                  if (text.includes('reels') || text.includes('reel') || text.includes('short')) {
                    const sentences = pkg.deliverables.split(',').map((s: string) => s.trim());
                    const match = sentences.find((s: string) => s.toLowerCase().includes('reel') || s.toLowerCase().includes('short'));
                    if (match) return match;
                    return 'Reels Package Included';
                  }
                  if (name.includes('platinum') || name.includes('diamond')) {
                    return 'Complimentary social reels package included';
                  }
                  return 'Not Included';
                }

                if (key === 'album') {
                  if (text.includes('album') || text.includes('book') || text.includes('print')) {
                    const sentences = pkg.deliverables.split(',').map((s: string) => s.trim());
                    const match = sentences.find((s: string) => s.toLowerCase().includes('album') || s.toLowerCase().includes('book') || s.toLowerCase().includes('print'));
                    if (match) return match;
                    return 'Standard Hardcover Photo Album';
                  }
                  return 'Not Included';
                }

                if (key === 'frames') {
                  if (text.includes('frame') || text.includes('canvas')) {
                    const sentences = pkg.deliverables.split(',').map((s: string) => s.trim());
                    const match = sentences.find((s: string) => s.toLowerCase().includes('frame') || s.toLowerCase().includes('canvas'));
                    if (match) return match;
                    return '1 Wall Frame / Canvas Print';
                  }
                  if (name.includes('platinum') || name.includes('diamond')) {
                    return '1 Large Dynamic Acrylic Wall Frame';
                  }
                  return 'Not Included';
                }

                return 'N/A';
              };

              const getTeamValue = (pkg: any, key: string) => {
                const text = ((pkg.team_members || '') + ' ' + (pkg.deliverables || '')).toLowerCase();
                
                if (key === 'photographer') {
                  if (text.includes('candid photographer') && text.includes('traditional photographer')) {
                    return '2 Photographers (1 Candid, 1 Traditional)';
                  }
                  if (text.includes('candid photographer') || text.includes('candid')) {
                    return '1 Professional Candid Photographer';
                  }
                  if (text.includes('traditional photographer')) {
                    return '1 Traditional Photographer';
                  }
                  if (text.includes('photographer')) {
                    const matches = text.match(/(\d+)\s+photographer/i);
                    return matches ? `${matches[1]} Lead Photographer(s)` : '1 Professional Photographer';
                  }
                  return '1 Professional Photographer';
                }

                if (key === 'videographer') {
                  if (text.includes('cinematographer') && text.includes('traditional videographer')) {
                    return '2 Videographers (1 Cinema, 1 Traditional)';
                  }
                  if (text.includes('cinematographer') || text.includes('cinematic videographer') || text.includes('cinematic')) {
                    return '1 Cinematic Videographer (4K Cinematic)';
                  }
                  if (text.includes('traditional videographer') || text.includes('videographer')) {
                    return '1 Traditional Videographer';
                  }
                  if (pkg.category?.toLowerCase().includes('photo') && !text.includes('video')) {
                    return '0 (Photography Only Package)';
                  }
                  return '1 Professional Videographer';
                }

                if (key === 'drone') {
                  if (text.includes('drone') || text.includes('aerial')) {
                    return '1 Certified Drone Pilot (Cinematic 4K Aerials)';
                  }
                  return '0 (Available as Premium Add-on)';
                }

                if (key === 'assistant') {
                  if (text.includes('assistant') || text.includes('lights') || text.includes('production manager')) {
                    return '1 Technical Field Assistant';
                  }
                  const crewMatch = text.match(/(\d+)\s+crew/i);
                  if (crewMatch) {
                    const total = parseInt(crewMatch[1], 10);
                    if (total > 3) return '1/2 Setup & Lights Assistants';
                  }
                  return '0 (Standard Crew Allocation)';
                }

                return 'N/A';
              };

              const getCoverageValue = (pkg: any, key: string) => {
                const cat = (pkg.category || '').toLowerCase();
                const name = (pkg.package_name || '').toLowerCase();

                if (key === 'hours') {
                  if (name.includes('pre-wedding') || name.includes('shoot') || name.includes('interior') || name.includes('product')) {
                    return '3 to 5 Event Shoot Hours';
                  }
                  if (name.includes('platinum') || name.includes('diamond')) {
                    return 'Continuous Coverage (Up to 12 Hours)';
                  }
                  return 'Full Day (8 to 10 Hours)';
                }

                if (key === 'events') {
                  if (name.includes('platinum') || name.includes('diamond')) {
                    return 'Multi-event Coverage (Pre-wedding + Wedding covered)';
                  }
                  return '1 Main Day Event Coverage';
                }

                if (key === 'type') {
                  if (cat.includes('outdoor') || name.includes('outdoor')) {
                    return 'Exclusively Outdoor Locations';
                  }
                  if (cat.includes('interior') || name.includes('indoor') || name.includes('interior')) {
                    return 'Fully Indoor / Controlled Studio / Residential';
                  }
                  return 'Hybrid (Both Indoor Banquet & Outdoor Garden/Mandap)';
                }

                return 'N/A';
              };

              const getOffersValue = (pkg: any, key: string) => {
                const offer = pkg.seasonal_offer || '';
                
                if (key === 'seasonal') {
                  if (offer && offer !== 'None') return offer;
                  return 'No seasonal discount currently active';
                }

                if (key === 'complimentary') {
                  if (offer.toLowerCase().includes('complimentary') || offer.toLowerCase().includes('free')) {
                    return offer;
                  }
                  const price = pkg.price || 0;
                  if (price > 120000) {
                    return 'Complimentary Pre-Wedding Teaser videography & 1 Framed Canvas Print';
                  }
                  if (price > 80000) {
                    return 'Complimentary Wedding Film Teaser (1-min Reels Cut)';
                  }
                  return 'Standard Package Deliverables Apply';
                }

                return 'N/A';
              };

              const photosVal = getDeliverableValue(viewingPkgDetails, 'photos');
              const videosVal = getDeliverableValue(viewingPkgDetails, 'videos');
              const reelsVal = getDeliverableValue(viewingPkgDetails, 'reels');
              const albumVal = getDeliverableValue(viewingPkgDetails, 'album');
              const framesVal = getDeliverableValue(viewingPkgDetails, 'frames');

              const photographerVal = getTeamValue(viewingPkgDetails, 'photographer');
              const videographerVal = getTeamValue(viewingPkgDetails, 'videographer');
              const droneVal = getTeamValue(viewingPkgDetails, 'drone');
              const assistantVal = getTeamValue(viewingPkgDetails, 'assistant');

              const hoursVal = getCoverageValue(viewingPkgDetails, 'hours');
              const eventsVal = getCoverageValue(viewingPkgDetails, 'events');
              const typeVal = getCoverageValue(viewingPkgDetails, 'type');

              const seasonalVal = getOffersValue(viewingPkgDetails, 'seasonal');
              const complimentaryVal = getOffersValue(viewingPkgDetails, 'complimentary');

              return (
                <>
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-800 pb-3.5">
                    <div>
                      <span className="font-mono text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
                        ID: {viewingPkgDetails.package_id || 'Dynamic Link'}
                      </span>
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-100 font-sans tracking-tight">
                        📋 {viewingPkgDetails.package_name || 'Package Specifications'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded ${
                        viewingPkgDetails.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {viewingPkgDetails.status || 'Active'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewingPkgDetails(null)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
                        title="Close Modal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pricing and Category Banner */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <div>
                      <span className="text-slate-550 block font-bold text-[9px] uppercase font-mono mb-0.5">Category Group</span>
                      <span className="text-indigo-400 font-bold text-xs">{viewingPkgDetails.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-550 block font-bold text-[9px] uppercase font-mono mb-0.5">Standard Package Rate</span>
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        ₹{viewingPkgDetails.price ? viewingPkgDetails.price.toLocaleString('en-IN') : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Custom Info Banner */}
                  {(viewingPkgDetails.event_type || viewingPkgDetails.duration || viewingPkgDetails.package_includes) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-xs">
                      {viewingPkgDetails.event_type && (
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-mono font-semibold mb-0.5">Event Type</span>
                          <span className="text-slate-200 font-medium">{viewingPkgDetails.event_type}</span>
                        </div>
                      )}
                      {viewingPkgDetails.duration && (
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-mono font-semibold mb-0.5">Duration</span>
                          <span className="text-slate-200 font-medium">{viewingPkgDetails.duration}</span>
                        </div>
                      )}
                      {viewingPkgDetails.package_includes && (
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-mono font-semibold mb-0.5">Key Focus</span>
                          <span className="text-slate-200 font-medium">{viewingPkgDetails.package_includes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 max-h-[50vh] overflow-y-auto pr-1">
                    {/* Deliverables Panel */}
                    <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl space-y-2.5">
                      <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase block border-b border-slate-850 pb-1.5 flex items-center gap-1.5">
                        📦 Key Deliverables Included
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex flex-col bg-slate-900/40 p-1.5 rounded border border-transparent hover:border-slate-800/60">
                          <span className="text-slate-500 text-[10px] font-bold font-mono">Photos Included</span>
                          <span className="text-slate-200 font-semibold">{photosVal}</span>
                        </div>
                        <div className="flex flex-col bg-slate-900/40 p-1.5 rounded border border-transparent hover:border-slate-800/60">
                          <span className="text-slate-500 text-[10px] font-bold font-mono">Videos Included</span>
                          <span className="text-slate-205 font-medium">{videosVal}</span>
                        </div>
                        <div className="flex flex-col bg-slate-900/40 p-1.5 rounded border border-transparent hover:border-slate-800/60">
                          <span className="text-slate-500 text-[10px] font-bold font-mono font-mono">Reels Included</span>
                          <span className="text-slate-205 font-medium">{reelsVal}</span>
                        </div>
                        <div className="flex flex-col bg-slate-900/40 p-1.5 rounded border border-transparent hover:border-slate-800/60">
                          <span className="text-slate-500 text-[10px] font-bold font-mono">Album Included</span>
                          <span className="text-slate-205 font-medium">{albumVal}</span>
                        </div>
                        <div className="flex flex-col bg-slate-900/40 p-1.5 rounded border border-transparent hover:border-slate-800/60">
                          <span className="text-slate-500 text-[10px] font-bold font-mono">Frames Included</span>
                          <span className="text-slate-205 font-medium">{framesVal}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right column: Crew & Coverage */}
                    <div className="space-y-4">
                      {/* Crew Members */}
                      <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase block border-b border-slate-850 pb-1.5 flex items-center gap-1.5">
                          👥 Team Members Included
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-900/40 p-1.5 rounded">
                            <span className="text-slate-500 text-[9px] font-bold uppercase block mb-0.5">Photographer Count</span>
                            <span className="text-slate-250 font-medium">{photographerVal}</span>
                          </div>
                          <div className="bg-slate-900/40 p-1.5 rounded">
                            <span className="text-slate-500 text-[9px] font-bold uppercase block mb-0.5">Videographer Count</span>
                            <span className="text-slate-250 font-medium">{videographerVal}</span>
                          </div>
                          <div className="bg-slate-900/40 p-1.5 rounded">
                            <span className="text-slate-500 text-[9px] font-bold uppercase block mb-0.5">Drone Operator Count</span>
                            <span className="text-slate-250 font-medium">{droneVal}</span>
                          </div>
                          <div className="bg-slate-900/40 p-1.5 rounded">
                            <span className="text-slate-500 text-[9px] font-bold uppercase block mb-0.5">Assistant Count</span>
                            <span className="text-slate-250 font-medium">{assistantVal}</span>
                          </div>
                        </div>
                      </div>

                      {/* Coverage details */}
                      <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase block border-b border-slate-850 pb-1.5 flex items-center gap-1.5">
                          📸 Coverage Details
                        </span>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded">
                            <span className="text-slate-450 font-medium">Event Coverage Hours</span>
                            <span className="text-slate-200 font-bold">{hoursVal}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded">
                            <span className="text-slate-450 font-medium">Number of Events Covered</span>
                            <span className="text-slate-200 font-bold">{eventsVal}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded">
                            <span className="text-slate-450 font-medium">Outdoor/Indoor Coverage</span>
                            <span className="text-slate-200 font-bold">{typeVal}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Offers & Perks */}
                  <div className="bg-indigo-950/15 border border-indigo-900/40 p-3.5 rounded-xl space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-wider uppercase block border-b border-indigo-950 pb-1">
                      🎁 Package Offers & complimentary Items
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      <div>
                        <span className="text-slate-500 text-[9px] font-bold uppercase block">Seasonal Offer</span>
                        <span className="text-indigo-300 font-semibold">{seasonalVal}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[9px] font-bold uppercase block">Complimentary Items</span>
                        <span className="text-amber-400 font-semibold">{complimentaryVal}</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="bg-slate-950/30 border border-slate-850 rounded-xl p-3.5 space-y-1.5 text-xs">
                    <span className="text-slate-505 block font-bold text-[9px] uppercase font-mono tracking-wider">
                      📑 Contractual Terms & conditions
                    </span>
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-850 max-h-24 overflow-y-auto leading-relaxed text-slate-350">
                      {viewingPkgDetails.terms_conditions || (
                        <p className="italic text-slate-500 font-sans">
                          Standard photo studio service guidelines apply: 50% advance for confirmation, 35% on event day, and 15% during delivery. Extra coverage hours chargeable.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-800">
                    {canEdit && activeTab === 'packages' && (
                      <button
                        type="button"
                        onClick={() => {
                          const pkg = viewingPkgDetails;
                          setEditingPackage(pkg);
                          setPkgForm({
                            package_name: pkg.package_name,
                            category: pkg.category,
                            price: pkg.price,
                            status: pkg.status,
                            deliverables: pkg.deliverables || '',
                            team_members: pkg.team_members || '',
                            seasonal_offer: pkg.seasonal_offer || '',
                            terms_conditions: pkg.terms_conditions || '',
                            event_type: pkg.event_type || '',
                            duration: pkg.duration || '',
                            package_includes: pkg.package_includes || ''
                          });
                          setIsAddFormOpen(false);
                          setViewingPkgDetails(null);
                        }}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-lg border border-slate-700 cursor-pointer transition-all text-xs"
                      >
                        Edit Details
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewingPkgDetails(null)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer transition-all shadow-md text-xs"
                    >
                      Close Specs
                    </button>
                  </div>
                </>
              );
            })()}

          </div>
        </div>,
        document.body
      )}

      {/* 2. Side-by-Side Comparison Modal */}
      {isComparingPkgs && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left text-xs bg-black/60">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl p-6 space-y-5 shadow-2xl relative text-slate-300">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">Dynamic comparison checklist</span>
                <h4 className="text-sm font-extrabold text-slate-100 font-sans tracking-tight">
                  ⚖️ Side-by-Side Specifications Comparison ({selectedPkgIds.length} packages selected)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsComparingPkgs(false)}
                className="text-slate-450 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Grid Table */}
            <div className="overflow-x-auto border border-slate-800/85 rounded-xl bg-slate-950/40">
              <table className="w-full min-w-[700px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0F172A]">
                    <th className="p-3 text-left font-bold text-slate-400 font-mono text-[10px] uppercase w-48 border-r border-slate-800/60">Specification Parameter</th>
                    {selectedPkgIds.map((id) => {
                      const pkg = packages.find(p => p.package_id === id);
                      if (!pkg) return null;
                      return (
                        <th key={id} className="p-3 text-left font-bold text-slate-100 border-r border-slate-850/60 last:border-r-0">
                          <div className="space-y-1">
                            <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono uppercase font-black border border-emerald-900/30">
                              {pkg.category}
                            </span>
                            <h5 className="font-bold text-slate-100 mt-1 leading-tight">{pkg.package_name}</h5>
                            <span className="block font-mono text-emerald-400 font-extrabold text-[12px] pt-1">
                              ₹{pkg.price ? pkg.price.toLocaleString('en-IN') : 'N/A'}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Category Row */}
                  <tr className="border-b border-slate-800/60 hover:bg-slate-950/20 text-[11px]">
                    <td className="p-3 font-semibold text-slate-400 border-r border-slate-850/60 font-mono text-[10px] uppercase">🏷️ Category</td>
                    {selectedPkgIds.map((id) => {
                      const pkg = packages.find(p => p.package_id === id);
                      return (
                        <td key={id} className="p-3 border-r border-slate-850/40 last:border-r-0 font-sans font-medium text-slate-200">
                          {pkg?.category || 'General'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Pricing Row */}
                  <tr className="border-b border-slate-800/60 hover:bg-slate-950/20 text-[11px]">
                    <td className="p-3 font-semibold text-slate-400 border-r border-slate-850/60 font-mono text-[10px] uppercase">💰 Price Rate</td>
                    {selectedPkgIds.map((id) => {
                      const pkg = packages.find(p => p.package_id === id);
                      return (
                        <td key={id} className="p-3 border-r border-slate-850/40 last:border-r-0 font-mono text-emerald-400 font-extrabold">
                          ₹{pkg?.price ? pkg.price.toLocaleString('en-IN') : 'N/A'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Deliverables */}
                  <tr className="border-b border-slate-800/60 hover:bg-slate-950/20 text-[11px]">
                    <td className="p-3 font-semibold text-slate-400 border-r border-slate-850/60 font-mono text-[10px] uppercase">📦 Core Deliverables</td>
                    {selectedPkgIds.map((id) => {
                      const pkg = packages.find(p => p.package_id === id);
                      return (
                        <td key={id} className="p-3 border-r border-slate-850/40 last:border-r-0 font-sans leading-relaxed text-slate-300">
                          <div className="max-h-24 overflow-y-auto pr-1 whitespace-pre-line text-xs font-sans">
                            {pkg?.deliverables || <span className="italic text-slate-500">Not configured</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Team Members */}
                  <tr className="border-b border-slate-800/60 hover:bg-slate-950/20 text-[11px]">
                    <td className="p-3 font-semibold text-slate-400 border-r border-slate-850/60 font-mono text-[10px] uppercase">👥 Crew Required</td>
                    {selectedPkgIds.map((id) => {
                      const pkg = packages.find(p => p.package_id === id);
                      return (
                        <td key={id} className="p-3 border-r border-slate-850/40 last:border-r-0 font-sans text-slate-300">
                          {pkg?.team_members || <span className="italic text-slate-500">Standard team allocation</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Seasonal Offers */}
                  <tr className="border-b border-slate-800/60 hover:bg-slate-950/20 text-[11px]">
                    <td className="p-3 font-semibold text-slate-400 border-r border-slate-850/60 font-mono text-[10px] uppercase">🎁 Seasonal offers</td>
                    {selectedPkgIds.map((id) => {
                      const pkg = packages.find(p => p.package_id === id);
                      return (
                        <td key={id} className="p-3 border-r border-slate-850/40 last:border-r-0 font-sans text-amber-400">
                          {pkg?.seasonal_offer && pkg.seasonal_offer !== 'None' ? pkg.seasonal_offer : <span className="italic text-slate-505">None active</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Event Duration */}
                  <tr className="border-b border-slate-800/60 hover:bg-slate-950/20 text-[11px]">
                    <td className="p-3 font-semibold text-slate-400 border-r border-slate-850/60 font-mono text-[10px] uppercase">⏱️ Duration Limit</td>
                    {selectedPkgIds.map((id) => {
                      const pkg = packages.find(p => p.package_id === id);
                      return (
                        <td key={id} className="p-3 border-r border-slate-850/40 last:border-r-0 font-sans text-slate-300">
                          {pkg?.category === 'Pre-Wedding' || pkg?.category === 'Outdoor' || pkg?.package_name?.toLowerCase().includes('shoot')
                            ? '3 to 5 Hours' 
                            : 'Full Day (8-10 Hours)'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Scope Condition */}
                  <tr className="border-b border-slate-800/60 hover:bg-slate-950/20 text-[11px]">
                    <td className="p-3 font-semibold text-slate-400 border-r border-slate-850/60 font-mono text-[10px] uppercase">📷 Shoot Scope</td>
                    {selectedPkgIds.map((id) => {
                      const pkg = packages.find(p => p.package_id === id);
                      return (
                        <td key={id} className="p-3 border-r border-slate-850/40 last:border-r-0 font-sans text-slate-300">
                          {pkg?.category?.includes('Video') || pkg?.package_name?.toLowerCase().includes('video') || pkg?.package_name?.toLowerCase().includes('reel')
                            ? 'Cinematic Video' 
                            : 'Standard Multi-Crew (Photo/Video)'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Terms & Conditions */}
                  <tr className="hover:bg-slate-950/20 text-[11px]">
                    <td className="p-3 font-semibold text-slate-400 border-r border-slate-850/60 font-mono text-[10px] uppercase">📑 Terms & Conditions</td>
                    {selectedPkgIds.map((id) => {
                      const pkg = packages.find(p => p.package_id === id);
                      return (
                        <td key={id} className="p-3 border-r border-slate-850/40 last:border-r-0 font-sans leading-relaxed text-slate-305">
                          <div className="max-h-24 overflow-y-auto bg-slate-950/20 p-2 rounded border border-slate-900/65 text-slate-300 whitespace-pre-line text-[11px]">
                            {pkg?.terms_conditions || <span className="italic text-slate-500 font-sans">Standard contract rules apply</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Comparison Total Summary */}
            <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left font-sans">
                <span className="text-slate-400 text-xs block font-mono font-bold">COMPARISON CUMULATIVE SUM</span>
                <span className="text-slate-200 text-[11px] leading-relaxed">Both packages are computed dynamically. Total discount is managed directly in the main lead profile session editor.</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-slate-505 font-mono text-xs block">Combined Proposal Value:</span>
                <span className="font-mono text-emerald-400 font-black text-xl">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsComparingPkgs(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer border border-transparent text-xs"
              >
                Close Comparison
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
